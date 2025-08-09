import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Target, Shield, Activity, Filter, Calendar, BarChart3, Crown, DollarSign, Bitcoin } from 'lucide-react';
import { useTheme } from '../store/useTheme';
import { dataService } from '../services/dataService';
import type { LiveTrade, AssetSymbol, Engine } from '../types';
import { cn } from '../utils/cn';

type TimeFilter = '1D' | '1W' | '1M' | 'ALL';
type TradeStatus = 'ACTIVE' | 'CLOSED' | 'ALL';

export function Trades() {
  const { theme } = useTheme();
  const [liveTrades, setLiveTrades] = useState<LiveTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<LiveTrade[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [engineFilter, setEngineFilter] = useState<'all' | Engine>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('1W'); // Default to current week
  const [statusFilter, setStatusFilter] = useState<TradeStatus>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = dataService.subscribeToLiveTrades((newTrades) => {
      console.log('Received trades:', newTrades);
      const active = newTrades.filter(t => t.status === 'ACTIVE');
      const closed = newTrades.filter(t => t.status !== 'ACTIVE');
      
      setLiveTrades(active);
      setTradeHistory(closed.sort((a, b) => b.timestamp - a.timestamp)); // Most recent first
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Get current trading week boundaries (Monday to Friday)
  const getCurrentTradingWeek = () => {
    const now = new Date();
    const currentDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Find Monday of current week
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // If Sunday, go back 6 days
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + mondayOffset);
    monday.setUTCHours(0, 0, 0, 0);
    
    // Find Friday of current week
    const friday = new Date(monday);
    friday.setUTCDate(monday.getUTCDate() + 4);
    friday.setUTCHours(23, 59, 59, 999);
    
    return { start: monday.getTime(), end: friday.getTime() };
  };

  const filterTradesByTime = (trades: LiveTrade[]) => {
    if (timeFilter === 'ALL') return trades;
    
    const now = Date.now();
    let cutoffTime: number;
    
    switch (timeFilter) {
      case '1D':
        cutoffTime = now - (24 * 60 * 60 * 1000);
        break;
      case '1W':
        const { start } = getCurrentTradingWeek();
        cutoffTime = start;
        break;
      case '1M':
        cutoffTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return trades;
    }
    
    return trades.filter(trade => trade.timestamp >= cutoffTime);
  };

  const getEngineGradient = (engine: Engine) => {
    switch (engine) {
      case 'v1': return 'bg-premium-blue';
      case 'v2': return 'bg-premium-purple';
      case 'v3': return 'bg-premium-cyan';
      default: return 'bg-gray-500';
    }
  };

  const getEngineLabel = (engine: Engine) => {
    return engine.toUpperCase(); // Just return V1, V2, V3
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

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ago`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    } else {
      return `${minutes}m ago`;
    }
  };

  const formatDuration = (timestamp: number) => {
    const now = Date.now();
    const ms = now - timestamp;
    
    if (!ms || isNaN(ms)) return 'Duration: 0m';
    
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `Duration: ${days}d ${remainingHours}h` : `Duration: ${days}d`;
    } else if (hours > 0) {
      return minutes > 0 ? `Duration: ${hours}h ${minutes}m` : `Duration: ${hours}h`;
    } else {
      return `Duration: ${minutes}m`;
    }
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const calculateProgressBarData = (trade: LiveTrade) => {
    const { entry, currentPrice, stopLoss, takeProfit, direction } = trade;
    
    if (!stopLoss || !takeProfit) return null;
    
    // Calculate risk and reward distances
    const riskDistance = Math.abs(entry - stopLoss);
    const rewardDistance = Math.abs(takeProfit - entry);
    const totalDistance = riskDistance + rewardDistance;
    
    const riskPercent = (riskDistance / totalDistance) * 100;
    const rewardPercent = (rewardDistance / totalDistance) * 100;
    
    // For ALL trades: visually show risk on left (0% to riskPercent), reward on right (riskPercent to 100%)
    const visualRiskStart = 0;
    const visualRewardStart = riskPercent;
    
    // Entry is always at the border between risk and reward zones
    const visualEntryPos = riskPercent;
    
    // Calculate current position based on actual price distance from entry
    const currentDistanceFromEntry = Math.abs(currentPrice - entry);
    let visualCurrentPos;
    
    if (trade.pnl >= 0) {
      // In profit: calculate how far into reward zone
      const progressIntoReward = Math.min(currentDistanceFromEntry / rewardDistance, 1);
      visualCurrentPos = visualEntryPos + (progressIntoReward * rewardPercent);
    } else {
      // In loss: calculate how far into risk zone
      const progressIntoRisk = Math.min(currentDistanceFromEntry / riskDistance, 1);
      visualCurrentPos = visualEntryPos - (progressIntoRisk * riskPercent);
    }
    
    return {
      entryPos: visualEntryPos,
      currentPos: visualCurrentPos,
      riskPercent,
      rewardPercent,
      visualRiskStart,
      visualRewardStart,
      direction
    };
  };

  // Filter trades
  const filteredLiveTrades = engineFilter === 'all' 
    ? liveTrades 
    : liveTrades.filter(t => t.engine === engineFilter);

  let filteredHistoryTrades = engineFilter === 'all' 
    ? tradeHistory 
    : tradeHistory.filter(t => t.engine === engineFilter);

  filteredHistoryTrades = filterTradesByTime(filteredHistoryTrades);
  
  if (statusFilter !== 'ALL') {
    filteredHistoryTrades = filteredHistoryTrades.filter(t => t.status === statusFilter);
  }

  // Calculate statistics
  const activeTotalPnL = filteredLiveTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  const historyTotalPnL = filteredHistoryTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  const winningTrades = filteredHistoryTrades.filter(t => t.pnl > 0).length;
  const winRate = filteredHistoryTrades.length > 0 ? (winningTrades / filteredHistoryTrades.length) * 100 : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
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
          Trading Dashboard
        </h1>
        <p className={cn(
          theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
        )}>
          Monitor live trades and analyze trading performance
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        <div className={cn(
          "backdrop-blur-xl border rounded-xl p-3 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          <div className="flex items-center space-x-2 mb-1">
            <Activity className="w-3 h-3 text-blue-400" />
            <span className={cn(
              "text-xs",
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              Live Trades
            </span>
          </div>
          <div className="text-xl font-bold text-blue-400">
            {filteredLiveTrades.length}
          </div>
        </div>

        <div className={cn(
          "backdrop-blur-xl border rounded-xl p-3 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          <div className="flex items-center space-x-2 mb-1">
            <TrendingUp className={cn(
              "w-3 h-3",
              activeTotalPnL >= 0 
                ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
            )} />
            <span className={cn(
              "text-xs",
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              Live P&L
            </span>
          </div>
          <div className={cn(
            "text-xl font-bold",
            activeTotalPnL >= 0 
              ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
              : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
          )}>
            {activeTotalPnL >= 0 ? '+' : ''}{activeTotalPnL.toFixed(1)} pips
          </div>
        </div>

        <div className={cn(
          "backdrop-blur-xl border rounded-xl p-3 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          <div className="flex items-center space-x-2 mb-1">
            <BarChart3 className="w-3 h-3 text-purple-400" />
            <span className={cn(
              "text-xs",
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              Win Rate
            </span>
          </div>
          <div className={cn(
            "text-xl font-bold",
            winRate >= 50 
              ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
              : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
          )}>
            {winRate.toFixed(1)}%
          </div>
        </div>

        <div className={cn(
          "backdrop-blur-xl border rounded-xl p-3 transition-all duration-300",
          theme === 'dark'
            ? "bg-card-dark border-dark-border shadow-premium-dark"
            : "bg-card-light border-light-border shadow-premium"
        )}>
          <div className="flex items-center space-x-2 mb-1">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span className={cn(
              "text-xs",
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              Week P&L
            </span>
          </div>
          <div className={cn(
            "text-xl font-bold",
            historyTotalPnL >= 0 
              ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
              : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
          )}>
            {historyTotalPnL >= 0 ? '+' : ''}{historyTotalPnL.toFixed(1)} pips
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation with Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-between mb-6"
      >
        {/* Left: Tab buttons */}
        <div className="flex space-x-2">
          {[
            { key: 'live', label: 'Live Trades', count: filteredLiveTrades.length },
            { key: 'history', label: 'Trade History', count: filteredHistoryTrades.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'live' | 'history')}
              className={cn(
                "flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                activeTab === tab.key
                  ? theme === 'dark'
                    ? "bg-card-dark text-dark-text-primary shadow-premium-dark border border-dark-border"
                    : "bg-card-light text-light-text-primary shadow-premium border border-light-border"
                  : theme === 'dark'
                    ? "text-dark-text-secondary hover:text-dark-text-primary hover:bg-card-dark"
                    : "text-light-text-secondary hover:text-light-text-primary hover:bg-card-light"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs",
                activeTab === tab.key
                  ? theme === 'dark' ? "bg-dark-bg text-dark-text-primary" : "bg-light-bg text-light-text-primary"
                  : theme === 'dark' ? "bg-dark-surface text-dark-text-muted" : "bg-light-surface text-light-text-muted"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right: Filters */}
        <div className="flex items-center gap-6">
          {/* Engine Filter */}
          <div className="flex items-center space-x-2">
            <Filter className={cn(
              "w-4 h-4",
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )} />
            <span className={cn(
              "text-sm font-medium",
              theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
            )}>
              Engine:
            </span>
            <div className="flex space-x-1">
              {[
                { key: 'all' as const, label: 'All' },
                { key: 'v1' as const, label: 'V1' },
                { key: 'v2' as const, label: 'V2' },
                { key: 'v3' as const, label: 'V3' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setEngineFilter(filter.key)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300",
                    engineFilter === filter.key
                      ? theme === 'dark'
                        ? "bg-card-dark text-dark-text-primary border border-dark-border"
                        : "bg-card-light text-light-text-primary border border-light-border"
                      : theme === 'dark'
                        ? "text-dark-text-muted hover:text-dark-text-secondary hover:bg-dark-surface"
                        : "text-light-text-muted hover:text-light-text-secondary hover:bg-light-surface"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Filter (for history only) */}
          {activeTab === 'history' && (
            <div className="flex items-center space-x-2">
              <Calendar className={cn(
                "w-4 h-4",
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )} />
              <span className={cn(
                "text-sm font-medium",
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Period:
              </span>
              <div className="flex space-x-1">
                {[
                  { key: '1D' as const, label: 'Today' },
                  { key: '1W' as const, label: 'This Week' },
                  { key: '1M' as const, label: 'Month' },
                  { key: 'ALL' as const, label: 'All' }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setTimeFilter(filter.key)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300",
                      timeFilter === filter.key
                        ? theme === 'dark'
                          ? "bg-card-dark text-dark-text-primary border border-dark-border"
                          : "bg-card-light text-light-text-primary border border-light-border"
                        : theme === 'dark'
                          ? "text-dark-text-muted hover:text-dark-text-secondary hover:bg-dark-surface"
                          : "text-light-text-muted hover:text-light-text-secondary hover:bg-light-surface"
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Trade Cards */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn(
              "backdrop-blur-xl border rounded-2xl p-6 animate-pulse",
              theme === 'dark'
                ? "bg-card-dark border-dark-border"
                : "bg-card-light border-light-border"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "w-32 h-6 rounded",
                  theme === 'dark' ? "bg-white/10" : "bg-black/10"
                )}></div>
                <div className={cn(
                  "w-20 h-6 rounded",
                  theme === 'dark' ? "bg-white/10" : "bg-black/10"
                )}></div>
              </div>
              <div className="space-y-2">
                <div className={cn(
                  "w-full h-4 rounded",
                  theme === 'dark' ? "bg-white/10" : "bg-black/10"
                )}></div>
                <div className={cn(
                  "w-3/4 h-4 rounded",
                  theme === 'dark' ? "bg-white/10" : "bg-black/10"
                )}></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            activeTab === 'live' 
              ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
              : "space-y-4"
          )}
        >
          {(activeTab === 'live' ? filteredLiveTrades : filteredHistoryTrades).map((trade) => {
            const isProfitable = trade.pnl >= 0;
            const isActive = trade.status === 'ACTIVE';
            
            return (
              <motion.div
                key={trade.id}
                variants={cardVariants}
                className={cn(
                  "backdrop-blur-xl border rounded-xl p-3 transition-all duration-300 hover:scale-[1.01]",
                  theme === 'dark'
                    ? "bg-card-dark hover:bg-card-hover-dark border-dark-border shadow-premium-dark"
                    : "bg-card-light hover:bg-card-hover-light border-light-border shadow-premium",
                  isActive && "ring-1 ring-blue-400/30"
                )}
              >
                {/* Top row: Asset, Direction, P&L */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {/* Engine indicator */}
                    <div className={cn("w-2 h-2 rounded-full", getEngineGradient(trade.engine))}></div>
                    
                    {/* Asset */}
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center justify-center w-6 h-6">
                        {getAssetIcon(trade.symbol)}
                      </div>
                      <span className={cn(
                        "font-semibold",
                        theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                      )}>
                        {trade.symbol}
                      </span>
                    </div>
                    
                    {/* Direction */}
                    <div className={cn(
                      "flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium",
                      trade.direction === 'BUY' 
                        ? theme === 'dark'
                          ? "bg-green-500/15 text-trading-up-dark"
                          : "bg-green-500/15 text-trading-up-light"
                        : theme === 'dark'
                          ? "bg-red-500/15 text-trading-down-dark"
                          : "bg-red-500/15 text-trading-down-light"
                    )}>
                      {trade.direction === 'BUY' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{trade.direction}</span>
                    </div>

                    {/* Engine label */}
                    <span className={cn(
                      "text-xs px-2 py-1 rounded bg-gray-500/10",
                      theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
                    )}>
                      {getEngineLabel(trade.engine)}
                    </span>

                    {/* Status */}
                    {!isActive ? (
                      <div className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        trade.status === 'CLOSED'
                          ? "bg-gray-500/15 text-gray-400"
                          : "bg-blue-500/15 text-blue-400"
                      )}>
                        {trade.status}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 font-medium text-xs">LIVE</span>
                      </div>
                    )}
                  </div>
                  
                  {/* P&L */}
                  <div className="text-right">
                    <div className={cn(
                      "text-lg font-bold",
                      isProfitable 
                        ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                        : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                    )}>
                      {isProfitable ? '+' : ''}{trade.pnl.toFixed(1)} pips
                    </div>
                    <div className={cn(
                      "text-xs font-medium",
                      isProfitable 
                        ? theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                        : theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                    )}>
                      {isProfitable ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
                
                {/* Price info row */}
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        "text-xs",
                        theme === 'dark' ? "text-dark-text-muted" : "text-light-text-muted"
                      )}>
                        Entry:
                      </span>
                      <span className={cn(
                        "font-mono font-medium",
                        theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                      )}>
                        {formatPrice(trade.symbol, trade.entry)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        "text-xs",
                        theme === 'dark' ? "text-dark-text-muted" : "text-light-text-muted"
                      )}>
                        {isActive ? 'Current:' : 'Exit:'}
                      </span>
                      <span className={cn(
                        "font-mono font-medium",
                        theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                      )}>
                        {formatPrice(trade.symbol, trade.currentPrice)}
                      </span>
                    </div>
                    
                    {trade.takeProfit && (
                      <div className="flex items-center space-x-2">
                        <div className={cn(
                          "flex items-center space-x-1 text-xs",
                          theme === 'dark' ? "text-dark-text-muted" : "text-light-text-muted"
                        )}>
                          <Target className="w-3 h-3" />
                          <span>TP:</span>
                        </div>
                        <span className={cn(
                          "font-mono font-medium text-xs",
                          theme === 'dark' ? "text-trading-up-dark" : "text-trading-up-light"
                        )}>
                          {formatPrice(trade.symbol, trade.takeProfit)}
                        </span>
                      </div>
                    )}
                    
                    {trade.stopLoss && (
                      <div className="flex items-center space-x-2">
                        <div className={cn(
                          "flex items-center space-x-1 text-xs",
                          theme === 'dark' ? "text-dark-text-muted" : "text-light-text-muted"
                        )}>
                          <Shield className="w-3 h-3" />
                          <span>SL:</span>
                        </div>
                        <span className={cn(
                          "font-mono font-medium text-xs",
                          theme === 'dark' ? "text-trading-down-dark" : "text-trading-down-light"
                        )}>
                          {formatPrice(trade.symbol, trade.stopLoss)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {(() => {
                  const progressData = calculateProgressBarData(trade);
                  if (!progressData) return null;
                  
                  const { entryPos, currentPos, riskPercent, rewardPercent, visualRiskStart, visualRewardStart } = progressData;
                  const isProfitable = trade.pnl >= 0;
                  
                  // Calculate fill parameters  
                  let fillStart, fillWidth, fillColor;
                  
                  fillStart = Math.min(entryPos, currentPos);
                  fillWidth = Math.abs(currentPos - entryPos);
                  fillColor = isProfitable ? 'bg-green-400' : 'bg-red-400';
                  
                  return (
                    <div className="mb-2">
                      <div className="relative">
                        {/* Main progress bar with risk/reward zones */}
                        <div className={cn(
                          "h-3 rounded-full relative overflow-hidden border",
                          theme === 'dark' ? "border-dark-border/30" : "border-light-border/30"
                        )}>
                          {/* Risk zone background */}
                          <div
                            className="absolute h-full bg-red-500/15"
                            style={{
                              left: `${visualRiskStart}%`,
                              width: `${riskPercent}%`
                            }}
                          />
                          
                          {/* Reward zone background */}
                          <div
                            className="absolute h-full bg-green-500/15"
                            style={{
                              left: `${visualRewardStart}%`,
                              width: `${rewardPercent}%`
                            }}
                          />
                          
                          {/* Entry point divider */}
                          <div
                            className="absolute top-0 w-0.5 h-full bg-blue-400/60 z-5"
                            style={{ left: `${entryPos}%` }}
                          />
                          
                          {/* Current position fill */}
                          <div
                            className={cn("absolute h-full transition-all duration-500 opacity-80", fillColor)}
                            style={{
                              left: `${fillStart}%`,
                              width: `${fillWidth}%`
                            }}
                          />
                          
                          {/* Current position marker */}
                          <div
                            className="absolute top-0 w-1 h-full bg-white shadow-lg z-10 rounded-full"
                            style={{ left: `${currentPos}%`, transform: 'translateX(-50%)' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Bottom row: Time and ID */}
                <div className={cn(
                  "flex items-center justify-between text-xs pt-2 border-t",
                  theme === 'dark' 
                    ? "text-dark-text-muted border-dark-border/30" 
                    : "text-light-text-muted border-light-border/30"
                )}>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3" />
                    <span>{isActive ? formatDuration(trade.timestamp) : formatDateTime(trade.timestamp)}</span>
                  </div>
                  <span>ID: {trade.id.slice(-8)}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && (
        <>
          {activeTab === 'live' && filteredLiveTrades.length === 0 && (
            <div className="text-center py-16">
              <div className={cn(
                "w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center",
                theme === 'dark' ? "bg-dark-surface" : "bg-light-surface"
              )}>
                <Activity className={cn(
                  "w-10 h-10",
                  theme === 'dark' ? "text-dark-text-muted" : "text-light-text-muted"
                )} />
              </div>
              <h3 className={cn(
                "text-xl font-semibold mb-2",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                No Active Trades
              </h3>
              <p className={cn(
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                Waiting for trading signals from engines...
              </p>
            </div>
          )}

          {activeTab === 'history' && filteredHistoryTrades.length === 0 && (
            <div className="text-center py-16">
              <div className={cn(
                "w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center",
                theme === 'dark' ? "bg-dark-surface" : "bg-light-surface"
              )}>
                <BarChart3 className={cn(
                  "w-10 h-10",
                  theme === 'dark' ? "text-dark-text-muted" : "text-light-text-muted"
                )} />
              </div>
              <h3 className={cn(
                "text-xl font-semibold mb-2",
                theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
              )}>
                No Trade History
              </h3>
              <p className={cn(
                theme === 'dark' ? "text-dark-text-secondary" : "text-light-text-secondary"
              )}>
                No trades found for the selected time period and filters.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}