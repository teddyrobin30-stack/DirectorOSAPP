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
  | 'tasks_focus';

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
export type LeadStatus = 'nouveau' | 'en_cours' | 'valide' | 'perdu';

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
  requestDate: string;
  source: InboxSource;
  status: 'to_process' | 'processed' | 'archived';
  eventStartDate?: string;
  eventEndDate?: string;
  note?: string;
  quoteSent: boolean;
  lastFollowUp?: string;
  rooms?: Rooms; // ✅ Ajouté pour la synchronisation
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