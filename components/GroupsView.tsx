import React, { useState, useMemo } from 'react';
import { 
  Plus, Users, Calendar, Briefcase, 
  Trash2, AlertTriangle, AlertCircle, Clock,
  ChevronRight, ArrowUpRight, Cog, MapPin, Mail, Bell, Wallet,
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

const GroupsView: React.FC<GroupsViewProps> = ({ groups = [], userSettings, contacts, onAdd, onEdit, onGroupClick, onDelete, onOpenBusinessConfig, venues = [] }) => {
  const themeColor = userSettings.themeColor;
  const [showVenueCalendar, setShowVenueCalendar] = useState(false);

  // Helper pour transformer n'importe quoi en Date valide sans crasher
  const safeDate = (d: any) => {
    if (!d) return new Date();
    const date = d.seconds ? new Date(d.seconds * 1000) : new Date(d);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  // 1. Planning de la semaine
  const upcomingGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    return (groups || [])
      .filter(g => {
        if (!g.startDate) return false;
        const start = safeDate(g.startDate);
        return start >= today && start <= nextWeek;
      })
      .sort((a, b) => safeDate(a.startDate).getTime() - safeDate(b.startDate).getTime());
  }, [groups]);

  // 2. Alertes Paiements
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const alerts: any[] = [];

    (groups || []).forEach(g => {
      if (g.paymentSchedule) {
        g.paymentSchedule.forEach(p => {
          if (!p.paid && p.dueDate) {
            const due = safeDate(p.dueDate);
            if (due >= today && due <= nextWeek) {
              let totalHT = 0;
              let totalVAT = 0;
              g.invoiceItems?.forEach(item => {
                const lineHT = (item.quantity || 0) * (item.unitPrice || 0);
                totalHT += lineHT;
                totalVAT += lineHT * ((item.vatRate || 0) / 100);
              });
              const totalTTC = totalHT + totalVAT;
              const amount = (totalTTC * (p.percentage || 0) / 100).toFixed(0);

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

  // 3. Logique d'alertes par groupe
  const getGroupAlerts = (group: Group) => {
    const alerts = [];
    const created = safeDate(group.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 3600 * 24));

    if (group.status === 'option' && daysSinceCreation > 10) {
      alerts.push({
        type: 'expired_option',
        label: `Option +${daysSinceCreation}j`,
        actionLabel: 'Relancer',
        color: 'red',
        icon: Clock,
        emailSubject: `Relance option - ${group.name}`,
        emailBody: `Bonjour,\n\nL'option pour votre groupe "${group.name}" est arrivée à échéance.\nCordialement,`
      });
    }

    if (!group.invoiceItems || group.invoiceItems.length === 0) {
      alerts.push({
        type: 'missing_info',
        label: 'Prestations vides',
        actionLabel: 'Compléter',
        color: 'orange',
        icon: AlertTriangle,
      });
    }

    return alerts;
  };

  const handleEmailAction = (contactId: any, subject: string, body: string) => {
    const contact = contacts.find(c => c.id.toString() === contactId?.toString());
    if (contact?.email) {
      window.open(`mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } else {
      alert("Email introuvable pour ce contact.");
    }
  };

  return (
    <div className="px-6 py-6 space-y-8 animate-in fade-in pb-32">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black">RM Groupes</h2>
          <button onClick={onOpenBusinessConfig} className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors">
            <Cog size={20} />
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowVenueCalendar(true)} className="px-4 py-2 rounded-xl text-xs font-black uppercase border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 flex items-center gap-2">
            <MapPin size={14} /> Lieux
          </button>
          <button onClick={onAdd} className={`p-2 rounded-xl text-white bg-${themeColor}-600 shadow-lg`}>
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Notifications Semaine */}
      {(upcomingGroups.length > 0 || upcomingPayments.length > 0) && (
        <div className="p-5 rounded-[28px] border-2 border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/20">
           <div className="flex items-center gap-2 mb-4">
             <Bell size={16} className="text-indigo-500" />
             <h3 className="text-sm font-black uppercase tracking-widest">Cette semaine</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingGroups.map(g => (
                <div key={g.id} onClick={() => onGroupClick(g)} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl cursor-pointer shadow-sm border border-transparent hover:border-indigo-300">
                   <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                     {safeDate(g.startDate).getDate()}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="font-bold text-sm truncate">{g.name}</p>
                     <p className="text-[10px] text-slate-500">{g.pax} Pax • {g.category}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Grille des Groupes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => {
          const alerts = getGroupAlerts(group);
          return (
            <div key={group.id} onClick={() => onGroupClick(group)} className={`p-5 rounded-3xl border shadow-sm relative transition-all hover:-translate-y-1 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase ${group.status === 'confirmed' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
                {group.status === 'confirmed' ? 'Confirmé' : 'Option'}
              </div>
              <div className="mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{group.category}</span>
                <h3 className="font-extrabold text-lg truncate pr-12">{group.name}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-[11px] font-bold">{safeDate(group.startDate).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'})}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-slate-400" />
                  <span className="text-[11px] font-bold">{group.pax} PAX</span>
                </div>
              </div>

              {alerts.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  {alerts.map((al, i) => (
                    <div key={i} className={`flex items-center justify-between p-2 rounded-xl text-[10px] font-bold uppercase ${al.color === 'red' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                      <span>{al.label}</span>
                      <button onClick={(e) => { e.stopPropagation(); al.type === 'expired_option' ? handleEmailAction(group.rmContactId, al.emailSubject || "", al.emailBody || "") : onGroupClick(group) }} className="px-2 py-1 bg-white rounded-lg shadow-sm">{al.actionLabel}</button>
                    </div>
                  ))}
                </div>
              )}
              
              {!alerts.length && (
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={(e) => { e.stopPropagation(); onDelete(group.id); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-${themeColor}-600 text-white`}>Détails</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

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