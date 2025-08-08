import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Crown, Bitcoin, BarChart3 } from 'lucide-react';
import { dataService } from '../services/dataService';
import type { MarketPrice, AssetSymbol } from '../types';
import { cn } from '../utils/cn';

export function MarketData() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = dataService.subscribeToMarketPrices((newPrices) => {
      setPrices(newPrices);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

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
      case 'XAUUSD':
        return `$${price.toFixed(2)}`;
      case 'USDJPY':
        return `¥${price.toFixed(3)}`;
      case 'BTCUSD':
        return `$${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      default:
        return price.toString();
    }
  };

  const getAssetName = (symbol: AssetSymbol) => {
    switch (symbol) {
      case 'XAUUSD':
        return 'Gold';
      case 'USDJPY':
        return 'USD/JPY';
      case 'BTCUSD':
        return 'Bitcoin';
      default:
        return symbol;
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Market Data
          </h3>
          <DollarSign className="w-5 h-5 text-green-500" />
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between p-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  <div>
                    <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                    <div className="w-12 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-20 h-4 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                  <div className="w-16 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (prices.length === 0) {
    return (
      <div className="glass-card p-6 rounded-xl border-2 border-red-500/30 bg-red-500/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Market Data
          </h3>
          <DollarSign className="w-5 h-5 text-red-500" />
        </div>
        
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            System Offline
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Market data is currently unavailable. Check VPS status.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Market Data
        </h3>
        <DollarSign className="w-5 h-5 text-green-500" />
      </div>
      
      <div className="space-y-3">
        {prices.map((price) => (
          <div
            key={price.symbol}
            className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8">
                {getAssetIcon(price.symbol)}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {getAssetName(price.symbol)}
                  {price.symbol === 'BTCUSD' && (
                    <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                      24/7
                    </span>
                  )}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {price.symbol}
                  {(price.symbol === 'XAUUSD' || price.symbol === 'USDJPY') && (
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                      Forex
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatPrice(price.symbol, price.price)}
                </span>
                {price.quality === 'CACHED_STALE' && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full" title="Cached data"></div>
                )}
              </div>
              
              <div className="flex items-center space-x-1 mt-1">
                {price.changePercent >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  price.changePercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        ))}
        
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Last updated</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}