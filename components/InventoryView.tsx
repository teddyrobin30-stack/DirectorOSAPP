import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ClipboardList, Plus, Save, Download, Archive, ChevronDown, 
  Trash2, Coffee, Wine, Utensils, GlassWater, AlertCircle, FileSpreadsheet, Filter,
  ArrowRight, Check, X, Table, Users
} from 'lucide-react';
import { UserSettings, MonthlyInventory, InventoryItem, InventoryCategory } from '../types';

interface InventoryViewProps {
  userSettings: UserSettings;
  inventoryData: Record<string, MonthlyInventory>;
  onUpdateInventory: (data: Record<string, MonthlyInventory>) => void;
  canManage: boolean; // Permission check
}

const CATEGORIES: { id: InventoryCategory, icon: any, color: string }[] = [
  { id: 'Cuisine', icon: Utensils, color: 'bg-orange-500' },
  { id: 'Petit Déjeuner', icon: Coffee, color: 'bg-amber-500' },
  { id: 'Boissons sans alcool', icon: GlassWater, color: 'bg-blue-500' },
  { id: 'Boissons avec alcool', icon: Wine, color: 'bg-purple-500' },
];

const InventoryView: React.FC<InventoryViewProps> = ({ userSettings, inventoryData, onUpdateInventory, canManage }) => {
  // Init default month to current or latest available
  const getCurrentMonthId = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthId());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  // Ref for File Input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CSV IMPORT STATE ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawData, setCsvRawData] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    name: '',
    category: '',
    packaging: '',
    supplier: '',
    qty: '',
    cost: ''
  });
  const [defaultImportCategory, setDefaultImportCategory] = useState<InventoryCategory>('Cuisine');
  
  // Create current month if not exists in local state view (but don't save yet unless action)
  const currentData = useMemo(() => {
    if (inventoryData[selectedMonth]) return inventoryData[selectedMonth];
    return { monthId: selectedMonth, status: 'open', items: [] } as MonthlyInventory;
  }, [inventoryData, selectedMonth]);

  const isClosed = currentData.status === 'closed';
  const isMonthCurrent = selectedMonth === getCurrentMonthId();

  // --- ACTIONS ---

  const handleUpdateItem = (itemId: string, field: keyof InventoryItem, value: any) => {
    if (isClosed || !canManage) return;
    
    const updatedItems = currentData.items.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    );
    
    onUpdateInventory({
      ...inventoryData,
      [selectedMonth]: { ...currentData, items: updatedItems }
    });
  };

  const handleAddItem = () => {
    if (isClosed || !canManage) return;
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: 'Nouveau Produit',
      category: categoryFilter !== 'ALL' ? categoryFilter as InventoryCategory : 'Cuisine', // Auto-set category if filtered
      packaging: 'Unité',
      supplier: '',
      initialQty: 0,
      initialUnitCost: 0,
      unitCost: 0,
      currentQty: 0
    };
    onUpdateInventory({
      ...inventoryData,
      [selectedMonth]: { ...currentData, items: [...currentData.items, newItem] }
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (isClosed || !canManage) return;
    
    const updatedItems = currentData.items.filter(item => item.id !== itemId);
    onUpdateInventory({
      ...inventoryData,
      [selectedMonth]: { ...currentData, items: updatedItems }
    });
  };

  const handleCloseMonth = () => {
    if (!canManage) return;
    if (!window.confirm("Êtes-vous sûr de vouloir clôturer le mois ? Cette action est irréversible et générera le stock initial du mois suivant.")) return;

    // 1. Close current
    const closedMonth: MonthlyInventory = { ...currentData, status: 'closed', closedAt: new Date().toISOString() };
    
    // 2. Prepare next month ID
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 1); // JS Month is 0-indexed
    d.setMonth(d.getMonth() + 1);
    const nextMonthId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // 3. Create next month data with carry-over
    const nextMonthItems = currentData.items.map(item => ({
      ...item,
      id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      initialQty: item.currentQty, // CARRY OVER STOCK
      initialUnitCost: item.unitCost, // CARRY OVER PRICE AS INITIAL
      unitCost: item.unitCost, // DEFAULT CURRENT PRICE TO PREVIOUS
      currentQty: item.currentQty, // DEFAULT STOCK
    }));

    const nextMonth: MonthlyInventory = {
      monthId: nextMonthId,
      status: 'open',
      items: nextMonthItems
    };

    onUpdateInventory({
      ...inventoryData,
      [selectedMonth]: closedMonth,
      [nextMonthId]: nextMonth
    });

    // Switch view to next month
    setSelectedMonth(nextMonthId);
  };

  // --- CSV IMPORT LOGIC ---

  const handleImportClick = () => {
    if (isClosed || !canManage) return;
    fileInputRef.current?.click();
  };

  // Step 1: Parse File but don't import yet
  const handleFileAnalysis = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
        alert("Fichier vide ou format incorrect.");
        return;
      }

      // Detect separator
      const firstLine = lines[0];
      const separator = firstLine.includes(';') ? ';' : ',';
      
      // Extract headers
      const headers = firstLine.split(separator).map(h => h.trim().replace(/"/g, ''));
      setCsvHeaders(headers);

      // Extract Data objects
      const data = lines.slice(1).map(line => {
        const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] || '';
        });
        return obj;
      });
      setCsvRawData(data);

      // Auto-guess mapping based on keywords
      const newMapping = { name: '', category: '', packaging: '', supplier: '', qty: '', cost: '' };
      
      const findHeader = (keywords: string[]) => headers.find(h => keywords.some(k => h.toLowerCase().includes(k))) || '';
      
      newMapping.name = findHeader(['nom', 'produit', 'article', 'désignation', 'libellé']);
      newMapping.category = findHeader(['cat', 'famille', 'type']);
      newMapping.packaging = findHeader(['cond', 'pack', 'unité']);
      newMapping.supplier = findHeader(['fourn', 'supp', 'vend']);
      newMapping.qty = findHeader(['qt', 'stock', 'initial']);
      newMapping.cost = findHeader(['cout', 'coût', 'prix', 'price', 'unit']);

      setColumnMapping(newMapping);
      setShowImportModal(true);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Step 2: Confirm Mapping and Process
  const handleConfirmImport = () => {
    if (!columnMapping.name) {
      alert("Veuillez au moins associer la colonne 'Nom du Produit'.");
      return;
    }

    const newItems: InventoryItem[] = csvRawData.map((row, idx) => {
      // 1. Resolve Name
      const name = row[columnMapping.name] || 'Article sans nom';
      
      // 2. Resolve Category
      let category: InventoryCategory = defaultImportCategory;
      const rawCat = columnMapping.category ? row[columnMapping.category] : '';
      
      if (rawCat) {
        const lowerCat = rawCat.toLowerCase();
        if (lowerCat.includes('sans alcool') || (lowerCat.includes('boisson') && !lowerCat.includes('alcool'))) category = 'Boissons sans alcool';
        else if (lowerCat.includes('alcool') || lowerCat.includes('vin') || lowerCat.includes('cave')) category = 'Boissons avec alcool';
        else if (lowerCat.includes('déj') || lowerCat.includes('dej') || lowerCat.includes('matin')) category = 'Petit Déjeuner';
        else if (lowerCat.includes('cuis') || lowerCat.includes('food') || lowerCat.includes('alim')) category = 'Cuisine';
      }

      // 3. Resolve Numbers
      const parseNum = (val: string) => {
        if (!val) return 0;
        // Replace comma with dot, remove currency symbols or spaces if basic clean needed
        const clean = val.replace(',', '.').replace(/[^\d.-]/g, ''); 
        return parseFloat(clean) || 0;
      };

      const cost = columnMapping.cost ? parseNum(row[columnMapping.cost]) : 0;
      const qty = columnMapping.qty ? parseNum(row[columnMapping.qty]) : 0;

      return {
        id: `imp-${Date.now()}-${idx}`,
        name: name,
        category: category,
        packaging: columnMapping.packaging ? row[columnMapping.packaging] : 'Unité',
        supplier: columnMapping.supplier ? row[columnMapping.supplier] : '',
        initialQty: qty,
        initialUnitCost: cost,
        unitCost: cost,
        currentQty: qty
      };
    });

    onUpdateInventory({
      ...inventoryData,
      [selectedMonth]: { ...currentData, items: [...currentData.items, ...newItems] }
    });

    setShowImportModal(false);
  };

  // --- FILTERING & SORTING ---
  const filteredItems = useMemo(() => {
    return currentData.items.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || i.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => a.category.localeCompare(b.category));
  }, [currentData, searchTerm, categoryFilter]);

  // --- STATS DYNAMIC (Based on filteredItems) ---
  const stats = useMemo(() => {
    const s: Record<string, number> = { total: 0 };
    CATEGORIES.forEach(c => s[c.id] = 0);
    
    filteredItems.forEach(item => {
      const val = item.currentQty * item.unitCost;
      s.total += val;
      if (s[item.category] !== undefined) s[item.category] += val;
    });
    return s;
  }, [filteredItems]);

  // Group by category for display
  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    if (categoryFilter === 'ALL') {
        CATEGORIES.forEach(c => groups[c.id] = []);
    } else {
        groups[categoryFilter] = [];
    }

    filteredItems.forEach(item => {
      if (groups[item.category]) groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems, categoryFilter]);

  const availableMonths = Object.keys(inventoryData).sort().reverse();
  if (!availableMonths.includes(selectedMonth)) availableMonths.unshift(selectedMonth);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in">
      
      {/* 1. TOP DASHBOARD (Header) */}
      <div className={`p-6 border-b z-20 ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
         <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-violet-600 rounded-2xl text-white shadow-lg shadow-violet-500/20">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Inventaire F&B</h2>
                    <p className="text-xs font-bold text-slate-400">Suivi des stocks & Coûts</p>
                  </div>
               </div>

               {/* Month Selection Moved Here for Better Visibility */}
               <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400 pl-2">Période :</span>
                  <div className="relative">
                    <select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="appearance-none bg-transparent font-black text-sm outline-none pr-8 cursor-pointer dark:text-white py-1"
                    >
                      {availableMonths.map(m => (
                        <option key={m} value={m}>{m} {inventoryData[m]?.status === 'closed' ? '🔒' : '✏️'}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-0 top-2.5 pointer-events-none text-slate-400"/>
                  </div>
               </div>
            </div>

            {/* KPI Cards (Dynamic Update) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {CATEGORIES.map(cat => (
                 <div key={cat.id} className={`p-4 rounded-2xl border relative overflow-hidden transition-all duration-300 ${categoryFilter !== 'ALL' && categoryFilter !== cat.id ? 'opacity-40 grayscale' : ''} ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-2">
                       <div className={`p-2 rounded-lg ${cat.color} text-white`}>
                         <cat.icon size={16}/>
                       </div>
                       <span className="text-[9px] font-black uppercase text-slate-400 text-right leading-tight max-w-[60%]">{cat.id}</span>
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white">{stats[cat.id].toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</div>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* 2. FILTERS & ACTIONS TOOLBAR */}
      <div className={`px-6 py-4 flex flex-col gap-4 border-b ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
         <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Filters Group */}
            <div className="flex flex-1 gap-3 w-full md:w-auto">
                <div className={`flex items-center px-4 py-2.5 rounded-xl border-2 w-full md:w-64 transition-colors ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 focus-within:border-violet-500' : 'bg-white border-slate-200 focus-within:border-violet-500'}`}>
                    <input 
                    type="text" 
                    placeholder="Rechercher produit..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent text-sm font-bold outline-none w-full dark:text-white"
                    />
                </div>

                <div className="relative min-w-[150px]">
                    <div className={`flex items-center px-3 py-2.5 rounded-xl border-2 w-full transition-colors ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <Filter size={14} className="text-slate-400 mr-2"/>
                        <select 
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="bg-transparent text-xs font-bold outline-none w-full appearance-none dark:text-white cursor-pointer"
                        >
                            <option value="ALL">Toutes catégories</option>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-3.5 pointer-events-none text-slate-400"/>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar justify-end">
               {canManage && !isClosed && (
                 <>
                   <button onClick={handleAddItem} className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-violet-700 transition-colors shadow-lg whitespace-nowrap">
                     <Plus size={16}/> <span className="hidden md:inline">Ajouter</span> Article
                   </button>
                   
                   {/* Hidden File Input */}
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     onChange={handleFileAnalysis} // Changed handler
                     accept=".csv, .txt" 
                     className="hidden" 
                   />
                   <button onClick={handleImportClick} className="px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap">
                     <FileSpreadsheet size={16}/> Import <span className="hidden md:inline">CSV</span>
                   </button>
                 </>
               )}
               
               {canManage && !isClosed && (
                 <button onClick={handleCloseMonth} className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg ml-2 whitespace-nowrap">
                   <Archive size={16}/> Clôturer <span className="hidden md:inline">le mois</span>
                 </button>
               )}
               {isClosed && (
                 <div className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold text-xs flex items-center gap-2 cursor-not-allowed">
                   <Archive size={16}/> Mois Clôturé
                 </div>
               )}
            </div>
         </div>
      </div>

      {/* 3. MAIN TABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-20 no-scrollbar pt-6">
         <div className="max-w-7xl mx-auto w-full space-y-8">
            {Object.keys(groupedItems).map(catId => {
              const items = groupedItems[catId];
              const catConfig = CATEGORIES.find(c => c.id === catId);
              if (items.length === 0) return null;

              return (
                <div key={catId} className="space-y-3">
                   {/* Category Header */}
                   <div className="flex items-center gap-2">
                      <div className={`w-2 h-6 rounded-full ${catConfig?.color}`} />
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">{catId}</h3>
                   </div>
                   
                   {/* 
                      ADAPTIVE TABLE CONTAINER
                      Desktop: White rounded box with table
                      Mobile: Transparent container with cards
                   */}
                   <div className={`md:rounded-3xl md:border md:overflow-hidden ${userSettings.darkMode ? 'md:bg-slate-800 md:border-slate-700' : 'md:bg-white md:border-slate-200 md:shadow-sm'}`}>
                      
                      {/* TABLE HEADER (Desktop Only) */}
                      <div className={`hidden md:flex text-[10px] font-black uppercase text-slate-400 ${userSettings.darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                         <div className="py-4 px-6 text-left flex-1 min-w-[200px]">Article / Condit.</div>
                         <div className="py-4 px-4 text-left w-32">Fournisseur</div>
                         <div className="py-4 px-4 text-center w-24">Initial (Stock)</div>
                         <div className="py-4 px-4 text-center w-24">Initial (Prix)</div>
                         <div className="py-4 px-4 text-center w-24">Prix Actuel</div>
                         <div className="py-4 px-4 text-center w-24">Stock Actuel</div>
                         <div className="py-4 px-6 text-right w-28">Valeur Stock</div>
                         {!isClosed && canManage && <div className="py-4 px-4 w-10"></div>}
                      </div>

                      {/* ITEMS LIST */}
                      <div className="flex flex-col md:block">
                         {items.map(item => (
                           <div 
                             key={item.id} 
                             className={`flex flex-col md:flex-row md:items-center relative p-4 mb-3 md:p-0 md:mb-0 md:border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${userSettings.darkMode ? 'bg-slate-800 border-slate-700 rounded-2xl' : 'bg-white shadow-sm md:shadow-none border border-slate-200 md:border-slate-100 rounded-2xl md:rounded-none'}`}
                           >
                              
                              {/* 1. Article Info */}
                              <div className="md:flex-1 md:min-w-[200px] md:py-3 md:px-6 mb-3 md:mb-0">
                                 {isClosed ? (
                                   <>
                                     <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                                     <div className="text-[10px] font-medium text-slate-400">{item.packaging}</div>
                                   </>
                                 ) : (
                                   <div className="flex flex-col gap-1">
                                     <input 
                                       type="text" 
                                       value={item.name}
                                       onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                       className="font-bold text-slate-900 dark:text-white bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-violet-500 placeholder:text-slate-400 transition-colors w-full"
                                       placeholder="Nom Produit"
                                     />
                                     <input 
                                       type="text" 
                                       value={item.packaging}
                                       onChange={(e) => handleUpdateItem(item.id, 'packaging', e.target.value)}
                                       className="text-[10px] font-medium text-slate-500 bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-violet-500 placeholder:text-slate-300 w-full"
                                       placeholder="Conditionnement"
                                     />
                                   </div>
                                 )}
                              </div>

                              {/* 2. Supplier (Hidden on Mobile) */}
                              <div className="hidden md:block w-32 px-4 py-3">
                                 {isClosed ? (
                                   <span className="text-xs font-medium text-slate-500">{item.supplier || '-'}</span>
                                 ) : (
                                   <input 
                                     type="text" 
                                     value={item.supplier}
                                     onChange={(e) => handleUpdateItem(item.id, 'supplier', e.target.value)}
                                     className="text-xs font-medium text-slate-500 bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-violet-500 placeholder:text-slate-300 w-full"
                                     placeholder="Fournisseur"
                                   />
                                 )}
                              </div>

                              {/* 3. Initial Values (Hidden on Mobile) */}
                              <div className="hidden md:block w-24 text-center px-4 py-3">
                                 <span className="text-xs font-bold text-slate-400">{item.initialQty}</span>
                              </div>
                              <div className="hidden md:block w-24 text-center px-4 py-3">
                                 <span className="text-xs font-bold text-slate-400">{item.initialUnitCost !== undefined ? item.initialUnitCost : '-'} €</span>
                              </div>

                              {/* 4. Inputs Grid (Mobile Friendly) */}
                              <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:gap-0 w-full md:w-auto">
                                 
                                 {/* Price Input */}
                                 <div className="md:w-24 md:px-4 md:py-3 flex flex-col items-center">
                                    <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1">Prix Unitaire</span>
                                    {isClosed ? (
                                       <span className="font-black text-slate-900 dark:text-white">{item.unitCost} €</span>
                                    ) : (
                                       <input 
                                          type="number" 
                                          value={item.unitCost}
                                          onChange={(e) => handleUpdateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                                          className="w-full md:w-20 text-center bg-slate-100 dark:bg-slate-900 rounded-lg py-2 px-2 font-black outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white"
                                       />
                                    )}
                                 </div>

                                 {/* Stock Input */}
                                 <div className="md:w-24 md:px-4 md:py-3 flex flex-col items-center">
                                    <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1">Stock Réel</span>
                                    {isClosed ? (
                                       <span className="font-black text-slate-900 dark:text-white">{item.currentQty}</span>
                                    ) : (
                                       <input 
                                          type="number" 
                                          value={item.currentQty}
                                          onChange={(e) => handleUpdateItem(item.id, 'currentQty', parseFloat(e.target.value) || 0)}
                                          className="w-full md:w-20 text-center bg-violet-50 dark:bg-violet-900/20 text-slate-900 dark:text-white rounded-lg py-2 px-2 font-black outline-none focus:ring-2 focus:ring-violet-500"
                                       />
                                    )}
                                 </div>
                              </div>

                              {/* 5. Total Value */}
                              <div className="col-span-2 md:w-28 md:px-6 md:py-3 text-right flex justify-between md:block items-center mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-100 dark:border-slate-700">
                                 <span className="md:hidden text-xs font-bold text-slate-500">Valeur Totale</span>
                                 <span className="font-black text-slate-900 dark:text-white">{(item.currentQty * item.unitCost).toFixed(2)} €</span>
                              </div>

                              {/* 6. Delete Action - Z-Index FIX for Mobile */}
                              {!isClosed && canManage && (
                                <div className="absolute top-3 right-3 z-10 md:z-auto md:relative md:top-auto md:right-auto md:w-10 md:px-4 md:py-3 md:text-right">
                                   <button 
                                     onClick={(e) => {
                                       e.preventDefault(); // Bloque le comportement par défaut
                                       e.stopPropagation(); // BLOQUE L'OUVERTURE DE LA CARTE
                                       if (window.confirm("Voulez-vous vraiment supprimer cet article ?")) {
                                         // Force la suppression avec l'ID de l'article courant
                                         handleDeleteItem(item.id);
                                       }
                                     }}
                                     className="p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200 z-50 md:p-2 md:text-slate-300 md:bg-transparent md:hover:text-red-500 md:hover:bg-transparent"
                                     title="Supprimer"
                                   >
                                     <Trash2 size={20} className="md:w-4 md:h-4"/>
                                   </button>
                                </div>
                              )}

                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              );
            })}
            
            {filteredItems.length === 0 && (
              <div className="py-20 text-center opacity-50">
                 <ClipboardList size={48} className="mx-auto mb-4 text-slate-300"/>
                 <p className="font-bold text-slate-400">Aucun article trouvé.</p>
                 {!isClosed && searchTerm === '' && categoryFilter === 'ALL' && <p className="text-xs mt-2">Utilisez "Ajouter Article" ou "Import CSV" pour commencer.</p>}
              </div>
            )}
         </div>
      </div>

      {/* --- MAPPING MODAL --- */}
      {showImportModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center animate-in fade-in backdrop-blur-sm p-4">
           <div className={`w-full max-w-4xl rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white">
                       <FileSpreadsheet size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black">Correspondance CSV</h3>
                       <p className="text-xs text-slate-400 font-bold">Associez les colonnes de votre fichier</p>
                    </div>
                 </div>
                 <button onClick={() => setShowImportModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                 
                 {/* Mapping Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2 mb-4">Champs requis</h4>
                       {[
                         { key: 'name', label: 'Nom du Produit *', icon: ClipboardList },
                         { key: 'supplier', label: 'Fournisseur', icon: Users },
                         { key: 'category', label: 'Catégorie', icon: Filter },
                         { key: 'packaging', label: 'Conditionnement', icon: Archive },
                         { key: 'qty', label: 'Quantité Initiale', icon: ChevronDown },
                         { key: 'cost', label: 'Coût HT', icon: AlertCircle },
                       ].map(field => (
                         <div key={field.key} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                               <field.icon size={16} className="text-slate-400"/> {field.label}
                            </div>
                            <div className="flex items-center gap-2">
                               <ArrowRight size={14} className="text-slate-300"/>
                               <select 
                                 value={columnMapping[field.key as keyof typeof columnMapping]} 
                                 onChange={(e) => setColumnMapping({...columnMapping, [field.key]: e.target.value})}
                                 className={`w-40 py-2 px-3 rounded-xl text-xs font-bold outline-none border-2 transition-colors ${columnMapping[field.key as keyof typeof columnMapping] ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 bg-transparent text-slate-400'}`}
                               >
                                 <option value="">Ignorer</option>
                                 {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                               </select>
                            </div>
                         </div>
                       ))}
                    </div>

                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2 mb-4">Options</h4>
                       
                       <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Catégorie par défaut</label>
                          <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                             Si la catégorie du fichier est vide ou inconnue, utiliser :
                          </p>
                          <select 
                            value={defaultImportCategory}
                            onChange={(e) => setDefaultImportCategory(e.target.value as InventoryCategory)}
                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 font-bold text-sm outline-none border border-slate-200 dark:border-slate-700"
                          >
                             {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                          </select>
                       </div>

                       <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex gap-3 items-start">
                          <AlertCircle size={18} className="text-blue-500 mt-0.5 shrink-0" />
                          <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                             Vérifiez l'aperçu ci-dessous. Les décimales (virgules) seront automatiquement converties en points. Les nouvelles lignes seront ajoutées à la liste existante.
                          </p>
                       </div>
                    </div>
                 </div>

                 {/* Preview Table */}
                 <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2"><Table size={14}/> Aperçu des données (3 premières lignes)</h4>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                       <table className="w-full text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-black text-slate-500 uppercase">
                             <tr>
                                <th className="p-3 text-left">Produit</th>
                                <th className="p-3 text-left">Catégorie</th>
                                <th className="p-3 text-left">Fournisseur</th>
                                <th className="p-3 text-right">Qté</th>
                                <th className="p-3 text-right">Coût</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                             {csvRawData.slice(0, 3).map((row, i) => (
                               <tr key={i}>
                                  <td className="p-3 font-bold text-slate-900 dark:text-white">{columnMapping.name ? row[columnMapping.name] : '-'}</td>
                                  <td className="p-3 text-slate-500">{columnMapping.category ? row[columnMapping.category] : defaultImportCategory}</td>
                                  <td className="p-3 text-slate-500">{columnMapping.supplier ? row[columnMapping.supplier] : '-'}</td>
                                  <td className="p-3 text-right font-mono">{columnMapping.qty ? row[columnMapping.qty] : '0'}</td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">{columnMapping.cost ? row[columnMapping.cost] : '0'}</td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>

              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-[32px]">
                 <button 
                   onClick={() => setShowImportModal(false)}
                   className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                 >
                   Annuler
                 </button>
                 <button 
                   onClick={handleConfirmImport}
                   className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                 >
                   <Check size={16} /> Valider l'import
                 </button>
              </div>

           </div>
        </div>
      )}

    </div>
  );
};

export default InventoryView;
