
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, UserPermissions } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  registerUser: (email: string, password: string, role: UserRole, name: string, permissions: UserPermissions) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  updateUserPermissions: (uid: string, role: UserRole, permissions: UserPermissions) => Promise<void>;
  adminUpdateUser: (uid: string, updates: { role?: UserRole, permissions?: UserPermissions, password?: string, displayName?: string }) => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>; // Nouvelle fonction sécurisée
  deleteUser: (uid: string) => Promise<void>;
  getAllUsers: () => UserProfile[];
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_USERS_KEY = 'hotelos_auth_users_db_v3'; // Incremented version for safety
const STORAGE_SESSION_KEY = 'hotelos_auth_session_v3';

// Helper pour les permissions par défaut
export const getDefaultPermissions = (role: UserRole): UserPermissions => {
  const defaults = {
    canManageSettings: false,
    canViewSharedData: true,
    canViewAgenda: true,
    canViewMessaging: true,
    canViewFnb: false,
    canViewHousekeeping: false,
    canViewMaintenance: false,
    canViewCRM: false,
    canViewReception: true,
    canViewSpa: false
  };

  switch (role) {
    case 'admin':
      return { 
        ...defaults, 
        canManageSettings: true, 
        canViewFnb: true, 
        canViewHousekeeping: true, 
        canViewMaintenance: true, 
        canViewCRM: true,
        canViewSpa: true 
      };
    case 'manager':
      return { 
        ...defaults, 
        canViewFnb: true, 
        canViewCRM: true,
        canViewSpa: true,
        canViewHousekeeping: true
      };
    case 'staff':
      return defaults; // Accès basique
    default:
      return defaults;
  }
};

