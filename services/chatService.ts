
import { Contact, ChatMessage } from '../types';
import { STORAGE_KEY_USERNAME, MOCK_GLOBAL_USERS, STORAGE_KEY_BLOCKED, STORAGE_KEY_SUBSCRIPTION_EXPIRY, STORAGE_KEY_SUBSCRIPTION_STATUS, SUBSCRIPTION_DURATION_MS, STORAGE_KEY_SECRET_CODE } from '../constants';

const GLOBAL_USERS_KEY = 'calcvault_global_users';
const GLOBAL_SUB_REQUESTS_KEY = 'calcvault_sub_requests';

// --- WebSocket Simulation Layer ---
class SimulatedSocket {
    private channel: BroadcastChannel;
    private listeners: ((event: MessageEvent) => void)[] = [];

    constructor() {
        this.channel = new BroadcastChannel('calcvault_secure_network');
        this.channel.onmessage = (event) => {
            this.listeners.forEach(cb => cb(event));
        };
    }

    send(data: any) {
        // Broadcast to others
        this.channel.postMessage(data);
    }

    addEventListener(type: 'message', callback: (event: MessageEvent) => void) {
        if (type === 'message') {
            this.listeners.push(callback);
        }
    }
}

const socket = new SimulatedSocket();

// In-Memory Message Store & Presence State
let inMemoryMessages: any[] = [];
// Track dynamic status
let presenceState: Record<string, 'online' | 'offline' | 'busy'> = {};

const messageSubscribers: Set<() => void> = new Set();

// Blocking System Helpers
export const getBlockedUsers = (): string[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_BLOCKED) || '[]');
};

export const blockUser = (username: string) => {
    const blocked = getBlockedUsers();
    if (!blocked.includes(username)) {
        blocked.push(username);
        localStorage.setItem(STORAGE_KEY_BLOCKED, JSON.stringify(blocked));
        notifySubscribers();
    }
};

export const unblockUser = (username: string) => {
    const blocked = getBlockedUsers();
    const newBlocked = blocked.filter(u => u !== username);
    localStorage.setItem(STORAGE_KEY_BLOCKED, JSON.stringify(newBlocked));
    notifySubscribers();
};

export const isUserBlocked = (username: string) => {
    return getBlockedUsers().includes(username);
};

// Initialize Socket Listener
socket.addEventListener('message', (event) => {
    const data = event.data;
    
    // --- BLOCKING FILTER ---
    let eventSender: string | null = null;
    
    if (data.type === 'CHAT_MESSAGE') {
        eventSender = data.payload.sender;
    } else if (data.type === 'PRESENCE_UPDATE') {
        eventSender = data.payload.username;
    } else if (data.type === 'READ_RECEIPT') {
        eventSender = data.payload.reader; 
    } else if (data.type === 'MESSAGE_EDIT') {
        const msg = inMemoryMessages.find(m => m.id === data.payload.id);
        if (msg) eventSender = msg.sender;
    } else if (data.type === 'MESSAGE_DELETE') {
        const msg = inMemoryMessages.find(m => m.id === data.payload.id);
        if (msg) eventSender = msg.sender;
    }

    if (eventSender && isUserBlocked(eventSender)) {
        return;
    }
    // -----------------------

    if (data.type === 'CHAT_MESSAGE') {
        const newMsg = data.payload;
        // Prevent duplicates
        if (!inMemoryMessages.find(m => m.id === newMsg.id)) {
             inMemoryMessages.push(newMsg);
             notifySubscribers();
        }
    } else if (data.type === 'PRESENCE_UPDATE') {
        const { username, status } = data.payload;
        presenceState[username] = status;
        notifySubscribers();
    } else if (data.type === 'READ_RECEIPT') {
        const { reader, originalSender } = data.payload;
        const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
        if (myName === originalSender) {
            markMyMessagesAsReadBy(reader);
        }
    } else if (data.type === 'MESSAGE_EDIT') {
        const { id, text } = data.payload;
        inMemoryMessages = inMemoryMessages.map(m => {
            if (m.id === id) {
                return { ...m, text, isEdited: true };
            }
            return m;
        });
        notifySubscribers();
    } else if (data.type === 'MESSAGE_DELETE') {
        const { id } = data.payload;
        inMemoryMessages = inMemoryMessages.filter(m => m.id !== id);
        notifySubscribers();
    } else if (data.type === 'USER_JOINED') {
        // A new user has joined the network via Announce
        const user = data.payload;
        const localUsers = JSON.parse(localStorage.getItem(GLOBAL_USERS_KEY) || '[]');
        if (!localUsers.find((u: any) => u.name === user.name)) {
            localUsers.push(user);
            localStorage.setItem(GLOBAL_USERS_KEY, JSON.stringify(localUsers));
        }
        sendPresenceUpdate('online');
        logUserAction('REGISTRATION_DETECTED', user.name, 'New node joined network');
    } else if (data.type === 'SYSTEM_LOG') {
        logToLocalMemory(data.payload);
    } else if (data.type === 'SUB_REQUEST') {
        // Admin Panel will pick this up
        notifySubscribers();
    } else if (data.type === 'SUB_APPROVED') {
        const { username, expiry } = data.payload;
        const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
        if (myName === username) {
            localStorage.setItem(STORAGE_KEY_SUBSCRIPTION_EXPIRY, expiry.toString());
            localStorage.setItem(STORAGE_KEY_SUBSCRIPTION_STATUS, 'active');
            notifySubscribers(); // Triggers UI update in SubscriptionScreen
        }
    }
});

