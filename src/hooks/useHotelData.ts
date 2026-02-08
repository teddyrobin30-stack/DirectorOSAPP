// src/hooks/useHotelData.ts
import { useState, useEffect } from 'react';
import { 
  subscribeToSharedCollection, 
  subscribeToUserCollection, 
  DB_COLLECTIONS 
} from '../services/db';
import { 
  INITIAL_CONTACTS, INITIAL_TODOS, // ... import all mock data
} from '../services/mockData';
// ... import types

export const useHotelData = (user: any) => {
  // 1. Déplacer tous les states de DONNÉES ici (pas les states d'UI comme showModal)
  const [contacts, setContacts] = useState<Contact[]>(() => JSON.parse(localStorage.getItem('hotelos_contacts_v3') || JSON.stringify(INITIAL_CONTACTS)));
  const [todos, setTodos] = useState<Task[]>(() => JSON.parse(localStorage.getItem('hotelos_todos_v3') || JSON.stringify(INITIAL_TODOS)));
  const [rooms, setRooms] = useState<Room[]>([]);
  // ... ajouter les autres states (inventory, events, etc.) ici

  // 2. Déplacer le useEffect de subscription Firebase ici
  useEffect(() => {
    if (!user) return;
    const unsubs: (() => void)[] = [];

    // Abonnements
    unsubs.push(subscribeToSharedCollection(DB_COLLECTIONS.ROOMS, (data) => setRooms(data as Room[])));
    unsubs.push(subscribeToUserCollection(DB_COLLECTIONS.TASKS, user.uid, (data) => setTodos(data as Task[])));
    // ... ajouter tous les autres abonnements ici

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user]);

  // 3. Retourner les données et les setters nécessaires
  return {
    contacts, setContacts,
    todos, setTodos,
    rooms, setRooms,
    // ... return everything needed
  };
};
