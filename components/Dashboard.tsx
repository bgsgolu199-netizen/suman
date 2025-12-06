
import React, { useState, useEffect } from 'react';
import { Search, MessageCircle, LogOut, Users, RefreshCw, Clock, Settings, Zap, Ban } from 'lucide-react';
import { Contact } from '../types';
import { STORAGE_KEY_USERNAME, STORAGE_KEY_AVATAR, STORAGE_KEY_CONTACTS } from '../constants';
import { searchUsers, subscribeToMessages, getLatestContactInfo, isUserBlocked } from '../services/chatService';

interface DashboardProps {
  onSelectContact: (contact: Contact) => void;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectContact, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'search' | 'settings'>('chats');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [myUsername, setMyUsername] = useState('');
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  
  // Real-time updates via Socket Subscription
  useEffect(() => {
    const user = localStorage.getItem(STORAGE_KEY_USERNAME) || 'Unknown';
    const avatar = localStorage.getItem(STORAGE_KEY_AVATAR);
    setMyUsername(user);
    setMyAvatar(avatar);
    
    const loadContacts = () => {
        const storedContacts = localStorage.getItem(STORAGE_KEY_CONTACTS);
        if (storedContacts) {
          const parsedContacts: Contact[] = JSON.parse(storedContacts);
          // Merge with live presence data
          const liveContacts = parsedContacts.map(c => getLatestContactInfo(c));
          setContacts(liveContacts);
        }
    };
    
    loadContacts();
    
    // Subscribe to socket/chat events instead of interval polling
    const unsubscribe = subscribeToMessages(() => {
        loadContacts();
    });

    return () => { unsubscribe(); };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);

    setTimeout(() => {
      // Use Chat Service to find ONLY existing users (Mock or Registered)
      const results = searchUsers(searchQuery);
      setSearchResults(results as unknown as Contact[]);
      setIsSearching(false);
    }, 600);
  };

