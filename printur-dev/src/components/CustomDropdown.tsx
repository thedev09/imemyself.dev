import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../store/useTheme';
import { cn } from '../utils/cn';

export interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  minWidth?: string;
}

export function CustomDropdown({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select...', 
  className = '',
  minWidth = '70px'
}: CustomDropdownProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyPress(event: KeyboardEvent) {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div 
      ref={dropdownRef} 
      className={cn("relative", className)}
      style={{ minWidth }}
    >
      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-300",
          "hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-blue-400/30",
          theme === 'dark'
            ? "bg-card-dark text-dark-text-primary border-dark-border hover:border-blue-400/50"
            : "bg-card-light text-light-text-primary border-light-border hover:border-blue-400/50"
        )}
        style={{
          backgroundColor: theme === 'dark' ? '#252526' : '#f8f9fa',
          color: theme === 'dark' ? '#ffffff' : '#18181b',
          borderColor: theme === 'dark' ? '#333334' : '#e4e4e7'
        }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="truncate">
          {selectedOption?.label || placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3 ml-2 flex-shrink-0" />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute top-full left-0 right-0 mt-2 py-1 rounded-xl border backdrop-blur-xl z-50",
              "shadow-premium-lg max-h-60 overflow-y-auto",
              theme === 'dark'
                ? "bg-card-dark border-dark-border shadow-premium-dark-lg"
                : "bg-card-light border-light-border shadow-premium-lg"
            )}
            style={{
              background: theme === 'dark' 
                ? 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)'
                : 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.7) 100%)',
              backdropFilter: 'blur(12px)',
              borderColor: theme === 'dark' ? '#333334' : '#e4e4e7'
            }}
          >
            {options.map((option, index) => (
              <motion.button
                key={option.value}
                type="button"
                onClick={() => handleOptionClick(option.value)}
                className={cn(
                  "w-full px-3 py-2 text-left text-xs font-medium transition-all duration-150",
                  "focus:outline-none focus:ring-0 hover:outline-none",
                  option.value === value
                    ? theme === 'dark'
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-blue-500/10 text-blue-600"
                    : theme === 'dark'
                      ? "text-dark-text-primary hover:bg-white/5 hover:text-white"
                      : "text-light-text-primary hover:bg-black/5 hover:text-black"
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  outline: 'none',
                  boxShadow: 'none'
                }}
              >
                {option.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}