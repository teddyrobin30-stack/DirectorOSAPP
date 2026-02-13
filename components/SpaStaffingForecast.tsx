import React, { useMemo } from 'react';
import { Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { SpaRequest, UserSettings } from '../types';

interface SpaStaffingForecastProps {
    requests: SpaRequest[];
    selectedDate: string;
    userSettings: UserSettings;
}

const SpaStaffingForecast: React.FC<SpaStaffingForecastProps> = ({
    requests,
    selectedDate,
    userSettings
}) => {
    // --- STAFF NEEDS CALCULATION ---
    const staffData = useMemo(() => {
        // 1. Filter bookings for the selected date and confirmed/pending status
        const dayBookings = requests.filter(r => r.date === selectedDate && r.status !== 'refused');

        // 2. Define slots (15-min intervals) from 08:00 to 20:00
        const slots: { time: string; needs: number }[] = [];
        for (let h = 8; h < 20; h++) {
            for (let m = 0; m < 60; m += 15) {
                slots.push({
                    time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
                    needs: 0
                });
            }
        }

        let totalManMinutes = 0;

        // 3. Calculate needs for each slot
        dayBookings.forEach(booking => {
            const [startH, startM] = booking.time.split(':').map(Number);
            const duration = booking.duration || 60;
            const staffMultiplier = booking.isDuo ? 2 : 1;

            totalManMinutes += duration * staffMultiplier;

            const startTotalMinutes = startH * 60 + startM;
            const endTotalMinutes = startTotalMinutes + duration;

            slots.forEach(slot => {
                const [slotH, slotM] = slot.time.split(':').map(Number);
                const slotTotalMinutes = slotH * 60 + slotM;

                // If the booking overlaps with this 15-min slot
                // We consider a slot "occupied" if the booking covers any part of it.
                // Simplified: if slot start is between booking start and booking end
                if (slotTotalMinutes >= startTotalMinutes && slotTotalMinutes < endTotalMinutes) {
                    slot.needs += staffMultiplier;
                }
            });
        });

        const maxNeeds = Math.max(...slots.map(s => s.needs), 0);
        const peakTime = slots.find(s => s.needs === maxNeeds)?.time || '--:--';
        const totalManHours = (totalManMinutes / 60).toFixed(1);

        return { slots, maxNeeds, peakTime, totalManHours };
    }, [requests, selectedDate]);

    const getBarColor = (needs: number) => {
        if (needs === 0) return 'bg-slate-100 dark:bg-slate-800';
        if (needs <= 2) return 'bg-emerald-500';
        if (needs <= 4) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    return (
        <div className="flex flex-col gap-6 p-6 animate-in fade-in slide-in-from-bottom-4">
            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className={`p-4 rounded-3xl border-2 flex items-center gap-4 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="p-3 rounded-2xl bg-violet-100 text-violet-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Pic de besoin</p>
                        <p className="text-xl font-black">{staffData.maxNeeds} Thérapeutes <span className="text-xs text-slate-400 font-bold ml-1">à {staffData.peakTime}</span></p>
                    </div>
                </div>

                <div className={`p-4 rounded-3xl border-2 flex items-center gap-4 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Charge de travail totale</p>
                        <p className="text-xl font-black">{staffData.totalManHours} Heures-soin</p>
                    </div>
                </div>

                {staffData.maxNeeds > 4 && (
                    <div className="p-4 rounded-3xl bg-rose-50 border-2 border-rose-100 flex items-center gap-4 text-rose-600">
                        <AlertTriangle size={24} />
                        <div>
                            <p className="text-[10px] font-black uppercase opacity-60">Alerte Capacité</p>
                            <p className="text-sm font-black italic">Pic d'activité critique détecté.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Hourly Summary Table */}
            <div className={`p-5 rounded-[32px] border-2 shadow-sm ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-2 mb-4">
                    <Users size={18} className="text-violet-600" />
                    <h3 className="text-sm font-black uppercase tracking-tight">Récapitulatif Horaire (Pers. requis)</h3>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 8).map(h => {
                        const hourStr = h.toString().padStart(2, '0');
                        // Get max need for this hour (from its 4 slots)
                        const hourlyMax = Math.max(...staffData.slots
                            .filter(s => s.time.startsWith(`${hourStr}:`))
                            .map(s => s.needs), 0);

                        return (
                            <div key={h} className={`p-2 rounded-2xl border flex flex-col items-center justify-center transition-all ${hourlyMax > 0 ? 'bg-violet-50 border-violet-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                <span className="text-[9px] font-black text-slate-400">{hourStr}h</span>
                                <span className={`text-sm font-black ${hourlyMax > 4 ? 'text-rose-600' : hourlyMax > 2 ? 'text-amber-600' : 'text-slate-900'}`}>{hourlyMax}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Visual Timeline */}
            <div className={`p-6 rounded-[32px] border-2 ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h3 className="text-lg font-black italic flex items-center gap-2">
                            <Users size={20} className="text-violet-600" />
                            Prévisions de Personnel
                        </h3>
                        <p className="text-xs text-slate-400 font-bold">Heure par heure pour le {new Date(selectedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
                    </div>
                    <div className="flex gap-4">
                        {[
                            { label: 'Calme', color: 'bg-emerald-500' },
                            { label: 'Modéré', color: 'bg-amber-500' },
                            { label: 'Pic', color: 'bg-rose-500' }
                        ].map(c => (
                            <div key={c.label} className="flex items-center gap-1.5 uppercase text-[9px] font-black text-slate-400">
                                <div className={`w-2 h-2 rounded-full ${c.color}`} /> {c.label}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative h-64 flex items-end gap-1 px-2">
                    {/* Y-Axis labels */}
                    <div className="absolute left-[-30px] inset-y-0 flex flex-col justify-between text-[10px] font-black text-slate-300 pointer-events-none">
                        <span>8</span>
                        <span>6</span>
                        <span>4</span>
                        <span>2</span>
                        <span>0</span>
                    </div>

                    {/* Bars */}
                    {staffData.slots.map((slot, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                            <div
                                className={`w-full rounded-t-lg transition-all duration-500 ${getBarColor(slot.needs)}`}
                                style={{ height: `${(slot.needs / 8) * 100}%`, minHeight: '4px' }}
                            />
                            {/* Hover info */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20">
                                <div className="bg-slate-800 text-white px-2 py-1 rounded-lg text-[10px] whitespace-nowrap font-black shadow-xl">
                                    {slot.time} : {slot.needs} pers.
                                </div>
                                <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 -mt-1" />
                            </div>
                            {/* X-Axis labels (every hour) */}
                            {slot.time.endsWith(':00') && (
                                <span className="absolute top-full mt-2 text-[9px] font-black text-slate-400">
                                    {slot.time.split(':')[0]}h
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SpaStaffingForecast;
