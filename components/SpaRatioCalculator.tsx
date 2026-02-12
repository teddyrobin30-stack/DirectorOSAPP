import React, { useState } from 'react';
import { Calculator, Euro, Percent, AlertCircle } from 'lucide-react';
import { UserSettings } from '../types';

interface SpaRatioCalculatorProps {
    userSettings: UserSettings;
}

const SpaRatioCalculator: React.FC<SpaRatioCalculatorProps> = ({ userSettings }) => {
    const [cost, setCost] = useState('');
    const [duration, setDuration] = useState('60'); // Minutes
    const [practitionerCost, setPractitionerCost] = useState('25'); // Horaire chargé
    const [price, setPrice] = useState('');

    const calculate = () => {
        const c = parseFloat(cost) || 0;
        const d = parseFloat(duration) || 0;
        const pc = parseFloat(practitionerCost) || 0;
        const p = parseFloat(price) || 0;

        const laborCost = (pc / 60) * d;
        const totalCost = c + laborCost;
        const margin = p - totalCost;
        const ratio = p > 0 ? (totalCost / p) * 100 : 0;

        return { laborCost, totalCost, margin, ratio };
    };

    const stats = calculate();

    return (
        <div className={`max-w-4xl mx-auto p-6 mt-10 rounded-3xl border shadow-xl ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl">
                    <Calculator size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black">Calculateur de Rentabilité Soin</h3>
                    <p className="text-xs text-slate-500">Estimez vos marges en incluant produits et main d'œuvre.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* INPUTS */}
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-black uppercase text-slate-400 ml-1 mb-1 block">Coût Produits (€)</label>
                        <input
                            type="number"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-violet-500 font-bold outline-none"
                            placeholder="Ex: 5.50"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black uppercase text-slate-400 ml-1 mb-1 block">Durée (min)</label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-violet-500 font-bold outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black uppercase text-slate-400 ml-1 mb-1 block">Coût Horaire Staff (€)</label>
                            <input
                                type="number"
                                value={practitionerCost}
                                onChange={(e) => setPractitionerCost(e.target.value)}
                                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-violet-500 font-bold outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-black uppercase text-slate-400 ml-1 mb-1 block">Prix de Vente TTC (€)</label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-violet-500 font-bold outline-none text-xl"
                            placeholder="Ex: 90.00"
                        />
                    </div>
                </div>

                {/* RESULTS */}
                <div className="space-y-6">
                    <div className={`p-6 rounded-2xl ${stats.margin > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50'}`}>
                        <p className="text-xs font-black uppercase opacity-60 mb-2">Marge Nette Estimée</p>
                        <p className={`text-4xl font-black ${stats.margin > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {stats.margin.toFixed(2)} €
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900">
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Coût Total</p>
                            <p className="text-xl font-bold">{stats.totalCost.toFixed(2)} €</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900">
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Ratio Coût/Prix</p>
                            <p className={`text-xl font-bold ${stats.ratio > 30 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {stats.ratio.toFixed(1)} %
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 text-[10px] text-slate-400 leading-tight">
                        <AlertCircle size={14} className="shrink-0" />
                        <p>Ce calcul est une estimation. N'oubliez pas d'inclure les coûts fixes (TVA, Loyer, Electricité) dans votre analyse globale.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpaRatioCalculator;
