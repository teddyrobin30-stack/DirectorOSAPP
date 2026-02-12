/**
 * TYPES.TS - HotelOS
 * Version corrigée pour supprimer les erreurs de module et de synchronisation
 */

// =======================
// DASHBOARD
// =======================
export type DashboardWidgetId =
  | 'quick_actions'
  | 'agenda_today'
  | 'sales_pulse'
  | 'active_groups'
  | 'tasks_focus'
  | 'spa_requests'
  | 'fnb_calculator'
  | 'shift_log'
  | 'room_status'
  | 'team_chat';

export type DashboardWidgetSize = 'sm' | 'md' | 'lg';

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  enabled: boolean;
  order: number;
  size?: DashboardWidgetSize;
}

// =======================
// SETTINGS
// =======================
export interface UserSettings {
  userName: string;
  themeColor: string;
  darkMode: boolean;
  autoDarkMode?: boolean;
  googleSync?: boolean;
  whatsappSync?: boolean;
  weatherCity?: string;
  dashboardWidgets?: DashboardWidgetConfig[];
}

// =======================
// ROOMS (Structure de base pour Groupes & CRM)
// =======================
// ✅ Correction ts(2724): Exportation du nom 'Rooms' attendu par les hooks
export interface Rooms {
  single: number;
  twin: number;
  double: number;
  family: number;
}
// Garder l'alias pour la compatibilité avec le code existant
export type GroupRooms = Rooms;

// =======================
// AGENDA
// =======================
export interface CalendarEvent {
  id: string | number;
  title: string;
  start: any; // Firestore Timestamp, Date ou string
  time: string;
  duration: string;
  type: 'pro' | 'perso' | 'google';
  linkedContactId?: string | number;
  videoLink?: string;
  ownerId?: string;
}

// =======================
// TASKS
// =======================
export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface Task {
  id: string | number;
  text: string;
  done: boolean;
  tag: string;
  date?: string;
  time?: string;
  priority?: 'Low' | 'Medium' | 'High';
  note?: string;
  linkedContactId?: string | number;
  linkedGroupId?: string | number;
  attachments?: Attachment[];
  ownerId?: string;
  status: 'Pas commencé' | 'En cours' | 'Terminé';
  dueDate?: string;
}

// =======================
// CONTACTS
// =======================
export interface Contact {
  id: number | string;
  name: string;
  role: string;
  company?: string;
  companyName?: string; // ✅ Ajouté pour compatibilité CRM
  category?: string;
  phone: string;
  email: string;
  address?: string;
  avatar?: string;
  initials?: string;
  color?: string;
  vip?: boolean;
  status?: string;
  ownerId?: string;
}

// =======================
// GROUPS
// =======================
export interface GroupOptions {
  je: boolean;
  demiJe: boolean;
  dinner: boolean;
  lunch: boolean;
  pause: boolean;
  roomHire: boolean;
  cocktail: boolean;
}

export interface InvoiceItem {
  id: string;
  date?: string;
  time?: string;
  endTime?: string;
  location?: string;
  description: string;
  setup?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  catalogId?: string;
}

export interface PaymentSchedule {
  id: string;
  label: string;
  percentage: number;
  dueDate: string;
  paid: boolean;
}

export interface Group {
  id: string | number;
  name: string;
  clientId?: string;
  category: string;
  status: 'option' | 'confirmed';
  startDate: string;
  endDate: string;
  nights: number;
  pax: number;
  rooms: Rooms;
  options: GroupOptions;
  note?: string;
  rmContactId?: string | number;
  invoiceItems?: InvoiceItem[];
  paymentSchedule?: PaymentSchedule[];
  createdAt?: string;
  ownerId?: string;
}

// =======================
// CRM (Sales & Leads)
// =======================
export type LeadStatus = 'nouveau' | 'en_cours' | 'valide' | 'perdu' | 'archived';

export interface LeadChecklist {
  roomSetup: boolean;
  menu: boolean;
  roomingList: boolean;
}

export interface Lead {
  id: string | number;
  groupName: string;
  contactName: string;
  email: string;
  phone: string;
  requestDate: string;
  startDate?: string;
  endDate?: string;
  eventDate?: string;
  pax: number;
  note: string;
  status: LeadStatus;
  checklist: LeadChecklist;
  ownerId?: string;
  rooms: Rooms; // ✅ Ajouté pour la synchronisation
}

export type InboxSource = 'email' | 'phone' | 'website';

export interface InboxItem {
  id: string | number;
  contactName: string;
  companyName?: string;
  email: string;
  phone: string;
  requestDate: string; // Date de création (reçu le...)
  source: InboxSource;

  // Nouveaux champs pour le traitement
  status: 'to_process' | 'processed' | 'archived'; // Statut global (Technique)
  processingStatus?: 'not_started' | 'in_progress' | 'finished'; // État d'avancement
  assignee?: string; // Qui est en charge
  quoteSent?: boolean; // Devis envoyé ?
  lastFollowUp?: string; // Date de relance

  eventStartDate?: string;
  eventEndDate?: string;
  note?: string;
  rooms?: Rooms;
}

