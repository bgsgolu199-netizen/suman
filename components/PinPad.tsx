import React, { useState, useEffect } from 'react';
import { Lock, Delete, AlertTriangle } from 'lucide-react';
import { PIN_LENGTH, STORAGE_KEY_PIN, STORAGE_KEY_IS_SETUP } from '../constants';

interface PinPadProps {
  onSuccess: () => void;
  mode: 'setup' | 'unlock';
}

const PinIndicator: React.FC<{ active: boolean, isError: boolean }> = ({ active, isError }) => (
  <div 
      className={`w-4 h-4 rounded-full border-2 mx-2 transition-all duration-300
      ${active ? (isError ? 'bg-red-500 border-red-500' : 'bg-green-500 border-green-500') : 'bg-transparent border-gray-600'}`}
  />
);

const PinPad: React.FC<PinPadProps> = ({ onSuccess, mode }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>(mode === 'setup' ? 'enter' : 'enter');
  const [isShake, setIsShake] = useState(false);

  const handleNumber = (num: string) => {
    if (error) setError('');
    if (isShake) setIsShake(false);

    if (mode === 'setup') {
        if (step === 'enter') {
            if (pin.length < PIN_LENGTH) setPin(prev => prev + num);
        } else {
            if (confirmPin.length < PIN_LENGTH) setConfirmPin(prev => prev + num);
        }
    } else {
        if (pin.length < PIN_LENGTH) setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    if (mode === 'setup' && step === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
    setError('');
  };

  // Auto-submit when length reached
  useEffect(() => {
    const checkPin = () => {
        if (mode === 'setup') {
            if (step === 'enter' && pin.length === PIN_LENGTH) {
                setTimeout(() => {
                    setStep('confirm');
                }, 300);
            } else if (step === 'confirm' && confirmPin.length === PIN_LENGTH) {
                if (pin === confirmPin) {
                    localStorage.setItem(STORAGE_KEY_PIN, pin);
                    localStorage.setItem(STORAGE_KEY_IS_SETUP, 'true');
                    onSuccess();
                } else {
                    triggerError("PINs do not match");
                    setConfirmPin('');
                    setStep('enter');
                    setPin('');
                }
            }
        } else {
            // Unlock mode
            if (pin.length === PIN_LENGTH) {
                const storedPin = localStorage.getItem(STORAGE_KEY_PIN);
                if (pin === storedPin) {
                    onSuccess();
                } else {
                    triggerError("Incorrect PIN");
                    setTimeout(() => setPin(''), 400);
                }
            }
        }
    };

    checkPin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, confirmPin, mode, step, onSuccess]);

  const triggerError = (msg: string) => {
    setError(msg);
    setIsShake(true);
    setTimeout(() => setIsShake(false), 400);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 items-center justify-center p-6">
      <div className="mb-10 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 border border-gray-700">
            <Lock className="text-emerald-500" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
            {mode === 'setup' 
                ? (step === 'enter' ? "Set New PIN" : "Confirm PIN") 
                : "Security Check"}
        </h2>
        <p className="text-gray-400 text-sm">
            {error || (mode === 'setup' ? "Enter a 4-digit code" : "Enter PIN to access vault")}
        </p>
      </div>

      <div className={`flex justify-center mb-12 ${isShake ? 'animate-shake' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <PinIndicator 
                key={i} 
                active={i < (mode === 'setup' && step === 'confirm' ? confirmPin.length : pin.length)} 
                isError={!!error}
            />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumber(num.toString())}
            className="w-16 h-16 rounded-full bg-gray-800 text-white text-2xl font-medium active:bg-gray-700 transition-colors border border-gray-700 hover:border-emerald-500/50"
          >
            {num}
          </button>
        ))}
        <div /> {/* Spacer */}
        <button
          onClick={() => handleNumber('0')}
          className="w-16 h-16 rounded-full bg-gray-800 text-white text-2xl font-medium active:bg-gray-700 transition-colors border border-gray-700 hover:border-emerald-500/50"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-16 h-16 rounded-full flex items-center justify-center text-gray-400 active:text-white transition-colors"
        >
          <Delete size={24} />
        </button>
      </div>

      <div className="mt-8 text-xs text-gray-600 flex items-center">
        <AlertTriangle size={12} className="mr-1" />
        Secure Environment Active
      </div>
    </div>
  );
};

export default PinPad;