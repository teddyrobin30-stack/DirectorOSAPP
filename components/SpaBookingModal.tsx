import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { UserSettings, SpaRequest } from '../types';

interface SpaBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (request: Partial<SpaRequest>) => void;
    onDelete?: (id: string) => void;
    userSettings: UserSettings;
    initialData?: SpaRequest | null;
}

const SpaBookingModal: React.FC<SpaBookingModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    userSettings,
    initialData
}) => {
    const [formData, setFormData] = useState({
        clientName: '',
        phone: '',
        email: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        treatment: '',
        source: 'Direct',
        isDuo: false,
        duration: 60
    });
    const [customSource, setCustomSource] = useState('');

    useEffect(() => {
        if (initialData) {
            setFormData({
                clientName: initialData.clientName || '',
                phone: initialData.phone || '',
                email: initialData.email || '',
                date: initialData.date || new Date().toISOString().split('T')[0],
                time: initialData.time || '10:00',
                treatment: initialData.treatment || '',
                source: initialData.source && ['Direct', 'Extérieur', 'Weekendesk', 'Thalasseo', 'Sport Découverte', 'Thalasso n°1'].includes(initialData.source)
                    ? initialData.source
                    : 'Saisie Manuelle',
                isDuo: initialData.isDuo || false,
                duration: initialData.duration || 60
            });
            if (initialData.source && !['Direct', 'Extérieur', 'Weekendesk', 'Thalasseo', 'Sport Découverte', 'Thalasso n°1'].includes(initialData.source)) {
                setCustomSource(initialData.source);
            }
        } else {
            // Reset for new
            setFormData({
                clientName: '',
                phone: '',
                email: '',
                date: new Date().toISOString().split('T')[0],
                time: '10:00',
                treatment: '',
                source: 'Direct',
                isDuo: false,
                duration: 60
            });
            setCustomSource('');
        }
    }, [initialData, isOpen]);

    const handleSubmit = () => {
        if (!formData.clientName || !formData.date || !formData.time) return;

        const finalSource = formData.source === 'Saisie Manuelle' ? customSource : formData.source;

        onSave({
            ...initialData,
            ...formData,
            source: finalSource
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className={`w-full max-w-md rounded-[32px] p-6 shadow-2xl ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black">{initialData ? 'Modifier Réservation' : 'Nouvelle Réservation Spa'}</h3>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Nom Client"
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="tel"
                            placeholder="Téléphone"
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <select
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none cursor-pointer"
                            value={formData.source}
                            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                        >
                            {['Direct', 'Extérieur', 'Weekendesk', 'Thalasseo', 'Sport Découverte', 'Thalasso n°1', 'Saisie Manuelle'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    {formData.source === 'Saisie Manuelle' && (
                        <input
                            type="text"
                            placeholder="Précisez la source (ex: Recommandation Chef)"
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none border border-violet-200 focus:border-violet-500 transition-colors animate-in slide-in-from-top-2"
                            value={customSource}
                            onChange={(e) => setCustomSource(e.target.value)}
                            autoFocus
                        />
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="date"
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                        <input
                            type="time"
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none"
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="Durée (min)"
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                            />
                            <span className="absolute right-3 top-3 text-[10px] font-black text-slate-400">min</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 ml-1">Configuration</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFormData({ ...formData, isDuo: false })}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${!formData.isDuo ? 'bg-violet-600 text-white shadow-md' : 'bg-white dark:bg-slate-700 text-slate-400 border border-slate-200 dark:border-slate-600'}`}
                            >
                                Seul
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, isDuo: true })}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${formData.isDuo ? 'bg-violet-600 text-white shadow-md' : 'bg-white dark:bg-slate-700 text-slate-400 border border-slate-200 dark:border-slate-600'}`}
                            >
                                Duo
                            </button>
                        </div>
                    </div>

                    <textarea
                        placeholder="Soin souhaité"
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium text-sm outline-none h-24 resize-none"
                        value={formData.treatment}
                        onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                    />
                    <div className="flex gap-2 mt-2">
                        {initialData && onDelete && (
                            <button
                                onClick={() => onDelete(initialData.id)}
                                className="flex-1 py-4 rounded-2xl bg-red-100 text-red-600 font-black uppercase text-xs tracking-widest hover:bg-red-200"
                            >
                                Supprimer
                            </button>
                        )}
                        <button
                            onClick={handleSubmit}
                            className="flex-[2] py-4 rounded-2xl bg-violet-600 text-white font-black uppercase text-xs tracking-widest shadow-lg hover:bg-violet-700"
                        >
                            Enregistrer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpaBookingModal;
