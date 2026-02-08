import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { UserSettings } from '../types'; // Ou UserProfile selon ton fichier types

export const useUsers = () => {
  const [users, setUsers] = useState<UserSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cette requête écoute la collection "users" en direct
    const q = query(collection(db, "users"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserSettings[];
      
      setUsers(userData);
      setLoading(false);
    });

    // Nettoyage quand on quitte l'écran
    return () => unsubscribe();
  }, []);

  return { users, loading };
};
