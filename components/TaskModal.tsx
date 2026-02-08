import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Paperclip, Share2, MessageSquare, Check, User, AlertCircle } from 'lucide-react';
import { Task, Contact, UserSettings, ChatChannel } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task, options?: { sendSms?: boolean, shareInChat?: boolean }) => void;
  contacts: Contact[];
  groups: ChatChannel[]; 
  userSettings: UserSettings;
  editTask?: Task | null;
  onTriggerCommunication?: (contactId: string | number, text: string) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ 
  isOpen, onClose, onSave, contacts, groups = [], userSettings, editTask 
}) => {
  // États du formulaire
  const [text, setText] = useState('');
  const [tag, setTag] = useState('Général');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('09:00');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Pas commencé');
  const [linkedGroupId, setLinkedGroupId] = useState<string>('');
  const [linkedContactId, setLinkedContactId] = useState<string>('');
  const [shareInChat, setShareInChat] = useState(false);
  const [sendSms, setSendSms] = useState(false);

  useEffect(() => {
    if (editTask && isOpen) {
      setText(editTask.text || '');
      setTag(editTask.tag || 'Général');
      setPriority(editTask.priority || 'Medium');
      
      // Gestion de la date pour l'affichage dans l'input date
      if (editTask.dueDate) {
        const d = new Date(editTask.dueDate);
        if (!isNaN(d.getTime())) {
          setDueDate(d.toISOString().split('T')[0]);
        }
      } else {
        setDueDate('');
      }

      setDueTime(editTask.dueTime || '09:00');
      setDescription(editTask.description || '');
      setStatus(editTask.status || (editTask.done ? 'Terminé' : 'Pas commencé'));
      setLinkedGroupId(editTask.linkedGroupId || '');
      setLinkedContactId(editTask.linkedContactId || '');
    } else if (isOpen) {
      setText('');
      setTag('Général');
      setPriority('Medium');
      setDueDate(new Date().toISOString().split('T')[0]);
      setDueTime('09:00');
      setDescription('');
      setStatus('Pas commencé');
      setLinkedGroupId('');
      setLinkedContactId('');
      setShareInChat(false);
      setSendSms(false);
    }
  }, [editTask, isOpen]);

  const handleSave = () => {
    if (!text.trim()) return;

    // ✅ CRUCIAL : On crée un vrai objet Date pour que l'agenda l'affiche
    let finalDate = null;
    if (dueDate) {
      finalDate = new Date(`${dueDate}T${dueTime || '00:00'}`);
    }

    const taskData: Task = {
      id: editTask ? editTask.id : Date.now(),
      text: text.trim(),
      done: status === 'Terminé',
      status: status,
      tag: tag,
      priority: priority,
      dueDate: finalDate as any, // ✅ Envoi de l'objet Date
      dueTime: dueTime || "",
      description: description || "",
      linkedGroupId: linkedGroupId || "",
      linkedContactId: linkedContactId || "",
      ownerId: editTask?.ownerId || ""
    };

    onSave(taskData, { sendSms, shareInChat });
  };

  if (!isOpen) return null;

  const categories = ['Général', 'RH', 'Maintenance', 'F&B', 'Admin', 'Perso'];
  const themeBg = `bg-${userSettings.themeColor}-600`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-[32px]">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {editTask ? 'Modifier Tâche' : 'Nouvelle Tâche'}
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          
          {/* Titre */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus-within:border-indigo-500 transition-all shadow-inner">
            <input 
              type="text" 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              placeholder="Titre de la tâche..." 
              className="w-full bg-transparent text-lg font-bold outline-none placeholder:text-slate-400 dark:text-white"
              autoFocus={!editTask}
            />
          </div>

          {/* Date & Heure */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Échéance</label>
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <Calendar size={18} className="text-indigo-500"/>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-transparent outline-none text-sm font-bold w-full dark:text-white"/>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Heure</label>
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <Clock size={18} className="text-indigo-500"/>
                <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="bg-transparent outline-none text-sm font-bold w-full dark:text-white"/>
              </div>
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setTag(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                    tag === cat 
                      ? `${themeBg} border-transparent text-white shadow-lg` 
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Priorité & Groupe */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Priorité</label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {['Low', 'Medium', 'High'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p as any)}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                        priority === p ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'
                      }`}
                    >
                      {p === 'Low' ? 'BAS' : p === 'Medium' ? 'MOYEN' : 'URGENT'}
                    </button>
                  ))}
                </div>
             </div>
             
             <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Lier Groupe</label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                   <MessageSquare size={18} className="text-slate-400"/>
                   <select 
                      value={linkedGroupId}
                      onChange={(e) => setLinkedGroupId(e.target.value)}
                      className="bg-transparent outline-none text-sm font-bold w-full appearance-none dark:text-white"
                   >
                      <option value="">Aucun groupe</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                   </select>
                </div>
             </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Note</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails supplémentaires..."
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm min-h-[80px] outline-none border-2 border-transparent focus:border-indigo-500 transition-all dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
             <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                   <User size={16} className="text-slate-400"/>
                   <span className="text-xs font-bold uppercase text-slate-500">Contact VIP</span>
                </div>
                <select 
                   value={linkedContactId}
                   onChange={(e) => setLinkedContactId(e.target.value)}
                   className="w-full p-2 bg-white dark:bg-slate-700 rounded-xl text-sm font-bold outline-none dark:text-white"
                >
                   <option value="">Lier un contact...</option>
                   {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                   ))}
                </select>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-[32px]">
          <button 
            onClick={handleSave} 
            className={`w-full py-4 rounded-xl text-white font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${text ? themeBg : 'bg-slate-300 cursor-not-allowed'}`}
            disabled={!text}
          >
            {editTask ? 'Enregistrer' : 'Créer la tâche'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default TaskModal;