import React, { useState } from 'react';
import { ShieldCheck, Plus, Trash2, Users, AlertTriangle, Settings, ArrowLeft, Database, Loader2 } from 'lucide-react';
import { UserRole, UserSettings } from '../types';
import { useAuth, getDefaultPermissions } from '../services/authContext';
import { useUsers } from '../hooks/useUsers';
import AdvancedAccessModal from './AdvancedAccessModal';

interface AdminPanelViewProps {
    userSettings: UserSettings;
    onNavigate: (path: string) => void;
}

const AdminPanelView: React.FC<AdminPanelViewProps> = ({ userSettings, onNavigate }) => {
    const { user, registerUser, deleteUser } = useAuth();
    const { users: userList } = useUsers();

    // State for User Management
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPwd, setNewUserPwd] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState<UserRole>('staff');
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Advanced Access Modal
    const [showAdvancedAccess, setShowAdvancedAccess] = useState(false);

    // Global Reset State
    const [confirmReset, setConfirmReset] = useState(false);

    // Security Guard
    const canAccess = user?.role === 'admin' || user?.role === 'manager';

    if (!user || !canAccess) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in zoom-in">
                <div className="p-6 rounded-full bg-red-100 text-red-500 mb-6">
                    <ShieldCheck size={64} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Accès Refusé</h2>
                <p className="text-slate-500 font-medium mb-8">Vous n'avez pas les droits nécessaires pour accéder à ce panneau.</p>
                <button onClick={() => onNavigate('/')} className="px-8 py-3 rounded-xl bg-slate-900 text-white font-bold uppercase transition-transform hover:scale-105">
                    Retour à l'accueil
                </button>
            </div>
        );
    }

    const handleCreateUser = async () => {
        if (!newUserEmail || !newUserPwd || !newUserName) return;
        setIsProcessing(true);
        try {
            await registerUser(newUserEmail, newUserPwd, newUserRole, newUserName, getDefaultPermissions(newUserRole));
            setNewUserEmail(''); setNewUserPwd(''); setNewUserName(''); setIsCreatingUser(false);
            alert("Utilisateur créé avec succès !");
        } catch (e: any) {
            alert("Erreur création: " + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (window.confirm("CONFIRMATION : Supprimer définitivement cet utilisateur ?")) {
            setIsProcessing(true);
            try {
                await deleteUser(uid);
            } catch (e: any) {
                alert("Erreur suppression: " + e.message);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleResetData = () => {
        if (window.confirm("ATTENTION : Cette action supprimera TOUTES les données locales (LocalStorage). Êtes-vous sûr ?")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <div className="h-full flex flex-col p-6 animate-in fade-in max-w-5xl mx-auto w-full">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-slate-900 text-white shadow-lg">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">Administration</h2>
                        <p className="text-xs font-bold text-slate-400">Gestion Système & Utilisateurs</p>
                    </div>
                </div>
                <button onClick={() => onNavigate('/')} className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <ArrowLeft size={14} /> Retour
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* COLONNE GAUCHE : GESTION UTILISATEURS */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Section Users */}
                    <div className={`p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 ${userSettings.darkMode ? 'bg-slate-900' : 'bg-white'} shadow-xl`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black flex items-center gap-2"><Users size={20} className="text-indigo-500" /> Utilisateurs</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowAdvancedAccess(true)}
                                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-200 transition-colors"
                                >
                                    <Settings size={14} /> Accès Avancés
                                </button>
                                <button
                                    onClick={() => setIsCreatingUser(!isCreatingUser)}
                                    className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                                >
                                    <Plus size={14} /> Ajouter
                                </button>
                            </div>
                        </div>

                        {/* Formulaire Création */}
                        {isCreatingUser && (
                            <div className="mb-6 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-900/50 space-y-3 animate-in fade-in slide-in-from-top-4">
                                <h4 className="text-xs font-black uppercase text-indigo-800 dark:text-indigo-200 mb-2">Nouvel Utilisateur</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Nom complet" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="w-full p-2 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500" />
                                    <input type="email" placeholder="Email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="w-full p-2 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500" />
                                </div>
                                <input type="password" placeholder="Mot de passe provisoir" value={newUserPwd} onChange={(e) => setNewUserPwd(e.target.value)} className="w-full p-2 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500" />
                                <div className="flex gap-2 items-center pt-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Rôle :</span>
                                    <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as UserRole)} className="bg-white p-1 rounded border text-xs font-bold outline-none">
                                        <option value="admin">Administrateur</option>
                                        <option value="manager">Manager</option>
                                        <option value="staff">Staff</option>
                                    </select>
                                    <button onClick={handleCreateUser} disabled={isProcessing} className="ml-auto px-6 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : 'Créer le compte'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Liste Utilisateurs */}
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {userList.map(u => (
                                <div key={u.uid} className={`group p-4 rounded-2xl border transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${u.role === 'admin' ? 'border-purple-200 dark:border-purple-900/30 bg-purple-50/50' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {u.displayName?.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold dark:text-white flex items-center gap-2">
                                                    {u.displayName}
                                                    {u.uid === user.uid && <span className="text-[9px] px-2 py-0.5 rounded bg-green-100 text-green-700 uppercase tracking-widest">Vous</span>}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] font-medium text-slate-400">{u.email}</p>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 capitalize">{u.role}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {u.uid !== user.uid && (
                                            <button onClick={() => handleDeleteUser(u.uid)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100" title="Supprimer l'utilisateur">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* COLONNE DROITE : MAINTENANCE & CONFIG */}
                <div className="space-y-6">

                    <div className={`p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 ${userSettings.darkMode ? 'bg-slate-900' : 'bg-white'} shadow-xl`}>
                        <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-red-500">
                            <AlertTriangle size={20} /> Zone de Danger
                        </h3>

                        <div className="space-y-4">
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Ces actions sont irréversibles. Elles affectent la configuration globale ou les données locales de ce navigateur.
                            </p>

                            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                                <h4 className="text-xs font-black text-red-600 uppercase mb-2">Réinitialisation Locale</h4>
                                <button
                                    onClick={() => setConfirmReset(!confirmReset)}
                                    className={`w-full py-3 rounded-xl border-2 border-red-200 text-red-500 font-bold text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-2 ${confirmReset ? 'bg-red-100' : ''}`}
                                >
                                    <Database size={14} /> {confirmReset ? 'Annuler' : 'Effacer LocalStorage'}
                                </button>

                                {confirmReset && (
                                    <button
                                        onClick={handleResetData}
                                        className="w-full mt-2 py-3 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-widest shadow-lg animate-in zoom-in"
                                    >
                                        Confirmer Suppression
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            <AdvancedAccessModal
                isOpen={showAdvancedAccess}
                onClose={() => setShowAdvancedAccess(false)}
            />
        </div>
    );
};

export default AdminPanelView;
