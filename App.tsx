// App.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
// 1. NOUVEAUX IMPORTS ROUTER
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
// 2. IMPORT ANIMATION
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition';

import {
  Home, Users, CheckSquare, Calendar as CalendarIcon,
  Briefcase, Settings, MessageSquare, Loader2, Lock, BarChart3, UsersRound,
  ClipboardList, ChefHat, BedDouble, Wrench, UtensilsCrossed, ArrowLeft,
  ArrowRight, Bell, Flower2, LogOut, Sparkles, ShieldCheck
} from 'lucide-react';

// --- TYPES & SERVICES ---
import {
  Contact, Task, Group, CalendarEvent, UserSettings, BusinessConfig,
  CatalogItem, Venue, Client, ChatMessage, Room, MaintenanceTicket
} from './types';
import { AuthProvider, useAuth } from './services/authContext';
import {
  DB_COLLECTIONS, syncTasks,
  syncInventory,
  syncContacts,
  syncClients,
  syncSpaInventory,
  saveDocument,
  deleteDocument
} from './services/db';
import { INITIAL_BUSINESS_CONFIG, INITIAL_CATALOG, INITIAL_VENUES } from './services/mockData';

// --- HOOKS ---
import { useHotelData } from './hooks/useHotelData';

// ✅ NEW: Firestore user settings hook
// ⚠️ adapte le chemin si ton fichier s’appelle différemment
import { useUserSettings } from './hooks/useUserSettings';


// --- COMPONENTS & MODALS ---
import MainDashboard from './components/MainDashboard';
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

// ✅ NEW VIEWS
import SettingsView from './components/SettingsView';
import AdminPanelView from './components/AdminPanelView';
import Sidebar from './components/Sidebar';
import MobileNavBar from './components/MobileNavBar';
import SplashScreen from './components/SplashScreen';
import CalendarView from './components/CalendarView';

const GOOGLE_CLIENT_ID = "";

