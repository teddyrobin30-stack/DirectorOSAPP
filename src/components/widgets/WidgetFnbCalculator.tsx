import React, { useState, useEffect } from 'react';
import { Calculator, Percent, ArrowRight } from 'lucide-react';

interface WidgetFnbCalculatorProps {
    darkMode: boolean;
}

const WidgetFnbCalculator: React.FC<WidgetFnbCalculatorProps> = ({ darkMode }) => {
    const [cost, setCost] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [margin, setMargin] = useState<number | null>(null);
    const [coeff, setCoeff] = useState<number | null>(null);

    useEffect(() => {
        const c = parseFloat(cost);
        const p = parseFloat(price);

        if (!isNaN(c) && !isNaN(p) && p > 0) {
            const m = ((p - c) / p) * 100;
            const co = p / c;
            setMargin(Math.round(m * 10) / 10); // 1 decimal
            setCoeff(Math.round(co * 100) / 100); // 2 decimals
        } else {
            setMargin(null);
            setCoeff(null);
        }
    }, [cost, price]);

    const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';
    const inputBg = darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';

    return (
        <section className="flex flex-col h-full">
            <div className="flex justify-between items-end mb-4 px-1">
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest opacity-60">F&B Tools</h2>
                    <p className="text-[11px] text-slate-400 mt-1">Calculateur de Marge Rapide</p>
                </div>
            </div>

            <div className={`p-4 rounded-[28px] border shadow-sm flex-1 flex flex-col gap-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Coût Matière (€)</label>
                        <input
                            type="number"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            className={`w-full p-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Prix Vente (€)</label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className={`w-full p-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className={`mt-auto p-4 rounded-2xl ${margin !== null && margin < 70 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'} flex items-center justify-between`}>
                    <div>
                        <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Marge Brute</p>
                        <div className="text-3xl font-black flex items-baseline">
                            {margin !== null ? margin : '--'}
                            <span className="text-sm ml-1"><Percent size={14} /></span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Coeff.</p>
                        <div className="text-xl font-black">
                            {coeff !== null ? `x${coeff}` : '--'}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WidgetFnbCalculator;