// --- AJOUTS POUR LA NOUVELLE FICHE DOSSIER ---
export type InboxStatus = 'pas_commence' | 'en_cours' | 'termine' | 'archive';

export interface ExtendedInboxItem extends InboxItem {
  responsable?: string;
  statut?: InboxStatus; // Statut Métier (distinct du status technique)
  devisEnvoye?: boolean; // Alias fonctionnel pour quoteSent
  notesInterne?: string;
  dateRelance?: string; // Format ISO YYYY-MM-DD
  dateDerniereModification?: string;
}

// =======================
// CLIENTS (Correction ts(2305))
// =======================
export interface Client {
  id: string | number;
  name: string;
  type: 'Entreprise' | 'Particulier';
  email: string;
  phone: string;
  address: string;
  siret?: string;
  companyName?: string;
  company?: string; // ✅ Alias pour compatibilité
  category?: string;
  vat?: string;
  notes?: string;
  createdAt: string;
}

// =======================
// USERS / AUTH
// =======================
export type UserRole = 'admin' | 'manager' | 'staff';

export interface UserPermissions {
  canManageSettings: boolean;
  canViewSharedData: boolean;
  canViewAgenda: boolean;
  canViewMessaging: boolean;
  canViewFnb: boolean;
  canViewHousekeeping: boolean;
  canViewMaintenance: boolean;
  canViewCRM: boolean;
  canViewReception: boolean;
  canViewSpa: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string; // ✅ Ajouté pour transmission lead
  permissions: UserPermissions;
  createdAt: number;
}

// =======================
// CHAT & HOTEL OPS (Simplifié pour la stabilité)
// =======================
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  attachments?: Attachment[];
  reactions?: any[];
}

export interface ChatChannel {
  id: string;
  type: 'group' | 'direct';
  name: string;
  participants: string[];
  allowedUserIds?: string[]; // ✅ [NEW] Privacy
  messages: ChatMessage[];
  unreadCount: number;
  lastUpdate: string;
  isOnline?: boolean;
  lastMessage?: string;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: string;
  statusFront: 'stayover' | 'departure' | 'arrival' | 'vacant';
  statusHK: 'not_started' | 'in_progress' | 'ready';
}

export interface MaintenanceTicket {
  id: string | number;
  location: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

export interface SpaRequest {
  id: string;
  clientName: string;
  phone: string;
  date: string;
  time: string;
  treatment: string;
  status: 'pending' | 'confirmed' | 'refused';
  createdAt: string;
}

// Stubs pour éviter les erreurs d'import
export interface Conversation { id: string; }
export interface Venue { id: string; name: string; }
export interface CatalogItem { id: string; name: string; defaultPrice: number; }
export interface BusinessConfig { companyName: string; }
export interface InventoryItem { id: string; name: string; currentQty: number; }

export type SpaStatus = 'pending' | 'confirmed' | 'refused';
export type SpaRefusalReason = 'complet_cabine' | 'complet_soin' | 'contre_indication' | 'annulation' | 'autre';

export type SpaSource = 'Direct' | 'Extérieur' | 'Weekendesk' | 'Thalasseo' | 'Sport Découverte' | 'Thalasso n°1' | 'Saisie Manuelle';

export interface SpaRequest {
  id: string;
  clientName: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  treatment: string;
  status: SpaStatus;
  refusalReason?: SpaRefusalReason; // Si refusé
  source?: string; // NEW: Source de la réservation (Type string pour permettre "Saisie Manuelle" custom)
  createdAt: string;
}

export type SpaInventoryCategory = 'Huiles & Crèmes' | 'Linge' | 'Consommables' | 'Entretien';

export interface SpaInventoryItem {
  id: string;
  name: string;
  category: SpaInventoryCategory;
  quantity: number;
  minQuantity: number; // Seuil d'alerte
  unit: string; // ml, L, pièce
  unitCost: number; // NEW: Coût unitaire
  updatedAt: string;
}

// --- MISSING TYPES ADDED ---
export interface MaintenanceContract {
  id: string; providerName: string; description: string; startDate: string; endDate: string; status: 'active' | 'expired';
}
export interface LogEntry {
  id: string; date: string; message: string; author: string; category: 'info' | 'alert' | 'task';
}
export interface WakeUpCall {
  id: string; roomNumber: string; time: string; date: string; status: 'pending' | 'completed';
}
export interface TaxiBooking {
  id: string; clientName: string; pickupTime: string; destination: string; status: 'confirmed' | 'cancelled';
}
export interface LostItem {
  id: string; description: string; locationFound: string; dateFound: string; status: 'stored' | 'returned';
}
export interface MonthlyInventory {
  monthId: string; status: 'open' | 'closed'; closedAt?: string; items: InventoryItem[];
}
export interface RecipeIngredient {
  name: string; qty: number; unit: string; cost: number;
}
export interface Recipe {
  id: string; name: string; category: string; ingredients: RecipeIngredient[]; totalCost: number; portionPrice?: number;
}
export interface RatioItem {
  id: string; name: string; cost: number; price: number; ratio: number;
}