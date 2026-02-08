import React, { useState, useEffect } from 'react';
import { X, User, Shield, Lock, Eye, EyeOff, Save, CheckSquare, Square, ChevronRight, Search, KeyRound, AlertTriangle } from 'lucide-react';
import { UserProfile, UserRole, UserPermissions } from '../types';
import { useAuth, getDefaultPermissions } from '../services/authContext';
import { useUsers } from '../hooks/useUsers'; // <--- IMPORT DU MOTEUR FIREBASE

interface AdvancedAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdvancedAccessModal: React.FC<AdvancedAccessModalProps> = ({ isOpen, onClose }) => {
  const { adminUpdateUser } = useAuth();
  
  // ✅ REMPLACEMENT ICI : On utilise le Hook Firebase au lieu du State local vide
  const { users } = useUsers(); 
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit States
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('staff');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editPermissions, setEditPermissions] = useState<UserPermissions | null>(null);

  // Plus besoin de useEffect pour charger les users, le hook le fait tout seul !

  const handleSelectUser = (u: UserProfile) => {
    setSelectedUser(u);
    setEditName(u.displayName);
    setEditRole(u.role);
    setEditPermissions(u.permissions || getDefaultPermissions(u.role));
    setNewPassword('');
  };

  const handleSave = async () => {
    if (!selectedUser || !editPermissions) return;

    await adminUpdateUser(selectedUser.uid, {
      displayName: editName,
      role: editRole,
      permissions: editPermissions,
      password: newPassword || undefined
    });

    // setUsers(getAllUsers()); // <-- SUPPRIMÉ (Inutile, Firebase met à jour tout seul)
    setNewPassword('');
    alert("Utilisateur mis à jour avec succès !");
    onClose(); // On ferme la modale après sauvegarde pour confirmer visuellement
  };

  const togglePermission = (key: keyof UserPermissions) => {
    if (!editPermissions) return;
    setEditPermissions({ ...editPermissions, [key]: !editPermissions[key] });
  };

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 flex items-center justify-center animate-in fade-in backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl flex overflow-hidden">
        
        {/* LEFT: USER LIST */}
        <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50">
           <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                <Shield size={20} className="text-indigo-600"/> 
                Gestion des Accès
              </h3>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                 <Search size={16} className="text-slate-400"/>
                 <input 
                   type="text" 
                   placeholder="Rechercher..." 
                   className="bg-transparent outline-none text-xs font-bold w-full"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredUsers.map(u => (
                <div 
                  key={u.uid}
                  onClick={() => handleSelectUser(u)}
                  className={`p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${selectedUser?.uid === u.uid ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-white dark:hover:bg-slate-800 hover:shadow'}`}
                >
                   <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedUser?.uid === u.uid ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                          {u.displayName ? u.displayName.slice(0, 2).toUpperCase() : '??'}
                      </div>
                      <div>
                          <p className="text-sm font-bold">{u.displayName}</p>
                          <p className={`text-[10px] uppercase font-bold ${selectedUser?.uid === u.uid ? 'text-white/70' : 'text-slate-400'}`}>{u.role}</p>
                      </div>
                   </div>
                   <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedUser?.uid === u.uid ? 'text-white' : 'text-slate-300'}`}/>
                </div>
              ))}
           </div>
        </div>

        {/* RIGHT: EDIT PANEL */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
           {selectedUser ? (
             <>
               <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                  <div>
                      <h2 className="text-2xl font-black">{selectedUser.displayName}</h2>
                      <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                      <X size={20}/>
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  
                  {/* 1. Identity & Security */}
                  <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                         <User size={14}/> Identité & Sécurité
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-500">Nom complet</label>
                            <input 
                              type="text" 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-500"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-500">Rôle Principal</label>
                            <select 
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as UserRole)}
                              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-500"
                            >
                               <option value="admin">Administrateur</option>
                               <option value="manager">Manager</option>
                               <option value="staff">Staff</option>
                            </select>
                         </div>
                      </div>

                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex items-center gap-4">
                         <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
                            <KeyRound size={20}/>
                         </div>
                         <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase text-amber-600 mb-1 block">Réinitialiser Mot de Passe</label>
                            <div className="flex items-center gap-2">
                               <input 
                                 type={showPassword ? "text" : "password"} 
                                 placeholder="Nouveau mot de passe..." 
                                 value={newPassword}
                                 onChange={(e) => setNewPassword(e.target.value)}
                                 className="bg-white dark:bg-slate-900 p-2 rounded-lg text-sm outline-none flex-1 border border-amber-200 dark:border-amber-800"
                               />
                               <button onClick={() => setShowPassword(!showPassword)} className="text-amber-500 hover:text-amber-700">
                                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                               </button>
                            </div>
                         </div>
                      </div>
                  </div>

                  {/* 2. Fine-grained Permissions */}
                  {editPermissions && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                           <Lock size={14}/> Permissions d'accès aux Vues
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                           {[
                             { key: 'canViewAgenda', label: 'Agenda & Planning' },
                             { key: 'canViewCRM', label: 'CRM Commercial & Groupes' },
                             { key: 'canViewMessaging', label: 'Messagerie Interne' },
                             { key: 'canViewReception', label: 'Réception (Logbook/Taxis...)' },
                             { key: 'canViewFnb', label: 'F&B (Stocks/Recettes)' },
                             { key: 'canViewHousekeeping', label: 'Housekeeping (Chambres/Linge)' },
                             { key: 'canViewMaintenance', label: 'Maintenance & Technique' },
                             { key: 'canViewSpa', label: 'Spa & Bien-être' },
                             { key: 'canManageSettings', label: 'ADMINISTRATION GLOBALE (Danger)', danger: true }
                           ].map(perm => (
                             <div 
                               key={perm.key}
                               onClick={() => togglePermission(perm.key as keyof UserPermissions)}
                               className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${editPermissions[perm.key as keyof UserPermissions] 
                                 ? (perm.danger ? 'bg-red-50 border-red-500' : 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/20 dark:border-indigo-500') 
                                 : 'bg-slate-50 dark:bg-slate-800 border-transparent opacity-60'}`}
                             >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${editPermissions[perm.key as keyof UserPermissions] ? (perm.danger ? 'bg-red-500 border-red-500' : 'bg-indigo-600 border-indigo-600') : 'border-slate-300 bg-white dark:bg-slate-700'}`}>
                                   {editPermissions[perm.key as keyof UserPermissions] && <CheckSquare size={12} className="text-white"/>}
                                </div>
                                <span className={`text-xs font-bold ${perm.danger ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}>
                                   {perm.label}
                                   {perm.danger && <AlertTriangle size={12} className="inline ml-2 text-red-500"/>}
                                </span>
                             </div>
                           ))}
                        </div>
                     </div>
                  )}

               </div>

               {/* Footer */}
               <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                  <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-xs uppercase text-slate-500 hover:bg-white dark:hover:bg-slate-800 transition-colors">Annuler</button>
                  <button 
                    onClick={handleSave}
                    className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase shadow-lg hover:bg-indigo-700 flex items-center gap-2 transition-transform active:scale-95"
                  >
                     <Save size={16}/> Enregistrer les modifications
                  </button>
               </div>
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                <Shield size={64} className="mb-4 opacity-50"/>
                <p className="text-xl font-black">Sélectionnez un utilisateur</p>
                <p className="font-medium text-sm">pour modifier ses accès</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedAccessModal;
