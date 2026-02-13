import React, { useState, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Plus,
    Calendar as CalendarIcon, Clock, MapPin,
    Layers, ListFilter, CalendarDays, Users, RefreshCw, CheckCircle2, Video, Tag, Briefcase,
    Filter, MoreHorizontal, Mail, MessageCircle, Phone, AlertTriangle
} from 'lucide-react';
import { CalendarEvent, UserSettings, Group, Task, SpaRequest, Lead } from '../types';

interface CalendarViewProps {
    events: CalendarEvent[];
    todos: Task[];
    userSettings: UserSettings;
    onAdd: () => void;
    onEventClick: (event: any) => void;
    onGroupClick: (group: Group) => void;
    groups: Group[];
    spaRequests: SpaRequest[];
    leads: Lead[];
    onUpdateEvent?: (event: CalendarEvent) => void;
}

type ViewType = 'day' | 'week' | 'month';
type FilterType = 'MY_AGENDA' | 'SPA' | 'CRM' | 'TASKS' | 'GROUPS';

const CalendarView: React.FC<CalendarViewProps> = ({
    events, todos, userSettings, onAdd, onEventClick, onGroupClick, groups, spaRequests, leads, onUpdateEvent
}) => {
    const [view, setView] = useState<ViewType>('week');
    const [currentDate, setCurrentDate] = useState(new Date());

    const [filters, setFilters] = useState<Record<FilterType, boolean>>({
        MY_AGENDA: true,
        SPA: true,
        CRM: true,
        TASKS: true,
        GROUPS: true
    });

    const toggleFilter = (key: FilterType) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // --- HELPER: SAFE DATE PARSING ---
    const safeDate = (input: any): Date | null => {
        try {
            if (!input) return null;
            if (input instanceof Date) return input;
            if (typeof input === 'object' && input.seconds) return new Date(input.seconds * 1000); // Firestore
            if (typeof input === 'string') return new Date(input);
            return null;
        } catch (e) {
            console.warn("Date parsing error:", input);
            return null;
        }
    };

    // --- 1. DATA AGGREGATION (DEFENSIVE) ---
    const allEvents = useMemo(() => {
        let aggregated: any[] = [];

        // 1. My Agenda (Events)
        if (filters.MY_AGENDA && Array.isArray(events)) {
            aggregated = aggregated.concat(events.map(e => {
                const sd = safeDate(e.start);
                if (!sd) return null;
                return {
                    ...e,
                    source: 'MY_AGENDA',
                    color: 'bg-indigo-500',
                    textColor: 'text-indigo-600',
                    borderColor: 'border-indigo-200',
                    lightBg: 'bg-indigo-50',
                    icon: CalendarIcon,
                    startObj: sd,
                    displayTime: e.time || '00:00'
                };
            }).filter(Boolean));
        }

        // 2. Spa Requests
        if (filters.SPA && Array.isArray(spaRequests)) {
            aggregated = aggregated.concat(spaRequests.map(r => {
                if (!r.date || !r.time) return null;
                return {
                    id: `spa-${r.id}`,
                    title: `💆‍♀️ Soin: ${r.clientName}`,
                    startObj: safeDate(`${r.date}T${r.time}`),
                    displayTime: r.time,
                    source: 'SPA',
                    color: 'bg-rose-500',
                    textColor: 'text-rose-600',
                    borderColor: 'border-rose-200',
                    lightBg: 'bg-rose-50',
                    icon: Users, // Fallback icon
                    original: r
                };
            }).filter(Boolean));
        }

        // 3. CRM Leads
        if (filters.CRM && Array.isArray(leads)) {
            aggregated = aggregated.concat(leads.map(l => {
                const sd = safeDate(l.requestDate); // Fallback to requestDate
                if (!sd) return null;
                return {
                    id: `lead-${l.id}`,
                    title: `📞 Rappel: ${l.contactName}`,
                    startObj: sd,
                    displayTime: '09:00',
                    source: 'CRM',
                    color: 'bg-orange-500',
                    textColor: 'text-orange-600',
                    borderColor: 'border-orange-200',
                    lightBg: 'bg-orange-50',
                    icon: Phone,
                    original: l
                };
            }).filter(Boolean));
        }

        // 4. Tasks
        if (filters.TASKS && Array.isArray(todos)) {
            aggregated = aggregated.concat(todos.filter(t => t.dueDate).map(t => {
                const sd = safeDate(t.dueDate);
                if (!sd) return null;
                return {
                    id: `task-${t.id}`,
                    title: `✅ ${t.text}`,
                    startObj: sd,
                    displayTime: 'All Day',
                    source: 'TASKS',
                    color: 'bg-emerald-500',
                    textColor: 'text-emerald-600',
                    borderColor: 'border-emerald-200',
                    lightBg: 'bg-emerald-50',
                    icon: CheckCircle2,
                    original: t
                };
            }).filter(Boolean));
        }

        // 5. Groups
        if (filters.GROUPS && Array.isArray(groups)) {
            aggregated = aggregated.concat(groups.map(g => {
                const sd = safeDate(g.startDate);
                const ed = safeDate(g.endDate);
                if (!sd || !ed) return null;
                return {
                    id: `img-${g.id}`,
                    title: `🏨 ${g.name} (${g.status})`,
                    startObj: sd,
                    endObj: ed,
                    displayTime: 'All Day',
                    source: 'GROUPS',
                    color: g.status === 'confirmed' ? 'bg-violet-600' : 'bg-amber-500',
                    textColor: g.status === 'confirmed' ? 'text-violet-600' : 'text-amber-600',
                    borderColor: g.status === 'confirmed' ? 'border-violet-200' : 'border-amber-200',
                    lightBg: g.status === 'confirmed' ? 'bg-violet-50' : 'bg-amber-50',
                    icon: Briefcase,
                    original: g
                };
            }).filter(Boolean));
        }

        return aggregated;
    }, [events, spaRequests, leads, todos, groups, filters]);

    // --- HELPER FUNCTIONS ---
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
    };

    const getWeekDays = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
        const monday = new Date(d.setDate(diff));
        return Array.from({ length: 7 }, (_, i) => {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + i);
            return dayDate;
        });
    };

    const isThinkingDate = (d1: any, d2: any) => {
        if (!d1 || !d2) return false;
        const safeD1 = safeDate(d1);
        const safeD2 = safeDate(d2);
        if (!safeD1 || !safeD2) return false;
        return safeD1.getFullYear() === safeD2.getFullYear() &&
            safeD1.getMonth() === safeD2.getMonth() &&
            safeD1.getDate() === safeD2.getDate();
    };

    const navigateDate = (amount: number) => {
        const newDate = new Date(currentDate);
        if (view === 'month') newDate.setMonth(newDate.getMonth() + amount);
        else if (view === 'week') newDate.setDate(newDate.getDate() + amount * 7);
        else newDate.setDate(newDate.getDate() + amount);
        setCurrentDate(newDate);
    };

    // --- DRAG & DROP LOGIC ---
    const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
        e.dataTransfer.setData('eventId', event.id.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetDate: Date, hour: number) => {
        e.preventDefault();
        const eventId = e.dataTransfer.getData('eventId');
        const eventToMove = events.find(ev => ev.id.toString() === eventId);

        if (eventToMove && onUpdateEvent) {
            const newStart = new Date(targetDate);
            newStart.setHours(hour);
            newStart.setMinutes(0); // Snap to top of hour for simplicity

            const durationMs = new Date(eventToMove.end).getTime() - new Date(eventToMove.start).getTime();
            const newEnd = new Date(newStart.getTime() + (isNaN(durationMs) ? 3600000 : durationMs));

            const updatedEvent = {
                ...eventToMove,
                start: newStart,
                end: newEnd,
                time: `${hour.toString().padStart(2, '0')}:00`
            };

            onUpdateEvent(updatedEvent);
        }
    };

    const themeColor = userSettings.themeColor;

    return (
        <div className={`flex h-full w-full overflow-hidden animate-in fade-in duration-500 ${userSettings.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

            {/* --- SIDEBAR (20%) --- */}
            <div className={`w-64 flex-shrink-0 flex flex-col border-r p-6 overflow-y-auto hidden md:flex ${userSettings.darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>

                {/* CREATE BTN */}
                <button
                    onClick={onAdd}
                    className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-black shadow-xl transition-all hover:scale-[1.02] active:scale-95 text-white bg-gradient-to-r from-${themeColor}-600 to-${themeColor}-500`}
                >
                    <Plus size={20} /> Nouveau
                </button>

                {/* MINI CALENDAR (Visual Only for now) */}
                <div className="mt-8 mb-8">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="font-bold text-sm capitalize">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                        <div className="flex gap-1">
                            <button onClick={() => navigateDate(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><ChevronLeft size={16} /></button>
                            <button onClick={() => navigateDate(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                    {/* Simple Grid for Mini Cal */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 font-bold mb-2">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => <span key={d}>{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {getDaysInMonth(currentDate).map((d, i) => (
                            <button
                                key={i}
                                onClick={() => { setCurrentDate(d); setView('day'); }}
                                className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${isThinkingDate(d, currentDate) ? `bg-${themeColor}-600 text-white font-bold` : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {d.getDate()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* FILTERS */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest px-2">Mes Calendriers</h3>

                    <div className="space-y-2">
                        {[
                            { key: 'MY_AGENDA', label: 'Mon Agenda', color: 'bg-indigo-500', icon: CalendarIcon },
                            { key: 'SPA', label: 'Spa & Soins', color: 'bg-rose-500', icon: Users },
                            { key: 'CRM', label: 'Pipeline / CRM', color: 'bg-orange-500', icon: Phone },
                            { key: 'TASKS', label: 'Tâches', color: 'bg-emerald-500', icon: CheckCircle2 },
                            { key: 'GROUPS', label: 'Groupes', color: 'bg-violet-600', icon: Briefcase },
                        ].map((f) => (
                            <div key={f.key} onClick={() => toggleFilter(f.key as FilterType)} className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${filters[f.key as FilterType] ? f.color + ' border-transparent' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {filters[f.key as FilterType] && <CheckCircle2 size={12} className="text-white" />}
                                </div>
                                <span className={`text-sm font-medium ${filters[f.key as FilterType] ? '' : 'text-slate-400 line-through'}`}>{f.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* --- MAIN CONTENT (80%) --- */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">

                {/* HEADER */}
                <div className={`px-4 md:px-6 py-4 flex justify-between items-center border-b ${userSettings.darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white/50'} backdrop-blur-md`}>
                    <div className="flex items-center gap-2 md:gap-4">
                        <button onClick={() => setCurrentDate(new Date())} className="hidden md:block px-4 py-2 rounded-lg border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700">Aujourd'hui</button>
                        <div className="flex gap-1">
                            <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><ChevronLeft size={20} /></button>
                            <button onClick={() => navigateDate(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><ChevronRight size={20} /></button>
                        </div>
                        <h2 className="text-lg md:text-xl font-black capitalize truncate max-w-[150px] md:max-w-none">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h2>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {['day', 'week', 'month'].map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v as ViewType)}
                                className={`px-3 md:px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${view === v ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                {v === 'day' ? 'Jour' : v === 'week' ? 'Sem' : 'Mois'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* GRID */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-2 md:p-6">

                    {/* EMPTY STATE */}
                    {allEvents.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 opacity-50">
                            <CalendarDays size={48} className="mb-4 text-slate-300" />
                            <p className="text-sm font-black uppercase text-slate-400">Aucun événement à afficher</p>
                        </div>
                    )}

                    {/* MONTH VIEW */}
                    {view === 'month' && (
                        <div className="grid grid-cols-7 auto-rows-fr h-full gap-1 md:gap-2">
                            {/* Weekday Headers */}
                            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
                                <div key={d} className="text-center text-[10px] font-black uppercase text-slate-400 mb-2">{d}</div>
                            ))}
                            {/* Days */}
                            {getDaysInMonth(currentDate).map((d, i) => {
                                const dayEvents = allEvents.filter(e => isThinkingDate(e.startObj, d));
                                return (
                                    <div
                                        key={i}
                                        onClick={() => { setCurrentDate(d); setView('day'); }}
                                        className={`min-h-[80px] md:min-h-[100px] border rounded-2xl p-1 md:p-2 flex flex-col gap-1 cursor-pointer transition-all hover:border-${themeColor}-400 ${isThinkingDate(d, new Date()) ? 'bg-slate-50 dark:bg-slate-800/50' : ''} ${userSettings.darkMode ? 'border-slate-700' : 'border-slate-100'}`}
                                    >
                                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isThinkingDate(d, new Date()) ? `bg-${themeColor}-600 text-white` : ''}`}>
                                            {d.getDate()}
                                        </span>

                                        {/* Events Dots/Bars */}
                                        <div className="flex-1 flex flex-col gap-1 mt-1 overflow-hidden">
                                            {dayEvents.slice(0, 3).map((e, idx) => (
                                                <div key={idx} className={`text-[9px] px-1 md:px-1.5 py-0.5 rounded truncate font-medium ${e.lightBg} ${e.textColor} hidden md:block`}>
                                                    {e.title}
                                                </div>
                                            ))}
                                            {/* Mobile Dots */}
                                            <div className="flex gap-0.5 md:hidden flex-wrap">
                                                {dayEvents.map((_, idx) => (
                                                    <div key={idx} className={`w-1.5 h-1.5 rounded-full bg-${themeColor}-500`}></div>
                                                ))}
                                            </div>
                                            {dayEvents.length > 3 && (
                                                <span className="text-[9px] text-slate-400 font-bold pl-1 hidden md:block">+{dayEvents.length - 3} autres</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* WEEK VIEW (Time Grid) */}
                    {(view === 'week' || view === 'day') && (
                        <div className="flex flex-col gap-4">
                            {/* Days Header */}
                            <div className="flex ml-10 md:ml-14">
                                {(view === 'day' ? [currentDate] : getWeekDays(currentDate)).map((d, i) => (
                                    <div key={i} className={`flex-1 text-center py-2 border-b-2 ${isThinkingDate(d, new Date()) ? `border-${themeColor}-500 text-${themeColor}-600` : 'border-transparent'}`}>
                                        <span className="block text-[10px] uppercase font-bold text-slate-400">{d.toLocaleString('default', { weekday: 'short' })}</span>
                                        <span className="block text-lg md:text-xl font-black">{d.getDate()}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Time Grid (Scrollable) */}
                            <div className="flex relative">
                                {/* Time Labels */}
                                <div className="w-10 md:w-14 flex flex-col gap-10 text-right pr-2 md:pr-4 text-[10px] md:text-xs font-bold text-slate-400 pt-3">
                                    {Array.from({ length: 15 }, (_, i) => i + 7).map(h => ( // 07:00 to 21:00
                                        <div key={h} className="h-20">{h}:00</div>
                                    ))}
                                </div>

                                {/* Columns */}
                                <div className="flex-1 flex relative">
                                    {/* Horizontal Grid Lines */}
                                    {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                                        <div
                                            key={h}
                                            className="absolute inset-x-0 h-[1px] bg-slate-100 dark:bg-slate-800"
                                            style={{ top: `${(h - 7) * 80}px` }}
                                        />
                                    ))}

                                    {(view === 'day' ? [currentDate] : getWeekDays(currentDate)).map((d, colIdx) => {
                                        const dayEvents = allEvents.filter(e => isThinkingDate(e.startObj, d));
                                        return (
                                            <div
                                                key={colIdx}
                                                className="flex-1 relative border-l border-slate-100 dark:border-slate-800 min-h-[1200px]"
                                            >
                                                {/* Drop Zones for each hour */}
                                                {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                                                    <div
                                                        key={h}
                                                        className="absolute inset-x-0 h-20 hover:bg-indigo-50/20 dark:hover:bg-indigo-900/20 transition-colors z-0"
                                                        style={{ top: `${(h - 7) * 80}px` }}
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => handleDrop(e, d, h)}
                                                    />
                                                ))}

                                                {dayEvents.map((e, eIdx) => {
                                                    // Calculate Top offset based on time (simple parsing)
                                                    let hour = 9;
                                                    let min = 0;

                                                    try {
                                                        // Try to parse displayTime "HH:MM"
                                                        if (e.displayTime && typeof e.displayTime === 'string' && e.displayTime.includes(':')) {
                                                            const parts = e.displayTime.split(':');
                                                            hour = parseInt(parts[0]) || 9;
                                                            min = parseInt(parts[1]) || 0;
                                                        } else if (e.startObj && e.startObj instanceof Date) {
                                                            hour = e.startObj.getHours();
                                                            min = e.startObj.getMinutes();
                                                        }
                                                    } catch (err) {
                                                        hour = 9; min = 0;
                                                    }

                                                    const startMin = (hour - 7) * 60 + min; // Offset from 7am
                                                    const top = (startMin / 60) * 80; // 80px per hour

                                                    if (top < 0) return null; // Before 7am

                                                    return (
                                                        <div
                                                            key={eIdx}
                                                            draggable={e.source === 'MY_AGENDA'} // Only allow drag for my agenda items
                                                            onDragStart={(evt) => handleDragStart(evt, e.original || e)}
                                                            onClick={(evt) => {
                                                                evt.stopPropagation();
                                                                onEventClick(e.original || e);
                                                            }}
                                                            className={`absolute left-0.5 right-0.5 md:left-1 md:right-1 p-1 md:p-2 rounded-xl border border-l-4 shadow-sm cursor-pointer hover:brightness-95 transition-all text-xs z-10 ${e.source === 'MY_AGENDA' ? 'cursor-move' : ''} ${e.lightBg} ${e.borderColor} ${e.color.replace('bg-', 'border-l-')}`}
                                                            style={{ top: `${top}px`, height: '70px' }}
                                                        >
                                                            <div className={`font-bold ${e.textColor} flex items-center gap-1`}>
                                                                {/* Grip Icon for Draggable */}
                                                                {e.source === 'MY_AGENDA' && <div className="hidden md:block w-3 h-3 rounded-full bg-black/10 mr-1 cursor-grab" />}
                                                                {e.icon && <e.icon size={12} className="flex-shrink-0" />}
                                                                <span className="truncate">{e.displayTime}</span>
                                                            </div>
                                                            <div className="font-semibold truncate leading-tight mt-0.5">{e.title}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
};

export default CalendarView;
