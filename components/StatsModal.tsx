
import React, { useState, useMemo } from 'react';
import { X, TrendingUp, DollarSign, Users, Calendar, AlertCircle, BarChart3, PieChart, ArrowUpRight, Filter, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Group, UserSettings } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  userSettings: UserSettings;
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, groups, userSettings }) => {
  const [dateRange, setDateRange] = useState<'month' | 'year' | 'all'>('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // --- DATA PROCESSING ---

  // 1. Filter Groups based on range
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const start = new Date(g.startDate);
      if (dateRange === 'all') return true;
      if (dateRange === 'year') return start.getFullYear() === selectedYear;
      if (dateRange === 'month') {
        const now = new Date();
        return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [groups, dateRange, selectedYear]);

  // 2. Financial KPIs
  const financialData = useMemo(() => {
    let totalHT = 0;
    let totalTTC = 0;
    let expectedCashflow = 0; // Arrhes non perçues
    let confirmedCount = 0;

    filteredGroups.forEach(g => {
      if (g.status === 'confirmed') {
        confirmedCount++;
        let groupHT = 0;
        let groupTTC = 0;

        g.invoiceItems?.forEach(item => {
          const lineHT = item.quantity * item.unitPrice;
          const lineTTC = lineHT * (1 + item.vatRate / 100);
          groupHT += lineHT;
          groupTTC += lineTTC;
        });

        totalHT += groupHT;
        totalTTC += groupTTC;

        // Cashflow Gap (Unpaid deposits)
        g.paymentSchedule?.forEach(p => {
          if (!p.paid) {
            expectedCashflow += (groupTTC * p.percentage / 100);
          }
        });
      }
    });

    return { totalHT, totalTTC, expectedCashflow, confirmedCount };
  }, [filteredGroups]);

  // 3. Operational KPIs
  const opsData = useMemo(() => {
    let totalNights = 0; // Cumul nuitées
    let totalPax = 0;
    const roomDistrib = { single: 0, twin: 0, double: 0, family: 0 };

    filteredGroups.forEach(g => {
      if (g.status === 'confirmed') {
        totalNights += g.nights;
        totalPax += g.pax;
        if (g.rooms) {
          roomDistrib.single += (g.rooms.single * g.nights);
          roomDistrib.twin += (g.rooms.twin * g.nights);
          roomDistrib.double += (g.rooms.double * g.nights);
          roomDistrib.family += (g.rooms.family * g.nights);
        }
      }
    });

    const totalRoomNights = roomDistrib.single + roomDistrib.twin + roomDistrib.double + roomDistrib.family;

    return { totalNights, totalPax, roomDistrib, totalRoomNights };
  }, [filteredGroups]);

  // 4. Monthly Revenue Chart Data
  const monthlyRevenue = useMemo(() => {
    const data: number[] = new Array(12).fill(0);
    filteredGroups.forEach(g => {
      if (g.status === 'confirmed') {
        const d = new Date(g.startDate);
        if (!isNaN(d.getTime())) {
          const month = d.getMonth();
          let groupHT = 0;
          g.invoiceItems?.forEach(item => groupHT += item.quantity * item.unitPrice);
          data[month] += groupHT;
        }
      }
    });
    return data;
  }, [filteredGroups]);

  // 5. Top Items
  const topItems = useMemo(() => {
    const itemsMap: Record<string, { qty: number, rev: number }> = {};
    filteredGroups.forEach(g => {
      if (g.status === 'confirmed') {
        g.invoiceItems?.forEach(item => {
          if (!item.description) return;
          if (!itemsMap[item.description]) itemsMap[item.description] = { qty: 0, rev: 0 };
          itemsMap[item.description].qty += item.quantity;
          itemsMap[item.description].rev += item.quantity * item.unitPrice;
        });
      }
    });
    return Object.entries(itemsMap)
      .sort((a, b) => b[1].rev - a[1].rev)
      .slice(0, 5);
  }, [filteredGroups]);

  // 6. Pending Payments List
  const pendingPayments = useMemo(() => {
    const payments: { groupName: string, amount: number, date: string, label: string, status: string }[] = [];
    filteredGroups.forEach(g => {
      // Calcul du total TTC du groupe pour appliquer les pourcentages
      let groupTTC = 0;
      g.invoiceItems?.forEach(item => groupTTC += (item.quantity * item.unitPrice) * (1 + item.vatRate / 100));

      g.paymentSchedule?.forEach(p => {
        if (!p.paid) {
          const amount = groupTTC * p.percentage / 100;
          payments.push({
            groupName: g.name,
            amount,
            date: p.dueDate,
            label: p.label,
            status: new Date(p.dueDate) < new Date() ? 'overdue' : 'pending'
          });
        }
      });
    });
    return payments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredGroups]);


  if (!isOpen) return null;

  const maxRevenue = Math.max(...monthlyRevenue, 1); // Avoid division by zero

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 flex items-center justify-center animate-in fade-in backdrop-blur-sm p-4">
      <div className={`w-full max-w-6xl rounded-[40px] p-8 shadow-2xl flex flex-col h-[90vh] ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-600 rounded-2xl text-white shadow-lg shadow-violet-500/20">
              <BarChart3 size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black">Tableau de Bord</h2>
              <p className="text-xs font-bold text-slate-400">Performances & Analyse</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className={`flex p-1 rounded-xl ${userSettings.darkMode ? 'bg-slate-800' : 'bg-white border'}`}>
                {(['month', 'year', 'all'] as const).map(r => (
                  <button 
                    key={r}
                    onClick={() => setDateRange(r)}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${dateRange === r ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {r === 'month' ? 'Ce mois' : r === 'year' ? `Année ${selectedYear}` : 'Tout'}
                  </button>
                ))}
             </div>
             <button onClick={onClose} className="p-3 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 hover:opacity-80"><X size={20}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-10 custom-scrollbar space-y-6">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {/* CA */}
             <div className={`p-6 rounded-[28px] border relative overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-4 relative z-10">
                   <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                     <DollarSign size={20}/>
                   </div>
                   <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-lg">Confirmé</span>
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1">{financialData.totalHT.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">CA Total HT</p>
                {/* Decorative blob */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
             </div>

             {/* Cashflow */}
             <div className={`p-6 rounded-[28px] border relative overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-4 relative z-10">
                   <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                     <AlertCircle size={20}/>
                   </div>
                   <span className="text-[10px] font-black uppercase text-amber-500">À Encaisser</span>
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1">{financialData.expectedCashflow.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Trésorerie Attendue</p>
             </div>

             {/* Volume */}
             <div className={`p-6 rounded-[28px] border relative overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-4 relative z-10">
                   <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                     <Users size={20}/>
                   </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1">{opsData.totalPax}</h3>
                  <span className="text-sm font-bold text-slate-400">Pax</span>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{financialData.confirmedCount} Groupes Confirmés</p>
             </div>

             {/* Nights */}
             <div className={`p-6 rounded-[28px] border relative overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-4 relative z-10">
                   <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20">
                     <Calendar size={20}/>
                   </div>
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1">{opsData.totalNights}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nuitées Groupes</p>
             </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             
             {/* Revenue Bar Chart */}
             <div className={`col-span-2 p-6 rounded-[32px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
               <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2"><TrendingUp size={16}/> Évolution du CA Mensuel</h3>
               <div className="h-64 flex items-end justify-between gap-2 md:gap-4 px-2">
                  {monthlyRevenue.map((val: number, idx: number) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                       <div className="w-full relative flex items-end h-full">
                          <div 
                            className="w-full bg-indigo-500 rounded-t-lg transition-all duration-500 group-hover:bg-indigo-400 relative"
                            style={{ height: `${(val / maxRevenue) * 100}%`, minHeight: val > 0 ? '4px' : '0' }}
                          >
                             {val > 0 && (
                               <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                 {(val / 1000).toFixed(1)}k€
                               </div>
                             )}
                          </div>
                       </div>
                       <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(2000, idx, 1).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                    </div>
                  ))}
               </div>
             </div>

             {/* Room Distribution (Simple Visualization) */}
             <div className={`p-6 rounded-[32px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
               <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2"><PieChart size={16}/> Répartition Chambres</h3>
               
               <div className="space-y-4">
                  {Object.entries(opsData.roomDistrib).map(([type, rawCount]) => {
                    const count = rawCount as number;
                    const percentage = opsData.totalRoomNights > 0 ? (count / opsData.totalRoomNights) * 100 : 0;
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="capitalize text-slate-600 dark:text-slate-300">{type}</span>
                          <span className="text-slate-400">{Math.round(percentage)}%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${type === 'single' ? 'bg-blue-500' : type === 'twin' ? 'bg-indigo-500' : type === 'double' ? 'bg-violet-500' : 'bg-fuchsia-500'}`} 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {opsData.totalRoomNights === 0 && <p className="text-xs text-slate-400 italic text-center py-10">Aucune donnée</p>}
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             
             {/* Pending Payments Table */}
             <div className={`p-6 rounded-[32px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2"><AlertCircle size={16}/> Relances Règlements</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                   {pendingPayments.map((p, idx) => (
                     <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-transparent hover:border-slate-200 transition-colors">
                        <div>
                           <p className="font-bold text-sm text-slate-800 dark:text-white">{p.groupName}</p>
                           <p className={`text-[10px] font-bold uppercase tracking-wide ${p.status === 'overdue' ? 'text-red-500' : 'text-slate-400'}`}>
                             {p.label} • {new Date(p.date).toLocaleDateString('fr-FR')}
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="font-black text-slate-900 dark:text-white">{p.amount.toFixed(0)} €</p>
                           {p.status === 'overdue' && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Retard</span>}
                        </div>
                     </div>
                   ))}
                   {pendingPayments.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Aucun paiement en attente.</p>}
                </div>
             </div>

             {/* Top Items */}
             <div className={`p-6 rounded-[32px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2"><ArrowUpRight size={16}/> Top Ventes (CA)</h3>
                <div className="space-y-3">
                   {topItems.map((item, idx) => (
                     <div key={idx} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-xs text-slate-500">#{idx+1}</div>
                        <div className="flex-1">
                           <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="truncate">{item[0]}</span>
                              <span>{item[1].rev.toFixed(0)} €</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${topItems[0][1].rev > 0 ? (item[1].rev / topItems[0][1].rev) * 100 : 0}%` }} />
                           </div>
                        </div>
                     </div>
                   ))}
                   {topItems.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Pas assez de données.</p>}
                </div>
             </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default StatsModal;
