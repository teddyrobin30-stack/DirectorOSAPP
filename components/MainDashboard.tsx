// MainDashboard.tsx
import React, { useMemo } from 'react';
import {
  ChevronRight,
  CalendarPlus,
  CheckSquare,
  UserPlus,
  Calendar,
  User,
  Briefcase,
  Video,
  TrendingUp,
  Inbox,
  AlertCircle,
  ArrowRight,
  ListChecks,
  Flame,
  BadgeCheck,
  Clock,
} from 'lucide-react';
import { UserSettings, CalendarEvent, Task, Contact, Group, Lead, InboxItem } from '../types';

/* -------------------- SAFE UTILS -------------------- */
const safeTime = (v: any) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

const isSameDay = (d1: Date, d2: Date) =>
  d1.getDate() === d2.getDate() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getFullYear() === d2.getFullYear();

const isDateInRange = (d: Date, startStr: string, endStr: string) => {
  const check = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return check >= start && check <= end;
};

const openBlankSafe = (url?: string) => {
  if (!url) return;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    window.open(u.toString(), '_blank', 'noopener,noreferrer');
  } catch {
    // ignore invalid URLs
  }
};

/* -------------------- THEME (NO DYNAMIC TAILWIND) -------------------- */
/**
 * IMPORTANT:
 * - We avoid `bg-${color}-50` dynamic strings because Tailwind purge won't generate them.
 * - Keep keys aligned with what your app allows in settings.
 * - If user picks something unknown, we fallback to indigo.
 */
const THEME: Record<
  string,
  {
    lightPill: string; // background + text
    text: string; // plain text color
    badge: string; // small badge bg+text
    ring: string; // ring/focus style
  }
> = {
  indigo: {
    lightPill: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
    text: 'text-indigo-600 dark:text-indigo-300',
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
    ring: 'focus:ring-indigo-500/30',
  },
  violet: {
    lightPill: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
    text: 'text-violet-600 dark:text-violet-300',
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200',
    ring: 'focus:ring-violet-500/30',
  },
  purple: {
    lightPill: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
    text: 'text-purple-600 dark:text-purple-300',
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200',
    ring: 'focus:ring-purple-500/30',
  },
  blue: {
    lightPill: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    text: 'text-blue-600 dark:text-blue-300',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
    ring: 'focus:ring-blue-500/30',
  },
  cyan: {
    lightPill: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300',
    text: 'text-cyan-600 dark:text-cyan-300',
    badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200',
    ring: 'focus:ring-cyan-500/30',
  },
  teal: {
    lightPill: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300',
    text: 'text-teal-600 dark:text-teal-300',
    badge: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-200',
    ring: 'focus:ring-teal-500/30',
  },
  emerald: {
    lightPill: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    text: 'text-emerald-600 dark:text-emerald-300',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
    ring: 'focus:ring-emerald-500/30',
  },
  green: {
    lightPill: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
    text: 'text-green-600 dark:text-green-300',
    badge: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200',
    ring: 'focus:ring-green-500/30',
  },
  amber: {
    lightPill: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    text: 'text-amber-600 dark:text-amber-300',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
    ring: 'focus:ring-amber-500/30',
  },
  orange: {
    lightPill: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
    text: 'text-orange-600 dark:text-orange-300',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200',
    ring: 'focus:ring-orange-500/30',
  },
  rose: {
    lightPill: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
    text: 'text-rose-600 dark:text-rose-300',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
    ring: 'focus:ring-rose-500/30',
  },
  pink: {
    lightPill: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300',
    text: 'text-pink-600 dark:text-pink-300',
    badge: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-200',
    ring: 'focus:ring-pink-500/30',
  },
  slate: {
    lightPill: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-200',
    text: 'text-slate-700 dark:text-slate-200',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-200',
    ring: 'focus:ring-slate-500/30',
  },
};

interface MainDashboardProps {
  userSettings: UserSettings;
  events: CalendarEvent[];
  todos: Task[];
  contacts: Contact[];
  groups: Group[];
  leads?: Lead[];
  inbox?: InboxItem[];
  onNavigate: (tab: string) => void;
  onTaskToggle: (id: string | number) => void;
  onTaskClick: (task: Task) => void;
  onEventClick: (event: CalendarEvent) => void;
  onGroupClick: (group: Group) => void;
  onOpenEventModal: () => void;
  onOpenTaskModal: () => void;
  onOpenContactModal: () => void;
}

