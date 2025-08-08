import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Wifi, Database, Activity, AlertCircle, CheckCircle, Clock, Cpu, MemoryStick, HardDrive, Globe, Zap, RefreshCw, Shield } from 'lucide-react';
import { dataService, type SystemStatus } from '../services/dataService';
import { useTheme } from '../store/useTheme';
import { cn } from '../utils/cn';

export function Status() {
  const { theme } = useTheme();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Status page: Setting up system status subscription');
    
    const unsubscribe = dataService.subscribeToSystemStatus((status) => {
      console.log('Status page: Received system status', status);
      setSystemStatus(status);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refreshStatus = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  if (isLoading || !systemStatus) {
    return (
      <div className="min-h-screen pb-24 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Activity className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className={cn(
            theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
          )}>Loading system status...</p>
        </motion.div>
      </div>
    );
  }

  const getEngineLabel = (engine: string) => {
    switch (engine) {
      case 'v1': return 'Smart Engine';
      case 'v2': return 'AI Enhanced';
      case 'v3': return 'Simple Engine';
      default: return engine;
    }
  };

  const getEngineGradient = (engine: string) => {
    switch (engine) {
      case 'v1': return 'bg-premium-blue';
      case 'v2': return 'bg-premium-purple';
      case 'v3': return 'bg-premium-cyan';
      default: return 'bg-gray-500';
    }
  };

  const getSessionStatus = (session: string) => {
    const now = new Date();
    const hour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay(); // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
    
    // Special handling for crypto (BTC) - trades 24/7
    if (session === 'crypto' || session === 'btc') {
      return 'Active 24/7';
    }
    
    let sessionTimes: { start: number; end: number };
    
    switch(session) {
      case 'tokyo':
        sessionTimes = { start: 21, end: 6 }; // 21:00-06:00 UTC (spans midnight) - This is 2:30AM-11:30AM IST
        break;
      case 'london': 
        sessionTimes = { start: 7, end: 16 }; // 07:00-16:00 UTC
        break;
      case 'newyork':
        sessionTimes = { start: 13, end: 22 }; // 13:00-22:00 UTC
        break;
      default:
        return 'Closed';
    }
    
    // Weekend check - FOREX markets closed from Friday 20:00 UTC to Sunday 21:00 UTC (for Tokyo)
    const isForexWeekendClosed = 
      dayOfWeek === 6 || // Saturday
      (dayOfWeek === 0 && hour < (session === 'tokyo' ? 21 : 7)) || // Sunday before Tokyo opens (21:00) or London/NY opens (Monday)
      (dayOfWeek === 5 && hour >= 20); // Friday after 20:00
    
    if (isForexWeekendClosed) {
      return 'Forex market closed';
    }
    
    // For sessions that span midnight (Tokyo) - only during weekdays
    if (sessionTimes.start > sessionTimes.end) {
      if ((hour >= sessionTimes.start) || (hour < sessionTimes.end)) {
        return 'In session';
      }
      // Calculate hours until next opening (same day or next day)
      let hoursUntil = sessionTimes.start - hour;
      if (hoursUntil <= 0) hoursUntil += 24;
      return hoursUntil <= 0 ? 'Opens soon' : `Opens in ${hoursUntil}h`;
    } else {
      // Regular sessions (London, New York) - only during weekdays
      if (hour >= sessionTimes.start && hour < sessionTimes.end) {
        return 'In session';
      }
      // Calculate hours until next opening
      let hoursUntil = sessionTimes.start - hour;
      if (hoursUntil <= 0) hoursUntil += 24; // Next day
      return hoursUntil <= 0 ? 'Opens soon' : `Opens in ${hoursUntil}h`;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className={cn(
              "text-3xl font-bold mb-2",
              theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
            )}>
              System Status
            </h1>
            <p className={cn(
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              Monitor your trading infrastructure
            </p>
          </div>
          
          <button
            onClick={refreshStatus}
            className={cn(
              "flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105",
              theme === 'dark'
                ? "bg-card-dark hover:bg-card-hover-dark border-dark-border text-dark-text-primary"
                : "bg-card-light hover:bg-card-hover-light border-light-border text-light-text-primary",
              "backdrop-blur-xl border",
              refreshing && "animate-pulse"
            )}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Overall Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          "backdrop-blur-xl border rounded-2xl p-6 mb-8 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              systemStatus.vps.status === 'online' 
                ? "bg-premium-blue"
                : systemStatus.vps.status === 'warning'
                ? "bg-premium-purple"
                : "bg-gradient-to-r from-red-500 to-red-600"
            )}>
              <Server className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className={cn(
                "text-2xl font-bold",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                {systemStatus.vps.status === 'online' 
                  ? 'All Systems Operational' 
                  : systemStatus.vps.status === 'warning'
                  ? 'System Warning'
                  : 'System Offline'}
              </h2>
              <p className={cn(
                "text-sm",
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              systemStatus.vps.status === 'online' 
                ? theme === 'dark' ? "bg-trading-up-dark" : "bg-trading-up-light"
                : systemStatus.vps.status === 'warning'
                ? theme === 'dark' ? "bg-status-warning-dark" : "bg-status-warning-light"
                : theme === 'dark' ? "bg-trading-down-dark" : "bg-trading-down-light"
            )} />
            <span className={cn(
              "font-semibold uppercase text-sm",
              systemStatus.vps.status === 'online' 
                ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                : systemStatus.vps.status === 'warning'
                ? theme === 'dark' ? "text-status-warning-dark" : "text-status-warning-light"
                : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
            )}>
              {systemStatus.vps.status === 'online' ? 'Online' : systemStatus.vps.status}
            </span>
          </div>
        </div>
      </motion.div>

      {/* VPS Server Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className={cn(
          "text-xl font-semibold mb-4",
          theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
        )}>
          VPS Server
        </h2>
        
        <div className={cn(
          "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          {/* Server Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className={cn(
                  "w-4 h-4",
                  theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                )} />
                <span className={cn(
                  "text-xs uppercase font-medium",
                  theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                )}>
                  Status
                </span>
              </div>
              <div className={cn(
                "text-2xl font-bold",
                systemStatus.vps.status === 'online' 
                  ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                  : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
              )}>
                {systemStatus.vps.status.toUpperCase()}
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className={cn(
                  "text-xs uppercase font-medium",
                  theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                )}>
                  Uptime
                </span>
              </div>
              <div className={cn(
                "text-2xl font-bold",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                {systemStatus.vps.uptime}
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span className={cn(
                  "text-xs uppercase font-medium",
                  theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                )}>
                  Location
                </span>
              </div>
              <div className={cn(
                "text-2xl font-bold",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                {systemStatus.vps.location}
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className={cn(
                  "text-xs uppercase font-medium",
                  theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                )}>
                  Monitoring
                </span>
              </div>
              <div className={cn(
                "text-2xl font-bold text-cyan-400"
              )}>
                24/7
              </div>
            </div>
          </div>

          {/* Resource Usage */}
          <div className="space-y-4">
            {/* CPU Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <span className={cn(
                    "text-sm font-medium",
                    theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                  )}>
                    CPU Usage
                  </span>
                </div>
                <span className={cn(
                  "text-sm font-bold",
                  theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                )}>
                  {systemStatus.vps.cpu}%
                </span>
              </div>
              <div className={cn(
                "w-full h-2 rounded-full overflow-hidden",
                theme === 'dark' ? "bg-dark-bg" : "bg-light-bg"
              )}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${systemStatus.vps.cpu}%` }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="h-full bg-premium-blue rounded-full"
                />
              </div>
            </div>

            {/* Memory Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <MemoryStick className="w-4 h-4 text-purple-400" />
                  <span className={cn(
                    "text-sm font-medium",
                    theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                  )}>
                    Memory Usage
                  </span>
                </div>
                <span className={cn(
                  "text-sm font-bold",
                  theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                )}>
                  {systemStatus.vps.memory}%
                </span>
              </div>
              <div className={cn(
                "w-full h-2 rounded-full overflow-hidden",
                theme === 'dark' ? "bg-dark-bg" : "bg-light-bg"
              )}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${systemStatus.vps.memory}%` }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="h-full bg-premium-purple rounded-full"
                />
              </div>
            </div>

            {/* Disk Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span className={cn(
                    "text-sm font-medium",
                    theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                  )}>
                    Disk Usage
                  </span>
                </div>
                <span className={cn(
                  "text-sm font-bold",
                  theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                )}>
                  {systemStatus.vps.disk}%
                </span>
              </div>
              <div className={cn(
                "w-full h-2 rounded-full overflow-hidden",
                theme === 'dark' ? "bg-dark-bg" : "bg-light-bg"
              )}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${systemStatus.vps.disk}%` }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="h-full bg-premium-cyan rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Trading Engines */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <h2 className={cn(
          "text-xl font-semibold mb-4",
          theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
        )}>
          Trading Engines
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(systemStatus.engines).map(([engine, engineData], index) => (
            <motion.div
              key={engine}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={cn(
                "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300 hover:scale-105",
                theme === 'dark'
                  ? "bg-card-dark hover:bg-card-hover-dark border-dark-border shadow-premium-dark"
                  : "bg-card-light hover:bg-card-hover-light border-light-border shadow-premium"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    getEngineGradient(engine)
                  )}>
                    <span className="text-white font-bold text-sm">{engine.toUpperCase()}</span>
                  </div>
                  <div>
                    <div className={cn(
                      "font-semibold",
                      theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                    )}>
                      {getEngineLabel(engine)}
                    </div>
                    <div className={cn(
                      "text-xs",
                      theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                    )}>
                      Engine {engine}
                    </div>
                  </div>
                </div>
                
                <div className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium",
                  engineData.status === 'active' 
                    ? theme === 'dark'
                      ? "bg-green-500/20 text-trading-up-dark"
                      : "bg-green-500/20 text-trading-up-light"
                    : "bg-gray-500/20 text-gray-400"
                )}>
                  {engineData.status.toUpperCase()}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-sm",
                    theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                  )}>
                    Signals Today
                  </span>
                  <span className={cn(
                    "text-sm font-bold",
                    theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                  )}>
                    {engineData.signalsToday}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-sm",
                    theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                  )}>
                    Avg Confidence
                  </span>
                  <span className={cn(
                    "text-sm font-bold",
                    theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                  )}>
                    {engineData.avgConfidence}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-sm",
                    theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                  )}>
                    Errors Today
                  </span>
                  <span className={cn(
                    "text-sm font-bold",
                    theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                  )}>
                    {engineData.errors}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Infrastructure Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
      >
        {/* Database Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className={cn(
            "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300",
            theme === 'dark'
              ? "bg-card-dark border-dark-border shadow-premium-dark"
              : "bg-card-light border-light-border shadow-premium"
          )}
        >
          <div className="flex items-center space-x-3 mb-4">
            <Database className={cn(
              "w-5 h-5",
              theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
            )} />
            <h3 className={cn(
              "text-lg font-semibold",
              theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
            )}>
              Database
            </h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={cn(
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Status
              </span>
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  systemStatus.database.status === 'connected'
                    ? theme === 'dark' ? "bg-trading-up-dark" : "bg-trading-up-light"
                    : theme === 'dark' ? "bg-trading-down-dark" : "bg-trading-down-light"
                )} />
                <span className={cn(
                  "font-medium",
                  systemStatus.database.status === 'connected'
                    ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                    : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                )}>
                  {systemStatus.database.status.charAt(0).toUpperCase() + systemStatus.database.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={cn(
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Latency
              </span>
              <span className={cn(
                "font-medium",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                {systemStatus.database.latency}ms
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={cn(
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Collections
              </span>
              <span className={cn(
                "font-medium",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                {systemStatus.database.collections?.length || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={cn(
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Documents
              </span>
              <span className={cn(
                "font-medium",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                {systemStatus.database.documents.toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Network Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className={cn(
            "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300",
            theme === 'dark'
              ? "bg-card-dark border-dark-border shadow-premium-dark"
              : "bg-card-light border-light-border shadow-premium"
          )}
        >
          <div className="flex items-center space-x-3 mb-4">
            <Globe className="w-5 h-5 text-purple-400" />
            <h3 className={cn(
              "text-lg font-semibold",
              theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
            )}>
              Network
            </h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={cn(
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Connection
              </span>
              <div className="flex items-center space-x-2">
                <Wifi className={cn(
                  "w-4 h-4",
                  systemStatus.network.status === 'stable'
                    ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                    : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                )} />
                <span className={cn(
                  "font-medium",
                  systemStatus.network.status === 'stable'
                    ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                    : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                )}>
                  {systemStatus.network.status.charAt(0).toUpperCase() + systemStatus.network.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={cn(
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Latency
              </span>
              <span className={cn(
                "font-medium",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                {systemStatus.network.latency}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={cn(
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Bandwidth
              </span>
              <span className={cn(
                "font-medium",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                {systemStatus.network.bandwidth}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={cn(
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                API Health
              </span>
              <span className={cn(
                "font-medium",
                systemStatus.network.status === 'stable'
                  ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                  : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
              )}>
                {systemStatus.network.status === 'stable' ? 'Healthy' : 'Issues'}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Trading Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h2 className={cn(
          "text-xl font-semibold mb-4",
          theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
        )}>
          Trading Sessions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(systemStatus.sessions).map(([session, isActive], index) => {
            const getSessionIcon = () => {
              switch(session) {
                case 'tokyo': return '🗾';
                case 'london': return '🏛️';
                case 'newyork': return '🗽';
                default: return '🌍';
              }
            };

            return (
              <motion.div
                key={session}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className={cn(
                  "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300 hover:scale-105",
                  theme === 'dark'
                    ? "bg-card-dark hover:bg-card-hover-dark border-dark-border shadow-premium-dark"
                    : "bg-card-light hover:bg-card-hover-light border-light-border shadow-premium",
                  isActive && "ring-2 ring-blue-400/30"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getSessionIcon()}</span>
                    <div>
                      <div className={cn(
                        "font-semibold",
                        theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                      )}>
                        {session === 'newyork' ? 'New York' : session.charAt(0).toUpperCase() + session.slice(1)}
                      </div>
                      <div className={cn(
                        "text-xs",
                        theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                      )}>
                        Trading Session
                      </div>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium",
                    isActive 
                      ? theme === 'dark'
                        ? "bg-green-500/20 text-trading-up-dark"
                        : "bg-green-500/20 text-trading-up-light"
                      : "bg-gray-500/20 text-gray-400"
                  )}>
                    {isActive ? 'ACTIVE' : 'CLOSED'}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className={cn(
                    "w-4 h-4",
                    theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                  )} />
                  <span className={cn(
                    "text-sm",
                    theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                  )}>
                    {isActive ? 'In session' : getSessionStatus(session)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}