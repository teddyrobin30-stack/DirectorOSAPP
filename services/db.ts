import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe
} from "firebase/firestore";

/**
 * Génère un identifiant unique standardisé
 */
export const generateId = (prefix: string = ''): string => {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
};

// --- TYPES DE COLLECTIONS ---
// Mapping strict selon les consignes de l'architecte
const COLLECTIONS = {
  // ESPACES COMMUNS
  ROOMS: 'hebergement',
  MAINTENANCE: 'maintenance',
  INVENTORY: 'f_and_b',
  GROUPS: 'groupes',
  RECEPTION: 'reception', // Contient logs, taxis, wakeups, lost_found
  SPA: 'spa',
  MESSAGES_GLOBAL: 'messages_global',

  // ESPACES PRIVÉS
  TASKS: 'user_tasks',
  AGENDA: 'user_agenda',
  CONTACTS: 'user_contacts',
  DASHBOARD: 'user_dashboard',
  MESSAGES_PRIVATE: 'messages_private',
  SPA_INVENTORY: 'spa_inventory'
};

// --- FONCTIONS D'ÉCRITURE GÉNÉRIQUES ---

/**
 * Sauvegarde ou Met à jour un document
 */
export const saveDocument = async (collectionName: string, data: any) => {
  try {
    if (!data.id) throw new Error("Document must have an ID");
    const docRef = doc(db, collectionName, String(data.id));
    // On utilise { merge: true } pour ne pas écraser les champs existants si partiel
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error(`Error saving to ${collectionName}:`, error);
    return false;
  }
};

/**
 * Supprime un document
 */
export const deleteDocument = async (collectionName: string, id: string | number) => {
  try {
    await deleteDoc(doc(db, collectionName, String(id)));
    return true;
  } catch (error) {
    console.error(`Error deleting from ${collectionName}:`, error);
    return false;
  }
};

// --- LISTENERS (SYNCHRONISATION TEMPS RÉEL) ---

/**
 * Écoute une collection PARTAGÉE (Tout le staff voit tout)
 */
export const subscribeToSharedCollection = (
  collectionName: string,
  callback: (data: any[]) => void
): Unsubscribe => {
  const q = query(collection(db, collectionName));

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(items);
  }, (error) => {
    console.warn(`Listener error on ${collectionName}:`, error);
  });
};

/**
 * Écoute une collection PRIVÉE (Filtrée par ownerId)
 */
export const subscribeToUserCollection = (
  collectionName: string,
  userId: string,
  callback: (data: any[]) => void
): Unsubscribe => {
  if (!userId) return () => { };

  const q = query(collection(db, collectionName), where("ownerId", "==", userId));

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(items);
  }, (error) => {
    console.warn(`Listener error on ${collectionName} for user ${userId}:`, error);
  });
};

// --- WRAPPERS SPÉCIFIQUES (Pour garder la compatibilité avec App.tsx) ---

// 1. CHAMBRES (Commun)
export const syncRooms = async (rooms: any[]) => {
  // En production, on sauvegarde un par un ou en batch. Ici on simule une maj unitaire si changée.
  // Pour l'instant, l'App appelle syncRooms avec tout le tableau, on va juste sauvegarder les items modifiés 
  // Idéalement, App.tsx devrait appeler saveDocument à l'unité.
  rooms.forEach(r => saveDocument(COLLECTIONS.ROOMS, r));
};

// 2. TÂCHES (Privé)
export const syncTasks = async (tasks: any[]) => {
  // Les tâches sont privées, on s'assure qu'elles ont un ownerId
  tasks.forEach(t => {
    if (t.ownerId) saveDocument(COLLECTIONS.TASKS, t);
  });
};

// 3. INVENTAIRE (Commun)
export const syncInventory = async (inventory: any) => {
  // L'inventaire est un gros objet Record<string, MonthlyInventory>.
  // On va sauvegarder chaque Mois comme un document dans 'f_and_b'
  Object.values(inventory).forEach((monthData: any) => {
    saveDocument(COLLECTIONS.INVENTORY, { ...monthData, id: monthData.monthId });
  });
};

// 4. CONTACTS (Privé ou Public selon la logique, ici Privé selon consigne B)
export const syncContacts = async (contacts: any[]) => {
  // Note: La consigne demande 'user_contacts' privé.
  // Si on veut des contacts partagés, il faudrait une autre collection.
  // Ici on suppose que le userContext gère l'ownerId avant l'appel.
  contacts.forEach(c => saveDocument(COLLECTIONS.CONTACTS, c));
};

// 5. CLIENTS (Commun pour le CRM)
export const syncClients = async (clients: any[]) => {
  // On met les clients dans 'groupes' ou une sous-collection, ou 'reception'.
  // Pour l'instant, utilisons 'reception' (catégorie fourre-tout pour clients) ou créons 'crm_clients'.
  // Consigne A: 'groupes' est le plus proche pour le CRM
  clients.forEach(c => saveDocument(COLLECTIONS.GROUPS, { ...c, type_doc: 'client' }));
};

// 6. SPA INVENTORY
export const syncSpaInventory = async (items: any[]) => {
  items.forEach(i => saveDocument(COLLECTIONS.SPA_INVENTORY, i));
};

// Export constants for App.tsx usage
export const DB_COLLECTIONS = COLLECTIONS;
