
import React from 'react';
import {
    X, Calendar, Phone, Mail, User, Briefcase,
    Send, AlertTriangle, Clock, MapPin, Users
} from 'lucide-react';
import { Lead, UserSettings, UserProfile } from '../types';

interface LeadDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    userSettings: UserSettings;
    users: UserProfile[];
    onViewInPipeline?: (lead: Lead) => void;
}

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
    isOpen, onClose, lead, userSettings, users, onViewInPipeline
}) => {
    if (!isOpen || !lead) return null;

    const openSMS = (phone: string, msg: string) => {
        window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`);
    };

    const openWhatsApp = (phone: string, msg: string) => {
        window.open(`https://wa.me/${phone.replace(/\+/g, '')}?text=${encodeURIComponent(msg)}`);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center animate-in fade-in backdrop-blur-sm p-4">
            <div className={`w-full max-w-2xl rounded-[32px] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200 ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="mb-8">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dossier Pipeline #{lead.id.toString().slice(-4)}</span>
                    <h2 className="text-3xl font-black mt-2 leading-tight">{lead.groupName}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${lead.status === 'valide' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {lead.status}
                        </span>
                        {lead.startDate && (
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Calendar size={12} /> {new Date(lead.startDate).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>

                {/* Main Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Contact Principal</span>
                        <p className="font-bold flex items-center gap-2 text-indigo-500"><User size={14} /> {lead.contactName}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">PAX / Effectif</span>
                        <p className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-200"><Users size={14} /> {lead.pax || '0'} Personnes</p>
                    </div>
                </div>

                {/* Channels */}
                <div className="space-y-3 mb-8">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600"><Mail size={18} /></div>
                            <span className="font-bold text-sm">{lead.email || 'Pas d\'email'}</span>
                        </div>
                        {lead.email && <a href={`mailto:${lead.email}`} className="text-xs font-black uppercase text-indigo-500 hover:underline">Envoyer</a>}
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600"><Phone size={18} /></div>
                            <span className="font-bold text-sm">{lead.phone || 'Pas de numéro'}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openSMS(lead.phone, '')} className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold hover:bg-slate-300">SMS</button>
                            <button onClick={() => openWhatsApp(lead.phone, '')} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600">WhatsApp</button>
                        </div>
                    </div>
                </div>

                {/* Accommodation Summary if exists */}
                {lead.rooms && (lead.rooms.single > 0 || lead.rooms.double > 0 || lead.rooms.twin > 0 || lead.rooms.family > 0) && (
                    <div className="mb-8 p-6 rounded-[28px] border-2 border-indigo-50 dark:border-indigo-900/30">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Répartition Hébergement</h4>
                        <div className="grid grid-cols-4 gap-2 text-center">
                            {Object.entries(lead.rooms).map(([type, val]) => (
                                <div key={type}>
                                    <span className="text-[9px] text-slate-400 uppercase block">{type}</span>
                                    <span className="text-lg font-black">{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notes */}
                <div className="mb-8 p-6 rounded-[28px] bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest flex items-center gap-2">
                        <Clock size={12} /> Notes & Commentaires
                    </h4>
                    <p className="text-sm font-medium leading-relaxed italic">
                        {lead.note || 'Aucun commentaire.'}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase text-xs tracking-widest"
                    >
                        Fermer
                    </button>
                    <button
                        onClick={() => {
                            if (onViewInPipeline && lead) onViewInPipeline(lead);
                            onClose();
                        }}
                        className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-colors"
                    >
                        Voir dans le Pipeline
                    </button>
                </div>

            </div>
        </div>
    );
};

export default LeadDetailModal;
