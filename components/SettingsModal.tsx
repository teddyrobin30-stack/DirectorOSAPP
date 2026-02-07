import React, { useState } from 'react';
import { X, Moon, Sun, RefreshCw, User, MessageCircle, ShieldCheck, CheckCircle2, Loader2, QrCode, Lock, Trash2, AlertTriangle, LogOut, Plus, Shield, Users, Edit3, Save, Settings, MapPin } from 'lucide-react';
import { UserSettings, UserRole, UserPermissions } from '../types';
import { THEME_COLORS } from '../constants';
import { useAuth, getDefaultPermissions } from '../services/authContext';
import AdvancedAccessModal from './AdvancedAccessModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
  onGoogleLogin?: (token: string) => void;
  clientId?: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, onGoogleLogin, clientId }) => {
  const { user, logout, registerUser, deleteUser, getAllUsers, updateUserPermissions, updateProfile } = useAuth();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [showGoogleOAuth, setShowGoogleOAuth] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State pour gestion utilisateurs simple (Legacy)
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPwd, setNewUserPwd] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('staff'); 
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  // Advanced Modal State
  const [showAdvancedAccess, setShowAdvancedAccess] = useState(false);

  const [userList, setUserList] = useState(getAllUsers());

  const isAdmin = user?.role === 'admin';

  if (!isOpen) return null;

  const handleSync = (type: 'google' | 'whatsapp') => {
    // ... (Existing Sync Logic)
    setIsSyncing(type);
    setTimeout(() => {
      onSave({ 
        ...settings, 
        [type === 'google' ? 'googleSync' : 'whatsappSync']: !settings[type === 'google' ? 'googleSync' : 'whatsappSync'] 
      });
      setIsSyncing(null);
    }, 1500);
  };

  const handleResetData = () => {
    localStorage.clear();
    window.location.reload();
  };

  // SAFE SAVE FUNCTION
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // 1. Si le nom a changé, mettre à jour le profil AUTH (Base de données)
      if (user && settings.userName !== user.displayName) {
        await updateProfile(settings.userName);
      }
      
      // 2. Mettre à jour les préférences locales (Theme, etc.)
      onSave(settings);

      // 3. Fermer la modale uniquement si succès
      onClose();
    } catch (e) {
      console.error("Erreur critique sauvegarde réglages:", e);
      alert("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if(!newUserEmail || !newUserPwd || !newUserName) return;
    try {
      await registerUser(newUserEmail, newUserPwd, newUserRole, newUserName, getDefaultPermissions(newUserRole));
      setNewUserEmail(''); setNewUserPwd(''); setNewUserName(''); setIsCreatingUser(false);
      setUserList(getAllUsers()); // Refresh list
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if(window.confirm("Supprimer cet utilisateur ?")) {
      try {
        await deleteUser(uid);
        setUserList(getAllUsers());
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const accentColor = THEME_COLORS.find(c => c.value === settings.themeColor)?.hex || '#4f46e5';

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/80 flex items-end md:items-center md:justify-center animate-in fade-in backdrop-blur-md">
        {/* Modal Content */}
        <div className={`w-full md:max-w-2xl md:rounded-[40px] md:mx-4 rounded-t-[40px] p-6 pb-8 animate-in slide-in-from-bottom-20 md:slide-in-from-bottom-10 shadow-2xl max-h-[90%] md:max-h-[85%] flex flex-col ${settings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-950'}`}>
          
          <div className="flex justify-between items-center mb-6 flex-shrink-0 px-2">
            <h3 className="text-2xl font-black tracking-tight">Réglages</h3>
            <button onClick={onClose} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
              <X size={20}/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 px-2">
            
            {/* Profil & Préférences */}
            <div className="space-y-4">
              <label className={`text-[10px] font-black uppercase tracking-[0.2em] ml-1 ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Profil & Préférences</label>
              
              {/* Nom */}
              <div className={`flex items-center gap-4 px-4 py-3.5 rounded-[22px] border-2 transition-all ${settings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100 focus-within:border-indigo-500'}`}>
                <div className="p-2 bg-indigo-500 rounded-xl text-white">
                  <User size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold opacity-50 uppercase tracking-wider mb-0.5">{user?.role} - {user?.permissions.canManageSettings ? 'Accès Total' : 'Accès Limité'}</p>
                  <input 
                    type="text" 
                    value={settings.userName} 
                    onChange={(e) => onSave({ ...settings, userName: e.target.value })}
                    className="bg-transparent outline-none w-full text-sm font-black placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Apparence */}
            <div className="space-y-3">
              <label className={`text-[10px] font-black uppercase tracking-[0.2em] ml-1 ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Apparence</label>
              <div className="flex justify-between gap-2 px-1 overflow-x-auto no-scrollbar py-1">
                {THEME_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => onSave({ ...settings, themeColor: c.value })}
                    className={`w-10 h-10 rounded-[15px] flex-shrink-0 transition-all transform hover:scale-110 active:scale-95 ${settings.themeColor === c.value ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-indigo-400 scale-105 shadow-md' : 'opacity-80'}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <div 
                  onClick={() => onSave({ ...settings, darkMode: !settings.darkMode })}
                  className={`flex items-center justify-between p-4 rounded-[24px] cursor-pointer transition-all border-2 ${settings.darkMode ? 'bg-slate-800 border-indigo-500/30 shadow-inner' : 'bg-slate-50 border-transparent'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${settings.darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-500 text-white'}`}>
                      {settings.darkMode ? <Moon size={18}/> : <Sun size={18}/>}
                    </div>
                    <div>
                      <span className="text-xs font-black block leading-none">Mode Sombre</span>
                    </div>
                  </div>
                  <div className={`w-11 h-6 rounded-full transition-all relative ${settings.darkMode ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all ${settings.darkMode ? 'left-6' : 'left-1'}`} />
                  </div>
                </div>
            </div>

            {/* Gestion Utilisateurs & Permissions (Admin Only) */}
            {isAdmin && (
               <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
                 <div className="flex justify-between items-center px-1">
                   <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Gestion Utilisateurs</label>
                   
                   {/* NEW: ADVANCED ACCESS BUTTON */}
                   <button 
                     onClick={() => setShowAdvancedAccess(true)}
                     className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:opacity-90 transition-opacity"
                   >
                     <Settings size={12}/> Gestion Avancée des Accès
                   </button>
                 </div>

                 {/* Quick Add User (Legacy preserved but simplified) */}
                 <button onClick={() => setIsCreatingUser(!isCreatingUser)} className="text-indigo-500 text-[10px] font-black uppercase flex items-center gap-1 pl-1">
                     <Plus size={12} /> Ajout Rapide
                 </button>

                 {isCreatingUser && (
                   <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 space-y-3 animate-in zoom-in">
                      <h4 className="text-xs font-black uppercase mb-2">Nouvel Utilisateur</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Nom" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none border-b pb-1 dark:text-white" />
                        <input type="email" placeholder="Email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none border-b pb-1 dark:text-white" />
                      </div>
                      <input type="password" placeholder="Mot de passe" value={newUserPwd} onChange={(e) => setNewUserPwd(e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none border-b pb-1 dark:text-white" />
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] font-bold text-slate-400">Rôle:</span>
                        <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as UserRole)} className="bg-transparent text-xs font-bold outline-none dark:text-white border rounded p-1">
                          <option value="admin">Administrateur</option>
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                        </select>
                        <button onClick={handleCreateUser} className="ml-auto px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase">Créer</button>
                      </div>
                   </div>
                 )}

                 <div className="space-y-2">
                   {userList.map(u => (
                     <div key={u.uid} className={`p-3 rounded-2xl border bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : u.role === 'manager' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                {u.role === 'admin' ? <Shield size={14} /> : <Users size={14} />}
                              </div>
                              <div>
                                <p className="text-xs font-bold dark:text-white">{u.displayName}</p>
                                <p className="text-[9px] text-slate-400 capitalize">{u.role}</p>
                              </div>
                            </div>
                            {u.uid !== user?.uid && (
                              <button onClick={() => handleDeleteUser(u.uid)} className="p-2 text-slate-300 hover:text-red-500 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {/* Zone de Danger (Admin Only) */}
            {isAdmin && (
              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                 <button 
                   onClick={() => setConfirmReset(!confirmReset)}
                   className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-colors ${confirmReset ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   {confirmReset ? <AlertTriangle size={14}/> : <Trash2 size={14}/>}
                   {confirmReset ? 'Êtes-vous sûr ?' : 'Réinitialiser toutes les données'}
                 </button>
                 {confirmReset && (
                   <button 
                     onClick={handleResetData}
                     className="w-full py-3 rounded-2xl bg-red-500 text-white text-xs font-black uppercase tracking-widest shadow-lg animate-in zoom-in"
                   >
                     Confirmer suppression
                   </button>
                 )}
              </div>
            )}
          </div>

          <div className="pt-6 flex-shrink-0 px-2 space-y-3">
            <button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className={`w-full py-5 rounded-[28px] text-white font-black uppercase tracking-[0.15em] shadow-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
              style={{ backgroundColor: accentColor }}
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            
            <button 
              onClick={() => { logout(); onClose(); }}
              className="w-full py-4 rounded-[28px] border-2 border-slate-100 dark:border-slate-700 text-slate-400 font-black uppercase tracking-[0.15em] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* ADVANCED MODAL */}
      <AdvancedAccessModal 
        isOpen={showAdvancedAccess} 
        onClose={() => setShowAdvancedAccess(false)} 
      />
    </>
  );
};

export default SettingsModal;