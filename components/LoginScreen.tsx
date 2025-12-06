
import React, { useState } from 'react';
import { ShieldCheck, ChevronRight, User, LockKeyhole, AlertTriangle, Lock } from 'lucide-react';
import { STORAGE_KEY_USERNAME, STORAGE_KEY_AVATAR, STORAGE_KEY_SECRET_CODE } from '../constants';
import { logUserAction } from '../services/chatService';

interface LoginScreenProps {
  onSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const storedUsername = localStorage.getItem(STORAGE_KEY_USERNAME);
  const storedAvatar = localStorage.getItem(STORAGE_KEY_AVATAR);
  const storedCode = localStorage.getItem(STORAGE_KEY_SECRET_CODE);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUsername.trim() || !inputPassword.trim()) return;

    setIsVerifying(true);
    setError(null);

    setTimeout(() => {
        // Validate both Username and Password (Secret Code)
        if (
            storedUsername && 
            storedCode &&
            inputUsername.trim() === storedUsername &&
            inputPassword.trim() === storedCode
        ) {
            setIsVerifying(false);
            logUserAction('LOGIN_SUCCESS', storedUsername, 'Identity verified');
            onSuccess();
        } else {
            setIsVerifying(false);
            setError("Invalid Username or Password");
            triggerShake();
            logUserAction('LOGIN_FAILED', inputUsername, 'Invalid credentials');
        }
    }, 1000);
  };

  const triggerShake = () => {
      setShake(true);
      setTimeout(() => setShake(false), 400);
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-sm z-10 text-center">
        <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 flex items-center justify-center bg-[#1c1c1e] rounded-full border border-white/10 shadow-2xl overflow-hidden">
                {storedAvatar ? (
                    <img src={storedAvatar} alt="Profile" className="w-full h-full object-cover opacity-20 grayscale" />
                ) : (
                    <User size={40} className="text-emerald-900" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                    <LockKeyhole size={32} className="text-emerald-500" />
                </div>
            </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            Secure Login
        </h2>
        <p className="text-slate-500 text-sm mb-8">
            Enter credentials to decrypt vault.
        </p>

        <form onSubmit={handleLogin} className={`space-y-4 ${shake ? 'animate-shake' : ''}`} autoComplete="off">
             {/* Fake hidden inputs to trick Chrome autofill */}
             <input type="text" style={{display: 'none'}} />
             <input type="password" style={{display: 'none'}} />

             <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-gray-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                </div>
                <input
                  type="text"
                  name="vault_username_entry"
                  id="vault_username_entry"
                  autoComplete="off"
                  value={inputUsername}
                  onChange={(e) => {
                      setInputUsername(e.target.value);
                      setError(null);
                  }}
                  placeholder="Username"
                  className={`w-full bg-[#1c1c1e] border text-white rounded-xl py-3.5 pl-10 pr-4 focus:outline-none focus:ring-1 transition-all placeholder-gray-600
                    ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-emerald-500'}`}
                  autoFocus
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                </div>
                <input
                  type="password" 
                  name="vault_password_entry"
                  id="vault_password_entry"
                  autoComplete="new-password"
                  value={inputPassword}
                  onChange={(e) => {
                      setInputPassword(e.target.value);
                      setError(null);
                  }}
                  placeholder="Password"
                  className={`w-full bg-[#1c1c1e] border text-white rounded-xl py-3.5 pl-10 pr-4 focus:outline-none focus:ring-1 transition-all placeholder-gray-600 font-mono tracking-widest
                    ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-emerald-500'}`}
                />
              </div>

            <button 
                type="submit"
                disabled={isVerifying || !inputUsername || !inputPassword}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
                {isVerifying ? (
                    <span className="flex items-center gap-2 text-emerald-200">
                        <ShieldCheck size={18} className="animate-bounce" /> Verifying...
                    </span>
                ) : (
                    <>
                       Access Vault
                       <ChevronRight size={18} />
                    </>
                )}
            </button>
        </form>

        {error && (
            <div className="mt-6 flex items-center justify-center gap-2 text-red-500 text-sm font-medium animate-in slide-in-from-top-2">
                <AlertTriangle size={16} />
                {error}
            </div>
        )}
      </div>

      <div className="absolute bottom-10 flex flex-col items-center gap-2 text-slate-700 opacity-60">
        <span className="text-[10px] tracking-widest uppercase">AES-256 Encryption Active</span>
      </div>
    </div>
  );
};

export default LoginScreen;
