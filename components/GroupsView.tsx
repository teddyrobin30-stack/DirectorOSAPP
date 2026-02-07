
import React, { useState, useMemo } from 'react';
import { 
  Plus, Users, Calendar, Briefcase, 
  Trash2, AlertTriangle, AlertCircle, Clock,
  ChevronRight, ArrowUpRight, Settings, Cog, MapPin, Mail, Bell, CheckCircle2, Wallet,
  Utensils
} from 'lucide-react';
import { Group, UserSettings, Contact, Venue } from '../types';
import VenueCalendarModal from './VenueCalendarModal';

interface GroupsViewProps {
  groups: Group[];
  userSettings: UserSettings;
  contacts: Contact[];
  onAdd: () => void;
  onEdit: (group: Group) => void;
  onGroupClick: (group: Group) => void;
  onDelete: (id: string | number) => void;
  onOpenBusinessConfig: () => void;
  venues?: Venue[];
}

const GroupsView: React.FC<GroupsViewProps> = ({ groups, userSettings, contacts, onAdd, onEdit, onGroupClick, onDelete, onOpenBusinessConfig, venues = [] }) => {
  const themeColor = userSettings.themeColor;
  const [showVenueCalendar, setShowVenueCalendar] = useState(false);

  // --- LOGIC: Notifications & Alerts ---
  
  // 1. Weekly Planning (Next 7 days)
  const upcomingGroups = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    return groups.filter(g => {
      const start = new Date(g.startDate);
      return start >= today && start <= nextWeek;
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [groups]);

  const upcomingPayments = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const alerts: { groupName: string, amount: string, label: string, date: string }[] = [];

    groups.forEach(g => {
      if (g.paymentSchedule) {
        g.paymentSchedule.forEach(p => {
          if (!p.paid) {
            const due = new Date(p.dueDate);
            if (due >= today && due <= nextWeek) {
              // Calculate amount approx
              let totalHT = 0;
              let totalVAT = 0;
              g.invoiceItems?.forEach(item => {
                const lineHT = item.quantity * item.unitPrice;
                totalHT += lineHT;
                totalVAT += lineHT * (item.vatRate / 100);
              });
              const totalTTC = totalHT + totalVAT;
              const amount = (totalTTC * p.percentage / 100).toFixed(0);

              alerts.push({
                groupName: g.name,
                amount: `${amount} €`,
                label: p.label,
                date: due.toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})
              });
            }
          }
        });
      }
    });
    return alerts;
  }, [groups]);

  // 2. Alert Logic per Group
  const getGroupAlerts = (group: Group) => {
    const alerts = [];
    const created = group.createdAt ? new Date(group.createdAt) : new Date(); // Fallback if old data
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 3600 * 24));

    // A. Option > 10 days
    if (group.status === 'option' && daysSinceCreation > 10) {
      alerts.push({
        type: 'expired_option',
        label: `Option +${daysSinceCreation}j`,
        actionLabel: 'Relancer client',
        color: 'red',
        icon: Clock,
        emailSubject: `Relance option - ${group.name}`,
        emailBody: `Bonjour,\n\nSauf erreur de notre part, l'option pour votre groupe "${group.name}" est arrivée à échéance.\nPouvons-nous procéder à la confirmation ?\n\nCordialement,`
      });
    }

    // B. Completeness (Missing Invoice Items or Payment Schedule)
    const hasInvoiceItems = group.invoiceItems && group.invoiceItems.length > 0;
    const hasPaymentSchedule = group.paymentSchedule && group.paymentSchedule.length > 0;
    
    if (!hasInvoiceItems) {
      alerts.push({
        type: 'missing_info',
        label: 'Prestations vides',
        actionLabel: 'Compléter',
        color: 'orange',
        icon: AlertTriangle,
        emailSubject: `Informations manquantes - ${group.name}`,
        emailBody: `Bonjour,\n\nPour finaliser l'organisation de votre groupe "${group.name}", nous avons besoin de valider les prestations (repas, salles).\nMerci de nous revenir rapidement.\n\nCordialement,`
      });
    } else if (!hasPaymentSchedule && group.status === 'confirmed') {
       alerts.push({
        type: 'missing_payment',
        label: 'Échéancier manquant',
        actionLabel: 'Créer',
        color: 'orange',
        icon: Wallet,
        emailSubject: `Facturation - ${group.name}`,
        emailBody: `Bonjour,\n\nNous devons mettre en place l'échéancier pour le groupe "${group.name}".\n\nCordialement,`
      });
    }

    return alerts;
  };

  const handleEmailAction = (contactId: string | number | undefined, subject: string, body: string) => {
    if (!contactId) {
      alert("Pas de contact lié à ce groupe. Veuillez en assigner un dans les détails.");
      return;
    }
    const contact = contacts.find(c => c.id.toString() === contactId.toString());
    if (contact && contact.email) {
      window.open(`mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } else {
      alert("Le contact lié n'a pas d'email valide.");
    }
  };

  return (
    <div className="px-6 py-6 space-y-8 animate-in fade-in pb-32">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black">RM Groupes</h2>
          <button 
            onClick={onOpenBusinessConfig}
            className={`p-2 rounded-xl text-slate-400 hover:text-${themeColor}-600 hover:bg-${themeColor}-50 transition-colors`}
            title="Configuration Business"
          >
            <Cog size={20} />
          </button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowVenueCalendar(true)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2`}
          >
            <MapPin size={14} /> Calendrier Lieux
          </button>
          <button 
            onClick={onAdd}
            className={`p-2 rounded-xl text-white bg-${themeColor}-600 shadow-lg hover:opacity-90 active:scale-95 transition-all`}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Planning de la semaine (Notification Module) */}
      {(upcomingGroups.length > 0 || upcomingPayments.length > 0) && (
        <div className={`p-5 rounded-[28px] border-2 border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/20`}>
           <div className="flex items-center gap-2 mb-4">
             <div className="p-1.5 bg-indigo-500 rounded-lg text-white">
               <Bell size={14} /> 
             </div>
             <h3 className="text-sm font-black uppercase tracking-widest text-indigo-900 dark:text-indigo-300">À faire cette semaine</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Arrivals */}
              {upcomingGroups.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Arrivées imminentes</p>
                  {upcomingGroups.map(g => (
                    <div key={g.id} onClick={() => onGroupClick(g)} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-indigo-200">
                       <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                         {new Date(g.startDate).getDate()}
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="font-bold text-sm truncate">{g.name}</p>
                         <p className="text-[10px] text-slate-500">{g.pax} Pax • {g.category}</p>
                       </div>
                       <ArrowUpRight size={14} className="text-slate-300"/>
                    </div>
                  ))}
                </div>
              )}

              {/* Payments */}
              {upcomingPayments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Règlements attendus</p>
                  {upcomingPayments.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-transparent">
                       <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                         <Wallet size={18} />
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex justify-between">
                            <p className="font-bold text-sm truncate">{p.groupName}</p>
                            <p className="font-black text-sm text-emerald-600">{p.amount}</p>
                         </div>
                         <p className="text-[10px] text-slate-500">{p.label} • {p.date}</p>
                       </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => {
          const alerts = getGroupAlerts(group);
          return (
          <div 
            key={group.id} 
            onClick={() => onGroupClick(group)}
            className={`p-5 rounded-3xl border shadow-sm relative overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
          >
            {/* Corner Status Badge */}
            <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest ${group.status === 'confirmed' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
              {group.status === 'confirmed' ? 'Confirmé' : 'Option'}
            </div>

            <div className="flex justify-between items-start mb-4 pr-16">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{group.category}</span>
                <h3 className="font-extrabold text-lg leading-tight">{group.name}</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-${themeColor}-50 text-${themeColor}-600`}>
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Dates</p>
                  <p className="text-xs font-bold whitespace-nowrap">
                    {new Date(group.startDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})} - {new Date(group.endDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-600">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Volume</p>
                  <p className="text-xs font-bold">{group.pax} PAX • {group.nights}N</p>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border mb-4 grid grid-cols-4 gap-2 text-center ${userSettings.darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-50'}`}>
              {[
                { label: 'SGL', val: group.rooms.single },
                { label: 'TWN', val: group.rooms.twin },
                { label: 'DBL', val: group.rooms.double },
                { label: 'FAM', val: group.rooms.family },
              ].map(r => (
                <div key={r.label}>
                  <p className="text-[8px] font-black text-slate-400 uppercase">{r.label}</p>
                  <p className="text-sm font-black">{r.val}</p>
                </div>
              ))}
            </div>

            {/* Alerts & Actions Section */}
            {alerts.length > 0 ? (
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                {alerts.map((alert, i) => (
                  <div key={i} className={`flex items-center justify-between p-2 rounded-xl ${alert.color === 'red' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                     <div className="flex items-center gap-2">
                       <alert.icon size={14} />
                       <span className="text-[10px] font-bold uppercase">{alert.label}</span>
                     </div>
                     <button 
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         if (alert.type === 'missing_info' || alert.type === 'missing_payment') {
                           onGroupClick(group); // Open details
                         } else {
                           handleEmailAction(group.rmContactId, alert.emailSubject, alert.emailBody);
                         }
                       }}
                       className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase shadow-sm flex items-center gap-1 hover:scale-105 transition-transform"
                     >
                       {alert.type === 'expired_option' ? <Mail size={10} /> : <ArrowUpRight size={10} />}
                       {alert.actionLabel}
                     </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                  {group.options.je && <span title="Journée Étude" className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><Briefcase size={12}/></span>}
                  {group.options.dinner && <span title="Dîner" className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><Utensils size={12}/></span>}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(group.id); }} 
                    className="p-2 rounded-xl text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 bg-${themeColor}-600 text-white shadow-sm`}>
                    Détails <ArrowUpRight size={12} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )})}
      </div>
      
      {groups.length === 0 && (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[50vh]">
          <Briefcase size={64} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">Aucun groupe répertorié.</p>
        </div>
      )}

      {/* Venue Calendar Modal */}
      <VenueCalendarModal 
        isOpen={showVenueCalendar}
        onClose={() => setShowVenueCalendar(false)}
        groups={groups}
        venues={venues}
        userSettings={userSettings}
        onGroupClick={onGroupClick}
      />
    </div>
  );
};

export default GroupsView;
