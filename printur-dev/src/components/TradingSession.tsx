import React, { useState, useEffect } from 'react';
import { Globe, Clock } from 'lucide-react';
import type { TradingSession as TradingSessionType } from '../types';
import { cn } from '../utils/cn';

export function TradingSession() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const sessions: TradingSessionType[] = [
    {
      name: 'Tokyo',
      timezone: 'Asia/Tokyo',
      isActive: isSessionActive('Tokyo'),
      openTime: '00:00',
      closeTime: '09:00',
      currentTime: getCurrentTime('Asia/Tokyo')
    },
    {
      name: 'London',
      timezone: 'Europe/London', 
      isActive: isSessionActive('London'),
      openTime: '08:00',
      closeTime: '17:00',
      currentTime: getCurrentTime('Europe/London')
    },
    {
      name: 'New York',
      timezone: 'America/New_York',
      isActive: isSessionActive('New York'),
      openTime: '13:00',
      closeTime: '22:00',
      currentTime: getCurrentTime('America/New_York')
    }
  ];

  function isSessionActive(sessionName: string): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    
    switch (sessionName) {
      case 'Tokyo':
        return utcHour >= 0 && utcHour < 9;
      case 'London':
        return utcHour >= 8 && utcHour < 17;
      case 'New York':
        return utcHour >= 13 && utcHour < 22;
      default:
        return false;
    }
  }

  function getCurrentTime(timezone: string): string {
    try {
      return new Date().toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--:--';
    }
  }

  const activeSessions = sessions.filter(s => s.isActive);

  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Trading Sessions
        </h3>
        <Globe className="w-5 h-5 text-blue-500" />
      </div>

      <div className="space-y-4">
        {/* Current Time Display */}
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">UTC Time</span>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {currentTime.toUTCString().split(' ')[4]}
              </span>
            </div>
          </div>
        </div>

        {/* Active Sessions Summary */}
        {activeSessions.length > 0 ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-soft"></div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Active Now ({activeSessions.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeSessions.map((session) => (
                <span
                  key={session.name}
                  className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-300 rounded text-xs font-medium"
                >
                  {session.name}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-orange-600 dark:text-orange-400">
                Market overlap period - reduced volatility expected
              </span>
            </div>
          </div>
        )}

        {/* All Sessions */}
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.name}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg transition-all",
                session.isActive 
                  ? "bg-green-500/10 border border-green-500/20" 
                  : "bg-gray-100/50 dark:bg-gray-800/30"
              )}
            >
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  session.isActive ? "bg-green-500 animate-pulse-soft" : "bg-gray-400"
                )}></div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {session.name}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
                  {session.currentTime}
                </div>
                <div className="text-xs text-gray-500">
                  {session.openTime} - {session.closeTime} UTC
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}