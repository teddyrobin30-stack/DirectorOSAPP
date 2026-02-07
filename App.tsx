import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home, Users, CheckSquare, Calendar as CalendarIcon, 
  Briefcase, Settings, MessageSquare, Loader2, Lock, BarChart3, UsersRound, 
  ClipboardList, ChefHat, BedDouble, Wrench, UtensilsCrossed, ArrowLeft, 
  ArrowRight, Bell, Flower2, LogOut, Sparkles
} from 'lucide-react';

// --- TYPES ---
import { 
  Contact, Task, Group, CalendarEvent, UserSettings, BusinessConfig, 
  CatalogItem, Venue, Client, MonthlyInventory, Recipe, RatioItem, 
  ChatChannel, ChatMessage, Room, LaundryIssue, MaintenanceTicket, 
  MaintenanceContract, Lead, InboxItem, LogEntry, WakeUpCall, 
  TaxiBooking, LostItem, SpaRequest 
} from './types';

// --- COMPONENTS ---
import MainDashboard from './components/MainDashboard'; // RENAMED FROM Dashboard
import AgendaView from './components/AgendaView';
import ContactsView from './components/ContactsView';
import TasksView from './components/TasksView';
import GroupsView from './components/GroupsView';
import MessagingView from './components/MessagingView';
import InventoryView from './components/InventoryView';
import KitchenEngineeringView from './components/KitchenEngineeringView';
import HousekeepingView from './components/HousekeepingView';
import MaintenanceView from './components/MaintenanceView';
import ReceptionView from './components/ReceptionView';
import SpaView from './components/SpaView'; 
import SalesCRMView from './components/SalesCRMView'; 
import AiAssistant from './components/AiAssistant';
import LoginPage from './components/LoginPage';
import InstallPwaPrompt from './components/InstallPwaPrompt';

// --- MODALS ---
import SettingsModal from './components/SettingsModal';
import TaskModal from './components/TaskModal';
import GroupModal from './components/GroupModal';
import EventModal from './components/EventModal';
import ContactModal from './components/ContactModal';
import GroupDetailModal from './components/GroupDetailModal';
import ContactDetailModal from './components/ContactDetailModal';
import BusinessConfigModal from './components/BusinessConfigModal';
import StatsModal from './components/StatsModal';
import ClientDatabaseModal from './components/ClientDatabaseModal';

// --- SERVICES & FIREBASE ---
import { AuthProvider, useAuth } from './services/authContext';
import { 
  INITIAL_CONTACTS, INITIAL_TODOS, INITIAL_GROUPS, INITIAL_EVENTS, 
  INITIAL_BUSINESS_CONFIG, INITIAL_CATALOG, INITIAL_VENUES, INITIAL_CLIENTS, 
  INITIAL_INVENTORY, INITIAL_RECIPES, INITIAL_RATIO_ITEMS, INITIAL_RATIO_CATEGORIES, 
  INITIAL_CHANNELS, INITIAL_ROOMS, INITIAL_TICKETS, INITIAL_CONTRACTS, 
  INITIAL_LEADS, INITIAL_INBOX, INITIAL_LOGS, INITIAL_WAKEUPS, INITIAL_TAXIS, 
  INITIAL_LOST_ITEMS, INITIAL_SPA_REQUESTS 
} from './services/mockData';
import { 
  syncRooms, syncTasks, syncInventory, syncContacts, subscribeToSharedCollection, 
  subscribeToUserCollection, DB_COLLECTIONS, saveDocument, deleteDocument 
} from './services/db';
import { db } from './firebase';

// --- CONFIGURATION ---
const GOOGLE_CLIENT_ID = ""; 

