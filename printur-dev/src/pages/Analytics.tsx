import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, BarChart3, Activity, DollarSign, 
  Percent, Target, Zap, Crown, Bitcoin, Users
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { dataService } from '../services/dataService';
import { useTheme } from '../store/useTheme';
import type { AssetSymbol, Engine, LiveTrade } from '../types';
import { cn } from '../utils/cn';

interface EnginePerformance {
  engine: Engine;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgConfidence: number;
  activeTrades: number;
  signals: number;
  bestAsset: AssetSymbol;
  errors: number;
}

interface AssetPerformance {
  asset: AssetSymbol;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  bestEngine: Engine;
  avgDuration: number;
  volume: number;
}

export function Analytics() {
  const { theme } = useTheme();
  const [selectedView, setSelectedView] = useState<'engines' | 'assets' | 'comparison'>('engines');
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');
  const [isLoading, setIsLoading] = useState(true);
  const [enginePerformance, setEnginePerformance] = useState<EnginePerformance[]>([]);
  const [assetPerformance, setAssetPerformance] = useState<AssetPerformance[]>([]);
  const [allTrades, setAllTrades] = useState<LiveTrade[]>([]);

  // REMOVED: convertToPips function - trade.pnl is already in pips from dataService!
  // The dataService.ts already handles the conversion properly:
  // const pnl = data.pnlPips || (calculated pips value)
  // So trade.pnl in our LiveTrade objects is already in pips, not dollars

  // Filter trades based on timeframe
  const filterTradesByTimeframe = useCallback((trades: LiveTrade[]): LiveTrade[] => {
    const now = Date.now();
    let timeThreshold = 0;
    
    switch (timeframe) {
      case '1D':
        timeThreshold = now - (24 * 60 * 60 * 1000);
        break;
      case '1W':
        timeThreshold = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '1M':
        timeThreshold = now - (30 * 24 * 60 * 60 * 1000);
        break;
      case 'ALL':
      default:
        return trades; // Return all trades
    }
    
    return trades.filter(trade => trade.timestamp >= timeThreshold);
  }, [timeframe]);

  const calculatePerformanceMetrics = useCallback((tradesData: LiveTrade[]) => {
    console.log('Analytics: Processing trade data:', tradesData.length, 'trades');
    console.log('Analytics: Sample trade data:', tradesData.slice(0, 3));
    
    // DEBUGGING: Show trade counts by engine and status
    const engineBreakdown = ['v1', 'v2', 'v3'].map(engine => ({
      engine,
      total: tradesData.filter(t => t.engine === engine).length,
      active: tradesData.filter(t => t.engine === engine && t.status === 'ACTIVE').length,
      closed: tradesData.filter(t => t.engine === engine && t.status !== 'ACTIVE').length
    }));
    console.log('Analytics: Trade breakdown by engine:', engineBreakdown);
    console.log('Analytics: Total received from dataService:', tradesData.length);
    
    // Filter trades by timeframe
    const filteredTrades = filterTradesByTimeframe(tradesData);
    console.log(`Analytics: After ${timeframe} filter: ${filteredTrades.length} trades`);
    
    // Calculate engine performance
    const engines: Engine[] = ['v1', 'v2', 'v3'];
    const engineStats: EnginePerformance[] = engines.map(engine => {
      const engineTrades = filteredTrades.filter(trade => trade.engine === engine);
      console.log(`Analytics: ${engine} has ${engineTrades.length} trades in ${timeframe} timeframe`);
      
      // For active trades count, use ALL trades (not filtered by timeframe) since active trades should be counted regardless of when they started
      const allEngineTradesForActive = tradesData.filter(trade => trade.engine === engine);
      
      // Log sample trades for debugging
      if (engineTrades.length > 0) {
        console.log(`Analytics: Sample ${engine} trades:`, engineTrades.slice(0, 3).map(t => ({
          id: t.id.slice(-8),
          symbol: t.symbol,
          pnl: t.pnl,
          status: t.status,
          engine: t.engine
        })));
      }
      
      const activeTrades = allEngineTradesForActive.filter(trade => trade.status === 'ACTIVE').length;
      
      // FIXED: Only count CLOSED trades for Total P&L and Total Trades (as requested)
      const closedTrades = engineTrades.filter(trade => trade.status !== 'ACTIVE');
      
      const totalPnLPips = closedTrades.reduce((sum, trade) => {
        const pips = trade.pnl || 0; // trade.pnl is already in pips from dataService
        console.log(`Analytics: ${engine} ${trade.symbol} P&L: ${pips} pips (closed trades only)`);
        return sum + pips;
      }, 0);
      
      // FIXED: Win rate and trade count based on CLOSED trades only
      const winningTrades = closedTrades.filter(trade => (trade.pnl || 0) > 0).length;
      const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;
      
      console.log(`Analytics: ${engine} - Total P&L: ${totalPnLPips} pips, Win Rate: ${winRate}% (${winningTrades}/${closedTrades.length}), Closed Trades: ${closedTrades.length}, Active: ${activeTrades}`);
      
      // Find best performing asset for this engine (in pips)
      const assetPnL = ['XAUUSD', 'USDJPY', 'BTCUSD'].map(asset => {
        const assetTrades = engineTrades.filter(trade => trade.symbol === asset);
        const pnlPips = assetTrades.reduce((sum, trade) => {
          return sum + (trade.pnl || 0); // trade.pnl is already in pips
        }, 0);
        return {
          asset: asset as AssetSymbol,
          pnl: pnlPips
        };
      });
      const bestAsset = assetPnL.reduce((best, current) => 
        current.pnl > best.pnl ? current : best, assetPnL[0]
      ).asset;

      return {
        engine,
        totalTrades: closedTrades.length, // Only count closed trades
        winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal place
        totalPnL: Math.round(totalPnLPips * 100) / 100, // P&L in pips, rounded to 2 decimal places
        avgConfidence: engineTrades.length > 0 ? Math.round(engineTrades.reduce((sum, trade) => sum + (trade.confidence || 70), 0) / engineTrades.length) : 70,
        activeTrades,
        signals: engineTrades.filter(trade => trade.status === 'SIGNAL' || trade.type === 'SIGNAL').length,
        bestAsset,
        errors: engineTrades.filter(trade => trade.status === 'ERROR' || trade.error).length || 0
      };
    });

    console.log('Analytics: Final engine stats:', engineStats);

    // Calculate asset performance
    const assets: AssetSymbol[] = ['XAUUSD', 'USDJPY', 'BTCUSD'];
    const assetStats: AssetPerformance[] = assets.map(asset => {
      const assetTrades = filteredTrades.filter(trade => trade.symbol === asset);
      console.log(`Analytics: ${asset} has ${assetTrades.length} trades in ${timeframe} timeframe`);
      
      // FIXED: Only count CLOSED trades for Total P&L and Total Trades (consistency with engine stats)
      const closedAssetTrades = assetTrades.filter(trade => trade.status !== 'ACTIVE');
      
      const totalPnLPips = closedAssetTrades.reduce((sum, trade) => {
        const pips = trade.pnl || 0; // trade.pnl is already in pips from dataService
        return sum + pips;
      }, 0);
      
      // FIXED: Win rate based on closed trades only
      const winningTrades = closedAssetTrades.filter(trade => (trade.pnl || 0) > 0).length;
      const winRate = closedAssetTrades.length > 0 ? (winningTrades / closedAssetTrades.length) * 100 : 0;
      
      console.log(`Analytics: ${asset} - Total P&L: ${totalPnLPips} pips, Win Rate: ${winRate}% (${winningTrades}/${closedAssetTrades.length}) - Closed only`);
      
      // Find best performing engine for this asset (in pips)
      const enginePnL = engines.map(engine => {
        const engineTrades = assetTrades.filter(trade => trade.engine === engine);
        const pnlPips = engineTrades.reduce((sum, trade) => {
          return sum + (trade.pnl || 0); // trade.pnl is already in pips
        }, 0);
        return {
          engine,
          pnl: pnlPips
        };
      });
      const bestEngine = enginePnL.reduce((best, current) => 
        current.pnl > best.pnl ? current : best, enginePnL[0]
      ).engine;

      return {
        asset,
        totalTrades: closedAssetTrades.length, // Only count closed trades
        winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal place
        totalPnL: Math.round(totalPnLPips * 100) / 100, // P&L in pips, 2 decimal places
        bestEngine,
        avgDuration: assetTrades.length > 0 ? Math.round(assetTrades.reduce((sum, trade) => {
          const duration = trade.closedAt && trade.openedAt ? (new Date(trade.closedAt).getTime() - new Date(trade.openedAt).getTime()) / (1000 * 60) : 120;
          return sum + duration;
        }, 0) / assetTrades.length) : 120,
        volume: Math.round(Math.abs(totalPnLPips * 1000)) // Volume approximation based on total pips
      };
    });

    console.log('Analytics: Final asset stats:', assetStats);

    setEnginePerformance(engineStats);
    setAssetPerformance(assetStats);
  }, [timeframe, filterTradesByTimeframe]);

  useEffect(() => {
    // FIXED: Use exactly the same data loading as working Trades page to avoid duplication
    console.log('Analytics: Setting up data subscription...');
    
    const unsubscribe = dataService.subscribeToLiveTrades((tradesData) => {
      console.log('Analytics: Received trades data:', tradesData.length);
      console.log('Analytics: Sample trades:', tradesData.slice(0, 3).map(t => ({
        id: t.id.slice(-8),
        engine: t.engine,
        symbol: t.symbol,
        status: t.status,
        pnl: t.pnl
      })));
      
      // dataService.subscribeToLiveTrades already includes both active AND historical trades
      // No need to load historical trades separately (that was causing duplication!)
      setAllTrades(tradesData);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Recalculate when timeframe changes or data updates
  useEffect(() => {
    if (allTrades.length > 0) {
      calculatePerformanceMetrics(allTrades);
    }
  }, [timeframe, allTrades, calculatePerformanceMetrics]);


  // Helper function to get dynamic descriptions based on timeframe
  const getTimeframeDescription = () => {
    switch (timeframe) {
      case '1D':
        return 'Today';
      case '1W':
        return 'This week';
      case '1M':
        return 'This month';
      case 'ALL':
      default:
        return 'All time';
    }
  };

  const getEngineLabel = (engine: Engine) => {
    switch (engine) {
      case 'v1': return 'Smart Engine';
      case 'v2': return 'AI Enhanced';
      case 'v3': return 'Simple Engine';
    }
  };

  const getEngineGradient = (engine: Engine) => {
    switch (engine) {
      case 'v1': return 'bg-premium-blue';
      case 'v2': return 'bg-premium-purple';
      case 'v3': return 'bg-premium-cyan';
    }
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

  const totalStats = {
    totalPnL: enginePerformance.reduce((sum, engine) => sum + engine.totalPnL, 0),
    totalTrades: enginePerformance.reduce((sum, engine) => sum + engine.totalTrades, 0),
    avgWinRate: enginePerformance.length > 0 ? 
      Math.round(enginePerformance.reduce((sum, engine) => sum + engine.winRate, 0) / enginePerformance.length) : 0,
    activeTrades: enginePerformance.reduce((sum, engine) => sum + engine.activeTrades, 0)
  };

  // Prepare chart data for engine comparison
  const chartData = enginePerformance.map(engine => ({
    name: getEngineLabel(engine.engine),
    engine: engine.engine,
    winRate: engine.winRate,
    totalPnL: engine.totalPnL,
    trades: engine.totalTrades,
    confidence: engine.avgConfidence
  }));

  // Radar chart data for engine comparison
  const radarData = [
    {
      metric: 'Win Rate',
      v1: enginePerformance.find(e => e.engine === 'v1')?.winRate || 0,
      v2: enginePerformance.find(e => e.engine === 'v2')?.winRate || 0,
      v3: enginePerformance.find(e => e.engine === 'v3')?.winRate || 0,
      fullMark: 100
    },
    {
      metric: 'Confidence',
      v1: enginePerformance.find(e => e.engine === 'v1')?.avgConfidence || 0,
      v2: enginePerformance.find(e => e.engine === 'v2')?.avgConfidence || 0,
      v3: enginePerformance.find(e => e.engine === 'v3')?.avgConfidence || 0,
      fullMark: 100
    },
    {
      metric: 'Activity',
      v1: Math.min((enginePerformance.find(e => e.engine === 'v1')?.totalTrades || 0) * 2, 100),
      v2: Math.min((enginePerformance.find(e => e.engine === 'v2')?.totalTrades || 0) * 2, 100),
      v3: Math.min((enginePerformance.find(e => e.engine === 'v3')?.totalTrades || 0) * 2, 100),
      fullMark: 100
    },
    {
      metric: 'Reliability',
      v1: Math.max(100 - (enginePerformance.find(e => e.engine === 'v1')?.errors || 0) * 10, 0),
      v2: Math.max(100 - (enginePerformance.find(e => e.engine === 'v2')?.errors || 0) * 10, 0),
      v3: Math.max(100 - (enginePerformance.find(e => e.engine === 'v3')?.errors || 0) * 10, 0),
      fullMark: 100
    }
  ];

  if (isLoading) {
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
          )}>Loading analytics data...</p>
        </motion.div>
      </div>
    );
  }

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
              Performance Analytics
            </h1>
            <p className={cn(
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              Compare engine performance and asset statistics
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Time Filter */}
            <div className={cn(
              "flex items-center space-x-1 p-1 rounded-xl border",
              theme === 'dark'
                ? "bg-card-dark border-dark-border"
                : "bg-card-light border-light-border"
            )}>
              {[
                { key: '1D', label: '1D' },
                { key: '1W', label: '1W' },
                { key: '1M', label: '1M' },
                { key: 'ALL', label: 'ALL' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeframe(key as typeof timeframe)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                    timeframe === key
                      ? theme === 'dark'
                        ? "bg-primary-500 text-white"
                        : "bg-primary-500 text-white"
                      : theme === 'dark'
                        ? "text-dark-text-secondary hover:text-dark-text-primary hover:bg-card-hover-dark"
                        : "text-light-text-secondary hover:text-light-text-primary hover:bg-card-hover-light"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* View Selector */}
            <div className={cn(
              "flex items-center space-x-1 p-1 rounded-xl border",
              theme === 'dark'
                ? "bg-card-dark border-dark-border"
                : "bg-card-light border-light-border"
            )}>
              {[
                { key: 'engines', label: 'Engines', icon: Zap },
                { key: 'assets', label: 'Assets', icon: Target },
                { key: 'comparison', label: 'Compare', icon: BarChart3 }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSelectedView(key as typeof selectedView)}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    selectedView === key
                      ? theme === 'dark'
                        ? "bg-primary-500 text-white"
                        : "bg-primary-500 text-white"
                      : theme === 'dark'
                        ? "text-dark-text-secondary hover:text-dark-text-primary hover:bg-card-hover-dark"
                        : "text-light-text-secondary hover:text-light-text-primary hover:bg-card-hover-light"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

          </div>
        </div>
      </motion.div>

      {/* Overall Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      >
        <div className={cn(
          "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-premium-blue rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={cn(
                "text-lg font-bold",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                Total P&L
              </h3>
              <p className={cn(
                "text-sm",
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                All engines - {getTimeframeDescription()}
              </p>
            </div>
          </div>
          <div className={cn(
            "text-2xl font-bold",
            totalStats.totalPnL >= 0 
              ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
              : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
          )}>
            {totalStats.totalPnL >= 0 ? '+' : ''}{totalStats.totalPnL} pips
          </div>
        </div>

        <div className={cn(
          "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-premium-purple rounded-xl flex items-center justify-center">
              <Percent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={cn(
                "text-lg font-bold",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                Avg Win Rate
              </h3>
              <p className={cn(
                "text-sm",
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Across all engines - {getTimeframeDescription()}
              </p>
            </div>
          </div>
          <div className={cn(
            "text-2xl font-bold",
            theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
          )}>
            {totalStats.avgWinRate}%
          </div>
        </div>

        <div className={cn(
          "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-premium-cyan rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={cn(
                "text-lg font-bold",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                Total Trades
              </h3>
              <p className={cn(
                "text-sm",
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Closed trades - {getTimeframeDescription()}
              </p>
            </div>
          </div>
          <div className={cn(
            "text-2xl font-bold",
            theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
          )}>
            {totalStats.totalTrades}
          </div>
        </div>

        <div className={cn(
          "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={cn(
                "text-lg font-bold",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                Active Trades
              </h3>
              <p className={cn(
                "text-sm",
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Currently running
              </p>
            </div>
          </div>
          <div className={cn(
            "text-2xl font-bold",
            theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
          )}>
            {totalStats.activeTrades}
          </div>
        </div>
      </motion.div>

      {selectedView === 'engines' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {/* Engine Performance Cards */}
          <div>
            <h2 className={cn(
              "text-xl font-semibold mb-4",
              theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
            )}>
              Engine Performance Breakdown
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {enginePerformance.map((engine, index) => (
                <motion.div
                  key={engine.engine}
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
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        getEngineGradient(engine.engine)
                      )}>
                        <span className="text-white font-bold text-sm">{engine.engine.toUpperCase()}</span>
                      </div>
                      <div>
                        <div className={cn(
                          "font-semibold",
                          theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                        )}>
                          {getEngineLabel(engine.engine)}
                        </div>
                        <div className={cn(
                          "text-xs",
                          theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                        )}>
                          {engine.activeTrades} active trades
                        </div>
                      </div>
                    </div>
                    
                    <div className={cn(
                      "px-3 py-1 rounded-lg text-xs font-medium",
                      engine.winRate >= 60
                        ? theme === 'dark'
                          ? "bg-green-500/20 text-trading-up-dark"
                          : "bg-green-500/20 text-trading-up-light"
                        : "bg-gray-500/20 text-gray-400"
                    )}>
                      {engine.winRate}% WIN
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm",
                        theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                      )}>
                        Total P&L
                      </span>
                      <span className={cn(
                        "text-sm font-bold",
                        engine.totalPnL >= 0
                          ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                          : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                      )}>
                        {engine.totalPnL >= 0 ? '+' : ''}{engine.totalPnL} pips
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm",
                        theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                      )}>
                        Trades
                      </span>
                      <span className={cn(
                        "text-sm font-bold",
                        theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                      )}>
                        {engine.totalTrades}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm",
                        theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                      )}>
                        Best Asset
                      </span>
                      <div className="flex items-center space-x-1">
                        {getAssetIcon(engine.bestAsset)}
                        <span className={cn(
                          "text-sm font-bold",
                          theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                        )}>
                          {engine.bestAsset}
                        </span>
                      </div>
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
                        {engine.avgConfidence}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Engine Performance Chart */}
          <div className={cn(
            "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300",
            theme === 'dark'
              ? "bg-card-dark border-dark-border shadow-premium-dark"
              : "bg-card-light border-light-border shadow-premium"
          )}>
            <h3 className={cn(
              "text-lg font-semibold mb-4",
              theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
            )}>
              Engine Win Rate Comparison
            </h3>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    stroke="currentColor" 
                    opacity={0.6}
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="currentColor"
                    opacity={0.6}
                    fontSize={12}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Bar 
                    dataKey="winRate" 
                    fill={theme === 'dark' ? '#3b82f6' : '#2563eb'}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {selectedView === 'assets' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {/* Asset Performance Cards */}
          <div>
            <h2 className={cn(
              "text-xl font-semibold mb-4",
              theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
            )}>
              Asset Performance Analysis
            </h2>
            
            <div className="space-y-4">
              {assetPerformance.map((asset, index) => (
                <motion.div
                  key={asset.asset}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className={cn(
                    "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]",
                    theme === 'dark'
                      ? "bg-card-dark hover:bg-card-hover-dark border-dark-border shadow-premium-dark"
                      : "bg-card-light hover:bg-card-hover-light border-light-border shadow-premium"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        {getAssetIcon(asset.asset)}
                        <div>
                          <div className={cn(
                            "text-lg font-bold",
                            theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                          )}>
                            {asset.asset}
                          </div>
                          <div className={cn(
                            "text-sm",
                            theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                          )}>
                            {asset.totalTrades} trades • Best with {getEngineLabel(asset.bestEngine)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className={cn(
                          "text-lg font-bold",
                          asset.totalPnL >= 0
                            ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                            : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                        )}>
                          {asset.totalPnL >= 0 ? '+' : ''}{asset.totalPnL} pips
                        </div>
                        <div className={cn(
                          "text-xs",
                          theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                        )}>
                          Total P&L
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className={cn(
                          "text-lg font-bold",
                          theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                        )}>
                          {asset.winRate}%
                        </div>
                        <div className={cn(
                          "text-xs",
                          theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                        )}>
                          Win Rate
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        {asset.totalPnL >= 0 ? (
                          <TrendingUp className={cn(
                            "w-6 h-6",
                            theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                          )} />
                        ) : (
                          <TrendingDown className={cn(
                            "w-6 h-6",
                            theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                          )} />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {selectedView === 'comparison' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {/* Engine Radar Comparison */}
          <div className={cn(
            "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300",
            theme === 'dark'
              ? "bg-card-dark border-dark-border shadow-premium-dark"
              : "bg-card-light border-light-border shadow-premium"
          )}>
            <h3 className={cn(
              "text-lg font-semibold mb-4",
              theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
            )}>
              Multi-Engine Performance Radar
            </h3>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="currentColor" opacity={0.2} />
                  <PolarAngleAxis 
                    dataKey="metric" 
                    tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.8 }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.6 }}
                  />
                  <Radar
                    name="Smart Engine (v1)"
                    dataKey="v1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Radar
                    name="AI Enhanced (v2)"
                    dataKey="v2"
                    stroke="#a855f7"
                    fill="#a855f7"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Simple Engine (v3)"
                    dataKey="v3"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      paddingTop: '20px',
                      fontSize: '12px'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Head-to-Head Comparison Table */}
          <div className={cn(
            "backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300",
            theme === 'dark'
              ? "bg-card-dark border-dark-border shadow-premium-dark"
              : "bg-card-light border-light-border shadow-premium"
          )}>
            <h3 className={cn(
              "text-lg font-semibold mb-4",
              theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
            )}>
              Head-to-Head Engine Comparison
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={cn(
                    "border-b",
                    theme === 'dark' ? "border-dark-border" : "border-light-border"
                  )}>
                    <th className={cn(
                      "text-left py-3 px-4 font-semibold",
                      theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                    )}>
                      Engine
                    </th>
                    <th className={cn(
                      "text-center py-3 px-4 font-semibold",
                      theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                    )}>
                      Total P&L
                    </th>
                    <th className={cn(
                      "text-center py-3 px-4 font-semibold",
                      theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                    )}>
                      Win Rate
                    </th>
                    <th className={cn(
                      "text-center py-3 px-4 font-semibold",
                      theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                    )}>
                      Total Trades
                    </th>
                    <th className={cn(
                      "text-center py-3 px-4 font-semibold",
                      theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                    )}>
                      Active Now
                    </th>
                    <th className={cn(
                      "text-center py-3 px-4 font-semibold",
                      theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                    )}>
                      Best Asset
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enginePerformance.map((engine, index) => (
                    <tr 
                      key={engine.engine}
                      className={cn(
                        "border-b transition-colors",
                        theme === 'dark' 
                          ? "border-dark-border hover:bg-card-hover-dark" 
                          : "border-light-border hover:bg-card-hover-light"
                      )}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            getEngineGradient(engine.engine)
                          )}>
                            <span className="text-white font-bold text-xs">{engine.engine.toUpperCase()}</span>
                          </div>
                          <div>
                            <div className={cn(
                              "font-medium",
                              theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                            )}>
                              {getEngineLabel(engine.engine)}
                            </div>
                            <div className={cn(
                              "text-xs",
                              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                            )}>
                              {engine.avgConfidence}% avg confidence
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={cn(
                          "font-bold",
                          engine.totalPnL >= 0
                            ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                            : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                        )}>
                          {engine.totalPnL >= 0 ? '+' : ''}{engine.totalPnL} pips
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={cn(
                          "font-medium",
                          theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                        )}>
                          {engine.winRate}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={cn(
                          "font-medium",
                          theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                        )}>
                          {engine.totalTrades}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          engine.activeTrades > 0
                            ? theme === 'dark'
                              ? "bg-green-500/20 text-trading-up-dark"
                              : "bg-green-500/20 text-trading-up-light"
                            : "bg-gray-500/20 text-gray-400"
                        )}>
                          {engine.activeTrades}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {getAssetIcon(engine.bestAsset)}
                          <span className={cn(
                            "text-sm font-medium",
                            theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                          )}>
                            {engine.bestAsset}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}