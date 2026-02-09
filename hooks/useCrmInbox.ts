import { useMemo, useState } from 'react';
import { InboxItem } from '../types';
import { safeLower, safeDate, checkIsOverdue } from '../services/crmUtils';

export const useCrmInbox = (inbox: InboxItem[]) => {
  const [search, setSearch] = useState('');
  // Filtres disponibles : ALL, URGENT, EMAIL, PHONE, WEB, THIS_MONTH
  const [filter, setFilter] = useState('ALL');
  // Tris disponibles : date_desc, date_asc, urgency, event_date, alpha, source, quote
  const [sort, setSort] = useState<'date_desc' | 'date_asc' | 'urgency' | 'event_date' | 'alpha' | 'source' | 'company' | 'quote'>('date_desc');

  const processedInbox = useMemo(() => {
    // On ne garde que les items à traiter
    let items = [...(inbox || [])].filter(i => i.status === 'to_process');

    // 1. Recherche
    if (search) {
      const lower = safeLower(search);
      items = items.filter(i =>
        safeLower(i.contactName).includes(lower) ||
        safeLower(i.companyName).includes(lower) ||
        safeLower(i.email).includes(lower) ||
        safeLower(i.phone).includes(lower)
      );
    }

    // 2. Filtres
    if (filter !== 'ALL') {
      try {
        if (filter === 'URGENT') {
          items = items.filter(checkIsOverdue);
        } else if (filter === 'THIS_MONTH') {
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
            if (filter === 'EMAIL') return src === 'email';
            if (filter === 'PHONE') return src === 'phone';
            if (filter === 'WEB') return src === 'website';
            return true;
          });
        }
      } catch { /* no-op */ }
    }

    // 3. Tris
    items.sort((a, b) => {
      try {
        switch (sort) {
          case 'date_asc': return safeDate(a.requestDate) - safeDate(b.requestDate);
          case 'date_desc': return safeDate(b.requestDate) - safeDate(a.requestDate);
          case 'alpha': return safeLower(a.contactName).localeCompare(safeLower(b.contactName), 'fr');
          case 'company': return safeLower(a.companyName).localeCompare(safeLower(b.companyName), 'fr');
          case 'source': return safeLower(String(a.source)).localeCompare(safeLower(String(b.source)), 'fr');
          case 'quote': {
            const qa = a.quoteSent ? 1 : 0;
            const qb = b.quoteSent ? 1 : 0;
            if (qa !== qb) return qa - qb; // Non envoyé d'abord
            return safeDate(b.requestDate) - safeDate(a.requestDate);
          }
          case 'event_date': {
            const da = safeDate(a.eventStartDate);
            const db = safeDate(b.eventStartDate);
            if (!da) return 1; if (!db) return -1;
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
      } catch { return 0; }
    });

    return items;
  }, [inbox, search, filter, sort]);

  return {
    processedInbox,
    state: { search, setSearch, filter, setFilter, sort, setSort }
  };
};