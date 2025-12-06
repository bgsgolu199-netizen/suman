
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Users, Radio, Terminal, AlertTriangle, RefreshCw, Power, ArrowLeft, Ban, CheckCircle, Eye, MessageSquare, ChevronRight, User, DollarSign, XCircle, Check } from 'lucide-react';
import { getSystemStats, sendSystemBroadcast, getAllUsers, blockUser, unblockUser, nukeSystem, subscribeToMessages, getAllMessages, getSubscriptionRequests, approveSubscription, rejectSubscription } from '../services/chatService';

interface AdminPanelProps {
  onExit: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'broadcast' | 'billing' | 'danger'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [subRequests, setSubRequests] = useState<any[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    // Initial Load
    refreshData();
    addLog("System_Admin initialized session.");

    // Real-time updates
    const unsubscribe = subscribeToMessages(() => {
        refreshData();
    });

    const interval = setInterval(() => {
        setStats(getSystemStats());
    }, 2000);

    return () => {
        unsubscribe();
        clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshData = () => {
      setStats(getSystemStats());
      setUsers(getAllUsers());
      setMessages(getAllMessages());
      setSubRequests(getSubscriptionRequests());
  };

  const addLog = (msg: string) => {
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));
  };

  const handleBroadcast = () => {
      if (!broadcastMsg.trim()) return;
      setIsBroadcasting(true);
      
      setTimeout(() => {
          sendSystemBroadcast(broadcastMsg);
          addLog(`Broadcast sent: "${broadcastMsg}"`);
          setBroadcastMsg('');
          setIsBroadcasting(false);
      }, 800);
  };

  const toggleBan = (username: string, isBlocked: boolean) => {
      if (isBlocked) {
          unblockUser(username);
          addLog(`Unblocked user: ${username}`);
      } else {
          blockUser(username);
          addLog(`Blocked user: ${username}`);
      }
      refreshData();
      if (selectedUser && selectedUser.name === username) {
          setSelectedUser({ ...selectedUser, isBlocked: !isBlocked });
      }
  };

  const handleApproveSub = (username: string) => {
      approveSubscription(username);
      addLog(`Subscription Approved: ${username}`);
      refreshData();
  };

  const handleRejectSub = (username: string) => {
      rejectSubscription(username);
      addLog(`Subscription Rejected: ${username}`);
      refreshData();
  };

  const handleNuke = () => {
      if (confirm("WARNING: This will wipe the entire local database. This action is irreversible. Proceed?")) {
          addLog("INITIATING FACTORY RESET...");
          setTimeout(nukeSystem, 1000);
      }
  };

