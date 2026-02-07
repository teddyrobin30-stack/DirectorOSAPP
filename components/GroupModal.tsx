import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Calendar, Users, MessageSquare, Moon, CheckCircle2, Clock, Building2, Search, Plus, Mail, Phone, MapPin, FileText, UserPlus, Tag } from 'lucide-react';
import { Contact, Group, UserSettings, GroupOptions, Client } from '../types';
import { GROUP_CATEGORIES } from '../constants';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onSave: (group: Group) => void;
  userSettings: UserSettings;
  editGroup?: Group | null;
  onTriggerCommunication?: (contactId: string | number, text: string) => void;
  clients?: Client[];
  onSaveClient?: (client: Client) => void;
}

const CLIENT_CATEGORIES = ['Séminaire', 'Association', 'Loisir', 'Sportif', 'Affaires'];

const GroupModal: React.FC<GroupModalProps> = ({ isOpen, onClose, contacts, onSave, userSettings, editGroup, onTriggerCommunication, clients = [], onSaveClient }) => {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  
  // New Client Creation State
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    email: '',
    phone: '',
    address: '',
    siret: '',
    companyName: '',
    category: ''
  });

  const [cat, setCat] = useState('Séminaire');
  const [status, setStatus] = useState<'option' | 'confirmed'>('option');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [pax, setPax] = useState<number>(0);
  const [rooms, setRooms] = useState({ single: 0, twin: 0, double: 0, family: 0 });
  const [options, setOptions] = useState<GroupOptions>({ je: false, demiJe: false, dinner: false, lunch: false, pause: false, roomHire: false, cocktail: false });
  const [rmContactId, setRmContactId] = useState<string | number>('');
  const [smsMessage, setSmsMessage] = useState('');
  const [isSmsEditing, setIsSmsEditing] = useState(false);

  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Calcul dynamique des nuitées
  const nightsCount = useMemo(() => {
    if (!start || !end) return 0;
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diff = d2.getTime() - d1.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  }, [start, end]);

  // Filtre Clients
  const filteredClients = useMemo(() => {
    if (!clientSearch) return [];
    return clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clientSearch, clients]);

  // Detect if we should show new client form
  useEffect(() => {
    // If search has text but no ID selected, check if it's a new name
    if (clientSearch && !clientId) {
        const exactMatch = clients.find(c => c.name.toLowerCase() === clientSearch.toLowerCase());
        if (!exactMatch) {
            setIsNewClient(true);
        } else {
            setIsNewClient(false);
        }
    } else {
        setIsNewClient(false);
    }
  }, [clientSearch, clientId, clients]);

  useEffect(() => {
    if (editGroup && isOpen) {
      setName(editGroup.name || ''); 
      setClientId(editGroup.clientId || '');
      // Find client name for search input
      const linkedClient = clients.find(c => c.id === editGroup.clientId);
      if (linkedClient) setClientSearch(linkedClient.name);
      else setClientSearch('');

      setCat(editGroup.category || 'Séminaire'); 
      setStatus(editGroup.status || 'option'); 
      setStart(editGroup.startDate || ''); 
      setEnd(editGroup.endDate || '');
      setPax(editGroup.pax || 0);
      setRooms(editGroup.rooms || { single: 0, twin: 0, double: 0, family: 0 }); 
      setOptions(editGroup.options || { je: false, demiJe: false, dinner: false, lunch: false, pause: false, roomHire: false, cocktail: false });
      setRmContactId(editGroup.rmContactId || '');
    } else if (!editGroup && isOpen) {
      // Reset form for new group
      setName(''); setClientId(''); setClientSearch(''); setCat('Séminaire'); setStatus('option'); setStart(''); setEnd(''); setPax(0);
      setRooms({ single: 0, twin: 0, double: 0, family: 0 });
      setOptions({ je: false, demiJe: false, dinner: false, lunch: false, pause: false, roomHire: false, cocktail: false }); setRmContactId('');
      setNewClientData({ email: '', phone: '', address: '', siret: '', companyName: '', category: '' });
      setIsNewClient(false);
    }
    setIsSmsEditing(false);
    setShowClientDropdown(false);
  }, [editGroup, isOpen, clients]);

  const handleSelectClient = (client: Client) => {
    setClientId(client.id);
    setClientSearch(client.name);
    // Auto-fill group name if empty
    if (!name) setName(`Séminaire ${client.name}`);
    setShowClientDropdown(false);
    setIsNewClient(false);
  };

  // Fermer dropdown au click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Génération automatique du message SMS
  useEffect(() => {
    if (rmContactId && !isSmsEditing && isOpen) {
      const c = contacts.find(con => con.id.toString() === rmContactId.toString());
      const startDateFmt = start ? new Date(start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '...';
      const endDateFmt = end ? new Date(end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '...';
      
      const prestations = [];
      if (options.je) prestations.push("JE");
      if (options.demiJe) prestations.push("1/2 JE");
      if (options.lunch) prestations.push("Déjeuner");
      if (options.dinner) prestations.push("Dîner");
      if (options.pause) prestations.push("Pause");
      if (options.roomHire) prestations.push("Loc. Salle");
      if (options.cocktail) prestations.push("Cocktail");

      const roomDetails = [];
      if (rooms.single > 0) roomDetails.push(`SGL:${rooms.single}`);
      if (rooms.twin > 0) roomDetails.push(`TWN:${rooms.twin}`);
      if (rooms.double > 0) roomDetails.push(`DBL:${rooms.double}`);
      if (rooms.family > 0) roomDetails.push(`FAM:${rooms.family}`);

      const message = `Bonjour ${c?.name || ''}, demande de cotation pour "${name || 'Groupe'}" (${status.toUpperCase()})
📅 Dates : ${startDateFmt} au ${endDateFmt} (${nightsCount} nuits)
👥 PAX : ${pax}
🛏 Chambres : ${roomDetails.length > 0 ? roomDetails.join(" / ") : "À définir"}
📌 Prestations : ${prestations.length > 0 ? prestations.join(", ") : "Hébergement seul"}
Merci !`;

      setSmsMessage(message);
    }
  }, [name, start, end, nightsCount, pax, rooms, options, status, rmContactId, contacts, isSmsEditing, isOpen]);

  const handleSave = () => {
    console.log("Tentative de sauvegarde du groupe...");
    // 1. Validation
    if (!name) { 
      alert("Le nom du groupe est requis."); 
      return; 
    }
    if (!start || !end) { 
      alert("Veuillez sélectionner les dates d'arrivée et de départ."); 
      return; 
    }

    let finalClientId = clientId;

    // 2. Client Creation Logic
    // If we are in "New Client" mode (search term exists, no ID selected)
    if (isNewClient && clientSearch && onSaveClient) {
      console.log("Création nouveau client:", clientSearch);
      const newId = `cl-${Date.now()}`;
      const newClient: Client = {
        id: newId,
        name: clientSearch, // Use the search term as name
        type: 'Entreprise', // Default
        email: newClientData.email,
        phone: newClientData.phone,
        address: newClientData.address,
        siret: newClientData.siret,
        companyName: newClientData.companyName,
        category: newClientData.category,
        vat: '', 
        notes: 'Créé via Nouveau Groupe',
        createdAt: new Date().toISOString()
      };
      
      // Save to global client DB
      onSaveClient(newClient);
      finalClientId = newId;
    }

    // 3. Construct Group Object
    const newGroup: Group = {
      id: editGroup ? editGroup.id : Date.now(),
      name, 
      clientId: finalClientId, 
      category: cat, 
      status, 
      startDate: start, 
      endDate: end,
      nights: nightsCount, 
      pax: pax, 
      rooms, 
      options, 
      note: editGroup?.note || '', 
      rmContactId,
      // Initialize billing arrays if new to ensure invoicing tab works immediately
      invoiceItems: editGroup?.invoiceItems || [], 
      paymentSchedule: editGroup?.paymentSchedule || [],
      createdAt: editGroup?.createdAt || new Date().toISOString()
    };

    console.log("Groupe prêt à être sauvegardé:", newGroup);
    
    // 4. Trigger Save in App.tsx
    onSave(newGroup);
    
    // 5. Close Modal (redirection handled in App.tsx)
    onClose();
  };

  if (!isOpen) return null;

  const themeHex = `text-${userSettings.themeColor}-600`;

  return (
    <div className={`fixed inset-0 z-[110] bg-black/60 flex items-end animate-in fade-in backdrop-blur-sm overflow-hidden ${userSettings.darkMode ? 'dark' : ''}`}>
      <div className={`w-full rounded-t-[40px] p-6 pb-10 animate-in slide-in-from-bottom-20 max-h-[95%] flex flex-col ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
        <div className="flex justify-between items-center mb-6 px-2">
          <h3 className="text-xl font-black uppercase tracking-tight">{editGroup ? 'Modifier Groupe' : 'Nouveau Groupe'}</h3>
          <button onClick={onClose} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-7 px-2 pt-2 pb-10">
          
          {/* Section Client & Nom */}
          <div className="space-y-4">
            
            {/* Client Search */}
            <div className="relative z-50" ref={clientDropdownRef}>
               <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Client / Compte</label>
               <div className={`flex items-center gap-2 p-4 rounded-2xl border-2 transition-colors shadow-sm ${isNewClient ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                  {isNewClient ? <UserPlus size={18} className="text-indigo-500"/> : <Building2 size={18} className="text-slate-400"/>}
                  <input 
                    type="text" 
                    placeholder="Rechercher ou créer client..." 
                    value={clientSearch} 
                    onChange={(e) => { 
                      setClientSearch(e.target.value); 
                      setShowClientDropdown(true); 
                      setClientId(''); 
                      // If typing, auto-fill group name if it was empty or matched previous client
                      if (!name || name.startsWith('Séminaire')) {
                         setName(e.target.value ? `Séminaire ${e.target.value}` : '');
                      }
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="w-full bg-transparent outline-none font-bold text-sm dark:text-white"
                  />
                  {isNewClient && <span className="text-[9px] bg-indigo-500 text-white px-2 py-1 rounded font-bold uppercase animate-in fade-in">Nouveau</span>}
               </div>
               
               {/* Dropdown Suggestions */}
               {showClientDropdown && clientSearch && filteredClients.length > 0 && !clientId && (
                 <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden max-h-48 overflow-y-auto z-[60]">
                    {filteredClients.map(client => (
                      <div 
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center"
                      >
                         <span className="font-bold text-sm">{client.name}</span>
                         <span className="text-[9px] uppercase font-bold text-slate-400">{client.type}</span>
                      </div>
                    ))}
                 </div>
               )}

               {/* Inline Client Creation Form */}
               {isNewClient && (
                 <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Création Fiche Client Rapide</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                          <Mail size={14} className="text-slate-400"/>
                          <input 
                            type="email" 
                            placeholder="Email" 
                            value={newClientData.email}
                            onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                            className="bg-transparent text-xs font-bold w-full outline-none"
                          />
                       </div>
                       <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                          <Phone size={14} className="text-slate-400"/>
                          <input 
                            type="tel" 
                            placeholder="Téléphone" 
                            value={newClientData.phone}
                            onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                            className="bg-transparent text-xs font-bold w-full outline-none"
                          />
                       </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                       <MapPin size={14} className="text-slate-400"/>
                       <input 
                         type="text" 
                         placeholder="Adresse complète" 
                         value={newClientData.address}
                         onChange={(e) => setNewClientData({...newClientData, address: e.target.value})}
                         className="bg-transparent text-xs font-bold w-full outline-none"
                       />
                    </div>
                    
                    {/* Nouveaux Champs : SIRET, Entreprise, Catégorie */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                       <FileText size={14} className="text-slate-400"/>
                       <input 
                         type="text" 
                         placeholder="SIRET (Optionnel)" 
                         value={newClientData.siret}
                         onChange={(e) => setNewClientData({...newClientData, siret: e.target.value})}
                         className="bg-transparent text-xs font-bold w-full outline-none"
                       />
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                       <Building2 size={14} className="text-slate-400"/>
                       <input 
                         type="text" 
                         placeholder="Nom de l'entreprise (Optionnel)" 
                         value={newClientData.companyName}
                         onChange={(e) => setNewClientData({...newClientData, companyName: e.target.value})}
                         className="bg-transparent text-xs font-bold w-full outline-none"
                       />
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                       <Tag size={14} className="text-slate-400"/>
                       <select 
                         value={newClientData.category}
                         onChange={(e) => setNewClientData({...newClientData, category: e.target.value})}
                         className="bg-transparent text-xs font-bold w-full outline-none dark:text-white"
                       >
                         <option value="">Sélectionner Catégorie Client...</option>
                         {CLIENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                       </select>
                    </div>
                 </div>
               )}
            </div>

            <div className="p-4 rounded-2xl border-2 bg-slate-50 dark:bg-slate-800 border-transparent hover:border-indigo-400 transition-colors shadow-sm">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nom du Dossier (Groupe)</label>
              <input type="text" placeholder="Ex: Séminaire L'Oréal" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent outline-none font-bold text-lg dark:text-white" />
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button 
                onClick={() => setStatus('option')} 
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${status === 'option' ? 'bg-amber-400 text-white shadow-md' : 'text-slate-400'}`}
              >
                <Clock size={14} /> Option
              </button>
              <button 
                onClick={() => setStatus('confirmed')} 
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${status === 'confirmed' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400'}`}
              >
                <CheckCircle2 size={14} /> Confirmé
              </button>
            </div>
          </div>

          {/* Catégories */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Type de groupe</label>
            <div className="flex flex-wrap gap-2">
              {GROUP_CATEGORIES.map(category => (
                <button 
                  key={category}
                  onClick={() => setCat(category)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${cat === category ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'border-slate-50 dark:border-slate-800 text-slate-400'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Dates Fix: Overlay Method */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
              {/* Arrivée */}
              <div className="relative h-[80px]">
                <div className="absolute inset-0 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-indigo-400 transition-all shadow-sm flex flex-col gap-1">
                   <div className="flex items-center gap-2">
                     <Calendar size={14} className="text-indigo-500" />
                     <label className="text-[10px] font-black uppercase text-slate-400">Arrivée</label>
                   </div>
                   <span className="font-black text-xs dark:text-white mt-1">
                      {start ? new Date(start).toLocaleDateString('fr-FR') : 'Définir'}
                   </span>
                </div>
                <input 
                  type="date" 
                  value={start} 
                  onChange={(e) => setStart(e.target.value)} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
              </div>

              {/* Départ */}
              <div className="relative h-[80px]">
                <div className="absolute inset-0 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-indigo-400 transition-all shadow-sm flex flex-col gap-1">
                   <div className="flex items-center gap-2">
                     <Calendar size={14} className="text-indigo-500" />
                     <label className="text-[10px] font-black uppercase text-slate-400">Départ</label>
                   </div>
                   <span className="font-black text-xs dark:text-white mt-1">
                      {end ? new Date(end).toLocaleDateString('fr-FR') : 'Définir'}
                   </span>
                </div>
                <input 
                  type="date" 
                  value={end} 
                  onChange={(e) => setEnd(e.target.value)} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
              </div>
            </div>

            {/* Badge Nuitées */}
            {nightsCount > 0 && (
              <div className="flex justify-center -mt-6 relative z-20">
                <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-2 rounded-full text-[10px] font-black shadow-xl border-4 border-white dark:border-slate-900 flex items-center gap-2 animate-in zoom-in">
                  <Moon size={12} fill="currentColor" /> {nightsCount} {nightsCount > 1 ? 'NUITS' : 'NUIT'}
                </div>
              </div>
            )}
          </div>

          {/* Nombre de PAX (Saisie manuelle) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Effectif du groupe</label>
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-indigo-400 transition-all shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30">
                <Users size={20} />
              </div>
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Nombre total de PAX</label>
                <input 
                  type="number" 
                  placeholder="Ex: 25" 
                  value={pax || ''} 
                  onChange={(e) => setPax(parseInt(e.target.value) || 0)}
                  className="w-full bg-transparent outline-none font-black text-xl dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Répartition Chambres */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Répartition (Allotement)</label>
            <div className="grid grid-cols-4 gap-2">
              {(['single', 'twin', 'double', 'family'] as const).map(k => (
                <div key={k} className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800 text-center border-2 border-transparent focus-within:border-indigo-500 transition-all shadow-sm">
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">{k}</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={rooms[k] || ''} 
                    onChange={(e) => setRooms({...rooms, [k]: parseInt(e.target.value) || 0})} 
                    className="w-full bg-transparent text-center outline-none font-black dark:text-white text-lg" 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Prestations */}
          <div className="space-y-3">
             <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prestations incluses</label>
             <div className="flex flex-wrap gap-2">
               {Object.keys(options).map(o => (
                 <button 
                  key={o} 
                  type="button"
                  onClick={() => setOptions({...options, [o as keyof GroupOptions]: !options[o as keyof GroupOptions]})} 
                  className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${options[o as keyof GroupOptions] ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'border-slate-50 dark:border-slate-800 text-slate-400 shadow-sm'}`}
                 >
                   {o === 'demiJe' ? '1/2 JE' : o === 'roomHire' ? 'Loc. Salle' : o}
                 </button>
               ))}
             </div>
          </div>

          {/* SMS RM */}
          <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Revenue Manager (RM)</label>
            <select value={rmContactId} onChange={(e) => setRmContactId(e.target.value)} className="w-full p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 font-bold text-sm dark:text-white border-none outline-none shadow-sm appearance-none">
              <option value="">Sélectionner un contact...</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {rmContactId && (
              <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center px-1">
                   <span className="text-[10px] font-black uppercase text-slate-400">Message de Cotation</span>
                   <button type="button" onClick={() => setIsSmsEditing(!isSmsEditing)} className={`text-[10px] font-black uppercase underline ${themeHex}`}>{isSmsEditing ? 'Enregistrer' : 'Modifier'}</button>
                </div>
                
                {isSmsEditing ? 
                  <textarea 
                    value={smsMessage} 
                    onChange={(e) => setSmsMessage(e.target.value)} 
                    className="w-full p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 font-bold text-xs h-48 outline-none dark:text-white shadow-inner leading-relaxed" 
                  /> :
                  <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/50 shadow-sm">
                    <pre className="whitespace-pre-wrap font-sans text-[11px] font-bold italic text-slate-500 dark:text-slate-400 leading-relaxed">
                      {smsMessage}
                    </pre>
                  </div>
                }
                
                <button 
                  type="button" 
                  onClick={() => {
                    const c = contacts.find(con => con.id.toString() === rmContactId.toString());
                    if (c) {
                      if (onTriggerCommunication) onTriggerCommunication(c.id, smsMessage);
                      window.open(`sms:${c.phone}?body=${encodeURIComponent(smsMessage)}`);
                    }
                  }} 
                  className="w-full py-5 rounded-[28px] bg-slate-900 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                >
                  <MessageSquare size={18}/> Envoyer au RM par SMS
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-2 pt-6">
          <button onClick={handleSave} className="w-full py-6 rounded-[32px] bg-indigo-600 text-white font-black uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all hover:bg-indigo-700">Enregistrer le groupe</button>
        </div>
      </div>
    </div>
  );
};

export default GroupModal;