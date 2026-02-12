import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Loader2, Bot, User, Mic, Volume2, VolumeX, Lightbulb, Zap } from 'lucide-react';
import { UserSettings, Task, Contact, Room, MonthlyInventory, MaintenanceTicket, CalendarEvent } from '../types';
import { useNavigate } from 'react-router-dom';

interface AiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  userSettings: UserSettings;
  // Données
  tasks?: Task[];
  contacts?: Contact[];
  rooms?: Room[];
  inventory?: Record<string, MonthlyInventory>;
  maintenance?: MaintenanceTicket[];
  // Actions
  onAddTask?: (text: string) => void;
  onAddEvent?: (details: { title: string, date?: string, time?: string }) => void;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  action?: string; // Pour afficher une info "Action effectuée"
}

// --- KNOWLEDGE BASE LOCALE ---
const KNOWLEDGE_BASE = [
  { keywords: ['facture', 'créer facture'], answer: "Pour créer une facture : 1. Allez dans 'Clients'. 2. Sélectionnez un client. 3. Cliquez sur 'Nouvelle Facture'." },
  { keywords: ['logo', 'changer logo'], answer: "Pour changer le logo : Allez dans Paramètres > Apparence > Logo." },
  { keywords: ['wifi', 'code wifi'], answer: "Le code WiFi invité est : HOTE_2024. Le WiFi Staff est : STAFF_SECURE." },
];

const AiAssistant: React.FC<AiAssistantProps> = ({
  isOpen, onClose, userSettings,
  tasks = [], contacts = [], rooms = [], inventory = {}, maintenance = [],
  onAddTask, onAddEvent
}) => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Bonjour ! Je suis Genius 2.0. Je peux gérer vos tâches, créer des rendez-vous ou vous guider. Dites 'Ajoute une tâche rappeler Marc' ou 'Ouvre le planning'.",
      timestamp: new Date()
    }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- SPEECH RECOGNITION SETUP ---
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript); // Auto-send on voice end
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if (!isSpeaking || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  };

  // --- BRAIN ENGINE 2.0 (REGEX & INTENT) ---
  const processUserCommand = (text: string): { response: string, action?: string } => {
    const lower = text.toLowerCase();

    // 1. ACTION : CRÉATION TÂCHE
    if (lower.startsWith('ajoute une tâche') || lower.startsWith('nouvelle tâche') || lower.startsWith('rappelle-moi de')) {
      const taskContent = text.replace(/ajoute une tâche|nouvelle tâche|rappelle-moi de/yi, '').trim();
      if (taskContent && onAddTask) {
        onAddTask(taskContent); // -> Private Task
        return { response: `C'est noté. J'ai ajouté la tâche : "${taskContent}" à votre liste privée.`, action: '✅ Tâche créée' };
      }
      return { response: "Quelle est la tâche à ajouter ?" };
    }

    // 2. ACTION : NAVIGATION
    if (lower.includes('aller à') || lower.includes('ouvre') || lower.includes('va dans')) {
      if (lower.includes('planning') || lower.includes('agenda')) { navigate('/agenda'); return { response: "Ouverture de l'agenda...", action: '🚀 Redirection' }; }
      if (lower.includes('tâches') || lower.includes('todo')) { navigate('/todo'); return { response: "Ouverture de vos tâches...", action: '🚀 Redirection' }; }
      if (lower.includes('stock') || lower.includes('inventaire')) { navigate('/fnb/inventory'); return { response: "Voici les stocks...", action: '🚀 Redirection' }; }
      if (lower.includes('spa')) { navigate('/spa'); return { response: "Ouverture du Spa...", action: '🚀 Redirection' }; }
      if (lower.includes('paramètres')) { navigate('/settings'); return { response: "Ouverture des paramètres...", action: '🚀 Redirection' }; }
    }

    // 3. ACTION : RDV (Simple parsing for now)
    if (lower.includes('rendez-vous') || lower.includes('réunion')) {
      // We could parse date here, for now just open modal or add generic
      if (onAddEvent) onAddEvent({ title: "Nouveau Rendez-vous", date: new Date().toISOString() });
      return { response: "J'ouvre la création d'événement.", action: '📅 Ouvre Modal' };
    }

    // 4. DATA ANALYSIS (Existing logic kept)
    if (lower.includes('stock')) {
      const currentMonthKey = Object.keys(inventory || {}).sort().reverse()[0];
      const items = inventory[currentMonthKey]?.items || [];
      return { response: `Il y a ${items.length} références en stock ce mois-ci.` };
    }

    // 5. KNOWLEDGE BASE (FAQ)
    const kbMatch = KNOWLEDGE_BASE.find(k => k.keywords.some(kw => lower.includes(kw)));
    if (kbMatch) return { response: kbMatch.answer, action: '💡 Astuce' };

    // Default (Fallthrough to API ideally, but local only requested)
    return { response: "Je n'ai pas compris cette commande. Essayez 'Ajoute une tâche', 'Ouvre le planning' ou 'Code WiFi'." };
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    // User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Brain Processing
    const { response, action } = processUserCommand(textToSend);

    // Bot Response
    setTimeout(() => {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: new Date(),
        action
      };
      setMessages(prev => [...prev, botMsg]);
      speak(response);
    }, 600);
  };

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[190] bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 z-[200] w-full md:w-[450px] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${userSettings.darkMode ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-slate-100'}`}>

        {/* Header Futuristic */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 text-white relative overflow-hidden">
          {/* Sound Wave Animation (CSS only visual for now) */}
          {isListening && (
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="flex gap-1 h-10 items-center">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-2 bg-indigo-500 rounded-full animate-bounce" style={{ height: `${Math.random() * 100}%`, animationDuration: '0.5s' }} />)}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 z-10">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 ${isListening ? 'animate-pulse' : ''}`}>
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter">Genius 2.0</h2>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`}></span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{isListening ? 'ÉCOUTE...' : 'ONLINE'}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 z-10">
            <button onClick={() => setIsSpeaking(!isSpeaking)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
              {isSpeaking ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-slate-950">
          {messages.map((msg) => {
            const isModel = msg.role === 'model';
            return (
              <div key={msg.id} className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
                <div className={`flex gap-3 max-w-[90%] ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
                  {isModel && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles size={14} className="text-indigo-500" />
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${isModel
                      ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
                      : 'bg-indigo-600 text-white rounded-tr-none'
                    }`}>
                    {msg.text}
                    {msg.action && (
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase tracking-wide">
                        <Zap size={12} /> {msg.action}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-bold mt-1 px-12">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 pb-2 bg-slate-50 dark:bg-slate-950 overflow-x-auto no-scrollbar flex gap-2">
          {[
            { icon: '📝', text: 'Ajoute une tâche' },
            { icon: '📅', text: 'Ouvre agenda' },
            { icon: '📦', text: 'État du stock' },
            { icon: '💡', text: 'Comment créer une facture ?' }
          ].map((chip) => (
            <button
              key={chip.text}
              onClick={() => handleSend(chip.text)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-xs font-bold hover:border-indigo-500 hover:text-indigo-500 transition-colors whitespace-nowrap"
            >
              <span>{chip.icon}</span> {chip.text}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-2 items-center">
            <button
              onClick={toggleListening}
              className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-red-500/50 shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              <Mic size={20} />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isListening ? "Je vous écoute..." : "Ecrivez une commande..."}
                className="w-full bg-slate-100 dark:bg-slate-800 border-transparent focus:border-indigo-500 border-2 rounded-xl pl-4 pr-12 py-3 text-sm font-bold outline-none dark:text-white transition-all"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default AiAssistant;