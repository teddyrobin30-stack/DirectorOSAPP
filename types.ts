
export interface UserSettings {
  userName: string;
  themeColor: string;
  darkMode: boolean;
  autoDarkMode?: boolean;
  googleSync?: boolean;
  whatsappSync?: boolean;
  weatherCity?: string;
}

export interface WeatherData {
  temp: number;
  city: string;
  condition: string;
  loading: boolean;
}

export interface CalendarEvent {
  id: string | number;
  title: string;
  start: Date;
  time: string;
  duration: string;
  type: 'pro' | 'perso' | 'google';
  linkedContactId?: string | number;
  videoLink?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface Task {
  id: string | number; // Updated to allow string IDs for DB compatibility
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
}

export interface Contact {
  id: number | string;
  name: string;
  role: string;
  company?: string;
  category?: string;
  phone: string;
  email: string;
  address?: string;
  avatar?: string;
  initials?: string;
  color?: string;
  vip?: boolean;
  status?: string;
}

export interface GroupRooms {
  single: number;
  twin: number;
  double: number;
  family: number;
}

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
  rooms: GroupRooms;
  options: GroupOptions;
  note?: string;
  rmContactId?: string | number;
  invoiceItems?: InvoiceItem[];
  paymentSchedule?: PaymentSchedule[];
  createdAt?: string;
}

export type UserRole = 'admin' | 'manager' | 'staff';

export interface UserPermissions {
  // General
  canManageSettings: boolean;
  canViewSharedData: boolean; // Legacy
  
  // Specific View Access (New)
  canViewAgenda: boolean;
  canViewMessaging: boolean;
  canViewFnb: boolean;     // Inventory + Kitchen
  canViewHousekeeping: boolean;
  canViewMaintenance: boolean;
  canViewCRM: boolean;     // Sales + Groups
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

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  attachments?: Attachment[];
  reactions?: Reaction[];
}

export interface ChatChannel {
  id: string;
  type: 'group' | 'direct';
  name: string;
  participants: string[];
  messages: ChatMessage[];
  unreadCount: number;
  lastUpdate: string;
  isOnline?: boolean;
  lastMessage?: string;
}

export interface Venue {
  id: string;
  name: string;
  capacity: number;
  type: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  defaultPrice: number;
  defaultVat: number;
  technicalDescription?: string;
  defaultVenueId?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export interface BusinessConfig {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  vatNumber: string;
  bankName: string;
  iban: string;
  bic: string;
}

export interface Client {
  id: string;
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

export type InventoryCategory = 'Cuisine' | 'Petit Déjeuner' | 'Boissons sans alcool' | 'Boissons avec alcool' | string;

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  packaging: string;
  supplier: string;
  initialQty: number;
  initialUnitCost: number;
  unitCost: number;
  currentQty: number;
}

export interface MonthlyInventory {
  monthId: string;
  status: 'open' | 'closed';
  items: InventoryItem[];
  closedAt?: string;
}

export interface RecipeIngredient {
  id: string;
  inventoryItemId?: string;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  supplier?: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: 'Entrée' | 'Plat' | 'Dessert' | 'Autre';
  portions: number;
  targetCostPercent: number;
  vatRate: number;
  lastUpdated: string;
  ingredients: RecipeIngredient[];
}

export interface RatioItem {
  id: string;
  name: string;
  category: string;
  manualCost: number;
  targetPercent: number;
  vatRate: number;
  inventoryId?: string;
}

export type RoomStatusHK = 'not_started' | 'in_progress' | 'ready';
export type RoomStatusFront = 'stayover' | 'departure' | 'arrival' | 'vacant';

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: string;
  statusFront: RoomStatusFront;
  statusHK: RoomStatusHK;
}

export type LaundryType = 'Drap plat' | 'Housse couette' | 'Taie' | 'Serviette bain' | 'Tapis' | 'Peignoir' | 'Autre';

export interface LaundryIssue {
  id: string;
  date: string;
  type: LaundryType;
  quantity: number;
  comment: string;
  photoUrl?: string;
}

export type MaintenanceLocation = 'Chambres' | 'Hall' | 'Cuisine' | 'Extérieur' | 'Spa' | 'Technique' | 'Autre';
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved';

export interface MaintenanceTicket {
  id: string;
  location: MaintenanceLocation;
  description: string;
  status: MaintenanceStatus;
  createdAt: string;
  photoUrl?: string;
}

export type ContractStatus = 'active' | 'renew' | 'terminated';

export interface ContactDetails {
  name: string;
  phone: string;
  email?: string;
}

export interface MaintenanceContract {
  id: string;
  providerName: string;
  subject: string;
  contactPhone: string;
  contactEmail: string;
  status: ContractStatus;
  lastIntervention?: string;
  nextIntervention?: string;
  address?: string;
  website?: string;
  siret?: string;
  salesContact?: ContactDetails;
  technicalContact?: ContactDetails;
  startDate?: string;
  endDate?: string;
  frequency?: string;
  annualCost?: number;
}

export type LeadStatus = 'nouveau' | 'en_cours' | 'valide' | 'perdu';

export interface LeadChecklist {
  roomSetup: boolean;
  menu: boolean;
  roomingList: boolean;
}

export interface Lead {
  id: string;
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
}

export type InboxSource = 'email' | 'phone' | 'website';

export interface InboxItem {
  id: string;
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
}

export type LogPriority = 'info' | 'important' | 'urgent';
export type LogTarget = 'all' | 'management' | 'housekeeping' | 'maintenance';
export type LogStatus = 'active' | 'archived';

export interface LogEntry {
  id: string;
  author: string;
  message: string;
  priority: LogPriority;
  target: LogTarget;
  status: LogStatus;
  timestamp: string;
  readBy: string[];
}

export interface WakeUpCall {
  id: string;
  roomNumber: string;
  time: string;
  completed: boolean;
}

export interface TaxiBooking {
  id: string;
  guestName: string;
  roomNumber?: string;
  time: string;
  destination: string;
  company: string;
  completed: boolean;
}

export type LostItemStatus = 'stored' | 'contacted' | 'returned' | 'donated';

export interface LostItem {
  id: string;
  description: string;
  location: string;
  dateFound: string;
  finder: string;
  status: LostItemStatus;
  photoUrl?: string;
}

export interface Conversation {
  id: string;
}

export type SpaStatus = 'pending' | 'confirmed' | 'refused';
export type SpaRefusalReason = 'complet_cabine' | 'complet_soin' | 'contre_indication' | 'annulation' | 'autre';

export interface SpaRequest {
  id: string;
  clientName: string;
  phone: string;
  email: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  treatment: string;
  status: SpaStatus;
  refusalReason?: SpaRefusalReason;
  createdAt: string;
}