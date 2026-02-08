import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { UserProfile } from '../types';

type UseUsersResult = {
  users: UserProfile[];
  loading: boolean;
  error: string | null;
};

// Normalise un doc Firestore -> UserProfile (sécurisé)
const safeUserProfile = (uid: string, data: any): UserProfile => {
  const p = data?.permissions || {};

  return {
    uid,
    email: String(data?.email || ''),
    displayName: String(data?.displayName || data?.userName || ''), // fallback legacy
    role: (data?.role as UserProfile['role']) || 'staff',
    permissions: {
      canManageSettings: Boolean(p?.canManageSettings),
      canViewSharedData: Boolean(p?.canViewSharedData),

      canViewAgenda: Boolean(p?.canViewAgenda),
      canViewMessaging: Boolean(p?.canViewMessaging),
      canViewFnb: Boolean(p?.canViewFnb),
      canViewHousekeeping: Boolean(p?.canViewHousekeeping),
      canViewMaintenance: Boolean(p?.canViewMaintenance),
      canViewCRM: Boolean(p?.canViewCRM),
      canViewReception: Boolean(p?.canViewReception),
      canViewSpa: Boolean(p?.canViewSpa),
    },
    createdAt: Number(data?.createdAt || Date.now()),
  };
};

export const useUsers = (): UseUsersResult => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const userData = snapshot.docs.map((doc) =>
          safeUserProfile(doc.id, doc.data())
        );

        setUsers(userData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err?.message || 'Erreur Firestore');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { users, loading, error };
};