/* -------------------- UI PARTS -------------------- */
const SectionHeader: React.FC<{
  title: string;
  right?: React.ReactNode;
  subtitle?: string;
}> = ({ title, right, subtitle }) => (
  <div className="flex items-end justify-between px-1">
    <div>
      <h2 className="text-sm font-black uppercase tracking-widest opacity-60">{title}</h2>
      {subtitle && <p className="text-[11px] font-bold text-slate-400 mt-1">{subtitle}</p>}
    </div>
    {right}
  </div>
);

const StatCard: React.FC<{
  icon: React.ElementType;
  title: string;
  value: React.ReactNode;
  hint?: string;
  onClick?: () => void;
  tone?: 'indigo' | 'blue' | 'emerald' | 'orange' | 'slate';
}> = ({ icon: Icon, title, value, hint, onClick, tone = 'slate' }) => {
  const toneMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30',
    slate: 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.99] ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      } ${toneMap[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-800 shadow-sm">
            <Icon size={16} className="text-slate-600 dark:text-slate-200" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-slate-400">{title}</p>
            {hint && <p className="text-[11px] font-bold text-slate-500 truncate">{hint}</p>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-slate-900 dark:text-white leading-none">{value}</div>
        </div>
      </div>
    </button>
  );
};

const PillButton: React.FC<{
  icon: React.ElementType;
  label: string;
  sub?: string;
  toneClass: string;
  onClick: () => void;
}> = ({ icon: Icon, label, sub, toneClass, onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 p-4 rounded-3xl border shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
  >
    <div className="flex items-center gap-3">
      <div className={`p-3 rounded-2xl ${toneClass}`}>
        <Icon size={20} />
      </div>
      <div className="text-left min-w-0">
        <p className="text-xs font-black uppercase">{label}</p>
        {sub && <p className="text-[11px] font-bold text-slate-400 truncate mt-0.5">{sub}</p>}
      </div>
    </div>
  </button>
);

/* -------------------- COMPONENT -------------------- */
const MainDashboard: React.FC<MainDashboardProps> = ({
  userSettings,
  events,
  todos,
  contacts,
  groups,
  leads = [],
  inbox = [],
  onNavigate,
  onTaskToggle,
  onTaskClick,
  onEventClick,
  onGroupClick,
  onOpenEventModal,
  onOpenTaskModal,
  onOpenContactModal,
}) => {
  const today = new Date();
  const theme = THEME[userSettings.themeColor] ?? THEME.indigo;

  const contactsById = useMemo(() => {
    const m = new Map<string, Contact>();
    (contacts || []).forEach((c) => m.set(String(c.id), c));
    return m;
  }, [contacts]);

  // Agenda
  const todaysEvents = useMemo(() => {
    return (events || [])
      .filter((e) => isSameDay(new Date(e.start), today))
      .sort((a, b) => safeTime(a.start) - safeTime(b.start));
  }, [events, today]);

  const nextEvent = useMemo(() => {
    const now = today.getTime();
    const upcoming = (events || [])
      .map((e) => ({ e, t: safeTime(e.start) }))
      .filter((x) => x.t && x.t >= now)
      .sort((a, b) => a.t - b.t);
    return upcoming[0]?.e ?? null;
  }, [events, today]);

  // Groups in house
  const activeGroups = useMemo(() => {
    return (groups || []).filter((g) => {
      if (!g.startDate || !g.endDate) return false;
      return isDateInRange(today, g.startDate, g.endDate);
    });
  }, [groups, today]);

  // Tasks
  const doneCount = useMemo(() => (todos || []).filter((t) => t.done).length, [todos]);
  const totalCount = todos?.length || 0;
  const pendingTasks = useMemo(() => (todos || []).filter((t) => !t.done).slice(0, 4), [todos]);

  // Sales / Inbox KPIs
  const pipelineActive = useMemo(
    () => (leads || []).filter((l) => l.status === 'nouveau' || l.status === 'en_cours'),
    [leads]
  );

  const overdueLeads = useMemo(() => {
    // Created > 7 days and still 'nouveau'
    const now = today.getTime();
    return pipelineActive
      .filter((l) => l.status === 'nouveau' && safeTime(l.requestDate))
      .map((l) => {
        const t = safeTime(l.requestDate);
        const diffDays = (now - t) / (1000 * 3600 * 24);
        return { l, diffDays };
      })
      .filter((x) => x.diffDays > 7)
      .sort((a, b) => b.diffDays - a.diffDays);
  }, [pipelineActive, today]);

  const inboxToProcess = useMemo(() => (inbox || []).filter((i) => i.status === 'to_process'), [inbox]);

  const inboxUrgent = useMemo(() => {
    // "+48h without follow-up": use lastFollowUp or requestDate
    const now = today.getTime();
    return inboxToProcess
      .map((i) => {
        const ref = safeTime(i.lastFollowUp || i.requestDate);
        const diffHours = ref ? (now - ref) / (1000 * 3600) : 0;
        return { i, diffHours };
      })
      .filter((x) => x.diffHours > 48)
      .sort((a, b) => b.diffHours - a.diffHours);
  }, [inboxToProcess, today]);

  const inboxThisMonth = useMemo(() => {
    const m = today.getMonth();
    const y = today.getFullYear();
    return inboxToProcess.filter((i) => {
      if (!i.eventStartDate) return false;
      const d = new Date(i.eventStartDate);
      if (Number.isNaN(d.getTime())) return false;
      return d.getMonth() === m && d.getFullYear() === y;
    });
  }, [inboxToProcess, today]);

  const actionItems = useMemo(() => {
    const items: { key: string; title: string; desc: string; tone: 'orange' | 'blue' | 'indigo' | 'emerald'; onClick: () => void }[] =
      [];

    if (inboxUrgent.length > 0) {
      items.push({
        key: 'inbox-urgent',
        title: `Inbox urgente (${inboxUrgent.length})`,
        desc: `Relances nécessaires (+48h) — ${inboxUrgent[0].i.contactName}`,
        tone: 'orange',
        onClick: () => onNavigate('groups_crm'),
      });
    } else if (inboxToProcess.length > 0) {
      items.push({
        key: 'inbox',
        title: `Nouvelles demandes (${inboxToProcess.length})`,
        desc: inboxThisMonth.length > 0 ? `${inboxThisMonth.length} ce mois-ci` : 'À qualifier',
        tone: 'blue',
        onClick: () => onNavigate('groups_crm'),
      });
    }

    if (overdueLeads.length > 0) {
      items.push({
        key: 'leads-overdue',
        title: `Leads à relancer (${overdueLeads.length})`,
        desc: `Le plus ancien: ${overdueLeads[0].l.contactName}`,
        tone: 'indigo',
        onClick: () => onNavigate('groups_crm'),
      });
    } else {
      items.push({
        key: 'pipeline',
        title: `Pipeline actif (${pipelineActive.length})`,
        desc: 'Suivi des dossiers en cours',
        tone: 'indigo',
        onClick: () => onNavigate('groups_crm'),
      });
    }

    const pending = (todos || []).filter((t) => !t.done).length;
    if (pending > 0) {
      items.push({
        key: 'tasks',
        title: `Priorités (${pending})`,
        desc: 'Terminer les actions clés',
        tone: 'emerald',
        onClick: () => onNavigate('todo'),
      });
    }

    return items.slice(0, 3);
  }, [inboxUrgent, inboxToProcess, inboxThisMonth.length, overdueLeads, pipelineActive.length, todos, onNavigate]);

  return (
    <div className="p-4 md:px-6 md:py-5 space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Top Row: Welcome + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-stretch">
        {/* Welcome */}
        <div className="lg:col-span-2 p-6 rounded-3xl border bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-400/5 dark:to-purple-400/5 border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`font-bold text-[10px] uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400`}>
                {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold truncate pr-2 text-slate-900 dark:text-white">
                Bonjour, {userSettings.userName}
              </h1>
              <p className="text-xs font-bold text-slate-400 mt-2">
                {nextEvent
                  ? `Prochain RDV: ${new Date(nextEvent.start).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                    })} • ${nextEvent.time || ''}`
                  : 'Aucun rendez-vous à venir'}
              </p>
            </div>

            {/* Compact task progress */}
            <div className="shrink-0 w-44">
              <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase text-slate-400">Tâches</p>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                    {doneCount}/{totalCount}
                  </p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-400 dark:bg-slate-500"
                    style={{
                      width: totalCount > 0 ? `${Math.round((doneCount / totalCount) * 100)}%` : '0%',
                    }}
                  />
                </div>
                <button
                  onClick={() => onNavigate('todo')}
                  className={`mt-3 text-xs font-black ${theme.text} flex items-center gap-1`}
                >
                  Voir la liste <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick actions row (bigger, more actionable) */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <PillButton
              icon={CalendarPlus}
              label="Nouveau RDV"
              sub="Planifier un rendez-vous"
              toneClass={theme.lightPill}
              onClick={onOpenEventModal}
            />
            <PillButton
              icon={CheckSquare}
              label="Nouvelle Tâche"
              sub="Ajouter une priorité"
              toneClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
              onClick={onOpenTaskModal}
            />
            <PillButton
              icon={UserPlus}
              label="Nouveau Contact"
              sub="Ajouter à l'annuaire"
              toneClass="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
              onClick={onOpenContactModal}
            />
          </div>
        </div>

        {/* Action Now */}
        <div className="p-6 rounded-3xl border bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <Flame size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-black">À traiter maintenant</p>
                <p className="text-[11px] font-bold text-slate-400">Tes 3 prochaines actions</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('groups_crm')}
              className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-slate-400"
              title="Ouvrir CRM"
            >
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {actionItems.map((a) => (
              <StatCard
                key={a.key}
                icon={a.tone === 'orange' ? AlertCircle : a.tone === 'blue' ? Inbox : a.tone === 'emerald' ? ListChecks : Briefcase}
                title={a.title}
                value={<ChevronRight size={18} className="text-slate-300" />}
                hint={a.desc}
                onClick={a.onClick}
                tone={a.tone === 'orange' ? 'orange' : a.tone === 'blue' ? 'blue' : a.tone === 'emerald' ? 'emerald' : 'indigo'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda */}
        <section className="lg:col-span-1 flex flex-col">
          <SectionHeader
            title={`Agenda (${todaysEvents.length})`}
            right={
              <button onClick={() => onNavigate('agenda')} className={`text-xs font-black ${theme.text}`}>
                Tout voir
              </button>
            }
            subtitle={todaysEvents.length ? 'Tes rendez-vous du jour' : nextEvent ? 'Prochain rendez-vous à venir' : 'Aucun rendez-vous'}
          />

          <div className="mt-4 space-y-3">
            {(todaysEvents.length > 0 ? todaysEvents : nextEvent ? [nextEvent] : []).map((evt) => {
              const linked = evt.linkedContactId ? contactsById.get(String(evt.linkedContactId)) : null;

              return (
                <div
                  key={evt.id}
                  onClick={() => onEventClick(evt)}
                  className="p-4 rounded-2xl shadow-sm border flex items-start gap-4 cursor-pointer transition-transform hover:translate-x-1 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                >
                  <div className={`flex flex-col items-center justify-center min-w-[3.6rem] p-2.5 rounded-xl ${evt.type === 'pro' ? theme.lightPill : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'}`}>
                    <span className="text-xs font-bold">{evt.time}</span>
                    <span className="text-[9px] font-black opacity-70">{evt.duration}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm leading-snug truncate">{evt.title}</h3>

                    <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <Clock size={12} />
                      <span className="truncate">
                        {new Date(evt.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {evt.linkedContactId && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                        <User size={10} /> {linked?.name || 'Contact'}
                      </p>
                    )}

                    {evt.videoLink && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openBlankSafe(evt.videoLink);
                        }}
                        className="mt-2 py-1 px-2.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200 text-[9px] font-black flex items-center gap-2 w-fit"
                        title="Ouvrir la visio"
                      >
                        <Video size={12} /> VISIO
                      </button>
                    )}
                  </div>

                  <ChevronRight size={16} className="text-slate-300 mt-1" />
                </div>
              );
            })}

            {todaysEvents.length === 0 && !nextEvent && (
              <div className="p-8 text-center border-2 border-dashed rounded-3xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <p className="text-slate-400 text-xs font-bold">Aucun rendez-vous prévu.</p>
                <button
                  onClick={onOpenEventModal}
                  className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black ${theme.text} border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors`}
                >
                  <CalendarPlus size={14} /> Planifier
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Commercial */}
        <section className="lg:col-span-1 flex flex-col">
          <SectionHeader
            title="Commercial"
            right={
              <button onClick={() => onNavigate('groups_crm')} className="text-xs font-black text-violet-600 dark:text-violet-300">
                Ouvrir CRM
              </button>
            }
            subtitle="Pulse + urgences + pipeline"
          />

          <div className="mt-4 space-y-3">
            <div className="p-5 rounded-3xl border bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-200">
                    <TrendingUp size={18} />
                  </div>
                  <span className="text-sm font-black">Pulse Commercial</span>
                </div>
                <button
                  onClick={() => onNavigate('groups_crm')}
                  className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                  title="Voir CRM"
                >
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <StatCard
                  icon={Briefcase}
                  title="Dossiers actifs"
                  hint="Nouveau + En cours"
                  value={pipelineActive.length}
                  onClick={() => onNavigate('groups_crm')}
                  tone="indigo"
                />

                <StatCard
                  icon={Inbox}
                  title="Nouvelles demandes"
                  hint={inboxUrgent.length ? `Urgent: ${inboxUrgent.length} (+48h)` : 'À qualifier'}
                  value={
                    inboxToProcess.length > 0 ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-lg font-black">{inboxToProcess.length}</span>
                        {inboxUrgent.length > 0 && (
                          <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                            URGENT
                          </span>
                        )}
                      </span>
                    ) : (
                      0
                    )
                  }
                  onClick={() => onNavigate('groups_crm')}
                  tone="blue"
                />

                <div className="p-4 rounded-2xl border bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={16} className="text-orange-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase text-orange-400">Action requise</p>
                      <p className="text-sm font-bold text-orange-900 dark:text-orange-200 truncate">
                        {overdueLeads.length > 0
                          ? `Relancer ${overdueLeads[0].l.contactName}`
                          : inboxUrgent.length > 0
                          ? `Relancer ${inboxUrgent[0].i.contactName}`
                          : 'Rien à signaler'}
                      </p>
                      {(overdueLeads.length > 0 || inboxUrgent.length > 0) && (
                        <button
                          onClick={() => onNavigate('groups_crm')}
                          className="mt-2 inline-flex items-center gap-2 text-xs font-black text-orange-600 dark:text-orange-200"
                        >
                          Voir les urgences <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Extra: quick create lead entry */}
                <button
                  onClick={() => onNavigate('groups_crm')}
                  className="w-full mt-1 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <BadgeCheck size={16} /> Traiter une demande / Créer un lead
                </button>
              </div>
            </div>

            {/* Groups in house */}
            <div className="p-5 rounded-3xl border bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black">Groupes en maison</p>
                <span className="text-xs font-black text-slate-400">{activeGroups.length}</span>
              </div>

              <div className="mt-3 space-y-2">
                {activeGroups.length > 0 ? (
                  activeGroups.slice(0, 4).map((group) => (
                    <div
                      key={group.id}
                      onClick={() => onGroupClick(group)}
                      className="p-4 rounded-2xl border-l-4 border-l-violet-500 border border-slate-100 dark:border-slate-700 cursor-pointer hover:translate-x-1 transition-transform bg-slate-50/60 dark:bg-slate-900/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs truncate">{group.name}</h3>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                            {group.pax} PAX • {group.category}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 shrink-0" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-slate-400 text-xs font-bold">Aucun groupe en maison.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Priorités */}
        <section className="lg:col-span-1 flex flex-col">
          <SectionHeader
            title={`Priorités (${(todos || []).filter((t) => !t.done).length})`}
            right={
              <button onClick={() => onNavigate('todo')} className={`text-xs font-black ${theme.text}`}>
                Liste complète
              </button>
            }
            subtitle="Tes prochaines tâches"
          />

          <div className="mt-4 space-y-3">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-2xl shadow-sm border flex items-center gap-4 transition-transform hover:translate-x-1 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
              >
                <button
                  onClick={() => onTaskToggle(task.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    task.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'
                  }`}
                  title={task.done ? 'Marquer comme non faite' : 'Marquer comme faite'}
                >
                  {task.done && <CheckSquare size={12} className="text-white" />}
                </button>

                <div className="flex-1 cursor-pointer min-w-0" onClick={() => onTaskClick(task)}>
                  <p className={`text-sm font-semibold truncate ${task.done ? 'line-through opacity-40' : ''}`}>{task.text}</p>

                  {/* Tag badge */}
                  {!!task.tag && (
                    <span className={`text-[9px] font-black px-2 py-1 rounded-md mt-1 inline-block ${theme.badge}`}>
                      {task.tag}
                    </span>
                  )}
                </div>

                <ChevronRight size={16} className="text-slate-300" />
              </div>
            ))}

            {pendingTasks.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed rounded-3xl border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-900/10">
                <p className="text-emerald-500 text-xs font-black">Tout est sous contrôle !</p>
                <button
                  onClick={onOpenTaskModal}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-200 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/20 transition-colors"
                >
                  <CheckSquare size={14} /> Ajouter une tâche
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MainDashboard;
