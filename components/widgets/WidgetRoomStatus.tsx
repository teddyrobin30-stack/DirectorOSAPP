import React from 'react';
import { BedDouble, CheckCircle2, XCircle, RefreshCw, AlertOctagon } from 'lucide-react';

interface WidgetRoomStatusProps {
    darkMode: boolean;
}

const WidgetRoomStatus: React.FC<WidgetRoomStatusProps> = ({ darkMode }) => {
    // Mock Data
    const stats = {
        total: 120,
        clean: 85,
        dirty: 25,
        inspection: 8,
        ooo: 2 // Out of Order
    };

    const progress = Math.round((stats.clean / stats.total) * 100);

    return (
        <section className="flex flex-col h-full">
            <div className="flex justify-between items-end mb-4 px-1">
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest opacity-60">État des Chambres</h2>
                    <p className="text-[11px] text-slate-400 mt-1">Gouvernante Générale</p>
                </div>
            </div>

            <div className={`p-5 rounded-[28px] border shadow-sm flex-1 flex flex-col ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                }`}>

                {/* Progress Circle & Main Stat */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-700" />
                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent"
                                    strokeDasharray={175}
                                    strokeDashoffset={175 - (175 * progress) / 100}
                                    className="text-emerald-500 transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-sm font-black text-emerald-600">{progress}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-emerald-600">{stats.clean}<span className="text-sm text-slate-400 font-normal">/{stats.total}</span></p>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Prêtes</p>
                        </div>
                    </div>
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-200 flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase opacity-70">Sales</p>
                            <p className="text-lg font-black">{stats.dirty}</p>
                        </div>
                        <XCircle size={18} className="opacity-50" />
                    </div>

                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase opacity-70">Recouche</p>
                            <p className="text-lg font-black">{stats.inspection}</p>
                        </div>
                        <RefreshCw size={18} className="opacity-50" />
                    </div>

                    <div className="col-span-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 flex items-center gap-3">
                        <AlertOctagon size={16} className="text-slate-400" />
                        <div className="flex justify-between w-full items-center">
                            <span className="text-[10px] font-black uppercase">Hors service (OOO)</span>
                            <span className="font-black text-sm">{stats.ooo}</span>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default WidgetRoomStatus;
