import React, { Component, useState, useRef, useEffect, useMemo, ErrorInfo, ReactNode } from 'react';
import { ChatChannel, ChatMessage, Contact, UserSettings, UserProfile, Attachment } from '../types';
import { 
  Send, Plus, Search, Paperclip, MoreVertical, Hash, User, 
  CheckSquare, Smile, X, Image as ImageIcon, MessageSquare, 
  LogOut, Trash2, Info, FileImage, Shield, UserPlus, MinusCircle,
  AlertTriangle, Loader2, RefreshCw, ArrowLeft, Download
} from 'lucide-react';

interface MessagingViewProps {
  channels: ChatChannel[];
  onUpdateChannels: (channels: ChatChannel[]) => void;
  users: UserProfile[]; 
  contacts: Contact[]; 
  userSettings: UserSettings;
  currentUser: UserProfile | null;
  onSendMessage: (channelId: string, message: ChatMessage) => void;
  onCreateTask: (text: string) => void;
}

// --- ERROR BOUNDARY COMPONENT ---
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MessagingErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("MessagingView Crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900 animate-in fade-in">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Oups !</h2>
          <p className="text-sm text-slate-500 mb-6">Le module de messagerie a rencontré un problème.</p>
          <button 
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg"
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- MAIN CONTENT COMPONENT ---
const MessagingContent: React.FC<MessagingViewProps> = ({ 
  channels = [], 
  onUpdateChannels, 
  users = [], 
  userSettings, 
  currentUser, 
  onSendMessage, 
  onCreateTask 
}) => {
  const safeChannels = useMemo(() => Array.isArray(channels) ? channels : [], [channels]);
  const safeUsers = useMemo(() => Array.isArray(users) ? users : [], [users]);

  // Loading State
  if (!channels && !users) {
     return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
           <Loader2 size={40} className="text-indigo-500 animate-spin mb-4" />
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Chargement...</p>
        </div>
     );
  }

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [search, setSearch] = useState('');
  const [isMobileList, setIsMobileList] = useState(true); 
  const [isUploading, setIsUploading] = useState(false);
  
  // Options & Modals State
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState<UserProfile | null>(null);

  // New Channel Form
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'group' | 'direct'>('group');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeChannel = safeChannels.find(c => c.id === selectedChannelId);
  const potentialDMs = safeUsers.filter(u => u.uid !== currentUser?.uid);
  const canManageGroup = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  // --- DERIVED DATA ---
  const filteredChannels = safeChannels.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()));
  
  const groupMembers = useMemo(() => {
    if (!activeChannel) return [];
    return safeUsers.filter(u => activeChannel.participants.includes(u.uid));
  }, [activeChannel, safeUsers]);

  const nonMembers = useMemo(() => {
    if (!activeChannel) return [];
    return safeUsers.filter(u => !activeChannel.participants.includes(u.uid));
  }, [activeChannel, safeUsers]);

  const channelMedia = useMemo(() => {
    if (!activeChannel) return [];
    const media: Attachment[] = [];
    activeChannel.messages?.forEach(m => {
      if (m.attachments) media.push(...m.attachments);
    });
    return media;
  }, [activeChannel]);

  // --- EFFECTS ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOptionsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedChannelId && activeChannel) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (activeChannel.unreadCount > 0) {
        const updated = safeChannels.map(c => c.id === selectedChannelId ? { ...c, unreadCount: 0 } : c);
        onUpdateChannels(updated);
      }
    }
  }, [selectedChannelId, activeChannel?.messages?.length]);

  // --- HANDLERS ---
  const handleSend = () => {
    if ((!inputText.trim()) || !selectedChannelId || !currentUser) return;
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      text: inputText,
      timestamp: new Date().toISOString(),
      reactions: []
    };
    onSendMessage(selectedChannelId, newMessage);
    setInputText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChannelId || !currentUser) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Fichier trop volumineux (Max 5 Mo).");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const attachment: Attachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        type: file.type,
        url: base64
      };
      
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        text: "Pièce jointe",
        timestamp: new Date().toISOString(),
        attachments: [attachment],
        reactions: []
      };
      onSendMessage(selectedChannelId, newMessage);
    } catch (error) {
      console.error("Erreur upload:", error);
      alert("Échec de l'envoi du fichier.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateChannel = () => {
    if (!newChannelName && newChannelType === 'group') return;
    
    if (newChannelType === 'direct') {
       const existing = safeChannels.find(c => c.type === 'direct' && c.participants.includes(selectedMembers[0]));
       if (existing) {
         setSelectedChannelId(existing.id);
         setIsMobileList(false);
         setShowNewChannelModal(false);
         return;
       }
    }

    const newChannel: ChatChannel = {
      id: `ch-${Date.now()}`,
      type: newChannelType,
      name: newChannelName || safeUsers.find(u => u.uid === selectedMembers[0])?.displayName || 'Chat',
      participants: [...selectedMembers, currentUser?.uid || ''],
      messages: [],
      unreadCount: 0,
      lastUpdate: new Date().toISOString(),
      isOnline: Math.random() > 0.5
    };

    onUpdateChannels([newChannel, ...safeChannels]);
    setSelectedChannelId(newChannel.id);
    setIsMobileList(false);
    setShowNewChannelModal(false);
    setNewChannelName('');
    setSelectedMembers([]);
  };

  const handleLeaveGroup = () => {
    if (!activeChannel || !currentUser) return;
    if (window.confirm("Voulez-vous vraiment quitter ce groupe ?")) {
      const updatedChannels = safeChannels.filter(c => c.id !== activeChannel.id); 
      onUpdateChannels(updatedChannels);
      setSelectedChannelId(null);
      setIsMobileList(true);
    }
  };

  const handleClearConversation = () => {
    if (!activeChannel) return;
    if (window.confirm("Effacer tout l'historique de cette conversation ?")) {
      const updatedChannels = safeChannels.map(c => c.id === activeChannel.id ? { ...c, messages: [], lastMessage: '' } : c);
      onUpdateChannels(updatedChannels);
    }
  };

  const handleAddMember = (uid: string) => {
    if (!activeChannel) return;
    if (!activeChannel.participants.includes(uid)) {
      const updatedChannel = { ...activeChannel, participants: [...activeChannel.participants, uid] };
      onUpdateChannels(safeChannels.map(c => c.id === activeChannel.id ? updatedChannel : c));
    }
  };

  const handleRemoveMember = (uid: string) => {
    if (!activeChannel) return;
    const updatedChannel = { ...activeChannel, participants: activeChannel.participants.filter(id => id !== uid) };
    onUpdateChannels(safeChannels.map(c => c.id === activeChannel.id ? updatedChannel : c));
  };

  const handleReaction = (msgId: string, emoji: string) => {
    if (!activeChannel) return;
    const updatedMessages = activeChannel.messages.map(msg => {
      if (msg.id === msgId) {
        const existingReaction = msg.reactions?.find(r => r.emoji === emoji);
        let newReactions = msg.reactions || [];
        if (existingReaction) {
          newReactions = newReactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r);
        } else {
          newReactions = [...newReactions, { emoji, count: 1, users: [currentUser?.uid || ''] }];
        }
        return { ...msg, reactions: newReactions };
      }
      return msg;
    });
    const updatedChannels = safeChannels.map(c => c.id === activeChannel.id ? { ...c, messages: updatedMessages } : c);
    onUpdateChannels(updatedChannels);
  };

  return (
    <div className="flex h-full w-full bg-white dark:bg-slate-950 overflow-hidden relative">
      
      {/* --- SIDEBAR (Liste Conversations) --- */}
      <div className={`
        flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full transition-all duration-300
        ${isMobileList ? 'flex w-full' : 'hidden'} md:flex md:w-80 lg:w-96
      `}>
         {/* Sidebar Header */}
         <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-black text-slate-900 dark:text-white">Discussions</h2>
               <button 
                 onClick={() => setShowNewChannelModal(true)}
                 className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
               >
                 <Plus size={20}/>
               </button>
            </div>
            <div className="flex items-center px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-transparent focus-within:border-indigo-500 transition-all">
               <Search size={16} className="text-slate-400 mr-2"/>
               <input 
                 type="text" 
                 placeholder="Rechercher..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="bg-transparent outline-none text-xs font-bold w-full text-slate-900 dark:text-white placeholder:text-slate-400"
               />
            </div>
         </div>

         {/* Channel List */}
         <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredChannels.map(channel => {
              const isSelected = selectedChannelId === channel.id;
              const isGroup = channel.type === 'group';
              return (
                <div 
                  key={channel.id}
                  onClick={() => { setSelectedChannelId(channel.id); setIsMobileList(false); }}
                  className={`p-3 rounded-2xl cursor-pointer flex items-center gap-3 transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                   {/* Avatar */}
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-sm shadow-sm relative ${isGroup ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200'}`}>
                      {isGroup ? <Hash size={20}/> : channel.name.slice(0, 2).toUpperCase()}
                      {!isGroup && channel.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>}
                   </div>
                   
                   {/* Info */}
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                         <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>{channel.name}</h3>
                         <span className="text-[10px] text-slate-400">{new Date(channel.lastUpdate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <p className={`text-xs truncate ${channel.unreadCount > 0 ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                           {channel.lastMessage || (channel.type === 'group' ? 'Discussion de groupe' : 'Nouvelle discussion')}
                         </p>
                         {channel.unreadCount > 0 && (
                           <span className="min-w-[1.25rem] h-5 flex items-center justify-center bg-indigo-600 text-white text-[10px] font-bold rounded-full px-1.5 ml-2">
                             {channel.unreadCount}
                           </span>
                         )}
                      </div>
                   </div>
                </div>
              );
            })}
            
            {filteredChannels.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 opacity-60">
                 <MessageSquare size={32} className="mb-2"/>
                 <p className="text-xs font-bold">Aucune discussion</p>
              </div>
            )}
         </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div className={`
        flex-1 flex-col h-full bg-slate-50 dark:bg-slate-950 relative transition-all duration-300
        ${!isMobileList ? 'flex w-full' : 'hidden md:flex'}
      `}>
         {activeChannel ? (
           <>
             {/* Chat Header */}
             <div className="h-16 px-4 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-20 shrink-0">
                <div className="flex items-center gap-3">
                   <button 
                     onClick={() => setIsMobileList(true)}
                     className="md:hidden p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                   >
                      <ArrowLeft size={20}/>
                   </button>
                   <div className="flex items-center gap-3 cursor-pointer" onClick={() => activeChannel.type === 'group' ? setShowGroupInfoModal(true) : null}>
                      {activeChannel.type === 'group' ? (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600"><Hash size={20}/></div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-600 dark:text-slate-200">
                           {activeChannel.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                         <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{activeChannel.name}</h3>
                         <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                           {activeChannel.type === 'group' ? `${activeChannel.participants.length} membres` : (activeChannel.isOnline ? 'En ligne' : 'Absent')}
                         </p>
                      </div>
                   </div>
                </div>

                <div className="relative" ref={dropdownRef}>
                   <button 
                     onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                     className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                   >
                     <MoreVertical size={20}/>
                   </button>
                   
                   {/* Dropdown Menu */}
                   {showOptionsDropdown && (
                     <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 origin-top-right">
                        {activeChannel.type === 'group' ? (
                          <>
                            <button onClick={() => { setShowGroupInfoModal(true); setShowOptionsDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                               <Info size={16}/> Infos du groupe
                            </button>
                            <button onClick={() => { setShowMediaModal(true); setShowOptionsDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                               <FileImage size={16}/> Médias & Documents
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-slate-700 mx-2"></div>
                            <button onClick={() => { handleLeaveGroup(); setShowOptionsDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-xs font-bold text-red-500">
                               <LogOut size={16}/> Quitter le groupe
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setShowMediaModal(true); setShowOptionsDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                               <FileImage size={16}/> Médias partagés
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-slate-700 mx-2"></div>
                            <button onClick={() => { handleClearConversation(); setShowOptionsDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-xs font-bold text-red-500">
                               <Trash2 size={16}/> Effacer conversation
                            </button>
                          </>
                        )}
                     </div>
                   )}
                </div>
             </div>

             {/* Messages List Area */}
             <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-slate-950">
                {(activeChannel.messages || []).map((msg, idx) => {
                  const isMe = msg.senderId === currentUser?.uid;
                  const showAvatar = !isMe && (idx === 0 || activeChannel.messages[idx-1]?.senderId !== msg.senderId);
                  
                  return (
                    <div key={msg.id} className={`flex group w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                       
                       {/* Avatar for Others */}
                       {!isMe && (
                         <div className="w-8 mr-2 flex-shrink-0 flex flex-col justify-end">
                            {showAvatar ? (
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-600 dark:text-slate-300">
                                 {msg.senderName?.slice(0, 2).toUpperCase()}
                              </div>
                            ) : <div className="w-8"/>}
                         </div>
                       )}

                       {/* Message Bubble Container */}
                       <div className={`max-w-[75%] relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          
                          {/* Sender Name (Only for others in groups) */}
                          {!isMe && showAvatar && activeChannel.type === 'group' && (
                             <span className="text-[10px] text-slate-400 font-bold ml-1 mb-1">{msg.senderName}</span>
                          )}

                          {/* The Bubble */}
                          <div className={`
                             p-3 shadow-sm text-sm relative break-words
                             ${isMe 
                               ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                               : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm'
                             }
                          `}>
                             {msg.attachments && msg.attachments.length > 0 && (
                               <div className="mb-2 space-y-2">
                                  {msg.attachments.map(att => (
                                    <div key={att.id} className="rounded-lg overflow-hidden border border-black/10 dark:border-white/10 relative group/img">
                                       {att.type.startsWith('image/') ? (
                                         <>
                                           <img src={att.url} alt="attachment" className="max-w-full h-auto object-cover max-h-60" />
                                           <a 
                                             href={att.url} 
                                             download={att.name}
                                             className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                           >
                                              <Download size={24} className="text-white drop-shadow-md"/>
                                           </a>
                                         </>
                                       ) : (
                                         <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700">
                                            <Paperclip size={16}/> 
                                            <span className="text-xs font-bold truncate max-w-[150px]">{att.name}</span>
                                         </div>
                                       )}
                                    </div>
                                  ))}
                               </div>
                             )}
                             <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                          </div>

                          {/* Reactions & Timestamp Row */}
                          <div className={`flex items-center gap-2 mt-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                             {/* Reactions */}
                             {msg.reactions && msg.reactions.length > 0 && (
                               <div className="flex gap-1">
                                  {msg.reactions.map((r, i) => (
                                    <button 
                                      key={i} 
                                      onClick={() => handleReaction(msg.id, r.emoji)}
                                      className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-full shadow-sm hover:scale-110 transition-transform"
                                    >
                                      {r.emoji} <span className="font-bold">{r.count > 1 ? r.count : ''}</span>
                                    </button>
                                  ))}
                               </div>
                             )}
                             
                             {/* Timestamp */}
                             <span className="text-[9px] text-slate-400 font-medium">
                               {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                             </span>
                          </div>

                          {/* Hover Actions (Floating on side) */}
                          <div className={`
                             absolute top-0 h-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2
                             ${isMe ? '-left-24 justify-end' : '-right-24 justify-start'}
                          `}>
                             <button onClick={() => handleReaction(msg.id, '👍')} className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-amber-500 transition-colors transform hover:scale-110">👍</button>
                             <button onClick={() => handleReaction(msg.id, '❤️')} className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-red-500 transition-colors transform hover:scale-110">❤️</button>
                             <button 
                               onClick={() => onCreateTask(msg.text)}
                               className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-indigo-600 transition-colors transform hover:scale-110"
                               title="Créer une tâche"
                             >
                               <CheckSquare size={14}/>
                             </button>
                          </div>

                       </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
             </div>

             {/* Input Area (Bottom Fixed) */}
             <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                   
                   {/* File Upload Button */}
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     disabled={isUploading}
                     className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50"
                   >
                      {isUploading ? <Loader2 size={20} className="animate-spin"/> : <Paperclip size={20}/>}
                   </button>
                   <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />

                   {/* Text Input */}
                   <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center px-4 border border-transparent focus-within:border-indigo-500 transition-all">
                      <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Écrivez un message..."
                        className="flex-1 bg-transparent outline-none text-sm py-3 max-h-32 min-h-[44px] resize-none text-slate-900 dark:text-white placeholder:text-slate-400 custom-scrollbar"
                        rows={1}
                        disabled={isUploading}
                      />
                      <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                         <Smile size={20}/>
                      </button>
                   </div>

                   {/* Send Button */}
                   <button 
                     onClick={handleSend}
                     disabled={!inputText.trim() || isUploading}
                     className={`p-3 rounded-full shadow-lg transition-all transform active:scale-95 ${inputText.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}
                   >
                      <Send size={20}/>
                   </button>
                </div>
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 p-8 text-center bg-slate-50 dark:bg-slate-950">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                 <MessageSquare size={40} className="text-slate-300 dark:text-slate-700"/>
              </div>
              <h3 className="text-xl font-black text-slate-400 dark:text-slate-500 mb-2">Vos Messages</h3>
              <p className="text-sm font-medium max-w-xs text-slate-400">Sélectionnez une discussion pour commencer à échanger avec votre équipe.</p>
           </div>
         )}
      </div>

      {/* --- MODALS (Restored logic) --- */}

      {/* 1. New Channel Modal */}
      {showNewChannelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black">Nouvelle Discussion</h3>
                 <button onClick={() => setShowNewChannelModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                 <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button 
                      onClick={() => setNewChannelType('group')}
                      className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${newChannelType === 'group' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400'}`}
                    >
                      Groupe / Service
                    </button>
                    <button 
                      onClick={() => setNewChannelType('direct')}
                      className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${newChannelType === 'direct' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400'}`}
                    >
                      Message Privé
                    </button>
                 </div>

                 {newChannelType === 'group' && (
                   <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom du Groupe</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Maintenance, Cuisine..."
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-500 transition-colors"
                      />
                   </div>
                 )}

                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Participants</label>
                    <div className="max-h-48 overflow-y-auto space-y-1 mt-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                       {potentialDMs.map(u => (
                         <div 
                           key={u.uid}
                           onClick={() => {
                             if (newChannelType === 'direct') {
                               setSelectedMembers([u.uid]);
                             } else {
                               if (selectedMembers.includes(u.uid)) setSelectedMembers(selectedMembers.filter(id => id !== u.uid));
                               else setSelectedMembers([...selectedMembers, u.uid]);
                             }
                           }}
                           className={`p-2 rounded-lg flex items-center justify-between cursor-pointer ${selectedMembers.includes(u.uid) ? 'bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200' : 'hover:bg-white dark:hover:bg-slate-700'}`}
                         >
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold">{u.displayName.slice(0,2).toUpperCase()}</div>
                               <span className="text-xs font-bold">{u.displayName}</span>
                            </div>
                            {selectedMembers.includes(u.uid) && <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>}
                         </div>
                       ))}
                    </div>
                 </div>

                 <button 
                   onClick={handleCreateChannel}
                   disabled={selectedMembers.length === 0 || (newChannelType === 'group' && !newChannelName)}
                   className="w-full py-4 rounded-xl bg-indigo-600 text-white font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                 >
                   Créer {newChannelType === 'group' ? 'le groupe' : 'la discussion'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 2. Group Info Modal */}
      {showGroupInfoModal && activeChannel && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-xl font-black">{activeChannel.name}</h3>
                   <p className="text-xs text-slate-400 font-bold">{activeChannel.participants.length} membres</p>
                 </div>
                 <button onClick={() => setShowGroupInfoModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                 <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-slate-400">Membres</h4>
                    {groupMembers.map(u => (
                      <div key={u.uid} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                         <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-600'}`}>
                               {u.displayName.slice(0,2).toUpperCase()}
                            </div>
                            <div>
                               <p className="text-sm font-bold">{u.displayName}</p>
                               <p className="text-[10px] text-slate-400 capitalize">{u.role}</p>
                            </div>
                         </div>
                         {canManageGroup && u.uid !== currentUser?.uid && (
                           <button onClick={() => handleRemoveMember(u.uid)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-white dark:hover:bg-slate-700">
                              <MinusCircle size={16}/>
                           </button>
                         )}
                      </div>
                    ))}
                 </div>

                 {canManageGroup && (
                   <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-[10px] font-black uppercase text-slate-400">Ajouter des membres</h4>
                      <div className="max-h-32 overflow-y-auto pr-1">
                        {nonMembers.map(u => (
                          <div key={u.uid} className="flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer" onClick={() => handleAddMember(u.uid)}>
                             <span className="text-sm font-bold pl-2">{u.displayName}</span>
                             <UserPlus size={16} className="text-indigo-500"/>
                          </div>
                        ))}
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* 3. Media Modal */}
      {showMediaModal && activeChannel && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-2xl p-6 shadow-2xl flex flex-col h-[80vh]">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black">Médias & Documents</h3>
                 <button onClick={() => setShowMediaModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                 {channelMedia.length > 0 ? (
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {channelMedia.map(att => (
                        <div key={att.id} className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-50 dark:bg-slate-800">
                           {att.type.startsWith('image/') ? (
                             <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                           ) : (
                             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Paperclip size={32} />
                                <span className="text-xs font-bold mt-2 px-2 text-center truncate w-full">{att.name}</span>
                             </div>
                           )}
                           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <a href={att.url} download={att.name} className="p-2 bg-white rounded-full text-indigo-600 hover:scale-110 transition-transform"><Download size={16}/></a>
                           </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                      <ImageIcon size={48} className="mb-4"/>
                      <p className="font-bold">Aucun média partagé</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

// --- ERROR BOUNDARY WRAPPER ---
const MessagingView: React.FC<MessagingViewProps> = (props) => (
  <MessagingErrorBoundary>
    <MessagingContent {...props} />
  </MessagingErrorBoundary>
);

export default MessagingView;