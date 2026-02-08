import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserRole, UserPermissions } from '../types';

// --- INTERFACE ---
interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  registerUser: (email: string, password: string, role: UserRole, name: string, permissions: UserPermissions) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  updateUserPermissions: (uid: string, role: UserRole, permissions: UserPermissions) => Promise<void>;
  adminUpdateUser: (uid: string, updates: any) => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
  deleteUser: (uid: string) => Promise<void>;
  getAllUsers: () => UserProfile[]; // Gardé pour compatibilité, mais renverra vide (utiliser useUsers)
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- TES PERMISSIONS (J'ai gardé ta logique métier exacte) ---
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
      return defaults;
    default:
      return defaults;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. SURVEILLANCE DE LA SESSION (Le cœur de Firebase)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // L'utilisateur est connecté, on va chercher ses infos dans Firestore
        try {
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setUser(docSnap.data() as UserProfile);
          } else {
            // Cas de secours : Si le profil n'existe pas en base, on le crée
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Utilisateur',
              role: 'staff',
              permissions: getDefaultPermissions('staff'),
              createdAt: Date.now()
            };
            await setDoc(docRef, newProfile);
            setUser(newProfile);
          }
        } catch (e) {
          console.error("Erreur chargement profil:", e);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. INSCRIPTION PUBLIQUE (C'est ici que ça se joue !)
  const signup = async (email: string, pass: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      // A. Création Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser = userCredential.user;

      // B. Mise à jour du nom technique
      await firebaseUpdateProfile(newUser, { displayName: name });

      // C. ENREGISTREMENT DANS FIRESTORE (La partie manquante avant)
      // On donne le rôle 'manager' par défaut comme dans ton ancien code
      const userProfile: UserProfile = {
        uid: newUser.uid,
        email: email,
        displayName: name,
        role: 'manager', 
        permissions: getDefaultPermissions('manager'),
        createdAt: Date.now()
      };

      await setDoc(doc(db, "users", newUser.uid), userProfile);
      
      // L'état 'user' sera mis à jour automatiquement par le useEffect ci-dessus
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Cet email est déjà utilisé.");
      } else {
        setError("Erreur lors de l'inscription : " + err.message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 3. LOGIN
  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      setError("Email ou mot de passe incorrect.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 4. LOGOUT
  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // 5. FONCTIONS ADMIN & UPDATE
  
  // Note: Créer un user pour autrui est complexe avec Firebase Client SDK (il faut se déconnecter).
  // Pour cette version, on garde la structure mais on prévient.
  const registerUser = async (email: string, pass: string, role: UserRole, name: string, permissions: UserPermissions) => {
     throw new Error("Pour ajouter un employé, demandez-lui de s'inscrire via la page de connexion, puis changez son rôle.");
  };

  const updateProfile = async (displayName: string) => {
    if (!user || !auth.currentUser) return;
    try {
      await firebaseUpdateProfile(auth.currentUser, { displayName });
      await updateDoc(doc(db, "users", user.uid), { displayName });
      
      // Mise à jour locale immédiate
      setUser(prev => prev ? { ...prev, displayName } : null);
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  const updateUserPermissions = async (uid: string, role: UserRole, permissions: UserPermissions) => {
    if (user?.role !== 'admin') return;
    await updateDoc(doc(db, "users", uid), { role, permissions });
  };

  const adminUpdateUser = async (uid: string, updates: any) => {
    if (user?.role !== 'admin') return;
    await updateDoc(doc(db, "users", uid), updates);
  };

  const deleteUser = async (uid: string) => {
    if (user?.role !== 'admin') return;
    // Suppression de la base de données uniquement
    await deleteDoc(doc(db, "users", uid));
  };

  // Fonction Legacy (Remplacée par useUsers hook, on renvoie vide pour pas casser le code)
  const getAllUsers = () => {
    return []; 
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ 
      user, loading, login, logout, registerUser, signup, 
      updateUserPermissions, adminUpdateUser, updateProfile, deleteUser, 
      getAllUsers, error, clearError 
    }}>
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
