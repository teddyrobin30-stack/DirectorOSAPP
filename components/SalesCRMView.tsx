import React, { useMemo, useState } from 'react';
import {
  Briefcase, Plus, User, Phone, Mail, Calendar,
  CheckSquare, AlertTriangle, ArrowLeft, Filter,
  Clock, CheckCircle2, XCircle, Search, Inbox, Users, Globe,
  Archive, Download, ArrowDownUp, Check, X,
  LayoutList, CalendarDays, ChevronLeft, ChevronRight, Trash2,
  PieChart, RotateCcw, FolderOpen
} from 'lucide-react';

// TYPES
import {
  Lead, UserSettings, UserProfile, LeadStatus,
  InboxItem, Client, InboxSource, Contact, Rooms,
  ExtendedInboxItem, InboxStatus // [NEW] Import des types étendus
} from '../types';

// HOOKS & SERVICES
import { useCrmPipeline } from '../hooks/useCrmPipeline';
import { useCrmInbox } from '../hooks/useCrmInbox';
import { 
  safeLower, safeDate, checkIsOverdue, checkAlerts, canValidateLead,
  buildMessage, openSMS, openWhatsApp, defaultRooms
} from '../services/crmUtils';

// [NEW] Import du composant de détail
import InboxDetailPanel from './InboxDetailPanel';

/* -------------------- HELPERS UI LOCAUX -------------------- */
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toDateInputValue = (v?: string) => {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

// [NEW] Helper pour l'alerte J+7
const isOverdueAlert = (dateRelance?: string): boolean => {
  if (!dateRelance) return false;
  const targetDate = new Date(dateRelance);
  targetDate.setDate(targetDate.getDate() + 7); 
  return new Date() > targetDate;
};

// [NEW] Hook de filtrage Inbox optimisé
const useInboxFilter = (items: ExtendedInboxItem[], filters: any) => {
  return useMemo(() => {
    let result = items.filter(item => {
      // Exclure les archivés par défaut sauf si filtre spécifique (ici on gère l'archivage via statut 'archive' ou prop technique)
      // Note: Dans types.ts, status peut être 'archived'. Ici on filtre pour l'affichage Inbox actif.
      if (item.status === 'archived' || item.statut === 'archive') return false;

      // Filtre Statut Métier
      if (filters.status !== 'all' && (item.statut || 'pas_commence') !== filters.status) return false;
      
      // Filtre Responsable
      if (filters.responsable && !item.responsable?.toLowerCase().includes(filters.responsable.toLowerCase())) return false;
      
      // Filtre Retard
      if (filters.onlyOverdue && !isOverdueAlert(item.dateRelance)) return false;
      
      // Filtre Recherche Globale (State existant inboxState.search)
      // Ce filtre est souvent géré en amont ou en aval, ici on l'intègre si besoin ou on laisse le filtre global agir.
      // Pour l'instant on garde la logique de props filters.
      
      return true;
    });

    // Tri
    result.sort((a, b) => {
      const dateA = new Date(a.requestDate).getTime();
      const dateB = new Date(b.requestDate).getTime();
      // 'date_desc' est le défaut
      if (filters.sortOrder === 'date_asc') return dateA - dateB;
      return dateB - dateA;
    });

    return result;
  }, [items, filters]);
};

/* -------------------- COMPOSANTS INTERNES -------------------- */

const RoomsInputs: React.FC<{ value: Rooms; onChange: (next: Rooms) => void; compact?: boolean }> = ({ value, onChange, compact }) => {
  const inputClass = compact ? 'w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold' : 'w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-bold text-sm';
  const set = (k: keyof Rooms, v: number) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Chambres</label>
      <div className="grid grid-cols-2 gap-2">
        {(['single', 'twin', 'double', 'family'] as const).map(k => (
          <div key={k}>
            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{k}</label>
            <input type="number" min={0} className={inputClass} value={value[k]} onChange={(e) => set(k, parseInt(e.target.value) || 0)} />
          </div>
        ))}
      </div>
    </div>
  );
};

/* -------------------- MAIN COMPONENT -------------------- */
interface SalesCRMViewProps {
  userSettings: UserSettings;
  leads: Lead[];
  onUpdateLeads: (leads: Lead[]) => void;
  inbox?: InboxItem[];
  onUpdateInbox?: (items: InboxItem[]) => void;
  clients?: Client[];
  onUpdateClients?: (clients: Client[]) => void;
  contacts?: Contact[];
  onUpdateContacts?: (contacts: Contact[]) => void;
  users: UserProfile[];
  onNavigate: (tab: string) => void;
}

