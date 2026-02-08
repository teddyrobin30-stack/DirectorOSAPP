// src/hooks/useHotelData.ts
import { useState, useEffect } from 'react';
import { 
  subscribeToSharedCollection, 
  subscribeToUserCollection, 
  DB_COLLECTIONS 
} from '../services/db';
import { 
  INITIAL_CONTACTS, INITIAL_TODOS, INITIAL_GROUPS, INITIAL_EVENTS, 
  INITIAL_INVENTORY, INITIAL_RECIPES, INITIAL_ROOMS, INITIAL_TICKETS, 
  INITIAL_CHANNELS, INITIAL_LOGS 
} from '../services/mockData';
import { 
  Contact, Task, Group, CalendarEvent, Room, MaintenanceTicket, 
  MaintenanceContract, Lead, InboxItem, LogEntry, WakeUpCall, 
  TaxiBooking, LostItem, SpaRequest, Client, MonthlyInventory, 
  Recipe, RatioItem, ChatChannel 
} from '../types';

// ✅ IMPORT DU HOOK COMPLEMENTAIRE
import { useUsers } from './useUsers';

// Helper pour le LocalStorage
function useStickyState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const stickyValue = localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  return [value, setValue];
}

export const useHotelData = (user: any) => {
  // ✅ UTILISATION DE useUsers
  const { users: allUsers } = useUsers();

  // --- STATES ---
  const [contacts, setContacts] = useStickyState<Contact[]>('hotelos_contacts_v3', INITIAL_CONTACTS);
  const [todos, setTodos] = useStickyState<Task[]>('hotelos_todos_v3', INITIAL_TODOS);
  const [groups, setGroups] = useStickyState<Group[]>('hotelos_groups_v3', INITIAL_GROUPS);
  const [rooms, setRooms] = useStickyState<Room[]>('hotelos_rooms_v1', INITIAL_ROOMS);
  const [tickets, setTickets] = useStickyState<MaintenanceTicket[]>('hotelos_tickets_v1', INITIAL_TICKETS);
  const [contracts, setContracts] = useStickyState<MaintenanceContract[]>('hotelos_contracts_v1', []);
  const [inventory, setInventory] = useStickyState<Record<string, MonthlyInventory>>('hotelos_inventory_v1', INITIAL_INVENTORY);
  const [recipes, setRecipes] = useStickyState<Recipe[]>('hotelos_recipes_v1', INITIAL_RECIPES);
  
  // États simples
  const [channels, setChannels] = useState<ChatChannel[]>(INITIAL_CHANNELS);
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [wakeups, setWakeups] = useState<WakeUpCall[]>([]);
  const [taxis, setTaxis] = useState<TaxiBooking[]>([]);
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [spaRequests, setSpaRequests] = useState<SpaRequest[]>([]);
  const [laundryIssues, setLaundryIssues] = useState<any[]>([]);
  const [ratioItems, setRatioItems] = useState<RatioItem[]>([]);
  const [ratioCategories, setRatioCategories] = useState<string[]>([]);

  // --- FIREBASE SUBSCRIPTIONS ---
  useEffect(() => {
    if (!user) return;

    const unsubs: (() => void)[] = [];

    // 1. ESPACES COMMUNS
    unsubs.push(subscribeToSharedCollection(DB_COLLECTIONS.ROOMS, (data) => setRooms(data as Room[])));
    unsubs.push(subscribeToSharedCollection(DB_COLLECTIONS.MAINTENANCE, (data) => {
       const t = data.filter(d => !d.providerName) as MaintenanceTicket[]; 
       const c = data.filter(d => d.providerName) as MaintenanceContract[];
       setTickets(t);
       setContracts(c);
    }));
    unsubs.push(subscribeToSharedCollection(DB_COLLECTIONS.INVENTORY, (data) => {
       const invMap: Record<string, MonthlyInventory> = {};
       data.forEach((d: any) => invMap[d.monthId] = d);
       setInventory(invMap);
    }));
    unsubs.push(subscribeToSharedCollection(DB_COLLECTIONS.RECEPTION, (data) => {
       setLogs(data.filter(d => d.id.startsWith('log-')) as LogEntry[]);
       setWakeups(data.filter(d => d.id.startsWith('wk-')) as WakeUpCall[]);
       setTaxis(data.filter(d => d.id.startsWith('tx-')) as TaxiBooking[]);
       setLostItems(data.filter(d => d.id.startsWith('li-')) as LostItem[]);
    }));
    unsubs.push(subscribeToSharedCollection(DB_COLLECTIONS.GROUPS, (data) => {
       setGroups(data.filter(d => !d.type_doc) as Group[]);
       setLeads(data.filter(d => d.id.startsWith('lead-')) as Lead[]);
       const cls = data.filter(d => d.type_doc === 'client');
       if(cls.length > 0) setClients(cls as Client[]);
    }));
    unsubs.push(subscribeToSharedCollection(DB_COLLECTIONS.SPA, (data) => setSpaRequests(data as SpaRequest[])));

    // 2. MESSAGERIE
    unsubs.push(subscribeToSharedCollection('conversations', (data) => setChannels(data as ChatChannel[])));

    // 3. ESPACES PRIVÉS
    unsubs.push(subscribeToUserCollection(DB_COLLECTIONS.TASKS, user.uid, (data) => setTodos(data as Task[])));
    unsubs.push(subscribeToUserCollection(DB_COLLECTIONS.CONTACTS, user.uid, (data) => setContacts(data as Contact[])));
    
    // ✅ CORRECTION AGENDA : Dates Start ET End
    unsubs.push(subscribeToUserCollection(DB_COLLECTIONS.AGENDA, user.uid, (data) => {
       const evts = data.map((e: any) => ({ 
         ...e, 
         // Conversion du début
         start: new Date(e.start?.seconds ? e.start.seconds * 1000 : e.start),
         // ✅ Conversion de la fin (CRUCIAL POUR L'AFFICHAGE)
         end: new Date(e.end?.seconds ? e.end.seconds * 1000 : e.end || e.start) 
       }));
       setEvents(evts as CalendarEvent[]);
    }));

    return () => { unsubs.forEach(unsub => unsub()); };
  }, [user]);

  return {
    contacts, setContacts,
    todos, setTodos,
    groups, setGroups,
    rooms, setRooms,
    tickets, setTickets,
    contracts, setContracts,
    inventory, setInventory,
    recipes, setRecipes,
    channels, setChannels,
    events, setEvents,
    leads, setLeads,
    clients, setClients,
    inbox, setInbox,
    logs, setLogs,
    wakeups, setWakeups,
    taxis, setTaxis,
    lostItems, setLostItems,
    spaRequests, setSpaRequests,
    laundryIssues, setLaundryIssues,
    ratioItems, setRatioItems,
    ratioCategories, setRatioCategories,
    allUsers
  };
};