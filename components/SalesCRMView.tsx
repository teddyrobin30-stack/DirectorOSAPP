import React, { useMemo, useState } from 'react';
import {
  Briefcase, Plus, User, Phone, Mail, Calendar,
  CheckSquare, AlertTriangle, ArrowLeft, Filter,
  Clock, CheckCircle2, XCircle, Search, Inbox, Users, Globe,
  Archive, Download, ArrowDownUp, Check,
  LayoutList, CalendarDays, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import {
  Lead,
  UserSettings,
  UserProfile,
  LeadStatus,
  InboxItem,
  Client,
  InboxSource,
  Contact
} from '../types';

/* -------------------- TYPES -------------------- */
interface SalesCRMViewProps {
  userSettings: UserSettings;
  leads: Lead[];
  onUpdateLeads: (leads: Lead[]) => void;

  inbox?: InboxItem[];
  onUpdateInbox?: (items: InboxItem[]) => void;

  // Legacy / compat
  clients?: Client[];
  onUpdateClients?: (clients: Client[]) => void;

  // ✅ Preferred: contacts from ContactsView (application)
  contacts?: Contact[];
  onUpdateContacts?: (contacts: Contact[]) => void;

  users: UserProfile[];
  onNavigate: (tab: string) => void;
}

/* -------------------- SAFE UTILS -------------------- */
const safeLower = (str: any) => (typeof str === 'string' ? str.toLowerCase() : '');
const safeDate = (date: any) => {
  if (!date) return 0;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

// ✅ Stable unique id (avoids key collisions => DOM NotFoundError)
const uid = (prefix: string) => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      // @ts-ignore
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // no-op
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// ✅ keep "YYYY-MM-DD" for <input type="date"> (avoid timezone surprises)
const toDateInputValue = (v?: string) => {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const toISODateFromInput = (v: string) => {
  if (!v) return '';
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

/* -------------------- ROOMS + MESSAGING (SMS / WhatsApp) -------------------- */
type Rooms = { single: number; twin: number; double: number; family: number };
const defaultRooms = (): Rooms => ({ single: 0, twin: 0, double: 0, family: 0 });

const normalizePhone = (phone: string) => (phone || '').replace(/[^\d+]/g, '');

// France: convert "06xxxxxxxx" / "07xxxxxxxx" / "01..." etc. => +33xxxxxxxxx
// Also accepts "33xxxxxxxxx" or "+33xxxxxxxxx"
const toE164FR = (raw: string) => {
  const p = normalizePhone(raw);
  if (!p) return '';

  if (p.startsWith('+33')) return p;
  if (/^33\d{9}$/.test(p)) return `+${p}`;
  if (/^0\d{9}$/.test(p)) return `+33${p.slice(1)}`;
  if (p.startsWith('+') && p.length >= 8) return p;
  if (/^\d{8,15}$/.test(p)) return `+${p}`;
  return '';
};

// WhatsApp expects digits only, no "+"
const toWhatsAppNumber = (raw: string) => {
  const e164 = toE164FR(raw);
  return e164 ? e164.replace('+', '') : '';
};

const buildMessage = (data: {
  groupName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
  pax?: number;
  note?: string;
  rooms?: Rooms;
  sourceLabel?: string;
  vip?: any | null;
}) => {
  const rooms = data.rooms || defaultRooms();

  const dates =
    data.startDate
      ? `📅 Dates: ${new Date(data.startDate).toLocaleDateString('fr-FR')}${data.endDate ? ` → ${new Date(data.endDate).toLocaleDateString('fr-FR')}` : ''}`
      : '📅 Dates: à définir';

  const pax = typeof data.pax === 'number' ? `👥 PAX: ${data.pax}` : '';
  const roomsLine = `🛏️ Chambres: Single ${rooms.single} | Twin ${rooms.twin} | Double ${rooms.double} | Fam ${rooms.family}`;

  const c = data.vip;
  const name = c?.name || data.contactName || '-';
  const company = (c?.companyName || c?.company) ? ` (${c.companyName || c.company})` : '';
  const phone = toE164FR(c?.phone || data.phone || '');
  const email = c?.email || data.email || '';

  const source = data.sourceLabel ? `🧾 Source: ${data.sourceLabel}` : '';
  const note = (data.note || '').trim();
  const noteLine = note ? `📝 Notes:\n${note}` : '📝 Notes: -';

  return [
    '✅ Demande Groupe',
    `👤 Contact: ${name}${company}`,
    phone ? `📞 ${phone}` : '',
    email ? `✉️ ${email}` : '',
    data.groupName ? `🏷️ Groupe: ${data.groupName}` : '',
    dates,
    pax,
    roomsLine,
    source,
    '',
    noteLine,
  ].filter(Boolean).join('\n');
};

const openSMS = (rawPhone: string, message: string) => {
  const e164 = toE164FR(rawPhone);
  if (!e164) return;
  window.location.href = `sms:${encodeURIComponent(e164)}?body=${encodeURIComponent(message)}`;
};

const openWhatsApp = (rawPhone: string, message: string) => {
  const wa = toWhatsAppNumber(rawPhone);
  if (!wa) return;
  window.open(`https://wa.me/${encodeURIComponent(wa)}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
};

const RoomsInputs: React.FC<{
  value: Rooms;
  onChange: (next: Rooms) => void;
  compact?: boolean;
}> = ({ value, onChange, compact }) => {
  const inputClass = compact
    ? 'w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold outline-none'
    : 'w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm';

  const labelClass = compact
    ? 'text-[9px] font-bold text-slate-400 uppercase ml-1'
    : 'text-[10px] font-black uppercase text-slate-400 ml-1';

  const set = (k: keyof Rooms, v: number) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Chambres</label>
      <div className="grid grid-cols-2 gap-2">
        {([
          { key: 'single', label: 'Single' },
          { key: 'twin', label: 'Twin' },
          { key: 'double', label: 'Double' },
          { key: 'family', label: 'Familiale' },
        ] as const).map(r => (
          <div key={r.key}>
            <label className={labelClass}>{r.label}</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={value[r.key] ?? 0}
              onChange={(e) => {
                const n = Math.max(0, parseInt(e.target.value || '0', 10) || 0);
                set(r.key, n);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

/* -------------------- COMPONENT -------------------- */
const SalesCRMView: React.FC<SalesCRMViewProps> = (props) => {
  const {
    userSettings,
    leads,
    onUpdateLeads,
    inbox = [],
    onUpdateInbox,
    clients = [],
    onUpdateClients,
    contacts,
    onUpdateContacts,
    users,
    onNavigate
  } = props;

  /* -------------------- CONTACTS (APPLICATION FIRST) -------------------- */
  // ✅ Use ContactsView data if provided, else fallback to legacy clients for compat.
  const appContacts: any[] = useMemo(() => {
    if (Array.isArray(contacts)) return contacts as any[];
    return Array.isArray(clients) ? (clients as any[]) : [];
  }, [contacts, clients]);

  const updateAppContacts = (next: any[]) => {
    // Prefer application contacts updater
    if (typeof onUpdateContacts === 'function') {
      onUpdateContacts(next as any);
      return;
    }
    // Fallback legacy
    if (typeof onUpdateClients === 'function') {
      onUpdateClients(next as any);
    }
  };

  // Normalization getters (Contact vs Client)
  const getContactId = (c: any) => String(c?.id ?? '');
  const getContactName = (c: any) => String(c?.name ?? '');
  const getContactCompany = (c: any) => String(c?.companyName ?? c?.company ?? '');
  const getContactRole = (c: any) => String(c?.role ?? '');
  const getContactEmail = (c: any) => String(c?.email ?? '');
  const getContactPhone = (c: any) => String(c?.phone ?? '');
  const isVip = (c: any) => Boolean(c?.vip);

  // ✅ Candidates for pickers: VIP first, then alpha
  const vipCandidates = useMemo(() => {
    const arr = [...(appContacts || [])];
    arr.sort((a, b) => {
      const va = isVip(a) ? 1 : 0;
      const vb = isVip(b) ? 1 : 0;
      if (vb !== va) return vb - va;
      return getContactName(a).localeCompare(getContactName(b), 'fr', { sensitivity: 'base' });
    });
    return arr;
  }, [appContacts]);

  /* -------------------- UI STATE -------------------- */
  const [activeTab, setActiveTab] = useState<'pipeline' | 'inbox' | 'contacts' | 'new_lead' | 'archives'>('pipeline');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string>(''); // unified
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // PIPELINE
  const [pipelineViewMode, setPipelineViewMode] = useState<'list' | 'calendar'>('list');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [pipelineSort, setPipelineSort] = useState<'event_asc' | 'urgency' | 'created_desc' | 'alpha'>('event_asc');
  const [pipelineFilter, setPipelineFilter] = useState<string>('ALL');

  // ✅ calendar date (do NOT mutate Date instance)
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // INBOX (✅ full tri system)
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxSort, setInboxSort] = useState<
    'date_desc' | 'date_asc' | 'urgency' | 'event_date' | 'alpha' | 'source' | 'company' | 'quote'
  >('date_desc');
  const [inboxFilter, setInboxFilter] = useState<'ALL' | 'URGENT' | 'EMAIL' | 'PHONE' | 'WEB' | 'THIS_MONTH'>('ALL');

  // Contact select states (kept naming to avoid breaking anything)
  const [selectedVipId, setSelectedVipId] = useState<string>('');
  const [selectedInboxVipId, setSelectedInboxVipId] = useState<string>('');

  const selectedVip = useMemo(() => {
    if (!selectedVipId) return null;
    return (appContacts || []).find(c => getContactId(c) === String(selectedVipId)) || null;
  }, [selectedVipId, appContacts]);

  const selectedInboxVip = useMemo(() => {
    if (!selectedInboxVipId) return null;
    return (appContacts || []).find(c => getContactId(c) === String(selectedInboxVipId)) || null;
  }, [selectedInboxVipId, appContacts]);

  const selectedContact = useMemo(() => {
    if (!selectedContactId) return null;
    return (appContacts || []).find(c => getContactId(c) === String(selectedContactId)) || null;
  }, [selectedContactId, appContacts]);

  // NEW LEAD FORM (+ rooms)
  const [form, setForm] = useState<(Partial<Lead> & { rooms: Rooms })>({
    groupName: '',
    contactName: '',
    email: '',
    phone: '',
    pax: 0,
    note: '',
    startDate: '',
    endDate: '',
    rooms: defaultRooms(),
  });

  // INBOX FORM (+ rooms)
  const [inboxForm, setInboxForm] = useState<{
    contactName: string;
    companyName: string;
    email: string;
    phone: string;
    source: InboxSource;
    eventStartDate: string;
    eventEndDate: string;
    note: string;
    rooms: Rooms;
  }>({
    contactName: '',
    companyName: '',
    email: '',
    phone: '',
    source: 'email',
    eventStartDate: '',
    eventEndDate: '',
    note: '',
    rooms: defaultRooms(),
  });

  // CONTACTS
  const [contactSearch, setContactSearch] = useState('');

  /* -------------------- CONTACT ACTIONS (SAFE) -------------------- */
  const handleDeleteClient = (id: string) => {
    const targetId = String(id);
    if (!window.confirm('Supprimer ce contact définitivement ?')) return;

    const next = (appContacts || []).filter(c => getContactId(c) !== targetId);
    updateAppContacts(next);

    if (selectedContactId === targetId) setSelectedContactId('');
  };

  const filteredContacts = useMemo(() => {
    const list = appContacts || [];
    if (!contactSearch) return list;
    const lower = safeLower(contactSearch);
    return list.filter(c =>
      safeLower(getContactName(c)).includes(lower) ||
      safeLower(getContactCompany(c)).includes(lower) ||
      safeLower(getContactRole(c)).includes(lower) ||
      safeLower(getContactEmail(c)).includes(lower)
    );
  }, [appContacts, contactSearch]);

  const handleExportContacts = () => {
    const headers = 'Nom,Entreprise,Rôle,Email,Téléphone,VIP\n';
    const rows = filteredContacts.map(c =>
      `"${getContactName(c)}","${getContactCompany(c)}","${getContactRole(c)}","${getContactEmail(c)}","${getContactPhone(c)}","${isVip(c) ? 'Oui' : 'Non'}"`
    ).join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `contacts_crm_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* -------------------- INBOX LOGIC -------------------- */
  const handleSaveInbox = () => {
    if (!inboxForm.contactName || !onUpdateInbox) return;

    const newItem: (InboxItem & { type_doc?: 'inbox'; rooms?: Rooms }) = {
      id: uid('inbox'),
      type_doc: 'inbox',

      contactName: inboxForm.contactName,
      companyName: inboxForm.companyName,
      email: inboxForm.email,
      phone: toE164FR(inboxForm.phone) || inboxForm.phone,
      requestDate: new Date().toISOString(),
      source: inboxForm.source,
      status: 'to_process',
      eventStartDate: inboxForm.eventStartDate,
      eventEndDate: inboxForm.eventEndDate,
      note: inboxForm.note,
      quoteSent: false,

      rooms: inboxForm.rooms,
    };

    onUpdateInbox([newItem, ...inbox]);

    // ✅ Update/Create contact in APPLICATION contacts (safe + best effort)
    const canUpdate = typeof onUpdateContacts === 'function' || typeof onUpdateClients === 'function';
    if (canUpdate) {
      const emailLower = safeLower(inboxForm.email);
      const nameLower = safeLower(inboxForm.contactName);

      const existing = (appContacts || []).find(c =>
        (!!emailLower && safeLower(getContactEmail(c)) === emailLower) ||
        (!!nameLower && safeLower(getContactName(c)) === nameLower)
      );

      const nextPhone = toE164FR(inboxForm.phone) || inboxForm.phone;

      if (existing) {
        // Only enrich missing fields (do not overwrite user-entered data)
        const updated = {
          ...existing,
          email: getContactEmail(existing) || inboxForm.email,
          phone: getContactPhone(existing) || nextPhone,
        };
        const next = (appContacts || []).map(c => getContactId(c) === getContactId(existing) ? updated : c);
        updateAppContacts(next);
      } else {
        // Create minimal safe contact compatible with both models
        const newContact: any = {
          id: uid('ct'),
          name: inboxForm.contactName,
          company: inboxForm.companyName || '',
          companyName: inboxForm.companyName || '',
          role: '',
          email: inboxForm.email || '',
          phone: nextPhone || '',
          vip: false,
          status: 'In House',
        };
        updateAppContacts([newContact, ...(appContacts || [])]);
      }
    }

    setInboxForm({
      contactName: '',
      companyName: '',
      email: '',
      phone: '',
      source: 'email',
      eventStartDate: '',
      eventEndDate: '',
      note: '',
      rooms: defaultRooms(),
    });
    setSelectedInboxVipId('');
  };

  const handleValidateRequest = (item: InboxItem) => {
    const rooms = (item as any).rooms as Rooms | undefined;

    setForm({
      groupName: item.companyName ? `Groupe ${item.companyName}` : `Event ${item.contactName}`,
      contactName: item.contactName,
      email: item.email,
      phone: toE164FR(item.phone) || item.phone,
      startDate: item.eventStartDate || '',
      endDate: item.eventEndDate || '',
      note: `${item.note ? item.note + '\n\n' : ''}Source: ${String(item.source).toUpperCase()}. Demande du ${new Date(item.requestDate).toLocaleDateString()}`,
      rooms: rooms || defaultRooms(),
      pax: (form.pax ?? 0) as any,
    } as any);

    if (onUpdateInbox) {
      onUpdateInbox(inbox.map(i => i.id === item.id ? { ...i, type_doc: 'inbox' as const, status: 'processed' as const } : i));
    }

    setActiveTab('new_lead');
  };

  const handleArchiveRequest = (id: string) => {
    if (!onUpdateInbox) return;

    onUpdateInbox(inbox.map(i => i.id === id ? { ...i, type_doc: 'inbox' as const, status: 'archived' as const } : i));

    setToastMessage('Demande archivée avec succès');
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateLastFollowUp = (id: string, dateISO: string) => {
    if (!dateISO || !onUpdateInbox) return;
    onUpdateInbox(inbox.map(i => i.id === id ? { ...i, type_doc: 'inbox' as const, lastFollowUp: dateISO } : i));
  };

  const handleToggleQuoteSent = (id: string) => {
    if (!onUpdateInbox) return;
    onUpdateInbox(inbox.map(i => i.id === id ? { ...i, type_doc: 'inbox' as const, quoteSent: !i.quoteSent } : i));
  };

  const checkIsOverdue = (item: InboxItem) => {
    if (item.status !== 'to_process') return false;
    const now = new Date();
    const ref = item.lastFollowUp ? new Date(item.lastFollowUp) : new Date(item.requestDate);
    if (Number.isNaN(ref.getTime())) return false;
    return (now.getTime() - ref.getTime()) > 48 * 3600 * 1000;
  };

  // ✅ FULL SORTING + FILTERING (SAFE)
  const processedInbox = useMemo(() => {
    let items = [...(inbox || [])].filter(i => i.status === 'to_process');

    // Search
    if (inboxSearch) {
      const lower = safeLower(inboxSearch);
      items = items.filter(i =>
        safeLower(i.contactName).includes(lower) ||
        safeLower(i.companyName).includes(lower) ||
        safeLower(i.email).includes(lower) ||
        safeLower(i.phone).includes(lower)
      );
    }

    // Filters
    if (inboxFilter !== 'ALL') {
      try {
        if (inboxFilter === 'URGENT') {
          items = items.filter(checkIsOverdue);
        } else if (inboxFilter === 'THIS_MONTH') {
          const now = new Date();
          items = items.filter(i => {
            if (!i.eventStartDate) return false;
            const d = new Date(i.eventStartDate);
            return !Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
        } else {
          // EMAIL / PHONE / WEB
          items = items.filter(i => {
            const src = safeLower(i.source);
            if (inboxFilter === 'EMAIL') return src === 'email';
            if (inboxFilter === 'PHONE') return src === 'phone';
            if (inboxFilter === 'WEB') return src === 'website';
            return true;
          });
        }
      } catch {
        // no-op
      }
    }

    // Sorting
    items.sort((a, b) => {
      try {
        switch (inboxSort) {
          case 'date_asc': return safeDate(a.requestDate) - safeDate(b.requestDate);
          case 'date_desc': return safeDate(b.requestDate) - safeDate(a.requestDate);

          case 'alpha': return safeLower(a.contactName).localeCompare(safeLower(b.contactName), 'fr', { sensitivity: 'base' });

          case 'company': return safeLower(a.companyName).localeCompare(safeLower(b.companyName), 'fr', { sensitivity: 'base' });

          case 'source': return safeLower(String(a.source)).localeCompare(safeLower(String(b.source)), 'fr', { sensitivity: 'base' });

          case 'quote': {
            // quoteSent false first (needs action), then by date desc
            const qa = a.quoteSent ? 1 : 0;
            const qb = b.quoteSent ? 1 : 0;
            if (qa !== qb) return qa - qb;
            return safeDate(b.requestDate) - safeDate(a.requestDate);
          }

          case 'event_date': {
            const da = safeDate(a.eventStartDate);
            const db = safeDate(b.eventStartDate);
            if (!da) return 1;
            if (!db) return -1;
            return da - db;
          }

          case 'urgency': {
            const ua = checkIsOverdue(a) ? 1 : 0;
            const ub = checkIsOverdue(b) ? 1 : 0;
            if (ub !== ua) return ub - ua;
            // tie-break: oldest first
            return safeDate(a.requestDate) - safeDate(b.requestDate);
          }

          default: return 0;
        }
      } catch {
        return 0;
      }
    });

    return items;
  }, [inbox, inboxSearch, inboxFilter, inboxSort]);

  /* -------------------- LEADS LOGIC -------------------- */
  const handleCreateLead = () => {
    if (!form.groupName || !form.contactName) return;

    const newLead: (Lead & { rooms?: Rooms }) = {
      id: uid('lead'),
      groupName: form.groupName,
      contactName: form.contactName,
      email: form.email || '',
      phone: toE164FR(form.phone || '') || (form.phone || ''),
      requestDate: new Date().toISOString(),
      startDate: form.startDate || '',
      endDate: form.endDate || '',
      pax: form.pax || 0,
      note: form.note || '',
      status: 'nouveau',
      checklist: { roomSetup: false, menu: false, roomingList: false },
      ownerId: '',
      rooms: form.rooms || defaultRooms(),
    };

    onUpdateLeads([newLead, ...leads]);

    setForm({
      groupName: '',
      contactName: '',
      email: '',
      phone: '',
      pax: 0,
      note: '',
      startDate: '',
      endDate: '',
      rooms: defaultRooms(),
    });
    setSelectedVipId('');
    setActiveTab('pipeline');
  };

  const handleUpdateLead = (lead: Lead) => {
    onUpdateLeads(leads.map(l => l.id === lead.id ? lead : l));
    setSelectedLead(lead);
  };

  const handleDeleteLead = (id: string) => {
    if (!window.confirm('Supprimer ce lead ?')) return;
    onUpdateLeads(leads.filter(l => l.id !== id));
    setSelectedLead(null);
  };

  const canValidate = (lead: Lead) =>
    lead.checklist.roomSetup && lead.checklist.menu && lead.checklist.roomingList;

  const checkAlerts = (lead: Lead) => {
    try {
      const now = new Date();
      const reqDate = lead.requestDate ? new Date(lead.requestDate) : new Date();
      const evtDate = lead.startDate ? new Date(lead.startDate) : (lead.eventDate ? new Date(lead.eventDate) : null);

      const alerts: { type: string; label: string; color: string }[] = [];

      const diffDays = Math.ceil((now.getTime() - reqDate.getTime()) / (1000 * 3600 * 24));
      if ((lead.status === 'nouveau' || lead.status === 'en_cours') && diffDays > 7) {
        alerts.push({ type: 'followup', label: 'Relance', color: 'text-amber-500 bg-amber-50' });
      }

      if (evtDate && lead.status !== 'perdu' && !Number.isNaN(evtDate.getTime())) {
        const diffEvt = Math.ceil((evtDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffEvt > 0 && diffEvt < 30) {
          alerts.push({ type: 'urgent', label: `J-${diffEvt}`, color: 'text-red-500 bg-red-50' });
        }
      }

      return alerts;
    } catch {
      return [];
    }
  };

  const processedLeads = useMemo(() => {
    let items = [...(leads || [])];

    if (pipelineSearch) {
      const lower = safeLower(pipelineSearch);
      items = items.filter(l =>
        safeLower(l.groupName).includes(lower) ||
        safeLower(l.contactName).includes(lower) ||
        safeLower(l.email).includes(lower)
      );
    }

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
            if (Number.isNaN(evtDate.getTime())) return false;
            const diff = (evtDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
            return diff > 0 && diff < 30;
          });
        } else if (pipelineFilter === 'LATE_FOLLOWUP') {
          const now = new Date();
          items = items.filter(l => {
            if (l.status === 'valide' || l.status === 'perdu') return false;
            if (!l.requestDate) return false;
            const reqDate = new Date(l.requestDate);
            if (Number.isNaN(reqDate.getTime())) return false;
            const diff = (now.getTime() - reqDate.getTime()) / (1000 * 3600 * 24);
            return diff > 7;
          });
        } else if (pipelineFilter === 'THIS_MONTH') {
          const now = new Date();
          items = items.filter(l => {
            const dateStr = l.startDate || l.eventDate;
            if (!dateStr) return false;
            const d = new Date(dateStr);
            if (Number.isNaN(d.getTime())) return false;
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
        }
      } catch {
        // no-op
      }
    }

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
            return safeLower(a.groupName).localeCompare(safeLower(b.groupName), 'fr', { sensitivity: 'base' });
          case 'urgency':
            return checkAlerts(b).length - checkAlerts(a).length;
          default:
            return 0;
        }
      } catch {
        return 0;
      }
    });

    return items;
  }, [leads, pipelineSearch, pipelineFilter, pipelineSort]);

  /* -------------------- CALENDAR -------------------- */
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
      if (Number.isNaN(start.getTime())) return false;
      start.setHours(0, 0, 0, 0);

      let end = new Date(start);
      if (l.endDate) {
        const d = new Date(l.endDate);
        if (!Number.isNaN(d.getTime())) {
          end = d;
          end.setHours(0, 0, 0, 0);
        }
      }

      const check = new Date(date);
      check.setHours(0, 0, 0, 0);
      return check >= start && check <= end;
    });
  };

  /* -------------------- ARCHIVES / HISTORY -------------------- */
  const sortedArchives = useMemo(() => {
    return (inbox || [])
      .filter(i => i.status !== 'to_process')
      .sort((a, b) => safeDate(b.requestDate) - safeDate(a.requestDate));
  }, [inbox]);

  const handleExportCSV = () => {
    const archiveList = (inbox || []).filter(i => i.status !== 'to_process');
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
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `archives_crm_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clientHistory = useMemo(() => {
    if (!selectedContact) return [];
    const email = getContactEmail(selectedContact);
    const name = getContactName(selectedContact);
    return (leads || [])
      .filter(l => (email && l.email === email) || l.contactName === name)
      .sort((a, b) => safeDate(b.requestDate) - safeDate(a.requestDate));
  }, [selectedContact, leads]);

  /* -------------------- RENDER -------------------- */
  return (
    <div className={`h-full flex flex-col overflow-hidden animate-in fade-in relative ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>

      {toastMessage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-emerald-500 rounded-full p-1"><CheckCircle2 size={12} className="text-white" /></div>
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
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={14} /> Retour
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 py-4">
        <div className="flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-800 w-fit overflow-x-auto whitespace-nowrap max-w-full no-scrollbar px-2">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'pipeline' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
          >
            <Filter size={14} /> Pipeline
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
          >
            <Inbox size={14} /> Demandes (Inbox)
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'contacts' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
          >
            <Users size={14} /> Contacts
          </button>
          <button
            onClick={() => setActiveTab('archives')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'archives' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
          >
            <Archive size={14} /> Archives
          </button>
          <button
            onClick={() => setActiveTab('new_lead')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'new_lead' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
          >
            <Plus size={14} /> Nouveau Lead
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4 md:px-6 md:pb-20 flex flex-col md:flex-row gap-4 md:gap-6">

        {/* PIPELINE */}
        {activeTab === 'pipeline' && (
          <>
            <div className={`w-full md:w-1/3 flex flex-col rounded-[32px] border overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'} ${pipelineViewMode === 'calendar' ? 'md:w-2/3' : ''}`}>
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-transparent focus-within:border-indigo-500 transition-colors">
                    <Search size={16} className="text-slate-400 mr-2" />
                    <input
                      type="text"
                      placeholder="🔍 Chercher un groupe..."
                      value={pipelineSearch}
                      onChange={(e) => setPipelineSearch(e.target.value)}
                      className="bg-transparent outline-none w-full text-xs font-bold"
                    />
                  </div>

                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                    <button
                      onClick={() => setPipelineViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${pipelineViewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400'}`}
                      title="Vue Liste"
                    >
                      <LayoutList size={16} />
                    </button>
                    <button
                      onClick={() => setPipelineViewMode('calendar')}
                      className={`p-2 rounded-lg transition-all ${pipelineViewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400'}`}
                      title="Vue Calendrier"
                    >
                      <CalendarDays size={16} />
                    </button>
                  </div>
                </div>

                {pipelineViewMode === 'list' && (
                  <div className="relative">
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-transparent">
                      <ArrowDownUp size={14} className="text-slate-400 mr-2" />
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

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button onClick={() => setPipelineFilter('ALL')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${pipelineFilter === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Tous</button>
                  <button onClick={() => setPipelineFilter('URGENT_ARRIVAL')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${pipelineFilter === 'URGENT_ARRIVAL' ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-500'}`}>🚨 J-30</button>
                  <button onClick={() => setPipelineFilter('LATE_FOLLOWUP')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${pipelineFilter === 'LATE_FOLLOWUP' ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-500'}`}>⚠️ Relance</button>
                  <button onClick={() => setPipelineFilter('THIS_MONTH')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${pipelineFilter === 'THIS_MONTH' ? 'bg-violet-500 text-white border-violet-500' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>📅 Ce Mois</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
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

                          <p className="text-[9px] font-bold text-indigo-400 mt-1 flex items-center gap-1">
                            <Calendar size={10} />
                            {lead.startDate ? (
                              <span className="font-black">
                                {new Date(lead.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })}
                                {lead.endDate ? ` au ${new Date(lead.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })}` : ''}
                              </span>
                            ) : (
                              <span>{lead.eventDate ? new Date(lead.eventDate).toLocaleDateString() : 'Dates à définir'}</span>
                            )}
                          </p>

                          {alerts.length > 0 && (
                            <div className="flex gap-1 mt-3">
                              {alerts.map((alert, idx) => (
                                <div key={`${lead.id}-alert-${idx}`} className={`flex items-center gap-1 px-2 py-1 rounded text-[8px] font-black uppercase ${alert.color}`}>
                                  <AlertTriangle size={10} /> {alert.label}
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
                  <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-b-[24px]">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <span className="text-sm font-black uppercase">
                        {calendarDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </span>

                      <button
                        onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 text-center py-2">
                      {['L', 'Ma', 'Me', 'J', 'V', 'S', 'D'].map(d => <div key={`dow-${d}`}>{d}</div>)}
                    </div>

                    <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                      {calendarData.map((date, i) => {
                        const year = calendarDate.getFullYear();
                        const month = calendarDate.getMonth();

                        if (!date) {
                          return (
                            <div
                              key={`pad-${year}-${month}-${i}`}
                              className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-r border-slate-100 dark:border-slate-800"
                            />
                          );
                        }

                        const daysLeads = getLeadsForDate(date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const cellKey = `day-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

                        return (
                          <div
                            key={cellKey}
                            className={`min-h-[80px] p-1 border-b border-r border-slate-100 dark:border-slate-800 relative ${isToday ? 'bg-indigo-50/30' : ''}`}
                          >
                            <span className={`text-[10px] font-bold block mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                              {date.getDate()}
                            </span>

                            <div className="space-y-1">
                              {daysLeads.map(l => (
                                <div
                                  key={l.id}
                                  onClick={() => { setSelectedLead(l); setPipelineViewMode('list'); }}
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

            {/* Detail */}
            <div className={`flex-1 rounded-[32px] border overflow-hidden flex flex-col ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
              {selectedLead ? (
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        Dossier #{String(selectedLead.id).split('-')[1] || selectedLead.id}
                      </span>
                      <h2 className="text-3xl font-black mt-1">{selectedLead.groupName}</h2>

                      <div className="grid grid-cols-2 gap-4 mt-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Arrivée</label>
                          <input
                            type="date"
                            className="w-full bg-transparent font-bold text-xs outline-none text-slate-700 dark:text-slate-200"
                            value={toDateInputValue(selectedLead.startDate || selectedLead.eventDate)}
                            onChange={(e) => handleUpdateLead({ ...selectedLead, startDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Départ</label>
                          <input
                            type="date"
                            className="w-full bg-transparent font-bold text-xs outline-none text-slate-700 dark:text-slate-200"
                            value={toDateInputValue(selectedLead.endDate)}
                            onChange={(e) => handleUpdateLead({ ...selectedLead, endDate: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <User size={14} /> {selectedLead.contactName}
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

                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
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

                    <div className="p-6 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-900/10">
                      <h4 className="text-sm font-black uppercase text-indigo-900 dark:text-indigo-200 mb-4 flex items-center gap-2">
                        <CheckSquare size={16} /> Checklist Validation
                      </h4>

                      <div className="space-y-3">
                        {[
                          { key: 'roomSetup', label: 'Disposition de salle validée' },
                          { key: 'menu', label: 'Menu F&B validé' },
                          { key: 'roomingList', label: 'Rooming List reçue' },
                        ].map(item => (
                          <label key={`chk-${item.key}`} className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedLead.checklist[item.key as keyof typeof selectedLead.checklist] ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white dark:bg-slate-800'
                            }`}>
                              {selectedLead.checklist[item.key as keyof typeof selectedLead.checklist] && <CheckCircle2 size={14} className="text-white" />}
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

                            <span className={`text-sm font-bold ${
                              selectedLead.checklist[item.key as keyof typeof selectedLead.checklist] ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-500'
                            }`}>
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>

                      {!canValidate(selectedLead) && selectedLead.status !== 'perdu' && (
                        <p className="text-[10px] text-amber-600 font-bold mt-4 flex items-center gap-1">
                          <AlertTriangle size={12} /> Complétez la checklist pour passer en statut "Validé".
                        </p>
                      )}
                    </div>

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
                      <button
                        onClick={() => handleDeleteLead(selectedLead.id)}
                        className="text-red-400 hover:text-red-600 text-xs font-bold uppercase flex items-center gap-2"
                      >
                        <XCircle size={14} /> Supprimer le lead
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                  <Briefcase size={64} className="mb-4 text-slate-400" />
                  <p className="text-xl font-black text-slate-500">Sélectionnez un dossier</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* INBOX */}
        {activeTab === 'inbox' && (
          <div className="flex flex-col md:flex-row h-full gap-4 md:gap-6 w-full">
            <div className={`w-full md:w-1/3 flex flex-col rounded-[32px] border overflow-hidden p-6 space-y-4 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
              <h3 className="text-lg font-black uppercase tracking-tight">Saisie Rapide</h3>

              <div className="space-y-3">
                {/* Contact picker (application contacts) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact (Application)</label>
                  <select
                    value={selectedInboxVipId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedInboxVipId(id);
                      const c = (appContacts || []).find(x => getContactId(x) === String(id));
                      if (c) {
                        setInboxForm(prev => ({
                          ...prev,
                          contactName: prev.contactName || getContactName(c),
                          companyName: prev.companyName || getContactCompany(c),
                          email: prev.email || getContactEmail(c),
                          phone: prev.phone || getContactPhone(c),
                        }));
                      }
                    }}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="">— Sélectionner —</option>
                    {vipCandidates.map(c => (
                      <option key={getContactId(c)} value={getContactId(c)}>
                        {getContactName(c)}{getContactCompany(c) ? ` • ${getContactCompany(c)}` : ''}{getContactPhone(c) ? ` • ${getContactPhone(c)}` : ''}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const phone = getContactPhone(selectedInboxVip) || inboxForm.phone;
                        const msg = buildMessage({
                          groupName: inboxForm.companyName ? `Groupe ${inboxForm.companyName}` : `Event ${inboxForm.contactName}`,
                          contactName: inboxForm.contactName,
                          email: inboxForm.email,
                          phone: inboxForm.phone,
                          startDate: inboxForm.eventStartDate,
                          endDate: inboxForm.eventEndDate,
                          rooms: inboxForm.rooms,
                          note: inboxForm.note,
                          sourceLabel: `Inbox (${String(inboxForm.source).toUpperCase()})`,
                          vip: selectedInboxVip,
                        });
                        openSMS(phone, msg);
                      }}
                      className="flex-1 py-2 rounded-lg border text-[10px] font-black uppercase"
                    >
                      SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const phone = getContactPhone(selectedInboxVip) || inboxForm.phone;
                        const msg = buildMessage({
                          groupName: inboxForm.companyName ? `Groupe ${inboxForm.companyName}` : `Event ${inboxForm.contactName}`,
                          contactName: inboxForm.contactName,
                          email: inboxForm.email,
                          phone: inboxForm.phone,
                          startDate: inboxForm.eventStartDate,
                          endDate: inboxForm.eventEndDate,
                          rooms: inboxForm.rooms,
                          note: inboxForm.note,
                          sourceLabel: `Inbox (${String(inboxForm.source).toUpperCase()})`,
                          vip: selectedInboxVip,
                        });
                        openWhatsApp(phone, msg);
                      }}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase"
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Nom Contact *"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold outline-none"
                  value={inboxForm.contactName}
                  onChange={(e) => setInboxForm({ ...inboxForm, contactName: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Entreprise"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold outline-none"
                  value={inboxForm.companyName}
                  onChange={(e) => setInboxForm({ ...inboxForm, companyName: e.target.value })}
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold outline-none"
                  value={inboxForm.email}
                  onChange={(e) => setInboxForm({ ...inboxForm, email: e.target.value })}
                />
                <input
                  type="tel"
                  placeholder="Téléphone"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold outline-none"
                  value={inboxForm.phone}
                  onChange={(e) => setInboxForm({ ...inboxForm, phone: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Du...</label>
                    <input
                      type="date"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold outline-none uppercase"
                      value={toDateInputValue(inboxForm.eventStartDate)}
                      onChange={(e) => setInboxForm({ ...inboxForm, eventStartDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Au...</label>
                    <input
                      type="date"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold outline-none uppercase"
                      value={toDateInputValue(inboxForm.eventEndDate)}
                      onChange={(e) => setInboxForm({ ...inboxForm, eventEndDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Rooms in Inbox */}
                <RoomsInputs
                  compact
                  value={inboxForm.rooms}
                  onChange={(next) => setInboxForm(prev => ({ ...prev, rooms: next }))}
                />

                <textarea
                  placeholder="Note / Commentaires (ex: Besoin particulier, occasion...)"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-medium outline-none resize-none h-20"
                  value={inboxForm.note}
                  onChange={(e) => setInboxForm({ ...inboxForm, note: e.target.value })}
                />

                <div className="flex gap-2">
                  {(['email', 'phone', 'website'] as InboxSource[]).map(s => (
                    <button
                      key={`src-${s}`}
                      onClick={() => setInboxForm({ ...inboxForm, source: s })}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border ${
                        inboxForm.source === s ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-slate-100 dark:border-slate-700 text-slate-400'
                      }`}
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

            {/* Right list */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* ✅ INBOX TOOLBAR: search + filter + sort */}
              <div className={`rounded-[24px] border p-4 mb-4 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                  <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-transparent focus-within:border-indigo-500 transition-colors">
                    <Search size={16} className="text-slate-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Rechercher (nom, entreprise, email, téléphone)..."
                      value={inboxSearch}
                      onChange={(e) => setInboxSearch(e.target.value)}
                      className="bg-transparent outline-none w-full text-xs font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-transparent">
                      <ArrowDownUp size={14} className="text-slate-400 mr-2" />
                      <select
                        value={inboxSort}
                        onChange={(e) => setInboxSort(e.target.value as any)}
                        className="bg-transparent outline-none text-xs font-bold appearance-none cursor-pointer"
                      >
                        <option value="date_desc">🆕 Récent → Ancien</option>
                        <option value="date_asc">📆 Ancien → Récent</option>
                        <option value="urgency">🚨 Urgence (+48h)</option>
                        <option value="event_date">📅 Date événement</option>
                        <option value="alpha">Abc Nom</option>
                        <option value="company">🏢 Entreprise</option>
                        <option value="source">🌐 Source</option>
                        <option value="quote">🧾 Devis (à envoyer)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-1">
                  <button onClick={() => setInboxFilter('ALL')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${inboxFilter === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Tous</button>
                  <button onClick={() => setInboxFilter('URGENT')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${inboxFilter === 'URGENT' ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-orange-500'}`}>🚨 Urgent</button>
                  <button onClick={() => setInboxFilter('THIS_MONTH')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${inboxFilter === 'THIS_MONTH' ? 'bg-violet-500 text-white border-violet-500' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>📅 Ce mois</button>
                  <button onClick={() => setInboxFilter('EMAIL')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${inboxFilter === 'EMAIL' ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Email</button>
                  <button onClick={() => setInboxFilter('PHONE')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${inboxFilter === 'PHONE' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Tél</button>
                  <button onClick={() => setInboxFilter('WEB')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border transition-all ${inboxFilter === 'WEB' ? 'bg-purple-500 text-white border-purple-500' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Web</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-10">
                {processedInbox.map(item => {
                  const isAlert = checkIsOverdue(item);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between md:items-center bg-white dark:bg-slate-800 ${
                        isAlert ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/10' : 'border-slate-100 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-4 mb-3 md:mb-0">
                        <div className={`p-3 rounded-xl ${
                          item.source === 'email' ? 'bg-blue-50 text-blue-600' :
                          item.source === 'phone' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-purple-50 text-purple-600'
                        }`}>
                          {item.source === 'email' ? <Mail size={18} /> : item.source === 'phone' ? <Phone size={18} /> : <Globe size={18} />}
                        </div>

                        <div>
                          <h4 className="font-bold text-sm">
                            {item.contactName}{' '}
                            {item.companyName && <span className="text-slate-400 font-medium">({item.companyName})</span>}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                            Recu le {new Date(item.requestDate).toLocaleDateString()} à {new Date(item.requestDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>

                          {item.eventStartDate && (
                            <div className="flex items-center gap-1 mt-1.5 text-indigo-600 dark:text-indigo-400">
                              <Calendar size={12} />
                              <span className="text-[10px] font-black uppercase">
                                {new Date(item.eventStartDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })}
                                {item.eventEndDate && ` au ${new Date(item.eventEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })}`}
                              </span>
                            </div>
                          )}

                          {isAlert && (
                            <span className="text-[9px] font-black text-orange-500 flex items-center gap-1 mt-1">
                              <AlertTriangle size={10} /> Relance nécessaire (+48h)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 md:gap-6 justify-between md:justify-end w-full md:w-auto">
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
                          <span className={`text-[10px] uppercase tracking-wide ${item.quoteSent ? 'font-black' : 'font-bold'}`}>
                            Devis envoyé
                          </span>
                        </button>

                        <div className="text-right">
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Dernière Relance</p>
                          <input
                            type="date"
                            value={toDateInputValue(item.lastFollowUp)}
                            onChange={(e) => {
                              const iso = toISODateFromInput(e.target.value);
                              if (iso) handleUpdateLastFollowUp(item.id, iso);
                            }}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleValidateRequest(item)}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase shadow hover:bg-emerald-600 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} /> Valider
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleArchiveRequest(item.id); }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            title="Sans suite (Archiver)"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {processedInbox.length === 0 && (
                  <div className="text-center py-20 text-slate-400 font-medium">
                    Aucune demande correspondant aux filtres.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ARCHIVES */}
        {activeTab === 'archives' && (
          <div className="w-full h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black">Historique des Demandes</h3>
                <p className="text-xs text-slate-400 font-bold">Demandes traitées et archivées</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-colors"
              >
                <Download size={16} /> Exporter Excel
              </button>
            </div>

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
                        <td className="p-4 font-bold text-slate-600 dark:text-slate-300">
                          {new Date(item.requestDate).toLocaleDateString()}
                        </td>
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
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                          Aucune archive disponible.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CONTACTS */}
        {activeTab === 'contacts' && (
          <div className="flex flex-col md:flex-row h-full gap-4 md:gap-6 w-full">
            <div className={`w-full md:w-1/3 flex flex-col rounded-[32px] border overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-transparent focus-within:border-indigo-500">
                  <Search size={16} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un contact..."
                    className="bg-transparent outline-none text-xs font-bold w-full"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleExportContacts}
                  className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Download size={14} /> Exporter CSV
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                {filteredContacts.map(c => (
                  <div
                    key={getContactId(c)}
                    onClick={() => setSelectedContactId(getContactId(c))}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      selectedContactId === getContactId(c) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm truncate pr-2">{getContactName(c)}</span>
                      {isVip(c) ? (
                        <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase font-black">VIP</span>
                      ) : (
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 uppercase">Contact</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{getContactEmail(c) || '-'}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide truncate mt-1">{getContactCompany(c) || '-'}</p>
                  </div>
                ))}

                {filteredContacts.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-xs font-medium">Aucun contact trouvé.</div>
                )}
              </div>
            </div>

            <div className={`flex-1 rounded-[32px] border overflow-hidden p-8 flex flex-col ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
              {selectedContact ? (
                <div className="flex-1 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fiche Contact</span>
                      <h2 className="text-3xl font-black mt-1">{getContactName(selectedContact)}</h2>
                      {getContactCompany(selectedContact) && <p className="text-sm font-bold text-slate-500">{getContactCompany(selectedContact)}</p>}
                      {getContactRole(selectedContact) && <p className="text-xs font-bold text-slate-400 mt-1">{getContactRole(selectedContact)}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-4">
                      <div className="text-right space-y-1">
                        <p className="text-sm font-bold">{getContactEmail(selectedContact) || '-'}</p>
                        <p className="text-sm font-bold">{getContactPhone(selectedContact) || '-'}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteClient(getContactId(selectedContact))}
                        className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-600 transition-colors bg-red-50 dark:bg-red-900/10 px-3 py-1.5 rounded-lg uppercase"
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <h4 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                      <Clock size={14} /> Historique des demandes
                    </h4>

                    <div className="space-y-3">
                      {clientHistory.map(history => (
                        <div key={history.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <div>
                            <p className="font-bold text-sm">{history.groupName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              {new Date(history.requestDate).toLocaleDateString()} • {history.pax} PAX
                            </p>
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
                      {clientHistory.length === 0 && (
                        <p className="text-xs text-slate-400 italic">Aucun historique disponible.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                  <Users size={64} className="mb-4 text-slate-400" />
                  <p className="text-xl font-black text-slate-500">Sélectionnez un contact</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NEW LEAD */}
        {activeTab === 'new_lead' && (
          <div className="w-full max-w-2xl mx-auto overflow-y-auto no-scrollbar py-6">
            <div className={`p-8 rounded-[32px] border shadow-sm space-y-6 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <h3 className="text-xl font-black uppercase tracking-tight">Nouvelle Demande Qualifiée</h3>

              <div className="space-y-4">
                {/* Contact picker (application contacts) + SMS/WhatsApp */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact (Application)</label>
                  <select
                    value={selectedVipId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedVipId(id);
                      const c = (appContacts || []).find(x => getContactId(x) === String(id));
                      if (c) {
                        setForm(prev => ({
                          ...prev,
                          contactName: prev.contactName || getContactName(c),
                          email: prev.email || getContactEmail(c),
                          phone: prev.phone || getContactPhone(c),
                        }));
                      }
                    }}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                  >
                    <option value="">— Sélectionner —</option>
                    {vipCandidates.map(c => (
                      <option key={getContactId(c)} value={getContactId(c)}>
                        {getContactName(c)}{getContactCompany(c) ? ` • ${getContactCompany(c)}` : ''}{getContactPhone(c) ? ` • ${getContactPhone(c)}` : ''}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const phone = getContactPhone(selectedVip) || form.phone || '';
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
                          sourceLabel: 'Nouveau lead',
                          vip: selectedVip,
                        });
                        openSMS(phone, msg);
                      }}
                      className="flex-1 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase"
                    >
                      SMS
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const phone = getContactPhone(selectedVip) || form.phone || '';
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
                          sourceLabel: 'Nouveau lead',
                          vip: selectedVip,
                        });
                        openWhatsApp(phone, msg);
                      }}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase"
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom du Groupe / Événement *</label>
                  <input
                    type="text"
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                    placeholder="Ex: Séminaire L'Oréal"
                    value={form.groupName || ''}
                    onChange={(e) => setForm({ ...form, groupName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact Principal *</label>
                    <input
                      type="text"
                      className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                      placeholder="Nom du contact"
                      value={form.contactName || ''}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">PAX Prévu</label>
                    <input
                      type="number"
                      className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                      value={form.pax ?? ''}
                      onChange={(e) => setForm({ ...form, pax: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
                    <input
                      type="email"
                      className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                      value={form.email || ''}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Téléphone</label>
                    <input
                      type="tel"
                      className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                      value={form.phone || ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date Arrivée</label>
                    <input
                      type="date"
                      className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                      value={toDateInputValue(form.startDate)}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date Départ</label>
                    <input
                      type="date"
                      className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                      value={toDateInputValue(form.endDate)}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Rooms in New Lead */}
                <RoomsInputs
                  value={form.rooms}
                  onChange={(next) => setForm(prev => ({ ...prev, rooms: next }))}
                />

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Note / Commentaire</label>
                  <textarea
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm resize-none h-32"
                    placeholder="Détails de la demande..."
                    value={form.note || ''}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
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
