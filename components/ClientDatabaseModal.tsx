
import React, { useState, useMemo, useEffect } from 'react';
import { X, UsersRound, Search, Building2, User, Phone, Mail, MapPin, Briefcase, History, TrendingUp, Filter, Edit3, Save } from 'lucide-react';
import { Client, Group, UserSettings } from '../types';

interface ClientDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  groups: Group[];
  userSettings: UserSettings;
  onUpdateClient?: (client: Client) => void;
}

const CATEGORIES = ['Séminaire', 'Association', 'Loisir', 'Sportif', 'Affaires'];

const ClientDatabaseModal: React.FC<ClientDatabaseModalProps> = ({ isOpen, onClose, clients, groups, userSettings, onUpdateClient }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'Entreprise' | 'Particulier'>('ALL');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Client | null>(null);

  // Reset Edit state when selection changes
  useEffect(() => {
    setIsEditing(false);
    setEditData(null);
  }, [selectedClient]);

  const handleStartEdit = () => {
    if (selectedClient) {
        setEditData({ ...selectedClient });
        setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (editData && onUpdateClient) {
        onUpdateClient(editData);
        setSelectedClient(editData); // Update local view
        setIsEditing(false);
        setEditData(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData(null);
  };

  // --- DERIVED DATA ---

  // 1. Enrich clients with KPI (Total Revenue & Last Booking)
  const enrichedClients = useMemo(() => {
    return clients.map(client => {
      const clientGroups = groups.filter(g => g.clientId === client.id);
      
      // Calculate Total Revenue
      let totalRevenue = 0;
      clientGroups.forEach(g => {
        if (g.status === 'confirmed') {
          let groupHT = 0;
          g.invoiceItems?.forEach(item => {
            groupHT += item.quantity * item.unitPrice;
          });
          totalRevenue += groupHT;
        }
      });

      // Find last booking
      const dates = clientGroups.map(g => new Date(g.startDate).getTime());
      const lastBooking = dates.length > 0 ? Math.max(...dates) : 0;

      return { ...client, totalRevenue, lastBooking, bookingCount: clientGroups.length };
    });
  }, [clients, groups]);

  // 2. Filter & Sort
  const filteredClients = useMemo(() => {
    return enrichedClients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'ALL' || c.type === filterType;
      return matchesSearch && matchesType;
    }).sort((a, b) => b.lastBooking - a.lastBooking); // Most recent first
  }, [enrichedClients, search, filterType]);

  // 3. Get History for Selected Client
  const selectedClientHistory = useMemo(() => {
    if (!selectedClient) return [];
    return groups
      .filter(g => g.clientId === selectedClient.id)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [selectedClient, groups]);

  if (!isOpen) return null;

  const themeHex = `text-${userSettings.themeColor}-600`;
  const themeBg = `bg-${userSettings.themeColor}-600`;

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 flex items-center justify-center animate-in fade-in backdrop-blur-sm p-4">
      <div className={`w-full max-w-5xl rounded-[40px] shadow-2xl flex flex-col h-[90vh] overflow-hidden ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
        
        {/* Header */}
        <div className="p-8 pb-4 shrink-0 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
              <UsersRound size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black">Base Clients</h2>
              <p className="text-xs font-bold text-slate-400">CRM & Historique</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:opacity-80"><X size={20}/></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          
          {/* LEFT: LIST & FILTERS */}
          <div className={`w-1/3 flex flex-col border-r border-slate-200 dark:border-slate-800 ${selectedClient ? 'hidden md:flex' : 'flex w-full'}`}>
             {/* Search Bar */}
             <div className="p-4 space-y-3">
                <div className={`flex items-center px-4 py-3 rounded-2xl border-2 transition-colors ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                   <Search size={18} className="text-slate-400 mr-2"/>
                   <input 
                     type="text" 
                     placeholder="Rechercher client..." 
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="bg-transparent outline-none font-bold text-sm w-full"
                   />
                </div>
                <div className="flex gap-2">
                   {(['ALL', 'Entreprise', 'Particulier'] as const).map(t => (
                     <button 
                       key={t}
                       onClick={() => setFilterType(t)}
                       className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterType === t ? 'bg-indigo-600 text-white shadow' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}
                     >
                       {t === 'ALL' ? 'Tous' : t}
                     </button>
                   ))}
                </div>
             </div>

             {/* Client List */}
             <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {filteredClients.map(client => (
                  <div 
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${selectedClient?.id === client.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent bg-white dark:bg-slate-800 hover:border-indigo-200'}`}
                  >
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                           {client.type === 'Entreprise' ? <Building2 size={16} className="text-indigo-500"/> : <User size={16} className="text-emerald-500"/>}
                           <span className="font-bold text-sm truncate">{client.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(client.lastBooking).getFullYear() > 1970 ? new Date(client.lastBooking).toLocaleDateString() : 'Nouveau'}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                        <span>{client.bookingCount} Dossiers</span>
                        <span className="font-black text-slate-900 dark:text-white">{client.totalRevenue.toLocaleString()} €</span>
                     </div>
                  </div>
                ))}
                {filteredClients.length === 0 && (
                  <div className="text-center py-10 opacity-50">
                    <UsersRound size={40} className="mx-auto mb-2"/>
                    <p className="text-xs font-bold">Aucun client trouvé</p>
                  </div>
                )}
             </div>
          </div>

          {/* RIGHT: DETAIL VIEW */}
          <div className={`flex-1 flex-col overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 ${selectedClient ? 'flex' : 'hidden md:flex items-center justify-center'}`}>
             
             {selectedClient ? (
               <div className="p-8 animate-in slide-in-from-right-10 duration-300">
                  <div className="flex items-center justify-between mb-6 md:hidden">
                    <button onClick={() => setSelectedClient(null)} className="text-xs font-bold text-indigo-500 uppercase">Retour liste</button>
                  </div>

                  {/* Client Header Card */}
                  <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 mr-4">
                           {isEditing && editData ? (
                             <div className="space-y-3">
                               <div className="flex gap-2">
                                 <select 
                                   value={editData.type} 
                                   onChange={(e) => setEditData({...editData, type: e.target.value as any})}
                                   className="text-[10px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border-none outline-none"
                                 >
                                   <option value="Entreprise">Entreprise</option>
                                   <option value="Particulier">Particulier</option>
                                 </select>
                                 <select 
                                   value={editData.category || ''} 
                                   onChange={(e) => setEditData({...editData, category: e.target.value})}
                                   className="text-[10px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-none outline-none"
                                 >
                                   <option value="">-- Catégorie --</option>
                                   {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                 </select>
                               </div>
                               <input 
                                 type="text" 
                                 value={editData.name} 
                                 onChange={(e) => setEditData({...editData, name: e.target.value})}
                                 placeholder="Nom du Client / Contact"
                                 className="text-3xl font-black w-full bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none pb-1"
                               />
                               <input 
                                 type="text" 
                                 value={editData.companyName || ''} 
                                 onChange={(e) => setEditData({...editData, companyName: e.target.value})}
                                 placeholder="Nom de l'entreprise (si différent)"
                                 className="text-sm font-bold w-full bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none pb-1 text-slate-500"
                               />
                               <input 
                                 type="text" 
                                 value={editData.siret || ''} 
                                 onChange={(e) => setEditData({...editData, siret: e.target.value})}
                                 placeholder="SIRET"
                                 className="text-xs w-full bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none pb-1 font-mono"
                               />
                             </div>
                           ) : (
                             <>
                               <div className="flex gap-2 mb-2">
                                 <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg inline-block ${selectedClient.type === 'Entreprise' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                   {selectedClient.type}
                                 </span>
                                 {selectedClient.category && (
                                   <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 inline-block">
                                     {selectedClient.category}
                                   </span>
                                 )}
                               </div>
                               <h1 className="text-3xl font-black">{selectedClient.name}</h1>
                               {selectedClient.companyName && <p className="text-sm font-bold text-slate-500">{selectedClient.companyName}</p>}
                               {selectedClient.siret && <p className="text-xs text-slate-400 mt-1 font-mono">SIRET: {selectedClient.siret}</p>}
                             </>
                           )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                           <div className="text-right">
                             <p className="text-[10px] font-black uppercase text-slate-400">Valeur Client</p>
                             <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                               {enrichedClients.find(c => c.id === selectedClient.id)?.totalRevenue.toLocaleString()} €
                             </p>
                           </div>
                           
                           {!isEditing ? (
                             <button 
                               onClick={handleStartEdit}
                               className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-indigo-600 transition-colors"
                               title="Modifier"
                             >
                               <Edit3 size={18} />
                             </button>
                           ) : (
                             <div className="flex gap-2">
                               <button 
                                 onClick={handleCancelEdit}
                                 className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold"
                               >
                                 Annuler
                               </button>
                               <button 
                                 onClick={handleSaveEdit}
                                 className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow-lg"
                               >
                                 <Save size={14} /> Enregistrer
                               </button>
                             </div>
                           )}
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                           <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500"><Mail size={16}/></div>
                           {isEditing && editData ? (
                             <input 
                               type="email" 
                               value={editData.email} 
                               onChange={(e) => setEditData({...editData, email: e.target.value})}
                               className="bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none w-full text-sm font-bold"
                             />
                           ) : (
                             <span className="text-sm font-bold">{selectedClient.email}</span>
                           )}
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500"><Phone size={16}/></div>
                           {isEditing && editData ? (
                             <input 
                               type="tel" 
                               value={editData.phone} 
                               onChange={(e) => setEditData({...editData, phone: e.target.value})}
                               className="bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none w-full text-sm font-bold"
                             />
                           ) : (
                             <span className="text-sm font-bold">{selectedClient.phone}</span>
                           )}
                        </div>
                        <div className="flex items-center gap-3 md:col-span-2">
                           <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500"><MapPin size={16}/></div>
                           {isEditing && editData ? (
                             <input 
                               type="text" 
                               value={editData.address} 
                               onChange={(e) => setEditData({...editData, address: e.target.value})}
                               className="bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none w-full text-sm font-bold"
                             />
                           ) : (
                             <span className="text-sm font-bold">{selectedClient.address}</span>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* History Section */}
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                    <History size={16}/> Historique Dossiers
                  </h3>
                  
                  <div className="space-y-3">
                     {selectedClientHistory.map(group => (
                       <div key={group.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:shadow-md transition-shadow">
                          <div className={`p-3 rounded-xl font-black text-xs text-center min-w-[3.5rem] ${group.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                             <span className="block text-[8px] uppercase opacity-70">{new Date(group.startDate).toLocaleDateString('fr-FR', {month: 'short'})}</span>
                             <span className="text-lg">{new Date(group.startDate).getDate()}</span>
                          </div>
                          <div className="flex-1">
                             <div className="flex justify-between items-start">
                                <h4 className="font-bold text-sm">{group.name}</h4>
                                <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{group.category}</span>
                             </div>
                             <p className="text-xs text-slate-500 mt-1">{group.pax} PAX • {group.nights} Nuits</p>
                          </div>
                          <div className="text-right">
                             {/* Calculated total for this group */}
                             <p className="font-black text-sm">
                               {group.invoiceItems?.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0).toLocaleString()} €
                             </p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">HT</p>
                          </div>
                       </div>
                     ))}
                     {selectedClientHistory.length === 0 && (
                       <div className="text-center py-8 text-slate-400 italic">Aucun dossier trouvé.</div>
                     )}
                  </div>

               </div>
             ) : (
               <div className="text-center opacity-30">
                  <Briefcase size={64} className="mx-auto mb-4"/>
                  <p className="text-xl font-black">Sélectionnez un client</p>
                  <p className="font-medium">pour voir son historique</p>
               </div>
             )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDatabaseModal;
