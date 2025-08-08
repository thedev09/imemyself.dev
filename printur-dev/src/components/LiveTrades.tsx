import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, Clock, Target, Shield, Crown, DollarSign, Bitcoin, BarChart3 } from 'lucide-react';
import { dataService } from '../services/dataService';
import type { LiveTrade, AssetSymbol, Engine } from '../types';
import { cn } from '../utils/cn';

export function LiveTrades() {
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = dataService.subscribeToLiveTrades((newTrades) => {
      setTrades(newTrades);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const getEngineColor = (engine: Engine) => {
    switch (engine) {
      case 'v1': return 'bg-blue-500';
      case 'v2': return 'bg-purple-500';
      case 'v3': return 'bg-cyan-500';
      default: return 'bg-gray-500';
    }
  };

  const getEngineLabel = (engine: Engine) => {
    switch (engine) {
      case 'v1': return 'Smart';
      case 'v2': return 'AI Enhanced';
      case 'v3': return 'Simple';
      default: return engine;
    }
  };

  const getAssetIcon = (symbol: AssetSymbol) => {
    const iconProps = { className: "w-5 h-5" };
    
    switch (symbol) {
      case 'XAUUSD': return <Crown {...iconProps} className="w-5 h-5 text-yellow-400" />;
      case 'USDJPY': return <DollarSign {...iconProps} className="w-5 h-5 text-blue-400" />;
      case 'BTCUSD': return <Bitcoin {...iconProps} className="w-5 h-5 text-orange-400" />;
      default: return <BarChart3 {...iconProps} className="w-5 h-5 text-gray-400" />;
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

  const formatPnL = (pnl: number, pnlPercent: number) => {
    const sign = pnl >= 0 ? '+' : '';
    return {
      absolute: `${sign}${pnl.toFixed(2)}`,
      percent: `${sign}${pnlPercent.toFixed(2)}%`
    };
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    } else {
      return `${minutes}m ago`;
    }
  };

  const activeTrades = trades.filter(t => t.status === 'ACTIVE');
  const totalPnL = activeTrades.reduce((sum, trade) => sum + trade.pnl, 0);

  if (isLoading) {
    return (
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Live Trades
          </h3>
          <Activity className="w-5 h-5 text-green-500" />
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-20 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="w-3/4 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTrades.length === 0) {
    return (
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Live Trades
          </h3>
          <Activity className="w-5 h-5 text-gray-500" />
        </div>
        
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Activity className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Active Trades
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Waiting for trading signals from engines...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Live Trades
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-soft"></div>
          <Activity className="w-5 h-5 text-green-500" />
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Trades</span>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {activeTrades.length}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Total P&L</span>
              <div className={cn(
                "text-lg font-bold",
                totalPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {formatPnL(totalPnL, 0).absolute}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {activeTrades.map((trade) => {
          const pnlFormatted = formatPnL(trade.pnl, trade.pnlPercent);
          const isProfitable = trade.pnl >= 0;
          
          return (
            <div
              key={trade.id}
              className={cn(
                "p-4 rounded-lg border transition-all",
                isProfitable 
                  ? "bg-green-500/5 border-green-500/20" 
                  : "bg-red-500/5 border-red-500/20",
                "hover:bg-white/50 dark:hover:bg-gray-800/50"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className={cn("w-2 h-2 rounded-full", getEngineColor(trade.engine))}></div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {getEngineLabel(trade.engine)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-center w-6 h-6">
                      {getAssetIcon(trade.symbol)}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {trade.symbol}
                    </span>
                  </div>
                  
                  <div className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
                    trade.direction === 'BUY' 
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  )}>
                    {trade.direction === 'BUY' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{trade.direction}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={cn(
                    "text-lg font-bold",
                    isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {pnlFormatted.absolute}
                  </div>
                  <div className={cn(
                    "text-sm font-medium",
                    isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {pnlFormatted.percent}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Entry</span>
                  <div className="font-mono text-gray-900 dark:text-white">
                    {formatPrice(trade.symbol, trade.entry)}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Current</span>
                  <div className="font-mono text-gray-900 dark:text-white">
                    {formatPrice(trade.symbol, trade.currentPrice)}
                  </div>
                </div>
                
                {trade.takeProfit && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                      <Target className="w-3 h-3" />
                      <span>TP</span>
                    </span>
                    <div className="font-mono text-green-600 dark:text-green-400">
                      {formatPrice(trade.symbol, trade.takeProfit)}
                    </div>
                  </div>
                )}
                
                {trade.stopLoss && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                      <Shield className="w-3 h-3" />
                      <span>SL</span>
                    </span>
                    <div className="font-mono text-red-600 dark:text-red-400">
                      {formatPrice(trade.symbol, trade.stopLoss)}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(trade.timestamp)}</span>
                  </div>
                  <span>ID: {trade.id.slice(-8)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}