const notifySubscribers = () => {
    messageSubscribers.forEach(cb => cb());
};

// --- AUDIT LOGGING ---
let inMemoryLogs: any[] = [];

const logToLocalMemory = (log: any) => {
    inMemoryLogs = [log, ...inMemoryLogs].slice(0, 100); // Keep last 100 logs
};

export const logUserAction = (action: string, user: string, details: string) => {
    const logEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        action,
        user,
        details
    };
    
    // Log locally
    logToLocalMemory(logEntry);
    
    // Broadcast to Admin Panel
    socket.send({
        type: 'SYSTEM_LOG',
        payload: logEntry
    });
};

export const getSystemLogs = () => {
    return inMemoryLogs;
};

// Helper: Update local messages when someone else reads them
const markMyMessagesAsReadBy = (reader: string) => {
    let changed = false;
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    inMemoryMessages.forEach(m => {
        if (m.sender === myName && m.receiver === reader && m.status !== 'read') {
            m.status = 'read';
            changed = true;
        }
    });
    if (changed) notifySubscribers();
};

export const subscribeToMessages = (callback: () => void) => {
    messageSubscribers.add(callback);
    return () => messageSubscribers.delete(callback);
};

export const announceExistence = () => {
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    const avatar = localStorage.getItem('calcvault_avatar');
    if (myName) {
        // Broadcast my existence to everyone on the network so they can add me
        socket.send({
            type: 'USER_JOINED',
            payload: { name: myName, avatar, status: 'online', bio: 'Verified User', isAi: false }
        });
    }
};

export const registerUser = (username: string, password: string, avatar: string | null): "SUCCESS" | "USERNAME_TAKEN" => {
    const reserved = ['admin', 'system', 'root', 'moderator', 'support', 'null', 'undefined'];
    if (reserved.includes(username.toLowerCase())) {
        return "USERNAME_TAKEN";
    }

    const users = JSON.parse(localStorage.getItem(GLOBAL_USERS_KEY) || '[]');
    
    // Check for exact duplicate username
    if (users.find((u: any) => u.name.toLowerCase() === username.toLowerCase())) {
        return "USERNAME_TAKEN"; 
    }

    // Save to global directory
    const newUser = { name: username, avatar, status: 'online', bio: 'Verified User', isAi: false };
    users.push(newUser);
    localStorage.setItem(GLOBAL_USERS_KEY, JSON.stringify(users));
    
    // Save local credentials
    localStorage.setItem(STORAGE_KEY_SECRET_CODE, password);
    
    // Broadcast to others immediately
    socket.send({
        type: 'USER_JOINED',
        payload: newUser
    });

    sendPresenceUpdate('online');
    logUserAction('USER_REGISTER', username, 'Account created successfully');
    
    return "SUCCESS";
};

export const sendPresenceUpdate = (status: 'online' | 'busy' | 'offline') => {
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    if (!myName) return;
    
    presenceState[myName] = status;
    notifySubscribers();

    socket.send({
        type: 'PRESENCE_UPDATE',
        payload: { username: myName, status }
    });
};

export const getLatestContactInfo = (contact: Contact): Contact => {
    if (isUserBlocked(contact.name)) {
        return { ...contact, status: 'offline' };
    }
    const liveStatus = presenceState[contact.name];
    if (liveStatus) {
        return { ...contact, status: liveStatus };
    }
    return contact;
};

