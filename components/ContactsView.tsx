import React, { useState } from 'react';
import { Contact, UserSettings } from '../types';
import { Plus, Search, Star, User, Trash2 } from 'lucide-react';

interface ContactsViewProps {
  contacts: Contact[];
  userSettings: UserSettings;
  onAdd: () => void;
  onContactClick: (contact: Contact) => void;
  onDelete: (id: number | string) => void;
}

const ContactsView: React.FC<ContactsViewProps> = ({ contacts, userSettings, onAdd, onContactClick, onDelete }) => {
  const [search, setSearch] = useState('');
  
  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(search.toLowerCase())) ||
    c.role.toLowerCase().includes(search.toLowerCase())
  );

  const themeColor = userSettings.themeColor;

  const handleDeleteClick = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Supprimer ce contact de l'annuaire ?")) {
      onDelete(id);
    }
  };

  return (
    <div className={`h-full flex flex-col p-6 animate-in fade-in ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-black">Contacts</h2>
                <p className="text-xs font-bold text-slate-400">Annuaire VIP & Staff</p>
            </div>
            <button 
                onClick={onAdd}
                className={`p-3 rounded-xl shadow-lg text-white bg-${themeColor}-600 active:scale-95 transition-transform flex items-center gap-2 hover:opacity-90`}
            >
                <Plus size={20} /> <span className="hidden md:inline text-xs font-bold uppercase">Ajouter</span>
            </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
                type="text" 
                placeholder="Rechercher nom, entreprise..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border outline-none font-bold text-sm transition-all ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500'}`}
            />
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 overflow-y-auto no-scrollbar">
            {filteredContacts.map(contact => (
                <div 
                    key={contact.id}
                    onClick={() => onContactClick(contact)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center gap-4 group ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${contact.color || 'bg-slate-200 text-slate-500'}`}>
                        {contact.initials || <User size={20}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-sm truncate pr-2">{contact.name}</h3>
                            {contact.vip && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0 mt-0.5"/>}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{contact.role}</p>
                        <div className="flex justify-between items-center mt-1">
                           <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide truncate">{contact.company}</p>
                           <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${contact.status === 'In House' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                             {contact.status}
                           </span>
                        </div>
                    </div>
                    
                    {/* Bouton de suppression */}
                    <button
                      onClick={(e) => handleDeleteClick(contact.id, e)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors duration-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                </div>
            ))}
            {filteredContacts.length === 0 && (
                <div className="col-span-full text-center py-12 opacity-50 flex flex-col items-center">
                    <User size={48} className="text-slate-300 mb-2" />
                    <p className="font-bold text-slate-400">Aucun contact trouvé.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default ContactsView;