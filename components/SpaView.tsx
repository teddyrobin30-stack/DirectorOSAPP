
import React, { useState, useMemo } from 'react';
import {
  Flower2, Plus, Calendar, Clock, Phone, Mail,
  CheckCircle2, XCircle, AlertCircle, User, X, Search, Filter, ArrowDownUp, Archive, History
} from 'lucide-react';
import { SpaRequest, UserSettings, SpaRefusalReason, SpaStatus, SpaSource, SpaInventoryItem } from '../types';
import SpaInventory from './SpaInventory';
import SpaRatioCalculator from './SpaRatioCalculator';
import SpaBookingModal from './SpaBookingModal';
import SpaCalendarView from './SpaCalendarView';
import SpaStaffingForecast from './SpaStaffingForecast';

interface SpaViewProps {
  userSettings: UserSettings;
  requests: SpaRequest[];
  onUpdateRequests: (requests: SpaRequest[]) => void;
  spaInventory: SpaInventoryItem[];
  onUpdateInventory: (items: SpaInventoryItem[]) => void;
}

const SpaView: React.FC<SpaViewProps> = ({ userSettings, requests, onUpdateRequests, spaInventory, onUpdateInventory }) => {
  const [activeTab, setActiveTab] = useState<'reservations' | 'planning' | 'staffing' | 'inventory' | 'calculator'>('reservations');
  const [forecastDate, setForecastDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingRequest, setEditingRequest] = useState<SpaRequest | null>(null);
  const [showNewModal, setShowNewModal] = useState(false); // We can still use this for 'creating' state if we want, or just check editingRequest
  const [showRefusalModal, setShowRefusalModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // --- RESCHEDULE STATE ---
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });

  // --- FILTER & SORT STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'confirmed' | 'today' | 'archived'>('pending');
  const [sortOrder, setSortOrder] = useState<'date_asc' | 'created_desc' | 'status'>('date_asc');

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

  const handleRescheduleClick = (req: SpaRequest) => {
    setSelectedRequestId(req.id);
    setRescheduleData({ date: req.date, time: req.time });
    setShowRescheduleModal(true);
  };

  const handleConfirmReschedule = () => {
    if (!selectedRequestId) return;
    const updated = requests.map(r => r.id === selectedRequestId ? {
      ...r,
      date: rescheduleData.date,
      time: rescheduleData.time,
      status: 'confirmed' as const // Auto-confirm on reschedule? Or keep pending? Let's keep status but usually rescheduling implies agreement. Let's keep it as is or confirm. Let's Confirm.
    } : r);
    onUpdateRequests(updated);
    setShowRescheduleModal(false);
    setSelectedRequestId(null);
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

  const handleSaveRequest = (updatedRequest: Partial<SpaRequest>) => {
    let finalRequests = [...requests];
    const isNew = !updatedRequest.id || !requests.find(r => r.id === updatedRequest.id);

    if (isNew) {
      const newReq: SpaRequest = {
        id: `spa-${Date.now()}`,
        clientName: updatedRequest.clientName || '',
        phone: updatedRequest.phone || '',
        email: updatedRequest.email || '',
        date: updatedRequest.date || new Date().toISOString().split('T')[0],
        time: updatedRequest.time || '10:00',
        treatment: updatedRequest.treatment || '',
        source: updatedRequest.source || 'Direct',
        status: 'pending',
        createdAt: new Date().toISOString(),
        isDuo: updatedRequest.isDuo || false,
        duration: updatedRequest.duration || 60
      };
      finalRequests = [newReq, ...requests];

      // --- NATIVE NOTIFICATION (Only for new) ---
      try {
        const savedSettings = localStorage.getItem('hotelos_notifications');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.pushEnabled && settings.newBooking && Notification.permission === 'granted') {
            const title = "💆 Nouveau Soin Réservé";
            const options = {
              body: `Client : ${newReq.clientName} - ${newReq.time}`,
              icon: "/pwa-192x192.svg",
              badge: "/pwa-192x192.svg",
              vibrate: [200, 100, 200],
              silent: false
            };
            if ('serviceWorker' in navigator && 'PushManager' in window) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options as any);
              });
            } else {
              new Notification(title, options);
            }
          }
        }
      } catch (e) {
        console.error("Erreur Notification:", e);
      }
    } else {
      // Mapping for Edit
      finalRequests = requests.map(r => r.id === updatedRequest.id ? { ...r, ...updatedRequest } as SpaRequest : r);
    }

    onUpdateRequests(finalRequests);
    setEditingRequest(null);
    setShowNewModal(false);
  };

  const handleDeleteRequest = (id: string) => {
    if (window.confirm("Supprimer cette réservation ?")) {
      onUpdateRequests(requests.filter(r => r.id !== id));
      setEditingRequest(null);
    }
  };

  const handleUpdateSpaDate = (id: string | number, date: string, time: string) => {
    const updated = requests.map(r => String(r.id) === String(id) ? { ...r, date, time } : r);
    onUpdateRequests(updated);
  };

  // --- FILTERING LOGIC ---
  const processedRequests = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return requests.filter(req => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (req.clientName || '').toLowerCase().includes(searchLower) ||
        (req.phone || '').includes(searchLower);

      if (!matchesSearch) return false;

      if (filterStatus === 'pending') return req.status === 'pending';
      if (filterStatus === 'confirmed') return req.status === 'confirmed' && req.date >= todayStr;
      if (filterStatus === 'today') return req.date === todayStr && (req.status as string) !== 'refused';
      if (filterStatus === 'archived') {
        return (req.status as string) === 'refused' || (req.status === 'confirmed' && req.date < todayStr);
      }
      return true;
    }).sort((a, b) => {
      try {
        if (sortOrder === 'date_asc') {
          const dateA = new Date(`${a.date || '9999-12-31'}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date || '9999-12-31'}T${b.time || '00:00'}`).getTime();
          return dateA - dateB;
        }
        if (sortOrder === 'created_desc') {
          const createdA = new Date(a.createdAt || 0).getTime();
          const createdB = new Date(b.createdAt || 0).getTime();
          return createdB - createdA;
        }
        return 0;
      } catch (e) { return 0; }
    });
  }, [requests, searchTerm, filterStatus, sortOrder]);

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
            <p className="text-xs font-bold text-slate-400">Gestion des Soins</p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className={`px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-800 w-full md:w-fit overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('reservations')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${activeTab === 'reservations' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}>📅 Réservations</button>
          <button onClick={() => setActiveTab('planning')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${activeTab === 'planning' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}>🗓️ Planning</button>
          <button onClick={() => setActiveTab('staffing')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${activeTab === 'staffing' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}>👥 Staffing</button>
          <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}>📦 Inventaire</button>
          <button onClick={() => setActiveTab('calculator')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${activeTab === 'calculator' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}>➗ Calculateur</button>
        </div>

        {activeTab === 'reservations' && (
          <button
            onClick={() => setShowNewModal(true)}
            className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-violet-700 transition-colors"
          >
            <Plus size={16} /> Nouvelle Réservation
          </button>
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'reservations' && (
          <div className="h-full flex flex-col">
            {/* FILTERS */}
            <div className="px-6 py-4 flex gap-4 overflow-x-auto no-scrollbar">
              <button onClick={() => setFilterStatus('pending')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all ${filterStatus === 'pending' ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-transparent border-slate-200 text-slate-500'}`}>En Attente</button>
              <button onClick={() => setFilterStatus('confirmed')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all ${filterStatus === 'confirmed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-transparent border-slate-200 text-slate-500'}`}>Confirmés</button>
              <button onClick={() => setFilterStatus('today')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all ${filterStatus === 'today' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-transparent border-slate-200 text-slate-500'}`}>Aujourd'hui</button>
              <button onClick={() => setFilterStatus('archived')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all ${filterStatus === 'archived' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-transparent border-slate-200 text-slate-500'}`}>Archives</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-20 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {processedRequests.map(req => (
                  <div
                    key={req.id}
                    onClick={() => setEditingRequest(req)}
                    className={`p-5 rounded-3xl border-2 transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 hover:border-violet-500/50' : 'bg-white border-slate-100 hover:border-violet-200'}`}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-full bg-violet-100 text-violet-600"><User size={16} /></div>
                          <div>
                            <h3 className="font-bold text-sm">{req.clientName}</h3>
                            <p className="text-[10px] text-slate-500 font-medium">{req.source || 'Direct'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${req.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : req.status === 'refused' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}`}>
                            {req.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-bold uppercase ${req.isDuo ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {req.isDuo ? 'Duo' : 'Seul'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center gap-2"><Calendar size={14} className="text-slate-400" /><span className="text-xs font-bold">{new Date(req.date).toLocaleDateString()}</span></div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center gap-2"><Clock size={14} className="text-slate-400" /><span className="text-xs font-bold">{req.time}</span></div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Soin</p>
                        <p className="text-sm font-medium italic">"{req.treatment}"</p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                      {req.status === 'pending' && (
                        <>
                          <button onClick={() => handleDeclineClick(req.id)} className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-red-50"><XCircle size={14} /> Refuser</button>
                          <button onClick={() => handleValidate(req.id)} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-emerald-600"><CheckCircle2 size={14} /> Valider</button>
                        </>
                      )}
                      <button onClick={() => handleRescheduleClick(req)} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-violet-600 transition-colors"><History size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'planning' && (
          <SpaCalendarView
            spaRequests={requests}
            userSettings={userSettings}
            onUpdateRequest={handleUpdateSpaDate}
            onSpaClick={setEditingRequest}
          />
        )}

        {activeTab === 'staffing' && (
          <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <h2 className="text-sm font-black uppercase text-slate-400">Période d'analyse</h2>
              <input
                type="date"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs outline-none border-2 border-transparent focus:border-violet-500 transition-all"
                value={forecastDate}
                onChange={(e) => setForecastDate(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <SpaStaffingForecast
                requests={requests}
                selectedDate={forecastDate}
                userSettings={userSettings}
              />
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <SpaInventory userSettings={userSettings} inventory={spaInventory} onUpdateInventory={onUpdateInventory} />
        )}

        {activeTab === 'calculator' && (
          <SpaRatioCalculator userSettings={userSettings} />
        )}
      </div>

      <SpaBookingModal
        isOpen={showNewModal || !!editingRequest}
        onClose={() => { setShowNewModal(false); setEditingRequest(null); }}
        onSave={handleSaveRequest}
        onDelete={handleDeleteRequest}
        userSettings={userSettings}
        initialData={editingRequest}
      />

      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-sm rounded-[32px] p-6 shadow-2xl ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
            <h3 className="text-lg font-black mb-4 text-center">Reporter le Soin</h3>
            <div className="space-y-4">
              <input type="date" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 font-bold outline-none" value={rescheduleData.date} onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })} />
              <input type="time" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 font-bold outline-none" value={rescheduleData.time} onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })} />
              <div className="flex gap-2">
                <button onClick={() => setShowRescheduleModal(false)} className="flex-1 py-3 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-500">Annuler</button>
                <button onClick={handleConfirmReschedule} className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-bold text-xs uppercase shadow-md">Confirmer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refusal Modal remains similar... omitted for brevity if no changes needed, but I'll include it to complete the file */}
      {showRefusalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-sm rounded-[32px] p-6 shadow-2xl ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
            <h3 className="text-lg font-black mb-4 text-center">Motif du Refus</h3>
            <div className="space-y-4">
              <select value={refusalReason} onChange={(e) => setRefusalReason(e.target.value as SpaRefusalReason)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none cursor-pointer">
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
