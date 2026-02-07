import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { X, Send, Sparkles, Loader2, Bot, User } from 'lucide-react';
import { UserSettings, Task, Contact, Room, MonthlyInventory, MaintenanceTicket } from '../types';

interface AiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  userSettings: UserSettings;
  // Données réelles optionnelles (pour éviter les crashs si non passées)
  tasks?: Task[];
  contacts?: Contact[];
  rooms?: Room[];
  inventory?: Record<string, MonthlyInventory>;
  maintenance?: MaintenanceTicket[];
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ 
  isOpen, onClose, userSettings, 
  tasks = [], 
  contacts = [], 
  rooms = [], 
  inventory = {}, 
  maintenance = [] 
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Bonjour ! Je suis votre assistant. Je suis connecté aux données de l'hôtel. Demandez-moi : 'État du stock', 'Combien de tâches ?' ou 'Taux d'occupation'.",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // FONCTION D'ANALYSE LOCALE (DETERMINISTE & RAPIDE)
  const analyzeLocalData = (query: string): string | null => {
    const lower = query.toLowerCase();

    // 1. INVENTAIRE / STOCK
    if (lower.includes('stock') || lower.includes('inventaire') || lower.includes('article')) {
      const currentMonthKey = Object.keys(inventory || {}).sort().reverse()[0];
      if (!currentMonthKey) return "Aucun inventaire trouvé.";
      
      const items = inventory[currentMonthKey]?.items || [];
      const totalItems = items.length;
      const totalValue = items.reduce((acc, item) => acc + (item.currentQty * item.unitCost), 0);
      const lowStock = items.filter(i => i.currentQty < 5).length;

      return `📦 **Inventaire (${currentMonthKey})** :\n- ${totalItems} références enregistrées.\n- Valeur totale : ${totalValue.toFixed(2)} €.\n- ${lowStock} articles en stock faible (< 5).`;
    }

    // 2. TACHES / MAINTENANCE
    if (lower.includes('tâche') || lower.includes('ticket') || lower.includes('maintenance')) {
      const openTasks = tasks.filter(t => !t.done).length;
      const urgentTasks = tasks.filter(t => !t.done && t.priority === 'High').length;
      const openTickets = maintenance.filter(t => t.status !== 'resolved').length;

      return `📋 **Plan d'action & Technique** :\n- ${openTasks} tâches à faire (dont ${urgentTasks} urgentes).\n- ${openTickets} tickets de maintenance en cours.`;
    }

    // 3. CHAMBRES / MENAGE
    if (lower.includes('chambre') || lower.includes('ménage') || lower.includes('propre')) {
      const total = rooms.length;
      const clean = rooms.filter(r => r.statusHK === 'ready').length;
      const dirty = rooms.filter(r => r.statusHK === 'not_started').length;
      const progress = rooms.filter(r => r.statusHK === 'in_progress').length;

      return `🛏 **État des Lieux** :\n- Total : ${total} chambres.\n- Prêtes : ${clean} ✅\n- À faire : ${dirty} ❌\n- En cours : ${progress} ⏳`;
    }

    // 4. CONTACTS / VIP
    if (lower.includes('contact') || lower.includes('client') || lower.includes('vip')) {
      const total = contacts.length;
      const vips = contacts.filter(c => c.vip).length;
      const inHouse = contacts.filter(c => c.status === 'In House').length;

      return `👥 **Base Clients** :\n- ${total} contacts enregistrés.\n- ${vips} VIPs identifiés.\n- ${inHouse} clients actuellement en maison (statut 'In House').`;
    }

    return null; // Pas de correspondance locale -> Appel API
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // 1. TENTATIVE D'ANALYSE LOCALE D'ABORD
    const localResponse = analyzeLocalData(input);
    
    if (localResponse) {
        // Réponse instantanée sans API
        const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: localResponse,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        setIsLoading(false);
        return;
    }

    // 2. SINON : APPEL API (Si clé configurée, sinon message défaut)
    try {
      if (!process.env.API_KEY) {
         throw new Error("Pas de clé API configurée.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Contexte allégé pour l'IA (éviter d'envoyer trop de données)
      const contextSummary = {
         tasksCount: tasks.length,
         roomsReady: rooms.filter(r => r.statusHK === 'ready').length,
         contactsCount: contacts.length
      };

      const systemPrompt = `Tu es un assistant hôtelier. Réponds brièvement. Contexte : ${JSON.stringify(contextSummary)}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + "\n\n" + input }] }
        ]
      });

      const textResponse = response.text || "Je n'ai pas compris.";

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: textResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.warn("IA non disponible ou erreur:", error);
      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Je n'ai pas trouvé l'information précise dans mes données locales. Essayez des mots-clés comme 'stock', 'chambres' ou 'tâches'.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[190] bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className={`fixed inset-y-0 right-0 z-[200] w-full md:w-[450px] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${userSettings.darkMode ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-slate-100'}`}>
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Sparkles size={20} className="text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">HotelOS Genius</h2>
              <p className="text-[10px] font-medium opacity-80 uppercase tracking-widest">Assistant Données</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
          {messages.map((msg) => {
            const isModel = msg.role === 'model';
            return (
              <div key={msg.id} className={`flex gap-3 ${isModel ? 'justify-start' : 'justify-end'}`}>
                {isModel && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-md mt-1">
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                  isModel 
                    ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none' 
                    : 'bg-indigo-600 text-white rounded-tr-none'
                }`}>
                  {msg.text}
                </div>
                {!isModel && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                    <User size={16} className="text-slate-500" />
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="flex gap-3 justify-start">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-md">
                  <Bot size={16} className="text-white" />
               </div>
               <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 rounded-tl-none shadow-sm flex items-center gap-2 text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-bold">Analyse en cours...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
           <div className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Interroger les données..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-transparent focus:border-indigo-500 border-2 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white transition-all"
                autoFocus
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-lg transition-all active:scale-95"
              >
                <Send size={20} />
              </button>
           </div>
           <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['État du stock', 'Combien de tâches ?', 'Chambres propres ?', 'Liste VIP'].map(suggestion => (
                <button 
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors whitespace-nowrap"
                >
                  {suggestion}
                </button>
              ))}
           </div>
        </div>

      </div>
    </>
  );
};

export default AiAssistant;