export const searchUsers = (query: string): Contact[] => {
    const localUsers = JSON.parse(localStorage.getItem(GLOBAL_USERS_KEY) || '[]');
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    
    const allUsers = [...MOCK_GLOBAL_USERS, ...localUsers];
    
    return allUsers
        .filter(u => u.name.toLowerCase().includes(query.toLowerCase()) && u.name !== myName)
        .map(u => ({
            id: u.name,
            name: u.name,
            status: isUserBlocked(u.name) ? 'offline' : (presenceState[u.name] || u.status || 'offline'),
            avatar: u.avatar,
            bio: u.bio,
            isAi: false 
        }));
};

export const sendMessage = (text: string, receiver: string, attachment?: any, senderOverride?: string) => {
    const currentUser = localStorage.getItem(STORAGE_KEY_USERNAME);
    const sender = senderOverride || currentUser;
    
    if (!sender) return;

    if (isUserBlocked(receiver) && !senderOverride) {
        return; 
    }

    const newMsg = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text,
        sender,
        receiver: senderOverride ? currentUser : receiver, 
        timestamp: Date.now(),
        attachment,
        status: 'sent',
        isEdited: false
    };
    
    inMemoryMessages.push(newMsg);
    notifySubscribers();

    if (!senderOverride) {
        socket.send({ type: 'CHAT_MESSAGE', payload: newMsg });
        sendPresenceUpdate('online'); 
    }
    
    return newMsg;
};

export const deleteMessage = (msgId: string) => {
    // Remove locally
    inMemoryMessages = inMemoryMessages.filter(m => m.id !== msgId);
    notifySubscribers();

    // Broadcast delete event to others
    socket.send({
        type: 'MESSAGE_DELETE',
        payload: { id: msgId }
    });
};

export const markMessagesAsRead = (senderName: string) => {
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    if (!myName) return;
    
    if (isUserBlocked(senderName)) return;

    let changed = false;
    inMemoryMessages.forEach(m => {
        if (m.sender === senderName && m.receiver === myName && m.status !== 'read') {
            m.status = 'read';
            changed = true;
        }
    });
    
    if (changed) {
        notifySubscribers();
        socket.send({
            type: 'READ_RECEIPT',
            payload: { reader: myName, originalSender: senderName }
        });
    }
};

export const getConversation = (contactName: string): ChatMessage[] => {
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    if (!myName) return [];

    return inMemoryMessages
        .filter((m: any) => 
            (m.sender === myName && m.receiver === contactName) ||
            (m.sender === contactName && m.receiver === myName)
        )
        .map((m: any) => ({
            id: m.id,
            role: m.sender === myName ? 'user' : 'model',
            text: m.text,
            timestamp: m.timestamp,
            attachment: m.attachment,
            reaction: m.reaction, 
            sender: m.sender,
            receiver: m.receiver,
            isEdited: m.isEdited,
            status: m.status
        }));
};

export const updateMessageReaction = (msgId: string, reaction: string | undefined) => {
    inMemoryMessages = inMemoryMessages.map((m: any) => {
        if (m.id === msgId) {
            return { ...m, reaction };
        }
        return m;
    });
    notifySubscribers();
};

export const editMessage = (msgId: string, newText: string) => {
    inMemoryMessages = inMemoryMessages.map((m: any) => {
        if (m.id === msgId) {
            return { ...m, text: newText, isEdited: true };
        }
        return m;
    });
    notifySubscribers();

    socket.send({
        type: 'MESSAGE_EDIT',
        payload: { id: msgId, text: newText }
    });
};

export const clearHistory = (contactName: string) => {
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    // Remove all messages between me and this contact
    inMemoryMessages = inMemoryMessages.filter((m: any) => 
        !((m.sender === myName && m.receiver === contactName) || 
          (m.sender === contactName && m.receiver === myName))
    );
    notifySubscribers();
    logUserAction('CLEAR_HISTORY', myName || 'Unknown', `Cleared chat with ${contactName}`);
};

// --- SUBSCRIPTION SYSTEM ---

export const getSubscriptionStatus = (): 'active' | 'expired' | 'pending' | 'none' => {
    const status = localStorage.getItem(STORAGE_KEY_SUBSCRIPTION_STATUS);
    const expiry = localStorage.getItem(STORAGE_KEY_SUBSCRIPTION_EXPIRY);

    if (status === 'pending') return 'pending';

    if (expiry) {
        const expiryDate = parseInt(expiry);
        if (Date.now() > expiryDate) {
            localStorage.setItem(STORAGE_KEY_SUBSCRIPTION_STATUS, 'expired');
            return 'expired';
        }
        return 'active';
    }

    return 'none';
};

