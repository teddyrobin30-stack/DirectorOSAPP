import React, { useState } from 'react';
import { MessageSquare, Users, Settings, ChefHat, Wrench, Send } from 'lucide-react';
import { ChatChannel, ChatMessage } from '../../types';

interface WidgetTeamChatProps {
    darkMode: boolean;
    channels: ChatChannel[];
    onSendMessage?: (channelId: string, message: ChatMessage) => void;
}

const WidgetTeamChat: React.FC<WidgetTeamChatProps> = ({ darkMode, channels, onSendMessage }) => {
    // We try to find default channels by name or ID if they exist, otherwise use the first available
    const [activeChannelId, setActiveChannelId] = useState<string>(channels[0]?.id || 'general');
    const [inputText, setInputText] = useState('');

    const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];
    const messages = activeChannel?.messages || [];

    const handleSend = () => {
        if (!inputText.trim() || !onSendMessage || !activeChannel) return;

        const newMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            senderId: 'me',
            senderName: 'Moi',
            text: inputText,
            timestamp: new Date().toISOString(),
            reactions: []
        };

        onSendMessage(activeChannel.id, newMessage);
        setInputText('');
    };

    const getChannelIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('général') || n.includes('general')) return { icon: Users, color: 'text-indigo-500' };
        if (n.includes('réception') || n.includes('reception')) return { icon: MessageSquare, color: 'text-blue-500' };
        if (n.includes('cuisine') || n.includes('kitchen')) return { icon: ChefHat, color: 'text-emerald-500' };
        if (n.includes('maint') || n.includes('technique')) return { icon: Wrench, color: 'text-orange-500' };
        return { icon: MessageSquare, color: 'text-slate-500' };
    };

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
                    {channels.map(channel => {
                        const { icon: Icon, color } = getChannelIcon(channel.name);
                        return (
                            <button
                                key={channel.id}
                                onClick={() => setActiveChannelId(channel.id)}
                                className={`flex-1 flex flex-col items-center justify-center py-3 px-2 min-w-[60px] cursor-pointer transition-colors relative ${activeChannelId === channel.id
                                    ? (darkMode ? 'bg-slate-700/50' : 'bg-slate-50')
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                    }`}
                            >
                                <Icon size={16} className={`mb-1 ${activeChannelId === channel.id ? color : 'text-slate-400'}`} />
                                <span className={`text-[9px] font-bold truncate max-w-full px-1 ${activeChannelId === channel.id ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-slate-400'}`}>
                                    {channel.name}
                                </span>
                                {activeChannelId === channel.id && (
                                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${color.replace('text-', 'bg-')}`} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Messages Area */}
                <div className="flex-1 p-4 space-y-3 overflow-y-auto no-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                            <MessageSquare size={24} className="opacity-20" />
                            <p className="text-[10px] font-bold">Aucun message</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.senderId === 'me' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium relative ${msg.senderId === 'me'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : (darkMode ? 'bg-slate-700 text-slate-200 rounded-bl-none' : 'bg-white text-slate-700 shadow-sm rounded-bl-none')
                                    }`}>
                                    {msg.senderId !== 'me' && <p className="text-[9px] font-black opacity-50 mb-1">{msg.senderName}</p>}
                                    {msg.text}
                                </div>
                                <span className="text-[9px] text-slate-400 mt-1 px-1">
                                    {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* Mock Input */}
                <div className={`p-3 border-t ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white'}`}>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={`Message #${activeChannel?.name || '...'}`}
                            className="bg-transparent border-none focus:outline-none text-xs w-full font-medium"
                        />
                        <button
                            onClick={handleSend}
                            className="text-indigo-500 hover:text-indigo-600 transition-transform active:scale-95"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default WidgetTeamChat;
