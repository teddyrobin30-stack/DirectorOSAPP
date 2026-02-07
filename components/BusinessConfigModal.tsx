
import React, { useState } from 'react';
import { X, Building, CreditCard, Box, Plus, Trash2, Save, FileText, MapPin, Clock } from 'lucide-react';
import { BusinessConfig, CatalogItem, Venue, UserSettings } from '../types';

interface BusinessConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BusinessConfig;
  catalog: CatalogItem[];
  venues: Venue[];
  onSaveConfig: (config: BusinessConfig) => void;
  onSaveCatalog: (catalog: CatalogItem[]) => void;
  onSaveVenues: (venues: Venue[]) => void;
  userSettings: UserSettings;
}

const BusinessConfigModal: React.FC<BusinessConfigModalProps> = ({ 
  isOpen, onClose, config, catalog, venues, onSaveConfig, onSaveCatalog, onSaveVenues, userSettings 
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'catalog' | 'venues'>('info');
  const [localConfig, setLocalConfig] = useState<BusinessConfig>(config);
  const [localCatalog, setLocalCatalog] = useState<CatalogItem[]>(catalog);
  const [localVenues, setLocalVenues] = useState<Venue[]>(venues || []);

  if (!isOpen) return null;

  const handleConfigChange = (field: keyof BusinessConfig, value: string) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleCatalogChange = (id: string, field: keyof CatalogItem, value: any) => {
    setLocalCatalog(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleVenueChange = (id: string, field: keyof Venue, value: any) => {
    setLocalVenues(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addCatalogItem = () => {
    setLocalCatalog([...localCatalog, { 
      id: Date.now().toString(), 
      name: 'Nouveau Produit', 
      defaultPrice: 0, 
      defaultVat: 20,
      technicalDescription: ''
    }]);
  };

  const addVenue = () => {
    setLocalVenues([...localVenues, {
      id: Date.now().toString(),
      name: 'Nouvelle Salle',
      capacity: 10,
      type: 'Salle de réunion'
    }]);
  };

  const removeCatalogItem = (id: string) => {
    setLocalCatalog(prev => prev.filter(item => item.id !== id));
  };

  const removeVenue = (id: string) => {
    setLocalVenues(prev => prev.filter(item => item.id !== id));
  };

  const saveAll = () => {
    onSaveConfig(localConfig);
    onSaveCatalog(localCatalog);
    onSaveVenues(localVenues);
    onClose();
  };

  const themeHex = `text-${userSettings.themeColor}-600`;
  const themeBg = `bg-${userSettings.themeColor}-600`;

  return (
    <div className="fixed inset-0 z-[150] bg-black/70 flex items-center justify-center animate-in fade-in backdrop-blur-sm">
      <div className={`w-full max-w-2xl rounded-[32px] mx-4 p-6 pb-8 shadow-2xl flex flex-col max-h-[90vh] ${userSettings.darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
           <div className="flex items-center gap-3">
             <div className={`p-3 rounded-2xl ${userSettings.darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
               <Building size={24} className={themeHex} />
             </div>
             <div>
               <h2 className="text-xl font-black">Configuration Business</h2>
               <p className="text-xs text-slate-400 font-bold">Infos légales, Lieux & Catalogue</p>
             </div>
           </div>
           <button onClick={onClose} className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200"><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-6 shrink-0 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'info' ? 'bg-white dark:bg-slate-700 shadow-sm ' + themeHex : 'text-slate-400'}`}
          >
            <FileText size={14} /> Infos Légales
          </button>
          <button 
            onClick={() => setActiveTab('venues')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'venues' ? 'bg-white dark:bg-slate-700 shadow-sm ' + themeHex : 'text-slate-400'}`}
          >
            <MapPin size={14} /> Lieux
          </button>
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'catalog' ? 'bg-white dark:bg-slate-700 shadow-sm ' + themeHex : 'text-slate-400'}`}
          >
            <Box size={14} /> Catalogue
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-1">
          {activeTab === 'info' ? (
            <div className="space-y-6">
              {/* Identity */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Identité Entreprise</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <input type="text" placeholder="Nom de l'entreprise" value={localConfig.companyName} onChange={(e) => handleConfigChange('companyName', e.target.value)} className={`p-4 rounded-2xl font-bold text-sm outline-none border-2 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-transparent focus:border-indigo-200'}`} />
                   <input type="text" placeholder="SIRET" value={localConfig.siret} onChange={(e) => handleConfigChange('siret', e.target.value)} className={`p-4 rounded-2xl font-bold text-sm outline-none border-2 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-transparent focus:border-indigo-200'}`} />
                </div>
                <input type="text" placeholder="Adresse complète" value={localConfig.address} onChange={(e) => handleConfigChange('address', e.target.value)} className={`w-full p-4 rounded-2xl font-bold text-sm outline-none border-2 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-transparent focus:border-indigo-200'}`} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <input type="text" placeholder="TVA Intracom." value={localConfig.vatNumber} onChange={(e) => handleConfigChange('vatNumber', e.target.value)} className={`p-4 rounded-2xl font-bold text-sm outline-none border-2 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-transparent focus:border-indigo-200'}`} />
                   <input type="email" placeholder="Email Contact Facturation" value={localConfig.email} onChange={(e) => handleConfigChange('email', e.target.value)} className={`p-4 rounded-2xl font-bold text-sm outline-none border-2 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-transparent focus:border-indigo-200'}`} />
                </div>
              </div>

              {/* Bank */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Coordonnées Bancaires</h3>
                <input type="text" placeholder="Nom de la Banque" value={localConfig.bankName} onChange={(e) => handleConfigChange('bankName', e.target.value)} className={`w-full p-4 rounded-2xl font-bold text-sm outline-none border-2 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-transparent focus:border-indigo-200'}`} />
                <div className="grid grid-cols-3 gap-3">
                   <input type="text" placeholder="IBAN" value={localConfig.iban} onChange={(e) => handleConfigChange('iban', e.target.value)} className={`col-span-2 p-4 rounded-2xl font-bold text-sm outline-none border-2 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-transparent focus:border-indigo-200'}`} />
                   <input type="text" placeholder="BIC" value={localConfig.bic} onChange={(e) => handleConfigChange('bic', e.target.value)} className={`col-span-1 p-4 rounded-2xl font-bold text-sm outline-none border-2 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-transparent focus:border-indigo-200'}`} />
                </div>
              </div>
            </div>
          ) : activeTab === 'venues' ? (
            <div className="space-y-4">
               <div className="flex justify-between items-center px-1">
                 <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Salles & Lieux</h3>
                 <button onClick={addVenue} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${themeBg} text-white`}>
                   <Plus size={12}/> Ajouter Lieu
                 </button>
               </div>
               
               <div className="space-y-2">
                 {localVenues.map(item => (
                   <div key={item.id} className={`p-3 rounded-2xl border flex items-center gap-3 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                      <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500`}>
                        <MapPin size={18}/>
                      </div>
                      <div className="flex-1 space-y-1">
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={(e) => handleVenueChange(item.id, 'name', e.target.value)}
                          placeholder="Nom de la salle"
                          className="bg-transparent font-bold text-sm outline-none w-full"
                        />
                        <div className="flex gap-2">
                           <input 
                            type="text" 
                            value={item.type} 
                            onChange={(e) => handleVenueChange(item.id, 'type', e.target.value)}
                            placeholder="Type (Réunion...)"
                            className="bg-transparent text-[10px] font-medium outline-none text-slate-400 w-24"
                           />
                           <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded px-1.5">
                             <span className="text-[9px] text-slate-400">Cap.</span>
                             <input 
                              type="number" 
                              value={item.capacity} 
                              onChange={(e) => handleVenueChange(item.id, 'capacity', parseInt(e.target.value) || 0)}
                              className="bg-transparent text-[10px] font-bold outline-none w-8 text-center"
                             />
                           </div>
                        </div>
                      </div>
                      <button onClick={() => removeVenue(item.id)} className="p-2 text-slate-300 hover:text-red-500">
                        <Trash2 size={16}/>
                      </button>
                   </div>
                 ))}
                 {localVenues.length === 0 && (
                   <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                     <p className="text-slate-400 text-xs font-bold">Aucun lieu configuré.</p>
                   </div>
                 )}
               </div>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="flex justify-between items-center px-1">
                 <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Articles & Prestations</h3>
                 <button onClick={addCatalogItem} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${themeBg} text-white`}>
                   <Plus size={12}/> Ajouter Article
                 </button>
               </div>
               
               <div className="space-y-2">
                 {localCatalog.map(item => (
                   <div key={item.id} className={`p-3 rounded-2xl border flex flex-col gap-3 ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                      <div className="flex gap-3 items-center">
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={(e) => handleCatalogChange(item.id, 'name', e.target.value)}
                          placeholder="Nom du produit"
                          className="bg-transparent font-bold text-sm outline-none flex-1"
                        />
                        <button onClick={() => removeCatalogItem(item.id)} className="p-2 text-slate-300 hover:text-red-500">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1.5 flex-1">
                           <span className="text-[9px] uppercase text-slate-400">Prix €</span>
                           <input 
                            type="number" 
                            value={item.defaultPrice} 
                            onChange={(e) => handleCatalogChange(item.id, 'defaultPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent text-center font-bold outline-none text-xs"
                           />
                        </div>
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1.5 flex-1">
                           <span className="text-[9px] uppercase text-slate-400">TVA %</span>
                           <input 
                            type="number" 
                            value={item.defaultVat} 
                            onChange={(e) => handleCatalogChange(item.id, 'defaultVat', parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent text-center font-bold outline-none text-xs"
                           />
                        </div>
                      </div>

                      {/* Default Venue & Time Range */}
                      <div className="flex gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl">
                         <div className="flex-1">
                           <div className="flex items-center gap-1 mb-1">
                             <MapPin size={10} className="text-slate-400" />
                             <span className="text-[9px] uppercase font-bold text-slate-400">Lieu par défaut</span>
                           </div>
                           <select 
                              value={item.defaultVenueId || ''} 
                              onChange={(e) => handleCatalogChange(item.id, 'defaultVenueId', e.target.value)}
                              className="w-full bg-transparent text-[10px] font-bold outline-none"
                           >
                             <option value="">-- Aucun --</option>
                             {localVenues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                           </select>
                         </div>
                         <div className="w-[1px] bg-slate-200 dark:bg-slate-700" />
                         <div className="flex-[1.5]">
                           <div className="flex items-center gap-1 mb-1">
                             <Clock size={10} className="text-slate-400" />
                             <span className="text-[9px] uppercase font-bold text-slate-400">Plage Horaire</span>
                           </div>
                           <div className="flex items-center gap-1">
                             <input 
                                type="time" 
                                value={item.defaultStartTime || ''} 
                                onChange={(e) => handleCatalogChange(item.id, 'defaultStartTime', e.target.value)}
                                className="bg-transparent text-[10px] font-bold outline-none w-12"
                             />
                             <span className="text-[10px] text-slate-400">-</span>
                             <input 
                                type="time" 
                                value={item.defaultEndTime || ''} 
                                onChange={(e) => handleCatalogChange(item.id, 'defaultEndTime', e.target.value)}
                                className="bg-transparent text-[10px] font-bold outline-none w-12"
                             />
                           </div>
                         </div>
                      </div>

                      <textarea 
                        placeholder="Description technique pour les équipes (ex: Boissons, Setup...)"
                        value={item.technicalDescription || ''}
                        onChange={(e) => handleCatalogChange(item.id, 'technicalDescription', e.target.value)}
                        className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-[10px] font-medium outline-none resize-none h-16"
                      />
                   </div>
                 ))}
                 {localCatalog.length === 0 && (
                   <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                     <p className="text-slate-400 text-xs font-bold">Catalogue vide.</p>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
           <button 
             onClick={saveAll}
             className={`px-8 py-4 rounded-[20px] text-white font-black uppercase tracking-widest text-xs shadow-lg flex items-center gap-2 ${themeBg}`}
           >
             <Save size={16} /> Enregistrer Configuration
           </button>
        </div>

      </div>
    </div>
  );
};

export default BusinessConfigModal;
