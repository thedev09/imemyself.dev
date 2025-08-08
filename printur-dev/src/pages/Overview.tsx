import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Clock, TrendingUp, TrendingDown, Activity, Zap, Globe, Database, Crown, DollarSign, Bitcoin, BarChart3 } from 'lucide-react';
import { useTheme } from '../store/useTheme';
import { dataService } from '../services/dataService';
import type { MarketPrice, AssetSymbol, Engine, VPSStatus, EngineBias } from '../types';
import { cn } from '../utils/cn';

interface EngineData {
  engine: Engine;
  label: string;
  gradient: string;
  bias: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  signal: string;
}

export function Overview() {
  const { theme } = useTheme();
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [engineBiases, setEngineBiases] = useState<{[key: string]: EngineBias[]}>({});
  const [vpsStatus, setVpsStatus] = useState<VPSStatus>({ status: 'offline' });
  const [currentSession, setCurrentSession] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setCurrentSession(getCurrentSession());
    
    // Subscribe to real Firebase data
    const unsubscribeFunctions: (() => void)[] = [];
    
    // Subscribe to VPS status
    const unsubscribeVPS = dataService.subscribeToVPSStatus((status) => {
      setVpsStatus(status);
    });
    unsubscribeFunctions.push(unsubscribeVPS);
    
    // Subscribe to market prices
    const unsubscribePrices = dataService.subscribeToMarketPrices((prices) => {
      console.log('Received market prices:', prices);
      setMarketPrices(prices);
      setIsLoading(false);
    });
    unsubscribeFunctions.push(unsubscribePrices);
    
    // Subscribe to all engine biases
    const engines: Engine[] = ['v1', 'v2', 'v3'];
    engines.forEach(engine => {
      const unsubscribeEngine = dataService.subscribeToEngineBias(engine, (biases) => {
        console.log(`Received ${engine} biases:`, biases);
        setEngineBiases(prev => ({
          ...prev,
          [engine]: biases
        }));
      });
      unsubscribeFunctions.push(unsubscribeEngine);
    });
    
    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const getCurrentSession = () => {
    const now = new Date();
    const hour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    
    // Weekend market closure
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'Market Closed - Weekend';
    }
    
    // Friday early close (after 20:00 UTC on Friday)
    if (dayOfWeek === 5 && hour >= 20) {
      return 'Market Closed - Weekend';
    }
    
    // Sunday night market opening (after 21:00 UTC on Sunday)
    if (dayOfWeek === 0 && hour < 21) {
      return 'Market Closed - Weekend';
    }
    
    // Active sessions (Monday 00:00 UTC to Friday 20:00 UTC)
    // London + NY overlap (most important) - 13:00-16:00 UTC
    if (hour >= 13 && hour < 16) {
      return 'London + New York Session';
    }
    // New York session - 13:00-22:00 UTC
    else if (hour >= 13 && hour < 22) {
      return 'New York Session';
    }
    // London session - 07:00-16:00 UTC
    else if (hour >= 7 && hour < 16) {
      return 'London Session';
    }
    // Tokyo session - 23:00-08:00 UTC (spans midnight)
    else if (hour >= 23 || hour < 8) {
      return 'Tokyo Session';
    }
    
    // If no session matches, market is closed
    return 'Market Closed';
  };

  const getAssetIcon = (symbol: AssetSymbol) => {
    const iconProps = { className: "w-6 h-6" };
    
    switch (symbol) {
      case 'XAUUSD': return <Crown {...iconProps} className="w-6 h-6 text-yellow-400" />;
      case 'USDJPY': return <DollarSign {...iconProps} className="w-6 h-6 text-blue-400" />;
      case 'BTCUSD': return <Bitcoin {...iconProps} className="w-6 h-6 text-orange-400" />;
      default: return <BarChart3 {...iconProps} className="w-6 h-6 text-gray-400" />;
    }
  };

  const formatPrice = (symbol: AssetSymbol, price: number) => {
    switch (symbol) {
      case 'XAUUSD': return `$${price.toFixed(2)}`;
      case 'USDJPY': return `¥${price.toFixed(3)}`;
      case 'BTCUSD': return `$${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      default: return price.toString();
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
        <h1 className={cn(
          "text-3xl font-bold mb-2",
          theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
        )}>
          Trading Overview
        </h1>
        <p className={cn(
          theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
        )}>
          Real-time market data and triple-engine analysis
        </p>
      </motion.div>


      {/* Market Prices */}
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
          Market Prices
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(() => {
            const order = ['XAUUSD', 'USDJPY', 'BTCUSD'];
            const sortedPrices = [...marketPrices].sort((a, b) => {
              const aIndex = order.indexOf(a.symbol);
              const bIndex = order.indexOf(b.symbol);
              // If symbol not found in order array, put it at the end
              const aPos = aIndex === -1 ? 999 : aIndex;
              const bPos = bIndex === -1 ? 999 : bIndex;
              return aPos - bPos;
            });
            console.log('Market prices order:', sortedPrices.map(p => p.symbol));
            return sortedPrices;
          })().map((price, index) => {
            const isPositive = price.change >= 0;
            
            return (
              <motion.div
                key={price.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={cn(
                  "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300 hover:scale-105",
                  theme === 'dark'
                    ? "bg-card-dark hover:bg-card-hover-dark border-dark-border shadow-premium-dark"
                    : "bg-card-light hover:bg-card-hover-light border-light-border shadow-premium"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8">
                      {getAssetIcon(price.symbol)}
                    </div>
                    <div>
                      <div className={cn(
                        "font-semibold",
                        theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                      )}>
                        {price.symbol}
                      </div>
                      <div className={cn(
                        "text-xs",
                        theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                      )}>
                        Live Price
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {isPositive ? (
                      <TrendingUp className={cn(
                        "w-4 h-4",
                        theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                      )} />
                    ) : (
                      <TrendingDown className={cn(
                        "w-4 h-4",
                        theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                      )} />
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className={cn(
                    "text-2xl font-bold",
                    theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                  )}>
                    {formatPrice(price.symbol, price.price)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-sm font-medium",
                      isPositive 
                        ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                        : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                    )}>
                      {isPositive ? '+' : ''}{price.change.toFixed(price.symbol === 'USDJPY' ? 3 : 2)}
                    </span>
                    
                    <span className={cn(
                      "text-sm font-medium",
                      isPositive 
                        ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                        : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                    )}>
                      {isPositive ? '+' : ''}{price.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Engine Analysis Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <h2 className={cn(
          "text-xl font-semibold mb-4",
          theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
        )}>
          Engine Analysis
        </h2>
        
        {/* Engine Cards for each Asset */}
        {(() => {
          const order = ['XAUUSD', 'USDJPY', 'BTCUSD'];
          const sortedPrices = [...marketPrices].sort((a, b) => {
            const aIndex = order.indexOf(a.symbol);
            const bIndex = order.indexOf(b.symbol);
            const aPos = aIndex === -1 ? 999 : aIndex;
            const bPos = bIndex === -1 ? 999 : bIndex;
            return aPos - bPos;
          });
          return sortedPrices;
        })().map((price, assetIndex) => (
          <motion.div
            key={price.symbol}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + assetIndex * 0.1 }}
            className={cn(
              "backdrop-blur-xl border rounded-2xl p-6 mb-6 transition-all duration-300",
              theme === 'dark'
                ? "bg-card-dark border-dark-border shadow-premium-dark"
                : "bg-card-light border-light-border shadow-premium"
            )}
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="flex items-center justify-center w-7 h-7">
                {getAssetIcon(price.symbol)}
              </div>
              <h3 className={cn(
                "text-lg font-semibold",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                {price.symbol} Analysis
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['v1', 'v2', 'v3'] as Engine[]).map((engine, engineIndex) => {
                // Get the most recent bias for this engine and asset
                const engineBiasesForAsset = engineBiases[engine]?.find(bias => bias.symbol === price.symbol);
                const hasData = !!engineBiasesForAsset;
                
                const getEngineLabel = (engine: Engine) => {
                  switch (engine) {
                    case 'v1': return 'Smart';
                    case 'v2': return 'AI Enhanced'; 
                    case 'v3': return 'Simple';
                    default: return engine;
                  }
                };
                
                const getEngineGradient = (engine: Engine) => {
                  switch (engine) {
                    case 'v1': return 'bg-premium-blue';
                    case 'v2': return 'bg-premium-purple';
                    case 'v3': return 'bg-premium-cyan';
                    default: return 'bg-gray-500';
                  }
                };
                
                const getBiasDisplay = (bias?: string) => {
                  switch (bias) {
                    case 'BULLISH': return 'BUY';
                    case 'BEARISH': return 'SELL';
                    case 'NEUTRAL': return 'NEUTRAL';
                    default: return 'NO DATA';
                  }
                };
                
                const getSignalStrength = (confidence?: number) => {
                  if (!confidence) return 'NO SIGNAL';
                  if (confidence >= 80) return 'STRONG';
                  if (confidence >= 60) return 'MODERATE';
                  return 'WEAK';
                };

                return (
                  <motion.div
                    key={`${price.symbol}-${engine}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + assetIndex * 0.1 + engineIndex * 0.05 }}
                    className={cn(
                      "border rounded-xl p-4 transition-all duration-300",
                      theme === 'dark'
                        ? "bg-dark-surface border-dark-border"
                        : "bg-light-surface border-light-border"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          getEngineGradient(engine)
                        )}>
                          <span className="text-white font-bold text-xs">{engine.toUpperCase()}</span>
                        </div>
                        <div>
                          <div className={cn(
                            "text-sm font-medium",
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
                        "px-2 py-1 rounded-lg text-xs font-medium",
                        !hasData 
                          ? "bg-gray-500/20 text-gray-400"
                          : engineBiasesForAsset.bias === 'BULLISH' 
                            ? theme === 'dark' 
                              ? "bg-green-500/20 text-trading-up-dark" 
                              : "bg-green-500/20 text-trading-up-light"
                            : engineBiasesForAsset.bias === 'BEARISH' 
                              ? theme === 'dark'
                                ? "bg-red-500/20 text-trading-down-dark"
                                : "bg-red-500/20 text-trading-down-light"
                              : "bg-gray-500/20 text-gray-400"
                      )}>
                        {getBiasDisplay(engineBiasesForAsset?.bias)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={cn(
                          theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                        )}>
                          Confidence
                        </span>
                        <span className={cn(
                          "font-medium",
                          theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                        )}>
                          {engineBiasesForAsset?.confidence || 0}%
                        </span>
                      </div>
                      
                      <div className={cn(
                        "w-full h-2 rounded-full overflow-hidden",
                        theme === 'dark' ? "bg-dark-bg" : "bg-light-bg"
                      )}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${engineBiasesForAsset?.confidence || 0}%` }}
                          transition={{ delay: 0.8 + assetIndex * 0.1 + engineIndex * 0.05, duration: 0.6 }}
                          className={cn("h-full rounded-full", getEngineGradient(engine))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className={cn(
                          theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                        )}>
                          Signal
                        </span>
                        <span className={cn(
                          "font-medium",
                          !hasData 
                            ? "text-gray-400"
                            : getSignalStrength(engineBiasesForAsset?.confidence) === 'STRONG' 
                              ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                              : getSignalStrength(engineBiasesForAsset?.confidence) === 'MODERATE' 
                                ? theme === 'dark' ? "text-status-warning-dark" : "text-status-warning-light"
                                : "text-gray-400"
                        )}>
                          {getSignalStrength(engineBiasesForAsset?.confidence)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className={cn(
          "backdrop-blur-xl border rounded-2xl p-4 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className={cn(
              "text-sm",
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              Active Signals
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {(() => {
              // Count active signals across all engines and assets
              let totalSignals = 0;
              Object.values(engineBiases).forEach(biases => {
                if (biases) {
                  biases.forEach(bias => {
                    if (bias.bias && bias.bias !== 'NEUTRAL' && bias.confidence > 0) {
                      totalSignals++;
                    }
                  });
                }
              });
              return totalSignals;
            })()}
          </div>
          <div className={cn(
            "text-xs",
            theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
          )}>
            Across 3 engines
          </div>
        </div>

        <div className={cn(
          "backdrop-blur-xl border rounded-2xl p-4 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className={cn(
              "w-4 h-4",
              theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
            )} />
            <span className={cn(
              "text-sm",
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              Win Rate
            </span>
          </div>
          <div className={cn(
            "text-2xl font-bold",
            theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
          )}>
            72%
          </div>
          <div className={cn(
            "text-xs",
            theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
          )}>
            Last 24h
          </div>
        </div>

        <div className={cn(
          "backdrop-blur-xl border rounded-2xl p-4 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          <div className="flex items-center space-x-2 mb-2">
            <Zap className={cn(
              "w-4 h-4",
              theme === 'dark' ? "text-status-warning-dark" : "text-status-warning-light"
            )} />
            <span className={cn(
              "text-sm",
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              Avg Response
            </span>
          </div>
          <div className={cn(
            "text-2xl font-bold",
            theme === 'dark' ? "text-status-warning-dark" : "text-status-warning-light"
          )}>
            1.2s
          </div>
          <div className={cn(
            "text-xs",
            theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
          )}>
            Signal delay
          </div>
        </div>

        <div className={cn(
          "backdrop-blur-xl border rounded-2xl p-4 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          <div className="flex items-center space-x-2 mb-2">
            <Globe className="w-4 h-4 text-purple-400" />
            <span className={cn(
              "text-sm",
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              Uptime
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-400">99.8%</div>
          <div className={cn(
            "text-xs",
            theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
          )}>
            This month
          </div>
        </div>
      </motion.div>
    </div>
  );
}