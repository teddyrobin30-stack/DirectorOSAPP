import React from 'react';
import { Clock, AlertTriangle, Info, User } from 'lucide-react';

interface LogEntry {
    id: string;
    time: string;
    author: string;
    urgency: 'info' | 'urgent';
    message: string;
}

const MOCK_LOGS: LogEntry[] = [
    { id: '1', time: '10:45', author: 'Sarah (Réception)', urgency: 'urgent', message: 'Fuite d\'eau signalée chambre 204. Maintenance prévenue.' },
    { id: '2', time: '10:15', author: 'Marc (Directeur)', urgency: 'info', message: 'Le groupe "TechCorp" arrivera avec 30min de retard.' },
    { id: '3', time: '09:30', author: 'Julie (Gouvernante)', urgency: 'info', message: 'Livraison linge propre reçue et stockée.' },
    { id: '4', time: '08:00', author: 'Night Audit', urgency: 'info', message: 'Clôture journalière effectuée sans écart.' },
];

interface WidgetShiftLogProps {
    darkMode: boolean;
}

const WidgetShiftLog: React.FC<WidgetShiftLogProps> = ({ darkMode }) => {
    return (
        <section className="flex flex-col h-full">
            <div className="flex justify-between items-end mb-4 px-1">
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest opacity-60">Main Courante</h2>
                    <p className="text-[11px] text-slate-400 mt-1">Derniers événements</p>
                </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
                {MOCK_LOGS.map((log) => (
                    <div
                        key={log.id}
                        className={`p-3 rounded-2xl border shadow-sm flex gap-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                            }`}
                    >
                        <div className={`mt-1 shrink-0 ${log.urgency === 'urgent' ? 'text-red-500' : 'text-blue-500'}`}>
                            {log.urgency === 'urgent' ? <AlertTriangle size={16} /> : <Info size={16} />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md ${log.urgency === 'urgent'
                                        ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                    {log.urgency}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <Clock size={10} />
                                    <span>{log.time}</span>
                                </div>
                            </div>

                            <p className="text-xs font-medium leading-snug mb-1.5">{log.message}</p>

                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                                <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                    <User size={8} />
                                </div>
                                {log.author}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default WidgetShiftLog;
