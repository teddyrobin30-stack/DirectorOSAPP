import React from 'react';
import { 
  CloudSun, ChevronRight, CalendarPlus, CheckSquare, 
  UserPlus, Calendar, Clock, User, Briefcase, Users, Video,
  TrendingUp, Inbox, AlertCircle, ArrowRight
} from 'lucide-react';
import { UserSettings, CalendarEvent, Task, Contact, Group, Lead, InboxItem } from '../types';

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

const MainDashboard: React.FC<MainDashboardProps> = ({ 
  userSettings, events, todos, contacts, groups, leads = [], inbox = [],
  onNavigate, onTaskToggle, onTaskClick, onEventClick, onGroupClick,
  onOpenEventModal, onOpenTaskModal, onOpenContactModal 
}) => {
  const today = new Date();
  
  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getFullYear() === d2.getFullYear();

  const isDateInRange = (d: Date, startStr: string, endStr: string) => {
    const checkDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const start = new Date(startStr);
    const end = new Date(endStr);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    return checkDate >= start && checkDate <= end;
  };

  const todaysEvents = events
    .filter(e => isSameDay(new Date(e.start), today))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const activeGroups = groups.filter(g => isDateInRange(today, g.startDate, g.endDate));
  const pendingTasks = todos.filter(t => !t.done).slice(0, 3);

  const themeLight = `bg-${userSettings.themeColor}-50 text-${userSettings.themeColor}-600`;

  // Sales KPIs
  const salesKPIs = {
    pipeline: leads.filter(l => l.status === 'nouveau' || l.status === 'en_cours').length,
    newRequests: inbox.filter(i => i.status === 'to_process').length,
    urgentAction: leads.find(l => {
        // Simple logic: find a lead created > 7 days ago still 'nouveau'
        const d = new Date(l.requestDate);
        const diff = (today.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff > 7 && l.status === 'nouveau';
    })?.contactName
  };

  return (
    <div className="p-4 md:px-6 md:py-4 space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header and Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
        {/* Welcome */}
        <div className="flex justify-between items-center p-5 md:p-6 rounded-3xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-slate-100 dark:border-slate-800">
          <div className="flex-1">
            <p className={`font-medium text-[10px] uppercase tracking-wider mb-0.5 ${userSettings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className={`text-2xl md:text-3xl font-extrabold truncate pr-2 ${userSettings.darkMode ? 'text-white' : 'text-slate-900'}`}>
              Bonjour, {userSettings.userName}
            </h1>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-3 md:gap-4 h-full">
          {[
            { icon: CalendarPlus, label: 'RDV', color: themeLight, onClick: onOpenEventModal },
            { icon: CheckSquare, label: 'Tâche', color: 'bg-emerald-50 text-emerald-600', onClick: onOpenTaskModal },
            { icon: UserPlus, label: 'Contact', color: 'bg-amber-50 text-amber-600', onClick: onOpenContactModal },
          ].map((btn, i) => (
            <button 
              key={i} 
              onClick={btn.onClick}
              className={`flex-1 p-3 md:p-4 rounded-3xl flex flex-col items-center justify-center gap-2 md:gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-700'}`}
            >
              <div className={`p-2.5 md:p-3 rounded-full ${btn.color}`}>
                <btn.icon size={22} className="md:w-6 md:h-6" />
              </div>
              <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-tight">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Today's Agenda Summary */}
        <section className={`col-span-1 lg:col-span-1 flex flex-col h-full`}>
          <div className="flex justify-between items-end mb-4 px-1">
            <h2 className="text-sm font-bold uppercase tracking-widest opacity-60">Agenda du jour</h2>
            <button onClick={() => onNavigate('agenda')} className={`text-xs font-bold text-${userSettings.themeColor}-600`}>Tout voir</button>
          </div>
          <div className="space-y-3 flex-1">
            {todaysEvents.length > 0 ? todaysEvents.map(evt => (
              <div 
                key={evt.id} 
                onClick={() => onEventClick(evt)}
                className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 cursor-pointer transition-transform hover:translate-x-1 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
              >
                <div className={`flex flex-col items-center justify-center min-w-[3.5rem] p-2.5 rounded-xl ${evt.type === 'pro' ? themeLight : 'bg-emerald-50 text-emerald-700'}`}>
                  <span className="text-xs font-bold">{evt.time}</span>
                  <span className="text-[9px] font-medium opacity-70">{evt.duration}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm leading-snug truncate">{evt.title}</h3>
                  {evt.linkedContactId && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <User size={10} /> {contacts.find(c => c.id.toString() === evt.linkedContactId?.toString())?.name || 'Contact'}
                    </p>
                  )}
                  {evt.videoLink && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); window.open(evt.videoLink, '_blank'); }}
                      className="mt-2 py-1 px-2.5 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black flex items-center gap-2 w-fit"
                    >
                      <Video size={12} /> VISIO
                    </button>
                  )}
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            )) : (
              <div className="p-8 text-center border-2 border-dashed rounded-3xl border-slate-200 h-full flex flex-col justify-center items-center">
                <p className="text-slate-400 text-xs font-medium">Aucun rendez-vous prévu.</p>
              </div>
            )}
          </div>
        </section>

        {/* Pulse Commercial & Groups */}
        <section className={`col-span-1 lg:col-span-1 flex flex-col h-full`}>
          <div className="flex justify-between items-end mb-4 px-1">
            <h2 className="text-sm font-bold uppercase tracking-widest opacity-60">Performance Commerciale</h2>
            <button onClick={() => onNavigate('groups_crm')} className={`text-xs font-bold text-violet-600`}>CRM</button>
          </div>
          
          <div className="space-y-4 flex-1">
             {/* SALES PULSE WIDGET */}
             <div className={`p-5 rounded-[28px] border shadow-sm ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-center mb-4">
                   <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                         <TrendingUp size={18} />
                      </div>
                      <span className="text-sm font-black">Pulse Commercial</span>
                   </div>
                   <button onClick={() => onNavigate('groups_crm')} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"><ArrowRight size={16}/></button>
                </div>
                
                <div className="space-y-3">
                   {/* KPI 1: Pipeline */}
                   <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-transparent hover:border-indigo-200 transition-colors cursor-pointer" onClick={() => onNavigate('groups_crm')}>
                      <div className="flex items-center gap-3">
                         <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-indigo-500"><Briefcase size={14}/></div>
                         <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Dossiers actifs</span>
                      </div>
                      <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{salesKPIs.pipeline}</span>
                   </div>

                   {/* KPI 2: Inbox */}
                   <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-transparent hover:border-blue-200 transition-colors cursor-pointer" onClick={() => onNavigate('groups_crm')}>
                      <div className="flex items-center gap-3">
                         <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-blue-500"><Inbox size={14}/></div>
                         <span className="text-xs font-bold text-blue-900 dark:text-blue-200">Nouvelles demandes</span>
                      </div>
                      {salesKPIs.newRequests > 0 ? (
                        <span className="text-xs font-black bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">{salesKPIs.newRequests}</span>
                      ) : (
                        <span className="text-xs font-bold text-blue-400">0</span>
                      )}
                   </div>

                   {/* KPI 3: Action */}
                   <div className="flex items-center gap-3 p-3 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800">
                      <AlertCircle size={14} className="text-orange-500 shrink-0"/>
                      <div className="flex-1 min-w-0">
                         <p className="text-[9px] font-bold uppercase text-orange-400">Action requise</p>
                         <p className="text-xs font-bold text-orange-900 dark:text-orange-200 truncate">
                           {salesKPIs.urgentAction ? `Relancer ${salesKPIs.urgentAction}` : 'Rien à signaler'}
                         </p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Groups List (Below Pulse) */}
             {activeGroups.length > 0 && (
                <div className="space-y-2">
                   <p className="text-[10px] font-bold uppercase text-slate-400 ml-1">Groupes en maison</p>
                   {activeGroups.map(group => (
                    <div 
                      key={group.id} 
                      onClick={() => onGroupClick(group)}
                      className={`p-4 rounded-2xl shadow-sm border-l-4 border-l-violet-500 border-y border-r flex items-center gap-4 cursor-pointer transition-transform hover:translate-x-1 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xs leading-snug truncate">{group.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">{group.pax} PAX • {group.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
             )}
          </div>
        </section>

        {/* Pending Tasks Summary */}
        <section className={`col-span-1 lg:col-span-1 flex flex-col h-full`}>
          <div className="flex justify-between items-end mb-4 px-1">
            <h2 className="text-sm font-bold uppercase tracking-widest opacity-60">Priorités</h2>
            <button onClick={() => onNavigate('todo')} className={`text-xs font-bold text-${userSettings.themeColor}-600`}>Liste complète</button>
          </div>
          <div className="space-y-3 flex-1">
            {pendingTasks.map(task => (
              <div 
                key={task.id} 
                className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 transition-transform hover:translate-x-1 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
              >
                <button 
                  onClick={() => onTaskToggle(task.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}
                >
                  {task.done && <CheckSquare size={12} className="text-white" />}
                </button>
                <div className="flex-1 cursor-pointer min-w-0" onClick={() => onTaskClick(task)}>
                  <p className={`text-sm font-semibold truncate ${task.done ? 'line-through opacity-40' : ''}`}>{task.text}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-1 inline-block bg-${userSettings.themeColor}-50 text-${userSettings.themeColor}-700`}>{task.tag}</span>
                </div>
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed rounded-3xl border-emerald-100 bg-emerald-50/20 h-full flex flex-col justify-center items-center">
                <p className="text-emerald-500 text-xs font-bold">Tout est sous contrôle !</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MainDashboard;
