
export enum AppMode {
  CALCULATOR = 'CALCULATOR',
  ACCOUNT_SETUP = 'ACCOUNT_SETUP',
  PIN_SETUP = 'PIN_SETUP',
  PIN_ENTRY = 'PIN_ENTRY',
  LOGIN_SCREEN = 'LOGIN_SCREEN',
  DASHBOARD = 'DASHBOARD',
  SECURE_CHAT = 'SECURE_CHAT',
  ADMIN_PANEL = 'ADMIN_PANEL',
  SUBSCRIPTION = 'SUBSCRIPTION'
}

export type CallMode = 'audio' | 'video';

export interface Attachment {
  type: 'image' | 'file';
  url: string;
  name: string;
  size?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  reaction?: string;
  attachment?: Attachment;
  isEdited?: boolean;
  sender?: string;
  receiver?: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Contact {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  bio?: string;
  avatar?: string; // Base64 string or URL
  lastMessage?: string;
  lastTimestamp?: number;
  isAi?: boolean; // True if Gemini Bot, False if Real User
}

export enum KeyPadType {
  NUMBER = 'NUMBER',
  OPERATOR = 'OPERATOR',
  ACTION = 'ACTION', // Clear, Equals
  EMPTY = 'EMPTY'
}
