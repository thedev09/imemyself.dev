import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, Target, Crown, DollarSign, Bitcoin, BarChart3 } from 'lucide-react';
import { dataService } from '../services/dataService';
import type { EngineBias as EngineBiasType, Engine, AssetSymbol } from '../types';
import { cn } from '../utils/cn';

export function EngineBias() {
  const [biases, setBiases] = useState<Record<Engine, EngineBiasType[]>>({
    v1: [],
    v2: [],
    v3: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    // Subscribe to all three engines
    (['v1', 'v2', 'v3'] as Engine[]).forEach(engine => {
      const unsubscribe = dataService.subscribeToEngineBias(engine, (engineBiases) => {
        setBiases(prev => ({
          ...prev,
          [engine]: engineBiases
        }));
      });
      unsubscribes.push(unsubscribe);
    });

    setIsLoading(false);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const getEngineColor = (engine: Engine) => {
    switch (engine) {
      case 'v1': return 'text-blue-500';
      case 'v2': return 'text-purple-500';
      case 'v3': return 'text-cyan-500';
      default: return 'text-gray-500';
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

  const getBiasIcon = (bias: string) => {
    switch (bias) {
      case 'BULLISH':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'BEARISH':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'BULLISH':
        return 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400';
      case 'BEARISH':
        return 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400';
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400';
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

  const allBiases = Object.values(biases).flat();

  if (isLoading) {
    return (
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Engine Bias
          </h3>
          <Brain className="w-5 h-5 text-purple-500" />
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="w-12 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="w-full h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (allBiases.length === 0) {
    return (
      <div className="glass-card p-6 rounded-xl border-2 border-orange-500/30 bg-orange-500/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Engine Bias
          </h3>
          <Brain className="w-5 h-5 text-orange-500" />
        </div>
        
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
            <Brain className="w-8 h-8 text-orange-500" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Analysis Available
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Waiting for engine analysis data...
          </p>
        </div>
      </div>
    );
  }

  // Group biases by asset
  const biasesByAsset = allBiases.reduce((acc, bias) => {
    if (!acc[bias.symbol]) {
      acc[bias.symbol] = [];
    }
    acc[bias.symbol].push(bias);
    return acc;
  }, {} as Record<AssetSymbol, EngineBiasType[]>);

  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Engine Bias
        </h3>
        <Brain className="w-5 h-5 text-purple-500" />
      </div>
      
      <div className="space-y-6">
        {Object.entries(biasesByAsset).map(([symbol, assetBiases]) => (
          <div key={symbol} className="space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center w-6 h-6">
                {getAssetIcon(symbol as AssetSymbol)}
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {symbol}
              </h4>
            </div>
            
            <div className="grid gap-3">
              {assetBiases.map((bias) => (
                <div
                  key={`${bias.engine}-${bias.symbol}`}
                  className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50"
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn("text-sm font-medium", getEngineColor(bias.engine))}>
                      {getEngineLabel(bias.engine)}
                    </div>
                    <div className={cn(
                      "flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium",
                      getBiasColor(bias.bias)
                    )}>
                      {getBiasIcon(bias.bias)}
                      <span>{bias.bias}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {bias.confidence}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        confidence
                      </div>
                    </div>
                    
                    {bias.entry && (
                      <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                        <Target className="w-3 h-3" />
                        <span>{bias.entry.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-6 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">v1 Smart</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">v2 AI Enhanced</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">v3 Simple</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}