  const formatTime = (timestamp?: number) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const isToday = new Date().toDateString() === date.toDateString();
      return isToday 
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const sortedContacts = [...contacts].sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));

  return (
    <div className="flex flex-col h-full bg-[#000000] text-white">
      {/* Header Area */}
      <div className="pt-12 px-5 pb-2 bg-black/80 backdrop-blur-xl sticky top-0 z-20 transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
             <h1 className="text-3xl font-bold tracking-tight">
                {activeTab === 'chats' ? 'Chats' : activeTab === 'search' ? 'Discover' : 'Settings'}
             </h1>

             <div className="flex items-center gap-4">
                {activeTab === 'chats' && (
                    <button 
                        onClick={() => setActiveTab('search')}
                        className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 hover:bg-slate-700 transition-colors"
                    >
                        <RefreshCw size={18} />
                    </button>
                )}
                <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                    {myAvatar ? (
                        <img src={myAvatar} alt="Me" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-emerald-500 font-bold text-sm">
                            {myUsername.charAt(0)}
                        </div>
                    )}
                </div>
             </div>
        </div>

        {activeTab === 'chats' && (
            <div className="relative mb-2">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Search messages..."
                    className="w-full bg-[#1c1c1e] text-slate-200 placeholder-slate-500 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600/50 transition-all"
                />
            </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-black pb-24 px-4 scroll-smooth">
        {activeTab === 'chats' ? (
          <div className="space-y-1 mt-2">
            {sortedContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 animate-in fade-in zoom-in duration-500">
                    <div className="w-16 h-16 bg-[#1c1c1e] rounded-full flex items-center justify-center mb-4 shadow-xl shadow-black">
                        <MessageCircle size={32} className="opacity-50" />
                    </div>
                    <p className="font-medium">No active chats</p>
                    <button onClick={() => setActiveTab('search')} className="text-emerald-500 text-sm mt-2 hover:underline">Start a new conversation</button>
                </div>
            ) : (
                sortedContacts.map(contact => {
                  const isBlocked = isUserBlocked(contact.name);
                  return (
                    <div 
                        key={contact.id} 
                        onClick={() => onSelectContact(contact)} 
                        className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-[#1c1c1e] active:bg-[#2c2c2e] transition-all cursor-pointer border border-transparent hover:border-white/5"
                    >
                        <div className="relative">
                            <div className={`w-14 h-14 rounded-full overflow-hidden border transition-colors ${isBlocked ? 'bg-red-900/10 border-red-500/30' : 'bg-slate-800 border-white/10 group-hover:border-emerald-500/30'}`}>
                                {contact.avatar ? (
                                    <img src={contact.avatar} alt={contact.name} className={`w-full h-full object-cover ${isBlocked ? 'grayscale opacity-50' : ''}`} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-slate-400">
                                        {contact.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            {!isBlocked && contact.status === 'online' && (
                                <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-[3px] border-black rounded-full animate-pulse"></div>
                            )}
                            {!isBlocked && contact.status === 'busy' && (
                                <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 border-[3px] border-black rounded-full"></div>
                            )}
                            {isBlocked && (
                                <div className="absolute bottom-0 right-0 bg-red-500 rounded-full p-0.5 border-2 border-black">
                                    <Ban size={10} className="text-white" />
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 min-w-0 py-1">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className={`font-semibold text-[17px] truncate flex items-center gap-1 ${isBlocked ? 'text-red-400/70 line-through decoration-red-500/50' : 'text-white'}`}>
                                    {contact.name}
                                    {!contact.isAi && !isBlocked && <Zap size={10} className="text-emerald-500 fill-current" />}
                                </h3>
                                <span className="text-[12px] text-slate-500 font-medium">{formatTime(contact.lastTimestamp)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <p className="text-[15px] text-slate-400 truncate leading-snug group-hover:text-slate-300 transition-colors">
                                    {isBlocked ? <span className="text-red-900/50 italic">Blocked Contact</span> : (contact.lastMessage || <span className="italic opacity-50">Drafting...</span>)}
                                </p>
                            </div>
                        </div>
                    </div>
                  );
                })
            )}
          </div>
        ) : activeTab === 'search' ? (
          <div className="space-y-6 mt-2">
            <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find user by ID or Name..." 
                    className="w-full bg-[#1c1c1e] border-none rounded-2xl py-3.5 pl-12 pr-4 text-white text-base focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-slate-500"
                    autoFocus
                />
            </form>
            
            {isSearching ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <span className="text-xs text-emerald-500 tracking-widest font-semibold">SEARCHING DIRECTORY...</span>
                </div>
            ) : (
                <div className="space-y-3">
                    {searchResults.length > 0 && <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-2 mb-2">Directory Results</h3>}
                    
                    {searchResults.map(user => {
                        const isBlocked = isUserBlocked(user.name);
                        return (
                            <div key={user.id} className="bg-[#1c1c1e] p-4 rounded-2xl flex items-center justify-between group border border-transparent hover:border-emerald-500/20 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden border border-white/5 relative">
                                        <img src={user.avatar || ''} alt={user.name} className={`w-full h-full object-cover ${isBlocked ? 'grayscale opacity-50' : ''}`} />
                                        {isBlocked && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <Ban size={16} className="text-red-500" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold flex items-center gap-1 ${isBlocked ? 'text-red-400' : 'text-white'}`}>
                                            {user.name}
                                            {user.isAi && <span className="text-[9px] bg-slate-700 px-1 rounded">BOT</span>}
                                        </h3>
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            {isBlocked ? 'Blocked' : (
                                                <>
                                                    {user.status === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"/>}
                                                    {user.status === 'busy' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>}
                                                    {user.bio || 'Verified User'}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onSelectContact(user)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-full transition-colors shadow-lg shadow-emerald-900/20 active:scale-95"
                                >
                                    <MessageCircle size={20} />
                                </button>
                            </div>
                        );
                    })}

                    {/* Strict "Not Found" State */}
                    {!isSearching && searchQuery && searchResults.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-slate-500 mt-16 animate-in fade-in duration-500">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                <Users size={24} className="opacity-40"/>
                            </div>
                            <p className="text-sm">User "<span className="text-slate-300 font-medium">{searchQuery}</span>" not found.</p>
                            <p className="text-xs text-slate-600 mt-1">Check the username and try again.</p>
                        </div>
                    )}
                </div>
            )}
          </div>
        ) : (
            <div className="mt-2 space-y-4">
                <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden">
                    <div className="p-4 flex items-center justify-between border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><Clock size={20} /></div>
                            <span className="font-medium">Auto-Destruct Timer</span>
                        </div>
                        <span className="text-slate-500 text-sm">Off</span>
                    </div>
                    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><Zap size={20} /></div>
                            <span className="font-medium">WebSocket Status</span>
                        </div>
                        <span className="text-emerald-500 text-sm font-medium">Connected</span>
                    </div>
                </div>

                <button 
                    onClick={onLogout}
                    className="w-full bg-[#1c1c1e] text-red-500 p-4 rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut size={20} />
                    Secure Logout
                </button>

                <div className="text-center mt-8">
                    <p className="text-xs text-slate-600 font-mono">VERSION 3.0.0 (SOCKET-LIVE)</p>
                    <p className="text-[10px] text-slate-700 mt-1">ID: {myUsername}</p>
                </div>
            </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="bg-[#161618]/90 backdrop-blur-xl border-t border-white/5 px-6 py-2 pb-6 flex justify-between items-center absolute bottom-0 w-full z-20">
        <button 
            onClick={() => setActiveTab('chats')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16
                ${activeTab === 'chats' ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <MessageCircle size={24} strokeWidth={activeTab === 'chats' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Chats</span>
        </button>
        
        <button 
            onClick={() => setActiveTab('search')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16
                ${activeTab === 'search' ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <Users size={24} strokeWidth={activeTab === 'search' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Discover</span>
        </button>

        <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16
                ${activeTab === 'settings' ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <Settings size={24} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
