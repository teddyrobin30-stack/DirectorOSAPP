import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bell, AlertTriangle, CheckCircle2, Clock, Car, Search, Plus, 
  Trash2, User, Eye, MapPin, Camera, X, ClipboardList, BedDouble, 
  MessageSquare, ShieldAlert, ArrowRight, Check, Filter, Archive, RotateCcw, Box, Loader2
} from 'lucide-react';
import { UserSettings, Room, LogEntry, WakeUpCall, TaxiBooking, LostItem, UserProfile, LogPriority, LogTarget, LostItemStatus } from '../types';
import { useAuth } from '../services/authContext';

interface ReceptionViewProps {
  userSettings: UserSettings;
  rooms: Room[]; // From App state (HK link)
  logs: LogEntry[];
  onUpdateLogs: (logs: LogEntry[]) => void;
  wakeups: WakeUpCall[];
  onUpdateWakeups: (w: WakeUpCall[]) => void;
  taxis: TaxiBooking[];
  onUpdateTaxis: (t: TaxiBooking[]) => void;
  lostItems: LostItem[];
  onUpdateLostItems: (l: LostItem[]) => void;
}

const ReceptionView: React.FC<ReceptionViewProps> = ({ 
  userSettings, rooms, logs, onUpdateLogs, wakeups, onUpdateWakeups, taxis, onUpdateTaxis, lostItems, onUpdateLostItems 
}) => {
  const { user, getAllUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'main_courante' | 'concierge' | 'lost_found'>('main_courante');
  
  // --- STATE: Main Courante ---
  const [logMessage, setLogMessage] = useState('');
  const [logPriority, setLogPriority] = useState<LogPriority>('info');
  const [logTarget, setLogTarget] = useState<LogTarget>('all');
  const [manualAuthor, setManualAuthor] = useState('');
  
  // Staff list for manual author selection
  const staffMembers = useMemo(() => getAllUsers(), []);

  // Sync manualAuthor with current user on mount/change
  useEffect(() => {
    if (user?.displayName) {
      setManualAuthor(user.displayName);
    }
  }, [user]);
  
  // Nouveaux états pour filtres Main Courante
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'URGENT' | 'IMPORTANT' | 'MINE'>('ALL');
  const [showArchives, setShowArchives] = useState(false);

  // --- STATE: Concierge ---
  const [newWakeup, setNewWakeup] = useState({ room: '', time: '' });
  const [newTaxi, setNewTaxi] = useState({ name: '', time: '', dest: '', company: '' });
  
  // --- STATE: Lost & Found ---
  const [showLostItemModal, setShowLostItemModal] = useState(false);
  const [newItemForm, setNewItemForm] = useState<{ desc: string, loc: string, date: string, finder: string, photo: string | null }>({
    desc: '', loc: '', date: new Date().toISOString().split('T')[0], finder: '', photo: null
  });
  const [lostFilter, setLostFilter] = useState<'all' | 'stored' | 'returned'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // --- WIDGET DATA (Housekeeping) ---
  const hkStats = {
    ready: rooms.filter(r => r.statusHK === 'ready').length,
    dirty: rooms.filter(r => r.statusHK === 'not_started').length,
    progress: rooms.filter(r => r.statusHK === 'in_progress').length,
    total: rooms.length
  };

  // --- HELPERS ---
  const getRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diff < 60) return "À l'instant";
      if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  // --- LOGIC: Main Courante ---
  const handlePostLog = () => {
    if (!logMessage.trim()) return;
    
    // Determine Author: Manual selection > Logged User > Default
    const finalAuthor = manualAuthor || user?.displayName || 'Réception';

    const newLog: LogEntry = {
      id: `log-${Date.now()}`,
      author: finalAuthor,
      message: logMessage,
      priority: logPriority,
      target: logTarget,
      status: 'active', // Toujours actif à la création
      timestamp: new Date().toISOString(),
      readBy: []
    };
    onUpdateLogs([newLog, ...logs]); // Newest first
    setLogMessage('');
    setLogPriority('info');
  };

  const handleReadLog = (logId: string) => {
    if (!user) return;
    const updated = logs.map(l => {
      if (l.id === logId && !l.readBy.includes(user.uid)) {
        return { ...l, readBy: [...l.readBy, user.uid] };
      }
      return l;
    });
    onUpdateLogs(updated);
  };

  const handleToggleArchiveLog = (logId: string) => {
    // SÉCURITÉ : On ne supprime jamais, on change juste le statut
    const updated = logs.map(l => {
      if (l.id === logId) {
        return { ...l, status: l.status === 'active' ? 'archived' as const : 'active' as const };
      }
      return l;
    });
    onUpdateLogs(updated);
  };

  // FILTRAGE AVANCÉ LOGS
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Filtre Archives vs Actifs
      if (showArchives) {
        if (log.status !== 'archived') return false;
      } else {
        if (log.status === 'archived') return false;
      }

      // 2. Recherche Texte
      if (logSearch) {
        const lowerSearch = logSearch.toLowerCase();
        if (!log.message.toLowerCase().includes(lowerSearch) && !log.author.toLowerCase().includes(lowerSearch)) {
          return false;
        }
      }

      // 3. Filtres Rapides (Chips)
      if (logFilter === 'URGENT' && log.priority !== 'urgent') return false;
      if (logFilter === 'IMPORTANT' && log.priority !== 'important') return false;
      if (logFilter === 'MINE' && log.author !== (user?.displayName || '')) return false;

      return true;
    });
  }, [logs, logSearch, logFilter, showArchives, user]);

  // --- LOGIC: Concierge ---
  const addWakeup = () => {
    if (!newWakeup.room || !newWakeup.time) return;
    const call: WakeUpCall = {
      id: `wk-${Date.now()}`,
      roomNumber: newWakeup.room,
      time: newWakeup.time,
      completed: false
    };
    onUpdateWakeups([...wakeups, call].sort((a, b) => a.time.localeCompare(b.time)));
    setNewWakeup({ room: '', time: '' });
  };

  const toggleWakeup = (id: string) => {
    onUpdateWakeups(wakeups.map(w => w.id === id ? { ...w, completed: !w.completed } : w));
  };

  const addTaxi = () => {
    if (!newTaxi.name || !newTaxi.time) return;
    const taxi: TaxiBooking = {
      id: `tx-${Date.now()}`,
      guestName: newTaxi.name,
      time: newTaxi.time,
      destination: newTaxi.dest,
      company: newTaxi.company,
      completed: false
    };
    onUpdateTaxis([...taxis, taxi].sort((a, b) => a.time.localeCompare(b.time)));
    setNewTaxi({ name: '', time: '', dest: '', company: '' });
  };

  const toggleTaxi = (id: string) => {
    onUpdateTaxis(taxis.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // --- LOGIC: Lost & Found ---
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (!file.type.startsWith('image/')) {
        alert("Fichier invalide.");
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert("Image trop lourde (Max 5Mo).");
        return;
    }

    setIsUploading(true);

    try {
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        setNewItemForm(prev => ({ ...prev, photo: base64 }));
    } catch (error) {
        console.error("Erreur upload:", error);
        alert("Erreur lors de l'upload.");
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveLostItem = () => {
    if (!newItemForm.desc) return;
    const item: LostItem = {
      id: `li-${Date.now()}`,
      description: newItemForm.desc,
      location: newItemForm.loc,
      dateFound: newItemForm.date,
      finder: newItemForm.finder,
      status: 'stored',
      photoUrl: newItemForm.photo || undefined
    };
    onUpdateLostItems([item, ...lostItems]);
    setShowLostItemModal(false);
    setNewItemForm({ desc: '', loc: '', date: new Date().toISOString().split('T')[0], finder: '', photo: null });
  };

  const updateItemStatus = (id: string, status: LostItemStatus) => {
    onUpdateLostItems(lostItems.map(i => i.id === id ? { ...i, status } : i));
  };

  // LOGIQUE DE FILTRE OBJETS TROUVÉS
  const filteredLostItems = useMemo(() => {
    return lostItems
      .filter(obj => lostFilter === 'all' || obj.status === lostFilter)
      .sort((a, b) => new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime());
  }, [lostItems, lostFilter]);

  const getPriorityColor = (p: LogPriority, isArchived: boolean) => {
    if (isArchived) return 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-700 dark:text-slate-500';
    switch (p) {
      case 'urgent': return 'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30';
      case 'important': return 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30';
      default: return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  return (
    <div className={`h-full flex flex-col md:flex-row overflow-hidden animate-in fade-in ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* MAIN CONTENT LEFT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
         
         {/* HEADER */}
         <div className={`p-6 border-b z-20 flex justify-between items-center ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-4">
               <div className="p-3 bg-violet-600 rounded-2xl text-white shadow-lg shadow-violet-500/20">
                 <Bell size={28} />
               </div>
               <div>
                 <h2 className="text-2xl font-black">Réception</h2>
                 <p className="text-xs font-bold text-slate-400">Front Desk & Conciergerie</p>
               </div>
            </div>
         </div>

         {/* TABS */}
         <div className="px-6 py-4">
            <div className="flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-800 w-fit overflow-x-auto whitespace-nowrap max-w-full no-scrollbar px-2">
               <button onClick={() => setActiveTab('main_courante')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'main_courante' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}>
                 <MessageSquare size={14}/> Main Courante
               </button>
               <button onClick={() => setActiveTab('concierge')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'concierge' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}>
                 <Clock size={14}/> Conciergerie
               </button>
               <button onClick={() => setActiveTab('lost_found')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'lost_found' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}>
                 <Search size={14}/> Objets Trouvés
               </button>
            </div>
         </div>

         {/* TAB CONTENT */}
         <div className="flex-1 overflow-y-auto px-6 pb-20 no-scrollbar">
            
            {/* 1. MAIN COURANTE */}
            {activeTab === 'main_courante' && (
              <div className="space-y-6 pt-2">
                 
                 {/* Input Box */}
                 <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <textarea 
                      value={logMessage}
                      onChange={(e) => setLogMessage(e.target.value)}
                      placeholder="Nouveau message de transmission..."
                      className="w-full bg-transparent outline-none text-sm font-medium resize-none h-20 mb-3 placeholder:text-slate-400"
                    />
                    <div className="flex justify-between items-center">
                       <div className="flex gap-2">
                          {/* AUTHOR SELECTION */}
                          <div className="relative">
                             <select
                               value={manualAuthor}
                               onChange={(e) => setManualAuthor(e.target.value)}
                               className="bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer max-w-[120px] truncate"
                               title="Auteur du message"
                             >
                               {staffMembers.map(u => (
                                 <option key={u.uid} value={u.displayName}>{u.displayName}</option>
                               ))}
                               {!staffMembers.some(u => u.displayName === manualAuthor) && manualAuthor && (
                                 <option value={manualAuthor}>{manualAuthor}</option>
                               )}
                             </select>
                          </div>

                          <select 
                            value={logPriority} 
                            onChange={(e) => setLogPriority(e.target.value as LogPriority)}
                            className="bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer"
                          >
                             <option value="info">Info</option>
                             <option value="important">⚠️ Important</option>
                             <option value="urgent">🚨 URGENCE</option>
                          </select>
                          <select 
                            value={logTarget} 
                            onChange={(e) => setLogTarget(e.target.value as LogTarget)}
                            className="bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer"
                          >
                             <option value="all">Tout le monde</option>
                             <option value="management">Direction</option>
                             <option value="housekeeping">Gouvernante</option>
                             <option value="maintenance">Maintenance</option>
                          </select>
                       </div>
                       <button onClick={handlePostLog} disabled={!logMessage.trim()} className="px-6 py-2 bg-violet-600 text-white rounded-xl text-xs font-black uppercase shadow-lg disabled:opacity-50">
                          Publier
                       </button>
                    </div>
                 </div>

                 {/* FILTRES & RECHERCHE */}
                 <div className="flex flex-col md:flex-row gap-3 items-center bg-slate-100 dark:bg-slate-800/50 p-2 rounded-2xl">
                    {/* Recherche */}
                    <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl px-3 py-2 flex-1 border border-slate-200 dark:border-slate-700 focus-within:border-violet-500 w-full">
                       <Search size={14} className="text-slate-400 mr-2"/>
                       <input 
                         type="text" 
                         placeholder="Rechercher (ex: Clé, 204)..." 
                         value={logSearch}
                         onChange={(e) => setLogSearch(e.target.value)}
                         className="bg-transparent outline-none text-xs font-bold w-full"
                       />
                    </div>

                    {/* Chips Filtres */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                       <button 
                         onClick={() => setLogFilter('ALL')}
                         className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${logFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                       >
                         Tout
                       </button>
                       <button 
                         onClick={() => setLogFilter('URGENT')}
                         className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${logFilter === 'URGENT' ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-500'}`}
                       >
                         🚨 Urgences
                       </button>
                       <button 
                         onClick={() => setLogFilter('IMPORTANT')}
                         className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${logFilter === 'IMPORTANT' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-500'}`}
                       >
                         ⚠️ Important
                       </button>
                       <button 
                         onClick={() => setLogFilter('MINE')}
                         className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${logFilter === 'MINE' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                       >
                         Mes messages
                       </button>
                    </div>

                    {/* Toggle Archives */}
                    <button 
                      onClick={() => setShowArchives(!showArchives)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border flex items-center gap-2 transition-all ${showArchives ? 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-white border-slate-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                    >
                       <Archive size={12}/> {showArchives ? 'Masquer Archives' : 'Voir Archives'}
                    </button>
                 </div>

                 {/* Feed */}
                 <div className="space-y-4">
                    {filteredLogs.map(log => {
                      const isArchived = log.status === 'archived';
                      const authorName = log.author || 'Anonyme';
                      return (
                        <div key={log.id} className={`p-5 rounded-3xl border transition-all duration-300 ${isArchived ? 'opacity-60 bg-slate-50 dark:bg-slate-900/50 border-slate-200 grayscale' : userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                           <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isArchived ? 'bg-slate-200 text-slate-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    {authorName.slice(0, 2).toUpperCase()}
                                 </div>
                                 <div>
                                    <span className="text-xs font-black block">{authorName}</span>
                                    <span className="text-[10px] text-slate-400">
                                      {getRelativeTime(log.timestamp)}
                                    </span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border ${getPriorityColor(log.priority, isArchived)}`}>
                                   {log.priority}
                                </span>
                                {isArchived && <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase border bg-slate-200 text-slate-500 border-slate-300">Archivé</span>}
                              </div>
                           </div>
                           <p className={`text-sm font-medium leading-relaxed mb-4 pl-10 ${isArchived ? 'line-through text-slate-400' : ''}`}>{log.message}</p>
                           
                           <div className="flex items-center justify-between pl-10 border-t border-slate-100 dark:border-slate-700 pt-3">
                              <div className="flex items-center gap-1">
                                 {log.readBy.length > 0 && <span className="text-[10px] text-slate-400 mr-2">Vu par :</span>}
                                 {log.readBy.map((uid, i) => (
                                   <div key={i} className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[8px] font-bold border border-white dark:border-slate-800 -ml-1">
                                      <Check size={10}/>
                                   </div>
                                 ))}
                              </div>
                              
                              <div className="flex gap-3">
                                {/* Bouton J'ai lu */}
                                {!isArchived && !log.readBy.includes(user?.uid || '') && (
                                  <button onClick={() => handleReadLog(log.id)} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-emerald-500 transition-colors">
                                     <CheckCircle2 size={14}/> J'ai pris l'info
                                  </button>
                                )}

                                {/* Bouton Archiver/Désarchiver */}
                                <button 
                                  onClick={() => handleToggleArchiveLog(log.id)}
                                  className={`flex items-center gap-1 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-colors ${isArchived ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                                  title={isArchived ? "Restaurer le message" : "Archiver le message (Traité)"}
                                >
                                   {isArchived ? <RotateCcw size={12}/> : <Box size={12}/>}
                                   {isArchived ? 'Restaurer' : 'Traiter / Archiver'}
                                </button>
                              </div>
                           </div>
                        </div>
                      );
                    })}
                    {filteredLogs.length === 0 && (
                      <div className="text-center py-10 opacity-40">
                         <MessageSquare size={32} className="mx-auto mb-2 text-slate-300"/>
                         <p className="text-xs font-bold text-slate-400">Aucun message ne correspond aux critères.</p>
                      </div>
                    )}
                 </div>
              </div>
            )}

            {/* 2. CONCIERGERIE */}
            {activeTab === 'concierge' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                 
                 {/* WAKE-UP CALLS */}
                 <div className={`p-6 rounded-[32px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <h3 className="text-sm font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><Clock size={16}/> Réveils</h3>
                    
                    <div className="flex gap-2 mb-4">
                       <input type="text" placeholder="Chb" value={newWakeup.room} onChange={e => setNewWakeup({...newWakeup, room: e.target.value})} className="w-16 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none text-xs font-bold text-center"/>
                       <input type="time" value={newWakeup.time} onChange={e => setNewWakeup({...newWakeup, time: e.target.value})} className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none text-xs font-bold"/>
                       <button onClick={addWakeup} className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl"><Plus size={16}/></button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                       {wakeups.map(w => (
                         <div key={w.id} className={`flex items-center justify-between p-3 rounded-xl border ${w.completed ? 'bg-slate-50 dark:bg-slate-800/50 opacity-50' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-3">
                               <span className="text-lg font-black">{w.time}</span>
                               <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">Ch {w.roomNumber}</span>
                            </div>
                            <button onClick={() => toggleWakeup(w.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${w.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                               {w.completed && <Check size={12}/>}
                            </button>
                         </div>
                       ))}
                       {wakeups.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Aucun réveil programmé.</p>}
                    </div>
                 </div>

                 {/* TAXIS */}
                 <div className={`p-6 rounded-[32px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <h3 className="text-sm font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><Car size={16}/> Commandes Taxis</h3>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                       <input type="text" placeholder="Nom Client" value={newTaxi.name} onChange={e => setNewTaxi({...newTaxi, name: e.target.value})} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none text-xs font-bold"/>
                       <input type="time" value={newTaxi.time} onChange={e => setNewTaxi({...newTaxi, time: e.target.value})} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none text-xs font-bold"/>
                       <input type="text" placeholder="Destination" value={newTaxi.dest} onChange={e => setNewTaxi({...newTaxi, dest: e.target.value})} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none text-xs font-bold"/>
                       <div className="flex gap-2">
                          <input type="text" placeholder="Compagnie" value={newTaxi.company} onChange={e => setNewTaxi({...newTaxi, company: e.target.value})} className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none text-xs font-bold"/>
                          <button onClick={addTaxi} className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl"><Plus size={16}/></button>
                       </div>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                       {taxis.map(t => (
                         <div key={t.id} className={`p-3 rounded-xl border flex justify-between items-center ${t.completed ? 'bg-slate-50 dark:bg-slate-800/50 opacity-50' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                            <div>
                               <p className="text-xs font-bold">{t.guestName} <span className="text-slate-400">({t.time})</span></p>
                               <p className="text-[10px] text-slate-500">{t.destination} • {t.company}</p>
                            </div>
                            <button onClick={() => toggleTaxi(t.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${t.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                               {t.completed && <Check size={12}/>}
                            </button>
                         </div>
                       ))}
                       {taxis.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Aucune commande.</p>}
                    </div>
                 </div>

                 {/* CHECKLIST */}
                 <div className={`col-span-full p-6 rounded-[32px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <h3 className="text-sm font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><ClipboardList size={16}/> Flux Divers</h3>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar">
                       {['Journaux reçus', 'Musique Hall ON', 'Fonds de caisse compté', 'Clés vérifiées', 'Briefing lu'].map((item, i) => (
                         <label key={i} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                            <input type="checkbox" className="w-4 h-4 accent-violet-600 rounded"/>
                            <span className="text-xs font-bold whitespace-nowrap">{item}</span>
                         </label>
                       ))}
                    </div>
                 </div>
              </div>
            )}

            {/* 3. LOST & FOUND */}
            {activeTab === 'lost_found' && (
              <div className="space-y-6 pt-2">
                 <div className="flex justify-between items-center">
                    {/* FILTRES OBJETS TROUVÉS */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                       <button 
                         onClick={() => setLostFilter('all')}
                         className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${lostFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
                       >
                         Tous
                       </button>
                       <button 
                         onClick={() => setLostFilter('stored')}
                         className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${lostFilter === 'stored' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
                       >
                         En stock
                       </button>
                       <button 
                         onClick={() => setLostFilter('returned')}
                         className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${lostFilter === 'returned' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
                       >
                         Rendu au client
                       </button>
                    </div>

                    <button onClick={() => setShowLostItemModal(true)} className="px-6 py-3 bg-violet-600 text-white rounded-xl text-xs font-black uppercase shadow-lg flex items-center gap-2">
                       <Plus size={16}/> Nouvel Objet
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLostItems.map(item => (
                      <div key={item.id} className={`p-4 rounded-3xl border flex gap-4 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                         <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700 relative">
                            {item.photoUrl ? (
                              <img src={item.photoUrl} alt="Objet" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Search size={24}/>
                              </div>
                            )}
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                               <span className="text-[10px] font-black uppercase text-slate-400">{new Date(item.dateFound).toLocaleDateString()}</span>
                               <select 
                                 value={item.status} 
                                 onChange={(e) => updateItemStatus(item.id, e.target.value as LostItemStatus)}
                                 className={`text-[9px] font-bold uppercase rounded px-1.5 py-0.5 outline-none cursor-pointer border ${
                                   item.status === 'stored' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                   item.status === 'returned' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                   item.status === 'contacted' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                   'bg-slate-100 text-slate-500 border-slate-200'
                                 }`}
                               >
                                  <option value="stored">Stocké</option>
                                  <option value="contacted">Client contacté</option>
                                  <option value="returned">Rendu</option>
                                  <option value="donated">Donné</option>
                               </select>
                            </div>
                            <h4 className="font-bold text-sm truncate mb-1">{item.description}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                               Trouvé : {item.location} (par {item.finder})
                            </p>
                         </div>
                      </div>
                    ))}
                    {filteredLostItems.length === 0 && (
                      <div className="col-span-full text-center py-20 opacity-40">
                         <p className="font-bold text-slate-500">Aucun objet trouvé.</p>
                      </div>
                    )}
                 </div>
              </div>
            )}

         </div>
      </div>

      {/* SIDEBAR WIDGET: HOUSEKEEPING STATUS */}
      <div className={`w-full md:w-80 border-l p-6 flex-shrink-0 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 ${userSettings.darkMode ? 'text-white' : 'text-slate-900'}`}>
         <h3 className="text-sm font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2">
            <BedDouble size={16}/> État des Chambres
         </h3>

         <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">Prêtes (Propres)</p>
                  <p className="text-2xl font-black text-emerald-500">{hkStats.ready}</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check size={20}/>
               </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">En cours</p>
                  <p className="text-2xl font-black text-orange-500">{hkStats.progress}</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Clock size={20}/>
               </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">À faire (Sales)</p>
                  <p className="text-2xl font-black text-red-500">{hkStats.dirty}</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <ShieldAlert size={20}/>
               </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
               <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-1000" 
                    style={{ width: `${(hkStats.ready / hkStats.total) * 100}%` }}
                  />
               </div>
               <p className="text-center text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
                  {Math.round((hkStats.ready / hkStats.total) * 100)}% du parc disponible
               </p>
            </div>
         </div>
      </div>

      {/* MODAL NEW LOST ITEM */}
      {showLostItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className={`w-full max-w-md rounded-[32px] p-6 shadow-2xl ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black">Objet Trouvé</h3>
                 <button onClick={() => setShowLostItemModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20}/></button>
              </div>
              <div className="space-y-4">
                 <input type="text" placeholder="Description (ex: Parapluie noir)" value={newItemForm.desc} onChange={e => setNewItemForm({...newItemForm, desc: e.target.value})} className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 outline-none text-sm font-bold"/>
                 <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Lieu (ex: Ch 104)" value={newItemForm.loc} onChange={e => setNewItemForm({...newItemForm, loc: e.target.value})} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 outline-none text-sm font-bold"/>
                    <input type="date" value={newItemForm.date} onChange={e => setNewItemForm({...newItemForm, date: e.target.value})} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 outline-none text-sm font-bold"/>
                 </div>
                 <input type="text" placeholder="Trouvé par (Nom)" value={newItemForm.finder} onChange={e => setNewItemForm({...newItemForm, finder: e.target.value})} className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 outline-none text-sm font-bold"/>
                 
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Photo</label>
                    <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors overflow-hidden relative"
                    >
                       {isUploading ? (
                         <Loader2 size={24} className="text-indigo-500 animate-spin" />
                       ) : newItemForm.photo ? (
                         <img src={newItemForm.photo} alt="Preview" className="w-full h-full object-cover" />
                       ) : (
                         <>
                           <Camera size={24} className="text-slate-400 mb-2"/>
                           <span className="text-xs font-bold text-slate-400">Ajouter photo</span>
                         </>
                       )}
                    </div>
                 </div>

                 <button 
                   onClick={saveLostItem} 
                   disabled={isUploading}
                   className="w-full py-4 rounded-2xl bg-violet-600 text-white font-black uppercase text-xs tracking-widest shadow-lg mt-2 disabled:opacity-50"
                 >
                    {isUploading ? 'Traitement...' : 'Enregistrer'}
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default ReceptionView;