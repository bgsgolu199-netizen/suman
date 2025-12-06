
import React, { useState } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';
import Calculator from './components/Calculator';
import PinPad from './components/PinPad';
import LoginScreen from './components/LoginScreen';
import SecureChat from './components/SecureChat';
import AccountSetup from './components/AccountSetup';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import SubscriptionScreen from './components/SubscriptionScreen';
import { AppMode, Contact } from './types';
import { STORAGE_KEY_IS_SETUP, STORAGE_KEY_USERNAME, EXPIRY_WARNING_MS } from './constants';
import { resetChat } from './services/geminiService';
import { getSubscriptionStatus, getExpiryDetails } from './services/chatService';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.CALCULATOR);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);

  const handleSecretCode = () => {
    const username = localStorage.getItem(STORAGE_KEY_USERNAME);
    const isPinSetup = localStorage.getItem(STORAGE_KEY_IS_SETUP) === 'true';

    if (!username) {
        // No user yet -> Go to Signup
        setCurrentMode(AppMode.ACCOUNT_SETUP);
    } else {
        // User exists -> Go to Login
        setCurrentMode(AppMode.LOGIN_SCREEN);
    }
  };

  const handleAdminEnter = () => {
      setCurrentMode(AppMode.ADMIN_PANEL);
  };

  const checkSubAndRedirect = () => {
      const subStatus = getSubscriptionStatus();
      const expiryDetails = getExpiryDetails();

      if (subStatus === 'active') {
          // Check if expiring soon (Notification interception)
          if (expiryDetails && expiryDetails.msLeft < EXPIRY_WARNING_MS) {
              setCurrentMode(AppMode.SUBSCRIPTION);
          } else {
              setCurrentMode(AppMode.DASHBOARD);
          }
      } else {
          setCurrentMode(AppMode.SUBSCRIPTION);
      }
  };

  const handleAccountSuccess = () => {
      checkSubAndRedirect();
  };
  
  const handlePinSuccess = () => checkSubAndRedirect();
  
  const handleLoginSuccess = () => {
      checkSubAndRedirect();
  };

  const handleSubscriptionSuccess = () => {
      setCurrentMode(AppMode.DASHBOARD);
  };

  const handleContactSelect = (contact: Contact) => {
    setActiveContact(contact);
    setCurrentMode(AppMode.SECURE_CHAT);
  };

  const handleBackToDashboard = () => {
    setActiveContact(null);
    resetChat();
    setCurrentMode(AppMode.DASHBOARD);
  };

  const handleLogout = () => {
    setCurrentMode(AppMode.CALCULATOR);
    setActiveContact(null);
    resetChat();
  };

  const renderContent = () => {
    switch (currentMode) {
      case AppMode.CALCULATOR: return <Calculator onSecretCodeEntered={handleSecretCode} onAdminEnter={handleAdminEnter} />;
      case AppMode.ACCOUNT_SETUP: return <AccountSetup onSuccess={handleAccountSuccess} />;
      case AppMode.PIN_SETUP: return <PinPad mode="setup" onSuccess={handlePinSuccess} />;
      case AppMode.PIN_ENTRY: return <PinPad mode="unlock" onSuccess={handlePinSuccess} />;
      case AppMode.LOGIN_SCREEN: return <LoginScreen onSuccess={handleLoginSuccess} />;
      case AppMode.SUBSCRIPTION: return <SubscriptionScreen onSuccess={handleSubscriptionSuccess} />;
      case AppMode.DASHBOARD: return <Dashboard onSelectContact={handleContactSelect} onLogout={handleLogout} />;
      case AppMode.SECURE_CHAT: return activeContact ? <SecureChat contact={activeContact} onBack={handleBackToDashboard} /> : <Dashboard onSelectContact={handleContactSelect} onLogout={handleLogout} />;
      case AppMode.ADMIN_PANEL: return <AdminPanel onExit={handleLogout} />;
      default: return <Calculator onSecretCodeEntered={handleSecretCode} onAdminEnter={handleAdminEnter} />;
    }
  };

  return (
    <div className="h-screen w-screen bg-black md:bg-[#121212] flex items-center justify-center md:p-8 overflow-hidden">
        <div className="relative w-full h-full md:max-w-[420px] md:max-h-[880px] bg-black md:rounded-[50px] md:shadow-[0_0_0_12px_#2a2a2a,0_0_50px_rgba(0,0,0,0.5)] overflow-hidden md:border-[8px] md:border-black md:ring-1 md:ring-white/10 flex flex-col">
            <div className="hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-50 items-center justify-center">
                <div className="w-16 h-4 bg-black rounded-full flex gap-2 items-center justify-center px-2">
                    <div className="w-1.5 h-1.5 bg-[#0f3622] rounded-full animate-pulse"></div>
                </div>
            </div>

            <div className="hidden md:flex absolute top-0 left-0 w-full px-6 py-3 justify-between items-start z-40 text-white mix-blend-difference pointer-events-none">
                <span className="text-sm font-semibold tracking-wide pl-2">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <div className="flex gap-2 items-center pr-2">
                    <Signal size={14} fill="currentColor" />
                    <Wifi size={14} />
                    <Battery size={18} fill="currentColor" />
                </div>
            </div>

            <div className="flex-1 w-full h-full bg-black relative overflow-hidden flex flex-col">
                {renderContent()}
            </div>
            
            <div className="hidden md:block absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full z-50"></div>
        </div>
    </div>
  );
};

export default App;
