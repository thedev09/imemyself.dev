import { create } from 'zustand';
import type { Theme } from '../types';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Initialize theme from localStorage
const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'dark';
  }
  return 'dark';
};

export const useTheme = create<ThemeStore>()((set, get) => ({
  theme: getInitialTheme(),
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: newTheme });
    
    // Update DOM and localStorage
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
  },
  setTheme: (theme: Theme) => {
    set({ theme });
    
    // Update DOM and localStorage
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  },
}));