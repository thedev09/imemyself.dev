import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, Database, Clock } from 'lucide-react';
import { useTheme } from '../store/useTheme';
import { useVPSStatus } from '../hooks/useVPSStatus';
import { cn } from '../utils/cn';

export function TopBar() {
  const { theme } = useTheme();
  const { vpsStatus, isLoading } = useVPSStatus();

  const getCurrentSession = () => {
    const now = new Date();
    const hour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay();
    
    // Weekend check for FOREX markets
    const isForexWeekendClosed = 
      dayOfWeek === 6 || // Saturday
      (dayOfWeek === 0 && hour < 21) || // Sunday before Tokyo opens (21:00 UTC)
      (dayOfWeek === 5 && hour >= 20); // Friday after 20:00 UTC
    
    if (isForexWeekendClosed) {
      return 'Forex Market Closed';
    }
    
    const activeSessions = [];
    
    // Tokyo: 21:00-06:00 UTC (spans midnight) - This is 2:30AM-11:30AM IST
    if ((hour >= 21) || (hour < 6)) {
      activeSessions.push('Tokyo');
    }
    
    // London: 07:00-16:00 UTC
    if (hour >= 7 && hour < 16) {
      activeSessions.push('London');
    }
    
    // New York: 13:00-22:00 UTC
    if (hour >= 13 && hour < 22) {
      activeSessions.push('New York');
    }
    
    if (activeSessions.length === 0) {
      return 'Forex Market Closed';
    } else if (activeSessions.length === 1) {
      return `${activeSessions[0]} Session`;
    } else {
      return `${activeSessions.join(' + ')} Sessions`;
    }
  };

  return (
    <div className="fixed top-0 left-64 right-0 z-40">
      <div className={cn(
        "backdrop-blur-xl border-b transition-all duration-300",
        theme === 'dark' 
          ? "bg-dark-surface/90 border-dark-border" 
          : "bg-light-surface/90 border-light-border"
      )}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-end">
            {/* Status Indicators */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-6"
            >
              {/* Connection Status */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Wifi className={cn(
                    "w-4 h-4",
                    isLoading 
                      ? "text-gray-400" 
                      : vpsStatus.status === 'online' 
                        ? "text-green-400" 
                        : "text-red-400"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                  )}>
                    {isLoading 
                      ? 'VPS Loading...' 
                      : vpsStatus.status === 'online' 
                        ? 'VPS Online' 
                        : 'VPS Offline'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Database className={cn("w-4 h-4", "text-blue-400")} />
                  <span className={cn(
                    "text-sm font-medium",
                    theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                  )}>
                    3 Engines
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className={cn("w-4 h-4", "text-purple-400")} />
                  <span className={cn(
                    "text-sm font-medium",
                    theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                  )}>
                    {getCurrentSession()}
                  </span>
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}