import React, { useState, useMemo } from 'react';
import { 
  ChefHat, Calculator, ArrowLeft, Plus, Search, Trash2, 
  Save, Utensils, Euro, FileText, PieChart, AlertCircle, BookOpen, Settings, Filter, X
} from 'lucide-react';
import { UserSettings, Recipe, RecipeIngredient, InventoryItem, MonthlyInventory, RatioItem } from '../types';

interface KitchenEngineeringViewProps {
  userSettings: UserSettings;
  recipes: Recipe[];
  onUpdateRecipes: (recipes: Recipe[]) => void;
  onNavigate: (tab: string) => void;
  inventoryData: Record<string, MonthlyInventory>;
  
  // New Props for Ratio Catalog
  ratioItems: RatioItem[];
  onUpdateRatioItems: (items: RatioItem[]) => void;
  customCategories: string[];
  onUpdateCategories: (cats: string[]) => void;
}

const UNITS = ['kg', 'g', 'L', 'ml', 'cl', 'Pièce', 'Portion'];

const KitchenEngineeringView: React.FC<KitchenEngineeringViewProps> = ({ 
  userSettings, recipes, onUpdateRecipes, onNavigate, inventoryData,
  ratioItems, onUpdateRatioItems, customCategories, onUpdateCategories
}) => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'recipes' | 'catalog'>('calculator');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  
  // --- CALCULATOR STATE ---
  const [calcCost, setCalcCost] = useState<string>('');
  const [calcVat, setCalcVat] = useState<string>('10');
  const [calcTargetPercent, setCalcTargetPercent] = useState<string>('30'); 

  // --- RECIPE EDIT STATE ---
  const [recipeSearch, setRecipeSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'Entrée' | 'Plat' | 'Dessert'>('ALL');
  const [isEditing, setIsEditing] = useState(false);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState('');

  // --- CATALOG STATE ---
  const [catalogSearch, setCatalogSearch] = useState('');
  const [activeCatalogFilter, setActiveCatalogFilter] = useState('ALL');
  const [isManagingCats, setIsManagingCats] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Get latest inventory items for autocomplete (used in both Recipes and Catalog)
  const inventoryItems = useMemo(() => {
    const monthIds = Object.keys(inventoryData).sort().reverse();
    if (monthIds.length === 0) return [];
    return inventoryData[monthIds[0]].items;
  }, [inventoryData]);

  // --- CALCULATOR LOGIC ---
  const calculatedPrice = useMemo(() => {
    const cost = parseFloat(calcCost.replace(',', '.')) || 0;
    const targetPercent = parseFloat(calcTargetPercent) || 0;
    const vat = parseFloat(calcVat) || 0;
    
    let priceHT = 0;
    if (targetPercent > 0) {
      priceHT = cost / (targetPercent / 100);
    }
    
    const priceTTC = priceHT * (1 + vat / 100);
    const margin = priceHT - cost;
    
    return { priceHT, priceTTC, margin };
  }, [calcCost, calcTargetPercent, calcVat]);

  // --- RECIPE LOGIC ---
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(recipeSearch.toLowerCase());
      const matchesCat = filterCategory === 'ALL' || r.category === filterCategory;
      return matchesSearch && matchesCat;
    });
  }, [recipes, recipeSearch, filterCategory]);

  const handleCreateRecipe = () => {
    const newRecipe: Recipe = {
      id: `rec-${Date.now()}`,
      name: 'Nouvelle Recette',
      category: 'Plat',
      portions: 1,
      targetCostPercent: 30, // Default 30%
      vatRate: 10,
      lastUpdated: new Date().toISOString(),
      ingredients: []
    };
    setEditRecipe(newRecipe);
    setIsEditing(true);
    setSelectedRecipe(null);
  };

  const handleSelectRecipe = (r: Recipe) => {
    setSelectedRecipe(r);
    setEditRecipe({ ...r }); // Clone for editing
    setIsEditing(true);
  };

  const handleAddIngredient = (invItem?: InventoryItem) => {
    if (!editRecipe) return;
    
    const newIng: RecipeIngredient = {
      id: `ring-${Date.now()}`,
      inventoryItemId: invItem?.id,
      name: invItem ? invItem.name : 'Nouvel ingrédient',
      unit: invItem ? (invItem.packaging.includes('kg') ? 'kg' : 'Pièce') : 'kg',
      unitPrice: invItem ? invItem.unitCost : 0,
      quantity: 1,
      supplier: invItem?.supplier
    };

    setEditRecipe({
      ...editRecipe,
      ingredients: [...editRecipe.ingredients, newIng]
    });
    setIngredientSearch('');
  };

  const updateIngredient = (id: string, field: keyof RecipeIngredient, value: any) => {
    if (!editRecipe) return;
    const newIngredients = editRecipe.ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    );
    setEditRecipe({ ...editRecipe, ingredients: newIngredients });
  };

  const removeIngredient = (id: string) => {
    if (!editRecipe) return;
    setEditRecipe({
      ...editRecipe,
      ingredients: editRecipe.ingredients.filter(i => i.id !== id)
    });
  };

  const saveRecipe = () => {
    if (!editRecipe) return;
    const exists = recipes.find(r => r.id === editRecipe.id);
    let newRecipes;
    if (exists) {
      newRecipes = recipes.map(r => r.id === editRecipe.id ? { ...editRecipe, lastUpdated: new Date().toISOString() } : r);
    } else {
      newRecipes = [...recipes, { ...editRecipe, lastUpdated: new Date().toISOString() }];
    }
    onUpdateRecipes(newRecipes);
    setSelectedRecipe(editRecipe);
    alert("Recette sauvegardée !");
  };

  // Recipe Costs Calculation
  const recipeCosts = useMemo(() => {
    if (!editRecipe) return { rawCost: 0, waste: 0, totalCost: 0, recommendedPrice: 0, margin: 0 };
    
    let rawCost = 0;
    editRecipe.ingredients.forEach(ing => {
      rawCost += ing.quantity * ing.unitPrice;
    });

    const waste = rawCost * 0.10; // 10% perte
    const totalCost = rawCost + waste;
    
    let priceHT = 0;
    const targetPercent = editRecipe.targetCostPercent || 30;
    
    if (targetPercent > 0) {
      priceHT = totalCost / (targetPercent / 100);
    }

    const priceTTC = priceHT * (1 + editRecipe.vatRate / 100);

    return { rawCost, waste, totalCost, recommendedPrice: priceTTC, margin: priceHT - totalCost };
  }, [editRecipe]);

  // --- CATALOG LOGIC ---

  const handleAddRatioItem = () => {
    const newItem: RatioItem = {
      id: `rat-${Date.now()}`,
      name: 'Nouveau Produit',
      category: 'Food',
      manualCost: 0,
      targetPercent: 30,
      vatRate: 10
    };
    onUpdateRatioItems([newItem, ...ratioItems]);
  };

  const handleUpdateRatioItem = (id: string, field: keyof RatioItem, value: any) => {
    onUpdateRatioItems(ratioItems.map(item => {
      if (item.id === id) {
        // Special handling for inventory link
        if (field === 'inventoryId') {
           if (value) {
             const invItem = inventoryItems.find(i => i.id === value);
             if (invItem) {
               // HYBRID SYSTEM: Import Name, Category, and reset Manual Cost
               return { 
                   ...item, 
                   inventoryId: value, 
                   name: invItem.name, 
                   manualCost: 0,
                   category: invItem.category // Auto-import category from inventory
               }; 
             }
           } else {
             return { ...item, inventoryId: undefined }; // Unlink to allow manual edit
           }
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleDeleteRatioItem = (id: string) => {
    if (window.confirm('Supprimer ce produit ?')) {
      onUpdateRatioItems(ratioItems.filter(i => i.id !== id));
    }
  };

  const handleAddCategory = () => {
    if (newCatName && !customCategories.includes(newCatName)) {
      onUpdateCategories([...customCategories, newCatName]);
      setNewCatName('');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    if (window.confirm(`Supprimer la catégorie "${cat}" ?`)) {
      onUpdateCategories(customCategories.filter(c => c !== cat));
    }
  };

  // Filter Ratio Items
  const filteredRatioItems = useMemo(() => {
    return ratioItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(catalogSearch.toLowerCase());
      const matchesCat = activeCatalogFilter === 'ALL' || item.category === activeCatalogFilter;
      return matchesSearch && matchesCat;
    });
  }, [ratioItems, catalogSearch, activeCatalogFilter]);

  return (
    <div className={`h-full flex flex-col overflow-hidden animate-in fade-in ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* HEADER */}
      <div className={`p-6 border-b z-20 flex justify-between items-center ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
         <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-600 rounded-2xl text-white shadow-lg shadow-violet-500/20">
              <ChefHat size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black">Ingénierie Cuisine</h2>
              <p className="text-xs font-bold text-slate-400">Pricing & Fiches Techniques</p>
            </div>
         </div>
         <button 
           onClick={() => onNavigate('dashboard')}
           className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
         >
           <ArrowLeft size={14}/> Retour Accueil
         </button>
      </div>

      {/* TABS */}
      <div className="px-6 py-4">
         <div className="flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-800 w-fit overflow-x-auto whitespace-nowrap max-w-full no-scrollbar px-2">
            <button 
              onClick={() => setActiveTab('calculator')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'calculator' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}
            >
              <Calculator size={14}/> Calculateur Rapide
            </button>
            <button 
              onClick={() => setActiveTab('recipes')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'recipes' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}
            >
              <Utensils size={14}/> Fiches Techniques
            </button>
            <button 
              onClick={() => setActiveTab('catalog')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'catalog' ? 'bg-white dark:bg-slate-700 shadow text-violet-600' : 'text-slate-500'}`}
            >
              <BookOpen size={14}/> Catalogue des Ratios
            </button>
         </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 pb-20">
         
         {/* --- CALCULATOR TAB --- */}
         {activeTab === 'calculator' && (
           <div className="max-w-4xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Inputs */}
              <div className={`p-8 rounded-[32px] border shadow-sm space-y-6 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                 <h3 className="text-lg font-black uppercase tracking-tight mb-6">Paramètres</h3>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Coût Matière HT (€)</label>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus-within:border-violet-500 transition-all flex items-center gap-3">
                       <Euro size={20} className="text-slate-400"/>
                       <input 
                         type="text" 
                         value={calcCost}
                         onChange={(e) => setCalcCost(e.target.value)}
                         placeholder="Ex: 10.50"
                         className="bg-transparent font-black text-2xl outline-none w-full"
                       />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Coût Matière Cible (%)</label>
                       <div className="relative">
                         <input 
                           type="number" 
                           value={calcTargetPercent}
                           onChange={(e) => setCalcTargetPercent(e.target.value)}
                           className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black text-xl outline-none border-2 border-transparent focus:border-violet-500 transition-all text-center pr-8"
                         />
                         <span className="absolute right-4 top-5 font-black text-slate-400">%</span>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 ml-1">TVA (%)</label>
                       <select 
                         value={calcVat}
                         onChange={(e) => setCalcVat(e.target.value)}
                         className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black text-xl outline-none border-2 border-transparent focus:border-violet-500 transition-all text-center appearance-none"
                       >
                         <option value="5.5">5.5 %</option>
                         <option value="10">10 %</option>
                         <option value="20">20 %</option>
                       </select>
                    </div>
                 </div>
                 <div className="pt-4">
                    <p className="text-xs text-slate-400 italic">
                       Formule : (Coût HT / % Cible) x (1 + TVA)
                    </p>
                 </div>
              </div>
              {/* Results */}
              <div className="flex flex-col gap-6">
                 <div className="flex-1 p-8 rounded-[32px] bg-violet-600 text-white shadow-xl shadow-violet-500/30 flex flex-col justify-center items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">Prix de Vente Conseillé (TTC)</p>
                    <h1 className="text-6xl font-black">{calculatedPrice.priceTTC.toFixed(2)} €</h1>
                    <p className="mt-4 text-sm font-medium bg-white/20 px-3 py-1 rounded-lg">HT : {calculatedPrice.priceHT.toFixed(2)} €</p>
                 </div>
                 <div className={`p-6 rounded-[28px] border flex justify-between items-center ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div>
                       <p className="text-[10px] font-black uppercase text-slate-400">Marge Brute (HT)</p>
                       <p className="text-2xl font-black text-emerald-500">+{calculatedPrice.margin.toFixed(2)} €</p>
                    </div>
                    <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase text-slate-400">Ratio Matière</p>
                       <p className="text-2xl font-black text-slate-900 dark:text-white">
                         {parseFloat(calcCost.replace(',', '.')) > 0 && calculatedPrice.priceHT > 0 
                           ? ((parseFloat(calcCost.replace(',', '.')) / calculatedPrice.priceHT) * 100).toFixed(1) 
                           : '0.0'} %
                       </p>
                    </div>
                 </div>
              </div>
           </div>
         )}

         {/* --- RECIPES TAB --- */}
         {activeTab === 'recipes' && (
           <div className="flex flex-col md:flex-row h-full gap-4 md:gap-6">
              {/* Left: Recipe List */}
              <div className={`w-full md:w-1/3 flex flex-col rounded-[32px] border overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                 <div className="p-4 border-b border-slate-100 dark:border-slate-700 space-y-3">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                       <Search size={16} className="text-slate-400"/>
                       <input 
                         type="text" 
                         placeholder="Rechercher recette..." 
                         value={recipeSearch}
                         onChange={(e) => setRecipeSearch(e.target.value)}
                         className="bg-transparent outline-none text-xs font-bold w-full"
                       />
                    </div>
                    <div className="flex gap-2">
                       {['ALL', 'Entrée', 'Plat', 'Dessert'].map(c => (
                         <button 
                           key={c}
                           onClick={() => setFilterCategory(c as any)}
                           className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${filterCategory === c ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}
                         >
                           {c}
                         </button>
                       ))}
                    </div>
                    <button 
                      onClick={handleCreateRecipe}
                      className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                      <Plus size={14}/> Créer Recette
                    </button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                    {filteredRecipes.map(r => (
                      <div 
                        key={r.id} 
                        onClick={() => handleSelectRecipe(r)}
                        className={`p-3 rounded-xl cursor-pointer border transition-all ${selectedRecipe?.id === r.id ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                      >
                         <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm">{r.name}</span>
                            <span className="text-[9px] font-black bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-sm text-slate-500">{r.category}</span>
                         </div>
                         <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                            <span>{r.ingredients.length} ingrédients</span>
                            <span>Cible: {r.targetCostPercent}%</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              {/* Right: Recipe Editor */}
              <div className={`flex-1 rounded-[32px] border overflow-hidden flex flex-col ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                 {isEditing && editRecipe ? (
                   <>
                     {/* Editor Header */}
                     <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex-1 space-y-4 w-full">
                           <div className="flex gap-3">
                              <input 
                                type="text" 
                                value={editRecipe.name} 
                                onChange={(e) => setEditRecipe({...editRecipe, name: e.target.value})}
                                className="text-2xl font-black bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-violet-500 w-full pb-1 text-slate-900 dark:text-white"
                                placeholder="Nom de la recette"
                              />
                              <select 
                                value={editRecipe.category}
                                onChange={(e) => setEditRecipe({...editRecipe, category: e.target.value as any})}
                                className="bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-bold px-3 outline-none text-slate-900 dark:text-white"
                              >
                                <option value="Entrée">Entrée</option>
                                <option value="Plat">Plat</option>
                                <option value="Dessert">Dessert</option>
                                <option value="Autre">Autre</option>
                              </select>
                           </div>
                           <div className="flex gap-4">
                              <div className="flex items-center gap-2">
                                 <label className="text-[10px] font-black uppercase text-slate-400">Cible %</label>
                                 <input 
                                   type="number" 
                                   value={editRecipe.targetCostPercent} 
                                   onChange={(e) => setEditRecipe({...editRecipe, targetCostPercent: parseFloat(e.target.value) || 0})}
                                   className="w-16 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 font-bold text-center text-sm outline-none text-slate-900 dark:text-white"
                                 />
                              </div>
                              <div className="flex items-center gap-2">
                                 <label className="text-[10px] font-black uppercase text-slate-400">TVA</label>
                                 <select 
                                   value={editRecipe.vatRate} 
                                   onChange={(e) => setEditRecipe({...editRecipe, vatRate: parseFloat(e.target.value) || 0})}
                                   className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 font-bold text-center text-sm outline-none text-slate-900 dark:text-white"
                                 >
                                   <option value="5.5">5.5%</option>
                                   <option value="10">10%</option>
                                   <option value="20">20%</option>
                                 </select>
                              </div>
                              <div className="flex items-center gap-2">
                                 <label className="text-[10px] font-black uppercase text-slate-400">Portions</label>
                                 <input 
                                   type="number" 
                                   value={editRecipe.portions} 
                                   onChange={(e) => setEditRecipe({...editRecipe, portions: parseFloat(e.target.value) || 1})}
                                   className="w-14 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 font-bold text-center text-sm outline-none text-slate-900 dark:text-white"
                                 />
                              </div>
                           </div>
                        </div>
                        <button onClick={saveRecipe} className="w-full md:w-auto px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-600 transition-colors">
                           <Save size={16}/> Sauvegarder
                        </button>
                     </div>

                     {/* Ingredients List (IMPROVED TABLE) */}
                     <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-2 gap-2">
                           <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Composition ({editRecipe.ingredients.length})</h4>
                           
                           {/* Add Ingredient Dropdown */}
                           <div className="relative group w-full md:w-auto">
                              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-xl border border-transparent focus-within:border-violet-500 transition-colors w-full">
                                 <Plus size={14} className="text-slate-400"/>
                                 <input 
                                   type="text" 
                                   placeholder="Ajouter ingrédient..." 
                                   className="bg-transparent outline-none text-xs font-bold w-full md:w-40 text-slate-900 dark:text-white"
                                   value={ingredientSearch}
                                   onChange={(e) => setIngredientSearch(e.target.value)}
                                 />
                              </div>
                              {/* Autocomplete Results */}
                              {ingredientSearch && (
                                <div className="absolute top-full right-0 mt-2 w-full md:w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
                                   <div onClick={() => handleAddIngredient()} className="p-3 text-xs font-bold text-violet-500 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700">
                                      + Créer "{ingredientSearch}" (Manuel)
                                   </div>
                                   {inventoryItems
                                     .filter(i => i.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
                                     .slice(0, 5)
                                     .map(item => (
                                       <div key={item.id} onClick={() => handleAddIngredient(item)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center group/item">
                                          <div>
                                             <p className="text-xs font-bold">{item.name}</p>
                                             <p className="text-[9px] text-slate-400">{item.packaging}</p>
                                          </div>
                                          <p className="text-xs font-bold">{item.unitCost}€</p>
                                       </div>
                                     ))
                                   }
                                </div>
                              )}
                           </div>
                        </div>

                        {/* NEW TABLE HEADER */}
                        <div className="hidden md:grid grid-cols-12 gap-3 pb-2 border-b border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase text-slate-400">
                           <div className="col-span-4">Ingrédient</div>
                           <div className="col-span-2 text-center">Quantité</div>
                           <div className="col-span-2">Unité</div>
                           <div className="col-span-2 text-right">Prix Unit.</div>
                           <div className="col-span-2 text-right">Total HT</div>
                        </div>

                        <div className="space-y-2">
                           {editRecipe.ingredients.map(ing => (
                             <div key={ing.id} className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:border-violet-200 transition-colors">
                                {/* Name */}
                                <div className="col-span-12 md:col-span-4">
                                   <input 
                                     value={ing.name} 
                                     onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                                     className="bg-transparent font-bold text-sm outline-none w-full text-slate-900 dark:text-white"
                                     placeholder="Nom ingrédient"
                                   />
                                   {ing.supplier && <p className="text-[9px] text-slate-400 truncate">{ing.supplier}</p>}
                                </div>
                                
                                {/* Quantity */}
                                <div className="col-span-4 md:col-span-2 flex justify-center">
                                   <input 
                                     type="number"
                                     step="any"
                                     value={ing.quantity} 
                                     onChange={(e) => updateIngredient(ing.id, 'quantity', parseFloat(e.target.value.replace(',', '.')) || 0)}
                                     className="w-16 bg-white dark:bg-slate-800 rounded-lg p-1.5 text-center font-bold text-sm outline-none text-slate-900 dark:text-white border border-transparent focus:border-violet-500 transition-colors"
                                   />
                                </div>

                                {/* Unit Selector */}
                                <div className="col-span-4 md:col-span-2">
                                   <select 
                                     value={ing.unit} 
                                     onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                                     className="w-full bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                                   >
                                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                   </select>
                                </div>

                                {/* Unit Price */}
                                <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-1">
                                   <input 
                                     type="number"
                                     step="any"
                                     value={ing.unitPrice} 
                                     onChange={(e) => updateIngredient(ing.id, 'unitPrice', parseFloat(e.target.value.replace(',', '.')) || 0)}
                                     className="w-16 bg-transparent text-right font-bold text-sm outline-none text-slate-900 dark:text-white border-b border-dashed border-slate-300 focus:border-violet-500"
                                   />
                                   <span className="text-[10px] text-slate-400">€</span>
                                </div>

                                {/* Total Line Cost & Actions */}
                                <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-700 mt-2 md:mt-0">
                                   <span className="text-sm font-black text-slate-900 dark:text-white">
                                     {(ing.quantity * ing.unitPrice).toFixed(2)} €
                                   </span>
                                   <button onClick={() => removeIngredient(ing.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                </div>
                             </div>
                           ))}
                           {editRecipe.ingredients.length === 0 && (
                             <div className="text-center py-10 opacity-40">
                                <Utensils size={40} className="mx-auto mb-2"/>
                                <p className="text-xs font-bold">Aucun ingrédient</p>
                             </div>
                           )}
                        </div>
                     </div>

                     {/* Footer Stats */}
                     <div className={`p-6 border-t ${userSettings.darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                           <div>
                              <p className="text-[9px] font-black uppercase text-slate-400">Coût Matière Brut</p>
                              <p className="text-lg font-bold text-slate-900 dark:text-white">{recipeCosts.rawCost.toFixed(2)} €</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black uppercase text-amber-500 flex items-center gap-1"><AlertCircle size={10}/> Pertes (10%)</p>
                              <p className="text-lg font-bold text-amber-600">{recipeCosts.waste.toFixed(2)} €</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black uppercase text-slate-400">Coût de Revient Total</p>
                              <p className="text-lg font-black text-slate-900 dark:text-white">{recipeCosts.totalCost.toFixed(2)} €</p>
                           </div>
                           <div className="bg-violet-600 rounded-xl p-3 text-white shadow-lg text-center transform scale-110 -mt-2">
                              <p className="text-[9px] font-black uppercase opacity-80">Prix Conseillé TTC</p>
                              <p className="text-2xl font-black">{recipeCosts.recommendedPrice.toFixed(2)} €</p>
                           </div>
                        </div>
                     </div>
                   </>
                 ) : (
                   <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                      <ChefHat size={64} className="mb-4 text-slate-400"/>
                      <p className="text-xl font-black text-slate-500">Sélectionnez ou créez une recette</p>
                   </div>
                 )}
              </div>
           </div>
         )}

         {/* --- CATALOGUE DES RATIOS TAB --- */}
         {activeTab === 'catalog' && (
           <div className="h-full flex flex-col space-y-4">
              
              {/* Controls */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                 <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                    <div className="relative w-full md:w-64">
                       <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
                       <input 
                         type="text" 
                         placeholder="Rechercher produit..." 
                         value={catalogSearch}
                         onChange={(e) => setCatalogSearch(e.target.value)}
                         className="w-full bg-slate-50 dark:bg-slate-900 pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
                       />
                    </div>
                    <div className="relative group">
                       <button className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500 hover:text-indigo-500 transition-colors border border-transparent hover:border-indigo-200">
                          <Filter size={16}/>
                       </button>
                       {/* Dropdown Filters */}
                       <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-20 hidden group-hover:block">
                          <div 
                            onClick={() => setActiveCatalogFilter('ALL')}
                            className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-xs font-bold border-b border-slate-50 dark:border-slate-700"
                          >
                             Tout voir
                          </div>
                          {customCategories.map(cat => (
                            <div 
                              key={cat}
                              onClick={() => setActiveCatalogFilter(cat)}
                              className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 flex justify-between items-center"
                            >
                               {cat}
                               {activeCatalogFilter === cat && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => setIsManagingCats(true)} 
                      className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                       <Settings size={14}/> Gérer Catégories
                    </button>
                    <button 
                      onClick={handleAddRatioItem}
                      className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 transition-colors"
                    >
                       <Plus size={14}/> Ajouter Produit
                    </button>
                 </div>
              </div>

              {/* Table */}
              <div className={`flex-1 rounded-[32px] border overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                       <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400">
                          <tr>
                             <th className="py-4 px-6 text-left w-64">Produit / Article</th>
                             <th className="py-4 px-4 text-left w-40">Catégorie</th>
                             <th className="py-4 px-4 text-center w-28">Coût HT</th>
                             <th className="py-4 px-4 text-center w-28">Cible %</th>
                             <th className="py-4 px-4 text-center w-24">TVA</th>
                             <th className="py-4 px-4 text-right w-32">Prix Vente TTC</th>
                             <th className="py-4 px-4 w-16"></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {filteredRatioItems.map(item => {
                             // Dynamic Cost Calculation
                             let currentCost = item.manualCost;
                             if (item.inventoryId) {
                               const linkedInv = inventoryItems.find(i => i.id === item.inventoryId);
                               if (linkedInv) currentCost = linkedInv.unitCost;
                             }

                             // Price Calculation: Cost / (Target%/100) * (1+VAT%/100)
                             let priceHT = 0;
                             if (item.targetPercent > 0) priceHT = currentCost / (item.targetPercent / 100);
                             const priceTTC = priceHT * (1 + item.vatRate / 100);

                             return (
                               <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                  <td className="py-3 px-6">
                                     <div className="flex flex-col gap-1">
                                        <input 
                                          type="text" 
                                          value={item.name} 
                                          onChange={(e) => handleUpdateRatioItem(item.id, 'name', e.target.value)}
                                          className="font-black text-sm bg-transparent outline-none w-full border-b border-transparent focus:border-indigo-500 placeholder:text-slate-400 text-slate-900 dark:text-white transition-all"
                                          placeholder="Nom du produit (Saisie libre)"
                                        />
                                        {/* Inventory Linker */}
                                        <select 
                                          value={item.inventoryId || ''} 
                                          onChange={(e) => handleUpdateRatioItem(item.id, 'inventoryId', e.target.value)}
                                          className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 outline-none cursor-pointer rounded px-2 py-1 w-fit border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                                        >
                                           <option value="">+ Lier Stock (Auto-Update)</option>
                                           {inventoryItems.map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.unitCost}€)</option>)}
                                        </select>
                                     </div>
                                  </td>
                                  <td className="py-3 px-4">
                                     <select 
                                       value={item.category}
                                       onChange={(e) => handleUpdateRatioItem(item.id, 'category', e.target.value)}
                                       className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs font-black text-slate-900 dark:text-white outline-none w-full shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                                     >
                                        {customCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                     </select>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                     {item.inventoryId ? (
                                       <div className="flex flex-col items-center justify-center">
                                          <span className="font-black text-slate-900 dark:text-white text-sm">
                                             {currentCost.toFixed(2)} €
                                          </span>
                                          <span className="text-[8px] font-black uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                             LINK
                                          </span>
                                       </div>
                                     ) : (
                                       <div className="relative">
                                          <input 
                                            type="number" 
                                            value={item.manualCost} 
                                            onChange={(e) => handleUpdateRatioItem(item.id, 'manualCost', parseFloat(e.target.value))}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg py-1.5 text-center font-black text-slate-900 dark:text-white outline-none shadow-sm focus:border-indigo-500"
                                            placeholder="0.00"
                                          />
                                          <span className="absolute right-8 top-1.5 text-[9px] font-bold text-slate-400 pointer-events-none">€</span>
                                       </div>
                                     )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                     <div className="relative w-20 mx-auto">
                                        <input 
                                          type="number" 
                                          value={item.targetPercent} 
                                          onChange={(e) => handleUpdateRatioItem(item.id, 'targetPercent', parseFloat(e.target.value))}
                                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg py-1.5 text-center font-black text-slate-900 dark:text-white outline-none shadow-sm focus:border-indigo-500"
                                        />
                                        <span className="absolute right-2 top-2 text-[9px] font-black text-indigo-300">%</span>
                                     </div>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                     <select 
                                       value={item.vatRate} 
                                       onChange={(e) => handleUpdateRatioItem(item.id, 'vatRate', parseFloat(e.target.value))}
                                       className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg py-1.5 px-1 text-xs font-black text-slate-900 dark:text-white outline-none text-center shadow-sm w-full"
                                     >
                                        <option value="5.5">5.5%</option>
                                        <option value="10">10%</option>
                                        <option value="20">20%</option>
                                     </select>
                                  </td>
                                  <td className="py-3 px-6 text-right">
                                     <span className="text-lg font-black text-slate-900 dark:text-white">{priceTTC.toFixed(2)} €</span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                     <button onClick={() => handleDeleteRatioItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 size={16}/>
                                     </button>
                                  </td>
                               </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
                 {filteredRatioItems.length === 0 && (
                   <div className="text-center py-12 opacity-50">
                      <p className="text-sm font-bold text-slate-400">Aucun produit dans le catalogue.</p>
                   </div>
                 )}
              </div>

              {/* Category Manager Modal */}
              {isManagingCats && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                   <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
                      <div className="flex justify-between items-center mb-4">
                         <h3 className="font-black text-lg">Gérer les catégories</h3>
                         <button onClick={() => setIsManagingCats(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={16}/></button>
                      </div>
                      
                      <div className="flex gap-2 mb-4">
                         <input 
                           type="text" 
                           placeholder="Nouvelle catégorie..." 
                           value={newCatName}
                           onChange={(e) => setNewCatName(e.target.value)}
                           className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2 text-sm font-bold outline-none text-slate-900 dark:text-white"
                         />
                         <button onClick={handleAddCategory} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase">Ajouter</button>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                         {customCategories.map(cat => (
                           <div key={cat} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                              <span className="font-bold text-sm">{cat}</span>
                              <button onClick={() => handleDeleteCategory(cat)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              )}

           </div>
         )}

      </div>
    </div>
  );
};

export default KitchenEngineeringView;