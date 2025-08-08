import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bug, Database, Activity } from 'lucide-react';
import { useTheme } from '../store/useTheme';
import { dataService } from '../services/dataService';
import { cn } from '../utils/cn';

export function DebugPanel() {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState({
    vpsStatus: null as any,
    marketPrices: [] as any[],
    engineData: {
      v1: [] as any[],
      v2: [] as any[],
      v3: [] as any[]
    },
    lastUpdate: null as number | null
  });

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribeFunctions: (() => void)[] = [];
    
    // Subscribe to VPS status
    const unsubscribeVPS = dataService.subscribeToVPSStatus((status) => {
      setDebugData(prev => ({ ...prev, vpsStatus: status, lastUpdate: Date.now() }));
    });
    unsubscribeFunctions.push(unsubscribeVPS);
    
    // Subscribe to market prices
    const unsubscribePrices = dataService.subscribeToMarketPrices((prices) => {
      setDebugData(prev => ({ ...prev, marketPrices: prices, lastUpdate: Date.now() }));
    });
    unsubscribeFunctions.push(unsubscribePrices);
    
    // Subscribe to engine data
    ['v1', 'v2', 'v3'].forEach(engine => {
      const unsubscribeEngine = dataService.subscribeToEngineBias(engine as any, (biases) => {
        setDebugData(prev => ({ 
          ...prev, 
          engineData: { ...prev.engineData, [engine]: biases },
          lastUpdate: Date.now() 
        }));
      });
      unsubscribeFunctions.push(unsubscribeEngine);
    });
    
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 p-3 rounded-xl transition-all duration-300 z-50",
          theme === 'dark'
            ? "bg-card-dark border border-dark-border text-dark-text-primary"
            : "bg-card-light border border-light-border text-light-text-primary"
        )}
        title="Open Debug Panel"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      className={cn(
        "fixed top-4 right-4 w-96 max-h-[80vh] overflow-y-auto rounded-2xl backdrop-blur-xl border shadow-premium-dark z-50",
        theme === 'dark'
          ? "bg-card-dark border-dark-border"
          : "bg-card-light border-light-border"
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Bug className={cn("w-5 h-5", theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary")} />
            <h3 className={cn("font-semibold", theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary")}>
              Debug Panel
            </h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className={cn(
              "text-2xl leading-none",
              theme === 'dark' ? "text-dark-text-secondary hover:text-dark-text-primary" : "text-light-text-secondary hover:text-light-text-primary"
            )}
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Last Update */}
          <div className={cn(
            "text-xs",
            theme === 'dark' ? "text-dark-text-muted" : "text-light-text-muted"
          )}>
            Last Update: {debugData.lastUpdate ? new Date(debugData.lastUpdate).toLocaleTimeString() : 'Never'}
          </div>

          {/* VPS Status */}
          <div className={cn(
            "p-3 rounded-lg border",
            theme === 'dark' ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border"
          )}>
            <div className="flex items-center space-x-2 mb-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span className={cn("text-sm font-medium", theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary")}>
                VPS Status
              </span>
            </div>
            <pre className={cn(
              "text-xs whitespace-pre-wrap",
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              {JSON.stringify(debugData.vpsStatus, null, 2)}
            </pre>
          </div>

          {/* Market Prices */}
          <div className={cn(
            "p-3 rounded-lg border",
            theme === 'dark' ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border"
          )}>
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className={cn("text-sm font-medium", theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary")}>
                Market Prices ({debugData.marketPrices.length})
              </span>
            </div>
            <pre className={cn(
              "text-xs whitespace-pre-wrap",
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              {JSON.stringify(debugData.marketPrices, null, 2)}
            </pre>
          </div>

          {/* Engine Data */}
          {Object.entries(debugData.engineData).map(([engine, data]) => (
            <div key={engine} className={cn(
              "p-3 rounded-lg border",
              theme === 'dark' ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border"
            )}>
              <div className="flex items-center space-x-2 mb-2">
                <div className={cn(
                  "w-4 h-4 rounded",
                  engine === 'v1' ? "bg-premium-blue" :
                  engine === 'v2' ? "bg-premium-purple" :
                  "bg-premium-cyan"
                )}></div>
                <span className={cn("text-sm font-medium", theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary")}>
                  Engine {engine.toUpperCase()} ({data.length} signals)
                </span>
              </div>
              <pre className={cn(
                "text-xs whitespace-pre-wrap",
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}