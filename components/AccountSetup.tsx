
import React, { useState, useRef } from 'react';
import { User, ShieldCheck, ChevronRight, Camera, Upload, AlertCircle, Bot, Lock } from 'lucide-react';
import { STORAGE_KEY_USERNAME, STORAGE_KEY_AVATAR } from '../constants';
import { registerUser } from '../services/chatService';

interface AccountSetupProps {
  onSuccess: () => void;
}

const AccountSetup: React.FC<AccountSetupProps> = ({ onSuccess }) => {
  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setError("Image too large. Max 2MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Username Regex Validation
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!alias.match(usernameRegex)) {
        setError("Username must contain only letters, numbers, underscore or dots.");
        return;
    }

    if (alias.length < 1) {
        setError("Username cannot be empty.");
        return;
    }

    // 2. Password Validation System
    // Rule: Alphanumeric only. No * allowed.
    if (password.includes('*')) {
        setError("Password cannot contain '*'.");
        return;
    }

    const passwordRegex = /^[a-zA-Z0-9]{4,20}$/;
    
    if (!passwordRegex.test(password)) {
        setError("Password must be 4-20 Alphanumeric characters.");
        return;
    }

    // 3. Human Verification
    if (!isHumanVerified) {
        setError("Verification required.");
        return;
    }

    setIsAnimating(true);
    
    // Simulate network registration
    setTimeout(() => {
      // 4. Try to register (Check uniqueness)
      const registrationStatus = registerUser(alias, password, avatarPreview);
      
      if (registrationStatus === 'USERNAME_TAKEN') {
          setIsAnimating(false);
          // STRICT ERROR MESSAGE AS REQUESTED
          setError("Username already exist choose unique");
          return;
      }
      
      // Success: Save user details locally
      localStorage.setItem(STORAGE_KEY_USERNAME, alias);
      if (avatarPreview) {
        localStorage.setItem(STORAGE_KEY_AVATAR, avatarPreview);
      }
      
      onSuccess();
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 items-center justify-center p-6 text-white overflow-y-auto no-scrollbar">
      <div className="w-full max-w-xs text-center">
        
        {/* Profile Pic Upload */}
        <div className="relative mx-auto w-24 h-24 mb-6 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className={`w-full h-full rounded-full border-2 flex items-center justify-center overflow-hidden
                ${error ? 'border-red-500 bg-red-900/20' : 'border-emerald-500/50 bg-emerald-900/20'}`}>
                {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <User className="text-emerald-500" size={40} />
                )}
            </div>
            
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" size={24} />
            </div>

            {isAnimating && (
                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
            )}
            
            <div className="absolute bottom-0 right-0 bg-emerald-600 rounded-full p-1.5 border border-gray-900 shadow-lg">
                <Upload size={14} className="text-white" />
            </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

        <h2 className="text-xl font-bold mb-2">Create Secure Account</h2>
        <p className="text-gray-400 text-xs mb-6">
          Set up your unique credentials for the vault.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Fake hidden inputs to trick Chrome autofill */}
          <input type="text" style={{display: 'none'}} />
          <input type="password" style={{display: 'none'}} />
          
          {/* Username Input */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <ShieldCheck className="text-gray-500 group-focus-within:text-emerald-500 transition-colors" size={16} />
            </div>
            <input
              type="text"
              name="new_vault_username"
              id="new_vault_username"
              autoComplete="off"
              value={alias}
              onChange={(e) => {
                  setAlias(e.target.value);
                  setError(null);
              }}
              placeholder="Username"
              className={`w-full bg-gray-800 border text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 transition-all placeholder-gray-600 text-sm
                ${error && error.includes('Username') ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-emerald-500'}`}
            />
          </div>

          {/* Password Input */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="text-gray-500 group-focus-within:text-emerald-500 transition-colors" size={16} />
            </div>
            <input
              type="password" 
              name="new_vault_password"
              id="new_vault_password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
              }}
              placeholder="Password (Alphanumeric)"
              className={`w-full bg-gray-800 border text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 transition-all placeholder-gray-600 text-sm
                ${error && error.includes('Password') ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-emerald-500'}`}
            />
          </div>
          
          <div className="text-[10px] text-slate-500 text-left pl-2 leading-tight">
             <b>Password:</b> Letters & Numbers only. No symbols.
          </div>

          {/* Human Verification */}
          <div 
             className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
             ${isHumanVerified 
                ? 'bg-emerald-900/20 border-emerald-500/50' 
                : 'bg-gray-800 border-gray-700 hover:bg-gray-750'}`}
             onClick={() => setIsHumanVerified(!isHumanVerified)}
          >
             <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                ${isHumanVerified ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'}`}>
                 {isHumanVerified && <User size={12} className="text-black" />}
             </div>
             <span className={`text-xs ${isHumanVerified ? 'text-emerald-400 font-medium' : 'text-gray-400'}`}>
                 I am human
             </span>
             {!isHumanVerified && <Bot size={14} className="ml-auto text-gray-600" />}
          </div>

          {error && (
              <div className="text-red-400 text-xs flex items-center justify-center animate-shake font-medium">
                  <AlertCircle size={12} className="mr-1" />
                  {error}
              </div>
          )}

          <button
            type="submit"
            disabled={isAnimating || !isHumanVerified}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center transition-all
              ${!isHumanVerified
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50'
              }`}
          >
            {isAnimating ? 'Creating Account...' : (
              <>
                Register Account <ChevronRight size={16} className="ml-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountSetup;
