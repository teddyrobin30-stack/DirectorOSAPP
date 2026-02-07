import React from 'react';
import { X, Phone, Mail, MessageCircle, MapPin, Edit3, Building, Briefcase, MessageSquare } from 'lucide-react';
import { Contact, UserSettings } from '../types';

interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onEdit: (contact: Contact) => void;
  userSettings: UserSettings;
}

const ContactDetailModal: React.FC<ContactDetailModalProps> = ({ isOpen, onClose, contact, onEdit, userSettings }) => {
  if (!isOpen || !contact) return null;

  const themeHex = `text-${userSettings.themeColor}-600`;
  const themeBg = `bg-${userSettings.themeColor}-600`;

  const actions = [
    { icon: Phone, label: 'Appeler', value: `tel:${contact.phone}`, color: 'bg-blue-50 text-blue-600' },
    { icon: MessageSquare, label: 'SMS', value: `sms:${contact.phone}`, color: 'bg-emerald-50 text-emerald-600' },
    { icon: Mail, label: 'Email', value: `mailto:${contact.email}`, color: 'bg-amber-50 text-amber-600' },
    { icon: MessageCircle, label: 'WhatsApp', value: `https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`, color: 'bg-indigo-50 text-indigo-600' },
  ];

  return (
    <div className="absolute inset-0 z-[200] bg-black/70 flex items-end animate-in fade-in backdrop-blur-sm overflow-hidden">
      <div className={`w-full rounded-t-[40px] p-8 pb-12 animate-in slide-in-from-bottom-20 max-h-[90vh] overflow-y-auto no-scrollbar ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
        
        {/* Header - Profile Style */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-5">
            <div className={`h-20 w-20 rounded-[28px] flex items-center justify-center font-black text-3xl shadow-lg ${contact.color || 'bg-slate-200 text-slate-600'}`}>
              {contact.initials}
            </div>
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 mb-2 inline-block`}>
                {contact.category}
              </span>
              <h3 className="text-2xl font-black leading-tight">{contact.name}</h3>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => onEdit(contact)}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white transition-colors"
            >
              <Edit3 size={20}/>
            </button>
            <button onClick={onClose} className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
              <X size={20}/>
            </button>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {actions.map((action, i) => (
            <a 
              key={i} 
              href={action.value} 
              target={action.label === 'WhatsApp' ? '_blank' : undefined}
              rel="noreferrer"
              className={`flex items-center gap-4 p-5 rounded-[28px] border border-slate-50 dark:border-slate-800 transition-transform active:scale-95 shadow-sm ${userSettings.darkMode ? 'bg-slate-800' : 'bg-white'}`}
            >
              <div className={`p-3 rounded-2xl ${action.color}`}>
                <action.icon size={20} />
              </div>
              <span className="text-sm font-black text-slate-600 dark:text-slate-300">{action.label}</span>
            </a>
          ))}
        </div>

        {/* Detailed Info Section */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Informations Professionnelles</h4>
          
          <div className={`p-6 rounded-[32px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <Briefcase size={20} className="text-slate-300 mt-1" />
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Fonction</p>
                  <p className="text-base font-bold">{contact.role}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Building size={20} className="text-slate-300 mt-1" />
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Entreprise</p>
                  <p className="text-base font-bold">{contact.company}</p>
                </div>
              </div>
            </div>
          </div>

          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 pt-2">Localisation</h4>
          <div className={`p-6 rounded-[32px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
            <div className="flex items-start gap-4">
              <MapPin size={20} className="text-slate-300 mt-1" />
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Adresse</p>
                <p className="text-base font-bold leading-relaxed">{contact.address || 'Non renseignée'}</p>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => onEdit(contact)}
          className={`w-full py-5 rounded-[28px] text-white font-black uppercase tracking-widest mt-12 shadow-xl bg-slate-900`}
        >
          Modifier le contact
        </button>
      </div>
    </div>
  );
};

export default ContactDetailModal;