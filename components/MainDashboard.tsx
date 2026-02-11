// MainDashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CalendarPlus,
  CheckSquare,
  ChevronRight,
  GripVertical,
  Inbox,
  Settings2,
  TrendingUp,
  User,
  UserPlus,
  Video,
  X,
  ArrowUp,
  ArrowDown,
  Calendar
} from 'lucide-react';
import type {
  UserSettings,
  CalendarEvent,
  Task,
  Contact,
  Group,
  Lead,
  InboxItem,
  DashboardWidgetConfig,
} from '../types';

interface MainDashboardProps {
  userSettings: UserSettings;
  events?: CalendarEvent[];
  todos?: Task[];
  contacts?: Contact[];
  groups?: Group[];
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

  onSaveDashboardWidgets?: (widgets: DashboardWidgetConfig[]) => void;
}

type WidgetId =
  | 'quick_actions'
  | 'agenda_today'
  | 'sales_pulse'
  | 'active_groups'
  | 'tasks_focus';

const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'quick_actions', enabled: true, order: 10, size: 'md' },
  { id: 'agenda_today', enabled: true, order: 20, size: 'lg' },
  { id: 'sales_pulse', enabled: true, order: 30, size: 'md' },
  { id: 'active_groups', enabled: true, order: 40, size: 'md' },
  { id: 'tasks_focus', enabled: true, order: 50, size: 'md' },
];

const clampOrder = (n: number) => (Number.isFinite(n) ? n : 999);

const normalizeWidgets = (widgets?: DashboardWidgetConfig[]) => {
  const fromSettings = Array.isArray(widgets) && widgets.length ? widgets : DEFAULT_WIDGETS;

  const map = new Map<string, DashboardWidgetConfig>();
  for (const w of fromSettings) {
    if (!w?.id) continue;
    map.set(String(w.id), {
      id: String(w.id),
      enabled: Boolean(w.enabled),
      order: clampOrder(Number(w.order)),
      size: w.size === 'sm' || w.size === 'md' || w.size === 'lg' ? w.size : 'md',
    });
  }

  // add missing defaults
  for (const d of DEFAULT_WIDGETS) {
    if (!map.has(d.id)) map.set(d.id, d);
  }

  return Array.from(map.values()).sort((a, b) => a.order - b.order);
};

const isSameDay = (d1: Date, d2: Date) =>
  d1.getDate() === d2.getDate() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getFullYear() === d2.getFullYear();

const isDateInRange = (d: Date, startStr: string, endStr: string) => {
  const checkDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const start = new Date(startStr);
  const end = new Date(endStr);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return checkDate >= start && checkDate <= end;
};

const prettyDateFR = (date: Date) =>
  date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const titleByWidget: Record<WidgetId, string> = {
  quick_actions: 'Raccourcis',
  agenda_today: 'Agenda du jour',
  sales_pulse: 'Performance commerciale',
  active_groups: 'Groupes en maison',
  tasks_focus: 'Priorités',
};

const descByWidget: Record<WidgetId, string> = {
  quick_actions: 'Créer un RDV, une tâche ou un contact',
  agenda_today: 'Vos rendez-vous du jour',
  sales_pulse: 'KPI & relances rapides',
  active_groups: 'Groupes actuellement sur place',
  tasks_focus: 'Vos tâches à traiter',
};

const sizeLabel: Record<NonNullable<DashboardWidgetConfig['size']>, string> = {
  sm: 'Petit',
  md: 'Moyen',
  lg: 'Large',
};

