import React, { useState, useEffect } from 'react';
import { User, Moon, Sun, Save, Loader2, LogOut, ArrowLeft, Bell, Mail, MessageSquare, AlertTriangle, Smartphone, CheckCircle2 } from 'lucide-react';
import { UserSettings } from '../types';
import { THEME_COLORS } from '../constants';
import { useAuth } from '../services/authContext';

interface SettingsViewProps {
    userSettings: UserSettings;
    onSave: (settings: UserSettings) => void;
    onNavigate: (path: string) => void;
}

interface NotificationSettings {
    pushEnabled: boolean;
    emailEnabled: boolean;
    newTasks: boolean;
    reminders: boolean;
    messages: boolean;
    mentions: boolean;
    lowStock: boolean;
    newBooking: boolean;
    maintenanceIssues: boolean;
}

const DEFAULT_NOTIFS: NotificationSettings = {
    pushEnabled: false,
    emailEnabled: true,
    newTasks: true,
    reminders: true,
    messages: true,
    mentions: true,
    lowStock: true,
    newBooking: true,
    maintenanceIssues: true
};

const SettingsView: React.FC<SettingsViewProps> = ({ userSettings, onSave, onNavigate }) => {
    const { user, logout, updateProfile } = useAuth();
    const [localSettings, setLocalSettings] = useState<UserSettings>(userSettings);
    const [isSaving, setIsSaving] = useState(false);

    // --- NOTIFICATION STATE ---
    const [notifSettings, setNotifSettings] = useState<NotificationSettings>(() => {
        const saved = localStorage.getItem('hotelos_notifications');
        return saved ? JSON.parse(saved) : DEFAULT_NOTIFS;
    });

    // --- PERSISTENCE ---
    useEffect(() => {
        localStorage.setItem('hotelos_notifications', JSON.stringify(notifSettings));
    }, [notifSettings]);

    // --- NATIVE PUSH LOGIC ---
    const handlePushToggle = async () => {
        if (!notifSettings.pushEnabled) {
            // Turning ON
            if (!('Notification' in window)) {
                alert("Votre navigateur ne supporte pas les notifications.");
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotifSettings(prev => ({ ...prev, pushEnabled: true }));
                new Notification("🔔 DirectorOS", {
                    body: "Notifications activées avec succès !",
                    icon: "/pwa-192x192.png" // Assumes generic icon exists or browser default
                });
            } else {
                setNotifSettings(prev => ({ ...prev, pushEnabled: false }));
                alert("Permission refusée. Vérifiez les paramètres de votre navigateur.");
            }
        } else {
            // Turning OFF
            setNotifSettings(prev => ({ ...prev, pushEnabled: false }));
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (user && localSettings.userName !== user.displayName) {
                await updateProfile(localSettings.userName);
            }
            onSave(localSettings);
            // Notifications are auto-saved to localStorage, but we could sync to Firestore here too if needed.
        } catch (e) {
            console.error("Erreur sauvegarde profil:", e);
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    const accentColor = THEME_COLORS.find(c => c.value === localSettings.themeColor)?.hex || '#4f46e5';

    return (
        <div className="h-full flex flex-col p-6 animate-in fade-in max-w-4xl mx-auto w-full">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl text-white shadow-lg`} style={{ backgroundColor: accentColor }}>
                        <User size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">Mon Espace</h2>
                        <p className="text-xs font-bold text-slate-400">Préférences & Profil</p>
                    </div>
                </div>
                <button onClick={() => onNavigate('/')} className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <ArrowLeft size={14} /> Retour
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* CARTE PROFIL */}
                <div className={`p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 ${userSettings.darkMode ? 'bg-slate-900' : 'bg-white'} shadow-xl`}>
                    <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                        <User size={20} className="text-indigo-500" /> Informations Personnelles
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom d'affichage</label>
                            <input
                                type="text"
                                value={localSettings.userName}
                                onChange={(e) => setLocalSettings({ ...localSettings, userName: e.target.value })}
                                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email (Non modifiable)</label>
                            <div className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 font-bold text-sm text-slate-500 cursor-not-allowed">
                                {user?.email}
                            </div>
                        </div>

                        <div className="pt-4 flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold capitalize text-slate-500">
                                Rôle : {user?.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* CARTE APPARENCE */}
                <div className={`p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 ${userSettings.darkMode ? 'bg-slate-900' : 'bg-white'} shadow-xl`}>
                    <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                        <Sun size={20} className="text-amber-500" /> Apparence de l'application
                    </h3>

                    <div className="space-y-6">

                        {/* Thème Couleur */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Couleur principale</label>
                            <div className="flex flex-wrap gap-2">
                                {THEME_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setLocalSettings({ ...localSettings, themeColor: c.value })}
                                        className={`w-12 h-12 rounded-2xl transition-all transform hover:scale-110 active:scale-95 ${localSettings.themeColor === c.value ? 'ring-4 ring-offset-2 ring-indigo-500 scale-110 shadow-lg' : 'opacity-60 hover:opacity-100'}`}
                                        style={{ backgroundColor: c.hex }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Mode Sombre */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Mode d'affichage</label>
                            <div
                                onClick={() => setLocalSettings({ ...localSettings, darkMode: !localSettings.darkMode })}
                                className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${localSettings.darkMode ? 'bg-slate-800 border-indigo-500/50 shadow-inner' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl transition-colors ${localSettings.darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-100 text-amber-500'}`}>
                                        {localSettings.darkMode ? <Moon size={20} /> : <Sun size={20} />}
                                    </div>
                                    <span className="font-bold text-sm">Mode Sombre</span>
                                </div>
                                <div className={`w-12 h-7 rounded-full transition-colors relative ${localSettings.darkMode ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${localSettings.darkMode ? 'left-6' : 'left-1'}`} />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* CENTRE DE NOTIFICATIONS */}
                <div className={`col-span-1 md:col-span-2 p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 ${userSettings.darkMode ? 'bg-slate-900' : 'bg-white'} shadow-xl`}>
                    <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                        <Bell size={20} className="text-violet-500" /> Centre de Notifications
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

                        {/* CANAUX */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Canaux</h4>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${notifSettings.pushEnabled ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <Smartphone size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Push Mobile</p>
                                        <p className="text-[10px] text-slate-400">Sur cet appareil</p>
                                    </div>
                                </div>
                                <div
                                    onClick={handlePushToggle}
                                    className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${notifSettings.pushEnabled ? 'bg-violet-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${notifSettings.pushEnabled ? 'left-6' : 'left-1'}`} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${notifSettings.emailEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Emails</p>
                                        <p className="text-[10px] text-slate-400">Récapitulatifs</p>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setNotifSettings({ ...notifSettings, emailEnabled: !notifSettings.emailEnabled })}
                                    className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${notifSettings.emailEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${notifSettings.emailEnabled ? 'left-6' : 'left-1'}`} />
                                </div>
                            </div>
                        </div>

                        {/* OPERATIONS */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Opérations</h4>
                            {/* New Task */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Nouvelle tâche assignée</span>
                                <div
                                    onClick={() => setNotifSettings({ ...notifSettings, newTasks: !notifSettings.newTasks })}
                                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${notifSettings.newTasks ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifSettings.newTasks ? 'left-5' : 'left-1'}`} />
                                </div>
                            </div>
                            {/* Reminders */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Rappels d'échéance</span>
                                <div
                                    onClick={() => setNotifSettings({ ...notifSettings, reminders: !notifSettings.reminders })}
                                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${notifSettings.reminders ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifSettings.reminders ? 'left-5' : 'left-1'}`} />
                                </div>
                            </div>
                        </div>

                        {/* MESSAGERIE */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Messagerie</h4>
                            {/* Messages */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Messages privés</span>
                                <div
                                    onClick={() => setNotifSettings({ ...notifSettings, messages: !notifSettings.messages })}
                                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${notifSettings.messages ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifSettings.messages ? 'left-5' : 'left-1'}`} />
                                </div>
                            </div>
                            {/* Mentions */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Mentions (@)</span>
                                <div
                                    onClick={() => setNotifSettings({ ...notifSettings, mentions: !notifSettings.mentions })}
                                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${notifSettings.mentions ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifSettings.mentions ? 'left-5' : 'left-1'}`} />
                                </div>
                            </div>
                        </div>

                        {/* ALERTES METIER */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Alertes Métier</h4>
                            {/* Low Stock */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                    Stock Faible <AlertTriangle size={12} className="text-amber-500" />
                                </span>
                                <div
                                    onClick={() => setNotifSettings({ ...notifSettings, lowStock: !notifSettings.lowStock })}
                                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${notifSettings.lowStock ? 'bg-amber-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifSettings.lowStock ? 'left-5' : 'left-1'}`} />
                                </div>
                            </div>
                            {/* New Booking */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Nouvelle Résa.</span>
                                <div
                                    onClick={() => setNotifSettings({ ...notifSettings, newBooking: !notifSettings.newBooking })}
                                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${notifSettings.newBooking ? 'bg-amber-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifSettings.newBooking ? 'left-5' : 'left-1'}`} />
                                </div>
                            </div>
                            {/* Maintenance */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Problème Maintenance</span>
                                <div
                                    onClick={() => setNotifSettings({ ...notifSettings, maintenanceIssues: !notifSettings.maintenanceIssues })}
                                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${notifSettings.maintenanceIssues ? 'bg-amber-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifSettings.maintenanceIssues ? 'left-5' : 'left-1'}`} />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* ACTIONS FOOTER */}
            <div className="mt-8 flex flex-col md:flex-row gap-4 justify-end border-t border-slate-100 dark:border-slate-800 pt-6">
                <button
                    onClick={() => { logout(); }}
                    className="px-6 py-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors flex items-center justify-center gap-2"
                >
                    <LogOut size={18} /> Déconnexion
                </button>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-4 rounded-xl text-white font-black uppercase shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ backgroundColor: accentColor }}
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
            </div>

        </div>
    );
};

export default SettingsView;
