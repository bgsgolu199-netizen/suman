
import React, { useState, useEffect } from 'react';
import { Eraser } from 'lucide-react';
import { STORAGE_KEY_SECRET_CODE, STORAGE_KEY_IS_SETUP, ADMIN_CODE, STORAGE_KEY_USERNAME } from '../constants';

interface CalculatorProps {
  onSecretCodeEntered: (code?: string) => void;
  onAdminEnter: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ onSecretCodeEntered, onAdminEnter }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [lastInputWasOperator, setLastInputWasOperator] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Keyboard Event Listener
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          const key = e.key;
          if (/^[0-9a-zA-Z]$/.test(key)) handleNumber(key);
          else if (['+', '-', '*', '/'].includes(key)) handleOperator(key);
          else if (key === 'Enter' || key === '=') { e.preventDefault(); handleEquals(); }
          else if (key === 'Backspace') handleDelete();
          else if (key === 'Escape') handleClear();
          else if (key === '.') handleNumber('.');
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, equation, lastInputWasOperator]);

  const handleEquals = () => {
    const input = display;

    // Check Admin Code (Fallback trigger)
    if (input === ADMIN_CODE) {
        handleClear();
        onAdminEnter();
        return;
    }

    // Standard Calculator Logic
    try {
      if (/^[0-9+\-*/().\s]+$/.test(equation + display)) {
          // eslint-disable-next-line no-eval
          const result = eval(equation + display); 
          setDisplay(String(result));
          setEquation('');
          setLastInputWasOperator(true); 
      } else {
          setDisplay('Error');
          setEquation('');
      }
    } catch (e) {
      setDisplay('Error');
      setEquation('');
    }
  };

  const handleNumber = (num: string) => {
    if (display === '0' || lastInputWasOperator) {
      setDisplay(num);
      setLastInputWasOperator(false);
    } else {
      setDisplay(prev => prev + num);
    }
  };

  const handleOperator = (op: string) => {
    // 1. Admin Pattern: *ADMIN_CODE*
    if (op === '*' && equation === '0*' && display === ADMIN_CODE) {
        handleClear();
        onAdminEnter();
        return;
    }

    // 2. Gateway Pattern: *123*
    // This allows the user to enter the Login/Signup pages.
    if (op === '*') {
        if (equation === '0*' && display === '123') {
             handleClear();
             onSecretCodeEntered(); // Trigger App Mode Switch
             return;
        }
    }

    // Handle initial start with *
    if (op === '*' && display === '0' && equation === '') {
        setEquation('0*');
        setLastInputWasOperator(true);
        return;
    }
    
    setEquation(prev => prev + display + op);
    setLastInputWasOperator(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setLastInputWasOperator(false);
  };

  const handleDelete = () => {
    if (display.length > 1) {
      setDisplay(prev => prev.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const Button = ({ text, onClick, type = 'num', span = 1 }: any) => {
    let bgColor = 'bg-[#333333] active:bg-[#737373]';
    let textColor = 'text-white';
    if (type === 'op') { bgColor = 'bg-[#ff9f0a] active:bg-[#fbc78d]'; textColor = 'text-white text-3xl sm:text-4xl pb-1'; } 
    else if (type === 'action') { bgColor = 'bg-[#a5a5a5] active:bg-[#d4d4d2]'; textColor = 'text-black'; }

    return (
      <button
        onClick={onClick}
        className={`${bgColor} ${textColor} rounded-full flex items-center justify-center text-2xl sm:text-3xl font-medium transition-all duration-200`}
        style={{ 
            flex: span === 2 ? '2.1 1 0%' : '1 1 0%',
            aspectRatio: span === 2 ? 'auto' : '1/1',
            borderRadius: span === 2 ? '999px' : '50%',
            maxWidth: span === 2 ? 'none' : '80px'
        }}
      >
        <span className={span === 2 ? 'pl-[20%] text-left w-full' : ''}>{text}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-black pb-8 px-4 pt-4 md:pt-14 outline-none" tabIndex={0}>
      {toastMessage && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl z-50 text-sm font-semibold animate-in slide-in-from-top-4 fade-in">
            {toastMessage}
        </div>
      )}
      <div className="flex-1 flex flex-col justify-end items-end mb-4 px-2 min-h-[150px]">
        <div className="text-gray-500 text-xl font-light mb-1 min-h-[28px]">{equation}</div>
        <div className="text-white text-6xl sm:text-8xl font-light tracking-tight truncate w-full text-right leading-none">{display}</div>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-[420px] mx-auto pb-4 sm:pb-0">
        <div className="flex gap-3 w-full justify-between">
          <Button text="AC" type="action" onClick={handleClear} />
          <Button text={<Eraser size={28} />} type="action" onClick={handleDelete} />
          <Button text="%" type="action" onClick={() => handleOperator('/')} />
          <Button text="÷" type="op" onClick={() => handleOperator('/')} />
        </div>
        <div className="flex gap-3 w-full justify-between">
          <Button text="7" onClick={() => handleNumber('7')} />
          <Button text="8" onClick={() => handleNumber('8')} />
          <Button text="9" onClick={() => handleNumber('9')} />
          <Button text="×" type="op" onClick={() => handleOperator('*')} />
        </div>
        <div className="flex gap-3 w-full justify-between">
          <Button text="4" onClick={() => handleNumber('4')} />
          <Button text="5" onClick={() => handleNumber('5')} />
          <Button text="6" onClick={() => handleNumber('6')} />
          <Button text="−" type="op" onClick={() => handleOperator('-')} />
        </div>
        <div className="flex gap-3 w-full justify-between">
          <Button text="1" onClick={() => handleNumber('1')} />
          <Button text="2" onClick={() => handleNumber('2')} />
          <Button text="3" onClick={() => handleNumber('3')} />
          <Button text="+" type="op" onClick={() => handleOperator('+')} />
        </div>
        <div className="flex gap-3 w-full justify-between">
          <Button text="0" span={2} onClick={() => handleNumber('0')} />
          <Button text="." onClick={() => handleNumber('.')} />
          <Button text="=" type="op" onClick={handleEquals} />
        </div>
      </div>
    </div>
  );
};

export default Calculator;
