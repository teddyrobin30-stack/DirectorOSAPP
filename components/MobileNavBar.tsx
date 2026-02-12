import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    Home, CheckSquare, Calendar as CalendarIcon, MessageSquare, Menu, X,
    Users, ShieldCheck, Settings, Briefcase, BedDouble, Wrench, Flower2, UtensilsCrossed, LogOut
} from 'lucide-react';
import { UserSettings } from '../types';
import { useAuth } from '../services/authContext';
import BrandLogo from './BrandLogo';

interface MobileNavBarProps {
    userSettings: UserSettings;
    totalUnread?: number;
}

const MobileNavBar: React.FC<MobileNavBarProps> = ({ userSettings, totalUnread = 0 }) => {
    const { user, logout } = useAuth();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    if (!user) return null;

    const isAdminOrManager = user.role === 'admin' || user.role === 'manager';

    // MAIN TABS (Bottom Bar)
    const mainTabs = [
        { to: '/', icon: Home, label: 'Accueil', end: true },
        { to: '/todo', icon: CheckSquare, label: 'Tâches' },
        { to: '/agenda', icon: CalendarIcon, label: 'Agenda' },
        { to: '/messaging', icon: MessageSquare, label: 'Messages', badge: totalUnread },
    ];

    // DRAWER LINKS (The rest)
    const drawerLinks = [
        { to: '/contacts', icon: Users, label: 'VIP / Contacts', access: true },
        { to: '/groups/crm', icon: Briefcase, label: 'Marketing / CRM', access: user.permissions.canViewCRM },
        { to: '/housekeeping', icon: BedDouble, label: 'Hébergement', access: user.permissions.canViewHousekeeping },
        { to: '/maintenance', icon: Wrench, label: 'Maintenance', access: user.permissions.canViewMaintenance },
        { to: '/spa', icon: Flower2, label: 'Spa', access: user.permissions.canViewSpa },
        { to: '/fnb/kitchen', icon: UtensilsCrossed, label: 'Gestion F&B', access: user.permissions.canViewFnb },
        { to: '/admin', icon: ShieldCheck, label: 'Administration', access: isAdminOrManager },
        { to: '/settings', icon: Settings, label: 'Paramètres', access: true },
    ];

    // Helper to close drawer on nav
    const handleNav = (path: string) => {
        navigate(path);
        setIsDrawerOpen(false);
    };

    return (
        <>
            {/* BOTTOM BAR */}
            <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 py-2 border-t backdrop-blur-xl pb-safe ${userSettings.darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}>
                <div className="flex justify-between items-center">
                    {mainTabs.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `
                flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all relative
                ${isActive
                                    ? `text-${userSettings.themeColor}-600 dark:text-${userSettings.themeColor}-400`
                                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}
              `}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="relative">
                                        <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                        {item.badge ? (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                                {item.badge}
                                            </span>
                                        ) : null}
                                    </div>
                                    <span className="text-[10px] font-bold">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}

                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all text-slate-400 hover:text-slate-600 dark:text-slate-500`}
                    >
                        <Menu size={24} strokeWidth={2} />
                        <span className="text-[10px] font-bold">Menu</span>
                    </button>
                </div>
            </div>

            {/* DRAWER (Full Screen / Modal) */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in" onClick={() => setIsDrawerOpen(false)}>
                    <div
                        className={`absolute bottom-0 w-full rounded-t-[32px] max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom ${userSettings.darkMode ? 'bg-slate-900' : 'bg-white'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="p-6 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <BrandLogo theme={userSettings.darkMode ? 'dark' : 'light'} size="md" />
                            <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Drawer Links */}
                        <div className="p-4 overflow-y-auto space-y-4 pb-10">
                            <div className="grid grid-cols-2 gap-3">
                                {drawerLinks.map((item) => item.access && (
                                    <button
                                        key={item.label}
                                        onClick={() => handleNav(item.to)}
                                        className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 ${location.pathname.startsWith(item.to) ? 'bg-slate-100 dark:bg-slate-800 border-indigo-500' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}
                                    >
                                        <div className={`p-3 rounded-full ${location.pathname.startsWith(item.to) ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                                            <item.icon size={24} />
                                        </div>
                                        <span className="text-xs font-bold text-center leading-tight">{item.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Logout */}
                            <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={() => { logout(); setIsDrawerOpen(false); }}
                                    className="w-full py-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 font-black uppercase flex items-center justify-center gap-2"
                                >
                                    <LogOut size={18} /> Déconnexion
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MobileNavBar;