const MainDashboard: React.FC<MainDashboardProps> = ({
  userSettings,
  // ✅ SÉCURITÉ : Initialisation à [] pour éviter l'écran blanc
  events = [],
  todos = [],
  contacts = [],
  groups = [],
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
  onSaveDashboardWidgets,
}) => {
  const today = useMemo(() => new Date(), []);
  const theme = userSettings.themeColor || 'indigo';

  // Data computed
  const todaysEvents = useMemo(() => {
    return events
      .filter((e) => isSameDay(new Date(e.start), today))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, today]);

  const activeGroups = useMemo(() => {
    return groups.filter((g) => isDateInRange(today, g.startDate, g.endDate));
  }, [groups, today]);

  const pendingTasks = useMemo(() => {
    return todos.filter((t) => !t.done).slice(0, 6);
  }, [todos]);

  const salesKPIs = useMemo(() => {
    const pipeline = leads.filter((l) => l.status === 'nouveau' || l.status === 'en_cours').length;
    const newRequests = inbox.filter((i) => i.status === 'to_process').length;

    const urgentAction = leads.find((l) => {
      const d = new Date(l.requestDate);
      const diff = (today.getTime() - d.getTime()) / (1000 * 3600 * 24);
      return diff > 7 && l.status === 'nouveau';
    })?.contactName;

    return { pipeline, newRequests, urgentAction };
  }, [leads, inbox, today]);

  // Widgets config
  const initialWidgets = useMemo(
    () => normalizeWidgets(userSettings.dashboardWidgets),
    [userSettings.dashboardWidgets]
  );

  const [editMode, setEditMode] = useState(false);
  const [widgetsDraft, setWidgetsDraft] = useState<DashboardWidgetConfig[]>(initialWidgets);

  useEffect(() => {
    if (!editMode) setWidgetsDraft(initialWidgets);
  }, [initialWidgets, editMode]);

  const dragIdRef = useRef<string | null>(null);

  const sortedEnabledWidgets = useMemo(() => {
    return normalizeWidgets(widgetsDraft).filter((w) => w.enabled);
  }, [widgetsDraft]);

  const persistWidgets = (next: DashboardWidgetConfig[]) => {
    setWidgetsDraft(next);
    onSaveDashboardWidgets?.(next);
  };

  const toggleWidget = (id: string) => {
    const next = widgetsDraft.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w));
    persistWidgets(next);
  };

  const setWidgetSize = (id: string, size: 'sm' | 'md' | 'lg') => {
    const next = widgetsDraft.map((w) => (w.id === id ? { ...w, size } : w));
    persistWidgets(next);
  };

  const swapOrder = (id: string, dir: -1 | 1) => {
    const sorted = normalizeWidgets(widgetsDraft);
    const idx = sorted.findIndex((w) => w.id === id);
    if (idx < 0) return;

    const j = idx + dir;
    if (j < 0 || j >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[j];

    const next = sorted.map((w) => {
      if (w.id === a.id) return { ...w, order: b.order };
      if (w.id === b.id) return { ...w, order: a.order };
      return w;
    });

    persistWidgets(next);
  };

  const handleDropReorder = (targetId: string) => {
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    if (!sourceId || sourceId === targetId) return;

    const sorted = normalizeWidgets(widgetsDraft);
    const from = sorted.findIndex((w) => w.id === sourceId);
    const to = sorted.findIndex((w) => w.id === targetId);
    if (from < 0 || to < 0) return;

    const moved = [...sorted];
    const [item] = moved.splice(from, 1);
    moved.splice(to, 0, item);

    const next = moved.map((w, i) => ({ ...w, order: (i + 1) * 10 }));
    persistWidgets(next);
  };

  const widgetColSpan = (id: string, size?: DashboardWidgetConfig['size']) => {
    if (id === 'quick_actions') return 'lg:col-span-3';
    if (size === 'lg') return 'lg:col-span-2';
    return 'lg:col-span-1';
  };

  // Theme helpers
  const themeLight = `bg-${theme}-50 text-${theme}-600`;
  const themeText = `text-${theme}-600`;
  const themeBadge = `bg-${theme}-50 text-${theme}-700`;

  // ------- Widgets renderers -------
  const WidgetQuickActions = () => (
    <section className="w-full">
      <div className="flex justify-between items-center mb-4 px-1">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest opacity-60">Raccourcis</h2>
          <p className="text-[11px] text-slate-400 mt-1">{descByWidget.quick_actions}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { icon: CalendarPlus, label: 'RDV', color: themeLight, onClick: onOpenEventModal },
          { icon: CheckSquare, label: 'Tâche', color: 'bg-emerald-50 text-emerald-600', onClick: onOpenTaskModal },
          { icon: UserPlus, label: 'Contact', color: 'bg-amber-50 text-amber-600', onClick: onOpenContactModal },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.onClick}
            className={`p-4 md:p-5 rounded-3xl flex flex-col items-center justify-center gap-2 md:gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm border ${
              userSettings.darkMode
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'bg-white border-slate-100 text-slate-700'
            }`}
          >
            <div className={`p-3 rounded-full ${btn.color}`}>
              <btn.icon size={22} className="md:w-6 md:h-6" />
            </div>
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-tight">
              {btn.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );

  const WidgetAgendaToday = () => (
    <section className="flex flex-col">
      <div className="flex justify-between items-end mb-4 px-1">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest opacity-60">Agenda du jour</h2>
          <p className="text-[11px] text-slate-400 mt-1">{descByWidget.agenda_today}</p>
        </div>
        <button onClick={() => onNavigate('/agenda')} className={`text-xs font-black ${themeText}`}>
          Tout voir
        </button>
      </div>

      <div className="space-y-3 flex-1">
        {todaysEvents.length > 0 ? (
          todaysEvents.map((evt) => (
            <div
              key={evt.id}
              onClick={() => onEventClick(evt)}
              className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 cursor-pointer transition-transform hover:translate-x-1 ${
                userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
              }`}
            >
              <div
                className={`flex flex-col items-center justify-center min-w-[3.6rem] p-2.5 rounded-xl ${
                  evt.type === 'pro' ? themeLight : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <span className="text-xs font-black">{evt.time}</span>
                <span className="text-[9px] font-semibold opacity-70">{evt.duration}</span>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-black text-sm leading-snug truncate">{evt.title}</h3>

                {evt.linkedContactId && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <User size={10} />
                    {contacts.find((c) => String(c.id) === String(evt.linkedContactId))?.name || 'Contact'}
                  </p>
                )}

                {evt.videoLink && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(evt.videoLink, '_blank');
                    }}
                    className="mt-2 py-1 px-2.5 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black flex items-center gap-2 w-fit"
                  >
                    <Video size={12} /> VISIO
                  </button>
                )}
              </div>

              <ChevronRight size={16} className="text-slate-300" />
            </div>
          ))
        ) : (
          <div
            className={`p-10 text-center border-2 border-dashed rounded-3xl h-full flex flex-col justify-center items-center ${
              userSettings.darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-400'
            }`}
          >
            <p className="text-xs font-semibold">Aucun rendez-vous prévu.</p>
            <button
              onClick={onOpenEventModal}
              className={`mt-3 text-[10px] font-black uppercase tracking-widest ${themeText}`}
            >
              + Ajouter un RDV
            </button>
          </div>
        )}
      </div>
    </section>
  );

  const WidgetSalesPulse = () => (
    <section className="flex flex-col">
      <div className="flex justify-between items-end mb-4 px-1">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest opacity-60">Performance commerciale</h2>
          <p className="text-[11px] text-slate-400 mt-1">{descByWidget.sales_pulse}</p>
        </div>
        <button onClick={() => onNavigate('/groups/crm')} className="text-xs font-black text-violet-600">
          CRM
        </button>
      </div>

      <div
        className={`p-5 rounded-[28px] border shadow-sm ${
          userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
              <TrendingUp size={18} />
            </div>
            <span className="text-sm font-black">Pulse Commercial</span>
          </div>
          <button
            onClick={() => onNavigate('/groups/crm')}
            className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
          >
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div
            className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-transparent hover:border-indigo-200 transition-colors cursor-pointer"
            onClick={() => onNavigate('/groups/crm')}
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-indigo-500">
                <Briefcase size={14} />
              </div>
              <span className="text-xs font-black text-indigo-900 dark:text-indigo-200">Dossiers actifs</span>
            </div>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{salesKPIs.pipeline}</span>
          </div>

          <div
            className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
            onClick={() => onNavigate('/groups/crm')}
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-blue-500">
                <Inbox size={14} />
              </div>
              <span className="text-xs font-black text-blue-900 dark:text-blue-200">Nouvelles demandes</span>
            </div>

            {salesKPIs.newRequests > 0 ? (
              <span className="text-xs font-black bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                {salesKPIs.newRequests}
              </span>
            ) : (
              <span className="text-xs font-black text-blue-400">0</span>
            )}
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800">
            <AlertCircle size={14} className="text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase text-orange-400">Action requise</p>
              <p className="text-xs font-black text-orange-900 dark:text-orange-200 truncate">
                {salesKPIs.urgentAction ? `Relancer ${salesKPIs.urgentAction}` : 'Rien à signaler'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const WidgetActiveGroups = () => (
    <section className="flex flex-col">
      <div className="flex justify-between items-end mb-4 px-1">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest opacity-60">Groupes en maison</h2>
          <p className="text-[11px] text-slate-400 mt-1">{descByWidget.active_groups}</p>
        </div>
        <button onClick={() => onNavigate('/groups/rm')} className={`text-xs font-black ${themeText}`}>
          RM
        </button>
      </div>

      <div className="space-y-3 flex-1">
        {activeGroups.length ? (
          activeGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => onGroupClick(group)}
              className={`p-4 rounded-2xl shadow-sm border-l-4 border-l-violet-500 border-y border-r flex items-center gap-4 cursor-pointer transition-transform hover:translate-x-1 ${
                userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-xs leading-snug truncate">{group.name}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {group.pax} PAX • {group.category}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div
            className={`p-10 text-center border-2 border-dashed rounded-3xl h-full flex flex-col justify-center items-center ${
              userSettings.darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-400'
            }`}
          >
            <p className="text-xs font-semibold">Aucun groupe en cours.</p>
          </div>
        )}
      </div>
    </section>
  );

  const WidgetTasksFocus = () => (
    <section className="flex flex-col">
      <div className="flex justify-between items-end mb-4 px-1">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest opacity-60">Priorités</h2>
          <p className="text-[11px] text-slate-400 mt-1">{descByWidget.tasks_focus}</p>
        </div>
        <button onClick={() => onNavigate('/todo')} className={`text-xs font-black ${themeText}`}>
          Liste complète
        </button>
      </div>

      <div className="space-y-3 flex-1">
        {pendingTasks.map((task) => (
          <div
            key={task.id}
            className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 transition-transform hover:translate-x-1 ${
              userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
            }`}
          >
            <button
              onClick={() => onTaskToggle(task.id)}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                task.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
              }`}
              aria-label="Toggle task"
            >
              {task.done && <CheckSquare size={12} className="text-white" />}
            </button>

            <div className="flex-1 cursor-pointer min-w-0" onClick={() => onTaskClick(task)}>
              <p className={`text-sm font-bold truncate ${task.done ? 'line-through opacity-40' : ''}`}>
                {task.text}
              </p>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1 inline-block ${themeBadge}`}>
                {task.tag}
              </span>
            </div>
          </div>
        ))}

        {pendingTasks.length === 0 && (
          <div className="p-10 text-center border-2 border-dashed rounded-3xl border-emerald-100 bg-emerald-50/20 h-full flex flex-col justify-center items-center">
            <p className="text-emerald-600 text-xs font-black">Tout est sous contrôle !</p>
            <button
              onClick={onOpenTaskModal}
              className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600"
            >
              + Ajouter une tâche
            </button>
          </div>
        )}
      </div>
    </section>
  );

  const renderWidget = (id: string) => {
    switch (id as WidgetId) {
      case 'quick_actions':
        return <WidgetQuickActions />;
      case 'agenda_today':
        return <WidgetAgendaToday />;
      case 'sales_pulse':
        return <WidgetSalesPulse />;
      case 'active_groups':
        return <WidgetActiveGroups />;
      case 'tasks_focus':
        return <WidgetTasksFocus />;
      default:
        return null;
    }
  };

  // --- UI: edit panel items list ---
  const PanelItem: React.FC<{ w: DashboardWidgetConfig }> = ({ w }) => {
    const wid = w.id as WidgetId;
    const label = titleByWidget[wid] || w.id;

    return (
      <div
        className={`p-3 rounded-2xl border flex items-start gap-3 ${
          userSettings.darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'
        }`}
        draggable
        onDragStart={() => (dragIdRef.current = w.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDropReorder(w.id)}
        title="Glisser-déposer pour réordonner"
      >
        <div className="pt-1 text-slate-400">
          <GripVertical size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-black truncate">{label}</p>
              <p className="text-[10px] text-slate-400 truncate">{descByWidget[wid] || 'Widget'}</p>
            </div>

            <button
              onClick={() => toggleWidget(w.id)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                w.enabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              {w.enabled ? 'Actif' : 'Masqué'}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(['sm', 'md', 'lg'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setWidgetSize(w.id, s)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-colors ${
                    w.size === s
                      ? `${themeLight} border-transparent`
                      : userSettings.darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {sizeLabel[s]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => swapOrder(w.id, -1)}
                className={`p-2 rounded-lg border ${
                  userSettings.darkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                aria-label="Monter"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={() => swapOrder(w.id, 1)}
                className={`p-2 rounded-lg border ${
                  userSettings.darkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                aria-label="Descendre"
              >
                <ArrowDown size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:px-6 md:py-5 space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* HERO HEADER */}
      <div
        className={`p-5 md:p-6 rounded-3xl border bg-gradient-to-br from-indigo-500/5 to-purple-500/5 ${
          userSettings.darkMode ? 'border-slate-800' : 'border-slate-100'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="min-w-0">
            <p
              className={`font-semibold text-[10px] uppercase tracking-wider mb-1 ${
                userSettings.darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {prettyDateFR(new Date())}
            </p>
            <h1
              className={`text-2xl md:text-3xl font-extrabold truncate ${
                userSettings.darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              Bonjour, {userSettings.userName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditMode(true)}
              className={`px-4 py-2 rounded-2xl border shadow-sm text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${
                userSettings.darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Settings2 size={16} />
              Personnaliser
            </button>
          </div>
        </div>
      </div>

      {/* WIDGETS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sortedEnabledWidgets.map((w) => (
          <div key={w.id} className={widgetColSpan(w.id, w.size)}>
            {renderWidget(w.id)}
          </div>
        ))}
      </div>

      {/* PERSONALISATION PANEL (overlay) */}
      {editMode && (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditMode(false)} />
          <div
            className={`absolute right-0 top-0 h-full w-full max-w-xl p-4 md:p-6 overflow-y-auto no-scrollbar border-l ${
              userSettings.darkMode
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-black">Personnaliser le dashboard</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Active/masque, change la taille, réordonne (glisser-déposer).
                </p>
              </div>
              <button
                onClick={() => setEditMode(false)}
                className={`p-2 rounded-xl border ${
                  userSettings.darkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {normalizeWidgets(widgetsDraft).map((w) => (
                <PanelItem key={w.id} w={w} />
              ))}
            </div>

            <div className="mt-6 p-4 rounded-2xl border border-dashed text-[11px] text-slate-400">
              💡 Astuce : si tu masques un widget, il reste disponible ici et tu peux le réactiver sans perdre de
              fonctionnalités.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainDashboard;