import React from 'react';
import { Moon, Sun, Activity } from 'lucide-react';
import { useTheme } from '../store/useTheme';
import { useVPSStatus } from '../hooks/useVPSStatus';
import { cn } from '../utils/cn';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { vpsStatus, isLoading } = useVPSStatus();

  return (
    <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Printur
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Trading Dashboard
              </p>
            </div>
          </div>

          {/* System Status & Controls */}
          <div className="flex items-center space-x-4">
            {/* VPS Status Indicator */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isLoading 
                    ? "bg-gray-400 animate-pulse-soft" 
                    : vpsStatus.status === 'online' 
                      ? "bg-green-500 animate-pulse-soft" 
                      : "bg-red-500"
                )}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isLoading 
                    ? 'VPS Loading...' 
                    : vpsStatus.status === 'online' 
                      ? 'VPS Online' 
                      : 'VPS Offline'}
                </span>
              </div>
            </div>

            {/* Time Display */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-2 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm">
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {new Date().toLocaleTimeString()}
              </span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                "bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-700",
                "border border-gray-200 dark:border-gray-600",
                "hover:shadow-lg hover:scale-105"
              )}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-blue-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}