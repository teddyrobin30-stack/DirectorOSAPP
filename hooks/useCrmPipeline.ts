import { useMemo, useState } from 'react';
import { Lead } from '../types';
import { safeLower, safeDate, checkAlerts } from '../services/crmUtils';

export const useCrmPipeline = (leads: Lead[]) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState<'event_asc' | 'urgency' | 'created_desc' | 'alpha'>('event_asc');

  const processedLeads = useMemo(() => {
    let items = [...leads];

    if (search) {
      const lower = safeLower(search);
      items = items.filter(l =>
        safeLower(l.groupName).includes(lower) ||
        safeLower(l.contactName).includes(lower) ||
        safeLower(l.email).includes(lower)
      );
    }

    if (filter !== 'ALL') {
      const now = new Date();
      if (['nouveau', 'en_cours', 'valide', 'perdu'].includes(filter)) {
        items = items.filter(l => l.status === filter);
      } else if (filter === 'URGENT_ARRIVAL') {
        items = items.filter(l => {
          const dateStr = l.startDate || l.eventDate;
          if (!dateStr || l.status === 'perdu') return false;
          const diff = (new Date(dateStr).getTime() - now.getTime()) / (1000 * 3600 * 24);
          return diff > 0 && diff < 30;
        });
      } else if (filter === 'LATE_FOLLOWUP') {
        items = items.filter(l => {
          if (l.status === 'valide' || l.status === 'perdu' || !l.requestDate) return false;
          const diff = (now.getTime() - new Date(l.requestDate).getTime()) / (1000 * 3600 * 24);
          return diff > 7;
        });
      } else if (filter === 'THIS_MONTH') {
        items = items.filter(l => {
          const d = new Date(l.startDate || l.eventDate || '');
          return !Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
      }
    }

    items.sort((a, b) => {
      switch (sort) {
        case 'event_asc':
          const da = safeDate(a.startDate || a.eventDate);
          const db = safeDate(b.startDate || b.eventDate);
          if (!da) return 1; if (!db) return -1;
          return da - db;
        case 'created_desc': return safeDate(b.requestDate) - safeDate(a.requestDate);
        case 'alpha': return safeLower(a.groupName).localeCompare(safeLower(b.groupName), 'fr');
        case 'urgency': return checkAlerts(b).length - checkAlerts(a).length;
        default: return 0;
      }
    });

    return items;
  }, [leads, search, filter, sort]);

  return { processedLeads, state: { search, setSearch, filter, setFilter, sort, setSort } };
};