const INITIAL_USERS: Record<string, UserProfile & { password: string }> = {
  'admin-uid': {
    uid: 'admin-uid',
    email: 'admin@hotel.com',
    password: 'admin',
    displayName: 'Directeur',
    role: 'admin',
    permissions: getDefaultPermissions('admin'),
    createdAt: Date.now()
  },
  'manager-uid': {
    uid: 'manager-uid',
    email: 'manager@hotel.com',
    password: 'manager',
    displayName: 'Manager RM',
    role: 'manager',
    permissions: getDefaultPermissions('manager'),
    createdAt: Date.now()
  },
  'staff-uid': {
    uid: 'staff-uid',
    email: 'staff@hotel.com',
    password: 'staff',
    displayName: 'Réception',
    role: 'staff',
    permissions: getDefaultPermissions('staff'),
    createdAt: Date.now()
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUsersDB = () => {
    const db = localStorage.getItem(STORAGE_USERS_KEY);
    return db ? JSON.parse(db) : INITIAL_USERS;
  };

  const saveUsersDB = (db: any) => {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(db));
  };

  useEffect(() => {
    const initSession = async () => {
      await new Promise(r => setTimeout(r, 800));
      // Vérifier localStorage (Persistant) PUIS sessionStorage (Session)
      let sessionUid = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!sessionUid) sessionUid = sessionStorage.getItem(STORAGE_SESSION_KEY);

      if (sessionUid) {
        const db = getUsersDB();
        if (db[sessionUid]) {
          const { password, ...safeUser } = db[sessionUid];
          setUser(safeUser);
        }
      }
      setLoading(false);
    };
    initSession();
  }, []);

  const login = async (email: string, pass: string, rememberMe: boolean = false) => {
    setError(null);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));

    const db = getUsersDB();
    const foundUser = Object.values(db).find((u: any) => u.email.toLowerCase() === email.toLowerCase());

    if (foundUser && (foundUser as any).password === pass) {
      const { password, ...safeUser } = foundUser as any;
      setUser(safeUser);
      
      // Gestion de la persistance
      if (rememberMe) {
        localStorage.setItem(STORAGE_SESSION_KEY, safeUser.uid);
        sessionStorage.removeItem(STORAGE_SESSION_KEY);
      } else {
        sessionStorage.setItem(STORAGE_SESSION_KEY, safeUser.uid);
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } else {
      setError("Email ou mot de passe incorrect.");
    }
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_SESSION_KEY);
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
  };

  const clearError = () => {
    setError(null);
  };

  // Inscription Publique (Self-Service)
  const signup = async (email: string, pass: string, name: string) => {
    setError(null);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));

    const db = getUsersDB();
    if (Object.values(db).some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      setError("Cet email est déjà utilisé.");
      setLoading(false);
      return;
    }

    const newUid = 'user-' + Date.now();
    const newUser = {
      uid: newUid,
      email,
      password: pass,
      displayName: name,
      role: 'manager' as UserRole, // Role par défaut pour explorer la démo
      permissions: getDefaultPermissions('manager'),
      createdAt: Date.now()
    };

    db[newUid] = newUser;
    saveUsersDB(db);

    // Connexion automatique après inscription (Session uniquement par sécurité)
    const { password, ...safeUser } = newUser;
    setUser(safeUser);
    sessionStorage.setItem(STORAGE_SESSION_KEY, safeUser.uid);
    setLoading(false);
  };

  // Création par Admin (SettingsModal)
  const registerUser = async (email: string, pass: string, role: UserRole, name: string, permissions: UserPermissions) => {
    if (user?.role !== 'admin') {
      throw new Error("Seuls les administrateurs peuvent créer des comptes manuellement.");
    }
    
    const db = getUsersDB();
    if (Object.values(db).some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Cet email est déjà utilisé.");
    }

    const newUid = 'user-' + Date.now();
    const newUser = {
      uid: newUid,
      email,
      password: pass,
      displayName: name,
      role,
      permissions,
      createdAt: Date.now()
    };

    db[newUid] = newUser;
    saveUsersDB(db);
  };

  const updateUserPermissions = async (uid: string, role: UserRole, permissions: UserPermissions) => {
    if (user?.role !== 'admin') return;
    const db = getUsersDB();
    if (db[uid]) {
      db[uid].role = role;
      db[uid].permissions = permissions;
      saveUsersDB(db);
    }
  };

  // NOUVELLE FONCTION ADMIN COMPLETE
  const adminUpdateUser = async (uid: string, updates: { role?: UserRole, permissions?: UserPermissions, password?: string, displayName?: string }) => {
    if (user?.role !== 'admin') return;
    const db = getUsersDB();
    if (db[uid]) {
      if (updates.role) db[uid].role = updates.role;
      if (updates.permissions) db[uid].permissions = updates.permissions;
      if (updates.password) db[uid].password = updates.password;
      if (updates.displayName) db[uid].displayName = updates.displayName;
      saveUsersDB(db);
    }
  }

  // --- SAFE PROFILE UPDATE FOR CURRENT USER ---
  const updateProfile = async (displayName: string) => {
    if (!user) return;
    
    // Safety Try/Catch block to prevent app crash
    try {
      const db = getUsersDB();
      if (db[user.uid]) {
        // Update Database
        db[user.uid].displayName = displayName;
        saveUsersDB(db);
        
        // Update Local React State immediately to reflect changes
        const { password, ...safeUser } = db[user.uid];
        setUser(safeUser);
      }
    } catch (e) {
      console.error("Critical Error updating profile:", e);
      throw e; // Allow UI to handle or display error
    }
  };

  const deleteUser = async (uid: string) => {
    if (user?.role !== 'admin') return;
    if (uid === user.uid) {
      throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
    }
    const db = getUsersDB();
    delete db[uid];
    saveUsersDB(db);
  };

  const getAllUsers = (): UserProfile[] => {
    const db = getUsersDB();
    return Object.values(db).map((u: any) => {
      const { password, ...safe } = u;
      return safe;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, registerUser, signup, updateUserPermissions, adminUpdateUser, updateProfile, deleteUser, getAllUsers, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
