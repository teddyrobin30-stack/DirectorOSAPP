
import { 
  Contact, Task, Group, CalendarEvent, BusinessConfig, CatalogItem, 
  Venue, Client, MonthlyInventory, Recipe, RatioItem, ChatChannel, 
  Room, MaintenanceTicket, MaintenanceContract, Lead, InboxItem, 
  LogEntry, WakeUpCall, TaxiBooking, LostItem, SpaRequest 
} from '../types';

export const INITIAL_CONTACTS: Contact[] = [
  { id: 1, name: 'Jean Dupont', role: 'Directeur', phone: '0601020304', email: 'jean@hotel.com', category: 'Staff', initials: 'JD', color: 'bg-blue-100 text-blue-700' },
  { id: 2, name: 'Sophie Martin', role: 'CEO TechCorp', company: 'TechCorp', phone: '0612345678', email: 'sophie@tech.com', category: 'VIP', initials: 'SM', color: 'bg-purple-100 text-purple-700', vip: true, status: 'In House' }
];

export const INITIAL_TODOS: Task[] = [
  { id: 1, text: 'Vérifier planning', done: false, tag: 'Général', priority: 'High', status: 'Pas commencé' },
  { id: 2, text: 'Commander fleurs', done: true, tag: 'Admin', priority: 'Medium', status: 'Terminé' }
];

export const INITIAL_GROUPS: Group[] = [
  {
    id: 'grp-1',
    name: 'Séminaire TechCorp',
    clientId: 'cl-1',
    category: 'Séminaire',
    status: 'confirmed',
    startDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
    endDate: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString().split('T')[0],
    nights: 2,
    pax: 15,
    rooms: { single: 10, twin: 5, double: 0, family: 0 },
    options: { je: true, demiJe: false, dinner: true, lunch: true, pause: true, roomHire: true, cocktail: false },
    invoiceItems: [],
    paymentSchedule: []
  }
];

export const INITIAL_EVENTS: CalendarEvent[] = [
  { id: 1, title: 'Réunion Staff', start: new Date(), time: '10:00', duration: '1h', type: 'pro' }
];

export const INITIAL_BUSINESS_CONFIG: BusinessConfig = {
  companyName: 'Hotel Excelsior',
  address: '1 Avenue des Champs-Élysées, 75008 Paris',
  phone: '01 40 00 00 00',
  email: 'contact@hotel-excelsior.fr',
  siret: '123 456 789 00012',
  vatNumber: 'FR 12 3456789',
  bankName: 'BNP Paribas',
  iban: 'FR76 3000 4000 5000 6000 7000 89',
  bic: 'BNPARIPP'
};

export const INITIAL_CATALOG: CatalogItem[] = [
  { id: 'cat-1', name: 'Journée Étude (Forfait)', defaultPrice: 85, defaultVat: 20 },
  { id: 'cat-2', name: 'Location Salle (Demi-journée)', defaultPrice: 400, defaultVat: 20 },
  { id: 'cat-3', name: 'Pause Café Standard', defaultPrice: 12, defaultVat: 10 }
];

export const INITIAL_VENUES: Venue[] = [
  { id: 'ven-1', name: 'Salon Vendôme', capacity: 50, type: 'Réunion' },
  { id: 'ven-2', name: 'Terrasse Rooftop', capacity: 100, type: 'Cocktail' }
];

export const INITIAL_CLIENTS: Client[] = [
  { id: 'cl-1', name: 'TechCorp', type: 'Entreprise', email: 'contact@techcorp.com', phone: '0102030405', address: 'Paris', createdAt: new Date().toISOString() }
];

export const INITIAL_INVENTORY: Record<string, MonthlyInventory> = {};

export const INITIAL_RECIPES: Recipe[] = [];

export const INITIAL_RATIO_ITEMS: RatioItem[] = [];

export const INITIAL_RATIO_CATEGORIES: string[] = ['Food', 'Beverage', 'Cleaning'];

export const INITIAL_CHANNELS: ChatChannel[] = [
  {
    id: 'ch-general',
    type: 'group',
    name: 'Général',
    participants: [],
    messages: [
      { id: 'msg-1', senderId: 'system', senderName: 'System', text: 'Bienvenue sur HotelOS Messaging.', timestamp: new Date().toISOString() }
    ],
    unreadCount: 0,
    lastUpdate: new Date().toISOString()
  }
];

export const INITIAL_ROOMS: Room[] = Array.from({ length: 20 }, (_, i) => ({
  id: `rm-${100 + i}`,
  number: `${100 + i}`,
  floor: 1,
  type: 'Double',
  statusFront: 'vacant',
  statusHK: 'ready'
}));

export const INITIAL_TICKETS: MaintenanceTicket[] = [];

export const INITIAL_CONTRACTS: MaintenanceContract[] = [];

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_INBOX: InboxItem[] = [];

export const INITIAL_LOGS: LogEntry[] = [
  { id: 'log-1', author: 'Réception Matin', message: 'La clé de la 204 est introuvable.', priority: 'important', target: 'all', status: 'active', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), readBy: [] },
  { id: 'log-2', author: 'Directeur', message: 'VIP Arrivée ce soir (Mme Marceau). Faire setup Champagne.', priority: 'urgent', target: 'housekeeping', status: 'active', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), readBy: ['manager-uid'] },
];

export const INITIAL_WAKEUPS: WakeUpCall[] = [
  { id: 'wk-1', roomNumber: '102', time: '06:30', completed: false },
  { id: 'wk-2', roomNumber: '205', time: '07:00', completed: true },
];

export const INITIAL_TAXIS: TaxiBooking[] = [
  { id: 'tx-1', guestName: 'M. Bond', roomNumber: '407', time: '08:00', destination: 'Aéroport CDG', company: 'G7', completed: false }
];

export const INITIAL_LOST_ITEMS: LostItem[] = [
  { id: 'li-1', description: 'Chargeur iPhone Blanc', location: 'Lobby Bar', dateFound: new Date(Date.now() - 86400000).toISOString(), finder: 'Barman', status: 'stored' }
];

export const INITIAL_SPA_REQUESTS: SpaRequest[] = [
  {
    id: 'spa-1',
    clientName: 'Mme Durand',
    phone: '0611223344',
    email: 'durand@mail.com',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    treatment: 'Massage Californien 1h',
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: 'spa-2',
    clientName: 'M. Bernard',
    phone: '0655667788',
    email: 'bernard@mail.com',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '10:00',
    treatment: 'Soin Visage Éclat',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];