const AuthenticatedApp: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // --- SPLASH SCREEN STATE ---
  const [showSplash, setShowSplash] = useState(true);
  const [splashFade, setSplashFade] = useState(false);

  useEffect(() => {
    // Start fade out at 2300ms (so it fades for 700ms until 3000ms)
    const timerFade = setTimeout(() => setSplashFade(true), 2300);
    // Unmount exactly at 3000ms
    const timerRemove = setTimeout(() => setShowSplash(false), 3000);
    return () => {
      clearTimeout(timerFade);
      clearTimeout(timerRemove);
    };
  }, []);

  // UI States
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Modals UI State
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

  // DATA (Via le Hook)
  const {
    contacts, todos, groups, rooms, tickets, contracts, inventory, recipes,
    channels, events, leads, clients, inbox, logs, wakeups, taxis, lostItems,
    spaRequests, ratioItems, ratioCategories, allUsers,
    setRooms, setTickets, setContracts, setRecipes,
    setRatioItems, setRatioCategories,
    spaInventory,
    setSpaInventory
  } = useHotelData(user);

  // ✅ SETTINGS (Firestore) — remplace le localStorage
  const {
    settings: userSettings,
    setSettings: setUserSettings,
    saveSettings,
    loading: settingsLoading,
    error: settingsError,
  } = useUserSettings(user?.uid, user?.displayName);

  // (Optionnel) tu peux garder businessConfig/catalog/venues en local pour l’instant
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>(() => {
    const saved = localStorage.getItem('hotelos_business_v1');
    return saved ? JSON.parse(saved) : INITIAL_BUSINESS_CONFIG;
  });

  const [catalog, setCatalog] = useState<CatalogItem[]>(() => {
    const saved = localStorage.getItem('hotelos_catalog_v1');
    return saved ? JSON.parse(saved) : INITIAL_CATALOG;
  });

  const [venues, setVenues] = useState<Venue[]>(() => {
    const saved = localStorage.getItem('hotelos_venues_v1');
    return saved ? JSON.parse(saved) : INITIAL_VENUES;
  });

  // ✅ Si displayName change, on l’aligne (et on persiste en Firestore)
  useEffect(() => {
    if (!user?.displayName) return;
    if (user.displayName !== userSettings.userName) {
      const next: UserSettings = { ...userSettings, userName: user.displayName };
      setUserSettings(next);         // UI direct
      saveSettings({ userName: user.displayName }); // persist Firestore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.displayName]);

  // Click Outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- HANDLERS ---
  const handleOpenSettings = () => user?.permissions.canManageSettings ? setShowSettingsModal(true) : alert("Accès restreint.");
  const handleOpenBusinessConfig = () => user?.permissions.canManageSettings ? setShowBusinessConfigModal(true) : alert("Accès restreint.");
  const handleOpenStats = () => (user?.role === 'admin' || user?.role === 'manager') ? setShowStatsModal(true) : alert("Accès restreint.");
  const handleOpenClients = () => (user?.role === 'admin' || user?.role === 'manager') ? setShowClientDBModal(true) : alert("Accès restreint.");

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

  // MESSAGERIE
  const handleSaveChannel = (channel: any) => saveDocument('conversations', channel);
  const handleDeleteChannel = (channelId: string) => deleteDocument('conversations', channelId);
  const handleSendMessage = (channelId: string, message: ChatMessage) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      const updatedChannel = {
        ...channel,
        messages: [...channel.messages, message],
        lastMessage: message.text || (message.attachments?.length ? 'Pièce jointe' : ''),
        lastUpdate: message.timestamp,
        unreadCount: (channel.unreadCount || 0) + 1
      };
      saveDocument('conversations', updatedChannel);
    }
  };

  // TASKS
  const handleSaveTask = (task: Task, options?: { sendSms?: boolean, shareInChat?: boolean }) => {
    const secureTask = { ...task, ownerId: user?.uid };
    saveDocument(DB_COLLECTIONS.TASKS, secureTask);

    if (options?.shareInChat && task.linkedGroupId) {
      const channel = channels.find(c => c.id === task.linkedGroupId);
      if (channel) {
        const message: ChatMessage = {
          id: `msg-task-${Date.now()}`,
          senderId: user?.uid || 'system',
          senderName: user?.displayName || 'Système',
          text: `📅 **Nouvelle Tâche assignée** : ${task.text}\nPriorité : ${task.priority}\nÉchéance : ${(task as any).dueDate || 'Non définie'}`,
          timestamp: new Date().toISOString(),
          reactions: []
        };
        handleSendMessage(channel.id, message);
      }
    }

    if (options?.sendSms && task.linkedContactId) {
      const contact = contacts.find(c => String(c.id) === String(task.linkedContactId));
      if (contact && contact.phone) {
        const body = `HotelOS: Tâche pour ${contact.name}.\n${task.text}\nPour le: ${(task as any).dueDate || 'ASAP'}`;
        window.location.href = `sms:${contact.phone}?body=${encodeURIComponent(body)}`;
      } else {
        alert("Ce contact n'a pas de numéro de téléphone enregistré.");
      }
    }

    setEditTask(null);
    setShowTaskModal(false);
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
    setShowEventModal(false);
  };

  const handleDeleteEvent = (id: number | string) => {
    deleteDocument(DB_COLLECTIONS.AGENDA, id);
    setShowEventModal(false);
  };

  const handleTriggerCommunication = (contactId: number | string, text: string) => { };

  const handleCreateTaskFromMessage = (text: string) => {
    setEditTask({
      id: Date.now(),
      text,
      done: false,
      tag: 'Général',
      priority: 'Medium',
      status: 'Pas commencé',
      ownerId: user?.uid
    });
    setShowTaskModal(true);
    navigate('/todo');
  };

  const handleGoogleLogin = (token: string) => { };
  const totalUnread = useMemo(() => channels.reduce((acc, c) => acc + c.unreadCount, 0), [channels]);

  // ✅ Loader: attendre Auth + Settings
  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  // (Optionnel) affiche une erreur settings sans bloquer l'app
  // if (settingsError) console.warn('Settings error:', settingsError);

  return (
    <div className={`min-h-screen w-full flex flex-col md:flex-row font-sans transition-colors duration-300 ${userSettings.darkMode ? 'bg-slate-900 text-slate-100 dark' : 'bg-slate-50 text-slate-900'}`}>
      <InstallPwaPrompt />
      {showSplash && <SplashScreen opacity={splashFade ? 0 : 1} />}

      {/* ✅ SIDEBAR (DESKTOP) */}
      <Sidebar userSettings={userSettings} totalUnread={totalUnread} />

      {/* HEADER (MOBILE ONLY) */}
      <div className={`md:hidden sticky top-0 z-40 px-6 py-4 flex justify-between items-center backdrop-blur-md border-b ${userSettings.darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={`text-${userSettings.themeColor}-600`}>
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
                <button onClick={handleOpenClients} className={`p-2 rounded-lg border shadow-sm transition-colors ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-100'}`}><UsersRound size={20} /></button>
                <button onClick={handleOpenStats} className={`p-2 rounded-lg border shadow-sm transition-colors ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-100'}`}><BarChart3 size={20} /></button>
              </>
            )}

            <button onClick={() => navigate('/settings')} className={`p-2 rounded-lg border shadow-sm transition-colors ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
              <Settings size={20} />
            </button>

            {/* USER MENU DROPDOWN */}
            <div className="relative ml-2" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 transition-transform active:scale-95 ${userSettings.darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-indigo-100 border-white text-indigo-700'}`}
              >
                {(user.displayName || 'U').slice(0, 2).toUpperCase()}
              </button>

              {showUserMenu && (
                <div className={`absolute right-0 top-full mt-3 w-48 rounded-2xl shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 origin-top-right ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-black truncate">{user.displayName}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
                  </div>
                  <div className="p-1">
                    <button onClick={logout} className="w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><LogOut size={14} /> Déconnexion</button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA - ROUTER SWITCH */}
      <div className="flex-1 w-full overflow-y-auto no-scrollbar pb-28 md:pb-0 h-[calc(100vh-80px)] md:h-screen">
        <div className="max-w-7xl mx-auto w-full h-full">
          <AnimatePresence mode='wait'>
            <Routes location={location} key={location.pathname}>

              <Route
                path="/"
                element={
                  <PageTransition>
                    <MainDashboard
                      userSettings={userSettings}
                      userRole={user?.role}
                      events={events}
                      todos={todos}
                      contacts={contacts}
                      groups={user.permissions.canViewSharedData ? groups : []}
                      leads={leads}
                      inbox={inbox}
                      spaRequests={spaRequests}
                      onNavigate={(path) => navigate(path)}
                      onTaskToggle={(id) =>
                        handleTaskStatusChange(
                          id,
                          todos.find((t) => t.id === id)?.done ? 'En cours' : 'Terminé'
                        )
                      }
                      onTaskClick={(t) => {
                        setEditTask(t);
                        setShowTaskModal(true);
                      }}
                      onEventClick={(e) => {
                        setEditEvent(e);
                        setShowEventModal(true);
                      }}
                      onGroupClick={setSelectedGroupDetail}
                      onOpenEventModal={() => {
                        setEditEvent(null);
                        setShowEventModal(true);
                      }}
                      onOpenTaskModal={() => {
                        setEditTask(null);
                        setShowTaskModal(true);
                      }}
                      onOpenContactModal={() => {
                        setEditContact(null);
                        setShowContactModal(true);
                      }}
                      onSaveDashboardWidgets={(widgets) =>
                        saveSettings({ dashboardWidgets: widgets })
                      }
                    />
                  </PageTransition>
                }
              />



              <Route path="/agenda" element={
                user.permissions.canViewAgenda ?
                  <PageTransition>
                    <CalendarView
                      events={events}
                      todos={todos}
                      userSettings={userSettings}
                      onAdd={() => { setEditEvent(null); setShowEventModal(true); }}
                      onEventClick={(e) => { setEditEvent(e); setShowEventModal(true); }}
                      onGroupClick={setSelectedGroupDetail}
                      groups={groups}
                      spaRequests={spaRequests}
                      leads={leads}
                      onUpdateEvent={handleSaveEvent}
                    />
                  </PageTransition>
                  : <Navigate to="/" />
              } />

              <Route path="/contacts" element={
                <PageTransition>
                  <ContactsView
                    contacts={contacts}
                    userSettings={userSettings}
                    onAdd={() => { setEditContact(null); setShowContactModal(true); }}
                    onContactClick={setSelectedContactDetail}
                    onDelete={(id) => { }}
                  />
                </PageTransition>
              } />

              <Route path="/todo" element={
                <PageTransition>
                  <TasksView
                    todos={todos}
                    userSettings={userSettings}
                    groups={groups}
                    onAdd={() => { setEditTask(null); setShowTaskModal(true); }}
                    onToggle={(id) => handleTaskStatusChange(id, (todos.find(t => t.id === id)?.done ? 'En cours' : 'Terminé'))}
                    onTaskClick={(t) => { setEditTask(t); setShowTaskModal(true); }}
                    onDelete={(id) => deleteDocument(DB_COLLECTIONS.TASKS, id)}
                    onStatusChange={handleTaskStatusChange}
                  />
                </PageTransition>
              } />

              <Route path="/messaging" element={
                user.permissions.canViewMessaging ?
                  <PageTransition>
                    <MessagingView
                      channels={channels}
                      onSaveChannel={handleSaveChannel}
                      onDeleteChannel={handleDeleteChannel}
                      onSendMessage={handleSendMessage}
                      users={allUsers}
                      contacts={contacts}
                      userSettings={userSettings}
                      currentUser={user}
                      onCreateTask={handleCreateTaskFromMessage}
                    />
                  </PageTransition>
                  : <Navigate to="/" />
              } />

              <Route path="/reception" element={
                user.permissions.canViewReception ?
                  <PageTransition>
                    <ReceptionView
                      userSettings={userSettings}
                      rooms={rooms}
                      logs={logs}
                      onUpdateLogs={(l) => { l.forEach(log => saveDocument(DB_COLLECTIONS.RECEPTION, log)); }}
                      wakeups={wakeups}
                      onUpdateWakeups={(w) => { w.forEach(wk => saveDocument(DB_COLLECTIONS.RECEPTION, wk)); }}
                      taxis={taxis}
                      onUpdateTaxis={(t) => { t.forEach(tx => saveDocument(DB_COLLECTIONS.RECEPTION, tx)); }}
                      lostItems={lostItems}
                      onUpdateLostItems={(li) => { li.forEach(l => saveDocument(DB_COLLECTIONS.RECEPTION, l)); }}
                    />
                  </PageTransition>
                  : <Navigate to="/" />
              } />

              <Route path="/spa" element={
                user.permissions.canViewSpa ?
                  <PageTransition>
                    <SpaView
                      userSettings={userSettings}
                      requests={spaRequests}
                      onUpdateRequests={(r) => { r.forEach(req => saveDocument(DB_COLLECTIONS.SPA, req)); }}
                      spaInventory={spaInventory}
                      onUpdateInventory={(items) => syncSpaInventory(items)}
                    />
                  </PageTransition>
                  : <Navigate to="/" />
              } />

              <Route path="/housekeeping" element={
                user.permissions.canViewHousekeeping ?
                  <PageTransition>
                    <HousekeepingView userSettings={userSettings} rooms={rooms} onUpdateRooms={handleUpdateRooms} onNavigate={(path) => navigate(path)} />
                  </PageTransition>
                  : <Navigate to="/" />
              } />

              <Route path="/maintenance" element={
                user.permissions.canViewMaintenance ?
                  <PageTransition>
                    <MaintenanceView userSettings={userSettings} userRole={user.role} tickets={tickets} contracts={contracts} onUpdateTickets={handleUpdateTickets} onUpdateContracts={setContracts} onNavigate={(path) => navigate(path)} />
                  </PageTransition>
                  : <Navigate to="/" />
              } />

              {/* --- ROUTES GROUPES --- */}
              <Route path="/groups" element={
                <PageTransition>
                  <div className="h-full flex flex-col p-6 animate-in fade-in">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20"><Briefcase size={28} /></div>
                        <div>
                          <h2 className="text-2xl font-black">Groupes</h2>
                          <p className="text-xs font-bold text-slate-400">Opérations & Commercial</p>
                        </div>
                      </div>
                      <button onClick={() => navigate('/')} className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><ArrowLeft size={14} /> Retour</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full pt-10">
                      <button onClick={() => navigate('/groups/rm')} className={`p-8 rounded-[40px] border-2 border-slate-100 dark:border-slate-700 hover:border-blue-500 transition-all group text-left relative overflow-hidden shadow-xl hover:-translate-y-1 ${userSettings.darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <div className="p-4 rounded-2xl bg-blue-100 text-blue-600 w-fit mb-6"><CalendarIcon size={32} /></div>
                        <h3 className="text-2xl font-black mb-2">RM & OPÉRATIONS</h3>
                        <p className="text-sm text-slate-500 font-medium">Planning, rooming lists, et gestion opérationnelle.</p>
                        <div className="mt-8 flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">Accéder <ArrowRight size={16} /></div>
                      </button>
                      <button onClick={() => navigate('/groups/crm')} className={`p-8 rounded-[40px] border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-500 transition-all group text-left relative overflow-hidden shadow-xl hover:-translate-y-1 ${userSettings.darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <div className="p-4 rounded-2xl bg-indigo-100 text-indigo-600 w-fit mb-6"><Briefcase size={32} /></div>
                        <h3 className="text-2xl font-black mb-2">SUIVI COMMERCIAL</h3>
                        <p className="text-sm text-slate-500 font-medium">Leads, relances et validation des dossiers.</p>
                        <div className="mt-8 flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">Accéder <ArrowRight size={16} /></div>
                      </button>
                    </div>
                  </div>
                </PageTransition>
              } />

              <Route path="/groups/rm" element={
                user.permissions.canViewSharedData ?
                  <PageTransition>
                    <GroupsView groups={groups} userSettings={userSettings} contacts={contacts} onAdd={() => { setEditGroup(null); setShowGroupModal(true); }} onEdit={(g) => { setEditGroup(g); setShowGroupModal(true); }} onGroupClick={setSelectedGroupDetail} onDelete={(id) => deleteDocument(DB_COLLECTIONS.GROUPS, id)} onOpenBusinessConfig={handleOpenBusinessConfig} venues={venues} />
                  </PageTransition>
                  : <Navigate to="/" />
              } />

              <Route path="/groups/crm" element={
                user.permissions.canViewCRM ?
                  <PageTransition>
                    <SalesCRMView
                      userSettings={userSettings}
                      leads={leads}
                      onUpdateLeads={(l) => l.forEach(lead => saveDocument(DB_COLLECTIONS.GROUPS, lead))}
                      inbox={inbox}
                      onUpdateInbox={(i) => i.forEach(item => saveDocument(DB_COLLECTIONS.GROUPS, item))}
                      clients={clients}
                      onUpdateClients={(c) => c.forEach(cl => saveDocument(DB_COLLECTIONS.GROUPS, { ...cl, type_doc: 'client' }))}
                      users={allUsers}
                      onNavigate={(path) => navigate(path)}
                    />
                  </PageTransition>
                  : <Navigate to="/" />
              } />

              {/* --- ROUTES F&B --- */}
              <Route path="/fnb" element={
                <PageTransition>
                  <div className="h-full flex flex-col p-6 animate-in fade-in">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20"><UtensilsCrossed size={28} /></div>
                        <div>
                          <h2 className="text-2xl font-black">Gestion F&B</h2>
                          <p className="text-xs font-bold text-slate-400">Restauration & Economat</p>
                        </div>
                      </div>
                      <button onClick={() => navigate('/')} className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><ArrowLeft size={14} /> Retour</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full pt-10">
                      <button onClick={() => navigate('/fnb/inventory')} className={`p-8 rounded-[40px] border-2 border-slate-100 dark:border-slate-700 hover:border-violet-500 transition-all group text-left relative overflow-hidden shadow-xl hover:-translate-y-1 ${userSettings.darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <div className="p-4 rounded-2xl bg-violet-100 text-violet-600 w-fit mb-6"><ClipboardList size={32} /></div>
                        <h3 className="text-2xl font-black mb-2">INVENTAIRE</h3>
                        <p className="text-sm text-slate-500 font-medium">Stocks mensuels, mouvements et fournisseurs.</p>
                        <div className="mt-8 flex items-center gap-2 text-violet-600 font-bold text-xs uppercase tracking-widest">Accéder <ArrowRight size={16} /></div>
                      </button>
                      <button onClick={() => navigate('/fnb/kitchen')} className={`p-8 rounded-[40px] border-2 border-slate-100 dark:border-slate-700 hover:border-emerald-500 transition-all group text-left relative overflow-hidden shadow-xl hover:-translate-y-1 ${userSettings.darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-600 w-fit mb-6"><ChefHat size={32} /></div>
                        <h3 className="text-2xl font-black mb-2">COST CONTROL</h3>
                        <p className="text-sm text-slate-500 font-medium">Fiches techniques, marges et ratios.</p>
                        <div className="mt-8 flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">Accéder <ArrowRight size={16} /></div>
                      </button>
                    </div>
                  </div>
                </PageTransition>
              } />

              <Route path="/fnb/inventory" element={
                user.permissions.canViewFnb ?
                  <PageTransition>
                    <InventoryView userSettings={userSettings} inventoryData={inventory} onUpdateInventory={(inv) => syncInventory(inv)} canManage={user.role !== 'staff'} />
                  </PageTransition>
                  : <Navigate to="/" />
              } />

              <Route path="/fnb/kitchen" element={
                user.permissions.canViewFnb ?
                  <PageTransition>
                    <KitchenEngineeringView userSettings={userSettings} recipes={recipes} onUpdateRecipes={setRecipes} onNavigate={(path) => navigate(path)} inventoryData={inventory} ratioItems={ratioItems} onUpdateRatioItems={setRatioItems} customCategories={ratioCategories} onUpdateCategories={setRatioCategories} />
                  </PageTransition>
                  : <Navigate to="/" />
              } />

              {/* ✅ NOUVELLES ROUTES SETTINGS & ADMIN */}
              <Route path="/settings" element={
                <PageTransition>
                  <SettingsView userSettings={userSettings} onSave={(s) => { setUserSettings(s); saveSettings(s); }} onNavigate={(path) => navigate(path)} />
                </PageTransition>
              } />

              <Route path="/admin" element={
                (user.role === 'admin' || user.role === 'manager') ?
                  <PageTransition>
                    <AdminPanelView userSettings={userSettings} onNavigate={(path) => navigate(path)} />
                  </PageTransition> : <Navigate to="/" />
              } />

            </Routes>
          </AnimatePresence>
        </div>
      </div>

      <button onClick={() => setShowAiAssistant(true)} className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[100] w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group"><Sparkles size={24} className="animate-pulse group-hover:animate-none" /></button>

      {/* NAVIGATION BAR - MobileNavBar (MOBILE ONLY) */}
      <MobileNavBar userSettings={userSettings} totalUnread={totalUnread} />

      {/* GLOBAL MODALS */}
      <AiAssistant
        isOpen={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
        userSettings={userSettings}
        tasks={todos}
        contacts={contacts}
        rooms={rooms}
        inventory={inventory}
        maintenance={tickets}
        onAddTask={(text) => handleSaveTask({
          id: Date.now(),
          text,
          done: false,
          tag: 'Général',
          priority: 'Medium',
          status: 'Pas commencé'
        })}
        onAddEvent={(details) => {
          setEditEvent({
            id: Date.now(),
            title: details.title,
            start: details.date ? new Date(details.date) : new Date(),
            end: details.date ? new Date(new Date(details.date).getTime() + 3600000) : new Date(Date.now() + 3600000),
            time: details.date ? new Date(details.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '09:00',
            duration: '1h',
            type: 'pro',
          });
          setShowEventModal(true);
        }}
      />

      {/* ✅ IMPORTANT: SettingsModal -> save Firestore */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={userSettings}
        onSave={(next) => {
          setUserSettings(next);     // UI instant
          saveSettings(next);        // Firestore
        }}
        onGoogleLogin={handleGoogleLogin}
        clientId={GOOGLE_CLIENT_ID}
      />

      <BusinessConfigModal isOpen={showBusinessConfigModal} onClose={() => setShowBusinessConfigModal(false)} config={businessConfig} catalog={catalog} venues={venues} onSaveConfig={setBusinessConfig} onSaveCatalog={setCatalog} onSaveVenues={setVenues} userSettings={userSettings} />
      <StatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} groups={groups} userSettings={userSettings} />
      <ClientDatabaseModal isOpen={showClientDBModal} onClose={() => setShowClientDBModal(false)} clients={clients} groups={groups} userSettings={userSettings} onUpdateClient={handleUpdateClient} />
      <TaskModal isOpen={showTaskModal} onClose={() => { setShowTaskModal(false); setEditTask(null); }} contacts={contacts} onSave={handleSaveTask} userSettings={userSettings} editTask={editTask} onTriggerCommunication={handleTriggerCommunication} groups={channels.filter(c => c.type === 'group')} />
      <GroupModal isOpen={showGroupModal} onClose={() => { setShowGroupModal(false); setEditGroup(null); }} contacts={contacts} onSave={handleSaveGroup} userSettings={userSettings} editGroup={editGroup} onTriggerCommunication={handleTriggerCommunication} clients={clients} onSaveClient={handleSaveClient} />
      <ContactModal isOpen={showContactModal} onClose={() => { setShowContactModal(false); setEditContact(null); }} onSave={handleSaveContact} userSettings={userSettings} editContact={editContact} />
      <EventModal isOpen={showEventModal} onClose={() => { setShowEventModal(false); setEditEvent(null); }} contacts={contacts} onSave={handleSaveEvent} onDelete={handleDeleteEvent} userSettings={userSettings} editEvent={editEvent} onTriggerCommunication={handleTriggerCommunication} />
      <GroupDetailModal isOpen={selectedGroupDetail !== null} onClose={() => setSelectedGroupDetail(null)} group={selectedGroupDetail} allGroups={groups} clients={clients} contacts={contacts} onEdit={(g) => { setSelectedGroupDetail(null); setEditGroup(g); setShowGroupModal(true); }} onSave={handleSaveGroup} userSettings={userSettings} businessConfig={businessConfig} catalog={catalog} venues={venues} />
      <ContactDetailModal isOpen={selectedContactDetail !== null} onClose={() => setSelectedContactDetail(null)} contact={selectedContactDetail} onEdit={(c) => { setSelectedContactDetail(null); setEditContact(c); setShowContactModal(true); }} userSettings={userSettings} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
