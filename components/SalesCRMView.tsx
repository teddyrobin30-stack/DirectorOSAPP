import React, { useState, useMemo } from 'react';
import { 
  Briefcase, Plus, User, Phone, Mail, Calendar, 
  CheckSquare, AlertTriangle, ArrowRight, ArrowLeft, Filter,
  Clock, CheckCircle2, XCircle, Search, Save, FileText, Inbox, Users, Globe, Eye,
  Archive, Download, Table, ArrowDownUp, SortAsc, AlertCircle, Check,
  LayoutList, CalendarDays, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import { Lead, UserSettings, UserProfile, LeadStatus, InboxItem, Client, InboxSource } from '../types';

interface SalesCRMViewProps {
  userSettings: UserSettings;
  leads: Lead[];
  onUpdateLeads: (leads: Lead[]) => void;
  inbox?: InboxItem[];
  onUpdateInbox?: (items: InboxItem[]) => void;
  clients?: Client[];
  onUpdateClients?: (clients: Client[]) => void;
  users: UserProfile[]; // For owner assignment
  onNavigate: (tab: string) => void;
}

// --- SAFE UTILS ---
const safeLower = (str: any) => (typeof str === 'string' ? str.toLowerCase() : '');
const safeDate = (date: any) => {
    if (!date) return 0;
    const d = new Date(date);
    return isNaN(d.getTime()) ? 0 : d.getTime();
};

const SalesCRMView: React.FC<SalesCRMViewProps> = ({ 
  userSettings, leads, onUpdateLeads, inbox = [], onUpdateInbox, clients = [], onUpdateClients, users, onNavigate 
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'inbox' | 'contacts' | 'new_lead' | 'archives'>('pipeline');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedContact, setSelectedContact] = useState<Client | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // --- PIPELINE VIEW STATES ---
  const [pipelineViewMode, setPipelineViewMode] = useState<'list' | 'calendar'>('list');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [pipelineSort, setPipelineSort] = useState<'event_asc' | 'urgency' | 'created_desc' | 'alpha'>('event_asc');
  const [pipelineFilter, setPipelineFilter] = useState<string>('ALL');
  
  // Calendar Navigation State
  const [calendarDate, setCalendarDate] = useState(new Date());

  // --- INBOX VIEW STATES ---
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxSort, setInboxSort] = useState<'date_desc' | 'date_asc' | 'urgency' | 'event_date' | 'alpha'>('date_desc');
  const [inboxFilter, setInboxFilter] = useState<'ALL' | 'URGENT' | 'EMAIL' | 'PHONE' | 'WEB' | 'THIS_MONTH'>('ALL');

  // New Lead Form State
  const [form, setForm] = useState<Partial<Lead>>({
    groupName: '', contactName: '', email: '', phone: '', pax: 0, note: '', startDate: '', endDate: ''
  });

  // Inbox Form State
  const [inboxForm, setInboxForm] = useState<{ 
    contactName: string, 
    companyName: string, 
    email: string, 
    phone: string, 
    source: InboxSource,
    eventStartDate: string,
    eventEndDate: string,
    note: string
  }>({
    contactName: '', 
    companyName: '', 
    email: '', 
    phone: '', 
    source: 'email',
    eventStartDate: '',
    eventEndDate: '',
    note: ''
  });

  // Contacts Search
  const [contactSearch, setContactSearch] = useState('');

  // --- ACTIONS CONTACTS ---
  const handleDeleteClient = (id: string) => {
    // Convert to String to ensure safe comparison regardless of data type (number vs string)
    const targetId = String(id);
    
    if (confirm("Supprimer ce contact définitivement ?")) {
      if (onUpdateClients) {
        onUpdateClients(clients.filter(c => String(c.id) !== targetId));
      }
      // If the currently viewed contact is the one being deleted, close the view
      if (selectedContact && String(selectedContact.id) === targetId) {
        setSelectedContact(null);
      }
    }
  };

  const handleExportContacts = () => {
    const headers = "Nom,Type,Entreprise,Email,Téléphone,Date Ajout\n";
    const rows = filteredContacts.map(c => 
      `"${c.name}","${c.type}","${c.companyName || ''}","${c.email}","${c.phone}","${new Date(c.createdAt).toLocaleDateString()}"`
    ).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `contacts_crm_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- INBOX LOGIC ---

  const handleSaveInbox = () => {
    if (!inboxForm.contactName || !onUpdateInbox) return;

    // 1. Create Inbox Item
    const newItem: InboxItem = {
      id: `req-${Date.now()}`,
      contactName: inboxForm.contactName,
      companyName: inboxForm.companyName,
      email: inboxForm.email,
      phone: inboxForm.phone,
      requestDate: new Date().toISOString(),
      source: inboxForm.source,
      status: 'to_process',
      eventStartDate: inboxForm.eventStartDate,
      eventEndDate: inboxForm.eventEndDate,
      note: inboxForm.note,
      quoteSent: false
    };
    onUpdateInbox([newItem, ...inbox]);

    // 2. Check/Update Contacts (Automated Database)
    if (onUpdateClients && clients) {
      const existingClient = clients.find(c => 
        (c.email && c.email.toLowerCase() === inboxForm.email.toLowerCase()) || 
        (c.name.toLowerCase() === inboxForm.contactName.toLowerCase())
      );

      if (existingClient) {
        // Update existing if phone missing
        if (!existingClient.phone && inboxForm.phone) {
           const updated = clients.map(c => c.id === existingClient.id ? { ...c, phone: inboxForm.phone } : c);
           onUpdateClients(updated);
        }
      } else {
        // Create new contact
        const newClient: Client = {
          id: `cl-${Date.now()}`,
          name: inboxForm.contactName,
          companyName: inboxForm.companyName,
          type: inboxForm.companyName ? 'Entreprise' : 'Particulier',
          email: inboxForm.email,
          phone: inboxForm.phone,
          address: '',
          createdAt: new Date().toISOString()
        };
        onUpdateClients([newClient, ...clients]);
      }
    }

    setInboxForm({ 
      contactName: '', companyName: '', email: '', phone: '', source: 'email',
      eventStartDate: '', eventEndDate: '', note: '' 
    });
  };

  const handleValidateRequest = (item: InboxItem) => {
    // 1. Pre-fill Lead Form - CRITIQUE: Mapping Dates
    setForm({
      groupName: item.companyName ? `Groupe ${item.companyName}` : `Event ${item.contactName}`,
      contactName: item.contactName,
      email: item.email,
      phone: item.phone,
      startDate: item.eventStartDate || '', // START DATE
      endDate: item.eventEndDate || '',     // END DATE
      note: `${item.note ? item.note + '\n\n' : ''}Source: ${item.source.toUpperCase()}. Demande du ${new Date(item.requestDate).toLocaleDateString()}`
    });
    
    // 2. Mark as processed (Soft Delete from active view)
    if (onUpdateInbox) {
      const updatedInbox = inbox.map(i => i.id === item.id ? { ...i, status: 'processed' as const } : i);
      onUpdateInbox(updatedInbox);
    }

    // 3. Switch to New Lead Tab
    setActiveTab('new_lead');
  };

  const handleArchiveRequest = (id: string) => {
    if (onUpdateInbox) {
      // LOGIQUE : Soft delete (changement de statut) pour retrait immédiat de la liste
      const updatedInbox = inbox.map(i => i.id === id ? { ...i, status: 'archived' as const } : i);
      onUpdateInbox(updatedInbox);
      
      // FEEDBACK : Notification Toast
      setToastMessage("Demande archivée avec succès");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleUpdateLastFollowUp = (id: string, date: string) => {
    if (onUpdateInbox) {
        onUpdateInbox(inbox.map(i => i.id === id ? { ...i, lastFollowUp: date } : i));
    }
  };

  const handleToggleQuoteSent = (id: string) => {
    if (onUpdateInbox) {
        onUpdateInbox(inbox.map(i => i.id === id ? { ...i, quoteSent: !i.quoteSent } : i));
    }
  };

  // --- LEADS LOGIC ---

  const handleCreateLead = () => {
    if (!form.groupName || !form.contactName) return;
    
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      groupName: form.groupName,
      contactName: form.contactName,
      email: form.email || '',
      phone: form.phone || '',
      requestDate: new Date().toISOString(),
      startDate: form.startDate || '',
      endDate: form.endDate || '',
      pax: form.pax || 0,
      note: form.note || '',
      status: 'nouveau',
      checklist: { roomSetup: false, menu: false, roomingList: false },
      ownerId: ''
    };

    onUpdateLeads([newLead, ...leads]);
    setForm({ groupName: '', contactName: '', email: '', phone: '', pax: 0, note: '', startDate: '', endDate: '' });
    setActiveTab('pipeline');
  };

  const handleUpdateLead = (lead: Lead) => {
    onUpdateLeads(leads.map(l => l.id === lead.id ? lead : l));
    setSelectedLead(lead); // Update view
  };

  const handleDeleteLead = (id: string) => {
    if(confirm("Supprimer ce lead ?")) {
        onUpdateLeads(leads.filter(l => l.id !== id));
        setSelectedLead(null);
    }
  };

  const checkAlerts = (lead: Lead) => {
    try {
      const now = new Date();
      const reqDate = lead.requestDate ? new Date(lead.requestDate) : new Date();
      const evtDate = lead.startDate ? new Date(lead.startDate) : (lead.eventDate ? new Date(lead.eventDate) : null);
      
      const alerts = [];

      // Alert: Relance (> 7 days in 'en_cours' or 'nouveau')
      const diffDays = Math.ceil((now.getTime() - reqDate.getTime()) / (1000 * 3600 * 24));
      if ((lead.status === 'nouveau' || lead.status === 'en_cours') && diffDays > 7) {
        alerts.push({ type: 'followup', label: 'Relance', color: 'text-amber-500 bg-amber-50' });
      }

      // Alert: Urgent Arrival (< 30 days)
      if (evtDate && lead.status !== 'perdu' && !isNaN(evtDate.getTime())) {
         const diffEvt = Math.ceil((evtDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
         if (diffEvt > 0 && diffEvt < 30) {
           alerts.push({ type: 'urgent', label: 'J-' + diffEvt, color: 'text-red-500 bg-red-50' });
         }
      }

      return alerts;
    } catch (e) {
      return [];
    }
  };

  // --- FILTERS & SORTING (PIPELINE) ---

  const processedLeads = useMemo(() => {
    if (!leads) return [];
    
    let items = [...leads];

    // 1. Search (Safe)
    if (pipelineSearch) {
      const lower = safeLower(pipelineSearch);
      items = items.filter(l => 
        safeLower(l.groupName).includes(lower) ||
        safeLower(l.contactName).includes(lower) ||
        safeLower(l.email).includes(lower)
      );
    }

    // 2. Filter (Status OR Alert) - Safe Logic
    if (pipelineFilter !== 'ALL') {
      try {
        if (['nouveau', 'en_cours', 'valide', 'perdu'].includes(pipelineFilter)) {
          items = items.filter(l => l.status === pipelineFilter);
        } else if (pipelineFilter === 'URGENT_ARRIVAL') {
          const now = new Date();
          items = items.filter(l => {
            const dateStr = l.startDate || l.eventDate;
            if (!dateStr || l.status === 'perdu') return false;
            const evtDate = new Date(dateStr);
            if (isNaN(evtDate.getTime())) return false;
            const diff = (evtDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
            return diff > 0 && diff < 30;
          });
        } else if (pipelineFilter === 'LATE_FOLLOWUP') {
          const now = new Date();
          items = items.filter(l => {
            if (l.status === 'valide' || l.status === 'perdu') return false;
            if (!l.requestDate) return false;
            const reqDate = new Date(l.requestDate);
            if (isNaN(reqDate.getTime())) return false;
            const diff = (now.getTime() - reqDate.getTime()) / (1000 * 3600 * 24);
            return diff > 7;
          });
        } else if (pipelineFilter === 'THIS_MONTH') {
          const now = new Date();
          items = items.filter(l => {
            const dateStr = l.startDate || l.eventDate;
            if (!dateStr) return false;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return false;
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
        }
      } catch (e) {
        console.error("Filter error", e);
        // On error, we fallback to showing items or continue (don't crash)
      }
    }

    // 3. Sorting (Safe)
    items.sort((a, b) => {
      try {
        switch (pipelineSort) {
          case 'event_asc': {
            const dateA = safeDate(a.startDate || a.eventDate);
            const dateB = safeDate(b.startDate || b.eventDate);
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA - dateB;
          }
          case 'created_desc':
            return safeDate(b.requestDate) - safeDate(a.requestDate);
          
          case 'alpha':
            return safeLower(a.groupName).localeCompare(safeLower(b.groupName));

          case 'urgency': {
            const scoreA = checkAlerts(a).length;
            const scoreB = checkAlerts(b).length;
            return scoreB - scoreA;
          }
          default:
            return 0;
        }
      } catch (e) {
        return 0;
      }
    });

    return items;
  }, [leads, pipelineSearch, pipelineFilter, pipelineSort]);

  // --- CALENDAR LOGIC (Internal) ---
  const calendarData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Pad Start
    let startDay = firstDay.getDay(); 
    startDay = startDay === 0 ? 6 : startDay - 1; // Mon=0
    for(let i=0; i<startDay; i++) days.push(null);
    
    // Days
    for(let i=1; i<=lastDay.getDate(); i++) days.push(new Date(year, month, i));
    
    return days;
  }, [calendarDate]);

  const getLeadsForDate = (date: Date) => {
    return processedLeads.filter(l => {
      if (!l.startDate) return false;
      const start = new Date(l.startDate);
      if (isNaN(start.getTime())) return false;
      start.setHours(0,0,0,0);
      
      let end = new Date(start);
      if (l.endDate) {
        const d = new Date(l.endDate);
        if (!isNaN(d.getTime())) {
          end = d;
          end.setHours(0,0,0,0);
        }
      }
      
      const check = new Date(date);
      check.setHours(0,0,0,0);
      return check >= start && check <= end;
    });
  };

  const checkIsOverdue = (item: InboxItem) => {
     if (item.status !== 'to_process') return false;
     const now = new Date();
     const reqDate = item.lastFollowUp ? new Date(item.lastFollowUp) : new Date(item.requestDate);
     if (isNaN(reqDate.getTime())) return false;
     const diff = now.getTime() - reqDate.getTime();
     return diff > 48 * 3600 * 1000; // 48h
  };

  const processedInbox = useMemo(() => {
    if (!inbox) return [];
    let items = [...inbox].filter(i => i.status === 'to_process');
    
    // Search
    if (inboxSearch) {
      const lower = safeLower(inboxSearch);
      items = items.filter(i => 
        safeLower(i.contactName).includes(lower) || 
        safeLower(i.companyName).includes(lower) || 
        safeLower(i.email).includes(lower)
      );
    }

    // Filter
    if (inboxFilter !== 'ALL') {
      try {
        if (inboxFilter === 'URGENT') {
          items = items.filter(i => checkIsOverdue(i));
        } else if (inboxFilter === 'THIS_MONTH') {
          const now = new Date();
          items = items.filter(i => {
            if (!i.eventStartDate) return false;
            const d = new Date(i.eventStartDate);
            return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
        } else {
          items = items.filter(i => safeLower(i.source) === safeLower(inboxFilter));
        }
      } catch (e) {
        // Fallback
      }
    }

    // Sort
    items.sort((a, b) => {
      try {
        switch (inboxSort) {
          case 'date_asc': return safeDate(a.requestDate) - safeDate(b.requestDate);
          case 'date_desc': return safeDate(b.requestDate) - safeDate(a.requestDate);
          case 'alpha': return safeLower(a.contactName).localeCompare(safeLower(b.contactName));
          case 'event_date':
             const da = safeDate(a.eventStartDate);
             const db = safeDate(b.eventStartDate);
             if (!da) return 1; if (!db) return -1;
             return da - db; 
          case 'urgency':
             const ua = checkIsOverdue(a) ? 1 : 0;
             const ub = checkIsOverdue(b) ? 1 : 0;
             return ub - ua;
          default: return 0;
        }
      } catch (e) { return 0; }
    });
    return items;
  }, [inbox, inboxSearch, inboxFilter, inboxSort]);

  const handleExportCSV = () => {
    const archiveList = inbox.filter(i => i.status !== 'to_process');
    const headers = ['Date', 'Nom Contact', 'Entreprise', 'Email', 'Téléphone', 'Source', 'Statut', 'Note'];
    const rows = archiveList.map(item => [
       new Date(item.requestDate).toLocaleDateString(),
       `"${item.contactName}"`,
       `"${item.companyName || ''}"`,
       item.email,
       item.phone,
       item.source,
       item.status === 'processed' ? 'Validé' : 'Non Abouti',
       `"${(item.note || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `archives_crm_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canValidate = (lead: Lead) => {
    return lead.checklist.roomSetup && lead.checklist.menu && lead.checklist.roomingList;
  };

  const sortedArchives = useMemo(() => {
    if (!inbox) return [];
    return inbox.filter(i => i.status !== 'to_process').sort((a, b) => safeDate(b.requestDate) - safeDate(a.requestDate));
  }, [inbox]);

  const filteredContacts = useMemo(() => {
    if (!clients) return [];
    if (!contactSearch) return clients;
    const lower = safeLower(contactSearch);
    return clients.filter(c => safeLower(c.name).includes(lower) || safeLower(c.companyName).includes(lower));
  }, [clients, contactSearch]);

  const clientHistory = useMemo(() => {
    if (!selectedContact) return [];
    return leads.filter(l => 
        l.email === selectedContact.email || 
        l.contactName === selectedContact.name
    ).sort((a, b) => safeDate(b.requestDate) - safeDate(a.requestDate));
  }, [selectedContact, leads]);

  // --- RENDER ---

  const themeClass = `bg-${userSettings.themeColor}-600`;
  const themeText = `text-${userSettings.themeColor}-600`;

  return (
    <div className={`h-full flex flex-col overflow-hidden animate-in fade-in relative ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
           <div className="bg-emerald-500 rounded-full p-1"><CheckCircle2 size={12} className="text-white"/></div>
           <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className={`p-6 border-b z-20 flex justify-between items-center ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
         <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
              <Briefcase size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black">Suivi Commercial</h2>
              <p className="text-xs font-bold text-slate-400">Leads & Demandes Groupes</p>
            </div>
         </div>
         <button 
           onClick={() => onNavigate('dashboard')} // Will be intercepted to go to portal
           className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
         >
           <ArrowLeft size={14}/> Retour
         </button>
      </div>

      {/* Tabs */}
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
              <Inbox size={14}/> Demandes (Inbox)
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

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4 md:px-6 md:pb-20 flex flex-col md:flex-row gap-4 md:gap-6">
         
         {/* --- PIPELINE TAB (ENHANCED) --- */}
         {activeTab === 'pipeline' && (
           <>
             {/* Left: Cockpit List OR Calendar */}
             <div className={`w-full md:w-1/3 flex flex-col rounded-[32px] border overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'} ${pipelineViewMode === 'calendar' ? 'md:w-2/3' : ''}`}>
                
                {/* COCKPIT TOOLBAR */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 space-y-3">
                   {/* Top Row: Search & View Toggle */}
                   <div className="flex gap-2">
                      <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-transparent focus-within:border-indigo-500 transition-colors">
                         <Search size={16} className="text-slate-400 mr-2"/>
                         <input 
                           type="text" 
                           placeholder="🔍 Chercher un groupe..." 
                           value={pipelineSearch}
                           onChange={(e) => setPipelineSearch(e.target.value)}
                           className="bg-transparent outline-none w-full text-xs font-bold"
                         />
                      </div>
                      
                      {/* View Toggle */}
                      <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                         <button 
                           onClick={() => setPipelineViewMode('list')}
                           className={`p-2 rounded-lg transition-all ${pipelineViewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400'}`}
                           title="Vue Liste"
                         >
                           <LayoutList size={16}/>
                         </button>
                         <button 
                           onClick={() => setPipelineViewMode('calendar')}
                           className={`p-2 rounded-lg transition-all ${pipelineViewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400'}`}
                           title="Vue Calendrier"
                         >
                           <CalendarDays size={16}/>
                         </button>
                      </div>
                   </div>

                   {/* Middle Row: Sort Dropdown */}
                   {pipelineViewMode === 'list' && (
                     <div className="relative">
                        <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-transparent">
                           <ArrowDownUp size={14} className="text-slate-400 mr-2"/>
                           <select 
                             value={pipelineSort}
                             onChange={(e) => setPipelineSort(e.target.value as any)}
                             className="bg-transparent outline-none w-full text-xs font-bold appearance-none cursor-pointer"
                           >
                              <option value="event_asc">📅 Prochaines Arrivées (Défaut)</option>
                              <option value="created_desc">🆕 Date de Création</option>
                              <option value="urgency">🚨 Urgence / Retard</option>
                              <option value="alpha">Abc Alphabétique</option>
                           </select>
                        </div>
                     </div>
                   )}

                   {/* Bottom Row: Quick Filter Chips */}
                   <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      <button onClick={() => setPipelineFilter('ALL')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${pipelineFilter === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Tous</button>
                      <button onClick={() => setPipelineFilter('URGENT_ARRIVAL')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${pipelineFilter === 'URGENT_ARRIVAL' ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-500'}`}>🚨 J-30</button>
                      <button onClick={() => setPipelineFilter('LATE_FOLLOWUP')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${pipelineFilter === 'LATE_FOLLOWUP' ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-500'}`}>⚠️ Relance</button>
                      <button onClick={() => setPipelineFilter('THIS_MONTH')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${pipelineFilter === 'THIS_MONTH' ? 'bg-violet-500 text-white border-violet-500' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>📅 Ce Mois</button>
                   </div>
                </div>
                
                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                   
                   {/* MODE LISTE */}
                   {pipelineViewMode === 'list' ? (
                     <>
                       {processedLeads.map(lead => {
                         const alerts = checkAlerts(lead);
                         return (
                           <div 
                             key={lead.id}
                             onClick={() => setSelectedLead(lead)}
                             className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedLead?.id === lead.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200' : 'bg-white dark:bg-slate-900 border-transparent hover:border-slate-200'}`}
                           >
                              <div className="flex justify-between items-start mb-2">
                                 <h4 className="font-bold text-sm line-clamp-1">{lead.groupName}</h4>
                                 <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                   lead.status === 'valide' ? 'bg-emerald-100 text-emerald-700' : 
                                   lead.status === 'perdu' ? 'bg-slate-200 text-slate-500' : 
                                   lead.status === 'nouveau' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                 }`}>
                                   {lead.status.replace('_', ' ')}
                                 </span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-slate-500">
                                 <span>{lead.contactName}</span>
                                 <span>{lead.pax} Pax</span>
                              </div>
                              {/* UPDATED: Affichage Plage Dates en gras */}
                              <p className="text-[9px] font-bold text-indigo-400 mt-1 flex items-center gap-1">
                                 <Calendar size={10}/> 
                                 {lead.startDate ? (
                                    <span className="font-black">
                                      {new Date(lead.startDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'numeric'})}
                                      {lead.endDate ? ` au ${new Date(lead.endDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'numeric'})}` : ''}
                                    </span>
                                 ) : (
                                    <span>{lead.eventDate ? new Date(lead.eventDate).toLocaleDateString() : 'Dates à définir'}</span>
                                 )}
                              </p>
                              
                              {/* Alerts Badges */}
                              {alerts.length > 0 && (
                                <div className="flex gap-1 mt-3">
                                   {alerts.map((alert, idx) => (
                                     <div key={idx} className={`flex items-center gap-1 px-2 py-1 rounded text-[8px] font-black uppercase ${alert.color}`}>
                                        <AlertTriangle size={10}/> {alert.label}
                                     </div>
                                   ))}
                                </div>
                              )}
                           </div>
                         );
                       })}
                       {processedLeads.length === 0 && (
                         <div className="text-center py-10 text-slate-400 text-xs font-medium">Aucun dossier trouvé.</div>
                       )}
                     </>
                   ) : (
                     /* MODE CALENDRIER */
                     <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-b-[24px]">
                        {/* Month Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                           <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ChevronLeft size={16}/></button>
                           <span className="text-sm font-black uppercase">{calendarDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                           <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ChevronRight size={16}/></button>
                        </div>
                        
                        {/* Grid */}
                        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 text-center py-2">
                           {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => <div key={d}>{d}</div>)}
                        </div>
                        <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                           {calendarData.map((date, i) => {
                             if (!date) return <div key={`empty-${i}`} className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-r border-slate-100 dark:border-slate-800" />;
                             
                             const daysLeads = getLeadsForDate(date);
                             const isToday = date.toDateString() === new Date().toDateString();

                             return (
                               <div key={i} className={`min-h-[80px] p-1 border-b border-r border-slate-100 dark:border-slate-800 relative ${isToday ? 'bg-indigo-50/30' : ''}`}>
                                  <span className={`text-[10px] font-bold block mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{date.getDate()}</span>
                                  <div className="space-y-1">
                                     {daysLeads.map(l => (
                                       <div 
                                         key={l.id}
                                         onClick={() => { setSelectedLead(l); setPipelineViewMode('list'); }} // SWITCH BACK TO LIST & SELECT
                                         className={`text-[8px] font-bold px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity text-white ${
                                           l.status === 'valide' ? 'bg-emerald-500' :
                                           l.status === 'en_cours' ? 'bg-amber-400' :
                                           l.status === 'nouveau' ? 'bg-blue-400' : 'bg-slate-400'
                                         }`}
                                         title={l.groupName}
                                       >
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

             {/* Right: Detail (Existing Logic reused) */}
             <div className={`flex-1 rounded-[32px] border overflow-hidden flex flex-col ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                {selectedLead ? (
                  <div className="flex flex-col h-full">
                     {/* Detail Header */}
                     <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
                        <div>
                           <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dossier #{selectedLead.id.split('-')[1]}</span>
                           <h2 className="text-3xl font-black mt-1">{selectedLead.groupName}</h2>
                           
                           {/* UPDATED: Date Pickers in Detail */}
                           <div className="grid grid-cols-2 gap-4 mt-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div>
                                 <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Arrivée</label>
                                 <input 
                                   type="date" 
                                   className="w-full bg-transparent font-bold text-xs outline-none text-slate-700 dark:text-slate-200"
                                   value={selectedLead.startDate || selectedLead.eventDate || ''}
                                   onChange={(e) => handleUpdateLead({ ...selectedLead, startDate: e.target.value })}
                                 />
                              </div>
                              <div>
                                 <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Départ</label>
                                 <input 
                                   type="date" 
                                   className="w-full bg-transparent font-bold text-xs outline-none text-slate-700 dark:text-slate-200"
                                   value={selectedLead.endDate || ''}
                                   onChange={(e) => handleUpdateLead({ ...selectedLead, endDate: e.target.value })}
                                 />
                              </div>
                           </div>

                           <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                 <User size={14}/> {selectedLead.contactName}
                              </div>
                           </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-1 flex">
                              <select 
                                value={selectedLead.status}
                                onChange={(e) => handleUpdateLead({ ...selectedLead, status: e.target.value as LeadStatus })}
                                className="bg-transparent text-xs font-bold uppercase outline-none px-2 py-1 cursor-pointer disabled:opacity-50"
                              >
                                 <option value="nouveau">Nouveau</option>
                                 <option value="en_cours">En cours</option>
                                 <option value="valide" disabled={!canValidate(selectedLead)}>Validé (Checklist Requise)</option>
                                 <option value="perdu">Perdu</option>
                              </select>
                           </div>
                           <select 
                             value={selectedLead.ownerId || ''}
                             onChange={(e) => handleUpdateLead({ ...selectedLead, ownerId: e.target.value })}
                             className="text-[10px] font-bold bg-transparent outline-none text-right text-indigo-500 cursor-pointer"
                           >
                             <option value="">Assigner responsable...</option>
                             {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
                           </select>
                        </div>
                     </div>

                     {/* Detail Body */}
                     <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        
                        {/* 1. Contact Info */}
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900">
                              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Email</p>
                              <p className="font-bold text-sm">{selectedLead.email || '-'}</p>
                           </div>
                           <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900">
                              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Téléphone</p>
                              <p className="font-bold text-sm">{selectedLead.phone || '-'}</p>
                           </div>
                        </div>

                        {/* 2. Checklist Validation - MANDATORY */}
                        <div className="p-6 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-900/10">
                           <h4 className="text-sm font-black uppercase text-indigo-900 dark:text-indigo-200 mb-4 flex items-center gap-2">
                             <CheckSquare size={16}/> Checklist Validation
                           </h4>
                           <div className="space-y-3">
                              {[
                                { key: 'roomSetup', label: 'Disposition de salle validée' },
                                { key: 'menu', label: 'Menu F&B validé' },
                                { key: 'roomingList', label: 'Rooming List reçue' },
                              ].map(item => (
                                <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                                   <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedLead.checklist[item.key as keyof typeof selectedLead.checklist] ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white dark:bg-slate-800'}`}>
                                      {selectedLead.checklist[item.key as keyof typeof selectedLead.checklist] && <CheckCircle2 size={14} className="text-white"/>}
                                   </div>
                                   <input 
                                     type="checkbox" 
                                     checked={selectedLead.checklist[item.key as keyof typeof selectedLead.checklist]}
                                     onChange={(e) => handleUpdateLead({
                                       ...selectedLead,
                                       checklist: { ...selectedLead.checklist, [item.key]: e.target.checked }
                                     })}
                                     className="hidden"
                                   />
                                   <span className={`text-sm font-bold ${selectedLead.checklist[item.key as keyof typeof selectedLead.checklist] ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-500'}`}>{item.label}</span>
                                </label>
                              ))}
                           </div>
                           {!canValidate(selectedLead) && selectedLead.status !== 'perdu' && (
                             <p className="text-[10px] text-amber-600 font-bold mt-4 flex items-center gap-1">
                               <AlertTriangle size={12}/> Complétez la checklist pour passer en statut "Validé".
                             </p>
                           )}
                        </div>

                        {/* 3. Notes */}
                        <div className="space-y-2">
                           <h4 className="text-[10px] font-black uppercase text-slate-400 ml-1">Notes / Historique</h4>
                           <textarea 
                             className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-medium text-sm min-h-[150px]"
                             value={selectedLead.note}
                             onChange={(e) => handleUpdateLead({ ...selectedLead, note: e.target.value })}
                             placeholder="Notes internes..."
                           />
                        </div>

                        <div className="pt-4 flex justify-end">
                           <button onClick={() => handleDeleteLead(selectedLead.id)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase flex items-center gap-2">
                              <XCircle size={14}/> Supprimer le lead
                           </button>
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                     <Briefcase size={64} className="mb-4 text-slate-400"/>
                     <p className="text-xl font-black text-slate-500">Sélectionnez un dossier</p>
                  </div>
                )}
             </div>
           </>
         )}

         {/* --- INBOX TAB --- */}
         {activeTab === 'inbox' && (
           <div className="flex flex-col md:flex-row h-full gap-4 md:gap-6 w-full">
              {/* Left: Quick Form */}
              <div className={`w-full md:w-1/3 flex flex-col rounded-[32px] border overflow-hidden p-6 space-y-4 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                 <h3 className="text-lg font-black uppercase tracking-tight">Saisie Rapide</h3>
                 <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Nom Contact *" 
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold outline-none"
                      value={inboxForm.contactName}
                      onChange={(e) => setInboxForm({...inboxForm, contactName: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Entreprise" 
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold outline-none"
                      value={inboxForm.companyName}
                      onChange={(e) => setInboxForm({...inboxForm, companyName: e.target.value})}
                    />
                    <input 
                      type="email" 
                      placeholder="Email" 
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold outline-none"
                      value={inboxForm.email}
                      onChange={(e) => setInboxForm({...inboxForm, email: e.target.value})}
                    />
                    <input 
                      type="tel" 
                      placeholder="Téléphone" 
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold outline-none"
                      value={inboxForm.phone}
                      onChange={(e) => setInboxForm({...inboxForm, phone: e.target.value})}
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Du...</label>
                            <input 
                                type="date" 
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold outline-none uppercase"
                                value={inboxForm.eventStartDate}
                                onChange={(e) => setInboxForm({...inboxForm, eventStartDate: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Au...</label>
                            <input 
                                type="date" 
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold outline-none uppercase"
                                value={inboxForm.eventEndDate}
                                onChange={(e) => setInboxForm({...inboxForm, eventEndDate: e.target.value})}
                            />
                        </div>
                    </div>

                    <textarea 
                        placeholder="Note / Commentaires (ex: Besoin particulier, occasion...)" 
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-medium outline-none resize-none h-20"
                        value={inboxForm.note}
                        onChange={(e) => setInboxForm({...inboxForm, note: e.target.value})}
                    />

                    <div className="flex gap-2">
                       {['email', 'phone', 'website'].map(s => (
                         <button 
                           key={s} 
                           onClick={() => setInboxForm({...inboxForm, source: s as InboxSource})}
                           className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border ${inboxForm.source === s ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-slate-100 dark:border-slate-700 text-slate-400'}`}
                         >
                           {s === 'website' ? 'Web' : s === 'phone' ? 'Tél' : 'Email'}
                         </button>
                       ))}
                    </div>
                    <button 
                      onClick={handleSaveInbox}
                      disabled={!inboxForm.contactName}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
                    >
                       Enregistrer Demande
                    </button>
                 </div>
              </div>

              {/* Right: Inbox List & Toolbar */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                 
                 {/* TOOLBAR: Search, Sort, Filters */}
                 <div className={`mb-4 p-4 rounded-[24px] border shadow-sm space-y-3 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    
                    {/* Row 1: Search & Sort */}
                    <div className="flex flex-col md:flex-row gap-3">
                       <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-700 focus-within:border-indigo-500 transition-colors">
                          <Search size={16} className="text-slate-400 mr-2"/>
                          <input 
                            type="text" 
                            placeholder="Rechercher un lead..." 
                            value={inboxSearch}
                            onChange={(e) => setInboxSearch(e.target.value)}
                            className="bg-transparent outline-none w-full text-xs font-bold"
                          />
                       </div>
                       <div className="relative md:min-w-[180px]">
                          <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-700">
                             <ArrowDownUp size={14} className="text-slate-400 mr-2"/>
                             <select 
                               value={inboxSort}
                               onChange={(e) => setInboxSort(e.target.value as any)}
                               className="bg-transparent outline-none w-full text-xs font-bold appearance-none cursor-pointer"
                             >
                                <option value="date_desc">📅 Récent → Ancien</option>
                                <option value="date_asc">📅 Ancien → Récent</option>
                                <option value="urgency">🚨 Urgence Relance</option>
                                <option value="event_date">📆 Date Événement</option>
                                <option value="alpha">Abc Alphabétique</option>
                             </select>
                          </div>
                       </div>
                    </div>

                    {/* Row 2: Filters & Counter */}
                    <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-4">
                       <div className="flex gap-2">
                          <button 
                            onClick={() => setInboxFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${inboxFilter === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                          >
                             Tous
                          </button>
                          <button 
                            onClick={() => setInboxFilter('URGENT')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border flex items-center gap-1 ${inboxFilter === 'URGENT' ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-red-500'}`}
                          >
                             ⚠️ Retard Relance
                          </button>
                          <button 
                            onClick={() => setInboxFilter('THIS_MONTH')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${inboxFilter === 'THIS_MONTH' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                          >
                             Ce Mois-ci
                          </button>
                          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                             {['EMAIL', 'PHONE', 'WEB'].map(f => (
                               <button 
                                 key={f}
                                 onClick={() => setInboxFilter(f as any)}
                                 className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${inboxFilter === f ? 'bg-white dark:bg-slate-600 shadow text-indigo-600' : 'text-slate-400'}`}
                               >
                                 {f === 'WEB' ? '🌐' : f === 'PHONE' ? '📞' : '📧'}
                               </button>
                             ))}
                          </div>
                       </div>
                       <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                          {processedInbox.length} demande{processedInbox.length !== 1 ? 's' : ''} affichée{processedInbox.length !== 1 ? 's' : ''}
                       </span>
                    </div>
                 </div>

                 {/* List */}
                 <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-10">
                    {processedInbox.map(item => {
                      const isAlert = checkIsOverdue(item);

                      return (
                        <div key={item.id} className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between md:items-center bg-white dark:bg-slate-800 ${isAlert ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/10' : 'border-slate-100 dark:border-slate-700'}`}>
                           <div className="flex items-center gap-4 mb-3 md:mb-0">
                              <div className={`p-3 rounded-xl ${item.source === 'email' ? 'bg-blue-50 text-blue-600' : item.source === 'phone' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                                 {item.source === 'email' ? <Mail size={18}/> : item.source === 'phone' ? <Phone size={18}/> : <Globe size={18}/>}
                              </div>
                              <div>
                                 <h4 className="font-bold text-sm">{item.contactName} {item.companyName && <span className="text-slate-400 font-medium">({item.companyName})</span>}</h4>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Recu le {new Date(item.requestDate).toLocaleDateString()} à {new Date(item.requestDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                 
                                 {item.eventStartDate && (
                                   <div className="flex items-center gap-1 mt-1.5 text-indigo-600 dark:text-indigo-400">
                                       <Calendar size={12} />
                                       <span className="text-[10px] font-black uppercase">
                                           {new Date(item.eventStartDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'numeric'})}
                                           {item.eventEndDate && ` au ${new Date(item.eventEndDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'numeric'})}`}
                                       </span>
                                   </div>
                                 )}

                                 {isAlert && <span className="text-[9px] font-black text-orange-500 flex items-center gap-1 mt-1"><AlertTriangle size={10}/> Relance nécessaire (+48h)</span>}
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-4 md:gap-6 justify-between md:justify-end w-full md:w-auto">
                              {/* Quote Sent Toggle */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleQuoteSent(item.id); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                                    item.quoteSent 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                                }`}
                              >
                                <div className={`w-3 h-3 rounded flex items-center justify-center border transition-colors ${
                                    item.quoteSent ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-slate-300'
                                }`}>
                                    {item.quoteSent && <Check size={8} className="text-white" strokeWidth={4} />}
                                </div>
                                <span className={`text-[10px] uppercase tracking-wide ${item.quoteSent ? 'font-black' : 'font-bold'}`}>Devis envoyé</span>
                              </button>

                              <div className="text-right">
                                 <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Dernière Relance</p>
                                 <input 
                                   type="date" 
                                   value={item.lastFollowUp ? item.lastFollowUp.split('T')[0] : ''}
                                   onChange={(e) => handleUpdateLastFollowUp(item.id, new Date(e.target.value).toISOString())}
                                   className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                                 />
                              </div>
                              <div className="flex gap-2">
                                 <button onClick={() => handleValidateRequest(item)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase shadow hover:bg-emerald-600 transition-colors flex items-center gap-1">
                                    <CheckCircle2 size={12}/> Valider
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleArchiveRequest(item.id); }}
                                   className="p-2 text-slate-300 hover:text-red-500 transition-colors" 
                                   title="Sans suite (Archiver)"
                                 >
                                    <XCircle size={18}/>
                                 </button>
                              </div>
                           </div>
                        </div>
                      );
                    })}
                    {processedInbox.length === 0 && (
                      <div className="text-center py-20 text-slate-400 font-medium">Aucune demande correspondant aux filtres.</div>
                    )}
                 </div>
              </div>
           </div>
         )}

         {/* --- ARCHIVES TAB --- */}
         {activeTab === 'archives' && (
           <div className="w-full h-full flex flex-col">
              {/* Toolbar */}
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-xl font-black">Historique des Demandes</h3>
                    <p className="text-xs text-slate-400 font-bold">Demandes traitées et archivées</p>
                 </div>
                 <button 
                   onClick={handleExportCSV}
                   className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-colors"
                 >
                    <Download size={16}/> Exporter Excel
                 </button>
              </div>

              {/* Archives Table */}
              <div className={`flex-1 rounded-[32px] border overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                 <div className="overflow-x-auto h-full">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                             <th className="p-4 font-black uppercase text-xs text-slate-500 w-32">Date</th>
                             <th className="p-4 font-black uppercase text-xs text-slate-500">Nom / Prospect</th>
                             <th className="p-4 font-black uppercase text-xs text-slate-500">Entreprise</th>
                             <th className="p-4 font-black uppercase text-xs text-slate-500 w-32 text-center">Statut Final</th>
                             <th className="p-4 font-black uppercase text-xs text-slate-500">Note / Motif</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {sortedArchives.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                               <td className="p-4 font-bold text-slate-600 dark:text-slate-300">{new Date(item.requestDate).toLocaleDateString()}</td>
                               <td className="p-4 font-bold text-slate-900 dark:text-white">{item.contactName}</td>
                               <td className="p-4 text-slate-500">{item.companyName || '-'}</td>
                               <td className="p-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                    item.status === 'processed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                                  }`}>
                                    {item.status === 'processed' ? 'Validé' : 'Non Abouti'}
                                  </span>
                               </td>
                               <td className="p-4 text-slate-500 italic truncate max-w-xs">{item.note || '-'}</td>
                            </tr>
                          ))}
                          {sortedArchives.length === 0 && (
                            <tr>
                               <td colSpan={5} className="p-8 text-center text-slate-400 italic">Aucune archive disponible.</td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
         )}

         {/* --- CONTACTS TAB --- */}
         {activeTab === 'contacts' && (
           <div className="flex flex-col md:flex-row h-full gap-4 md:gap-6 w-full">
              {/* Left: List */}
              <div className={`w-full md:w-1/3 flex flex-col rounded-[32px] border overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                 <div className="p-4 border-b border-slate-100 dark:border-slate-700 space-y-3">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-transparent focus-within:border-indigo-500">
                       <Search size={16} className="text-slate-400"/>
                       <input 
                         type="text" 
                         placeholder="Rechercher un contact..." 
                         className="bg-transparent outline-none text-xs font-bold w-full"
                         value={contactSearch}
                         onChange={(e) => setContactSearch(e.target.value)}
                        />
                    </div>
                    {/* EXPORT BUTTON */}
                    <button onClick={handleExportContacts} className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Download size={14}/> Exporter CSV
                    </button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                    {filteredContacts.map(client => (
                      <div 
                        key={client.id} 
                        onClick={() => setSelectedContact(client)}
                        className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedContact?.id === client.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                         <div className="flex justify-between items-start">
                            <span className="font-bold text-sm">{client.name}</span>
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 uppercase">{client.type === 'Entreprise' ? 'PRO' : 'PERSO'}</span>
                         </div>
                         <p className="text-xs text-slate-500 truncate">{client.email}</p>
                      </div>
                    ))}
                 </div>
              </div>

              {/* Right: Detail */}
              <div className={`flex-1 rounded-[32px] border overflow-hidden p-8 flex flex-col ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                 {selectedContact ? (
                   <div className="flex-1 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-8">
                         <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fiche Client</span>
                            <h2 className="text-3xl font-black mt-1">{selectedContact.name}</h2>
                            {selectedContact.companyName && <p className="text-sm font-bold text-slate-500">{selectedContact.companyName}</p>}
                         </div>
                         <div className="flex flex-col items-end gap-4">
                            <div className="text-right space-y-1">
                                <p className="text-sm font-bold">{selectedContact.email}</p>
                                <p className="text-sm font-bold">{selectedContact.phone}</p>
                            </div>
                            <button 
                                onClick={() => handleDeleteClient(selectedContact.id)}
                                className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-600 transition-colors bg-red-50 dark:bg-red-900/10 px-3 py-1.5 rounded-lg uppercase"
                            >
                                <Trash2 size={14}/> Supprimer
                            </button>
                         </div>
                      </div>

                      <div className="flex-1 overflow-y-auto">
                         <h4 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><Clock size={14}/> Historique des demandes</h4>
                         <div className="space-y-3">
                            {clientHistory.map(history => (
                              <div key={history.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                 <div>
                                    <p className="font-bold text-sm">{history.groupName}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(history.requestDate).toLocaleDateString()} • {history.pax} PAX</p>
                                 </div>
                                 <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${
                                   history.status === 'valide' ? 'bg-emerald-100 text-emerald-600' : 
                                   history.status === 'perdu' ? 'bg-slate-200 text-slate-500' : 
                                   'bg-blue-100 text-blue-600'
                                 }`}>
                                   {history.status.replace('_', ' ')}
                                 </span>
                              </div>
                            ))}
                            {clientHistory.length === 0 && <p className="text-xs text-slate-400 italic">Aucun historique disponible.</p>}
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                      <Users size={64} className="mb-4 text-slate-400"/>
                      <p className="text-xl font-black text-slate-500">Sélectionnez un contact</p>
                   </div>
                 )}
              </div>
           </div>
         )}

         {/* --- NEW LEAD TAB --- */}
         {activeTab === 'new_lead' && (
           <div className="w-full max-w-2xl mx-auto overflow-y-auto no-scrollbar py-6">
              <div className={`p-8 rounded-[32px] border shadow-sm space-y-6 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                 <h3 className="text-xl font-black uppercase tracking-tight">Nouvelle Demande Qualifiée</h3>
                 
                 <div className="space-y-4">
                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom du Groupe / Événement *</label>
                       <input 
                         type="text" 
                         className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                         placeholder="Ex: Séminaire L'Oréal"
                         value={form.groupName}
                         onChange={(e) => setForm({...form, groupName: e.target.value})}
                       />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact Principal *</label>
                          <input 
                            type="text" 
                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                            placeholder="Nom du contact"
                            value={form.contactName}
                            onChange={(e) => setForm({...form, contactName: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">PAX Prévu</label>
                          <input 
                            type="number" 
                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                            value={form.pax || ''}
                            onChange={(e) => setForm({...form, pax: parseInt(e.target.value) || 0})}
                          />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
                          <input 
                            type="email" 
                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                            value={form.email}
                            onChange={(e) => setForm({...form, email: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Téléphone</label>
                          <input 
                            type="tel" 
                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                            value={form.phone}
                            onChange={(e) => setForm({...form, phone: e.target.value})}
                          />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date Arrivée</label>
                          <input 
                            type="date" 
                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                            value={form.startDate || ''}
                            onChange={(e) => setForm({...form, startDate: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date Départ</label>
                          <input 
                            type="date" 
                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                            value={form.endDate || ''}
                            onChange={(e) => setForm({...form, endDate: e.target.value})}
                          />
                       </div>
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Note / Commentaire</label>
                       <textarea 
                         className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm resize-none h-32"
                         placeholder="Détails de la demande..."
                         value={form.note}
                         onChange={(e) => setForm({...form, note: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button 
                      onClick={handleCreateLead}
                      className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-colors"
                    >
                       Ajouter au Pipeline
                    </button>
                 </div>
              </div>
           </div>
         )}

      </div>
    </div>
  );
};

export default SalesCRMView;