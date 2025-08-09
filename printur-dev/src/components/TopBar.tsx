import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Database, Clock } from 'lucide-react';
import { useTheme } from '../store/useTheme';
import { useVPSStatus } from '../hooks/useVPSStatus';
import { cn } from '../utils/cn';

export function TopBar() {
  const { theme } = useTheme();
  const { vpsStatus, isLoading } = useVPSStatus();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning, champion!';
    if (hour < 17) return 'Good afternoon, champion!';
    return 'Good evening, champion!';
  };

  // Format the current time
  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Format the current date in smooth format
  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

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
          <div className="flex items-center justify-between">
            {/* Greeting + Time */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-2xl"
              >
                👋
              </motion.div>
              <div className="flex flex-col">
                <div className={cn(
                  "text-lg font-medium",
                  theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                )}>
                  {getGreeting()}
                </div>
                <div className={cn(
                  "text-xs font-mono",
                  theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                )}>
                  {formatTime()} • {formatDate()}
                </div>
              </div>
            </motion.div>

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