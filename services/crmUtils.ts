import { Lead, InboxItem, Rooms } from '../types';

/* -------------------- SECURITE & DATES -------------------- */
export const safeLower = (str: any) => (typeof str === 'string' ? str.toLowerCase() : '');

export const safeDate = (date: any) => {
  if (!date) return 0;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

export const defaultRooms = (): Rooms => ({ single: 0, twin: 0, double: 0, family: 0 });

/* -------------------- LOGIQUE TELEPHONE & MESSAGERIE (RESTAUREE) -------------------- */
const normalizePhone = (phone: string) => (phone || '').replace(/[^\d+]/g, '');

// Format E164 FR (+33...)
export const toE164FR = (raw: string) => {
  const p = normalizePhone(raw);
  if (!p) return '';
  if (p.startsWith('+33')) return p;
  if (/^33\d{9}$/.test(p)) return `+${p}`;
  if (/^0\d{9}$/.test(p)) return `+33${p.slice(1)}`;
  if (p.startsWith('+') && p.length >= 8) return p;
  if (/^\d{8,15}$/.test(p)) return `+${p}`;
  return '';
};

// Format WhatsApp (sans le +)
export const toWhatsAppNumber = (raw: string) => {
  const e164 = toE164FR(raw);
  return e164 ? e164.replace('+', '') : '';
};

export const buildMessage = (data: {
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
}) => {
  const rooms = data.rooms || defaultRooms();
  const dates = data.startDate
      ? `📅 Dates: ${new Date(data.startDate).toLocaleDateString('fr-FR')}${data.endDate ? ` → ${new Date(data.endDate).toLocaleDateString('fr-FR')}` : ''}`
      : '📅 Dates: à définir';

  const pax = typeof data.pax === 'number' && data.pax > 0 ? `👥 PAX: ${data.pax}` : '';
  const roomsLine = `🛏️ Chambres: Single ${rooms.single} | Twin ${rooms.twin} | Double ${rooms.double} | Fam ${rooms.family}`;
  const noteLine = data.note ? `📝 Notes:\n${data.note}` : '📝 Notes: -';

  return [
    '✅ Demande Groupe / Event',
    `👤 Contact: ${data.contactName || '-'}`,
    data.email ? `✉️ ${data.email}` : '',
    data.phone ? `📞 ${data.phone}` : '',
    data.groupName ? `🏷️ Groupe: ${data.groupName}` : '',
    dates,
    pax,
    roomsLine,
    data.sourceLabel ? `🧾 Source: ${data.sourceLabel}` : '',
    '',
    noteLine,
  ].filter(Boolean).join('\n');
};

export const openSMS = (rawPhone: string, message: string) => {
  const e164 = toE164FR(rawPhone);
  if (!e164) return;
  window.location.href = `sms:${encodeURIComponent(e164)}?body=${encodeURIComponent(message)}`;
};

export const openWhatsApp = (rawPhone: string, message: string) => {
  const wa = toWhatsAppNumber(rawPhone);
  if (!wa) return;
  window.open(`https://wa.me/${encodeURIComponent(wa)}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
};

/* -------------------- LOGIQUE METIER CRM -------------------- */
export const checkIsOverdue = (item: InboxItem) => {
  if (item.status !== 'to_process') return false;
  const now = new Date();
  const ref = item.lastFollowUp ? new Date(item.lastFollowUp) : new Date(item.requestDate);
  if (Number.isNaN(ref.getTime())) return false;
  return (now.getTime() - ref.getTime()) > 48 * 3600 * 1000;
};

export const checkAlerts = (lead: Lead) => {
  try {
    const now = new Date();
    const reqDate = lead.requestDate ? new Date(lead.requestDate) : new Date();
    const startDate = lead.startDate || lead.eventDate;
    const alerts: { type: string; label: string; color: string }[] = [];

    const diffDays = Math.ceil((now.getTime() - reqDate.getTime()) / (1000 * 3600 * 24));
    if ((lead.status === 'nouveau' || lead.status === 'en_cours') && diffDays > 7) {
      alerts.push({ type: 'followup', label: 'Relance', color: 'text-amber-500 bg-amber-50' });
    }

    if (startDate && lead.status !== 'perdu') {
      const evtDate = new Date(startDate);
      if (!Number.isNaN(evtDate.getTime())) {
        const diffEvt = Math.ceil((evtDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffEvt > 0 && diffEvt < 30) {
          alerts.push({ type: 'urgent', label: `J-${diffEvt}`, color: 'text-red-500 bg-red-50' });
        }
      }
    }
    return alerts;
  } catch { return []; }
};

export const canValidateLead = (lead: Lead) => {
  return lead.checklist.roomSetup && lead.checklist.menu && lead.checklist.roomingList;
};