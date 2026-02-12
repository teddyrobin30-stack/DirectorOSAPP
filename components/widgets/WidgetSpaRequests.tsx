import React from 'react';
import { Flower2 } from 'lucide-react';
import { SpaRequest } from '../../types';

interface WidgetSpaRequestsProps {
    requests: SpaRequest[];
    onNavigate: (path: string) => void;
    darkMode: boolean;
}

const WidgetSpaRequests: React.FC<WidgetSpaRequestsProps> = ({ requests, onNavigate, darkMode }) => {
    const pendingRequests = requests.filter(r => r.status === 'pending').slice(0, 5);

    return (
        <section className="flex flex-col h-full">
            <div className="flex justify-between items-end mb-4 px-1">
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest opacity-60">SPA & Bien-être</h2>
                    <p className="text-[11px] text-slate-400 mt-1">Dernières demandes de soins</p>
                </div>
                <button onClick={() => onNavigate('/spa')} className="text-xs font-black text-pink-600">
                    Tout voir
                </button>
            </div>

            <div className="space-y-3 flex-1">
                {pendingRequests.length > 0 ? (
                    pendingRequests.map((req) => (
                        <div
                            key={req.id}
                            className={`p-3 rounded-2xl border shadow-sm flex items-center gap-3 transition-transform hover:translate-x-1 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                                }`}
                        >
                            <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                                <Flower2 size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{req.treatment}</p>
                                <p className="text-[10px] text-slate-400">
                                    {req.clientName} • {req.time}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" title="En attente" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div
                        className={`p-6 text-center border-2 border-dashed rounded-3xl h-full flex flex-col justify-center items-center ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-400'
                            }`}
                    >
                        <Flower2 size={24} className="mb-2 opacity-20" />
                        <p className="text-xs font-semibold">Aucune demande en attente.</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default WidgetSpaRequests;
