import React, { useState, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Plus,
    Calendar as CalendarIcon, Clock, Users, GripHorizontal, Flower2
} from 'lucide-react';
import { UserSettings, SpaRequest } from '../types';

interface SpaCalendarViewProps {
    spaRequests: SpaRequest[];
    userSettings: UserSettings;
    onUpdateRequest: (requestId: string | number, date: string, time: string) => void;
    onSpaClick: (request: SpaRequest) => void;
}

type ViewType = 'day' | 'week' | 'month';

const SpaCalendarView: React.FC<SpaCalendarViewProps> = ({
    spaRequests, userSettings, onUpdateRequest, onSpaClick
}) => {
    const [view, setView] = useState<ViewType>('week');
    const [currentDate, setCurrentDate] = useState(new Date());

    // --- HELPER: SAFE DATE PARSING ---
    const safeDate = (input: any): Date | null => {
        try {
            if (!input) return null;
            if (input instanceof Date) return input;
            const d = new Date(input);
            return isNaN(d.getTime()) ? null : d;
        } catch (e) {
            return null;
        }
    };

    // --- DATA AGGREGATION ---
    const allEvents = useMemo(() => {
        if (!Array.isArray(spaRequests)) return [];

        return spaRequests.map(r => {
            if (!r.date || !r.time) return null;
            const eventId = r.id.toString().startsWith('spa-') ? r.id : `spa-${r.id}`;
            const sDate = safeDate(`${r.date}T${r.time}`);
            if (!sDate) return null;

            return {
                id: eventId,
                title: `${r.isDuo ? '[DUO] ' : ''}${r.clientName}`,
                startObj: sDate,
                displayTime: r.time,
                source: 'SPA',
                color: 'bg-rose-500',
                textColor: 'text-rose-600',
                borderColor: 'border-rose-200',
                lightBg: 'bg-rose-50',
                icon: Flower2,
                original: r
            };
        }).filter((e): e is NonNullable<typeof e> => e !== null);
    }, [spaRequests]);

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
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return Array.from({ length: 7 }, (_, i) => {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + i);
            return dayDate;
        });
    };

    const isSameDate = (d1: Date | null, d2: Date | null) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const navigateDate = (amount: number) => {
        const newDate = new Date(currentDate);
        if (view === 'month') newDate.setMonth(newDate.getMonth() + amount);
        else if (view === 'week') newDate.setDate(newDate.getDate() + amount * 7);
        else newDate.setDate(newDate.getDate() + amount);
        setCurrentDate(newDate);
    };

    // --- DRAG & DROP LOGIC ---
    const handleDragStart = (e: React.DragEvent, event: any) => {
        e.dataTransfer.setData('eventId', event.id.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetDate: Date, hour: number) => {
        e.preventDefault();
        const eventId = e.dataTransfer.getData('eventId');
        const realId = eventId.replace('spa-', '');

        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;

        onUpdateRequest(realId, dateStr, timeStr);
    };

    const themeColor = 'violet';

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Header Mini */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className={`px-4 py-3 flex justify-between items-center border-b ${userSettings.darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white/50'} backdrop-blur-md`}>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-1">
                            <button onClick={() => navigateDate(-1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ChevronLeft size={18} /></button>
                            <button onClick={() => navigateDate(1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ChevronRight size={18} /></button>
                        </div>
                        <h2 className="text-lg font-black capitalize">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h2>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {['day', 'week', 'month'].map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v as ViewType)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${view === v ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                {v === 'day' ? 'Jour' : v === 'week' ? 'Sem' : 'Mois'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                    {view === 'month' && (
                        <div className="grid grid-cols-7 gap-2 auto-rows-fr h-full">
                            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                                <div key={i} className="text-center text-[10px] font-black uppercase text-slate-400 mb-1">{d}</div>
                            ))}
                            {getDaysInMonth(currentDate).map((d, i) => {
                                const dayEvents = allEvents.filter(e => isSameDate(e.startObj, d));
                                return (
                                    <div
                                        key={i}
                                        onClick={() => { setCurrentDate(d); setView('day'); }}
                                        className={`min-h-[100px] border rounded-2xl p-2 flex flex-col gap-1 cursor-pointer transition-all hover:border-violet-400 ${isSameDate(d, new Date()) ? 'bg-violet-50/30' : ''} ${userSettings.darkMode ? 'border-slate-800' : 'border-slate-100'}`}
                                    >
                                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isSameDate(d, new Date()) ? 'bg-violet-600 text-white' : ''}`}>
                                            {d.getDate()}
                                        </span>
                                        <div className="flex flex-col gap-1 overflow-hidden">
                                            {dayEvents.map((e, idx) => {
                                                if (!e) return null;
                                                return (
                                                    <div key={idx} className="text-[9px] px-1.5 py-0.5 rounded truncate font-black bg-rose-50 text-rose-600 border border-rose-100">
                                                        {e.displayTime} {e.title}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {(view === 'week' || view === 'day') && (
                        <div className="flex flex-col gap-4 relative">
                            <div className="flex ml-12">
                                {(view === 'day' ? [currentDate] : getWeekDays(currentDate)).map((d, i) => (
                                    <div key={i} className={`flex-1 text-center py-2 border-b-2 ${isSameDate(d, new Date()) ? 'border-violet-500 text-violet-600' : 'border-transparent'}`}>
                                        <span className="block text-[10px] uppercase font-black text-slate-400">{d.toLocaleString('default', { weekday: 'short' })}</span>
                                        <span className="block text-xl font-black">{d.getDate()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex relative min-h-[1200px]">
                                <div className="w-12 flex flex-col gap-16 text-right pr-4 text-[10px] font-black text-slate-400 pt-2">
                                    {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                                        <div key={h} className="h-16">{h}:00</div>
                                    ))}
                                </div>

                                <div className="flex-1 flex relative">
                                    {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                                        <div key={h} className="absolute inset-x-0 h-[1px] bg-slate-100 dark:bg-slate-800" style={{ top: `${(h - 7) * 80}px` }} />
                                    ))}

                                    {(view === 'day' ? [currentDate] : getWeekDays(currentDate)).map((d, colIdx) => {
                                        const dayEvents = allEvents.filter(e => isSameDate(e.startObj, d));
                                        return (
                                            <div key={colIdx} className="flex-1 relative border-l border-slate-100 dark:border-slate-800">
                                                {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                                                    <div
                                                        key={h}
                                                        className="absolute inset-x-0 h-20 hover:bg-violet-50/10 transition-colors"
                                                        style={{ top: `${(h - 7) * 80}px` }}
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => handleDrop(e, d, h)}
                                                    />
                                                ))}

                                                {dayEvents.map((e, eIdx) => {
                                                    const hour = e.startObj.getHours();
                                                    const min = e.startObj.getMinutes();
                                                    const top = ((hour - 7) * 60 + min) / 60 * 80;

                                                    return (
                                                        <div
                                                            key={eIdx}
                                                            draggable
                                                            onDragStart={(evt) => handleDragStart(evt, e)}
                                                            onClick={() => onSpaClick(e.original)}
                                                            className={`absolute left-1 right-1 p-2 rounded-xl border-l-4 shadow-sm cursor-pointer transition-all hover:brightness-95 z-10 ${e.lightBg} ${e.borderColor} border-l-rose-500`}
                                                            style={{ top: `${top}px`, height: '70px' }}
                                                        >
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <div className="flex items-center gap-1.5 font-black text-rose-600 text-[10px]">
                                                                    <GripHorizontal size={12} className="opacity-30" />
                                                                    <Clock size={10} />
                                                                    {e.displayTime}
                                                                </div>
                                                            </div>
                                                            <div className="font-black text-slate-800 text-[11px] leading-tight truncate">{e.title}</div>
                                                            <div className="text-[9px] text-slate-500 font-bold truncate mt-1 italic">"{e.original.treatment}"</div>
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

export default SpaCalendarView;
