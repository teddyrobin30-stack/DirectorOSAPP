
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Calendar, Users, Edit3, MessageSquare, FileText, Check, Utensils, 
  Coffee, MapPin, Wine, Briefcase, Receipt, Plus, Trash2, Printer, 
  LayoutList, Phone, Mail, User, FileCheck, FileSpreadsheet, ClipboardList, Clock,
  BedDouble, BedSingle, Home, AlertTriangle
} from 'lucide-react';
import { Group, UserSettings, Contact, InvoiceItem, PaymentSchedule, GroupOptions, BusinessConfig, CatalogItem, GroupRooms, Venue, Client } from '../types';

interface GroupDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  allGroups?: Group[]; // Needed for conflict detection
  contacts: Contact[];
  clients?: Client[];
  onEdit: (group: Group) => void;
  onSave?: (group: Group) => void;
  userSettings: UserSettings;
  businessConfig: BusinessConfig;
  catalog: CatalogItem[];
  venues?: Venue[];
}

const GroupDetailModal: React.FC<GroupDetailModalProps> = ({ 
  isOpen, onClose, group, allGroups = [], contacts, clients = [], onEdit, onSave, userSettings, businessConfig, catalog, venues = []
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'billing'>('details');
  const [isSmsEditing, setIsSmsEditing] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  
  // Editable Operational States
  const [localPax, setLocalPax] = useState<number>(0);
  const [localRooms, setLocalRooms] = useState<GroupRooms>({ single: 0, twin: 0, double: 0, family: 0 });

  // Billing States
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([]);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [documentType, setDocumentType] = useState<'quote' | 'invoice' | 'functionSheet'>('quote');

  useEffect(() => {
    if (group && isOpen) {
      setActiveTab('details');
      setIsSmsEditing(false);
      
      // Init Local States from Group
      setLocalPax(group.pax);
      setLocalRooms(group.rooms || { single: 0, twin: 0, double: 0, family: 0 });
      setInvoiceItems(group.invoiceItems || []);
      setPaymentSchedule(group.paymentSchedule || []);
      
      setShowInvoicePreview(false);
      
      // SMS Generation Logic
      const rmContact = contacts.find(c => c.id.toString() === group.rmContactId?.toString());
      const startDateFormatted = new Date(group.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const endDateFormatted = new Date(group.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const opts = group.options;
      const prestations = [];
      if (opts?.je) prestations.push("JE");
      if (opts?.demiJe) prestations.push("1/2 JE");
      if (opts?.lunch) prestations.push("Déjeuner");
      if (opts?.dinner) prestations.push("Dîner");
      if (opts?.pause) prestations.push("Pause");
      if (opts?.roomHire) prestations.push("Loc. Salle");
      if (opts?.cocktail) prestations.push("Cocktail");

      setSmsMessage(`Bonjour ${rmContact?.name.split(' ')[0] || 'Jean'},
Demande cotation pour : "${group.name}"
📅 ${startDateFormatted} - ${endDateFormatted} (${group.nights}N)
👥 ${group.pax} Pax
📌 Inclus : ${prestations.length > 0 ? prestations.join(", ") : "Hébergement seul"}
Merci !`);
    }
  }, [group, isOpen, contacts]);

  // Handle Room Changes & Auto-Calc Pax & Sync Invoice
  const handleRoomChange = (type: keyof GroupRooms, value: string) => {
    const val = parseInt(value) || 0;
    const newRooms = { ...localRooms, [type]: val };
    setLocalRooms(newRooms);

    // Auto-calculate PAX based on standard occupancy
    // Single = 1, Twin/Double = 2, Family = 4
    const newPax = (newRooms.single * 1) + (newRooms.twin * 2) + (newRooms.double * 2) + (newRooms.family * 4);
    setLocalPax(newPax);

    // SYNC: Update quantities in Invoice Items automatically
    setInvoiceItems(prev => prev.map(item => {
       const descLower = item.description.toLowerCase();
       // Heuristic to identify room lines
       const isRoomLine = descLower.includes('chambre') || descLower.includes('hébergement') || descLower.includes('nuit');
       
       if (isRoomLine) {
         if (type === 'single' && descLower.includes('single')) return { ...item, quantity: val };
         if (type === 'twin' && descLower.includes('twin')) return { ...item, quantity: val };
         if (type === 'double' && descLower.includes('double')) return { ...item, quantity: val };
         if (type === 'family' && (descLower.includes('family') || descLower.includes('famille'))) return { ...item, quantity: val };
       }
       return item;
    }));
  };

  // Improved Conflict Detection Logic with Time Ranges
  const checkConflict = (item: InvoiceItem) => {
    if (!item.date || !item.location || !item.time) return null;
    
    // Normalize dates
    const itemDate = new Date(item.date).toDateString();
    
    // Helper to get minutes from "HH:MM"
    const getMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const startA = getMinutes(item.time);
    const endA = item.endTime ? getMinutes(item.endTime) : startA + 60; // Default 1h if no end time

    for (const otherGroup of allGroups) {
      if (otherGroup.id === group?.id) continue; // Skip self
      if (otherGroup.invoiceItems) {
        for (const otherItem of otherGroup.invoiceItems) {
          // Check Date & Venue
          if (otherItem.date && new Date(otherItem.date).toDateString() === itemDate) {
             if (otherItem.location === item.location) {
               // Check Time Overlap
               if (otherItem.time) {
                 const startB = getMinutes(otherItem.time);
                 const endB = otherItem.endTime ? getMinutes(otherItem.endTime) : startB + 60;

                 // Overlap formula: (StartA < EndB) and (EndA > StartB)
                 if (startA < endB && endA > startB) {
                   return `Occupé par: ${otherGroup.name} (${otherItem.time} - ${otherItem.endTime || '?'})`;
                 }
               }
             }
          }
        }
      }
    }
    return null;
  };

  // Billing Calculations
  const totals = useMemo(() => {
    let totalHT = 0;
    let totalVAT = 0;
    
    invoiceItems.forEach(item => {
      const lineHT = item.quantity * item.unitPrice;
      const lineVAT = lineHT * (item.vatRate / 100);
      totalHT += lineHT;
      totalVAT += lineVAT;
    });

    return {
      ht: totalHT,
      vat: totalVAT,
      ttc: totalHT + totalVAT
    };
  }, [invoiceItems]);

  const paidAmount = useMemo(() => {
    return paymentSchedule
      .filter(p => p.paid)
      .reduce((acc, curr) => acc + (totals.ttc * curr.percentage / 100), 0);
  }, [paymentSchedule, totals.ttc]);

  // Client Data Retrieval
  const clientData = useMemo(() => {
    if (!group?.clientId) return null;
    return clients.find(c => c.id === group.clientId);
  }, [group, clients]);

  if (!isOpen || !group) return null;

  const rmContact = contacts.find(c => c.id.toString() === group.rmContactId?.toString());
  const themeBg = `bg-${userSettings.themeColor}-600`;
  const themeText = `text-${userSettings.themeColor}-600`;

  const handleSendSMS = () => {
    if (!rmContact) { alert("Aucun contact RM sélectionné."); return; }
    window.open(`sms:${rmContact.phone}?body=${encodeURIComponent(smsMessage)}`);
  };

  // Unified Save Function
  const handleSave = () => {
    if (onSave) {
      onSave({
        ...group,
        pax: localPax,
        rooms: localRooms,
        invoiceItems,
        paymentSchedule
      });
      alert("Dossier (Détails & Facturation) sauvegardé !");
    }
  };

  const addItem = () => {
    setInvoiceItems([...invoiceItems, { 
      id: Date.now().toString(), 
      date: group.startDate,
      time: '09:00',
      endTime: '10:00',
      location: '',
      description: '', 
      setup: '',
      quantity: 1, 
      unitPrice: 0, 
      vatRate: 20,
      catalogId: '' 
    }]);
  };

  const handleCatalogSelection = (itemId: string, catalogId: string) => {
    if (!catalogId) {
      updateItem(itemId, 'catalogId', '');
      return;
    }
    const catItem = catalog.find(c => c.id === catalogId);
    if (catItem) {
      // Find venue name if ID is present
      const defaultVenueName = catItem.defaultVenueId 
        ? venues.find(v => v.id === catItem.defaultVenueId)?.name || '' 
        : '';

      setInvoiceItems(prev => prev.map(item => 
        item.id === itemId ? { 
          ...item, 
          catalogId: catalogId,
          description: catItem.name,
          unitPrice: catItem.defaultPrice,
          vatRate: catItem.defaultVat,
          setup: item.setup || catItem.technicalDescription || '',
          // Auto-fill venue and times
          location: defaultVenueName || item.location,
          time: catItem.defaultStartTime || item.time,
          endTime: catItem.defaultEndTime || item.endTime
        } : item
      ));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setInvoiceItems(prev => prev.filter(item => item.id !== id));
  };

  const generateDefaultSchedule = () => {
    if (!group.startDate) return;
    const start = new Date(group.startDate);
    
    // Dates calculation
    const d30 = new Date(start); d30.setDate(d30.getDate() - 30);
    const d14 = new Date(start); d14.setDate(d14.getDate() - 14);

    setPaymentSchedule([
      { id: '1', label: 'Acompte 1 (30% - Réservation)', percentage: 30, dueDate: new Date().toISOString().split('T')[0], paid: false },
      { id: '2', label: 'Acompte 2 (50% - J-30)', percentage: 50, dueDate: d30.toISOString().split('T')[0], paid: false },
      { id: '3', label: 'Solde (20% - J-14)', percentage: 20, dueDate: d14.toISOString().split('T')[0], paid: false },
    ]);
  };

  const updateSchedule = (id: string, field: keyof PaymentSchedule, value: any) => {
    setPaymentSchedule(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const renderOptions = () => {
    const opts = group.options;
    const items = [
      { key: 'je', label: 'Journée Étude', icon: Briefcase },
      { key: 'demiJe', label: '1/2 Journée', icon: Briefcase },
      { key: 'lunch', label: 'Déjeuner', icon: Utensils },
      { key: 'dinner', label: 'Dîner', icon: Utensils },
      { key: 'pause', label: 'Pauses', icon: Coffee },
      { key: 'roomHire', label: 'Loc. Salle', icon: MapPin },
      { key: 'cocktail', label: 'Cocktail', icon: Wine },
    ];
    
    const activeItems = items.filter(item => opts[item.key as keyof GroupOptions]);

    return (
      <div className={`p-4 rounded-[28px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
         <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Prestations Incluses</h4>
         <div className="flex flex-wrap gap-2">
            {activeItems.map(item => (
              <div key={item.key} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center gap-2 text-xs font-bold shadow-sm">
                <item.icon size={14} className={themeText} /> {item.label}
              </div>
            ))}
            {activeItems.length === 0 && <span className="text-xs text-slate-400 italic font-medium px-1">Hébergement seul (Room Only)</span>}
         </div>
      </div>
    );
  };

  const getSortedItemsForFF = () => {
    // Sort items by Date then Time
    const sorted = [...invoiceItems].sort((a, b) => {
      const dateA = a.date || group.startDate;
      const dateB = b.date || group.startDate;
      if (dateA !== dateB) return new Date(dateA).getTime() - new Date(dateB).getTime();
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });

    // Group by Date
    const grouped: Record<string, InvoiceItem[]> = {};
    sorted.forEach(item => {
      const d = item.date || group.startDate;
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(item);
    });

    return grouped;
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-end md:items-center md:justify-center animate-in fade-in backdrop-blur-sm overflow-hidden">
      <div className={`w-full md:max-w-4xl md:rounded-[40px] md:mx-4 rounded-t-[32px] p-6 pb-10 animate-in slide-in-from-bottom-20 max-h-[95vh] md:h-[85vh] flex flex-col ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div className="flex flex-col gap-0.5 pt-1">
            <span className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.15em]">{group.category}</span>
            <h3 className="text-2xl font-black leading-tight pr-4">{group.name}</h3>
          </div>
          <div className="flex gap-2">
            {!showInvoicePreview && (
              <button 
                onClick={() => onEdit(group)}
                className="p-2.5 rounded-2xl text-slate-700 bg-slate-100 shadow-sm transition-colors dark:bg-slate-800 dark:text-white hover:bg-slate-200"
                title="Modifier Groupe"
              >
                <Edit3 size={20}/>
              </button>
            )}
            <button onClick={onClose} className="p-2.5 rounded-full text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"><X size={20}/></button>
          </div>
        </div>

        {/* Tab Navigation */}
        {!showInvoicePreview && (
          <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-6 shrink-0">
            <button 
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'details' ? 'bg-white dark:bg-slate-700 shadow-sm ' + themeText : 'text-slate-400'}`}
            >
              <LayoutList size={14} className="inline mr-2 mb-0.5" /> Détails & Ops
            </button>
            <button 
              onClick={() => setActiveTab('billing')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'billing' ? 'bg-white dark:bg-slate-700 shadow-sm ' + themeText : 'text-slate-400'}`}
            >
              <Receipt size={14} className="inline mr-2 mb-0.5" /> Facturation
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 px-1">
          
          {/* ---- DOCUMENT PREVIEW MODE (Invoice, Quote, Function Sheet) ---- */}
          {showInvoicePreview ? (
            <div id="printable-content" className="bg-white text-slate-900 p-8 rounded-3xl border shadow-xl max-w-3xl mx-auto h-full overflow-y-auto flex flex-col">
              
              {/* Document Type Toggle (Hidden in Print) */}
              <div className="flex justify-center mb-8 no-print">
                 <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto">
                    <button 
                      onClick={() => setDocumentType('quote')} 
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-all ${documentType === 'quote' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                    >
                      Devis
                    </button>
                    <button 
                      onClick={() => setDocumentType('invoice')} 
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-all ${documentType === 'invoice' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                    >
                      Facture
                    </button>
                    <button 
                      onClick={() => setDocumentType('functionSheet')} 
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-all ${documentType === 'functionSheet' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                    >
                      Fiche de Fonction
                    </button>
                 </div>
              </div>

              {/* Document Header */}
              {documentType === 'functionSheet' ? (
                /* Header FF */
                <div className="mb-8">
                   <div className="flex justify-between items-end border-b-4 border-slate-800 pb-4 mb-4">
                      <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase leading-none">Fiche de Fonction</h1>
                        <p className="text-sm font-bold text-slate-500 mt-1">Détail des opérations</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase">Organisateur</p>
                        <p className="text-lg font-bold">{group.rmContactId ? contacts.find(c => c.id.toString() === group.rmContactId?.toString())?.name : 'Non assigné'}</p>
                      </div>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center">
                      <div>
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Groupe</p>
                         <p className="text-xl font-black text-indigo-900">{group.name}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dates</p>
                         <p className="text-sm font-bold">{new Date(group.startDate).toLocaleDateString('fr-FR')} - {new Date(group.endDate).toLocaleDateString('fr-FR')}</p>
                         <p className="text-xs font-medium text-slate-500">{localPax} Personnes</p>
                      </div>
                   </div>
                </div>
              ) : (
                /* Header Quote/Invoice */
                <>
                  <div className="flex justify-between items-start mb-10 text-xs">
                    <div>
                      <h3 className="font-black text-lg uppercase text-slate-900 mb-1">{businessConfig.companyName}</h3>
                      <p className="text-slate-500">{businessConfig.address}</p>
                      <p className="text-slate-500">Tél: {businessConfig.phone} - {businessConfig.email}</p>
                      {documentType === 'invoice' && (
                        <p className="text-slate-400 mt-2 text-[10px]">SIRET: {businessConfig.siret} - TVA: {businessConfig.vatNumber}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <h1 className="text-3xl font-black uppercase tracking-tight text-indigo-900 opacity-20">
                        {documentType === 'quote' ? 'DEVIS' : 'FACTURE'}
                      </h1>
                      <p className="text-xs font-black text-indigo-900 mt-1">
                        N° {documentType === 'quote' ? 'DEV' : 'FAC'}-{new Date().getFullYear()}-{group.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-start border-b pb-6 mb-6">
                    <div>
                      <p className="text-sm font-bold text-slate-400 mt-1 uppercase text-[10px]">Facturé à</p>
                      {clientData ? (
                        <>
                          <p className="font-bold text-slate-800">{clientData.name}</p>
                          {clientData.companyName && (
                             <p className="text-xs font-bold text-slate-600 uppercase mt-0.5">{clientData.companyName}</p>
                          )}
                          <p className="text-xs text-slate-500">{clientData.address}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                             {clientData.phone && `Tél: ${clientData.phone}`}
                             {clientData.phone && clientData.email && ' | '}
                             {clientData.email && `Email: ${clientData.email}`}
                          </p>
                          {clientData.siret && <p className="text-xs text-slate-500 mt-0.5">SIRET: {clientData.siret}</p>}
                        </>
                      ) : (
                        <p className="font-bold text-slate-800">{group.name} (Client non lié)</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-400 mt-1 uppercase text-[10px]">Date</p>
                      <p className="font-bold text-slate-800">{new Date().toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Main Content Body */}
              {documentType === 'functionSheet' ? (
                <div className="flex-1 space-y-8">
                   {/* Special Notes Section */}
                   {group.note && (
                     <div className="border-l-4 border-amber-400 bg-amber-50 p-4 rounded-r-xl">
                        <h3 className="font-black text-xs uppercase text-amber-600 mb-2 tracking-widest">Notes Spéciales</h3>
                        <p className="text-sm font-medium text-slate-800 italic">{group.note}</p>
                     </div>
                   )}

                   {/* Rooming Summary for FF */}
                   <div className="bg-white border-2 border-indigo-50 rounded-xl p-4">
                      <h3 className="font-black text-[10px] uppercase text-indigo-400 mb-3 tracking-widest flex items-center gap-2">
                        <Home size={12}/> Répartition Hébergement
                      </h3>
                      <div className="grid grid-cols-4 gap-4 text-center">
                         <div className="border-r border-slate-100 last:border-0">
                            <span className="block text-[9px] text-slate-400 uppercase">Single</span>
                            <span className="text-lg font-black text-slate-800">{localRooms.single}</span>
                         </div>
                         <div className="border-r border-slate-100 last:border-0">
                            <span className="block text-[9px] text-slate-400 uppercase">Twin</span>
                            <span className="text-lg font-black text-slate-800">{localRooms.twin}</span>
                         </div>
                         <div className="border-r border-slate-100 last:border-0">
                            <span className="block text-[9px] text-slate-400 uppercase">Double</span>
                            <span className="text-lg font-black text-slate-800">{localRooms.double}</span>
                         </div>
                         <div>
                            <span className="block text-[9px] text-slate-400 uppercase">Family</span>
                            <span className="text-lg font-black text-slate-800">{localRooms.family}</span>
                         </div>
                      </div>
                   </div>

                   {/* Chronological Schedule */}
                   <div>
                      {Object.entries(getSortedItemsForFF()).map(([date, items]) => (
                        <div key={date} className="mb-6 break-inside-avoid">
                           <div className="bg-slate-900 text-white px-4 py-2 rounded-t-xl flex justify-between items-center">
                              <span className="font-black text-sm uppercase tracking-wide">{new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                           </div>
                           <div className="border-x border-b border-slate-200 rounded-b-xl overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                   <tr>
                                      <th className="py-2 px-4 text-left w-20 text-[10px] uppercase text-slate-500 font-black">Heure</th>
                                      <th className="py-2 px-4 text-left text-[10px] uppercase text-slate-500 font-black">Prestation</th>
                                      <th className="py-2 px-4 text-left w-32 text-[10px] uppercase text-slate-500 font-black">Lieu</th>
                                      <th className="py-2 px-4 w-16 text-[10px] uppercase text-slate-500 font-black text-center">Qté</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                   {items.map(item => (
                                      <tr key={item.id} className="group hover:bg-slate-50">
                                         <td className="py-3 px-4 font-black align-top text-slate-700">{item.time || '--:--'}</td>
                                         <td className="py-3 px-4 align-top">
                                            <p className="font-bold text-slate-900">{item.description}</p>
                                            {item.setup && (
                                              <p className="text-xs text-slate-500 mt-1 italic border-l-2 border-indigo-200 pl-2">{item.setup}</p>
                                            )}
                                         </td>
                                         <td className="py-3 px-4 font-medium text-slate-600 align-top">{item.location || '-'}</td>
                                         <td className="py-3 px-4 font-bold text-center align-top text-slate-900">{item.quantity}</td>
                                      </tr>
                                   ))}
                                </tbody>
                              </table>
                           </div>
                        </div>
                      ))}
                      {Object.keys(getSortedItemsForFF()).length === 0 && (
                        <div className="text-center py-8 text-slate-400 italic">Aucune prestation planifiée.</div>
                      )}
                   </div>
                </div>
              ) : (
                /* Invoice/Quote Table */
                <>
                  <div className="mb-8 flex-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-100">
                          <th className="text-left py-3 font-black uppercase text-[10px] tracking-wider text-slate-400">Description</th>
                          <th className="text-center py-3 font-black uppercase text-[10px] tracking-wider text-slate-400 w-16">Qté</th>
                          <th className="text-right py-3 font-black uppercase text-[10px] tracking-wider text-slate-400 w-24">PU HT</th>
                          <th className="text-right py-3 font-black uppercase text-[10px] tracking-wider text-slate-400 w-24">Total HT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {invoiceItems && invoiceItems.length > 0 ? (
                            invoiceItems.map(item => (
                              <tr key={item.id}>
                                <td className="py-3 font-bold text-slate-800">
                                  {item.description || "Article sans nom"}
                                  {(item.date || item.time) && (
                                    <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                                      {item.date && new Date(item.date).toLocaleDateString('fr-FR')} {item.time ? `à ${item.time}` : ''}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 text-center text-slate-600 font-medium">{item.quantity}</td>
                                <td className="py-3 text-right text-slate-600 font-medium">{Number(item.unitPrice).toFixed(2)} €</td>
                                <td className="py-3 text-right font-black text-slate-800">{(item.quantity * item.unitPrice).toFixed(2)} €</td>
                              </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-400 italic">Aucun article sélectionné.</td>
                            </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Section */}
                  <div className="flex justify-end mb-8">
                    <div className="w-1/2 space-y-2 bg-slate-50 p-4 rounded-xl">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-500">Total HT</span>
                        <span className="font-bold">{totals.ht.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-500">TVA ({totals.ht > 0 ? ((totals.vat / totals.ht) * 100).toFixed(1) : 0}%)</span>
                        <span className="font-bold">{totals.vat.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-lg pt-2 border-t border-slate-200 mt-2">
                        <span className="font-black text-indigo-900">Total TTC</span>
                        <span className="font-black text-indigo-600">{totals.ttc.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>

                  {/* Conditions de paiement / Acomptes */}
                  {documentType === 'quote' ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-5 mb-6">
                      <h3 className="font-black text-[10px] uppercase text-slate-400 mb-3 tracking-widest">Échéancier prévisionnel</h3>
                      <div className="space-y-2">
                        {paymentSchedule.map(p => (
                          <div key={p.id} className="flex justify-between items-center text-xs">
                              <span className="font-medium text-slate-600">{p.label} ({p.percentage}%)</span>
                              <span className="font-bold">{(totals.ttc * p.percentage / 100).toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6">
                      <h3 className="font-black text-[10px] uppercase text-slate-400 mb-3 tracking-widest">Paiements & Solde</h3>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-600">Total TTC</span>
                            <span className="font-bold">{totals.ttc.toFixed(2)} €</span>
                        </div>
                        {paymentSchedule.filter(p => p.paid).map(p => (
                          <div key={p.id} className="flex justify-between items-center text-xs text-emerald-600">
                              <span className="font-medium flex items-center gap-1"><Check size={12}/> {p.label} (Reçu)</span>
                              <span className="font-bold">- {(totals.ttc * p.percentage / 100).toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                          <span className="font-black text-sm uppercase text-slate-900">Net à payer</span>
                          <span className="font-black text-xl text-slate-900">{(totals.ttc - paidAmount).toFixed(2)} €</span>
                      </div>
                    </div>
                  )}

                  {/* Bank Info Footer (Invoice Only) */}
                  {documentType === 'invoice' && (
                      <div className="text-[9px] text-slate-400 border-t pt-4 mt-auto">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="font-bold block uppercase mb-0.5">Banque</span>
                            {businessConfig.bankName}
                          </div>
                          <div>
                            <span className="font-bold block uppercase mb-0.5">IBAN</span>
                            <span className="font-mono">{businessConfig.iban}</span>
                          </div>
                          <div>
                            <span className="font-bold block uppercase mb-0.5">BIC</span>
                            <span className="font-mono">{businessConfig.bic}</span>
                          </div>
                        </div>
                      </div>
                  )}
                </>
              )}
              
              <div className="flex gap-3 mt-8 no-print">
                <button onClick={() => window.print()} className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"><Printer size={16}/> Imprimer / PDF</button>
                <button onClick={() => setShowInvoicePreview(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold hover:bg-slate-50 transition-colors">Fermer</button>
              </div>
            </div>
          ) : activeTab === 'details' ? (
            /* ---- DETAILS TAB (RESTORED & MERGED) ---- */
            <>
              {/* 1. Main Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-5 rounded-[28px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Calendar size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Période</span>
                  </div>
                  <p className="text-sm font-black leading-tight">Du {new Date(group.startDate).toLocaleDateString('fr-FR')}</p>
                  <p className="text-sm font-black leading-tight">Au {new Date(group.endDate).toLocaleDateString('fr-FR')}</p>
                  <div className="mt-2 px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 text-[8px] font-black inline-block uppercase">{group.nights} Nuits</div>
                </div>
                <div className={`p-5 rounded-[28px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Users size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Effectif</span>
                  </div>
                  <input 
                    type="number"
                    value={localPax}
                    onChange={(e) => setLocalPax(parseInt(e.target.value) || 0)}
                    className={`text-4xl font-black w-full bg-transparent outline-none ${userSettings.darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}
                  />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 block">Pax total</span>
                </div>
              </div>

              {/* 2. Accommodation & Rooms (Editable Inputs) */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Hébergement</h4>
                <div className={`p-4 rounded-[28px] border grid grid-cols-2 gap-3 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                  {[
                    { key: 'single', label: 'Single', icon: BedSingle },
                    { key: 'twin', label: 'Twin', icon: BedDouble },
                    { key: 'double', label: 'Double', icon: BedDouble },
                    { key: 'family', label: 'Family', icon: Home }
                  ].map(r => (
                    <div key={r.key} className="flex justify-between items-center p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                         <r.icon size={14} className="text-indigo-400" />
                         <span className="text-xs font-bold text-slate-500">{r.label}</span>
                      </div>
                      <input 
                        type="number"
                        value={localRooms[r.key as keyof GroupRooms]}
                        onChange={(e) => handleRoomChange(r.key as keyof GroupRooms, e.target.value)}
                        className="w-12 bg-transparent text-right outline-none font-black text-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Prestations (Options) - RESTORED */}
              {renderOptions()}

              {/* 4. Notes */}
              <div className="space-y-3">
                <div className={`p-6 rounded-[28px] border ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-indigo-50/20 border-indigo-50'}`}>
                  <div className="flex items-center gap-2 text-slate-400 mb-3">
                    <FileText size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Observations</span>
                  </div>
                  <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
                    {group.note || 'Pas d\'observation particulière.'}
                  </p>
                </div>
              </div>

              {/* Actions Footer Details Tab */}
              <button onClick={handleSave} className={`w-full py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg ${themeBg}`}>
                 Sauvegarder modifications
              </button>

              {/* 5. Revenue Manager Communication - RESTORED & ENHANCED */}
              <div className="pt-2 pb-6 space-y-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Revenue Management (RM)</h4>
                 
                 {/* RM Contact Card */}
                 <div className={`p-4 rounded-[28px] border flex items-center justify-between ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${rmContact?.color || 'bg-slate-200 text-slate-600'}`}>
                          {rmContact ? rmContact.initials : <User size={20} />}
                       </div>
                       <div>
                          <p className="text-sm font-bold">{rmContact?.name || 'Non assigné'}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Responsable dossier</p>
                       </div>
                    </div>
                    {rmContact && (
                      <div className="flex gap-2">
                        <a href={`mailto:${rmContact.email}`} className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"><Mail size={16} /></a>
                        <a href={`tel:${rmContact.phone}`} className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"><Phone size={16} /></a>
                      </div>
                    )}
                 </div>

                 {/* Quote Generator */}
                 {isSmsEditing ? (
                  <div className="space-y-3 animate-in fade-in">
                    <textarea 
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      className={`w-full p-5 rounded-[28px] border font-bold text-sm h-40 resize-none leading-relaxed shadow-lg ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setIsSmsEditing(false)} className="flex-1 py-4 rounded-2xl font-black text-xs bg-slate-100 dark:bg-slate-800 text-slate-400">Annuler</button>
                      <button onClick={handleSendSMS} className={`flex-[2] py-4 rounded-2xl text-white font-black text-xs shadow-xl flex items-center justify-center gap-2 ${themeBg}`}>
                        <Check size={18}/> Envoyer SMS
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsSmsEditing(true)}
                    className={`w-full py-5 rounded-[24px] text-white font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-95 bg-slate-900`}
                  >
                    <MessageSquare size={20}/> Générer message cotation
                  </button>
                )}
              </div>
            </>
          ) : (
            /* ---- BILLING TAB ---- */
            <div className="space-y-8 pb-10">
              
              {/* Products Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Produits & Services</h4>
                   <button onClick={addItem} className="text-indigo-500 flex items-center gap-1 text-[10px] font-black uppercase"><Plus size={12}/> Ajouter ligne</button>
                </div>
                
                <div className="space-y-4">
                  {invoiceItems.map(item => {
                    const conflictMessage = checkConflict(item);
                    return (
                    <div key={item.id} className={`p-4 rounded-2xl border flex flex-col gap-3 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                      
                      <div className="flex flex-col md:flex-row gap-3">
                        {/* Catalog Selector */}
                        <select 
                          value={item.catalogId || ''} 
                          onChange={(e) => handleCatalogSelection(item.id, e.target.value)}
                          className="bg-slate-50 dark:bg-slate-700 rounded-xl text-xs font-bold p-3 outline-none md:w-48 truncate border border-transparent focus:border-indigo-500 transition-all"
                        >
                           <option value="">-- Sélectionner Article --</option>
                           {catalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        <input 
                          type="text" 
                          value={item.description} 
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Description de la prestation..."
                          className="bg-transparent font-bold text-sm outline-none flex-1 w-full border-b border-slate-200 dark:border-slate-700 pb-1 focus:border-indigo-500 transition-all"
                        />
                      </div>

                      {/* Operational Details Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                         <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2">
                            <Calendar size={14} className="text-slate-400"/>
                            <input 
                              type="date" 
                              value={item.date || ''} 
                              onChange={(e) => updateItem(item.id, 'date', e.target.value)}
                              className="bg-transparent text-xs font-bold outline-none w-full"
                            />
                         </div>
                         <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2">
                            <Clock size={14} className="text-slate-400"/>
                            <div className="flex items-center w-full">
                              <input 
                                type="time" 
                                value={item.time || ''} 
                                onChange={(e) => updateItem(item.id, 'time', e.target.value)}
                                className="bg-transparent text-xs font-bold outline-none w-10 text-center"
                              />
                              <span className="text-[10px] text-slate-400 mx-1">-</span>
                              <input 
                                type="time" 
                                value={item.endTime || ''} 
                                onChange={(e) => updateItem(item.id, 'endTime', e.target.value)}
                                className="bg-transparent text-xs font-bold outline-none w-10 text-center"
                              />
                            </div>
                         </div>
                         <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2 md:col-span-2 relative">
                            <MapPin size={14} className="text-slate-400"/>
                            {/* Venue Selector */}
                            <input 
                              list={`venues-${item.id}`}
                              type="text" 
                              placeholder="Lieu (ex: Salon Pascaline)"
                              value={item.location || ''} 
                              onChange={(e) => updateItem(item.id, 'location', e.target.value)}
                              className="bg-transparent text-xs font-bold outline-none w-full"
                            />
                            <datalist id={`venues-${item.id}`}>
                              {venues.map(v => <option key={v.id} value={v.name} />)}
                            </datalist>
                         </div>
                      </div>

                      {/* Conflict Alert */}
                      {conflictMessage && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100 animate-in fade-in">
                          <AlertTriangle size={14} />
                          {conflictMessage}
                        </div>
                      )}

                      {/* Comment/Setup Row */}
                      <div className="flex gap-3">
                         <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2 flex items-start gap-2">
                            <ClipboardList size={14} className="text-slate-400 mt-0.5 shrink-0"/>
                            <textarea 
                              placeholder="Setup technique, notes équipes..."
                              value={item.setup || ''} 
                              onChange={(e) => updateItem(item.id, 'setup', e.target.value)}
                              className="bg-transparent text-xs font-medium outline-none w-full resize-none h-auto bg-transparent"
                              rows={1}
                            />
                         </div>
                      </div>

                      {/* Financial Row */}
                      <div className="flex gap-2 items-center justify-end border-t border-slate-50 dark:border-slate-700 pt-2 mt-1">
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1.5">
                           <span className="text-[9px] uppercase text-slate-400">Qté</span>
                           <input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-12 bg-transparent text-center font-bold outline-none text-xs"
                           />
                        </div>
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1.5">
                           <span className="text-[9px] uppercase text-slate-400">Prix HT</span>
                           <input 
                            type="number" 
                            value={item.unitPrice} 
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-transparent text-center font-bold outline-none text-xs"
                           />
                        </div>
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1.5">
                           <span className="text-[9px] uppercase text-slate-400">TVA%</span>
                           <input 
                            type="number" 
                            value={item.vatRate} 
                            onChange={(e) => updateItem(item.id, 'vatRate', parseFloat(e.target.value) || 0)}
                            className="w-10 bg-transparent text-center font-bold outline-none text-xs"
                           />
                        </div>
                        <button onClick={() => removeItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 ml-2"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  );})}
                  {invoiceItems.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed rounded-2xl border-slate-200">
                      <p className="text-xs text-slate-400 font-bold">Aucun article facturé</p>
                    </div>
                  )}
                </div>

                {/* Summary */}
                {invoiceItems.length > 0 && (
                   <div className={`p-5 rounded-[28px] border mt-4 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-indigo-50/30 border-indigo-50'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-400">Total HT</span>
                        <span className="text-sm font-bold">{totals.ht.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-400">TVA</span>
                        <span className="text-sm font-bold">{totals.vat.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-indigo-100 dark:border-slate-600">
                        <span className="text-sm font-black text-indigo-900 dark:text-indigo-300">TOTAL TTC</span>
                        <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{totals.ttc.toFixed(2)} €</span>
                      </div>
                   </div>
                )}
              </div>

              {/* Payment Schedule */}
              <div className="space-y-3">
                 <div className="flex justify-between items-center px-1">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Échéancier & Acomptes</h4>
                   {paymentSchedule.length === 0 && (
                     <button onClick={generateDefaultSchedule} className="text-indigo-500 flex items-center gap-1 text-[10px] font-black uppercase"><LayoutList size={12}/> Générer (30/50/20)</button>
                   )}
                </div>
                
                <div className="space-y-2">
                  {paymentSchedule.map(p => {
                    const amount = (totals.ttc * p.percentage / 100);
                    return (
                      <div key={p.id} className={`p-4 rounded-2xl border flex flex-col gap-3 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                         <div className="flex justify-between items-start">
                           <input 
                              value={p.label}
                              onChange={(e) => updateSchedule(p.id, 'label', e.target.value)}
                              className="font-bold text-xs bg-transparent outline-none flex-1"
                           />
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-slate-400">Reçu</span>
                              <button 
                                onClick={() => updateSchedule(p.id, 'paid', !p.paid)}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${p.paid ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}
                              >
                                {p.paid && <Check size={14}/>}
                              </button>
                           </div>
                         </div>
                         <div className="flex gap-2">
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1.5 flex-1">
                               <span className="text-[9px] uppercase text-slate-400">%</span>
                               <input 
                                type="number" 
                                value={p.percentage} 
                                onChange={(e) => updateSchedule(p.id, 'percentage', parseFloat(e.target.value) || 0)}
                                className="w-10 bg-transparent text-center font-bold outline-none text-xs"
                               />
                            </div>
                             <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1.5 flex-[2]">
                               <Calendar size={12} className="text-slate-400" />
                               <input 
                                type="date" 
                                value={p.dueDate} 
                                onChange={(e) => updateSchedule(p.id, 'dueDate', e.target.value)}
                                className="bg-transparent font-bold outline-none text-xs w-full"
                               />
                            </div>
                         </div>
                         <div className="text-right">
                           <span className={`text-sm font-black ${p.paid ? 'text-emerald-500 line-through' : 'text-slate-900 dark:text-white'}`}>{amount.toFixed(2)} €</span>
                         </div>
                      </div>
                    );
                  })}
                </div>
                
                {paymentSchedule.length > 0 && (
                   <div className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <span className="text-xs font-bold text-slate-500 uppercase">Reste à payer</span>
                      <span className="font-black text-rose-500">{Math.max(0, totals.ttc - paidAmount).toFixed(2)} €</span>
                   </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4">
                 <button onClick={handleSave} className={`w-full py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg ${themeBg}`}>
                   Sauvegarder les données
                 </button>
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { setDocumentType('quote'); setShowInvoicePreview(true); }} 
                      className="py-4 rounded-2xl border-2 border-slate-900 text-slate-900 dark:border-white dark:text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <FileSpreadsheet size={16}/> Générer Devis
                    </button>
                    <button 
                      onClick={() => { setDocumentType('invoice'); setShowInvoicePreview(true); }} 
                      className="py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
                    >
                      <FileCheck size={16}/> Générer Facture
                    </button>
                 </div>
                 <button 
                    onClick={() => { setDocumentType('functionSheet'); setShowInvoicePreview(true); }} 
                    className="w-full py-4 rounded-2xl border-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                 >
                    <ClipboardList size={16}/> Générer Fiche de Fonction (Équipes)
                 </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupDetailModal;
