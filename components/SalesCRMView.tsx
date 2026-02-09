import React, { useMemo, useState } from 'react';
import {
  Briefcase, Plus, User, Phone, Mail, Calendar,
  CheckSquare, AlertTriangle, ArrowLeft, Filter,
  Clock, CheckCircle2, XCircle, Search, Inbox, Users, Globe,
  Archive, Download, ArrowDownUp, Check,
  LayoutList, CalendarDays, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';

// TYPES
import {
  Lead, UserSettings, UserProfile, LeadStatus,
  InboxItem, Client, InboxSource, Contact, Rooms
} from '../types';

// HOOKS & SERVICES
import { useCrmPipeline } from '../hooks/useCrmPipeline';
import { useCrmInbox } from '../hooks/useCrmInbox';
import { 
  safeLower, safeDate, checkIsOverdue, checkAlerts, canValidateLead,
  buildMessage, openSMS, openWhatsApp, defaultRooms
} from '../services/crmUtils';

/* -------------------- HELPERS UI LOCAUX -------------------- */
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toDateInputValue = (v?: string) => {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
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
  // ✅ Note: Assure-toi d'avoir créé le fichier useCrmInbox.ts comme indiqué dans l'étape 1
  const { processedInbox, state: inboxState } = useCrmInbox(inbox);

  // UI STATE
  const [activeTab, setActiveTab] = useState<'pipeline' | 'inbox' | 'contacts' | 'new_lead' | 'archives'>('pipeline');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pipelineViewMode, setPipelineViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Normalisation Contacts
  const appContacts = useMemo(() => Array.isArray(contacts) ? contacts : clients, [contacts, clients]);
  
  // Utilisation sécurisée de onUpdateClients via updateAppContacts si besoin
  const updateAppContacts = (next: any[]) => onUpdateContacts ? onUpdateContacts(next) : onUpdateClients?.(next);

  // Forms
  const [form, setForm] = useState<any>({ groupName: '', contactName: '', email: '', phone: '', pax: 0, note: '', startDate: '', endDate: '', rooms: defaultRooms() });
  const [inboxForm, setInboxForm] = useState<any>({ contactName: '', companyName: '', email: '', phone: '', source: 'email', eventStartDate: '', eventEndDate: '', note: '', rooms: defaultRooms() });

  // ACTIONS
  const handleCreateLead = () => {
    if (!form.groupName || !form.contactName) return;
    const newLead: Lead = { ...form, id: uid('lead'), requestDate: new Date().toISOString(), status: 'nouveau', checklist: { roomSetup: false, menu: false, roomingList: false }, ownerId: '' };
    onUpdateLeads([newLead, ...leads]);
    setForm({ groupName: '', contactName: '', email: '', phone: '', pax: 0, note: '', startDate: '', endDate: '', rooms: defaultRooms() });
    setActiveTab('pipeline');
  };

  const handleUpdateLead = (lead: Lead) => {
    onUpdateLeads(leads.map(l => l.id === lead.id ? lead : l));
    setSelectedLead(lead);
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
    onUpdateInbox?.(inbox.map(i => i.id === item.id ? { ...i, status: 'processed' } : i));
    setActiveTab('new_lead');
  };

  const handleArchiveRequest = (id: string) => {
    onUpdateInbox?.(inbox.map(i => i.id === id ? { ...i, status: 'archived' } : i));
    setToastMessage('Demande archivée');
    setTimeout(() => setToastMessage(null), 3000);
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

      {/* TABS */}
      <div className="px-6 py-4 flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-800 w-fit m-4 space-x-2">
        {(['pipeline', 'inbox', 'contacts', 'archives', 'new_lead'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}>
            {t === 'new_lead' ? <Plus size={14} /> : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
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
                  <div className="p-4 text-center text-xs text-slate-400">Vue Calendrier (WIP)</div>
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
                  
                  <div className="pt-6 flex justify-end">
                    <button onClick={() => onUpdateLeads(leads.filter(l => l.id !== selectedLead.id))} className="text-red-400 hover:text-red-600 text-xs font-black uppercase flex items-center gap-2"><Trash2 size={14} /> Supprimer le dossier</button>
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
                <button onClick={() => { onUpdateInbox?.([ { ...inboxForm, id: uid('inbox'), status: 'to_process', requestDate: new Date().toISOString() }, ...inbox ]); setInboxForm({ contactName: '', companyName: '', email: '', phone: '', source: 'email', rooms: defaultRooms() }); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all">Enregistrer Demande</button>
              </div>
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="mb-4 p-4 rounded-[24px] border bg-white dark:bg-slate-800 flex justify-between items-center gap-4">
                <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border">
                  <Search size={16} className="text-slate-400 mr-2" />
                  <input type="text" placeholder="Filtrer l'inbox..." value={inboxState.search} onChange={(e) => inboxState.setSearch(e.target.value)} className="bg-transparent outline-none w-full text-xs font-bold" />
                </div>
                <select value={inboxState.sort} onChange={(e) => inboxState.setSort(e.target.value as any)} className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-xs font-bold outline-none border">
                  <option value="date_desc">🆕 Récent → Ancien</option>
                  <option value="urgency">🚨 Urgence (+48h)</option>
                  <option value="quote">Receipt/Devis</option>
                </select>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-10">
                {processedInbox.map(item => (
                  <div key={item.id} className={`p-4 rounded-2xl border flex justify-between items-center bg-white dark:bg-slate-800 transition-all ${checkIsOverdue(item) ? 'border-orange-300 bg-orange-50/50' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400">{item.source === 'email' ? <Mail size={18} /> : item.source === 'phone' ? <Phone size={18} /> : <Globe size={18} />}</div>
                      <div>
                        <h4 className="font-bold text-sm">{item.contactName} <span className="text-slate-400 font-medium">{item.companyName ? `(${item.companyName})` : ''}</span></h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Reçu le {new Date(item.requestDate).toLocaleDateString()}</p>
                        {checkIsOverdue(item) && <span className="text-[9px] font-black text-orange-500 flex items-center gap-1 mt-1"><AlertTriangle size={10} /> Relance (+48h)</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleValidateRequest(item)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase shadow hover:bg-emerald-600 transition-colors">Valider</button>
                      <button onClick={() => handleArchiveRequest(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><XCircle size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- AUTRES VUES --- */}
        {activeTab === 'contacts' && <div className="p-8 text-center text-slate-400 font-bold">Gestion des contacts synchronisée. Utilisez la vue "VIP" pour l'édition complète.</div>}
        {activeTab === 'archives' && <div className="p-8 text-center text-slate-400 font-bold">Historique archivé disponible via l'export Excel.</div>}

        {/* --- FORMULAIRE NOUVEAU LEAD --- */}
        {activeTab === 'new_lead' && (
          <div className="w-full max-w-2xl mx-auto overflow-y-auto no-scrollbar py-6">
            <div className={`p-8 rounded-[40px] border shadow-sm space-y-6 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <h3 className="text-2xl font-black uppercase tracking-tight">Qualifier une demande</h3>
              
              {/* ✅ AJOUT: BOUTONS SMS / WHATSAPP */}
              <div className="space-y-4">
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
    </div>
  );
};

export default SalesCRMView;