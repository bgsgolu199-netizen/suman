
import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Shield, Lock, Zap, Calendar, User, QrCode, AlertTriangle, ArrowRight } from 'lucide-react';
import { subscribeToMessages, getSubscriptionStatus, submitPaymentRequest, getExpiryDetails } from '../services/chatService';
import { EXPIRY_WARNING_MS } from '../constants';

interface SubscriptionScreenProps {
  onSuccess: () => void;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onSuccess }) => {
  const [status, setStatus] = useState<'none' | 'pending' | 'active' | 'expired'>('none');
  const [utr, setUtr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiryWarning, setExpiryWarning] = useState<{ days: number, date: Date } | null>(null);
  
  // Image handling
  const [qrSource, setQrSource] = useState('/scanner.jpg');
  const [imgLoadError, setImgLoadError] = useState(false);

  useEffect(() => {
    // Initial check
    checkStatus();
    
    // Poll for status updates (in case of background approval)
    const interval = setInterval(checkStatus, 3000);

    const unsubscribe = subscribeToMessages(() => {
        checkStatus();
    });

    return () => { 
        unsubscribe(); 
        clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkStatus = () => {
    const currentStatus = getSubscriptionStatus();
    setStatus(currentStatus);

    if (currentStatus === 'active') {
        const details = getExpiryDetails();
        // If not expiring soon, just success
        if (details && details.msLeft > EXPIRY_WARNING_MS) {
            onSuccess();
        } else if (details && details.msLeft <= EXPIRY_WARNING_MS && details.msLeft > 0) {
            // Expiring soon: Show warning UI (do not auto redirect yet)
            setExpiryWarning({ days: details.days, date: details.date });
        } else {
             // Just in case calculation sends it here
             onSuccess();
        }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate UTR: Must be exactly 12 digits
    const utrRegex = /^\d{12}$/;
    if (!utrRegex.test(utr)) {
        setError("UTR number must be exactly 12 digits.");
        return;
    }

    setIsSubmitting(true);
    
    // Simulate Network Request
    setTimeout(() => {
        submitPaymentRequest(utr);
        setIsSubmitting(false);
        setStatus('pending');
    }, 1000);
  };

  const handleImageError = () => {
      if (!imgLoadError) {
          console.warn("Local scanner.jpg not found, switching to backup generator.");
          setImgLoadError(true);
          // Fallback to a generated QR code if local file fails
          setQrSource('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=admin@upi&pn=CalcVault&am=5.00&cu=INR');
      }
  };

  if (status === 'pending') {
      return (
        <div className="flex flex-col h-full bg-[#0a0a0c] text-white items-center justify-center p-8 text-center relative overflow-hidden">
             {/* Background Pulse */}
             <div className="absolute inset-0 bg-yellow-500/5 animate-pulse"></div>
             
             <div className="relative z-10 w-20 h-20 bg-[#161618] rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-yellow-500/50">
                 <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
             
             <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Payment Verification</h2>
             <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                 Your UTR <span className="font-mono text-yellow-500 font-bold">{utr}</span> is being reviewed by the administrator. 
             </p>
             <p className="text-slate-500 text-xs mt-4">
                 This usually takes 10-30 minutes. You will be redirected automatically once approved.
             </p>

             <div className="mt-8 bg-[#161618] px-4 py-2 rounded-lg border border-white/5 text-[10px] text-slate-500">
                 SESSION ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
             </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="flex-1 flex flex-col items-center p-6 relative z-10 overflow-y-auto">
        
        {expiryWarning ? (
            <div className="w-full bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 mb-4 flex flex-col items-center text-center animate-in slide-in-from-top-4">
                <AlertTriangle className="text-yellow-500 mb-2" size={24} />
                <h3 className="text-yellow-500 font-bold text-sm uppercase tracking-wide">Subscription Expiring Soon</h3>
                <p className="text-slate-300 text-xs mt-1">
                    Your plan expires in <span className="text-white font-bold">{expiryWarning.days} day(s)</span> on {expiryWarning.date.toLocaleDateString()}.
                </p>
                <button 
                    onClick={onSuccess}
                    className="mt-3 flex items-center gap-1 text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors"
                >
                    Continue to App (Remind Later) <ArrowRight size={12} />
                </button>
            </div>
        ) : (
            <>
                <div className="w-12 h-12 bg-[#1c1c1e] rounded-xl flex items-center justify-center mb-4 shadow-xl shadow-emerald-900/20 border border-white/5">
                    <Shield className="text-emerald-500" size={24} />
                </div>
                <h2 className="text-xl font-bold mb-1 tracking-tight">Premium Access</h2>
                <p className="text-slate-400 text-center text-xs mb-6 max-w-[280px]">
                    To access the encrypted network, a monthly fee of <b>₹5.00</b> is required.
                </p>
            </>
        )}

        {/* QR Scanner Area */}
        <div className="bg-white rounded-3xl shadow-2xl mb-8 w-72 h-72 flex items-center justify-center relative overflow-hidden border-4 border-white group">
            <img 
                src={qrSource} 
                alt="Payment QR" 
                className="w-full h-full object-fill"
                onError={handleImageError} 
            />
            
            {/* Fallback Text if using generator */}
            {imgLoadError && (
                <div className="absolute bottom-2 bg-black/50 text-white text-[9px] px-2 py-0.5 rounded-full backdrop-blur-md">
                    Backup Scanner Active
                </div>
            )}
            
            {/* Corner Markers */}
            <div className="absolute top-2 left-2 w-6 h-6 border-l-4 border-t-4 border-black/80 rounded-tl-lg pointer-events-none"></div>
            <div className="absolute top-2 right-2 w-6 h-6 border-r-4 border-t-4 border-black/80 rounded-tr-lg pointer-events-none"></div>
            <div className="absolute bottom-2 left-2 w-6 h-6 border-l-4 border-b-4 border-black/80 rounded-bl-lg pointer-events-none"></div>
            <div className="absolute bottom-2 right-2 w-6 h-6 border-r-4 border-b-4 border-black/80 rounded-br-lg pointer-events-none"></div>
        </div>

        {/* Payment Form */}
        <div className="w-full max-w-xs space-y-4">
            <div className="text-center text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">
                {expiryWarning ? 'Renew Now' : 'Step 1: Scan & Pay ₹5.00'}
            </div>
            
            <div className="bg-[#161618] border border-white/10 rounded-xl p-4">
                <div className="text-center text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Enter UTR Number</div>
                <form onSubmit={handleSubmit}>
                    <div className="relative mb-3">
                        <input 
                            type="text" 
                            value={utr}
                            maxLength={12}
                            onChange={(e) => {
                                // Allow only numbers
                                const val = e.target.value.replace(/\D/g, '');
                                setUtr(val);
                                setError(null);
                            }}
                            placeholder="e.g. 123456789012"
                            className={`w-full bg-black border text-white text-center tracking-[0.2em] font-mono text-sm rounded-lg py-3 px-4 focus:outline-none focus:ring-1 transition-all
                                ${error ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-emerald-500'}`}
                        />
                        {utr.length === 12 && (
                            <div className="absolute right-3 top-3.5 text-emerald-500 animate-in zoom-in">
                                <CheckCircle size={14} />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="text-red-500 text-xs text-center mb-3 font-medium animate-shake">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isSubmitting || utr.length !== 12}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-900/20"
                    >
                        {isSubmitting ? 'Verifying...' : (expiryWarning ? 'Renew Subscription' : 'Submit Payment')}
                    </button>
                </form>
            </div>
        </div>

        <div className="mt-auto pt-6 pb-2 flex items-center gap-4 text-[9px] text-slate-600 uppercase tracking-widest">
            <span className="flex items-center gap-1"><Lock size={10} /> 256-BIT ENCRYPTION</span>
            <span className="flex items-center gap-1"><Zap size={10} /> INSTANT ACCESS</span>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionScreen;
