import React, { useState, useRef, useMemo } from 'react';
import {
  Wrench, FileText, Plus, Search, Trash2, Camera, Check,
  AlertTriangle, Calendar, Phone, Mail, Clock, ArrowRight, ArrowUpRight,
  Building2, Globe, FileSignature, Siren, Save, Edit3, X, ChevronLeft, ArrowLeft, Loader2,
  LayoutList, CalendarDays, ChevronRight, Filter
} from 'lucide-react';
import { MaintenanceTicket, MaintenanceContract, UserSettings, UserRole, MaintenanceLocation, MaintenanceStatus, ContractStatus } from '../types';

interface MaintenanceViewProps {
  userSettings: UserSettings;
  userRole: UserRole;
  tickets: MaintenanceTicket[];
  contracts: MaintenanceContract[];
  onUpdateTickets: (tickets: MaintenanceTicket[]) => void;
  onUpdateContracts: (contracts: MaintenanceContract[]) => void;
  onNavigate: (tab: string) => void;
  onCreateTicket?: (ticket: MaintenanceTicket) => void;
  onUpdateTicket?: (ticket: MaintenanceTicket) => void;
  onCreateContract?: (contract: MaintenanceContract) => void;
  onUpdateContract?: (contract: MaintenanceContract) => void;
  onDeleteContract?: (contractId: string) => void;
}

const LOCATIONS: MaintenanceLocation[] = ['Chambres', 'Hall', 'Cuisine', 'Extérieur', 'Spa', 'Technique', 'Autre'];