export const getExpiryDetails = () => {
    const expiry = localStorage.getItem(STORAGE_KEY_SUBSCRIPTION_EXPIRY);
    if (!expiry) return null;
    
    const expiryDate = parseInt(expiry);
    const msLeft = expiryDate - Date.now();
    const days = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    
    return { msLeft, days, date: new Date(expiryDate) };
};

export const submitPaymentRequest = (utr: string) => {
    const username = localStorage.getItem(STORAGE_KEY_USERNAME);
    if (!username) return;

    // Save status locally
    localStorage.setItem(STORAGE_KEY_SUBSCRIPTION_STATUS, 'pending');

    // Save request to global request list (Simulated Backend)
    const requests = JSON.parse(localStorage.getItem(GLOBAL_SUB_REQUESTS_KEY) || '[]');
    const newRequest = { username, utr, timestamp: Date.now(), status: 'pending' };
    
    // Remove old request if exists
    const filtered = requests.filter((r: any) => r.username !== username);
    filtered.push(newRequest);
    
    localStorage.setItem(GLOBAL_SUB_REQUESTS_KEY, JSON.stringify(filtered));

    // Broadcast to Admin
    socket.send({
        type: 'SUB_REQUEST',
        payload: newRequest
    });

    logUserAction('PAYMENT_SUBMITTED', username, `UTR: ${utr}`);
    notifySubscribers();
};

export const getSubscriptionRequests = () => {
    const requests = JSON.parse(localStorage.getItem(GLOBAL_SUB_REQUESTS_KEY) || '[]');
    return requests.filter((r: any) => r.status === 'pending');
};

export const approveSubscription = (username: string) => {
    // 1. Calculate Expiry
    const expiry = Date.now() + SUBSCRIPTION_DURATION_MS;

    // 2. Update Global Request Store
    const requests = JSON.parse(localStorage.getItem(GLOBAL_SUB_REQUESTS_KEY) || '[]');
    const updatedRequests = requests.map((r: any) => {
        if (r.username === username) return { ...r, status: 'approved', approvedAt: Date.now() };
        return r;
    });
    localStorage.setItem(GLOBAL_SUB_REQUESTS_KEY, JSON.stringify(updatedRequests));

    // 3. Broadcast Approval to User
    socket.send({
        type: 'SUB_APPROVED',
        payload: { username, expiry }
    });

    logUserAction('SUB_APPROVED', 'Admin', `Approved access for ${username} (28 days)`);
    notifySubscribers();
};

export const rejectSubscription = (username: string) => {
    const requests = JSON.parse(localStorage.getItem(GLOBAL_SUB_REQUESTS_KEY) || '[]');
    const updatedRequests = requests.filter((r: any) => r.username !== username);
    localStorage.setItem(GLOBAL_SUB_REQUESTS_KEY, JSON.stringify(updatedRequests));

    notifySubscribers();
    // User will essentially stay pending until they refresh or logic handles rejection, 
    // but for now we just remove it so they can resubmit.
    logUserAction('SUB_REJECTED', 'Admin', `Rejected payment for ${username}`);
};

// --- ADMIN PANEL FUNCTIONS ---

export const getSystemStats = () => {
    const localUsers = JSON.parse(localStorage.getItem(GLOBAL_USERS_KEY) || '[]');
    const totalUsers = localUsers.length;
    const activeUsers = Object.values(presenceState).filter(s => s === 'online').length;
    
    return {
        totalMessages: inMemoryMessages.length,
        totalUsers,
        activeUsers,
        serverTime: new Date().toISOString(),
        memoryUsage: Math.floor(Math.random() * 40) + 10 + 'MB' // Mock
    };
};

export const getAllUsers = () => {
    const localUsers = JSON.parse(localStorage.getItem(GLOBAL_USERS_KEY) || '[]');
    return [...localUsers].map((u: any) => ({
        ...u,
        status: presenceState[u.name] || u.status || 'offline',
        isBlocked: isUserBlocked(u.name)
    }));
};

export const getAllMessages = () => {
    return [...inMemoryMessages];
};

export const sendSystemBroadcast = (message: string) => {
    const broadcastMsg = {
        id: 'sys-' + Date.now(),
        text: `⚠️ SYSTEM ALERT: ${message}`,
        sender: 'System_Admin',
        receiver: 'ALL',
        timestamp: Date.now(),
        status: 'sent'
    };

    inMemoryMessages.push(broadcastMsg);
    notifySubscribers();

    socket.send({ type: 'CHAT_MESSAGE', payload: broadcastMsg });
};

export const nukeSystem = () => {
    localStorage.clear();
    location.reload();
};
