
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, 
  Calendar as CalendarIcon, Clock, MapPin, 
  Layers, ListFilter, CalendarDays, Users, RefreshCw, CheckCircle2, Video, Tag, Briefcase
} from 'lucide-react';
import { CalendarEvent, UserSettings, Group, Task } from '../types';

interface AgendaViewProps {
  events: CalendarEvent[];
  todos: Task[];
  userSettings: UserSettings;
  onAdd: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onGroupClick: (group: Group) => void;
  groups: Group[];
}

const AgendaView: React.FC<AgendaViewProps> = ({ events, todos, userSettings, onAdd, onEventClick, onGroupClick, groups }) => {
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filters = [
    { id: 'ALL', label: 'Toutes' },
    { id: 'RDV', label: 'Rendez-vous' },
    { id: 'GROUPE', label: 'Groupes' },
    { id: 'PERSO', label: 'Perso' },
    { id: 'F&B', label: 'F&B' },
    { id: 'MAINTENANCE', label: 'Maintenance' },
    { id: 'RH', label: 'RH' },
    { id: 'TRAVAUX', label: 'Travaux' },
  ];

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getFullYear() === d2.getFullYear();

  const isDateInRange = (d: Date, startStr: string, endStr: string) => {
    if (!startStr || !endStr) return false;
    const checkDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const start = new Date(startStr);
    const end = new Date(endStr);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    return checkDate >= start && checkDate <= end;
  };

  // Helper to get items for a specific date and apply active filter
  const getItemsForDate = (date: Date) => {
    let dayEvts = events.filter(e => isSameDay(new Date(e.start), date));
    // Filter Pipeline Groups: Must have valid dates
    let dayGroups = groups.filter(g => g.startDate && g.endDate && isDateInRange(date, g.startDate, g.endDate));
    let dayTasks = todos.filter(t => t.date && isSameDay(new Date(t.date), date));

    if (activeFilter !== 'ALL') {
      if (activeFilter === 'RDV') {
        dayEvts = dayEvts.filter(e => e.type === 'pro' || e.type === 'google');
        dayGroups = [];
        dayTasks = [];
      } else if (activeFilter === 'GROUPE') {
        dayEvts = [];
        dayTasks = [];
      } else if (activeFilter === 'PERSO') {
        dayEvts = dayEvts.filter(e => e.type === 'perso');
        dayGroups = [];
        dayTasks = dayTasks.filter(t => t.tag === 'Perso');
      } else {
        // Filter by specific Task Tag (F&B, Maintenance, etc.)
        dayEvts = [];
        dayGroups = [];
        dayTasks = dayTasks.filter(t => t.tag.toUpperCase() === activeFilter);
      }
    }

    return { events: dayEvts, groups: dayGroups, tasks: dayTasks };
  };

  // Month Grid Logic
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    let startDay = firstDayOfMonth.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;
    
    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push({ day: null, date: null });
    }
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push({ day: i, date: new Date(year, month, i) });
    }
    return days;
  }, [currentDate]);

  // Week Logic
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    
    return Array.from({ length: 7 }).map((_, i) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      return dayDate;
    });
  }, [currentDate]);

  const changeDate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === 'month') {
      d.setMonth(d.getMonth() + dir);
    } else if (view === 'week') {
      d.setDate(d.getDate() + (dir * 7));
    } else {
      d.setDate(d.getDate() + dir);
    }
    setCurrentDate(d);
  };

  const themeHex = `text-${userSettings.themeColor}-600`;
  const themeBg = `bg-${userSettings.themeColor}-600`;

  const renderItemList = (date: Date) => {
    const { events: dEvents, groups: dGroups, tasks: dTasks } = getItemsForDate(date);
    
    if (dEvents.length === 0 && dGroups.length === 0 && dTasks.length === 0) {
      return (
        <div className="py-12 text-center opacity-30 animate-in fade-in zoom-in duration-300">
          <CalendarDays size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Rien à signaler</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
        
        {/* PIPELINE GROUPS OVERLAY - Distinct Visuals */}
        {dGroups.map(g => {
          const isConfirmed = g.status === 'confirmed';
          return (
            <div 
              key={`g-${g.id}`} 
              onClick={() => onGroupClick(g)} // REDIRECT TO DETAIL (READ ONLY IN CALENDAR)
              className={`p-4 rounded-2xl border-l-[6px] shadow-sm cursor-pointer transition-all hover:translate-x-1 active:scale-[0.98] ${
                isConfirmed 
                  ? 'border-l-violet-500 bg-violet-50 dark:bg-violet-900/10 border-y border-r border-violet-100 dark:border-violet-900' 
                  : 'border-l-amber-400 bg-amber-50 dark:bg-amber-900/10 border-y border-r border-amber-100 dark:border-amber-900'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${isConfirmed ? 'text-violet-600' : 'text-amber-600'}`}>
                  <Briefcase size={10} /> {isConfirmed ? 'Confirmé' : 'Option'}
                </span>
                {/* Visual Indicator that this is a Group Event */}
                <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase text-white ${isConfirmed ? 'bg-violet-500' : 'bg-amber-400'}`}>
                  Groupe
                </div>
              </div>
              <h4 className={`font-bold text-sm leading-snug ${userSettings.darkMode ? 'text-white' : 'text-slate-900'}`}>
                {g.name} <span className="opacity-60 font-normal">({isConfirmed ? 'Confirmé' : 'Option'})</span>
              </h4>
              <div className={`flex items-center gap-3 mt-2 text-[10px] font-medium ${isConfirmed ? 'text-violet-400' : 'text-amber-500'}`}>
                 <span>{g.pax} PAX</span>
                 <span>•</span>
                 <span>{g.nights} Nuits</span>
              </div>
            </div>
          );
        })}

        {/* TASKS */}
        {dTasks.map(t => (
          <div key={`t-${t.id}`} className={`p-5 rounded-[28px] border-2 shadow-sm transition-all ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-emerald-50/30 border-emerald-100'}`}>
            <span className="text-[8px] font-black uppercase text-emerald-600 mb-1.5 block flex items-center gap-1 tracking-widest">
              <CheckCircle2 size={10} /> Tâche • {t.tag}
            </span>
            <h4 className={`font-bold text-sm ${t.done ? 'line-through opacity-50' : ''}`}>{t.text}</h4>
          </div>
        ))}

        {/* STANDARD EVENTS */}
        {dEvents.map(evt => (
          <div key={`e-${evt.id}`} onClick={() => onEventClick(evt)} className={`p-5 rounded-[28px] border-2 shadow-sm cursor-pointer transition-all active:scale-[0.98] ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-50 hover:border-indigo-100'}`}>
            <div className="flex justify-between items-start mb-1.5">
              <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${evt.type === 'google' ? 'text-blue-500' : (evt.type === 'perso' ? 'text-amber-500' : themeHex)}`}>
                <Clock size={10} /> {evt.time} • {evt.type === 'perso' ? 'Personnel' : 'Professionnel'}
              </span>
              <div className={`w-2 h-2 rounded-full ${evt.type === 'perso' ? 'bg-amber-500' : themeBg}`}></div>
            </div>
            <h4 className="font-bold text-sm">{evt.title}</h4>
            {evt.videoLink && (
              <button 
                onClick={(e) => { e.stopPropagation(); window.open(evt.videoLink, '_blank'); }}
                className="mt-4 w-full py-2.5 px-3 rounded-2xl bg-blue-50 text-blue-600 text-[10px] font-black flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors shadow-sm"
              >
                <Video size={14} /> REJOINDRE VISIO
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in relative">
      {/* Header */}
      <div className={`p-6 pb-4 flex justify-between items-center ${userSettings.darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <h2 className="text-xl font-black capitalize tracking-tight">
          {view === 'month' 
            ? currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            : view === 'week'
              ? `Sem. ${Math.ceil(currentDate.getDate() / 7)} - ${currentDate.toLocaleDateString('fr-FR', { month: 'short' })}`
              : currentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
          }
        </h2>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5">
            <button onClick={() => changeDate(-1)} className="p-2 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-all"><ChevronLeft size={18}/></button>
            <button onClick={() => changeDate(1)} className="p-2 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-all"><ChevronRight size={18}/></button>
          </div>
          <button 
            onClick={onAdd}
            className={`p-2.5 rounded-2xl text-white shadow-xl ${themeBg} transition-all active:scale-90 hover:opacity-90`}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="px-6 pb-4">
        <div className={`flex p-1 rounded-2xl ${userSettings.darkMode ? 'bg-slate-800' : 'bg-slate-200/50'}`}>
          {(['day', 'week', 'month'] as const).map((v) => (
            <button 
              key={v}
              onClick={() => setView(v)} 
              className={`flex-1 py-2 text-[9px] font-black rounded-xl uppercase tracking-widest transition-all ${view === v ? 'bg-white shadow-sm ' + themeHex : 'text-slate-400'}`}
            >
              {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Chips - Fix: More compact size (py-1.5, px-4, rounded-full) */}
      <div className="w-full pb-4 pt-1">
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-6 snap-x">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 snap-center ${activeFilter === filter.id ? `bg-slate-900 border-slate-900 text-white shadow-md` : `${userSettings.darkMode ? 'bg-slate-800 border-transparent text-slate-400' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}`}
            >
              {filter.label}
            </button>
          ))}
          {/* Spacer to fix clipping at the very end of scroll */}
          <div className="min-w-[24px] h-1" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 no-scrollbar pb-32">
        {view === 'month' ? (
          <div className={`p-6 rounded-[36px] border shadow-sm ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-50'}`}>
            <div className="grid grid-cols-7 gap-1 mb-5 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <span key={d} className="w-full">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-4 gap-x-1">
              {monthData.map((item, i) => {
                if (!item.date) return <div key={`empty-${i}`} className="aspect-square" />;
                const { events: eCount, groups: gCount, tasks: tCount } = getItemsForDate(item.date);
                const hasSomething = eCount.length > 0 || gCount.length > 0 || tCount.length > 0;
                const isToday = isSameDay(item.date, new Date());
                const isSelected = isSameDay(item.date, currentDate);

                return (
                  <button 
                    key={`day-${i}`}
                    onClick={() => { setCurrentDate(item.date!); setView('day'); }}
                    className={`aspect-square relative rounded-[18px] flex flex-col items-center justify-center transition-all ${isSelected ? themeBg + ' text-white shadow-lg scale-110 z-10' : isToday ? 'bg-slate-100 dark:bg-slate-700 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <span className="text-xs font-bold">{item.day}</span>
                    {hasSomething && !isSelected && (
                      <div className="absolute bottom-1.5 flex gap-0.5">
                        <div className={`w-1 h-1 rounded-full ${gCount.length > 0 ? 'bg-violet-500' : eCount.length > 0 ? themeBg : 'bg-emerald-500'}`} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : view === 'week' ? (
          <div className="space-y-10">
            {weekDays.map((day, idx) => (
              <div key={`week-day-${idx}`} className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap ${isSameDay(day, new Date()) ? themeHex : 'text-slate-300'}`}>
                    {day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800"></div>
                </div>
                {renderItemList(day)}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center gap-5">
               <div className={`w-14 h-14 rounded-3xl flex flex-col items-center justify-center ${themeBg} text-white shadow-xl`}>
                  <span className="text-[9px] font-black uppercase tracking-tighter">{currentDate.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                  <span className="text-xl font-black">{currentDate.getDate()}</span>
               </div>
               <div>
                  <h3 className="font-black text-lg tracking-tight">{currentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Layers size={12} /> {activeFilter === 'ALL' ? 'Vue d\'ensemble' : filters.find(f => f.id === activeFilter)?.label}
                  </p>
               </div>
            </div>
            <div className="pt-2">
              {renderItemList(currentDate)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgendaView;
