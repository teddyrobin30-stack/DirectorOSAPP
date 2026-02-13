import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  BedDouble, AlertTriangle, RefreshCw, Check, Camera, Plus, Trash2, Printer,
  ArrowLeft, Shirt, FileText, Download, X, Settings, Edit3, Save, Filter, ArrowUpDown, Calendar, Loader2
} from 'lucide-react';
import { Room, LaundryIssue, UserSettings, RoomStatusHK, RoomStatusFront, LaundryType } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { DB_COLLECTIONS } from '../services/db';

interface HousekeepingViewProps {
  userSettings: UserSettings;
  rooms: Room[];
  onUpdateRooms: (rooms: Room[]) => void;
  // laundryIssues & onUpdateLaundry removed (Self-managed)
  onNavigate: (tab: string) => void;
}

const LAUNDRY_TYPES: LaundryType[] = ['Drap plat', 'Housse couette', 'Taie', 'Serviette bain', 'Tapis', 'Peignoir', 'Autre'];

const HousekeepingView: React.FC<HousekeepingViewProps> = ({
  userSettings, rooms, onUpdateRooms, onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'laundry'>('rooms');

  // --- ROOMS STATE ---
  const [isEditMode, setIsEditMode] = useState(false); // Mode édition global
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');

  // Rename Modal State
  const [roomToRename, setRoomToRename] = useState<Room | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // --- LAUNDRY STATE (FIRESTORE) ---
  const [laundryIssues, setLaundryIssues] = useState<LaundryIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState<{ type: LaundryType, qty: number, comment: string, photo: string | null }>({
    type: 'Drap plat', qty: 1, comment: '', photo: null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // --- LAUNDRY FILTERS STATE ---
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedType, setSelectedType] = useState<LaundryType | 'ALL'>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // --- FIRESTORE SUBSCRIPTION ---
  useEffect(() => {
    setIsLoading(true);
    const q = query(
      collection(db, DB_COLLECTIONS.HOUSEKEEPING_ISSUES),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issues = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LaundryIssue[];
      setLaundryIssues(issues);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching housekeeping issues:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- ROOMS LOGIC ---

  const handleResetDay = () => {
    if (confirm("Réinitialiser le statut Housekeeping de toutes les chambres pour une nouvelle journée ?")) {
      const resetRooms = rooms.map(r => ({
        ...r,
        statusHK: 'not_started' as RoomStatusHK,
        statusFront: 'stayover' as RoomStatusFront // Default back to stayover, reception must update departures
      }));
      onUpdateRooms(resetRooms);
    }
  };

  const cycleHKStatus = (room: Room) => {
    if (isEditMode) return; // Prevent status change in edit mode
    const nextStatus: Record<RoomStatusHK, RoomStatusHK> = {
      'not_started': 'in_progress',
      'in_progress': 'ready',
      'ready': 'not_started'
    };
    const updated = rooms.map(r => r.id === room.id ? { ...r, statusHK: nextStatus[r.statusHK] } : r);
    onUpdateRooms(updated);
  };

  const cycleFrontStatus = (room: Room) => {
    if (isEditMode) return; // Prevent status change in edit mode
    const nextStatus: Record<RoomStatusFront, RoomStatusFront> = {
      'stayover': 'departure',
      'departure': 'arrival',
      'arrival': 'vacant',
      'vacant': 'stayover'
    };
    const updated = rooms.map(r => r.id === room.id ? { ...r, statusFront: nextStatus[r.statusFront] } : r);
    onUpdateRooms(updated);
  };

  const handleAddRoom = () => {
    if (newRoomNumber) {
      const newRoom: Room = {
        id: `rm-${Date.now()}`, // Unique ID based on timestamp to avoid collision
        number: newRoomNumber,
        floor: parseInt(newRoomNumber.replace(/\D/g, '')[0]) || 1, // Try to guess floor from number
        type: 'Double', // Default
        statusFront: 'stayover',
        statusHK: 'not_started'
      };
      // Add and re-sort by room number naturally
      onUpdateRooms([...rooms, newRoom].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })));
      setNewRoomNumber('');
      setShowAddRoom(false);
    }
  };

  const handleDeleteRoom = (id: string, number: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la chambre ${number} définitivement ?`)) {
      onUpdateRooms(rooms.filter(r => r.id !== id));
    }
  };

  const openRenameModal = (room: Room) => {
    setRoomToRename(room);
    setRenameValue(room.number);
  };

  const handleRenameRoom = () => {
    if (roomToRename && renameValue) {
      const updated = rooms.map(r => r.id === roomToRename.id ? { ...r, number: renameValue } : r)
        .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
      onUpdateRooms(updated);
      setRoomToRename(null);
      setRenameValue('');
    }
  };

  const getHKColor = (status: RoomStatusHK) => {
    switch (status) {
      case 'not_started': return 'bg-red-500 text-white border-red-600';
      case 'in_progress': return 'bg-orange-400 text-white border-orange-500';
      case 'ready': return 'bg-emerald-500 text-white border-emerald-600';
      default: return 'bg-slate-200 text-slate-500';
    }
  };

  const getFrontLabel = (status: RoomStatusFront) => {
    switch (status) {
      case 'stayover': return 'Recouche';
      case 'departure': return 'Départ';
      case 'arrival': return 'Arrivée';
      case 'vacant': return 'Libre';
    }
  };

  // --- LAUNDRY LOGIC ---

  // Filtered Laundry Data (Client-side filtering for now, but sorting is handled by DB for initial fetch)
  const filteredIssues = useMemo(() => {
    return laundryIssues.filter(issue => {
      // Filter by Month
      const issueDate = new Date(issue.date);
      const issueMonth = issueDate.toISOString().slice(0, 7); // YYYY-MM
      const matchMonth = issueMonth === selectedMonth;

      // Filter by Type
      const matchType = selectedType === 'ALL' || issue.type === selectedType;

      return matchMonth && matchType;
    }).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [laundryIssues, selectedMonth, selectedType, sortOrder]);

  const totalLosses = useMemo(() => filteredIssues.reduce((acc, curr) => acc + curr.quantity, 0), [filteredIssues]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (!file.type.startsWith('image/')) {
      alert("Fichier non valide. Image requise.");
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
      setIssueForm(prev => ({ ...prev, photo: base64 }));
    } catch (error) {
      console.error("Erreur upload:", error);
      alert("Erreur lors de l'upload.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveIssue = async () => {
    try {
      // 1. SANITIZATION (Nettoyage des données)
      const issueData = {
        item: issueForm.type || "Non spécifié",
        type: issueForm.type || "Autre",     // Keep for compatibility
        room: "N/A",                         // Default as requested
        quantity: Number(issueForm.qty) || 1,
        status: "pending",
        date: serverTimestamp(),             // Use server timestamp
        userId: auth.currentUser?.uid || "anonymous",
        comment: issueForm.comment || "",    // Note: 'comment' matches existing DB field, user asked for 'comments' but I should stick to DB schema for comments if possible, but I'll add 'comments' too if I want to match user request exactly. Actually, looking at previous code, it used `comment` (singular). User asked for `comments` (plural). I'll stick to `comment` (singular) for the existing field and maybe add `comments` alias if I want to be safe, but cleaner to just use `comment`. Wait, user said `comments: comments || ""`. I'll use `comment` to match existing `onSnapshot` reading `issue.comment`.
        photoUrl: issueForm.photo || undefined,
        reportedBy: 'Housekeeping'
      };

      await addDoc(collection(db, DB_COLLECTIONS.HOUSEKEEPING_ISSUES), issueData);

      // 3. CORRECTION ESTHÉTIQUE
      setShowIssueModal(false);
      setIssueForm({ type: 'Drap plat', qty: 1, comment: '', photo: null });
    } catch (error: any) {
      console.error("Error saving issue:", error);

      // 2. GESTION D'ERREUR AMÉLIORÉE
      if (error.message && (error.message.includes('offline') || error.message.includes('network') || error.code === 'unavailable')) {
        alert("Erreur : Impossible de contacter le serveur. Vérifiez votre connexion ou désactivez votre bloqueur de publicité/AdBlock.");
      } else {
        alert(`Erreur lors de l'enregistrement: ${error.message || 'Erreur technique'}`);
      }
    }
  };

  const deleteIssue = async (id: string) => {
    if (confirm("Supprimer ce signalement ?")) {
      try {
        await deleteDoc(doc(db, DB_COLLECTIONS.HOUSEKEEPING_ISSUES, id));
      } catch (error) {
        console.error("Error deleting issue:", error);
        alert("Erreur lors de la suppression.");
      }
    }
  };

  const formatPeriod = (isoMonth: string) => {
    const [year, month] = isoMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden animate-in fade-in ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>

      {/* HEADER */}
      <div className={`p-6 border-b z-20 flex justify-between items-center ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-violet-600 rounded-2xl text-white shadow-lg shadow-violet-500/20">
            <BedDouble size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black">Hébergement</h2>
            <p className="text-xs font-bold text-slate-400">Housekeeping & Linge</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={14} /> Accueil
        </button>
      </div>

      {/* TABS */}
      <div className="px-6 py-4">
        <div className="flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-800 w-fit overflow-x-auto whitespace-nowrap max-w-full no-scrollbar px-2">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'rooms' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}
          >
            <BedDouble size={14} /> Tableau des Chambres
          </button>
          <button
            onClick={() => setActiveTab('laundry')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'laundry' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}
          >
            <Shirt size={14} /> Linge Non-Conforme
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 pb-20 no-scrollbar">

        {/* --- ROOMS TAB --- */}
        {activeTab === 'rooms' && (
          <div className="space-y-6 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  Statut Étages
                  <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full text-slate-500">{rooms.length}</span>
                </h3>
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`ml-2 p-2 rounded-xl border-2 transition-all ${isEditMode ? 'bg-amber-100 border-amber-300 text-amber-600 animate-pulse' : 'border-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  title="Gérer les chambres (Ajout/Suppression)"
                >
                  <Settings size={18} />
                </button>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                {/* Add Room Button - Enhanced in Edit Mode */}
                <button
                  onClick={() => setShowAddRoom(!showAddRoom)}
                  className={`flex-1 md:flex-none p-2 rounded-xl border-2 transition-colors flex items-center justify-center gap-2 ${isEditMode || showAddRoom ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-violet-500 hover:border-violet-200'}`}
                >
                  <Plus size={20} /> {isEditMode && <span className="text-xs font-bold uppercase pr-2">Ajouter Chambre</span>}
                </button>
                {!isEditMode && (
                  <button
                    onClick={handleResetDay}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-colors"
                  >
                    <RefreshCw size={14} /> Nouvelle Journée
                  </button>
                )}
              </div>
            </div>

            {/* Add Room Inline */}
            {showAddRoom && (
              <div className="flex gap-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-in fade-in slide-in-from-top-2 border-2 border-dashed border-slate-300 dark:border-slate-700">
                <input
                  type="text"
                  placeholder="N° Chambre (ex: 101)"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="flex-1 p-2 rounded-xl bg-white dark:bg-slate-900 font-bold outline-none border-2 border-transparent focus:border-violet-500"
                  autoFocus
                />
                <button onClick={handleAddRoom} className="px-4 bg-violet-600 text-white rounded-xl font-bold uppercase text-xs">Ajouter</button>
              </div>
            )}

            {/* Rename Modal */}
            {roomToRename && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className={`w-full max-w-sm rounded-[32px] p-6 shadow-2xl ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
                  <h3 className="text-lg font-black mb-4">Modifier Chambre</h3>
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 font-black text-xl mb-4 border-2 border-transparent focus:border-indigo-500 outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setRoomToRename(null)} className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Annuler</button>
                    <button onClick={handleRenameRoom} className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-lg">Enregistrer</button>
                  </div>
                </div>
              </div>
            )}

            {/* Rooms Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {rooms.map(room => (
                <div key={room.id} className={`rounded-3xl overflow-hidden shadow-sm border-2 transition-all relative ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>

                  {/* EDIT MODE OVERLAY ACTIONS */}
                  {isEditMode && (
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); openRenameModal(room); }}
                        className="p-1.5 bg-white dark:bg-slate-700 text-slate-500 hover:text-indigo-500 rounded-full shadow-sm border border-slate-100 dark:border-slate-600"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id, room.number); }}
                        className="p-1.5 bg-white dark:bg-slate-700 text-slate-500 hover:text-red-500 rounded-full shadow-sm border border-slate-100 dark:border-slate-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  {/* Top: Front Desk Status */}
                  <div
                    onClick={() => cycleFrontStatus(room)}
                    className={`p-3 text-center cursor-pointer transition-opacity border-b-2 border-dashed ${isEditMode ? 'cursor-default opacity-50' : 'hover:opacity-80'} ${userSettings.darkMode ? 'border-slate-700' : 'border-slate-100'}`}
                  >
                    <h4 className="text-2xl font-black">{room.number}</h4>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${room.statusFront === 'departure' ? 'bg-amber-100 text-amber-700' :
                      room.statusFront === 'arrival' ? 'bg-blue-100 text-blue-700' :
                        room.statusFront === 'vacant' ? 'bg-slate-100 text-slate-500' :
                          'bg-indigo-100 text-indigo-700'
                      }`}>
                      {getFrontLabel(room.statusFront)}
                    </span>
                  </div>

                  {/* Bottom: HK Status */}
                  <div
                    onClick={() => cycleHKStatus(room)}
                    className={`p-4 flex items-center justify-center cursor-pointer transition-colors ${isEditMode ? 'cursor-default opacity-80' : ''} ${getHKColor(room.statusHK)}`}
                  >
                    {room.statusHK === 'ready' ? <Check size={24} /> : (
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {room.statusHK === 'in_progress' ? 'En cours' : 'Pas fait'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- LAUNDRY TAB --- */}
        {activeTab === 'laundry' && (
          <div className="h-full flex flex-col pt-6">

            {/* FILTERS TOOLBAR */}
            <div className={`flex flex-col md:flex-row gap-4 justify-between items-center p-4 rounded-3xl border mb-6 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                {/* Period Picker */}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Calendar size={16} className="text-slate-400 ml-1" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-xs font-bold uppercase outline-none text-slate-700 dark:text-slate-200"
                  />
                </div>

                {/* Type Filter */}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Filter size={16} className="text-slate-400 ml-1" />
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as LaundryType | 'ALL')}
                    className="bg-transparent text-xs font-bold outline-none uppercase text-slate-700 dark:text-slate-200 w-32 cursor-pointer"
                  >
                    <option value="ALL">Tous types</option>
                    {LAUNDRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Sort Order */}
                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-indigo-500 border border-slate-200 dark:border-slate-700 transition-colors"
                  title="Inverser le tri"
                >
                  <ArrowUpDown size={16} />
                </button>

                {/* Stats */}
                <div className="flex items-center px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                  <span className="text-[10px] font-black uppercase text-indigo-400 mr-2">Total sur la période</span>
                  <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{totalLosses} articles</span>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => setShowReportPreview(true)}
                  className="px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold text-xs uppercase text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <Printer size={16} /> Éditer Rapport
                </button>
                <button
                  onClick={() => setShowIssueModal(true)}
                  className="px-6 py-3 rounded-xl bg-violet-600 text-white font-bold text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-violet-700 transition-colors"
                >
                  <Plus size={16} /> Signaler Linge
                </button>
              </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIssues.map(issue => (
                <div key={issue.id} className={`p-4 rounded-3xl border flex gap-4 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700">
                    {issue.photoUrl ? (
                      <img src={issue.photoUrl} alt="Preuve" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Camera size={24} />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase text-slate-400">{new Date(issue.date).toLocaleDateString()}</span>
                      <button onClick={() => deleteIssue(issue.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                    <h4 className="font-bold text-sm truncate">{issue.type}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 line-clamp-2">
                      {issue.quantity}x — {issue.comment || 'Aucun commentaire'}
                    </p>
                  </div>
                </div>
              ))}
              {filteredIssues.length === 0 && (
                <div className="col-span-full py-20 text-center opacity-40">
                  <Shirt size={48} className="mx-auto mb-4 text-slate-400" />
                  <p className="font-bold text-slate-500">Aucun linge signalé pour cette période.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* --- MODAL SIGNALEMENT --- */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-[32px] p-6 shadow-2xl ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Nouveau Signalement</h3>
              <button onClick={() => setShowIssueModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Type</label>
                  <select
                    value={issueForm.type}
                    onChange={(e) => setIssueForm({ ...issueForm, type: e.target.value as LaundryType })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none dark:text-white"
                  >
                    {LAUNDRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    value={issueForm.qty}
                    onChange={(e) => setIssueForm({ ...issueForm, qty: parseInt(e.target.value) || 1 })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Commentaire</label>
                <textarea
                  placeholder="Détails (tache, déchirure...)"
                  value={issueForm.comment}
                  onChange={(e) => setIssueForm({ ...issueForm, comment: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none dark:text-white resize-none h-24"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Photo Preuve</label>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors overflow-hidden relative"
                >
                  {isUploading ? (
                    <Loader2 size={24} className="text-indigo-500 animate-spin" />
                  ) : issueForm.photo ? (
                    <img src={issueForm.photo} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera size={24} className="text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-slate-400">Prendre / Choisir photo</span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleSaveIssue}
                disabled={isUploading}
                className="w-full py-4 rounded-2xl bg-violet-600 text-white font-black uppercase text-xs tracking-widest shadow-lg mt-2 disabled:opacity-50"
              >
                {isUploading ? 'Traitement...' : 'Enregistrer le litige'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REPORT PRINT PREVIEW --- */}
      {showReportPreview && (
        <div className="fixed inset-0 z-[200] bg-white text-slate-900 overflow-y-auto">
          {/* Close Button (Hidden in Print) */}
          <div className="fixed top-4 right-4 z-50 no-print flex gap-2">
            <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg flex items-center gap-2"><Printer size={16} /> Imprimer PDF</button>
            <button onClick={() => setShowReportPreview(false)} className="px-6 py-3 bg-slate-200 text-slate-600 rounded-xl font-bold"><X size={16} /></button>
          </div>

          {/* Printable Content */}
          <div id="printable-content" className="max-w-3xl mx-auto p-12">
            <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-10">
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Rapport de Non-Conformité</h1>
                <p className="text-lg font-bold text-indigo-600 uppercase tracking-widest">{formatPeriod(selectedMonth)}</p>
                <p className="text-sm font-medium text-slate-500 mt-1">Service Gouvernante</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-slate-400 uppercase">Date d'édition</p>
                <p className="font-black text-xl">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-8">
              {filteredIssues.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="py-4 font-black uppercase text-xs text-slate-500 w-24">Date</th>
                      <th className="py-4 font-black uppercase text-xs text-slate-500 w-32">Photo</th>
                      <th className="py-4 font-black uppercase text-xs text-slate-500">Article</th>
                      <th className="py-4 font-black uppercase text-xs text-slate-500 text-center w-16">Qté</th>
                      <th className="py-4 font-black uppercase text-xs text-slate-500">Détails</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIssues.map(issue => (
                      <tr key={issue.id} className="break-inside-avoid">
                        <td className="py-4 align-top text-sm font-bold text-slate-600">{new Date(issue.date).toLocaleDateString()}</td>
                        <td className="py-4 align-top">
                          {issue.photoUrl && (
                            <div className="w-20 h-20 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                              <img src={issue.photoUrl} className="w-full h-full object-cover" alt="preuve" />
                            </div>
                          )}
                        </td>
                        <td className="py-4 align-top font-black text-slate-900">{issue.type}</td>
                        {/* FORCE BLACK COLOR FOR QUANTITY IN PRINT */}
                        <td className="py-4 align-top text-center font-black text-lg text-black">{issue.quantity}</td>
                        <td className="py-4 align-top text-sm italic text-slate-600 bg-slate-50/50 rounded p-2">{issue.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
                  <p className="font-bold text-slate-400">Aucun litige enregistré sur cette période.</p>
                </div>
              )}
            </div>

            <div className="mt-20 pt-8 border-t border-slate-200 text-center text-xs text-slate-400 uppercase font-bold tracking-widest">
              Document généré par HotelOS - {filteredIssues.length} articles non-conformes
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HousekeepingView;