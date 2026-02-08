import React, { useMemo, useState } from 'react';
import {
  Briefcase, Plus, User, Phone, Mail, Calendar,
  CheckSquare, AlertTriangle, ArrowLeft, Filter,
  Clock, CheckCircle2, XCircle, Search, Inbox, Users, Globe,
  Archive, Download, ArrowDownUp, Check,
  LayoutList, CalendarDays, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import type {
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

  // ✅ Clients "groupes / CRM"
  clients?: Client[];
  onUpdateClients?: (clients: Client[]) => void;

  // ✅ Contacts "application" (ContactsView)
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

const uid = (prefix: string) => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      // @ts-ignore
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {}
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// ✅ keep "YYYY-MM-DD" for <input type="date">
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
    contacts = [],
    onUpdateContacts,
    users,
    onNavigate
  } = props;

  /* -------------------- DATA SOURCES (SEPARATED) -------------------- */
  // ✅ Contacts = application (ContactsView)
  const appContacts = useMemo(() => (Array.isArray(contacts) ? contacts : []), [contacts]);

  // ✅ Clients = base "groupes / CRM"
  const groupClients = useMemo(() => (Array.isArray(clients) ? clients : []), [clients]);

  /* -------------------- NORMALIZERS -------------------- */
  // Contact (application)
  const getContactId = (c: Contact) => String(c?.id ?? '');
  const getContactName = (c: Contact) => String(c?.name ?? '');
  const getContactCompany = (c: Contact) => String(c?.company ?? c?.category ?? '');
  const getContactRole = (c: Contact) => String(c?.role ?? '');
  const getContactEmail = (c: Contact) => String(c?.email ?? '');
  const getContactPhone = (c: Contact) => String(c?.phone ?? '');
  const isVip = (c: Contact) => Boolean((c as any)?.vip);

  // Client (group DB)
  const getClientId = (c: Client) => String(c?.id ?? '');
  const getClientName = (c: Client) => String(c?.name ?? '');
  const getClientCompany = (c: Client) => String(c?.companyName ?? c?.name ?? '');
  const getClientEmail = (c: Client) => String(c?.email ?? '');
  const getClientPhone = (c: Client) => String(c?.phone ?? '');

  // ✅ VIP first, then alpha (contacts app)
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
  const [selectedContactId, setSelectedContactId] = useState<string>(''); // app contact id
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // PIPELINE
  const [pipelineViewMode, setPipelineViewMode] = useState<'list' | 'calendar'>('list');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [pipelineSort, setPipelineSort] = useState<'event_asc' | 'urgency' | 'created_desc' | 'alpha'>('event_asc');
  const [pipelineFilter, setPipelineFilter] = useState<string>('ALL');
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // INBOX sorting/filtering
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxSort, setInboxSort] = useState<
    'date_desc' | 'date_asc' | 'urgency' | 'event_date' | 'alpha' | 'source' | 'company' | 'quote'
  >('date_desc');
  const [inboxFilter, setInboxFilter] = useState<'ALL' | 'URGENT' | 'EMAIL' | 'PHONE' | 'WEB' | 'THIS_MONTH'>('ALL');

  // Pickers
  const [selectedVipId, setSelectedVipId] = useState<string>(''); // app contact for new lead
  const [selectedInboxVipId, setSelectedInboxVipId] = useState<string>(''); // app contact for inbox

  // ✅ NEW: group client selection + search (inbox + new lead)
  const [clientSearchInbox, setClientSearchInbox] = useState('');
  const [selectedGroupClientInboxId, setSelectedGroupClientInboxId] = useState<string>('');

  const [clientSearchLead, setClientSearchLead] = useState('');
  const [selectedGroupClientLeadId, setSelectedGroupClientLeadId] = useState<string>('');

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

  // Filtered group clients for search
  const filteredGroupClientsInbox = useMemo(() => {
    const q = safeLower(clientSearchInbox);
    if (!q) return groupClients;
    return groupClients.filter(c =>
      safeLower(getClientName(c)).includes(q) ||
      safeLower(getClientCompany(c)).includes(q) ||
      safeLower(getClientEmail(c)).includes(q) ||
      safeLower(getClientPhone(c)).includes(q)
    );
  }, [groupClients, clientSearchInbox]);

  const filteredGroupClientsLead = useMemo(() => {
    const q = safeLower(clientSearchLead);
    if (!q) return groupClients;
    return groupClients.filter(c =>
      safeLower(getClientName(c)).includes(q) ||
      safeLower(getClientCompany(c)).includes(q) ||
      safeLower(getClientEmail(c)).includes(q) ||
      safeLower(getClientPhone(c)).includes(q)
    );
  }, [groupClients, clientSearchLead]);

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

  /* -------------------- CONTACT ACTIONS (APPLICATION CONTACTS) -------------------- */
  const handleDeleteAppContact = (id: string) => {
    const targetId = String(id);
    if (!window.confirm('Supprimer ce contact définitivement ?')) return;

    const next = (appContacts || []).filter(c => getContactId(c) !== targetId);

    // ✅ delete locally + persist via callback if provided
    if (typeof onUpdateContacts === 'function') onUpdateContacts(next);
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

  /* -------------------- PREFILL HELPERS -------------------- */
  const prefillFromAppContact = (c: Contact | null, target: 'inbox' | 'lead') => {
    if (!c) return;
    const name = getContactName(c);
    const email = getContactEmail(c);
    const phone = getContactPhone(c);
    const company = getContactCompany(c);

    if (target === 'inbox') {
      setInboxForm(prev => ({
        ...prev,
        contactName: prev.contactName || name,
        companyName: prev.companyName || company,
        email: prev.email || email,
        phone: prev.phone || phone,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        contactName: prev.contactName || name,
        email: prev.email || email,
        phone: prev.phone || phone,
      }));
    }
  };

  const prefillFromGroupClient = (c: Client | null, target: 'inbox' | 'lead') => {
    if (!c) return;
    const company = getClientCompany(c);
    const name = getClientName(c);
    const email = getClientEmail(c);
    const phone = getClientPhone(c);

    if (target === 'inbox') {
      setInboxForm(prev => ({
        ...prev,
        companyName: prev.companyName || company,
        contactName: prev.contactName || name,
        email: prev.email || email,
        phone: prev.phone || phone,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        groupName: prev.groupName || (company ? `Groupe ${company}` : ''),
        contactName: prev.contactName || name,
        email: prev.email || email,
        phone: prev.phone || phone,
      }));
    }
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

    // ✅ Optionnel : enrichir/ajouter le contact côté "application" si callback présent
    // (sans écraser ce qui existe déjà)
    if (typeof onUpdateContacts === 'function') {
      const emailLower = safeLower(inboxForm.email);
      const nameLower = safeLower(inboxForm.contactName);

      const existing = (appContacts || []).find(c =>
        (!!emailLower && safeLower(getContactEmail(c)) === emailLower) ||
        (!!nameLower && safeLower(getContactName(c)) === nameLower)
      );

      const nextPhone = toE164FR(inboxForm.phone) || inboxForm.phone;

      if (existing) {
        const updated: Contact = {
          ...existing,
          email: getContactEmail(existing) || inboxForm.email,
          phone: getContactPhone(existing) || nextPhone,
        };
        const next = (appContacts || []).map(c => getContactId(c) === getContactId(existing) ? updated : c);
        onUpdateContacts(next);
      } else {
        const newContact: any = {
          id: uid('ct'),
          name: inboxForm.contactName,
          role: '',
          company: inboxForm.companyName || '',
          phone: nextPhone || '',
          email: inboxForm.email || '',
          vip: false,
        };
        onUpdateContacts([newContact, ...(appContacts || [])]);
      }
    }

    // reset
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
    setSelectedGroupClientInboxId('');
    setClientSearchInbox('');
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

  const processedInbox = useMemo(() => {
    let items = [...(inbox || [])].filter(i => i.status === 'to_process');

    if (inboxSearch) {
      const lower = safeLower(inboxSearch);
      items = items.filter(i =>
        safeLower(i.contactName).includes(lower) ||
        safeLower(i.companyName).includes(lower) ||
        safeLower(i.email).includes(lower) ||
        safeLower(i.phone).includes(lower)
      );
    }

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
          items = items.filter(i => {
            const src = safeLower(i.source);
            if (inboxFilter === 'EMAIL') return src === 'email';
            if (inboxFilter === 'PHONE') return src === 'phone';
            if (inboxFilter === 'WEB') return src === 'website';
            return true;
          });
        }
      } catch {}
    }

    items.sort((a, b) => {
      try {
        switch (inboxSort) {
          case 'date_asc': return safeDate(a.requestDate) - safeDate(b.requestDate);
          case 'date_desc': return safeDate(b.requestDate) - safeDate(a.requestDate);
          case 'alpha': return safeLower(a.contactName).localeCompare(safeLower(b.contactName), 'fr', { sensitivity: 'base' });
          case 'company': return safeLower(a.companyName).localeCompare(safeLower(b.companyName), 'fr', { sensitivity: 'base' });
          case 'source': return safeLower(String(a.source)).localeCompare(safeLower(String(b.source)), 'fr', { sensitivity: 'base' });
          case 'quote': {
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
    setSelectedGroupClientLeadId('');
    setClientSearchLead('');
    setActiveTab('pipeline');
  };

  const handleUpdateLead = (lead: Lead) => {
  onUpdateLeads((leads || []).map(l => (sameId(l.id, lead.id) ? lead : l)));
  setSelectedLead(lead);
};

const handleDeleteLead = (id: string | number) => {
  const targetId = String(id);
  if (!window.confirm('Supprimer ce lead ?')) return;

  const next = (leads || []).filter(l => String(l.id) !== targetId);
  onUpdateLeads(next);

  // si tu viens de supprimer celui sélectionné, on ferme la fiche
  if (selectedLead && String(selectedLead.id) === targetId) {
    setSelectedLead(null);
  }
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
      } catch {}
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
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;
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

        {/* -------------------- PIPELINE (inchangé) -------------------- */}
        {activeTab === 'pipeline' && (
          <>
            {/* ... ton pipeline (inchangé) ... */}
            {/* Pour garder la réponse lisible, je n’ai pas modifié cette partie */}
            {/* Tu peux conserver exactement ton code pipeline existant ici */}
            <div className="w-full">
              <div className="p-8 rounded-[32px] border bg-white dark:bg-slate-800 dark:border-slate-700">
                <p className="text-sm font-bold opacity-60">
                  ✅ Pipeline inchangé dans cette version (colle ta partie pipeline ici telle quelle).
                </p>
              </div>
            </div>
          </>
        )}

        {/* -------------------- INBOX (Saisie rapide corrigée) -------------------- */}
        {activeTab === 'inbox' && (
          <div className="flex flex-col md:flex-row h-full gap-4 md:gap-6 w-full">

            {/* Left form */}
            <div className={`w-full md:w-1/3 flex flex-col rounded-[32px] border overflow-hidden p-6 space-y-4 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
              <h3 className="text-lg font-black uppercase tracking-tight">Saisie Rapide</h3>

              <div className="space-y-3">

                {/* ✅ Contact picker (APPLICATION) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact (Application)</label>
                  <select
                    value={selectedInboxVipId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedInboxVipId(id);
                      const c = (appContacts || []).find(x => getContactId(x) === String(id)) || null;
                      prefillFromAppContact(c, 'inbox');
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
                        const phone = (selectedInboxVip ? getContactPhone(selectedInboxVip) : '') || inboxForm.phone;
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
                        const phone = (selectedInboxVip ? getContactPhone(selectedInboxVip) : '') || inboxForm.phone;
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

                {/* ✅ Client picker (GROUPES / CRM) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Client (Groupes / CRM)</label>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2">
                    <Search size={14} className="text-slate-400" />
                    <input
                      value={clientSearchInbox}
                      onChange={(e) => setClientSearchInbox(e.target.value)}
                      placeholder="Rechercher client groupe..."
                      className="bg-transparent outline-none w-full text-xs font-bold"
                    />
                  </div>

                  <select
                    value={selectedGroupClientInboxId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedGroupClientInboxId(id);
                      const c = filteredGroupClientsInbox.find(x => getClientId(x) === String(id)) || null;
                      prefillFromGroupClient(c, 'inbox');
                    }}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="">— Sélectionner —</option>
                    {filteredGroupClientsInbox.map(c => (
                      <option key={getClientId(c)} value={getClientId(c)}>
                        {getClientCompany(c)}{getClientEmail(c) ? ` • ${getClientEmail(c)}` : ''}{getClientPhone(c) ? ` • ${getClientPhone(c)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fields */}
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

            {/* Right list: garde ta partie existante */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* 👉 Ici tu peux recoller ta toolbar + liste processedInbox inchangées */}
              <div className={`p-6 rounded-[32px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                <p className="text-sm font-bold opacity-60">
                  ✅ La liste Inbox (tri / filtres / actions) peut rester inchangée. Garde ton code existant ici.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* -------------------- ARCHIVES (inchangé) -------------------- */}
        {activeTab === 'archives' && (
          <div className="w-full">
            <div className="p-8 rounded-[32px] border bg-white dark:bg-slate-800 dark:border-slate-700">
              <p className="text-sm font-bold opacity-60">
                ✅ Archives inchangées (garde ton code existant ici).
              </p>
              <button
                onClick={handleExportCSV}
                className="mt-4 px-6 py-3 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-colors"
              >
                <Download size={16} /> Exporter Excel
              </button>
            </div>
          </div>
        )}

        {/* -------------------- CONTACTS (application only) -------------------- */}
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
                        onClick={() => handleDeleteAppContact(getContactId(selectedContact))}
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

        {/* -------------------- NEW LEAD (ajout client groupes) -------------------- */}
        {activeTab === 'new_lead' && (
          <div className="w-full max-w-2xl mx-auto overflow-y-auto no-scrollbar py-6">
            <div className={`p-8 rounded-[32px] border shadow-sm space-y-6 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <h3 className="text-xl font-black uppercase tracking-tight">Nouvelle Demande Qualifiée</h3>

              <div className="space-y-4">

                {/* ✅ Contact (Application) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact (Application)</label>
                  <select
                    value={selectedVipId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedVipId(id);
                      const c = (appContacts || []).find(x => getContactId(x) === String(id)) || null;
                      prefillFromAppContact(c, 'lead');
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
                        const phone = (selectedVip ? getContactPhone(selectedVip) : '') || form.phone || '';
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
                        const phone = (selectedVip ? getContactPhone(selectedVip) : '') || form.phone || '';
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

                {/* ✅ Client (Groupes / CRM) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Client (Groupes / CRM)</label>

                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 py-3 border-2 border-transparent focus-within:border-indigo-500">
                    <Search size={16} className="text-slate-400" />
                    <input
                      value={clientSearchLead}
                      onChange={(e) => setClientSearchLead(e.target.value)}
                      placeholder="Rechercher client groupe..."
                      className="bg-transparent outline-none w-full text-sm font-bold"
                    />
                  </div>

                  <select
                    value={selectedGroupClientLeadId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedGroupClientLeadId(id);
                      const c = filteredGroupClientsLead.find(x => getClientId(x) === String(id)) || null;
                      prefillFromGroupClient(c, 'lead');
                    }}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm"
                  >
                    <option value="">— Sélectionner —</option>
                    {filteredGroupClientsLead.map(c => (
                      <option key={getClientId(c)} value={getClientId(c)}>
                        {getClientCompany(c)}{getClientEmail(c) ? ` • ${getClientEmail(c)}` : ''}{getClientPhone(c) ? ` • ${getClientPhone(c)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Form fields (inchangés) */}
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