// Storage keys
const STORAGE_KEYS = {
  CONTACTS: 'hotelos_contacts_v3',
  TODOS: 'hotelos_todos_v3',
  GROUPS: 'hotelos_groups_v3',
  EVENTS: 'hotelos_events_v3',
  SETTINGS: 'hotelos_settings_v3',
  CONVERSATIONS: 'hotelos_conversations_v3',
  CHANNELS: 'hotelos_channels_v1', 
  GOOGLE_TOKEN: 'hotelos_google_token',
  BUSINESS_CONFIG: 'hotelos_business_v1',
  CATALOG: 'hotelos_catalog_v1',
  VENUES: 'hotelos_venues_v1',
  CLIENTS: 'hotelos_clients_v1',
  INVENTORY: 'hotelos_inventory_v1',
  RECIPES: 'hotelos_recipes_v1',
  RATIO_ITEMS: 'hotelos_ratio_items_v1',
  RATIO_CATS: 'hotelos_ratio_cats_v1',
  ROOMS: 'hotelos_rooms_v1',
  LAUNDRY: 'hotelos_laundry_v1',
  TICKETS: 'hotelos_tickets_v1',
  CONTRACTS: 'hotelos_contracts_v1',
  LEADS: 'hotelos_leads_v1',
  INBOX: 'hotelos_inbox_v1',
  LOGS: 'hotelos_logs_v1',
  WAKEUPS: 'hotelos_wakeups_v1',
  TAXIS: 'hotelos_taxis_v1',
  LOST_ITEMS: 'hotelos_lost_items_v1',
  SPA_REQUESTS: 'hotelos_spa_requests_v1'
};

