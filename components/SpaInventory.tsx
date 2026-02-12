import React, { useState, useMemo } from 'react';
import {
    ClipboardList, Plus, Search, Archive, ChevronDown,
    Trash2, Filter, Save, Droplets, Shirt, Sparkles, SprayCan, AlertTriangle
} from 'lucide-react';
import { UserSettings, SpaInventoryItem, SpaInventoryCategory } from '../types';

interface SpaInventoryProps {
    userSettings: UserSettings;
    inventory: SpaInventoryItem[];
    onUpdateInventory: (items: SpaInventoryItem[]) => void;
}

const CATEGORIES: { id: SpaInventoryCategory, icon: any, color: string }[] = [
    { id: 'Huiles & Crèmes', icon: Droplets, color: 'bg-amber-500' },
    { id: 'Linge', icon: Shirt, color: 'bg-blue-500' },
    { id: 'Consommables', icon: Sparkles, color: 'bg-purple-500' },
    { id: 'Entretien', icon: SprayCan, color: 'bg-emerald-500' },
];

const SpaInventory: React.FC<SpaInventoryProps> = ({ userSettings, inventory, onUpdateInventory }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

    const filteredItems = useMemo(() => {
        return inventory.filter(i => {
            const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'ALL' || i.category === categoryFilter;
            return matchesSearch && matchesCategory;
        }).sort((a, b) => a.category.localeCompare(b.category));
    }, [inventory, searchTerm, categoryFilter]);

    const handleUpdateItem = (id: string, field: keyof SpaInventoryItem, value: any) => {
        const updated = inventory.map(i => i.id === id ? { ...i, [field]: value } : i);
        onUpdateInventory(updated);
    };

    const handleAddItem = () => {
        const newItem: SpaInventoryItem = {
            id: `spa-inv-${Date.now()}`,
            name: 'Nouveau Produit',
            category: categoryFilter !== 'ALL' ? categoryFilter as SpaInventoryCategory : 'Huiles & Crèmes',
            quantity: 0,
            minQuantity: 5,
            unit: 'pièce',
            unitCost: 0,
            updatedAt: new Date().toISOString()
        };
        onUpdateInventory([...inventory, newItem]);
    };

    const handleDeleteItem = (id: string) => {
        if (window.confirm("Supprimer ce produit ?")) {
            onUpdateInventory(inventory.filter(i => i.id !== id));
        }
    };

    // Group by category
    const groupedItems = useMemo(() => {
        const groups: Record<string, SpaInventoryItem[]> = {};
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

    return (
        <div className={`h-full flex flex-col animate-in fade-in ${userSettings.darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>

            {/* TOOLBAR */}
            <div className={`px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b ${userSettings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

                <div className="flex flex-1 gap-3 w-full md:w-auto">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 w-full md:w-64 border border-transparent focus-within:border-violet-500 transition-colors">
                        <Search size={16} className="text-slate-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Rechercher produit..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent outline-none text-xs font-bold w-full"
                        />
                    </div>

                    <div className="relative min-w-[150px]">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl w-full">
                            <Filter size={14} className="text-slate-400 mr-2" />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold outline-none w-full appearance-none cursor-pointer"
                            >
                                <option value="ALL">Toutes catégories</option>
                                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                            </select>
                            <ChevronDown size={12} className="text-slate-400 ml-1" />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleAddItem}
                    className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-violet-700 transition-colors shadow-lg"
                >
                    <Plus size={16} /> Ajouter Produit
                </button>
            </div>

            {/* LIST */}
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-20 no-scrollbar space-y-8">
                {Object.keys(groupedItems).map(catId => {
                    const items = groupedItems[catId];
                    if (items.length === 0) return null;
                    const catConfig = CATEGORIES.find(c => c.id === catId);

                    return (
                        <div key={catId} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${catConfig?.color} text-white`}>
                                    {catConfig && <catConfig.icon size={12} />}
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{catId}</h3>
                            </div>

                            <div className={`rounded-2xl border overflow-hidden ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                {/* Header Desktop */}
                                <div className="hidden md:grid grid-cols-12 gap-4 p-4 text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <div className="col-span-3">Nom du Produit</div>
                                    <div className="col-span-2 text-center">Quantité</div>
                                    <div className="col-span-1 text-center">Unité</div>
                                    <div className="col-span-2 text-center">Prix Unit. (€)</div>
                                    <div className="col-span-2 text-center">Valeur Stock</div>
                                    <div className="col-span-1 text-center">Alerte</div>
                                    <div className="col-span-1 text-right">Actions</div>
                                </div>

                                {/* Items */}
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {items.map(item => (
                                        <div key={item.id} className="p-4 md:grid md:grid-cols-12 md:gap-4 md:items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

                                            <div className="col-span-3 mb-3 md:mb-0">
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                                    className="w-full bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-violet-500 placeholder:text-slate-400"
                                                    placeholder="Nom du produit"
                                                />
                                            </div>

                                            <div className="col-span-2 flex justify-center mb-3 md:mb-0">
                                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                                                    <button onClick={() => handleUpdateItem(item.id, 'quantity', Math.max(0, item.quantity - 1))} className="p-1 hover:text-violet-500"><ChevronDown size={14} /></button>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                        className={`w-12 text-center bg-transparent font-black ${item.quantity <= item.minQuantity ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'} outline-none`}
                                                    />
                                                    <button onClick={() => handleUpdateItem(item.id, 'quantity', item.quantity + 1)} className="p-1 hover:text-violet-500"><Plus size={14} /></button>
                                                </div>
                                            </div>

                                            <div className="col-span-1 flex justify-center mb-3 md:mb-0">
                                                <input
                                                    type="text"
                                                    value={item.unit}
                                                    onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                                                    className="w-16 text-center bg-transparent text-xs font-medium text-slate-500 outline-none border-b border-dashed border-slate-300 focus:border-violet-500"
                                                />
                                            </div>

                                            <div className="col-span-2 flex justify-center mb-3 md:mb-0">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.unitCost || 0}
                                                    onChange={(e) => handleUpdateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                                                    className="w-20 text-center bg-transparent text-xs font-bold outline-none border-b border-dashed border-slate-300 focus:border-violet-500"
                                                    placeholder="0.00"
                                                />
                                            </div>

                                            <div className="col-span-2 text-center mb-3 md:mb-0">
                                                <span className="text-xs font-bold text-slate-500">
                                                    {((item.quantity || 0) * (item.unitCost || 0)).toFixed(2)} €
                                                </span>
                                            </div>

                                            <div className="col-span-1 flex justify-center items-center gap-2 mb-3 md:mb-0">
                                                <input
                                                    type="number"
                                                    value={item.minQuantity}
                                                    onChange={(e) => handleUpdateItem(item.id, 'minQuantity', parseInt(e.target.value) || 0)}
                                                    className="w-12 text-center bg-transparent text-xs font-medium text-slate-400 outline-none border-b border-dashed border-slate-300 focus:border-violet-500"
                                                />
                                                {item.quantity <= item.minQuantity && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                                            </div>

                                            <div className="col-span-1 text-right">
                                                <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredItems.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <ClipboardList size={40} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-bold text-slate-400">Aucun produit trouvé.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SpaInventory;