const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  userSettings, userRole, tickets, contracts, onUpdateTickets, onUpdateContracts, onNavigate,
  onCreateTicket, onUpdateTicket, onCreateContract, onUpdateContract, onDeleteContract
}) => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'contracts'>('tickets');

  // --- TICKET STATE ---
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState<{ location: MaintenanceLocation, desc: string, photo: string | null }>({
    location: 'Chambres', desc: '', photo: null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | MaintenanceStatus>('all');

  // --- CONTRACT STATE ---
  const [showNewContract, setShowNewContract] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isEditingContract, setIsEditingContract] = useState(false);

  // View Modes
  const [contractViewMode, setContractViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Create / Edit Form State
  const [contractForm, setContractForm] = useState<Partial<MaintenanceContract>>({
    status: 'active', subject: '', providerName: '',
    salesContact: { name: '', phone: '', email: '' },
    technicalContact: { name: '', phone: '' }
  });

  const canManageContracts = userRole === 'admin' || userRole === 'manager';
  const selectedContract = contracts.find(c => c.id === selectedContractId);

  // --- TICKET LOGIC ---
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validation
    const MAX_SIZE = 5 * 1024 * 1024; // 5Mo
    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner une image valide.");
      return;
    }
    if (file.size > MAX_SIZE) {
      alert("L'image est trop lourde (Max 5Mo).");
      return;
    }

    setIsUploading(true);

    try {
      // 2. Traitement sécurisé
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setNewTicket(prev => ({ ...prev, photo: base64 }));
    } catch (error) {
      console.error("Erreur lecture fichier:", error);
      alert("Impossible de lire le fichier. Réessayez.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const createTicket = () => {
    if (!newTicket.desc) return;
    const ticket: MaintenanceTicket = {
      id: `mt-${Date.now()}`,
      location: newTicket.location,
      description: newTicket.desc,
      status: 'open',
      createdAt: new Date().toISOString(),
      photoUrl: newTicket.photo || undefined
    };

    if (onCreateTicket) {
      onCreateTicket(ticket);
    } else {
      // Fallback for immediate UI update if handler isn't ready
      console.warn("Using fallback update for ticket creation");
      onUpdateTickets([ticket, ...tickets]);
    }

    setShowNewTicket(false);
    setNewTicket({ location: 'Chambres', desc: '', photo: null });
  };

  const updateTicketStatus = (id: string | number, status: MaintenanceStatus) => {
    // If ticket.id is number, convert? No, just compare
    const ticket = tickets.find(t => t.id === id);
    if (ticket && onUpdateTicket) {
      onUpdateTicket({ ...ticket, status });
    } else {
      onUpdateTickets(tickets.map(t => t.id === id ? { ...t, status } : t));
    }
  };

  // --- CONTRACT LOGIC ---
  const handleCreateContract = () => {
    if (!contractForm.providerName || !contractForm.subject) return;
    const contract: MaintenanceContract = {
      id: `mc-${Date.now()}`,
      providerName: contractForm.providerName || '',
      subject: contractForm.subject || '',
      contactPhone: contractForm.contactPhone || '',
      contactEmail: contractForm.contactEmail || '',
      status: contractForm.status as ContractStatus || 'active',
      lastIntervention: contractForm.lastIntervention,
      nextIntervention: contractForm.nextIntervention,
      // Enhanced Fields
      address: contractForm.address,
      website: contractForm.website,
      siret: contractForm.siret,
      salesContact: contractForm.salesContact,
      technicalContact: contractForm.technicalContact,
      startDate: contractForm.startDate,
      endDate: contractForm.endDate,
      frequency: contractForm.frequency,
      annualCost: contractForm.annualCost,
      createdAt: new Date().toISOString()
    };

    if (onCreateContract) {
      onCreateContract(contract);
    } else {
      onUpdateContracts([...contracts, contract]);
    }

    setShowNewContract(false);
    resetContractForm();
  };

  const handleUpdateContract = () => {
    if (!selectedContractId || !contractForm.providerName) return;

    // Merge existing contract with form data
    const existing = contracts.find(c => c.id === selectedContractId);
    if (!existing) return;

    const updatedContract = { ...existing, ...contractForm } as MaintenanceContract;

    if (onUpdateContract) {
      onUpdateContract(updatedContract);
    } else {
      const updatedContracts = contracts.map(c => c.id === selectedContractId ? updatedContract : c);
      onUpdateContracts(updatedContracts);
    }
    setIsEditingContract(false);
  };

  const deleteContract = (id: string) => {
    if (confirm("Supprimer ce contrat ?")) {
      if (onDeleteContract) {
        onDeleteContract(id);
      } else {
        onUpdateContracts(contracts.filter(c => c.id !== id));
      }
      if (selectedContractId === id) setSelectedContractId(null);
    }
  };

  const resetContractForm = () => {
    setContractForm({
      status: 'active', subject: '', providerName: '',
      salesContact: { name: '', phone: '', email: '' },
      technicalContact: { name: '', phone: '' }
    });
  };

  const startEditContract = (c: MaintenanceContract) => {
    setContractForm({ ...c });
    setIsEditingContract(true);
  };

  // Calendar Helpers
  const changeMonth = (dir: number) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + dir);
    setCalendarDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Mon=0
    for (let i = 0; i < startDay; i++) days.push(null);

    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));

    return days;
  };

  // Derived Data for Detail View
  const contractHistory = useMemo(() => {
    if (!selectedContract) return [];
    // Simulate finding linked tickets by matching provider name in description (Basic Search)
    return tickets.filter(t =>
      t.description.toLowerCase().includes(selectedContract.providerName.toLowerCase()) ||
      t.description.toLowerCase().includes(selectedContract.subject.toLowerCase())
    );
  }, [selectedContract, tickets]);

  const getAlertLevel = (dateStr?: string) => {
    if (!dateStr) return 'normal';
    const nextDate = new Date(dateStr);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';
    if (diffDays <= 7) return 'urgent';
    return 'normal';
  };

  // Filter & Sort Tickets Logic
  const filteredTickets = useMemo(() => {
    return tickets
      .filter(t => filterStatus === 'all' || t.status === filterStatus)
      .sort((a, b) => {
        // Score: Open (3) > In Progress (2) > Resolved (1)
        const score = (s: string) => s === 'open' ? 3 : s === 'in_progress' ? 2 : 1;
        const scoreDiff = score(b.status) - score(a.status);

        // If same status, sort by date (newest first)
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tickets, filterStatus]);

  // --- RENDER HELPERS ---

  const renderContractFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase text-slate-400">Identité</h4>
          <input type="text" placeholder="Prestataire *" value={contractForm.providerName} onChange={(e) => setContractForm({ ...contractForm, providerName: e.target.value })} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none text-sm font-bold" />
          <input type="text" placeholder="Objet du contrat *" value={contractForm.subject} onChange={(e) => setContractForm({ ...contractForm, subject: e.target.value })} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none text-sm font-bold" />
          <input type="text" placeholder="Adresse" value={contractForm.address || ''} onChange={(e) => setContractForm({ ...contractForm, address: e.target.value })} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none text-sm" />
          <div className="flex gap-2">
            <input type="text" placeholder="SIRET" value={contractForm.siret || ''} onChange={(e) => setContractForm({ ...contractForm, siret: e.target.value })} className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none text-sm" />
            <input type="text" placeholder="Site Web" value={contractForm.website || ''} onChange={(e) => setContractForm({ ...contractForm, website: e.target.value })} className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none text-sm" />
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase text-slate-400">Contacts Clés</h4>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Commercial</p>
            <input type="text" placeholder="Nom" value={contractForm.salesContact?.name || ''} onChange={(e) => setContractForm({ ...contractForm, salesContact: { ...contractForm.salesContact!, name: e.target.value } })} className="w-full mb-2 bg-transparent border-b border-slate-200 dark:border-slate-700 outline-none text-sm" />
            <input type="text" placeholder="Tél" value={contractForm.salesContact?.phone || ''} onChange={(e) => setContractForm({ ...contractForm, salesContact: { ...contractForm.salesContact!, phone: e.target.value } })} className="w-full mb-2 bg-transparent border-b border-slate-200 dark:border-slate-700 outline-none text-sm" />
            <input type="text" placeholder="Email" value={contractForm.salesContact?.email || ''} onChange={(e) => setContractForm({ ...contractForm, salesContact: { ...contractForm.salesContact!, email: e.target.value } })} className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 outline-none text-sm" />
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900">
            <p className="text-[10px] font-bold uppercase text-red-500 mb-2 flex items-center gap-1"><Siren size={12} /> Urgence / Technique</p>
            <input type="text" placeholder="Nom / Service" value={contractForm.technicalContact?.name || ''} onChange={(e) => setContractForm({ ...contractForm, technicalContact: { ...contractForm.technicalContact!, name: e.target.value } })} className="w-full mb-2 bg-transparent border-b border-red-200 dark:border-red-800 outline-none text-sm placeholder:text-red-300" />
            <input type="text" placeholder="Tél 24/7" value={contractForm.technicalContact?.phone || ''} onChange={(e) => setContractForm({ ...contractForm, technicalContact: { ...contractForm.technicalContact!, phone: e.target.value } })} className="w-full bg-transparent border-b border-red-200 dark:border-red-800 outline-none text-sm font-black text-red-600 placeholder:text-red-300" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div>
          <label className="text-[9px] font-bold text-slate-400">Début</label>
          <input type="date" value={contractForm.startDate || ''} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-900 rounded-lg text-sm font-bold outline-none" />
        </div>
        <div>
          <label className="text-[9px] font-bold text-slate-400">Fin</label>
          <input type="date" value={contractForm.endDate || ''} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-900 rounded-lg text-sm font-bold outline-none" />
        </div>
        <div>
          <label className="text-[9px] font-bold text-slate-400">Prochain Passage</label>
          <input type="date" value={contractForm.nextIntervention || ''} onChange={(e) => setContractForm({ ...contractForm, nextIntervention: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-900 rounded-lg text-sm font-bold outline-none" />
        </div>
        <div>
          <label className="text-[9px] font-bold text-slate-400">Coût Annuel</label>
          <input type="number" value={contractForm.annualCost || ''} onChange={(e) => setContractForm({ ...contractForm, annualCost: parseFloat(e.target.value) })} className="w-full p-2 bg-white dark:bg-slate-900 rounded-lg text-sm font-bold outline-none" placeholder="€" />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`h-full flex flex-col overflow-hidden animate-in fade-in ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>

      {/* HEADER */}
      <div className={`p-6 border-b z-20 flex justify-between items-center ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-violet-600 rounded-2xl text-white shadow-lg shadow-violet-500/20">
            <Wrench size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black">Maintenance</h2>
            <p className="text-xs font-bold text-slate-400">Technique & Sécurité</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowRight size={14} /> Retour
        </button>
      </div>

      {/* TABS (Only show if no contract selected) */}
      {!selectedContractId && (
        <div className="px-6 py-4">
          <div className="flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-800 w-fit overflow-x-auto whitespace-nowrap max-w-full no-scrollbar px-2">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'tickets' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}
            >
              <AlertTriangle size={14} /> Interventions
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'contracts' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}
            >
              <FileText size={14} /> Contrats & Carnet
            </button>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 pb-20 no-scrollbar">

        {/* --- TICKETS TAB --- */}
        {activeTab === 'tickets' && !selectedContractId && (
          <div className="space-y-6 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                Interventions
                <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full text-slate-500">{filteredTickets.length}</span>
              </h3>

              {/* FILTERS BAR */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 w-full md:w-auto">
                {[
                  { id: 'all', label: 'Tous' },
                  { id: 'open', label: 'À faire' },
                  { id: 'in_progress', label: 'En cours' },
                  { id: 'resolved', label: 'Terminés' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setFilterStatus(filter.id as any)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2 whitespace-nowrap ${filterStatus === filter.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300'
                      : 'border-slate-100 dark:border-slate-800 text-slate-400 bg-white dark:bg-slate-800 hover:border-slate-200'
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowNewTicket(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Plus size={14} /> Créer Ticket
              </button>
            </div>

            {/* Ticket Creation Form */}
            {showNewTicket && (
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-in fade-in slide-in-from-top-4 border-2 border-dashed border-slate-300 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Lieu</label>
                    <select
                      value={newTicket.location}
                      onChange={(e) => setNewTicket({ ...newTicket, location: e.target.value as MaintenanceLocation })}
                      className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 font-bold text-sm outline-none"
                    >
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Photo (Optionnel)</label>
                    <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      {isUploading ? <Loader2 size={14} className="animate-spin" /> : (newTicket.photo ? <Check size={14} className="text-green-500" /> : <Camera size={14} />)}
                      {isUploading ? 'Traitement...' : (newTicket.photo ? 'Photo ajoutée' : 'Ajouter photo')}
                    </button>
                  </div>
                </div>
                <textarea
                  placeholder="Description du problème (ex: Fuite d'eau sous lavabo...)"
                  value={newTicket.desc}
                  onChange={(e) => setNewTicket({ ...newTicket, desc: e.target.value })}
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 font-bold text-sm outline-none resize-none h-20 mb-3"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowNewTicket(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                  <button onClick={createTicket} className="px-6 py-2 bg-violet-600 text-white rounded-xl text-xs font-black uppercase shadow-lg">Valider</button>
                </div>
              </div>
            )}

            {/* Tickets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTickets.map(ticket => (
                <div key={ticket.id} className={`group p-4 rounded-3xl border transition-all ${ticket.status === 'resolved' ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100 bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800 shadow-sm'} ${userSettings.darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                  <div className="flex gap-4">
                    {/* Photo or Icon */}
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700 relative">
                      {ticket.photoUrl ? (
                        <img src={ticket.photoUrl} alt="Preuve" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Wrench size={24} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-0.5 rounded mb-1 inline-block">{ticket.location}</span>
                          <span className="text-[9px] text-slate-300 font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="font-bold text-sm leading-snug line-clamp-2">{ticket.description}</p>
                      </div>

                      <div className="mt-2">
                        <select
                          value={ticket.status}
                          onChange={(e) => updateTicketStatus(ticket.id, e.target.value as MaintenanceStatus)}
                          className={`w-full p-2 rounded-xl text-[10px] font-black uppercase outline-none border-2 cursor-pointer transition-colors appearance-none text-center ${ticket.status === 'open' ? 'border-red-200 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-800 hover:bg-red-100' :
                            ticket.status === 'in_progress' ? 'border-orange-200 text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 hover:bg-orange-100' :
                              'border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 hover:bg-emerald-100'
                            }`}
                        >
                          <option value="open">🔴 Pas commencé</option>
                          <option value="in_progress">🟠 En cours</option>
                          <option value="resolved">🟢 Terminé</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredTickets.length === 0 && (
                <div className="col-span-full py-12 text-center opacity-40">
                  <Wrench size={48} className="mx-auto mb-4 text-slate-400" />
                  <p className="font-bold text-slate-500">Aucun ticket correspondant trouvé.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- CONTRACTS TAB (LIST VIEW) --- */}
        {activeTab === 'contracts' && !selectedContractId && (
          <div className="space-y-6 pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                Répertoire Prestataires
              </h3>
              <div className="flex items-center gap-2">
                {/* TOGGLE VIEW */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-2">
                  <button onClick={() => setContractViewMode('list')} className={`p-2 rounded-lg transition-all ${contractViewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400'}`}>
                    <LayoutList size={16} />
                  </button>
                  <button onClick={() => setContractViewMode('calendar')} className={`p-2 rounded-lg transition-all ${contractViewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400'}`}>
                    <CalendarDays size={16} />
                  </button>
                </div>

                {canManageContracts && (
                  <button
                    onClick={() => setShowNewContract(true)}
                    className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs uppercase flex items-center gap-2 transition-colors"
                  >
                    <Plus size={14} /> Ajouter Contrat
                  </button>
                )}
              </div>
            </div>

            {/* NEW CONTRACT FORM (Simplified Inline) */}
            {showNewContract && (
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-in fade-in slide-in-from-top-4 border-2 border-dashed border-slate-300 dark:border-slate-700 mb-6">
                <h4 className="text-xs font-black uppercase text-slate-500 mb-3">Nouveau Prestataire (Rapide)</h4>
                {renderContractFormFields()}
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => { setShowNewContract(false); resetContractForm(); }} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                  <button onClick={handleCreateContract} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-lg">Ajouter</button>
                </div>
              </div>
            )}

            {/* VUE LISTE */}
            {contractViewMode === 'list' && (
              <div className="space-y-3">
                {contracts.map(contract => {
                  const alertLevel = getAlertLevel(contract.nextIntervention);
                  return (
                    <div
                      key={contract.id}
                      onClick={() => setSelectedContractId(contract.id)}
                      className={`p-4 rounded-3xl border flex flex-col md:flex-row items-start md:items-center gap-4 hover:shadow-lg hover:scale-[1.01] cursor-pointer transition-all ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                      {/* Status Icon */}
                      <div className={`p-3 rounded-2xl flex-shrink-0 ${contract.status === 'active' ? 'bg-emerald-100 text-emerald-600' : contract.status === 'renew' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Building2 size={20} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4 w-full items-center">
                        <div>
                          <h4 className="font-black text-sm">{contract.providerName}</h4>
                          <p className="text-xs text-slate-500 font-medium">{contract.subject}</p>
                        </div>

                        {/* Next Intervention */}
                        <div className="flex items-center gap-3">
                          <Calendar size={16} className={`shrink-0 ${alertLevel === 'urgent' || alertLevel === 'expired' ? 'text-red-500' : 'text-slate-400'}`} />
                          <div className="flex flex-col">
                            <span className={`text-[9px] font-bold uppercase ${alertLevel === 'urgent' || alertLevel === 'expired' ? 'text-red-500' : 'text-slate-400'}`}>Prochain Passage</span>
                            <span className={`text-xs font-bold ${alertLevel === 'urgent' || alertLevel === 'expired' ? 'text-red-600' : ''}`}>
                              {contract.nextIntervention ? new Date(contract.nextIntervention).toLocaleDateString() : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge & Arrow */}
                        <div className="flex items-center justify-between md:justify-end gap-3">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${contract.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                            contract.status === 'renew' ? 'bg-amber-50 text-amber-600' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                            {contract.status === 'active' ? 'Actif' : contract.status === 'renew' ? 'À Renouveler' : 'Résilié'}
                          </span>
                          <ChevronLeft size={16} className="text-slate-300 rotate-180" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {contracts.length === 0 && (
                  <div className="text-center py-12 opacity-40">
                    <FileText size={48} className="mx-auto mb-4 text-slate-400" />
                    <p className="font-bold text-slate-500">Aucun contrat enregistré.</p>
                  </div>
                )}
              </div>
            )}

            {/* VUE CALENDRIER */}
            {contractViewMode === 'calendar' && (
              <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                {/* Calendar Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
                  <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><ChevronLeft size={16} /></button>
                  <h4 className="font-black text-sm uppercase">{calendarDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h4>
                  <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><ChevronRight size={16} /></button>
                </div>

                <div className="grid grid-cols-7 text-center border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                    <div key={d} className="py-2 text-[10px] font-black uppercase text-slate-400">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 auto-rows-fr">
                  {getDaysInMonth(calendarDate).map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} className="min-h-[100px] border-b border-r border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/20"></div>;

                    const dateStr = date.toISOString().split('T')[0];
                    const interventions = contracts.filter(c => c.nextIntervention === dateStr);
                    const expirations = contracts.filter(c => c.endDate === dateStr);

                    return (
                      <div key={idx} className="min-h-[100px] border-b border-r border-slate-100 dark:border-slate-700 p-1 relative hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <span className={`text-xs font-bold p-1 block ${date.toDateString() === new Date().toDateString() ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {date.getDate()}
                        </span>
                        <div className="space-y-1">
                          {interventions.map(c => (
                            <div
                              key={`int-${c.id}`}
                              onClick={() => setSelectedContractId(c.id)}
                              className="text-[8px] font-bold bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                              title={`Passage : ${c.providerName}`}
                            >
                              🔧 {c.providerName}
                            </div>
                          ))}
                          {expirations.map(c => (
                            <div
                              key={`exp-${c.id}`}
                              onClick={() => setSelectedContractId(c.id)}
                              className="text-[8px] font-bold bg-red-100 text-red-700 px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                              title={`Fin contrat : ${c.providerName}`}
                            >
                              🏁 Fin: {c.providerName}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- DETAILED CONTRACT VIEW --- */}
        {selectedContractId && selectedContract && (
          <div className="h-full pt-4 animate-in slide-in-from-right-10">

            {/* Detail Header */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => { setSelectedContractId(null); setIsEditingContract(false); }}
                className="p-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1">
                <h3 className="text-2xl font-black">{selectedContract.providerName}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedContract.subject}</p>
              </div>
              {canManageContracts && (
                <div className="flex gap-2">
                  <button onClick={() => deleteContract(selectedContract.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                  <button onClick={() => startEditContract(selectedContract)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"><Edit3 size={20} /></button>
                </div>
              )}
            </div>

            {isEditingContract ? (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-lg border border-slate-100 dark:border-slate-700">
                <h4 className="text-lg font-black mb-4">Éditer le profil prestataire</h4>
                {renderContractFormFields()}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button onClick={() => setIsEditingContract(false)} className="px-6 py-3 rounded-xl font-bold text-xs uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">Annuler</button>
                  <button onClick={handleUpdateContract} className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase shadow-lg hover:bg-indigo-700 flex items-center gap-2">
                    <Save size={16} /> Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Col: Info & Contacts */}
                <div className="space-y-6">

                  {/* Identity Card */}
                  <div className={`p-6 rounded-[32px] border shadow-sm ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl">
                        <Building2 size={32} className="text-slate-400" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedContract.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                        selectedContract.status === 'renew' ? 'bg-amber-100 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                        {selectedContract.status === 'active' ? 'Actif' : selectedContract.status === 'renew' ? 'À Renouveler' : 'Résilié'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      {selectedContract.address && <p className="font-bold text-slate-700 dark:text-slate-200">{selectedContract.address}</p>}
                      {selectedContract.website && (
                        <a href={selectedContract.website.startsWith('http') ? selectedContract.website : `https://${selectedContract.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-500 font-bold hover:underline">
                          <Globe size={14} /> Site Web
                        </a>
                      )}
                      {selectedContract.siret && <p className="text-xs text-slate-400">SIRET: {selectedContract.siret}</p>}
                    </div>
                  </div>

                  {/* Contacts Card */}
                  <div className={`p-6 rounded-[32px] border shadow-sm ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Contacts Clés</h4>

                    <div className="space-y-4">
                      {/* Commercial */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Commercial</p>
                        <p className="font-bold text-sm">{selectedContract.salesContact?.name || selectedContract.providerName}</p>
                        <div className="flex gap-2 mt-2">
                          {selectedContract.salesContact?.phone && (
                            <a href={`tel:${selectedContract.salesContact.phone}`} className="flex-1 py-1.5 rounded-lg bg-white dark:bg-slate-600 text-center text-xs font-bold text-slate-600 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-500"><Phone size={12} className="inline mr-1" /> Appeler</a>
                          )}
                          {selectedContract.salesContact?.email && (
                            <a href={`mailto:${selectedContract.salesContact.email}`} className="flex-1 py-1.5 rounded-lg bg-white dark:bg-slate-600 text-center text-xs font-bold text-slate-600 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-500"><Mail size={12} className="inline mr-1" /> Email</a>
                          )}
                        </div>
                      </div>

                      {/* Technical / Emergency */}
                      <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50">
                        <p className="text-[9px] font-black uppercase text-red-400 mb-1 flex items-center gap-1"><Siren size={10} /> Urgence Technique</p>
                        <p className="font-bold text-sm text-red-900 dark:text-red-100">{selectedContract.technicalContact?.name || 'Astreinte'}</p>
                        {selectedContract.technicalContact?.phone ? (
                          <a href={`tel:${selectedContract.technicalContact.phone}`} className="block mt-2 py-2 rounded-lg bg-red-500 text-white text-center text-sm font-black shadow-md hover:bg-red-600 transition-colors">
                            <Phone size={14} className="inline mr-2" /> {selectedContract.technicalContact.phone}
                          </a>
                        ) : (
                          <p className="text-xs text-red-400 italic mt-1">Numéro non renseigné</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Col: Contract Details & History */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Contract Specs */}
                  <div className={`p-6 rounded-[32px] border shadow-sm ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2"><FileSignature size={14} /> Détails du contrat</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Début</p>
                        <p className="font-bold text-sm">{selectedContract.startDate ? new Date(selectedContract.startDate).toLocaleDateString() : '-'}</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Fin</p>
                        <p className="font-bold text-sm">{selectedContract.endDate ? new Date(selectedContract.endDate).toLocaleDateString() : '-'}</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Fréquence</p>
                        <p className="font-bold text-sm">{selectedContract.frequency || '-'}</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Coût Annuel</p>
                        <p className="font-bold text-sm">{selectedContract.annualCost ? `${selectedContract.annualCost} €` : '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Intervention History */}
                  <div className={`p-6 rounded-[32px] border shadow-sm flex-1 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Clock size={14} /> Historique Interventions</h4>
                      <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">{contractHistory.length}</span>
                    </div>

                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                      {contractHistory.map(ticket => (
                        <div key={ticket.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
                          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${ticket.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-2">{ticket.description}</p>
                            <p className="text-[9px] text-slate-400 mt-1">{new Date(ticket.createdAt).toLocaleDateString()} • {ticket.location}</p>
                          </div>
                        </div>
                      ))}
                      {contractHistory.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-4">Aucune intervention liée trouvée.</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default MaintenanceView;