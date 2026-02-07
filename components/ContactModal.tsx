import React, { useState, useEffect } from 'react';
import { X, User, Building, Phone, Mail, MapPin, Briefcase } from 'lucide-react';
import { Contact, UserSettings } from '../types';
import { CONTACT_CATEGORIES } from '../constants';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Contact) => void;
  userSettings: UserSettings;
  editContact?: Contact | null;
}

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, onSave, userSettings, editContact }) => {
  const [form, setForm] = useState({
    name: '', 
    role: '', 
    company: '', 
    category: 'VIP', 
    phone: '', 
    email: '', 
    address: ''
  });

  useEffect(() => {
    if (editContact && isOpen) {
      setForm({
        name: editContact.name,
        role: editContact.role,
        company: editContact.company || '',
        category: editContact.category || 'VIP',
        phone: editContact.phone,
        email: editContact.email,
        address: editContact.address || ''
      });
    } else if (!editContact && isOpen) {
      setForm({
        name: '', role: '', company: '', category: 'VIP', 
        phone: '', email: '', address: ''
      });
    }
  }, [editContact, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!form.name) return;
    const initials = form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const colors = ["bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-purple-100 text-purple-700"];
    
    onSave({
      id: editContact ? editContact.id : Date.now(),
      ...form,
      initials,
      vip: form.category === 'VIP',
      status: 'In House', // Default
      color: editContact ? editContact.color : colors[Math.floor(Math.random() * colors.length)]
    });
    
    onClose();
  };

  const themeHex = `text-${userSettings.themeColor}-600`;
  const themeBg = `bg-${userSettings.themeColor}-600`;
  const themeBorder = `border-${userSettings.themeColor}-600`;

  const inputGroupClass = `flex items-center gap-3 px-5 py-4 rounded-2xl border-2 shadow-sm transition-all ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100'}`;
  const inputBaseClass = `bg-transparent outline-none flex-1 font-bold text-base placeholder:text-slate-400 ${userSettings.darkMode ? 'text-white' : 'text-slate-950'}`;
  const labelBaseClass = `text-[10px] font-black uppercase tracking-[0.15em] ml-1 mb-1 block ${userSettings.darkMode ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="absolute inset-0 z-[250] bg-black/60 flex items-end animate-in fade-in backdrop-blur-sm overflow-hidden">
      <div className={`w-full rounded-t-[40px] p-8 pb-12 animate-in slide-in-from-bottom-20 max-h-[92vh] overflow-y-auto no-scrollbar ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            {editContact ? 'Modifier Contact' : 'Nouveau Contact'}
          </h3>
          <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:bg-slate-200 transition-colors">
            <X size={20}/>
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Section: Identité */}
          <div className="space-y-4">
            <div>
              <label className={labelBaseClass}>Identité</label>
              <div className={inputGroupClass}>
                <User size={18} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Nom complet" 
                  value={form.name} 
                  onChange={(e) => setForm({...form, name: e.target.value})} 
                  className={inputBaseClass} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelBaseClass}>Fonction</label>
                <div className={inputGroupClass}>
                  <input 
                    type="text" 
                    placeholder="Chef, Dir..." 
                    value={form.role} 
                    onChange={(e) => setForm({...form, role: e.target.value})} 
                    className={inputBaseClass} 
                  />
                </div>
              </div>
              <div>
                <label className={labelBaseClass}>Établissement</label>
                <div className={inputGroupClass}>
                  <input 
                    type="text" 
                    placeholder="Hôtel..." 
                    value={form.company} 
                    onChange={(e) => setForm({...form, company: e.target.value})} 
                    className={inputBaseClass} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Coordonnées */}
          <div className="space-y-4">
            <label className={labelBaseClass}>Coordonnées</label>
            
            <div className={inputGroupClass}>
              <Phone size={18} className="text-slate-400" />
              <input 
                type="tel" 
                placeholder="+33..." 
                value={form.phone} 
                onChange={(e) => setForm({...form, phone: e.target.value})} 
                className={inputBaseClass} 
              />
            </div>

            <div className={inputGroupClass}>
              <Mail size={18} className="text-slate-400" />
              <input 
                type="email" 
                placeholder="email@hotel.com" 
                value={form.email} 
                onChange={(e) => setForm({...form, email: e.target.value})} 
                className={inputBaseClass} 
              />
            </div>

            <div className={inputGroupClass}>
              <MapPin size={18} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Bureau, local, adresse..." 
                value={form.address} 
                onChange={(e) => setForm({...form, address: e.target.value})} 
                className={inputBaseClass} 
              />
            </div>
          </div>

          {/* Section: Catégorie */}
          <div className="space-y-3">
            <label className={labelBaseClass}>Catégorie VIP</label>
            <div className="flex flex-wrap gap-2">
              {CONTACT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({...form, category: cat})}
                  className={`px-5 py-3 rounded-2xl text-xs font-black transition-all border-2 ${form.category === cat ? `${themeBorder} ${themeHex} bg-${userSettings.themeColor}-50/50 shadow-sm` : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Final Submit Button */}
        <button 
          onClick={handleSave}
          className={`w-full py-6 rounded-[28px] text-white font-black uppercase tracking-[0.2em] mt-10 shadow-xl transition-all active:scale-95 ${themeBg} hover:opacity-90`}
        >
          {editContact ? 'Enregistrer les modifications' : 'Ajouter le contact'}
        </button>
      </div>
    </div>
  );
};

export default ContactModal;