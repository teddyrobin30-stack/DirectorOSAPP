
import React, { useState, useMemo } from 'react';
import { 
  Flower2, Plus, Calendar, Clock, Phone, Mail, 
  CheckCircle2, XCircle, AlertCircle, User, X, Search, Filter, ArrowDownUp, Archive, History
} from 'lucide-react';
import { SpaRequest, UserSettings, SpaRefusalReason, SpaStatus } from '../types';

interface SpaViewProps {
  userSettings: UserSettings;
  requests: SpaRequest[];
  onUpdateRequests: (requests: SpaRequest[]) => void;
}

const SpaView: React.FC<SpaViewProps> = ({ userSettings, requests, onUpdateRequests }) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [showRefusalModal, setShowRefusalModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  
  // --- FILTER & SORT STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'confirmed' | 'today' | 'archived'>('pending');
  const [sortOrder, setSortOrder] = useState<'date_asc' | 'created_desc' | 'status'>('date_asc');

  // New Request Form
  const [newRequest, setNewRequest] = useState({
    clientName: '',
    phone: '',
    email: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    treatment: ''
  });

  // Refusal Form
  const [refusalReason, setRefusalReason] = useState<SpaRefusalReason>('complet_cabine');

  const handleValidate = (id: string) => {
    const updated = requests.map(r => r.id === id ? { ...r, status: 'confirmed' as const } : r);
    onUpdateRequests(updated);
  };

  const handleDeclineClick = (id: string) => {
    setSelectedRequestId(id);
    setShowRefusalModal(true);
  };

  const handleConfirmRefusal = () => {
    if (!selectedRequestId) return;
    const updated = requests.map(r => r.id === selectedRequestId ? { 
      ...r, 
      status: 'refused' as SpaStatus,
      refusalReason: refusalReason
    } : r);
    onUpdateRequests(updated);
    setShowRefusalModal(false);
    setSelectedRequestId(null);
  };

  const handleSaveNew = () => {
    if (!newRequest.clientName || !newRequest.date || !newRequest.time) return;
    
    const request: SpaRequest = {
      id: `spa-${Date.now()}`,
      ...newRequest,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    onUpdateRequests([request, ...requests]);
    setShowNewModal(false);
    setNewRequest({
      clientName: '', phone: '', email: '', 
      date: new Date().toISOString().split('T')[0], time: '10:00', treatment: ''
    });
  };

  // --- FILTERING LOGIC (NULL SAFETY) ---
  const processedRequests = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return requests.filter(req => {
      // 1. Search Filter (Safe Lowercase)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (req.clientName || '').toLowerCase().includes(searchLower) ||
        (req.phone || '').includes(searchLower) ||
        (req.email || '').toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // 2. Status/Chip Filter
      if (filterStatus === 'pending') return req.status === 'pending';
      if (filterStatus === 'confirmed') return req.status === 'confirmed' && req.date >= todayStr;
      if (filterStatus === 'today') return req.date === todayStr && (req.status as string) !== 'refused';
      if (filterStatus === 'archived') {
        // Show refused OR past confirmed events
        return (req.status as string) === 'refused' || (req.status === 'confirmed' && req.date < todayStr);
      }
      return true;
    }).sort((a, b) => {
      // 3. Sorting (Safe Date Parsing)
      try {
        if (sortOrder === 'date_asc') {
          // Sort by Care Date (Next -> Far)
          const dateA = new Date(`${a.date || '9999-12-31'}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date || '9999-12-31'}T${b.time || '00:00'}`).getTime();
          return dateA - dateB;
        } 
        if (sortOrder === 'created_desc') {
          // Sort by Request Date (Recent -> Old)
          const createdA = new Date(a.createdAt || 0).getTime();
          const createdB = new Date(b.createdAt || 0).getTime();
          return createdB - createdA;
        }
        if (sortOrder === 'status') {
          return (a.status || '').localeCompare(b.status || '');
        }
        return 0;
      } catch (e) {
        return 0; // Prevent crash on sort error
      }
    });
  }, [requests, searchTerm, filterStatus, sortOrder]);

  const getStatusColor = (req: SpaRequest) => {
    // Override color for past events in archive view
    const todayStr = new Date().toISOString().split('T')[0];
    const isPast = req.date < todayStr;

    if (filterStatus === 'archived' || isPast || (req.status as string) === 'refused') {
       return 'border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 opacity-80 grayscale';
    }

    switch (req.status as string) {
      case 'confirmed': return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
      case 'refused': return 'border-red-200 bg-red-50 dark:bg-red-900/10 opacity-70';
      default: return 'border-violet-200 bg-white dark:bg-slate-800'; // Pending
    }
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden animate-in fade-in ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Header */}
      <div className={`p-6 border-b z-20 flex justify-between items-center ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
         <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-600 rounded-2xl text-white shadow-lg shadow-violet-500/20">
              <Flower2 size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black">Spa & Bien-être</h2>
              <p className="text-xs font-bold text-slate-400">Demandes de Soins</p>
            </div>
         </div>
         <button 
           onClick={() => setShowNewModal(true)}
           className="px-6 py-3 rounded-xl bg-violet-600 text-white font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-violet-700 transition-colors"
         >
           <Plus size={16}/> Nouvelle Réservation
         </button>
      </div>

      {/* TOOLBAR */}
      <div className={`px-6 py-4 border-b flex flex-col md:flex-row gap-4 justify-between items-center ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
         
         {/* Search */}
         <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 w-full md:w-64 border border-transparent focus-within:border-violet-500 transition-colors">
            <Search size={16} className="text-slate-400 mr-2"/>
            <input 
              type="text" 
              placeholder="🔍 Chercher un client..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent outline-none text-xs font-bold w-full"
            />
         </div>

         {/* Quick Filters */}
         <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
            <button 
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all ${filterStatus === 'pending' ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
            >
               En Attente
            </button>
            <button 
              onClick={() => setFilterStatus('confirmed')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all ${filterStatus === 'confirmed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
            >
               Confirmés
            </button>
            <button 
              onClick={() => setFilterStatus('today')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all ${filterStatus === 'today' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
            >
               Aujourd'hui
            </button>
            <button 
              onClick={() => setFilterStatus('archived')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all ${filterStatus === 'archived' ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
            >
               Archives / Refusés
            </button>
         </div>

         {/* Sort */}
         <div className="flex items-center gap-2 w-full md:w-auto">
            <ArrowDownUp size={14} className="text-slate-400"/>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer text-slate-600 dark:text-slate-300"
            >
               <option value="date_asc">📅 Date de Soin (Prochain)</option>
               <option value="created_desc">📩 Date Demande (Récent)</option>
               <option value="status">Statut</option>
            </select>
         </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-20 pt-6 no-scrollbar">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {processedRequests.map(req => (
              <div 
                key={req.id} 
                className={`p-5 rounded-3xl border-2 transition-all hover:shadow-md flex flex-col justify-between ${getStatusColor(req)}`}
              >
                 <div className="space-y-4">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-full shadow-sm ${filterStatus === 'archived' ? 'bg-slate-200 text-slate-500' : 'bg-white dark:bg-slate-700 text-violet-500'}`}>
                             <User size={16}/>
                          </div>
                          <div>
                             <h3 className="font-bold text-sm">{req.clientName}</h3>
                             <p className="text-[10px] text-slate-500 font-medium">Demande du {new Date(req.createdAt || Date.now()).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                         req.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                         req.status === 'refused' ? 'bg-red-100 text-red-700' :
                         'bg-violet-100 text-violet-700'
                       }`}>
                         {req.status === 'pending' ? 'En attente' : req.status === 'confirmed' ? 'Confirmé' : 'Refusé'}
                       </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className="p-3 bg-white/50 dark:bg-slate-900/50 rounded-xl flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400"/>
                          <span className="text-xs font-bold">{req.date ? new Date(req.date).toLocaleDateString() : 'Date N/A'}</span>
                       </div>
                       <div className="p-3 bg-white/50 dark:bg-slate-900/50 rounded-xl flex items-center gap-2">
                          <Clock size={14} className="text-slate-400"/>
                          <span className="text-xs font-bold">{req.time || '--:--'}</span>
                       </div>
                    </div>

                    <div className="p-3 bg-white/50 dark:bg-slate-900/50 rounded-xl">
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Soin souhaité</p>
                       <p className="text-sm font-medium italic">"{req.treatment || 'Non précisé'}"</p>
                    </div>

                    <div className="flex gap-4 text-xs font-bold">
                       <a href={`tel:${req.phone}`} className="flex items-center gap-1 text-slate-500 hover:text-violet-600 transition-colors">
                          <Phone size={12}/> {req.phone}
                       </a>
                       {req.email && (
                         <a href={`mailto:${req.email}`} className="flex items-center gap-1 text-slate-500 hover:text-violet-600 transition-colors">
                            <Mail size={12}/> Email
                         </a>
                       )}
                    </div>
                 </div>

                 {/* ACTION BUTTONS (Only if pending) */}
                 {req.status === 'pending' && (
                   <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                      <button 
                        onClick={() => handleDeclineClick(req.id)}
                        className="flex-1 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20 font-bold text-xs uppercase flex items-center justify-center gap-2 transition-colors"
                      >
                         <XCircle size={16}/> Décliner
                      </button>
                      <button 
                        onClick={() => handleValidate(req.id)}
                        className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-md hover:bg-emerald-600 transition-colors"
                      >
                         <CheckCircle2 size={16}/> Valider
                      </button>
                   </div>
                 )}

                 {/* ARCHIVE/REFUSED DETAILS */}
                 {(req.status as string) === 'refused' && req.refusalReason && (
                   <div className="mt-4 pt-2 border-t border-red-200">
                      <p className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-1">
                         <AlertCircle size={10}/> Motif : {req.refusalReason.replace('_', ' ')}
                      </p>
                   </div>
                 )}
                 {req.status === 'confirmed' && req.date < new Date().toISOString().split('T')[0] && (
                   <div className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                         <History size={10}/> Soin Terminé / Passé
                      </p>
                   </div>
                 )}
              </div>
            ))}
            {processedRequests.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-40">
                 <Flower2 size={48} className="mx-auto mb-4 text-slate-400"/>
                 <p className="font-bold text-slate-500">Aucune demande trouvée avec ces filtres.</p>
              </div>
            )}
         </div>
      </div>

      {/* MODAL NEW REQUEST */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className={`w-full max-w-md rounded-[32px] p-6 shadow-2xl ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black">Nouvelle Demande</h3>
                 <button onClick={() => setShowNewModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20}/></button>
              </div>
              <div className="space-y-4">
                 <input 
                   type="text" 
                   placeholder="Nom & Prénom" 
                   className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none border border-transparent focus:border-violet-500"
                   value={newRequest.clientName}
                   onChange={(e) => setNewRequest({...newRequest, clientName: e.target.value})}
                 />
                 <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="tel" 
                      placeholder="Téléphone" 
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none border border-transparent focus:border-violet-500"
                      value={newRequest.phone}
                      onChange={(e) => setNewRequest({...newRequest, phone: e.target.value})}
                    />
                    <input 
                      type="email" 
                      placeholder="Email" 
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none border border-transparent focus:border-violet-500"
                      value={newRequest.email}
                      onChange={(e) => setNewRequest({...newRequest, email: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="date" 
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none border border-transparent focus:border-violet-500"
                      value={newRequest.date}
                      onChange={(e) => setNewRequest({...newRequest, date: e.target.value})}
                    />
                    <input 
                      type="time" 
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none border border-transparent focus:border-violet-500"
                      value={newRequest.time}
                      onChange={(e) => setNewRequest({...newRequest, time: e.target.value})}
                    />
                 </div>
                 <textarea 
                   placeholder="Soin souhaité / Commentaire (ex: Massage dos 30min)" 
                   className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium text-sm outline-none border border-transparent focus:border-violet-500 resize-none h-24"
                   value={newRequest.treatment}
                   onChange={(e) => setNewRequest({...newRequest, treatment: e.target.value})}
                 />
                 <button 
                   onClick={handleSaveNew}
                   className="w-full py-4 rounded-2xl bg-violet-600 text-white font-black uppercase text-xs tracking-widest shadow-lg mt-2"
                 >
                    Enregistrer Demande
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL REFUSAL */}
      {showRefusalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className={`w-full max-w-sm rounded-[32px] p-6 shadow-2xl ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
              <h3 className="text-lg font-black mb-4 text-center">Motif du Refus</h3>
              <div className="space-y-4">
                 <select 
                   value={refusalReason}
                   onChange={(e) => setRefusalReason(e.target.value as SpaRefusalReason)}
                   className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none cursor-pointer border border-transparent focus:border-red-500"
                 >
                    <option value="complet_cabine">Complet (Cabine)</option>
                    <option value="complet_soin">Complet (Praticien)</option>
                    <option value="contre_indication">Contre-indication Médicale</option>
                    <option value="annulation">Annulation Client</option>
                    <option value="autre">Autre motif</option>
                 </select>
                 <div className="flex gap-2">
                    <button onClick={() => setShowRefusalModal(false)} className="flex-1 py-3 rounded-xl font-bold text-xs text-slate-500 bg-slate-100 dark:bg-slate-800">Annuler</button>
                    <button onClick={handleConfirmRefusal} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-xs uppercase shadow-md hover:bg-red-600">Confirmer Refus</button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default SpaView;
