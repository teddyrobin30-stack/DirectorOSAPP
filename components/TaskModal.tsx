import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, MessageSquare, Paperclip, ChevronDown, FileText, Trash2, Download, Eye, Plus, AlertCircle, Briefcase, Smartphone, Share2, Loader2 } from 'lucide-react';
import { Contact, Task, UserSettings, Attachment, Group } from '../types';
import { TASK_TYPES } from '../constants';
import { generateId } from '../services/db';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onSave: (task: Task, options?: { sendSms?: boolean, shareInChat?: boolean }) => void;
  userSettings: UserSettings;
  editTask?: Task | null;
  onTriggerCommunication?: (contactId: number, text: string) => void;
  groups?: Group[]; 
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, contacts, onSave, userSettings, editTask, onTriggerCommunication, groups = [] }) => {
  const [text, setText] = useState('');
  const [tag, setTag] = useState('Général');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [contactId, setContactId] = useState<string | number>('');
  const [linkedGroupId, setLinkedGroupId] = useState<string | number>(''); 
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium'); 
  const [status, setStatus] = useState<'Pas commencé' | 'En cours' | 'Terminé'>('Pas commencé');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Options de communication
  const [sendSms, setSendSms] = useState(false);
  const [shareInChat, setShareInChat] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  useEffect(() => {
    if (editTask && isOpen) {
      setText(editTask.text); setTag(editTask.tag); setDate(editTask.date || '');
      setTime(editTask.time || ''); setNote(editTask.note || '');
      setContactId(editTask.linkedContactId || ''); 
      setLinkedGroupId(editTask.linkedGroupId || '');
      setPriority(editTask.priority || 'Medium');
      setStatus(editTask.status);
      
      if (editTask.attachments) {
        setAttachments(editTask.attachments);
      } else {
        setAttachments([]);
      }
      // Reset options on edit
      setSendSms(false);
      setShareInChat(false);

    } else if (!editTask && isOpen) {
      setText(''); setTag('Général'); setDate(''); setTime(''); setNote(''); 
      setContactId(''); setLinkedGroupId(''); setPriority('Medium'); setStatus('Pas commencé');
      setAttachments([]);
      setSendSms(false);
      setShareInChat(true); // Default share for new tasks
    }
    setShowTimePicker(false);
  }, [editTask, isOpen]);

  // --- LOGIQUE D'UPLOAD ROBUSTE (Remplaçant l'async/await) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validation Taille
    if (file.size > 5 * 1024 * 1024) {
      alert("Le fichier est trop lourd (Max 5 Mo).");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Lecture via FileReader Standard (Callback)
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
         const newAttachment: Attachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            url: reader.result
         };
         setAttachments(prev => [...prev, newAttachment]);
      }
    };
    reader.onerror = () => {
      alert("Erreur lors de la lecture du fichier.");
    };
    reader.readAsDataURL(file);

    // 3. Reset Input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  if (!isOpen) return null;

  const handleSave = () => {
    if (!text) return;
    onSave({
      id: editTask ? editTask.id : generateId('task-'), // UUID-compatible ID
      text, tag, date, time, status,
      done: status === 'Terminé', linkedContactId: contactId, linkedGroupId, priority, note,
      attachments,
    }, { sendSms, shareInChat });
    onClose();
  };

  const handleTimeSelect = (h: string, m: string) => {
    setTime(`${h}:${m}`);
    setShowTimePicker(false);
  };

  const themeBg = `bg-${userSettings.themeColor}-600`;
  const selectedContact = contacts.find(c => c.id.toString() === contactId.toString());

  return (
    <div className={`fixed inset-0 z-[110] bg-black/60 flex items-end md:items-center md:justify-center animate-in fade-in backdrop-blur-sm overflow-hidden ${userSettings.darkMode ? 'dark' : ''}`}>
      <div className={`w-full md:max-w-xl md:rounded-[40px] md:mx-4 rounded-t-[40px] p-8 pb-12 animate-in slide-in-from-bottom-20 md:slide-in-from-bottom-10 max-h-[92vh] overflow-y-auto no-scrollbar ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black">{editTask ? 'Modifier Tâche' : 'Nouvelle Tâche'}</h3>
          <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><X size={20}/></button>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-[28px] border-2 border-slate-100 dark:border-slate-800">
            <textarea placeholder="Titre de la tâche..." value={text} onChange={(e) => setText(e.target.value)} className="w-full bg-transparent outline-none font-black text-xl resize-none h-16 dark:text-white placeholder:text-slate-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             <div className="space-y-1">
               <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Échéance</label>
               <div className="relative h-[54px]">
                 <div className="absolute inset-0 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-indigo-400 flex items-center gap-2 shadow-sm transition-colors">
                   <Calendar size={16} className="text-indigo-500" />
                   <span className="font-black text-xs dark:text-white">
                      {date ? new Date(date).toLocaleDateString('fr-FR') : 'Définir date'}
                   </span>
                 </div>
                 <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                 />
               </div>
             </div>
             
             <div className="space-y-1 relative">
               <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Heure</label>
               <button 
                 type="button"
                 onClick={() => setShowTimePicker(!showTimePicker)}
                 className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-indigo-400 flex items-center justify-between shadow-sm transition-colors"
               >
                 <div className="flex items-center gap-2">
                   <Clock size={16} className="text-indigo-500" />
                   <span className="font-black text-xs dark:text-white">{time || '--:--'}</span>
                 </div>
                 <ChevronDown size={14} className={`text-slate-400 transition-transform ${showTimePicker ? 'rotate-180' : ''}`} />
               </button>

               {showTimePicker && (
                 <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl shadow-2xl z-50 animate-in zoom-in-95">
                    <div className="grid grid-cols-4 gap-1 h-32 overflow-y-auto no-scrollbar py-1">
                      {hours.map(h => (
                        <div key={h} className="contents">
                          {minutes.map(m => (
                            <button 
                              key={`${h}:${m}`} 
                              onClick={() => handleTimeSelect(h, m)}
                              className={`p-1.5 rounded-lg text-[9px] font-black transition-all ${time === `${h}:${m}` ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-500'}`}
                            >
                              {h}:{m}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                 </div>
               )}
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Type</label>
            <div className="flex flex-wrap gap-2">
              {TASK_TYPES.map(t => (
                <button key={t} onClick={() => setTag(t)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${tag === t ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-slate-700 dark:text-indigo-400' : 'border-slate-50 dark:border-slate-800 text-slate-400'}`}>{t}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Priorité</label>
                <div className="flex gap-1 p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                   <button onClick={() => setPriority('Low')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${priority === 'Low' ? 'bg-white shadow-sm text-slate-600' : 'text-slate-400'}`}>Bas</button>
                   <button onClick={() => setPriority('Medium')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${priority === 'Medium' ? 'bg-white shadow-sm text-violet-600' : 'text-slate-400'}`}>Moyen</button>
                   <button onClick={() => setPriority('High')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${priority === 'High' ? 'bg-white shadow-sm text-red-600' : 'text-slate-400'}`}>Urgent</button>
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Lier Groupe</label>
                <div className="relative">
                  <select 
                    value={linkedGroupId} 
                    onChange={(e) => setLinkedGroupId(e.target.value)} 
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs outline-none appearance-none dark:text-white"
                  >
                    <option value="">Aucun groupe</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <Briefcase size={14} className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
                </div>
             </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Note (Optionnel)</label>
            <textarea placeholder="Détails, instructions..." value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs h-24 dark:text-white placeholder:text-slate-400" />
          </div>

          {/* Attachments Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Pièces Jointes</label>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*" 
            />
            <div className="space-y-2">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-100 dark:border-indigo-800 animate-in zoom-in">
                  <div 
                    onClick={() => window.open(att.url, '_blank')}
                    className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group/att"
                    title="Cliquer pour voir/télécharger"
                  >
                    {/* STYLE ADAPTÉ DU MODULE MAINTENANCE POUR LES PHOTOS */}
                    {att.type.startsWith('image/') ? (
                       <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700 relative">
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                       </div>
                    ) : (
                       <div className="p-2 bg-white dark:bg-indigo-800 rounded-xl shrink-0">
                          <FileText size={18} className="text-indigo-600 dark:text-indigo-300" />
                       </div>
                    )}
                    <span className="text-xs font-bold truncate dark:text-indigo-100 group-hover/att:text-indigo-600 group-hover/att:underline transition-all">
                      {att.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => removeAttachment(att.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold text-xs w-full justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm border-2 border-dashed border-slate-200 dark:border-slate-700"
              >
                <Plus size={16}/>
                Ajouter un fichier
              </button>
            </div>
          </div>

          {/* Communication Options */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Lier un contact (SMS)</label>
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 font-bold text-sm text-slate-900 dark:text-white border-none outline-none appearance-none">
                <option value="">Sélectionner...</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Checkboxes for Actions */}
            <div className="flex flex-col gap-3">
               {contactId && (
                 <label className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${sendSms ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 border-transparent dark:bg-slate-800'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${sendSms ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                       {sendSms && <Plus size={12} className="text-white"/>}
                    </div>
                    <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} className="hidden" />
                    <div className="flex-1">
                       <span className="text-xs font-bold block">Envoyer une alerte SMS</span>
                       <span className="text-[10px] text-slate-400">À {selectedContact?.name || 'Contact sélectionné'}</span>
                    </div>
                    <Smartphone size={18} className={sendSms ? 'text-emerald-500' : 'text-slate-300'} />
                 </label>
               )}

               <label className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${shareInChat ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-transparent dark:bg-slate-800'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${shareInChat ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                     {shareInChat && <Plus size={12} className="text-white"/>}
                  </div>
                  <input type="checkbox" checked={shareInChat} onChange={(e) => setShareInChat(e.target.checked)} className="hidden" />
                  <div className="flex-1">
                     <span className="text-xs font-bold block">Partager dans la Messagerie</span>
                     <span className="text-[10px] text-slate-400">Notifier l'équipe (Interne)</span>
                  </div>
                  <Share2 size={18} className={shareInChat ? 'text-indigo-500' : 'text-slate-300'} />
               </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">État initial</label>
            <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              {(['Pas commencé', 'En cours', 'Terminé'] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${status === s ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSave} className={`w-full py-6 rounded-[32px] text-white font-black uppercase tracking-[0.2em] mt-8 shadow-xl ${themeBg}`}>
          {editTask ? 'Enregistrer les modifications' : 'Créer la tâche'}
        </button>
      </div>
    </div>
  );
};

export default TaskModal;