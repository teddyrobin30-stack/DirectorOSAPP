import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, MessageSquare, Video, ClipboardPaste, ChevronDown, Trash2, Mail, Phone, ExternalLink } from 'lucide-react';
import { Contact, CalendarEvent, UserSettings } from '../types';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onSave: (event: CalendarEvent) => void;
  onDelete?: (id: number | string) => void;
  userSettings: UserSettings;
  editEvent?: CalendarEvent | null;
  onTriggerCommunication?: (contactId: string | number, text: string) => void;
}

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, contacts, onSave, onDelete, userSettings, editEvent, onTriggerCommunication }) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('1h');
  const [contactId, setContactId] = useState('');
  const [type, setType] = useState<'pro' | 'perso'>('pro');
  const [videoLink, setVideoLink] = useState<string>('');
  const [isSmsEditing, setIsSmsEditing] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');

  const durationPresets = ['15min', '30min', '1h', '2h', '3h'];

  useEffect(() => {
    if (isOpen) {
      if (editEvent) {
        setTitle(editEvent.title || '');
        // Handle potential timestamp or string
        let start = new Date();
        if (editEvent.start && typeof editEvent.start === 'object' && editEvent.start.seconds) {
          start = new Date(editEvent.start.seconds * 1000);
        } else if (editEvent.start) {
          start = new Date(editEvent.start);
        }

        if (!isNaN(start.getTime())) {
          setStartDate(start.toISOString().split('T')[0]);
        }
        setStartTime(editEvent.time || '09:00');
        setDuration(editEvent.duration || '1h');
        setContactId(editEvent.linkedContactId?.toString() || '');
        setType(editEvent.type === 'google' ? 'pro' : (editEvent.type as 'pro' | 'perso') || 'pro');
        setVideoLink(editEvent.videoLink || '');
      } else {
        // Reset for new event
        const now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
        if (now.getMinutes() >= 60) { now.setHours(now.getHours() + 1); now.setMinutes(0); }

        setStartDate(now.toISOString().split('T')[0]);
        setStartTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
        setTitle('');
        setDuration('1h');
        setContactId('');
        setType('pro');
        setVideoLink('');
      }
      setIsSmsEditing(false);
    }
  }, [editEvent, isOpen]);

  useEffect(() => {
    if (contactId && !isSmsEditing && isOpen) {
      const contact = contacts.find(c => c.id.toString() === contactId.toString());
      const d = new Date(startDate);
      const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '...';
      const defaultMsg = `Bonjour ${contact?.name || ''}, je vous confirme notre RDV le ${dateStr} à ${startTime} (Durée: ${duration}). Objet: ${title || 'RDV'}${videoLink ? `\nLien Visio: ${videoLink}` : ''}`;
      setSmsMessage(defaultMsg);
    }
  }, [contactId, startDate, startTime, duration, title, videoLink, contacts, isSmsEditing, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title || !startDate) return;

    const startObj = new Date(`${startDate}T${startTime}`);
    const endObj = new Date(startObj);
    if (duration.includes('min')) {
      endObj.setMinutes(endObj.getMinutes() + parseInt(duration));
    } else if (duration.includes('h')) {
      endObj.setHours(endObj.getHours() + parseInt(duration));
    } else {
      endObj.setHours(endObj.getHours() + 1);
    }

    const eventToSave = {
      id: editEvent ? editEvent.id : Date.now(),
      title: title,
      start: startObj,
      end: endObj,
      time: startTime,
      duration: duration,
      type: type || 'pro',
      linkedContactId: contactId || "",
      videoLink: videoLink || ""
    };

    onSave(eventToSave);
    onClose();
  };

  const handleDelete = () => {
    if (editEvent && onDelete) {
      if (window.confirm('Voulez-vous vraiment supprimer cet événement ?')) {
        onDelete(editEvent.id);
      }
    }
  };

  const generateLink = (platform: 'meet' | 'teams') => {
    const id = Math.random().toString(36).substring(7);
    if (platform === 'meet') setVideoLink(`https://meet.google.com/${id}-${id}`);
    if (platform === 'teams') setVideoLink(`https://teams.microsoft.com/l/meet/${id}`);
  };

  const shareEvent = (method: 'mail' | 'sms' | 'whatsapp') => {
    const contact = contacts.find(c => c.id.toString() === contactId);
    const body = encodeURIComponent(smsMessage);
    if (method === 'sms' && contact?.phone) window.open(`sms:${contact.phone}?body=${body}`);
    if (method === 'whatsapp' && contact?.phone) window.open(`https://wa.me/${contact.phone}?text=${body}`);
    if (method === 'mail' && contact?.email) window.open(`mailto:${contact.email}?subject=Invitation RDV&body=${body}`);
  };

  const themeBg = `bg-${userSettings.themeColor}-600`;
  const themeHex = `text-${userSettings.themeColor}-600`;

  return (
    <div className={`fixed inset-0 z-[120] bg-black/60 flex items-end md:items-center md:justify-center animate-in fade-in backdrop-blur-sm overflow-hidden ${userSettings.darkMode ? 'dark' : ''}`}>
      <div className={`w-full md:max-w-xl md:rounded-[40px] md:mx-4 rounded-t-[40px] p-6 pb-12 animate-in slide-in-from-bottom-20 md:slide-in-from-bottom-10 max-h-[95vh] overflow-y-auto no-scrollbar ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>

        <div className="relative mb-8 mt-2">
          <div className={`${userSettings.darkMode ? 'bg-slate-800' : 'bg-slate-900'} rounded-[32px] p-8 pr-16 shadow-xl`}>
            <input type="text" placeholder="Titre de l'événement" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-2xl font-black bg-transparent border-none outline-none text-white placeholder:text-slate-500" />
          </div>
          <button type="button" onClick={onClose} className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all flex items-center justify-center cursor-pointer border border-white/20 z-[150]"><X size={24} /></button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 px-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date</label>
              <div className="relative h-[58px]">
                <div className="absolute inset-0 p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center gap-3 shadow-sm hover:border-indigo-400 transition-colors">
                  <CalendarIcon size={18} className="text-indigo-500" />
                  <span className="font-black text-xs dark:text-white">
                    {startDate ? new Date(startDate).toLocaleDateString('fr-FR') : 'Choisir date'}
                  </span>
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Heure</label>
              <div className="relative h-[58px]">
                <div className="absolute inset-0 p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between shadow-sm hover:border-indigo-400 transition-colors">
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-indigo-500" />
                    <span className="font-black text-sm">{startTime}</span>
                  </div>
                  <ChevronDown size={16} className="text-slate-400" />
                </div>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
            </div>
          </div>

          <div className="px-2">
            <div className="flex justify-between gap-2 overflow-x-auto no-scrollbar">
              {durationPresets.map(p => (
                <button key={p} type="button" onClick={() => setDuration(p)} className={`flex-1 py-4 rounded-2xl border-2 text-[11px] font-black transition-all ${duration === p ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-slate-700 dark:text-indigo-400' : 'border-slate-50 dark:border-slate-800 text-slate-300'}`}>{p}</button>
              ))}
            </div>
          </div>

          <div className="px-2 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Générateur Liens Visio</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => generateLink('meet')} className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase">Créer Meet</button>
                <button type="button" onClick={() => generateLink('teams')} className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase">Créer Teams</button>
              </div>
            </div>
            <div className="p-4 rounded-2xl border-2 flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border-transparent">
              <Video size={18} className="text-slate-400" />
              <input type="text" placeholder="Lien de la réunion..." value={videoLink} onChange={(e) => setVideoLink(e.target.value)} className="bg-transparent outline-none flex-1 font-bold text-sm dark:text-white" />
            </div>
          </div>

          <div className="px-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Lier un contact (Invité)</label>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full p-4 rounded-2xl border-2 bg-slate-50 dark:bg-slate-800 border-transparent font-bold text-sm dark:text-white">
              <option value="">Sélectionner...</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {contactId && (
            <div className="px-2 pt-2 pb-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Partager l'invitation</span>
                <button type="button" onClick={() => setIsSmsEditing(!isSmsEditing)} className={`text-[10px] font-black uppercase underline ${themeHex}`}>{isSmsEditing ? 'OK' : 'Modifier msg'}</button>
              </div>

              {isSmsEditing && (
                <textarea value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} className="w-full p-3 rounded-xl border mb-3 bg-white dark:bg-slate-900 font-medium text-xs h-24" />
              )}

              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => shareEvent('mail')} className="py-3 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex flex-col items-center gap-1"><Mail size={16} /> Email</button>
                <button type="button" onClick={() => shareEvent('sms')} className="py-3 rounded-xl bg-green-100 text-green-700 font-bold text-xs flex flex-col items-center gap-1"><MessageSquare size={16} /> SMS</button>
                <button type="button" onClick={() => shareEvent('whatsapp')} className="py-3 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-xs flex flex-col items-center gap-1"><Phone size={16} /> WhatsApp</button>
              </div>
            </div>
          )}

        </div>

        <div className="mt-8 space-y-3">
          {editEvent && (
            <button
              type="button"
              onClick={handleDelete}
              className="w-full py-4 rounded-2xl text-red-500 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border-2 border-red-50 hover:bg-red-50 transition-all"
            >
              <Trash2 size={16} /> Supprimer l'événement
            </button>
          )}
          <button type="button" onClick={handleSave} className={`w-full py-6 rounded-[32px] text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-2xl ${themeBg}`}>
            {editEvent ? 'Enregistrer les modifications' : 'Planifier l\'événement'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;