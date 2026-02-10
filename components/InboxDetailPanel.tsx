import React, { useState, useEffect } from 'react';
import { Save, AlertOctagon, UserCheck, Calendar as CalendarIcon, FileText, X, CheckCircle } from 'lucide-react';

// ✅ IMPORT 1 : Récupérer tes types (ajuste le chemin selon ton projet, ex: '../types')
import { ExtendedInboxItem, InboxStatus } from '../types'; 

// ✅ IMPORT 2 : Soit tu importes la fonction, soit tu la définis ici localement
// Si tu l'as mise dans un fichier 'utils.ts' ou 'crmUtils.ts', importe-la.
// Sinon, colle-la juste ici pour que ce fichier soit autonome :
const isOverdueAlert = (dateRelance?: string): boolean => {
  if (!dateRelance) return false;
  const targetDate = new Date(dateRelance);
  targetDate.setDate(targetDate.getDate() + 7); 
  return new Date() > targetDate;
};

interface InboxDetailPanelProps {
  item: ExtendedInboxItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ExtendedInboxItem) => void;
  onValidate?: (item: ExtendedInboxItem) => void; // ✅ Ajout de la prop onValidate
}

const InboxDetailPanel: React.FC<InboxDetailPanelProps> = ({ item, isOpen, onClose, onSave, onValidate }) => {
  const [formData, setFormData] = useState<Partial<ExtendedInboxItem>>({});

  // Reset du formulaire à l'ouverture
  useEffect(() => {
    if (item) {
      setFormData({
        ...item,
        statut: item.statut || 'pas_commence',
        devisEnvoye: item.devisEnvoye || false,
        responsable: item.responsable || '',
        notesInterne: item.notesInterne || '',
        dateRelance: item.dateRelance || '',
      });
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    // Merge propre et mise à jour de la date de modif
    onSave({ 
        ...item, 
        ...formData, 
        dateDerniereModification: new Date().toISOString() 
    } as ExtendedInboxItem);
    onClose();
  };

  // ✅ Fonction de validation
  const handleValidate = () => {
    if (onValidate) {
        // On passe l'item fusionné avec les dernières modifs du formulaire
        onValidate({ 
            ...item, 
            ...formData,
            dateDerniereModification: new Date().toISOString()
        } as ExtendedInboxItem);
        onClose();
    }
  };

  const isAlert = isOverdueAlert(formData.dateRelance);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-black">{item.contactName}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase">{item.companyName || 'Nouveau prospect'}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200"><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Statut & Responsable */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Statut du dossier</label>
              <select 
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold outline-none border focus:border-indigo-500"
                value={formData.statut}
                onChange={(e) => setFormData({...formData, statut: e.target.value as InboxStatus})}
              >
                <option value="pas_commence">⚪ À Traiter</option>
                <option value="en_cours">🔵 En cours</option>
                <option value="termine">🟢 Terminé / Gagné</option>
                <option value="archive">⚫ Archivé / Perdu</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Responsable</label>
              <div className="relative">
                <UserCheck size={14} className="absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="text" 
                  className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold outline-none"
                  placeholder="Nom..."
                  value={formData.responsable}
                  onChange={(e) => setFormData({...formData, responsable: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Date Relance & Alerte */}
          <div className={`p-4 rounded-2xl border transition-colors ${isAlert ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-slate-50 border-transparent dark:bg-slate-800'}`}>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                <CalendarIcon size={12}/> Date de Relance
              </label>
              {isAlert && <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1"><AlertOctagon size={10}/> ALERTE J+7</span>}
            </div>
            <input 
              type="date" 
              className="w-full bg-transparent font-bold text-sm outline-none"
              value={formData.dateRelance ? formData.dateRelance.split('T')[0] : ''}
              onChange={(e) => setFormData({...formData, dateRelance: e.target.value})}
            />
          </div>

          {/* Toggle Devis */}
          <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <span className="text-sm font-bold flex items-center gap-2"><FileText size={16}/> Devis envoyé au client ?</span>
            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.devisEnvoye ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${formData.devisEnvoye ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
            <input type="checkbox" className="hidden" checked={formData.devisEnvoye} onChange={(e) => setFormData({...formData, devisEnvoye: e.target.checked})} />
          </label>

          {/* Notes Internes */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Notes de suivi interne</label>
            <textarea 
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-medium outline-none h-32 resize-none"
              placeholder="Historique des appels, points de blocage..."
              value={formData.notesInterne}
              onChange={(e) => setFormData({...formData, notesInterne: e.target.value})}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-[32px] flex flex-col gap-3">
            
            {/* ✅ BOUTON VALIDER (PIPELINE) */}
            {onValidate && (
                <button 
                    onClick={handleValidate}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                    <CheckCircle size={16} /> Valider & Créer Dossier
                </button>
            )}

            {/* BOUTON SAUVEGARDER (SIMPLE) */}
            <button 
                onClick={handleSave}
                className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-colors"
            >
                <Save size={16} /> Sauvegarder sans valider
            </button>
        </div>
      </div>
    </div>
  );
};

export default InboxDetailPanel;