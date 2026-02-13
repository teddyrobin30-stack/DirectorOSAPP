import React, { useMemo } from 'react';
import { Users, TrendingUp, Clock } from 'lucide-react';
import { SpaRequest, UserSettings } from '../../types';

interface WidgetSpaStaffingProps {
    requests: SpaRequest[];
    darkMode: boolean;
}

const WidgetSpaStaffing: React.FC<WidgetSpaStaffingProps> = ({
    requests,
    darkMode
}) => {
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    const staffData = useMemo(() => {
        const dayBookings = requests.filter(r => r.date === todayStr && r.status !== 'refused');

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
                if (slotTotalMinutes >= startTotalMinutes && slotTotalMinutes < endTotalMinutes) {
                    slot.needs += staffMultiplier;
                }
            });
        });

        const maxNeeds = Math.max(...slots.map(s => s.needs), 0);
        const peakTime = slots.find(s => s.needs === maxNeeds)?.time || '--:--';
        const totalManHours = (totalManMinutes / 60).toFixed(1);

        return { slots, maxNeeds, peakTime, totalManHours };
    }, [requests, todayStr]);

    return (
        <div className={`p-5 rounded-[28px] border shadow-sm h-full flex flex-col justify-between ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-50 dark:bg-violet-900/30 text-violet-600 rounded-xl">
                        <Users size={18} />
                    </div>
                    <span className="text-sm font-black uppercase tracking-tight">Staffing Spa</span>
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">Aujourd'hui</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <TrendingUp size={12} />
                        <span className="text-[9px] font-black uppercase">Pic</span>
                    </div>
                    <p className="text-sm font-black">{staffData.maxNeeds} pers.</p>
                </div>
                <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Clock size={12} />
                        <span className="text-[9px] font-black uppercase">Charge</span>
                    </div>
                    <p className="text-sm font-black">{staffData.totalManHours}h</p>
                </div>
            </div>

            <div className="flex gap-1 h-12 items-end">
                {Array.from({ length: 12 }, (_, i) => i + 8).map(h => {
                    const hourStr = h.toString().padStart(2, '0');
                    const hourlyMax = Math.max(...staffData.slots.filter(s => s.time.startsWith(`${hourStr}:`)).map(s => s.needs), 0);

                    return (
                        <div key={h} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                            <div
                                className={`w-full rounded-t-sm transition-all duration-500 ${hourlyMax > 4 ? 'bg-rose-500' : hourlyMax > 2 ? 'bg-amber-500' : 'bg-emerald-500'} ${hourlyMax === 0 ? 'opacity-10' : ''}`}
                                style={{ height: `${Math.max((hourlyMax / (staffData.maxNeeds || 1)) * 100, 4)}%` }}
                            />
                            <span className="text-[7px] font-black text-slate-400">{hourStr}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WidgetSpaStaffing;
