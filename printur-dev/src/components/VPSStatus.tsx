import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, Clock } from 'lucide-react';
import { dataService } from '../services/dataService';
import type { VPSStatus as VPSStatusType } from '../types';
import { cn } from '../utils/cn';

export function VPSStatus() {
  const [status, setStatus] = useState<VPSStatusType>({
    status: 'offline',
    message: 'Connecting...'
  });

  useEffect(() => {
    const unsubscribe = dataService.subscribeToVPSStatus(setStatus);
    return unsubscribe;
  }, []);

  const getStatusIcon = () => {
    switch (status.status) {
      case 'online':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <WifiOff className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'online':
        return 'border-green-500/30 bg-green-500/10';
      case 'warning':
        return 'border-orange-500/30 bg-orange-500/10';
      default:
        return 'border-red-500/30 bg-red-500/10';
    }
  };

  const formatUptime = (uptime?: number) => {
    if (!uptime) return 'Unknown';
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className={cn(
      "glass-card p-6 rounded-xl border-2",
      getStatusColor()
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          VPS Status
        </h3>
        {getStatusIcon()}
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
          <span className={cn(
            "text-sm font-medium capitalize",
            status.status === 'online' ? 'text-green-600 dark:text-green-400' :
            status.status === 'warning' ? 'text-orange-600 dark:text-orange-400' :
            'text-red-600 dark:text-red-400'
          )}>
            {status.status}
          </span>
        </div>

        {status.uptime && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {formatUptime(status.uptime)}
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {status.message}
          </p>
        </div>
      </div>

      {status.status === 'online' && (
        <div className="mt-3 flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-soft"></div>
          <span className="text-xs text-green-600 dark:text-green-400">
            Real-time data active
          </span>
        </div>
      )}
    </div>
  );
}