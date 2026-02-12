import React, { useState } from 'react';
import { MessageSquare, Users, Settings, ChefHat, Wrench, Send } from 'lucide-react';

interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    time: string;
    isMe?: boolean;
}

const CHANNELS = [
    { id: 'general', label: 'Général', icon: Users, color: 'text-indigo-500' },
    { id: 'reception', label: 'Réception', icon: MessageSquare, color: 'text-blue-500' },
    { id: 'kitchen', label: 'Cuisine', icon: ChefHat, color: 'text-emerald-500' },
    { id: 'maintenance', label: 'Maint.', icon: Wrench, color: 'text-orange-500' },
];

const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
    general: [
        { id: '1', sender: 'Directeur', text: 'Réunion d\'équipe à 14h en salle B.', time: '09:00' },
        { id: '2', sender: 'RH', text: 'N\'oubliez pas de valider vos congés.', time: '10:30' },
        { id: '3', sender: 'Sophie', text: 'Ok, noté !', time: '10:35', isMe: true },
    ],
    reception: [
        { id: '1', sender: 'Sarah', text: 'Le VIP de la 402 demande un late check-out.', time: '11:10' },
        { id: '2', sender: 'Thomas', text: 'Accordé jusqu\'à 14h.', time: '11:12' },
    ],
    kitchen: [
        { id: '1', sender: 'Chef', text: 'Rupture de stock sur le Saumon.', time: '12:00' },
        { id: '2', sender: 'Patrice', text: 'Livraison prévue demain matin.', time: '12:05' },
        { id: '3', sender: 'Chef', text: 'Ok on part sur le Bar pour ce soir.', time: '12:10' },
    ],
    maintenance: [
        { id: '1', sender: 'Bob', text: 'Ascenseur B en panne.', time: '08:45' },
        { id: '2', sender: 'Tech', text: 'Je suis dessus.', time: '09:00' },
    ]
};

interface WidgetTeamChatProps {
    darkMode: boolean;
}

const WidgetTeamChat: React.FC<WidgetTeamChatProps> = ({ darkMode }) => {
    const [activeChannel, setActiveChannel] = useState('general');
    const messages = MOCK_MESSAGES[activeChannel] || [];

    return (
        <section className="flex flex-col h-full">
            <div className="flex justify-between items-end mb-4 px-1">
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest opacity-60">Messagerie</h2>
                    <p className="text-[11px] text-slate-400 mt-1">Direct Live</p>
                </div>
            </div>

            <div className={`rounded-[28px] border shadow-sm flex-1 flex flex-col overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                }`}>

                {/* Channel Tabs */}
                <div className={`flex border-b overflow-x-auto no-scrollbar ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    {CHANNELS.map(channel => (
                        <button
                            key={channel.id}
                            onClick={() => setActiveChannel(channel.id)}
                            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 min-w-[60px] cursor-pointer transition-colors relative ${activeChannel === channel.id
                                    ? (darkMode ? 'bg-slate-700/50' : 'bg-slate-50')
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                }`}
                        >
                            <channel.icon size={16} className={`mb-1 ${activeChannel === channel.id ? channel.color : 'text-slate-400'}`} />
                            <span className={`text-[9px] font-bold ${activeChannel === channel.id ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-slate-400'}`}>
                                {channel.label}
                            </span>
                            {activeChannel === channel.id && (
                                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${channel.color.replace('text-', 'bg-')}`} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Messages Area */}
                <div className="flex-1 p-4 space-y-3 overflow-y-auto no-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium relative ${msg.isMe
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : (darkMode ? 'bg-slate-700 text-slate-200 rounded-bl-none' : 'bg-white text-slate-700 shadow-sm rounded-bl-none')
                                }`}>
                                {!msg.isMe && <p className="text-[9px] font-black opacity-50 mb-1">{msg.sender}</p>}
                                {msg.text}
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.time}</span>
                        </div>
                    ))}
                </div>

                {/* Mock Input */}
                <div className={`p-3 border-t ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white'}`}>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                        <input
                            type="text"
                            placeholder={`Message #${activeChannel}...`}
                            className="bg-transparent border-none focus:outline-none text-xs w-full font-medium"
                        />
                        <button className="text-indigo-500 hover:text-indigo-600">
                            <Send size={14} />
                        </button>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default WidgetTeamChat;