const SalesCRMView: React.FC<SalesCRMViewProps> = (props) => {
  const { 
    userSettings, 
    leads, 
    onUpdateLeads, 
    inbox = [], 
    onUpdateInbox, 
    contacts, 
    onUpdateContacts, 
    clients = [], 
    onUpdateClients,
    users, 
    onNavigate 
  } = props;

  // HOOKS
  const { processedLeads, state: pipelineState } = useCrmPipeline(leads);
  // Note: On n'utilise plus processedInbox pour l'affichage direct car on a notre propre filtre avancé, 
  // mais on garde inboxState pour la recherche globale si besoin.
  const { state: inboxState } = useCrmInbox(inbox);

  // UI STATE
  const [activeTab, setActiveTab] = useState<'pipeline' | 'inbox' | 'contacts' | 'new_lead' | 'archives'>('pipeline');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pipelineViewMode, setPipelineViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  
  // Filtre recherche Contacts
  const [contactSearch, setContactSearch] = useState('');
  
  // État pour la fiche détail contact (Modal)
  const [viewingContact, setViewingContact] = useState<any | null>(null);

  // Gestion Selection Contact (Formulaires)
  const [selectedVipId, setSelectedVipId] = useState<string>(''); // Pour New Lead
  const [selectedInboxVipId, setSelectedInboxVipId] = useState<string>(''); // Pour Inbox

  // [NEW] STATE POUR INBOX DÉTAIL & FILTRES
  const [editingInboxItem, setEditingInboxItem] = useState<ExtendedInboxItem | null>(null);
  const [inboxFilters, setInboxFilters] = useState({
    status: 'all',
    responsable: '',
    onlyOverdue: false,
    sortOrder: 'date_desc' // 'date_desc' | 'date_asc'
  });

  // [NEW] LOGIQUE FILTRAGE INBOX (Remplace processedInbox)
  // On combine la recherche textuelle simple (inboxState.search) avec nos filtres avancés
  const filteredInbox = useInboxFilter(
    (inbox as ExtendedInboxItem[]).filter(i => {
       if (!inboxState.search) return true;
       const s = inboxState.search.toLowerCase();
       return i.contactName.toLowerCase().includes(s) || i.companyName?.toLowerCase().includes(s) || i.email.includes(s);
    }), 
    inboxFilters
  );

  // [NEW] SAVE HANDLER INBOX
  const handleSaveInboxItem = (updated: ExtendedInboxItem) => {
    const newInbox = inbox.map(i => i.id === updated.id ? updated : i);
    onUpdateInbox?.(newInbox);
  };

  // Liste des archives (calculée ici pour l'onglet Archive)
  const archivedLeads = useMemo(() => {
    return leads.filter(l => l.status === 'archived').sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [leads]);

  // --- LOGIQUE CALENDRIER ---
  const calendarData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    
    let startDay = firstDay.getDay(); // 0=Sun
    startDay = startDay === 0 ? 6 : startDay - 1; // Mon=0
    
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [calendarDate]);

  const getLeadsForDate = (date: Date) => {
    return processedLeads.filter(l => {
      if (!l.startDate) return false;
      const start = new Date(l.startDate);
      const end = l.endDate ? new Date(l.endDate) : new Date(start);
      const check = new Date(date);
      check.setHours(0,0,0,0); start.setHours(0,0,0,0); end.setHours(0,0,0,0);
      return check >= start && check <= end;
    });
  };

  // Normalisation Contacts et Tri VIP
  const appContacts = useMemo(() => Array.isArray(contacts) ? contacts : clients, [contacts, clients]);
  
  const vipCandidates = useMemo(() => {
    const arr = [...(appContacts || [])];
    arr.sort((a, b) => {
      // Priorité aux VIPs
      const isVipA = (a as any).vip ? 1 : 0;
      const isVipB = (b as any).vip ? 1 : 0;
      if (isVipA !== isVipB) return isVipB - isVipA;
      return a.name.localeCompare(b.name);
    });
    return arr;
  }, [appContacts]);

  // Filtrage pour l'affichage grille
  const filteredGridContacts = useMemo(() => {
    if (!contactSearch) return vipCandidates;
    const lower = contactSearch.toLowerCase();
    return vipCandidates.filter((c: any) => 
      (c.name && c.name.toLowerCase().includes(lower)) ||
      (c.company && c.company.toLowerCase().includes(lower)) ||
      (c.companyName && c.companyName.toLowerCase().includes(lower))
    );
  }, [vipCandidates, contactSearch]);

  // Récupération de l'objet Contact complet pour l'Inbox
  const selectedInboxContact = useMemo(() => {
    if (!selectedInboxVipId) return null;
    return appContacts.find((x: any) => String(x.id) === selectedInboxVipId);
  }, [selectedInboxVipId, appContacts]);
  
  // Utilisation sécurisée de onUpdateClients via updateAppContacts si besoin
  const updateAppContacts = (next: any[]) => onUpdateContacts ? onUpdateContacts(next) : onUpdateClients?.(next);

  // Helper pour l'historique contact
  const getContactHistory = (contact: any) => {
    if (!contact) return { total: 0, validated: 0, history: [] };
    const history = leads.filter(l => 
      safeLower(l.contactName) === safeLower(contact.name) || 
      safeLower(l.email) === safeLower(contact.email)
    );
    const validated = history.filter(l => l.status === 'valide').length;
    return { total: history.length, validated, history };
  };

  // Forms
  const [form, setForm] = useState<any>({ groupName: '', contactName: '', email: '', phone: '', pax: 0, note: '', startDate: '', endDate: '', rooms: defaultRooms() });
  const [inboxForm, setInboxForm] = useState<any>({ contactName: '', companyName: '', email: '', phone: '', source: 'email', eventStartDate: '', eventEndDate: '', note: '', rooms: defaultRooms() });

  // ACTIONS
  const handleCreateLead = () => {
    if (!form.groupName || !form.contactName) return;
    const newLead: Lead = { ...form, id: uid('lead'), requestDate: new Date().toISOString(), status: 'nouveau', checklist: { roomSetup: false, menu: false, roomingList: false }, ownerId: '' };
    onUpdateLeads([newLead, ...leads]);
    setForm({ groupName: '', contactName: '', email: '', phone: '', pax: 0, note: '', startDate: '', endDate: '', rooms: defaultRooms() });
    setSelectedVipId('');
    setActiveTab('pipeline');
  };

  const handleUpdateLead = (lead: Lead) => {
    onUpdateLeads(leads.map(l => String(l.id) === String(lead.id) ? lead : l));
    setSelectedLead(lead);
  };

  // ✅ LOGIQUE D'ARCHIVAGE (Correction du bug de suppression)
  const handleArchiveLead = (lead: Lead) => {
    if (window.confirm("Voulez-vous archiver ce dossier ? Il ne sera plus visible dans le pipeline.")) {
        onUpdateLeads(leads.map(l => String(l.id) === String(lead.id) ? { ...l, status: 'archived' } : l));
        setSelectedLead(null);
        setToastMessage("Dossier archivé avec succès");
        setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleRestoreLead = (lead: Lead) => {
    onUpdateLeads(leads.map(l => String(l.id) === String(lead.id) ? { ...l, status: 'en_cours' } : l));
    setToastMessage("Dossier restauré");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteDefinitely = (id: string | number) => {
    if (window.confirm("ATTENTION : Suppression définitive. Continuer ?")) {
        onUpdateLeads(leads.filter(l => String(l.id) !== String(id)));
    }
  };

  const handleValidateRequest = (item: InboxItem) => {
    setForm({ 
      groupName: item.companyName ? `Groupe ${item.companyName}` : `Event ${item.contactName}`, 
      contactName: item.contactName, 
      email: item.email, 
      phone: item.phone, 
      startDate: item.eventStartDate || '', 
      endDate: item.eventEndDate || '', 
      note: `Source: ${item.source.toUpperCase()}.`, 
      rooms: (item as any).rooms || defaultRooms(), 
      pax: 0 
    });
    // On passe le statut technique à processed
    onUpdateInbox?.(inbox.map(i => i.id === item.id ? { ...i, status: 'processed' } : i));
    setActiveTab('new_lead');
  };

  const handleArchiveRequest = (id: string | number) => {
     if(window.confirm("Archiver cette demande de l'Inbox ?")) {
        onUpdateInbox?.(inbox.map(i => i.id === id ? { ...i, status: 'archived' } : i));
        setToastMessage('Demande archivée');
        setTimeout(() => setToastMessage(null), 3000);
     }
  };

  // ✅ EXPORT INBOX
  const handleExportCSV = () => {
    const headers = ['Date', 'Contact', 'Email', 'Tel', 'Statut', 'Note'];
    const rows = (inbox || []).map(i => [
      new Date(i.requestDate).toLocaleDateString(),
      `"${i.contactName}"`,
      i.email,
      i.phone,
      i.status,
      `"${(i.note || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `crm_inbox_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // ✅ NOUVEAU : EXPORT CONTACTS
  const handleExportContactsCSV = () => {
    const headers = ['Nom', 'Entreprise', 'Role', 'Email', 'Téléphone', 'Catégorie'];
    const rows = appContacts.map((c: any) => [
      `"${c.name}"`,
      `"${c.company || c.companyName || ''}"`,
      `"${c.role || ''}"`,
      c.email || '',
      c.phone || '',
      `"${c.category || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contacts_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden animate-in fade-in relative ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {toastMessage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* HEADER */}
      <div className={`p-6 border-b z-20 flex justify-between items-center ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Briefcase size={28} /></div>
          <div>
            <h2 className="text-2xl font-black">Suivi Commercial</h2>
            <p className="text-xs font-bold text-slate-400">Leads & Demandes Groupes</p>
          </div>
        </div>
        <button onClick={() => onNavigate('dashboard')} className="px-4 py-2 rounded-xl border-2 font-black text-xs uppercase flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft size={14} /> Retour
        </button>
      </div>

      {/* TABS - STYLE STABLE & TACTILE */}
      <div className="px-6 py-4">
        <div className="flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-800 w-fit overflow-x-auto whitespace-nowrap max-w-full no-scrollbar px-2">
          
          <button 
            onClick={() => setActiveTab('pipeline')} 
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'pipeline' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
          >
            <Filter size={14}/> Pipeline
          </button>

          <button 
            onClick={() => setActiveTab('inbox')} 
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
          >
            <Inbox size={14}/> Inbox
          </button>

          <button 
            onClick={() => setActiveTab('contacts')} 
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'contacts' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
          >
            <Users size={14}/> Contacts
          </button>

          <button 
            onClick={() => setActiveTab('archives')} 
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'archives' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
          >
            <Archive size={14}/> Archives
          </button>

          <button 
            onClick={() => setActiveTab('new_lead')} 
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'new_lead' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
          >
            <Plus size={14}/> Nouveau Lead
          </button>

        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 md:px-6 md:pb-20 flex flex-col md:flex-row gap-6">

        {/* --- VUE PIPELINE --- */}
        {activeTab === 'pipeline' && (
          <>
            <div className={`w-full md:w-1/3 flex flex-col rounded-[32px] border overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="p-4 border-b space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border">
                    <Search size={16} className="text-slate-400 mr-2" />
                    <input type="text" placeholder="Chercher un groupe..." value={pipelineState.search} onChange={(e) => pipelineState.setSearch(e.target.value)} className="bg-transparent outline-none w-full text-xs font-bold" />
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                    <button onClick={() => setPipelineViewMode('list')} className={`p-2 rounded-lg ${pipelineViewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><LayoutList size={16} /></button>
                    <button onClick={() => setPipelineViewMode('calendar')} className={`p-2 rounded-lg ${pipelineViewMode === 'calendar' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><CalendarDays size={16} /></button>
                  </div>
                </div>
                <select value={pipelineState.sort} onChange={(e) => pipelineState.setSort(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-xs font-bold outline-none border">
                  <option value="event_asc">📅 Prochaines Arrivées</option>
                  <option value="created_desc">🆕 Date de Création</option>
                  <option value="urgency">🚨 Urgence / Retard</option>
                  <option value="alpha">Abc Alphabétique</option>
                </select>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                   {['ALL', 'URGENT_ARRIVAL', 'LATE_FOLLOWUP', 'THIS_MONTH'].map(f => (
                     <button key={f} onClick={() => pipelineState.setFilter(f)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border whitespace-nowrap ${pipelineState.filter === f ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                       {f === 'ALL' ? 'Tous' : f === 'URGENT_ARRIVAL' ? '🚨 J-30' : f === 'LATE_FOLLOWUP' ? '⚠️ Relance' : '📅 Ce Mois'}
                     </button>
                   ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                {pipelineViewMode === 'list' ? (
                  processedLeads.map(lead => (
                    <div key={lead.id} onClick={() => setSelectedLead(lead)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedLead?.id === lead.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200' : 'bg-white dark:bg-slate-900 border-transparent hover:border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-sm line-clamp-1">{lead.groupName}</h4>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">{lead.status}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{lead.contactName}</span>
                        <span className="font-bold">{lead.pax} Pax</span>
                      </div>
                      <p className="text-[9px] font-black text-indigo-400 mt-2 flex items-center gap-1">
                        <Calendar size={10} /> {lead.startDate ? new Date(lead.startDate).toLocaleDateString() : 'À définir'}
                      </p>
                      {checkAlerts(lead).map((a, idx) => (
                        <div key={idx} className={`mt-2 flex items-center gap-1 px-2 py-1 rounded text-[8px] font-black uppercase ${a.color}`}>
                          <AlertTriangle size={10} /> {a.label}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-b-[24px]">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                      <button onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ChevronLeft size={16} /></button>
                      <span className="text-sm font-black uppercase">{calendarDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ChevronRight size={16} /></button>
                    </div>
                    <div className="grid grid-cols-7 border-b text-[10px] font-black text-slate-400 text-center py-2">
                      {['L', 'Ma', 'Me', 'J', 'V', 'S', 'D'].map(d => <div key={d}>{d}</div>)}
                    </div>
                    <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                      {calendarData.map((date, i) => {
                        if (!date) return <div key={i} className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-r" />;
                        const leads = getLeadsForDate(date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        return (
                          <div key={i} className={`min-h-[80px] p-1 border-b border-r relative ${isToday ? 'bg-indigo-50/30' : ''}`}>
                            <span className={`text-[10px] font-bold block mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{date.getDate()}</span>
                            <div className="space-y-1">
                              {leads.map(l => (
                                <div key={l.id} onClick={() => { setSelectedLead(l); setPipelineViewMode('list'); }} className={`text-[8px] font-bold px-1 py-0.5 rounded truncate cursor-pointer text-white ${l.status === 'valide' ? 'bg-emerald-500' : l.status === 'perdu' ? 'bg-slate-400' : 'bg-blue-400'}`}>
                                  {l.groupName}
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
            </div>

            <div className={`flex-1 rounded-[32px] border overflow-hidden flex flex-col ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
              {selectedLead ? (
                <div className="flex flex-col h-full p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dossier #{selectedLead.id.toString().slice(-4)}</span>
                      <h2 className="text-3xl font-black mt-1">{selectedLead.groupName}</h2>
                      <p className="text-sm font-bold text-indigo-500 mt-1">{selectedLead.contactName}</p>
                    </div>
                    <select value={selectedLead.status} onChange={(e) => handleUpdateLead({ ...selectedLead, status: e.target.value as LeadStatus })} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-black uppercase outline-none border-2 border-transparent focus:border-indigo-500">
                      <option value="nouveau">Nouveau</option>
                      <option value="en_cours">En cours</option>
                      <option value="valide" disabled={!canValidateLead(selectedLead)}>Validé</option>
                      <option value="perdu">Perdu</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Email</p>
                      <p className="text-sm font-bold">{selectedLead.email || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Téléphone</p>
                      <p className="text-sm font-bold">{selectedLead.phone || '-'}</p>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/20 mb-8">
                    <h4 className="text-sm font-black uppercase text-indigo-900 dark:text-indigo-200 mb-4 flex items-center gap-2"><CheckSquare size={16} /> Checklist Validation</h4>
                    <div className="space-y-3">
                      {(['roomSetup', 'menu', 'roomingList'] as const).map(k => (
                        <label key={k} className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={selectedLead.checklist[k]} onChange={(e) => handleUpdateLead({ ...selectedLead, checklist: { ...selectedLead.checklist, [k]: e.target.checked } })} className="w-4 h-4 rounded text-indigo-600" />
                          <span className={`text-sm font-bold ${selectedLead.checklist[k] ? 'text-indigo-900' : 'text-slate-400'}`}>{k === 'roomSetup' ? 'Disposition validée' : k === 'menu' ? 'Menu F&B validé' : 'Rooming List reçue'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <textarea className="flex-1 w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl outline-none text-sm font-medium resize-none" value={selectedLead.note} onChange={(e) => handleUpdateLead({ ...selectedLead, note: e.target.value })} placeholder="Notes internes et historique..." />
                  
                  {/* BOUTON ARCHIVER */}
                  <div className="pt-6 flex justify-end">
                    <button 
                      onClick={() => handleArchiveLead(selectedLead)}
                      className="text-orange-400 hover:text-orange-600 text-xs font-black uppercase flex items-center gap-2"
                    >
                      <Archive size={14} /> Archiver le dossier
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <Briefcase size={64} className="mb-4 text-slate-400" />
                  <p className="text-xl font-black text-slate-500">Sélectionnez un dossier</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* --- VUE INBOX --- */}
        {activeTab === 'inbox' && (
          <div className="flex flex-col md:flex-row h-full gap-6 w-full">
            <div className={`w-full md:w-1/3 p-6 rounded-[32px] border overflow-y-auto ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
              <h3 className="text-lg font-black uppercase mb-4">Saisie Rapide</h3>
              <div className="space-y-4">
                
                {/* ✅ SÉLECTEUR DE CONTACT DANS L'INBOX */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact (Application)</label>
                  <select 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold outline-none"
                    value={selectedInboxVipId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedInboxVipId(id);
                      const c = appContacts.find((x: any) => String(x.id) === id);
                      if (c) {
                        setInboxForm({
                          ...inboxForm,
                          contactName: c.name,
                          companyName: c.company || c.companyName || '',
                          email: c.email || '',
                          phone: c.phone || ''
                        });
                      }
                    }}
                  >
                    <option value="">— Sélectionner —</option>
                    {vipCandidates.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `• ${c.company}` : ''}
                      </option>
                    ))}
                  </select>

                  {/* ✅ BOUTONS SMS/WHATSAPP DANS L'INBOX */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetPhone = selectedInboxContact?.phone || inboxForm.phone;
                        const msg = buildMessage({
                          groupName: inboxForm.companyName ? `Groupe ${inboxForm.companyName}` : `Event ${inboxForm.contactName}`,
                          contactName: inboxForm.contactName,
                          email: inboxForm.email,
                          phone: targetPhone,
                          startDate: inboxForm.eventStartDate,
                          endDate: inboxForm.eventEndDate,
                          rooms: inboxForm.rooms,
                          note: inboxForm.note,
                          sourceLabel: 'Inbox'
                        });
                        openSMS(targetPhone, msg);
                      }}
                      className="flex-1 py-2 rounded-lg border text-[10px] font-black uppercase hover:bg-slate-100 transition-colors"
                    >
                      SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const targetPhone = selectedInboxContact?.phone || inboxForm.phone;
                        const msg = buildMessage({
                          groupName: inboxForm.companyName ? `Groupe ${inboxForm.companyName}` : `Event ${inboxForm.contactName}`,
                          contactName: inboxForm.contactName,
                          email: inboxForm.email,
                          phone: targetPhone,
                          startDate: inboxForm.eventStartDate,
                          endDate: inboxForm.eventEndDate,
                          rooms: inboxForm.rooms,
                          note: inboxForm.note,
                          sourceLabel: 'Inbox'
                        });
                        openWhatsApp(targetPhone, msg);
                      }}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors"
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>

                <input type="text" placeholder="Nom Contact *" className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold" value={inboxForm.contactName} onChange={(e) => setInboxForm({ ...inboxForm, contactName: e.target.value })} />
                <input type="text" placeholder="Entreprise" className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold" value={inboxForm.companyName} onChange={(e) => setInboxForm({ ...inboxForm, companyName: e.target.value })} />
                <input type="email" placeholder="Email" className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold" value={inboxForm.email} onChange={(e) => setInboxForm({ ...inboxForm, email: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold" value={inboxForm.eventStartDate} onChange={(e) => setInboxForm({ ...inboxForm, eventStartDate: e.target.value })} />
                  <input type="date" className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold" value={inboxForm.eventEndDate} onChange={(e) => setInboxForm({ ...inboxForm, eventEndDate: e.target.value })} />
                </div>
                <RoomsInputs compact value={inboxForm.rooms} onChange={(next) => setInboxForm({ ...inboxForm, rooms: next })} />
                <div className="flex gap-2">
                  {(['email', 'phone', 'website'] as InboxSource[]).map(s => (
                    <button key={s} onClick={() => setInboxForm({ ...inboxForm, source: s })} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border ${inboxForm.source === s ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{s}</button>
                  ))}
                </div>
                <button onClick={() => { onUpdateInbox?.([ { ...inboxForm, id: uid('inbox'), status: 'to_process', requestDate: new Date().toISOString() }, ...inbox ]); setInboxForm({ contactName: '', companyName: '', email: '', phone: '', source: 'email', rooms: defaultRooms() }); setSelectedInboxVipId(''); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all">Enregistrer Demande</button>
              </div>
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="mb-4 p-4 rounded-[24px] border bg-white dark:bg-slate-800 flex flex-col gap-4">
                 {/* Barre de recherche Globale */}
                 <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border w-full">
                    <Search size={16} className="text-slate-400 mr-2" />
                    <input type="text" placeholder="Filtrer l'inbox (nom, société, email)..." value={inboxState.search} onChange={(e) => inboxState.setSearch(e.target.value)} className="bg-transparent outline-none w-full text-xs font-bold" />
                 </div>
                 
                 {/* [NEW] BARRE DE FILTRES AVANCÉE */}
                 <div className="flex flex-wrap gap-2 items-center">
                    <select 
                      value={inboxFilters.status}
                      onChange={(e) => setInboxFilters({...inboxFilters, status: e.target.value})}
                      className="bg-white dark:bg-slate-900 border dark:border-slate-700 text-[10px] font-black uppercase py-2 px-3 rounded-lg outline-none cursor-pointer"
                    >
                      <option value="all">Tous Status</option>
                      <option value="pas_commence">⚪ À Traiter</option>
                      <option value="en_cours">🔵 En cours</option>
                      <option value="termine">🟢 Terminé</option>
                    </select>

                    <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Resp..." 
                          value={inboxFilters.responsable}
                          onChange={(e) => setInboxFilters({...inboxFilters, responsable: e.target.value})}
                          className="w-24 py-2 px-3 pl-7 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg text-[10px] font-bold outline-none"
                        />
                        <User size={10} className="absolute left-2 top-2.5 text-slate-400"/>
                    </div>

                    <button 
                      onClick={() => setInboxFilters({...inboxFilters, onlyOverdue: !inboxFilters.onlyOverdue})}
                      className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-colors flex items-center gap-1 ${inboxFilters.onlyOverdue ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                    >
                      <AlertTriangle size={12} /> Retards J+7
                    </button>

                     {/* Tri Date */}
                     <button 
                      onClick={() => setInboxFilters({...inboxFilters, sortOrder: inboxFilters.sortOrder === 'date_desc' ? 'date_asc' : 'date_desc'})}
                      className="px-3 py-2 rounded-lg text-[10px] font-black uppercase border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 flex items-center gap-1"
                    >
                      <ArrowDownUp size={12} /> {inboxFilters.sortOrder === 'date_desc' ? 'Récent' : 'Ancien'}
                    </button>
                 </div>
              </div>

              {/* [NEW] LISTE DES MESSAGES MISE À JOUR */}
              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-24">
                {filteredInbox.map((item) => {
                   const isCritical = isOverdueAlert(item.dateRelance);
                   
                   return (
                    <div 
                      key={item.id} 
                      onClick={() => setEditingInboxItem(item)}
                      className={`cursor-pointer group relative p-4 rounded-2xl border flex justify-between items-start bg-white dark:bg-slate-800 transition-all hover:shadow-md 
                        ${isCritical ? 'border-red-300 bg-red-50/30 dark:bg-red-900/10' : 'border-slate-100 dark:border-slate-700'}
                      `}
                    >
                      <div className="flex gap-4 w-full">
                        {/* Indicateur visuel Statut */}
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                          item.statut === 'termine' ? 'bg-emerald-500' : 
                          item.statut === 'en_cours' ? 'bg-blue-500' : 'bg-slate-200'
                        }`} />

                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400 h-fit">
                           {item.source === 'email' ? <Mail size={18} /> : item.source === 'phone' ? <Phone size={18} /> : <Globe size={18} />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                             <div>
                                <h4 className="font-bold text-sm truncate">{item.contactName}</h4>
                                <p className="text-xs text-slate-500 font-medium truncate">{item.companyName || 'Particulier'}</p>
                             </div>
                             {/* Badges */}
                             <div className="flex flex-col items-end gap-1">
                                {item.devisEnvoye && <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">Devis OK</span>}
                                {isCritical && <span className="bg-red-100 text-red-600 text-[8px] px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1 animate-pulse"><AlertTriangle size={8}/> Relance</span>}
                             </div>
                          </div>

                          {/* Infos Responsable & Date */}
                          <div className="flex items-center gap-3 mt-2">
                             <p className="text-[10px] text-slate-400 font-bold uppercase">Reçu: {new Date(item.requestDate).toLocaleDateString()}</p>
                             {item.responsable && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                                  <User size={8} /> {item.responsable}
                                </span>
                             )}
                          </div>
                        </div>
                      </div>

                      {/* Actions Rapides au Survol + Bouton Archiver Rapide */}
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); handleArchiveRequest(item.id); }} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-red-100 hover:text-red-500 transition-colors" title="Archiver"><Archive size={12}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- AUTRES VUES --- */}
        {activeTab === 'contacts' && (
          <div className="h-full overflow-y-auto p-4 md:px-6 pb-20 no-scrollbar relative">
            <div className="flex gap-4 mb-4">
              {/* Barre de recherche contacts */}
              <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 border border-transparent focus-within:border-indigo-500 transition-all">
                 <Search size={18} className="text-slate-400 mr-3" />
                 <input 
                   type="text" 
                   placeholder="Rechercher un contact..." 
                   value={contactSearch}
                   onChange={(e) => setContactSearch(e.target.value)}
                   className="bg-transparent outline-none w-full text-sm font-bold text-slate-700 dark:text-white"
                 />
              </div>
              
              {/* ✅ NOUVEAU BOUTON EXPORT CONTACTS */}
              <button 
                onClick={handleExportContactsCSV} 
                className="px-6 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:opacity-90 transition-opacity"
              >
                <Download size={16} /> Exporter
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGridContacts.map((contact: any) => (
                <div 
                  key={contact.id} 
                  onClick={() => setViewingContact(contact)}
                  className={`p-4 rounded-2xl border flex items-center gap-4 transition-all hover:shadow-md cursor-pointer ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-100 shadow-sm hover:bg-slate-50'}`}
                >
                   {/* Avatar/Initials */}
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${contact.color || 'bg-slate-200 text-slate-500'}`}>
                      {contact.initials || contact.name.slice(0, 2).toUpperCase()}
                   </div>
                   
                   {/* Info */}
                   <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{contact.name}</h4>
                      <p className="text-xs text-slate-400 truncate font-medium uppercase tracking-wide">{contact.company || contact.companyName || 'Particulier'}</p>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 mt-2">
                          {contact.phone && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); openSMS(contact.phone, ''); }} 
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors"
                              title="SMS"
                            >
                              <Briefcase size={14}/>
                            </button>
                          )}
                          {contact.phone && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); openWhatsApp(contact.phone, ''); }} 
                              className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 transition-colors"
                              title="WhatsApp"
                            >
                              <Phone size={14}/>
                            </button>
                          )}
                          {contact.email && (
                            <a 
                              href={`mailto:${contact.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 transition-colors"
                              title="Email"
                            >
                              <Mail size={14}/>
                            </a>
                          )}
                      </div>
                   </div>
                </div>
              ))}
              {filteredGridContacts.length === 0 && (
                <div className="col-span-full text-center py-10 opacity-50">
                  <Users size={48} className="mx-auto mb-2 text-slate-300"/>
                  <p className="text-sm font-bold text-slate-400">Aucun contact trouvé.</p>
                </div>
              )}
            </div>

            {/* MODAL DETAIL CONTACT */}
            {viewingContact && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                <div className={`w-full max-w-lg rounded-[32px] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
                   <button 
                     onClick={() => setViewingContact(null)} 
                     className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                   >
                     <X size={20}/>
                   </button>

                   <div className="flex flex-col items-center mb-6">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl shadow-md mb-3 ${viewingContact.color || 'bg-slate-200 text-slate-500'}`}>
                        {viewingContact.initials || viewingContact.name.slice(0, 2).toUpperCase()}
                      </div>
                      <h3 className="text-xl font-black">{viewingContact.name}</h3>
                      <p className="text-sm text-slate-400 font-bold uppercase">{viewingContact.company || viewingContact.companyName || 'Particulier'}</p>
                   </div>

                   {/* Stats */}
                   <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center">
                         <span className="text-2xl font-black text-indigo-600 block">{getContactHistory(viewingContact).total}</span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase">Dossiers Totaux</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center">
                         <span className="text-2xl font-black text-emerald-500 block">{getContactHistory(viewingContact).validated}</span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase">Dossiers Validés</span>
                      </div>
                   </div>

                   {/* Infos */}
                   <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                         <Phone size={18} className="text-slate-400"/>
                         <span className="font-bold text-sm">{viewingContact.phone || '-'}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                         <Mail size={18} className="text-slate-400"/>
                         <span className="font-bold text-sm">{viewingContact.email || '-'}</span>
                      </div>
                   </div>

                   {/* Historique */}
                   <h4 className="font-black text-sm uppercase text-slate-400 mb-3 ml-1">Historique Récent</h4>
                   <div className="space-y-2">
                      {getContactHistory(viewingContact).history.length > 0 ? (
                        getContactHistory(viewingContact).history.map((lead: Lead) => (
                          <div key={lead.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                             <div>
                                <p className="font-bold text-xs">{lead.groupName}</p>
                                <p className="text-[10px] text-slate-400">{new Date(lead.requestDate).toLocaleDateString()}</p>
                             </div>
                             <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${lead.status === 'valide' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {lead.status}
                             </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-xs text-slate-400 italic py-4">Aucun historique de dossier.</p>
                      )}
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'archives' && (
          <div className="w-full h-full flex flex-col p-6">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black">Historique & Archives</h3>
                <button onClick={handleExportCSV} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-emerald-700">
                  <Download size={16} /> Exporter Excel
                </button>
             </div>
             
             {/* LISTE DES DOSSIERS ARCHIVÉS */}
             <div className="flex-1 rounded-[32px] border bg-white dark:bg-slate-800 p-4 overflow-auto no-scrollbar">
                {archivedLeads.length > 0 ? (
                  <div className="space-y-3">
                    {archivedLeads.map(lead => (
                      <div key={lead.id} className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                          <div>
                             <h4 className="font-bold text-sm">{lead.groupName}</h4>
                             <p className="text-xs text-slate-500">{lead.contactName} • {new Date(lead.requestDate).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-2">
                             <button 
                               onClick={() => handleRestoreLead(lead)} 
                               className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg text-xs font-bold uppercase flex items-center gap-1 hover:bg-blue-200"
                             >
                               <RotateCcw size={14}/> Restaurer
                             </button>
                             <button 
                               onClick={() => handleDeleteDefinitely(lead.id)} 
                               className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                               title="Supprimer définitivement"
                             >
                               <Trash2 size={16}/>
                             </button>
                          </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <FolderOpen size={48} className="mb-4 text-slate-400"/>
                    <p className="text-center text-slate-400 font-bold">Aucun dossier archivé.</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* --- FORMULAIRE NOUVEAU LEAD --- */}
        {activeTab === 'new_lead' && (
          <div className="w-full max-w-2xl mx-auto overflow-y-auto no-scrollbar py-6">
            <div className={`p-8 rounded-[40px] border shadow-sm space-y-6 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <h3 className="text-2xl font-black uppercase tracking-tight">Qualifier une demande</h3>
              
              {/* BOUTONS SMS / WHATSAPP */}
              <div className="space-y-4">
                {/* SÉLECTEUR DE CONTACT */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact (Application)</label>
                  <select 
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                    value={selectedVipId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedVipId(id);
                      const c = appContacts.find((x: any) => String(x.id) === id);
                      if (c) {
                        setForm({
                          ...form,
                          contactName: c.name,
                          email: c.email || '',
                          phone: c.phone || ''
                        });
                      }
                    }}
                  >
                    <option value="">— Sélectionner —</option>
                    {vipCandidates.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `• ${c.company}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pb-4">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = buildMessage({
                        groupName: form.groupName,
                        contactName: form.contactName,
                        email: form.email,
                        phone: form.phone,
                        startDate: form.startDate,
                        endDate: form.endDate,
                        pax: form.pax,
                        rooms: form.rooms,
                        note: form.note,
                        sourceLabel: 'Nouveau Lead'
                      });
                      openSMS(form.phone, msg);
                    }}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase hover:bg-slate-100 transition-colors"
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const msg = buildMessage({
                        groupName: form.groupName,
                        contactName: form.contactName,
                        email: form.email,
                        phone: form.phone,
                        startDate: form.startDate,
                        endDate: form.endDate,
                        pax: form.pax,
                        rooms: form.rooms,
                        note: form.note,
                        sourceLabel: 'Nouveau Lead'
                      });
                      openWhatsApp(form.phone, msg);
                    }}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase hover:bg-emerald-700 transition-colors"
                  >
                    WhatsApp
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom du Groupe *</label>
                  <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-bold text-sm" placeholder="Ex: Mariage Durand" value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact Principal *</label>
                    <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-bold text-sm" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">PAX Prévu</label>
                    <input type="number" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-bold text-sm" value={form.pax} onChange={(e) => setForm({ ...form, pax: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-bold text-sm" value={toDateInputValue(form.startDate)} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  <input type="date" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-bold text-sm" value={toDateInputValue(form.endDate)} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
                <RoomsInputs value={form.rooms} onChange={(next) => setForm({ ...form, rooms: next })} />
                <textarea className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-bold text-sm resize-none h-32" placeholder="Commentaires..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <div className="pt-4 flex justify-end">
                <button onClick={handleCreateLead} className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-colors">Ajouter au Pipeline</button>
              </div>
            </div>
          </div>
        )}

      </div>
      
     {/* MODAL FICHE DOSSIER */}
      <InboxDetailPanel 
        isOpen={!!editingInboxItem} 
        item={editingInboxItem} 
        onClose={() => setEditingInboxItem(null)} 
        onSave={handleSaveInboxItem} 
        onValidate={handleValidateRequest}
      />

    </div> {/* Fermeture de la div racine */}
  );
};

export default SalesCRMView;