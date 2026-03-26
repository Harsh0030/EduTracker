import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

interface PickerProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  prefix?: string;
}

const Picker: React.FC<PickerProps> = ({ 
  label, 
  value, 
  options, 
  onChange, 
  icon, 
  placeholder = "Select", 
  disabled = false, 
  prefix = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98] ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-200'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="text-red-600 shrink-0">{icon}</div>
          <span className={`font-bold truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
            {value ? (value === 'All' ? `All ${label}s` : value === 'None' ? 'None' : `${prefix}${value}`) : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[2px]" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-h-64 flex flex-col"
            >
              <div className="overflow-y-auto py-2 scrollbar-hide">
                {options.length > 0 ? (
                  options.map((opt) => (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => {
                        onChange(opt);
                        setIsOpen(false);
                      }}
                      className={`w-full px-6 py-4 text-left font-bold transition-colors flex items-center justify-between ${
                        value === opt ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{opt === 'All' ? `All ${label}s` : opt === 'None' ? 'None' : `${prefix}${opt}`}</span>
                      {value === opt && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-gray-400 text-sm font-medium">
                    No options available
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Picker;
