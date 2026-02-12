import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    Home, CheckSquare, Calendar as CalendarIcon, Users, ShieldCheck, Settings,
    Briefcase, MessageSquare, BedDouble, Wrench, Flower2, UtensilsCrossed, LogOut
} from 'lucide-react';
import { UserSettings } from '../types';
import { useAuth } from '../services/authContext';

interface SidebarProps {
    userSettings: UserSettings;
    totalUnread?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ userSettings, totalUnread = 0 }) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) return null;

    const isAdminOrManager = user.role === 'admin' || user.role === 'manager';

    const group1 = [
        { to: '/', icon: Home, label: 'Accueil', access: true, end: true },
        { to: '/todo', icon: CheckSquare, label: 'Tâches', access: true },
        { to: '/agenda', icon: CalendarIcon, label: 'Agenda', access: user.permissions.canViewAgenda },
        { to: '/contacts', icon: Users, label: 'VIP / Contacts', access: true },
        { to: '/admin', icon: ShieldCheck, label: 'Administration', access: isAdminOrManager },
        { to: '/settings', icon: Settings, label: 'Paramètres', access: true },
    ];

    const group2 = [
        { to: '/groups/crm', icon: Briefcase, label: 'Marketing / CRM', access: user.permissions.canViewCRM },
        { to: '/housekeeping', icon: BedDouble, label: 'Hébergement', access: user.permissions.canViewHousekeeping },
        { to: '/maintenance', icon: Wrench, label: 'Maintenance', access: user.permissions.canViewMaintenance },
        { to: '/spa', icon: Flower2, label: 'Spa', access: user.permissions.canViewSpa },
        { to: '/fnb', icon: UtensilsCrossed, label: 'Gestion F&B', access: user.permissions.canViewFnb },
        { to: '/messaging', icon: MessageSquare, label: 'Messages', access: user.permissions.canViewMessaging, badge: totalUnread },
    ];

    return (
        <div className={`hidden md:flex flex-col w-64 h-full border-r transition-colors duration-300 ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

            {/* LOGO AREA */}
            <div className="p-6 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={`text-${userSettings.themeColor}-600`}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 7v10M16 7v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                </div>
                <span className="font-bold tracking-[0.2em] text-sm uppercase dark:text-white">HotelOS</span>
            </div>

            {/* NAVIGATION LIST */}
            <div className="flex-1 overflow-y-auto px-4 space-y-6 custom-scrollbar">

                {/* GROUPE 1 : GESTION & ADMIN */}
                <div className="space-y-1">
                    <h3 className="px-4 text-[10px] font-black uppercase text-slate-400 mb-2">Gestion</h3>
                    {group1.map((item) => item.access && (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold
                ${isActive
                                    ? `bg-${userSettings.themeColor}-50 text-${userSettings.themeColor}-600 dark:bg-slate-800 dark:text-${userSettings.themeColor}-400`
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}
              `}
                        >
                            <item.icon size={20} strokeWidth={2} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>

                {/* SEPARATEUR VISUEL */}
                <hr className={`border-t ${userSettings.darkMode ? 'border-slate-800' : 'border-slate-100'}`} />

                {/* GROUPE 2 : OPERATIONS */}
                <div className="space-y-1">
                    <h3 className="px-4 text-[10px] font-black uppercase text-slate-400 mb-2">Opérations</h3>
                    {group2.map((item) => item.access && (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => {
                                const isParentActive = location.pathname.startsWith(item.to) && item.to !== '/';
                                const active = isActive || isParentActive;
                                return `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold relative
                  ${active
                                        ? `bg-${userSettings.themeColor}-50 text-${userSettings.themeColor}-600 dark:bg-slate-800 dark:text-${userSettings.themeColor}-400`
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}
                `;
                            }}
                        >
                            <div className="relative">
                                <item.icon size={20} strokeWidth={2} />
                                {item.badge ? (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                        {item.badge}
                                    </span>
                                ) : null}
                            </div>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>

            </div>

            {/* USER FOOTER */}
            <div className={`p-4 border-t ${userSettings.darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${userSettings.darkMode ? 'bg-slate-800 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                        {(user.displayName || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate dark:text-white">{user.displayName}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
                    </div>
                    <button onClick={logout} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

        </div>
    );
};

export default Sidebar;
