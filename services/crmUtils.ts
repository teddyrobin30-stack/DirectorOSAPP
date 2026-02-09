import { Lead, InboxItem, Rooms } from '../types';

/* --- UTILS DE BASE --- */
export const safeLower = (str: any) => (typeof str === 'string' ? str.toLowerCase() : '');

export const safeDate = (date: any) => {
  if (!date) return 0;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

/* --- LOGIQUE MÉTIER --- */
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
    const evtDate = startDate ? new Date(startDate) : null;

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