  const getUserMessages = (username: string) => {
      return messages.filter(m => m.sender === username || m.receiver === username).sort((a,b) => b.timestamp - a.timestamp);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white font-mono overflow-hidden">
      {/* Admin Header */}
      <div className="bg-[#111] border-b border-red-900/30 p-4 flex justify-between items-center z-20 shadow-lg shadow-red-900/10">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
                <ShieldAlert size={20} />
            </div>
            <div>
                <h1 className="text-lg font-bold tracking-wider text-red-500">ADMIN_PANEL</h1>
                <p className="text-[10px] text-slate-500 uppercase">Root Access Granted</p>
            </div>
        </div>
        <button onClick={onExit} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
            <ArrowLeft size={20} />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-white/5 bg-[#0f0f11] overflow-x-auto no-scrollbar">
        <button onClick={() => { setActiveTab('overview'); setSelectedUser(null); }} className={`flex-1 min-w-[80px] py-3 text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors ${activeTab === 'overview' ? 'text-red-400 bg-white/5 border-b-2 border-red-500' : 'text-slate-500'}`}>
            <Activity size={14} /> Sys
        </button>
        <button onClick={() => { setActiveTab('users'); setSelectedUser(null); }} className={`flex-1 min-w-[80px] py-3 text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors ${activeTab === 'users' ? 'text-red-400 bg-white/5 border-b-2 border-red-500' : 'text-slate-500'}`}>
            <Users size={14} /> Usr
        </button>
        <button onClick={() => { setActiveTab('billing'); setSelectedUser(null); }} className={`flex-1 min-w-[80px] py-3 text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors ${activeTab === 'billing' ? 'text-red-400 bg-white/5 border-b-2 border-red-500' : 'text-slate-500'}`}>
            <DollarSign size={14} /> Bill
        </button>
        <button onClick={() => { setActiveTab('broadcast'); setSelectedUser(null); }} className={`flex-1 min-w-[80px] py-3 text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors ${activeTab === 'broadcast' ? 'text-red-400 bg-white/5 border-b-2 border-red-500' : 'text-slate-500'}`}>
            <Radio size={14} /> Msg
        </button>
        <button onClick={() => { setActiveTab('danger'); setSelectedUser(null); }} className={`flex-1 min-w-[80px] py-3 text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors ${activeTab === 'danger' ? 'text-red-400 bg-white/5 border-b-2 border-red-500' : 'text-slate-500'}`}>
            <AlertTriangle size={14} /> Nuke
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 relative">
        {activeTab === 'overview' && stats && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in relative z-10">
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#161618] p-4 rounded-xl border border-white/5">
                        <div className="text-slate-500 text-[10px] uppercase mb-1">Active Users</div>
                        <div className="text-2xl font-bold text-emerald-500">{stats.activeUsers}</div>
                    </div>
                    <div className="bg-[#161618] p-4 rounded-xl border border-white/5">
                        <div className="text-slate-500 text-[10px] uppercase mb-1">Pending Subs</div>
                        <div className="text-2xl font-bold text-yellow-500">{subRequests.length}</div>
                    </div>
                </div>
                
                 {/* Live Traffic Monitor */}
                <div className="bg-[#161618] rounded-xl border border-white/5 overflow-hidden">
                    <div className="bg-black/40 px-4 py-2 text-[10px] uppercase text-emerald-500 flex items-center gap-2 border-b border-white/5">
                        <Activity size={12} /> Real-Time Traffic
                    </div>
                    <div className="p-2 space-y-2 h-32 overflow-y-auto">
                        {messages.slice(-5).reverse().map((m) => (
                            <div key={m.id} className="text-[11px] bg-black/20 p-2 rounded border border-white/5">
                                <span className="text-emerald-500 font-bold">{m.sender}</span>
                                <span className="text-slate-500 mx-1">→</span>
                                <span className="text-blue-400 font-bold">{m.receiver}</span>:
                                <span className="text-slate-400 ml-2 truncate">{m.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#161618] rounded-xl border border-white/5 overflow-hidden">
                    <div className="bg-black/40 px-4 py-2 text-[10px] uppercase text-slate-500 flex items-center gap-2 border-b border-white/5">
                        <Terminal size={12} /> System Logs
                    </div>
                    <div className="p-4 h-32 overflow-y-auto font-mono text-[11px] space-y-1">
                        {logs.map((log, i) => (
                            <div key={i} className="text-slate-400 border-l-2 border-slate-700 pl-2">{log}</div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'billing' && (
             <div className="space-y-4 animate-in slide-in-from-right-2">
                 <div className="flex items-center justify-between">
                     <h3 className="text-xs font-bold text-slate-500 uppercase">Subscription Requests</h3>
                     <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded border border-yellow-500/20">
                         {subRequests.length} Pending
                     </span>
                 </div>

                 {subRequests.length === 0 ? (
                     <div className="text-center text-slate-600 py-12 text-sm border border-white/5 rounded-xl border-dashed">
                         No pending payment requests.
                     </div>
                 ) : (
                     subRequests.map((req, idx) => (
                         <div key={idx} className="bg-[#161618] p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                             <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                 <div className="font-bold text-white flex items-center gap-2">
                                     <User size={14} className="text-emerald-500" />
                                     {req.username}
                                 </div>
                                 <div className="text-[10px] text-slate-400">{new Date(req.timestamp).toLocaleTimeString()}</div>
                             </div>
                             
                             <div className="bg-black/50 p-2 rounded text-xs font-mono text-slate-300 flex justify-between items-center">
                                 <span>UTR:</span>
                                 <span className="text-yellow-400 select-all">{req.utr}</span>
                             </div>

                             <div className="flex gap-2 pt-1">
                                 <button 
                                     onClick={() => handleRejectSub(req.username)}
                                     className="flex-1 bg-red-900/20 text-red-500 border border-red-900/30 hover:bg-red-900/40 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                                 >
                                     <XCircle size={14} /> Reject
                                 </button>
                                 <button 
                                     onClick={() => handleApproveSub(req.username)}
                                     className="flex-1 bg-emerald-900/20 text-emerald-500 border border-emerald-900/30 hover:bg-emerald-900/40 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                                 >
                                     <CheckCircle size={14} /> Approve (28d)
                                 </button>
                             </div>
                         </div>
                     ))
                 )}
             </div>
        )}

        {activeTab === 'users' && (
            <div className="relative z-10 animate-in slide-in-from-right-2 h-full">
                {selectedUser ? (
                    <div className="flex flex-col h-full">
                        <button onClick={() => setSelectedUser(null)} className="flex items-center text-slate-400 text-xs hover:text-white mb-4">
                            <ArrowLeft size={14} className="mr-1"/> Back to Directory
                        </button>
                        
                        <div className="bg-[#161618] rounded-xl border border-white/5 p-6 mb-4 flex items-start gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-800 overflow-hidden border-2 border-slate-700">
                                {selectedUser.avatar ? <img src={selectedUser.avatar} className="w-full h-full object-cover"/> : <User className="w-full h-full p-4 text-slate-500"/>}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    {selectedUser.name}
                                    {selectedUser.isBlocked && <span className="bg-red-900/50 text-red-500 text-[10px] px-2 py-0.5 rounded border border-red-500/20">BANNED</span>}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">{selectedUser.bio || 'Encrypted User Entity'}</p>
                                <div className="flex gap-2 mt-4">
                                    <button 
                                        onClick={() => toggleBan(selectedUser.name, selectedUser.isBlocked)}
                                        className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors
                                            ${selectedUser.isBlocked ? 'bg-emerald-900/20 text-emerald-500 hover:bg-emerald-900/30' : 'bg-red-900/20 text-red-500 hover:bg-red-900/30'}`}
                                    >
                                        {selectedUser.isBlocked ? <CheckCircle size={12}/> : <Ban size={12}/>}
                                        {selectedUser.isBlocked ? 'Unblock Access' : 'Restrict Access'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                            <Eye size={14} /> Intercepted Messages
                        </h3>
                        <div className="flex-1 overflow-y-auto bg-[#161618] rounded-xl border border-white/5 p-4 space-y-3">
                            {getUserMessages(selectedUser.name).length === 0 ? (
                                <div className="text-center text-slate-600 text-sm py-12">No chat history found for this entity.</div>
                            ) : (
                                getUserMessages(selectedUser.name).map(m => (
                                    <div key={m.id} className="text-xs p-3 rounded-lg bg-black/40 border border-white/5">
                                        <div className="flex justify-between text-slate-500 mb-1 text-[10px]">
                                            <span>{new Date(m.timestamp).toLocaleString()}</span>
                                            <span className="uppercase tracking-wide">{m.sender === selectedUser.name ? 'OUTGOING' : 'INCOMING'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className={`font-bold ${m.sender === selectedUser.name ? 'text-emerald-500' : 'text-blue-500'}`}>
                                                {m.sender}:
                                            </span>
                                            <span className="text-slate-300">{m.text}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                         {/* Directory List */}
                        {users.map((u: any) => (
                            <div key={u.id} className="bg-[#161618] p-3 rounded-xl border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedUser(u)}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden relative">
                                        <img src={u.avatar || ''} className={`w-full h-full object-cover ${u.isBlocked ? 'grayscale opacity-50' : ''}`} alt="u" />
                                        {u.isBlocked && <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center"><Ban size={16} className="text-red-500"/></div>}
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-white flex gap-2">
                                            {u.name}
                                        </div>
                                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <span className={`w-1.5 h-1.5 rounded-full ${u.status==='online'?'bg-emerald-500':'bg-slate-500'}`}></span>
                                            {u.status}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-slate-500 group-hover:text-white transition-colors">
                                    <ChevronRight size={18} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'broadcast' && (
            <div className="flex flex-col h-full justify-center relative z-10 animate-in zoom-in-95">
                <div className="bg-[#161618] p-6 rounded-2xl border border-white/5 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 border border-red-500/20">
                        <Radio size={32} />
                    </div>
                    <h2 className="text-white font-bold text-lg mb-2">System Broadcast</h2>
                    <textarea 
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                        placeholder="Type alert message..."
                        className="w-full bg-black border border-slate-700 rounded-xl p-4 text-white text-sm focus:border-red-500 focus:outline-none h-32 mb-4"
                    />

                    <button 
                        onClick={handleBroadcast}
                        disabled={isBroadcasting || !broadcastMsg}
                        className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-900/20"
                    >
                        {isBroadcasting ? 'TRANSMITTING...' : 'SEND ALERT'}
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'danger' && (
            <div className="flex flex-col h-full items-center justify-center text-center relative z-10 animate-in zoom-in-95">
                 <div className="p-8 border-2 border-red-500/30 rounded-3xl bg-red-900/5 relative overflow-hidden">
                    <AlertTriangle size={48} className="text-red-500 mx-auto mb-4 relative z-10" />
                    <h2 className="text-2xl font-bold text-white mb-2 relative z-10">Danger Zone</h2>
                    <button 
                        onClick={handleNuke}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-8 rounded-xl flex items-center gap-3 mx-auto shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-[0_0_50px_rgba(220,38,38,0.6)] transition-all relative z-10"
                    >
                        <Power size={24} /> FACTORY RESET
                    </button>
                 </div>
            </div>
        )}
      </div>

      <div className="bg-[#111] p-2 text-center text-[10px] text-slate-600 border-t border-white/5">
        SECURE ADMIN TERMINAL v2.1
      </div>
    </div>
  );
};

export default AdminPanel;