const AuthenticatedApp: React.FC = () => {
  const { user, loading, getAllUsers, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // UI States
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // --- DATA STATES ---
  const [contacts, setContacts] = useState<Contact[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTACTS) || JSON.stringify(INITIAL_CONTACTS)));
  const [clients, setClients] = useState<Client[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || JSON.stringify(INITIAL_CLIENTS)));
  const [inventory, setInventory] = useState<Record<string, MonthlyInventory>>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY) || JSON.stringify(INITIAL_INVENTORY)));
  const [recipes, setRecipes] = useState<Recipe[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.RECIPES) || JSON.stringify(INITIAL_RECIPES)));
  const [ratioItems, setRatioItems] = useState<RatioItem[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.RATIO_ITEMS) || JSON.stringify(INITIAL_RATIO_ITEMS)));
  const [ratioCategories, setRatioCategories] = useState<string[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.RATIO_CATS) || JSON.stringify(INITIAL_RATIO_CATEGORIES)));
  const [todos, setTodos] = useState<Task[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.TODOS) || JSON.stringify(INITIAL_TODOS)));
  const [rooms, setRooms] = useState<Room[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || JSON.stringify(INITIAL_ROOMS)));
  const [laundryIssues, setLaundryIssues] = useState<LaundryIssue[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.LAUNDRY) || "[]"));
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.TICKETS) || JSON.stringify(INITIAL_TICKETS)));
  const [contracts, setContracts] = useState<MaintenanceContract[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTRACTS) || JSON.stringify(INITIAL_CONTRACTS)));
  const [leads, setLeads] = useState<Lead[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.LEADS) || JSON.stringify(INITIAL_LEADS)));
  const [inbox, setInbox] = useState<InboxItem[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.INBOX) || JSON.stringify(INITIAL_INBOX)));
  const [logs, setLogs] = useState<LogEntry[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || JSON.stringify(INITIAL_LOGS)));
  const [wakeups, setWakeups] = useState<WakeUpCall[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.WAKEUPS) || JSON.stringify(INITIAL_WAKEUPS)));
  const [taxis, setTaxis] = useState<TaxiBooking[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.TAXIS) || JSON.stringify(INITIAL_TAXIS)));
  const [lostItems, setLostItems] = useState<LostItem[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.LOST_ITEMS) || JSON.stringify(INITIAL_LOST_ITEMS)));
  const [spaRequests, setSpaRequests] = useState<SpaRequest[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.SPA_REQUESTS) || JSON.stringify(INITIAL_SPA_REQUESTS)));
  const [groups, setGroups] = useState<Group[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS) || JSON.stringify(INITIAL_GROUPS)));
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((e: any) => ({ ...e, start: new Date(e.start) }));
    }
    return INITIAL_EVENTS;
  });
  const [channels, setChannels] = useState<ChatChannel[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.CHANNELS) || JSON.stringify(INITIAL_CHANNELS)));
  
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : {
      userName: user?.displayName || 'Directeur',
      themeColor: 'indigo',
      darkMode: false,
      autoDarkMode: false,
      googleSync: false,
      whatsappSync: false
    };
  });

  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BUSINESS_CONFIG);
    return saved ? JSON.parse(saved) : INITIAL_BUSINESS_CONFIG;
  });

  const [catalog, setCatalog] = useState<CatalogItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CATALOG);
    return saved ? JSON.parse(saved) : INITIAL_CATALOG;
  });

  const [venues, setVenues] = useState<Venue[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VENUES);
    return saved ? JSON.parse(saved) : INITIAL_VENUES;
  });

  // --- FIREBASE SYNC SUBSCRIPTIONS ---
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

    // 2. ESPACES PRIVÉS
    unsubs.push(subscribeToUserCollection(DB_COLLECTIONS.TASKS, user.uid, (data) => setTodos(data as Task[])));
    unsubs.push(subscribeToUserCollection(DB_COLLECTIONS.AGENDA, user.uid, (data) => {
        const evts = data.map((e: any) => ({ ...e, start: new Date(e.start.seconds ? e.start.seconds * 1000 : e.start) }));
        setEvents(evts as CalendarEvent[]);
    }));
    unsubs.push(subscribeToUserCollection(DB_COLLECTIONS.CONTACTS, user.uid, (data) => setContacts(data as Contact[])));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user]);

  // Sync user name
  useEffect(() => {
    if (user?.displayName && user.displayName !== userSettings.userName) {
      setUserSettings(prev => ({...prev, userName: user.displayName}));
    }
  }, [user]);

  // --- ACTIONS ---
  const handleOpenSettings = () => {
    if (user?.permissions.canManageSettings) setShowSettingsModal(true);
    else alert("Accès restreint aux Administrateurs.");
  };

  const handleOpenBusinessConfig = () => {
    if (user?.permissions.canManageSettings) setShowBusinessConfigModal(true);
    else alert("Accès restreint.");
  };

  const handleOpenStats = () => {
    if (user?.role === 'admin' || user?.role === 'manager') setShowStatsModal(true);
    else alert("Accès restreint aux Managers et Administrateurs.");
  }

  const handleOpenClients = () => {
    if (user?.role === 'admin' || user?.role === 'manager') setShowClientDBModal(true);
    else alert("Accès restreint aux Managers et Administrateurs.");
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Wrappers with Firebase
  const handleUpdateRooms = (newRooms: Room[]) => {
    setRooms(newRooms);
    newRooms.forEach(r => saveDocument(DB_COLLECTIONS.ROOMS, r));
  };

  const handleUpdateTickets = (newTickets: MaintenanceTicket[]) => {
    setTickets(newTickets);
    newTickets.forEach(t => saveDocument(DB_COLLECTIONS.MAINTENANCE, t));
  };

  const handleSaveContact = (contact: Contact) => {
    const secureContact = { ...contact, ownerId: user?.uid };
    saveDocument(DB_COLLECTIONS.CONTACTS, secureContact);
    setEditContact(null);
  };

  const handleSaveClient = (client: Client) => {
    saveDocument(DB_COLLECTIONS.GROUPS, { ...client, type_doc: 'client' });
  };

  const handleUpdateClient = (updatedClient: Client) => {
    saveDocument(DB_COLLECTIONS.GROUPS, { ...updatedClient, type_doc: 'client' });
  };
  
  const handleSendMessage = (channelId: string, message: ChatMessage) => {
    setChannels(prev => prev.map(ch => {
      if (ch.id === channelId) {
        return {
          ...ch,
          messages: [...ch.messages, message],
          lastMessage: message.text || (message.attachments?.length ? 'Pièce jointe' : ''),
          lastUpdate: message.timestamp
        };
      }
      return ch;
    }).sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()));
  };

  const handleSaveTask = (task: Task, options?: { sendSms?: boolean, shareInChat?: boolean }) => {
    const secureTask = { ...task, ownerId: user?.uid }; 
    saveDocument(DB_COLLECTIONS.TASKS, secureTask);
    setEditTask(null);
  };

  const handleTaskStatusChange = (id: string | number, status: 'Pas commencé' | 'En cours' | 'Terminé') => {
    const task = todos.find(t => t.id === id);
    if (task) {
        const updated = { ...task, status, done: status === 'Terminé' };
        saveDocument(DB_COLLECTIONS.TASKS, updated);
    }
  };
  
  const handleSaveGroup = (group: Group) => {
    saveDocument(DB_COLLECTIONS.GROUPS, group);
    setEditGroup(null);
    setShowGroupModal(false);
    if (selectedGroupDetail?.id === group.id) setSelectedGroupDetail(group);
  };

  const handleSaveEvent = (event: CalendarEvent) => {
    const secureEvent = { ...event, ownerId: user?.uid };
    saveDocument(DB_COLLECTIONS.AGENDA, secureEvent);
    setEditEvent(null);
  };

  const handleDeleteEvent = (id: number | string) => {
    deleteDocument(DB_COLLECTIONS.AGENDA, id);
    setShowEventModal(false);
  };

  const handleTriggerCommunication = (contactId: number | string, text: string) => {};

  const handleCreateTaskFromMessage = (text: string) => {
    setEditTask({
        id: Date.now(),
        text: text,
        done: false,
        tag: 'Général',
        priority: 'Medium',
        status: 'Pas commencé',
        ownerId: user?.uid
    });
    setShowTaskModal(true);
    setActiveTab('todo');
  };

  const handleGoogleLogin = (token: string) => {
    // Placeholder
  };

  const totalUnread = useMemo(() => channels.reduce((acc, c) => acc + c.unreadCount, 0), [channels]);

  // Modal States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showClientDBModal, setShowClientDBModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<Group | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [selectedContactDetail, setSelectedContactDetail] = useState<Contact | null>(null);
  const [showBusinessConfigModal, setShowBusinessConfigModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-300 ${userSettings.darkMode ? 'bg-slate-900 text-slate-100 dark' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Install Prompt */}
      <InstallPwaPrompt />

      {/* Header */}
      <div className={`sticky top-0 z-40 px-6 py-4 flex justify-between items-center backdrop-blur-md border-b ${userSettings.darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700`}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`text-${userSettings.themeColor}-600`}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 7v10M16 7v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
               </svg>
            </div>
            <span className="font-bold tracking-[0.2em] text-sm uppercase">HotelOS</span>
          </div>
          <div className="flex gap-2 items-center">
             {(user.role === 'admin' || user.role === 'manager') && (
                <>
                  <button 
                    onClick={handleOpenClients} 
                    className={`p-2 rounded-lg border shadow-sm transition-colors ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                    title="Base Clients"
                  >
                    <UsersRound size={20} />
                  </button>
                  <button 
                    onClick={handleOpenStats} 
                    className={`p-2 rounded-lg border shadow-sm transition-colors ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                    title="Statistiques & KPI"
                  >
                    <BarChart3 size={20} />
                  </button>
                </>
             )}
             <button onClick={handleOpenSettings} className={`p-2 rounded-lg border shadow-sm transition-colors ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
               {user.permissions.canManageSettings ? <Settings size={20} /> : <Lock size={20} />}
             </button>

             {/* USER AVATAR & MENU */}
             <div className="relative ml-2" ref={userMenuRef}>
               <button 
                 onClick={() => setShowUserMenu(!showUserMenu)}
                 className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 transition-transform active:scale-95 ${userSettings.darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-indigo-100 border-white text-indigo-700'}`}
               >
                 {user.displayName.slice(0, 2).toUpperCase()}
               </button>

               {/* Dropdown Menu */}
               {showUserMenu && (
                 <div className={`absolute right-0 top-full mt-3 w-48 rounded-2xl shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 origin-top-right ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                       <p className="text-sm font-black truncate">{user.displayName}</p>
                       <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
                    </div>
                    <div className="p-1">
                       <button 
                         onClick={logout}
                         className="w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                       >
                          <LogOut size={14}/> Déconnexion
                       </button>
                    </div>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full overflow-y-auto no-scrollbar pb-28">
        <div className="max-w-7xl mx-auto w-full h-full">
          {activeTab === 'dashboard' && (
            <MainDashboard 
              userSettings={userSettings} 
              events={events} 
              todos={todos} 
              contacts={contacts} 
              groups={user.permissions.canViewSharedData ? groups : []} 
              leads={leads}
              inbox={inbox}
              onNavigate={setActiveTab}
              onTaskToggle={(id) => handleTaskStatusChange(id, todos.find(t => t.id === id)?.done ? 'En cours' : 'Terminé')} 
              onTaskClick={(t) => { setEditTask(t); setShowTaskModal(true); }}
              onEventClick={(e) => { setEditEvent(e); setShowEventModal(true); }}
              onGroupClick={setSelectedGroupDetail}
              onOpenEventModal={() => { setEditEvent(null); setShowEventModal(true); }}
              onOpenTaskModal={() => { setEditTask(null); setShowTaskModal(true); }}
              onOpenContactModal={() => { setEditContact(null); setShowContactModal(true); }}
            />
          )}
          {activeTab === 'agenda' && (
            user.permissions.canViewAgenda ? (
              <AgendaView 
                events={events} todos={todos} userSettings={userSettings} 
                onAdd={() => { setEditEvent(null); setShowEventModal(true); }}
                onEventClick={(e) => { setEditEvent(e); setShowEventModal(true); }}
                onGroupClick={setSelectedGroupDetail} groups={groups}
              />
            ) : <div className="flex flex-col items-center justify-center h-full text-slate-400"><Lock size={48} className="mb-4 opacity-20" /><p className="font-bold">Accès Agenda restreint.</p></div>
          )}
          {activeTab === 'contacts' && (
            <ContactsView 
              contacts={contacts} userSettings={userSettings} 
              onAdd={() => { setEditContact(null); setShowContactModal(true); }} 
              onContactClick={setSelectedContactDetail}
              onDelete={(id) => {}}
            />
          )}
          {activeTab === 'todo' && (
            <TasksView 
              todos={todos} 
              userSettings={userSettings} 
              groups={groups} 
              onAdd={() => { setEditTask(null); setShowTaskModal(true); }}
              onToggle={(id) => handleTaskStatusChange(id, todos.find(t => t.id === id)?.done ? 'En cours' : 'Terminé')}
              onTaskClick={(t) => { setEditTask(t); setShowTaskModal(true); }}
              onDelete={(id) => deleteDocument(DB_COLLECTIONS.TASKS, id)}
              onStatusChange={handleTaskStatusChange}
            />
          )}
          {activeTab === 'messaging' && (
            user.permissions.canViewMessaging ? (
              <MessagingView 
                channels={channels} onUpdateChannels={setChannels}
                users={getAllUsers()} contacts={contacts} 
                userSettings={userSettings} currentUser={user}
                onSendMessage={handleSendMessage} onCreateTask={handleCreateTaskFromMessage}
              />
            ) : <div className="flex flex-col items-center justify-center h-full text-slate-400"><Lock size={48} className="mb-4 opacity-20" /><p className="font-bold">Accès Messagerie restreint.</p></div>
          )}
          {activeTab === 'reception' && (
            user.permissions.canViewReception ? (
              <ReceptionView 
                userSettings={userSettings} rooms={rooms}
                logs={logs} 
                onUpdateLogs={(l) => { l.forEach(log => saveDocument(DB_COLLECTIONS.RECEPTION, log)); }}
                wakeups={wakeups} 
                onUpdateWakeups={(w) => { w.forEach(wk => saveDocument(DB_COLLECTIONS.RECEPTION, wk)); }}
                taxis={taxis} 
                onUpdateTaxis={(t) => { t.forEach(tx => saveDocument(DB_COLLECTIONS.RECEPTION, tx)); }}
                lostItems={lostItems} 
                onUpdateLostItems={(li) => { li.forEach(l => saveDocument(DB_COLLECTIONS.RECEPTION, l)); }}
              />
            ) : <div className="flex flex-col items-center justify-center h-full text-slate-400"><Lock size={48} className="mb-4 opacity-20" /><p className="font-bold">Accès Réception restreint.</p></div>
          )}
          {activeTab === 'spa' && (
            user.permissions.canViewSpa ? (
              <SpaView 
                userSettings={userSettings}
                requests={spaRequests}
                onUpdateRequests={(r) => { r.forEach(req => saveDocument(DB_COLLECTIONS.SPA, req)); }}
              />
            ) : <div className="flex flex-col items-center justify-center h-full text-slate-400"><Lock size={48} className="mb-4 opacity-20" /><p className="font-bold">Accès Spa restreint.</p></div>
          )}
          {activeTab === 'housekeeping' && (user.permissions.canViewHousekeeping ? <HousekeepingView userSettings={userSettings} rooms={rooms} onUpdateRooms={handleUpdateRooms} laundryIssues={laundryIssues} onUpdateLaundry={(l) => setLaundryIssues(l)} onNavigate={setActiveTab} /> : <div className="flex flex-col items-center justify-center h-full text-slate-400"><Lock size={48} className="mb-4 opacity-20" /><p className="font-bold">Accès Ménage restreint.</p></div>)}
          {activeTab === 'maintenance' && (user.permissions.canViewMaintenance ? <MaintenanceView userSettings={userSettings} userRole={user.role} tickets={tickets} contracts={contracts} onUpdateTickets={handleUpdateTickets} onUpdateContracts={(c) => setContracts(c)} onNavigate={setActiveTab} /> : <div className="flex flex-col items-center justify-center h-full text-slate-400"><Lock size={48} className="mb-4 opacity-20" /><p className="font-bold">Accès Maintenance restreint.</p></div>)}
          
          {/* Groups Portal */}
          {activeTab === 'groups_portal' && (
            <div className="h-full flex flex-col p-6 animate-in fade-in">
               <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                        <Briefcase size={28} />
                     </div>
                     <div>
                        <h2 className="text-2xl font-black">Groupes</h2>
                        <p className="text-xs font-bold text-slate-400">Opérations & Commercial</p>
                     </div>
                  </div>
                  <button onClick={() => setActiveTab('dashboard')} className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><ArrowLeft size={14}/> Retour</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full pt-10">
                  <button onClick={() => setActiveTab('groups_rm')} className={`p-8 rounded-[40px] border-2 border-slate-100 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group text-left relative overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 ${userSettings.darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                     <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500"><CalendarIcon size={140} /></div>
                     <div className="p-4 rounded-2xl bg-blue-100 text-blue-600 w-fit mb-6"><CalendarIcon size={32} /></div>
                     <h3 className="text-2xl font-black mb-2">RM & OPÉRATIONS</h3>
                     <p className="text-sm text-slate-500 font-medium">Planning, rooming lists, et gestion opérationnelle des groupes confirmés ou en option.</p>
                     <div className="mt-8 flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">Accéder <ArrowRight size={16}/></div>
                  </button>
                  <button onClick={() => setActiveTab('groups_crm')} className={`p-8 rounded-[40px] border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all group text-left relative overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 ${userSettings.darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                     <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500"><Briefcase size={140} /></div>
                     <div className="p-4 rounded-2xl bg-indigo-100 text-indigo-600 w-fit mb-6"><Briefcase size={32} /></div>
                     <h3 className="text-2xl font-black mb-2">SUIVI COMMERCIAL & LEADS</h3>
                     <p className="text-sm text-slate-500 font-medium">Gestion des demandes entrantes, relances et validation des dossiers.</p>
                     <div className="mt-8 flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">Accéder <ArrowRight size={16}/></div>
                  </button>
               </div>
            </div>
          )}
          {activeTab === 'groups_rm' && ( user.permissions.canViewSharedData ? <GroupsView groups={groups} userSettings={userSettings} contacts={contacts} onAdd={() => { setEditGroup(null); setShowGroupModal(true); }} onEdit={(g) => { setEditGroup(g); setShowGroupModal(true); }} onGroupClick={setSelectedGroupDetail} onDelete={(id) => deleteDocument(DB_COLLECTIONS.GROUPS, id)} onOpenBusinessConfig={handleOpenBusinessConfig} venues={venues} /> : <div className="flex flex-col items-center justify-center h-full text-slate-400"><Lock size={48} className="mb-4 opacity-20" /><p className="font-bold">Accès restreint.</p></div>)}
          {activeTab === 'groups_crm' && ( user.permissions.canViewCRM ? <SalesCRMView userSettings={userSettings} leads={leads} onUpdateLeads={(l) => l.forEach(lead => saveDocument(DB_COLLECTIONS.GROUPS, lead))} inbox={inbox} onUpdateInbox={(i) => i.forEach(item => saveDocument(DB_COLLECTIONS.GROUPS, item))} clients={clients} onUpdateClients={(c) => c.forEach(cl => saveDocument(DB_COLLECTIONS.GROUPS, { ...cl, type_doc: 'client' }))} users={getAllUsers()} onNavigate={(tab) => tab === 'dashboard' ? setActiveTab('groups_portal') : setActiveTab(tab)} /> : <div className="flex flex-col items-center justify-center h-full text-slate-400"><Lock size={48} className="mb-4 opacity-20" /><p className="font-bold">Accès restreint au CRM.</p></div>)}
          
          {/* F&B Section */}
          {activeTab === 'fnb' && (
            <div className="h-full flex flex-col p-6 animate-in fade-in">
               <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                        <UtensilsCrossed size={28} />
                     </div>
                     <div>
                        <h2 className="text-2xl font-black">Gestion F&B</h2>
                        <p className="text-xs font-bold text-slate-400">Restauration & Economat</p>
                     </div>
                  </div>
                  <button onClick={() => setActiveTab('dashboard')} className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><ArrowLeft size={14}/> Retour</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full pt-10">
                  <button onClick={() => setActiveTab('inventory')} className={`p-8 rounded-[40px] border-2 border-slate-100 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-500 transition-all group text-left relative overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 ${userSettings.darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                     <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500"><ClipboardList size={140} /></div>
                     <div className="p-4 rounded-2xl bg-violet-100 text-violet-600 w-fit mb-6"><ClipboardList size={32} /></div>
                     <h3 className="text-2xl font-black mb-2">INVENTAIRE & STOCKS</h3>
                     <p className="text-sm text-slate-500 font-medium">Gestion des stocks mensuels, mouvements, fournisseurs et import CSV.</p>
                     <div className="mt-8 flex items-center gap-2 text-violet-600 font-bold text-xs uppercase tracking-widest">Accéder <ArrowRight size={16}/></div>
                  </button>
                  <button onClick={() => setActiveTab('kitchen')} className={`p-8 rounded-[40px] border-2 border-slate-100 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group text-left relative overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 ${userSettings.darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                     <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500"><ChefHat size={140} /></div>
                     <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-600 w-fit mb-6"><ChefHat size={32} /></div>
                     <h3 className="text-2xl font-black mb-2">COST CONTROL</h3>
                     <p className="text-sm text-slate-500 font-medium">Fiches techniques recettes, calculateur de marges, catalogue et ratios.</p>
                     <div className="mt-8 flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">Accéder <ArrowRight size={16}/></div>
                  </button>
               </div>
            </div>
          )}
          {activeTab === 'inventory' && (user.permissions.canViewFnb ? <InventoryView userSettings={userSettings} inventoryData={inventory} onUpdateInventory={(inv) => syncInventory(inv)} canManage={user.role !== 'staff'} /> : <div className="flex flex-col items-center justify-center h-full text-slate-400"><Lock size={48} className="mb-4 opacity-20" /><p className="font-bold">Accès F&B restreint.</p></div>)}
          {activeTab === 'kitchen' && (user.permissions.canViewFnb ? <KitchenEngineeringView userSettings={userSettings} recipes={recipes} onUpdateRecipes={setRecipes} onNavigate={(tab) => tab === 'dashboard' ? setActiveTab('fnb') : setActiveTab(tab)} inventoryData={inventory} ratioItems={ratioItems} onUpdateRatioItems={setRatioItems} customCategories={ratioCategories} onUpdateCategories={setRatioCategories} /> : <div className="flex flex-col items-center justify-center h-full text-slate-400"><Lock size={48} className="mb-4 opacity-20" /><p className="font-bold">Accès F&B restreint.</p></div>)}

        </div>
      </div>

      {/* Floating AI Assistant Button */}
      <button 
        onClick={() => setShowAiAssistant(true)}
        className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[100] w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group"
      >
        <Sparkles size={24} className="animate-pulse group-hover:animate-none" />
      </button>

      {/* Navigation Bar */}
      <div className={`fixed bottom-0 left-0 right-0 border-t backdrop-blur-xl z-50 pb-safe ${userSettings.darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-2xl mx-auto flex justify-between items-center p-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', icon: Home, label: 'Accueil', access: true },
            { id: 'agenda', icon: CalendarIcon, label: 'Agenda', access: user.permissions.canViewAgenda },
            { id: 'reception', icon: Bell, label: 'Réception', access: user.permissions.canViewReception },
            { id: 'spa', icon: Flower2, label: 'Spa', access: user.permissions.canViewSpa },
            { id: 'todo', icon: CheckSquare, label: 'Tâches', access: true }, // Toujours dispo
            { id: 'messaging', icon: MessageSquare, label: 'Messages', badge: totalUnread, access: user.permissions.canViewMessaging },
            { id: 'housekeeping', icon: BedDouble, label: 'Hébergement', access: user.permissions.canViewHousekeeping }, 
            { id: 'maintenance', icon: Wrench, label: 'Maintenance', access: user.permissions.canViewMaintenance },
            { id: 'contacts', icon: Users, label: 'VIP', access: true },
            { id: 'groups_portal', icon: Briefcase, label: 'Groupes', access: user.permissions.canViewSharedData },
            { id: 'fnb', icon: UtensilsCrossed, label: 'Gestion F&B', access: user.permissions.canViewFnb }, 
          ].filter(item => item.access).map((item) => {
              const isActive = activeTab === item.id || 
                (item.id === 'fnb' && (activeTab === 'inventory' || activeTab === 'kitchen')) ||
                (item.id === 'groups_portal' && (activeTab === 'groups_rm' || activeTab === 'groups_crm'));

              return (
              <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id)} 
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl transition-all relative min-w-[60px] ${isActive ? `bg-${userSettings.themeColor}-50 text-${userSettings.themeColor}-600 dark:bg-slate-800 dark:text-${userSettings.themeColor}-400` : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {item.badge ? (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                      {item.badge}
                    </span>
                  ) : null}
                  <span className={`text-[9px] font-bold ${isActive ? 'opacity-100' : 'hidden md:block opacity-60'}`}>{item.label}</span>
              </button>
          )})}
        </div>
      </div>

      {/* AI Assistant Modal */}
      <AiAssistant 
        isOpen={showAiAssistant} 
        onClose={() => setShowAiAssistant(false)}
        userSettings={userSettings}
        tasks={todos}
        contacts={contacts}
        rooms={rooms}
        inventory={inventory}
        maintenance={tickets}
      />

      {/* Modals */}
      <SettingsModal 
        isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} 
        settings={userSettings} onSave={setUserSettings} 
        onGoogleLogin={handleGoogleLogin}
        clientId={GOOGLE_CLIENT_ID}
      />
      <BusinessConfigModal 
        isOpen={showBusinessConfigModal} 
        onClose={() => setShowBusinessConfigModal(false)}
        config={businessConfig}
        catalog={catalog}
        venues={venues}
        onSaveConfig={setBusinessConfig}
        onSaveCatalog={setCatalog}
        onSaveVenues={setVenues}
        userSettings={userSettings}
      />
      <StatsModal 
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        groups={groups}
        userSettings={userSettings}
      />
      <ClientDatabaseModal 
        isOpen={showClientDBModal}
        onClose={() => setShowClientDBModal(false)}
        clients={clients}
        groups={groups}
        userSettings={userSettings}
        onUpdateClient={handleUpdateClient}
      />
      <TaskModal 
        isOpen={showTaskModal} onClose={() => { setShowTaskModal(false); setEditTask(null); }} 
        contacts={contacts} onSave={handleSaveTask} userSettings={userSettings} editTask={editTask}
        onTriggerCommunication={handleTriggerCommunication}
        groups={user.permissions.canViewSharedData ? groups : []}
      />
      <GroupModal 
        isOpen={showGroupModal} onClose={() => { setShowGroupModal(false); setEditGroup(null); }} 
        contacts={contacts} onSave={handleSaveGroup} userSettings={userSettings} editGroup={editGroup}
        onTriggerCommunication={handleTriggerCommunication}
        clients={clients}
        onSaveClient={handleSaveClient}
      />
      <ContactModal isOpen={showContactModal} onClose={() => { setShowContactModal(false); setEditContact(null); }} onSave={handleSaveContact} userSettings={userSettings} editContact={editContact} />
      <EventModal 
        isOpen={showEventModal} onClose={() => { setShowEventModal(false); setEditEvent(null); }} 
        contacts={contacts} onSave={handleSaveEvent} onDelete={handleDeleteEvent} userSettings={userSettings} editEvent={editEvent}
        onTriggerCommunication={handleTriggerCommunication}
      />
      <GroupDetailModal 
        isOpen={selectedGroupDetail !== null} 
        onClose={() => setSelectedGroupDetail(null)} 
        group={selectedGroupDetail} 
        allGroups={groups}
        clients={clients}
        contacts={contacts} 
        onEdit={(g) => { setSelectedGroupDetail(null); setEditGroup(g); setShowGroupModal(true); }} 
        onSave={handleSaveGroup}
        userSettings={userSettings}
        businessConfig={businessConfig}
        catalog={catalog}
        venues={venues}
      />
      <ContactDetailModal isOpen={selectedContactDetail !== null} onClose={() => setSelectedContactDetail(null)} contact={selectedContactDetail} onEdit={(c) => { setSelectedContactDetail(null); setEditContact(c); setShowContactModal(true); }} userSettings={userSettings} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
};

export default App;