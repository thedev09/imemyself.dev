// Theme types
export type Theme = 'light' | 'dark';

// Trading engine types
export type Engine = 'v1' | 'v2' | 'v3';

// Asset types
export type AssetSymbol = 'XAUUSD' | 'USDJPY' | 'BTCUSD';

// VPS Status
export interface VPSStatus {
  status: 'online' | 'offline' | 'warning';
  lastHeartbeat?: number;
  uptime?: number;
  message?: string;
}

// Trading session types
export interface TradingSession {
  name: string;
  timezone: string;
  isActive: boolean;
  openTime: string;
  closeTime: string;
  currentTime?: string;
}

// Market data types
export interface MarketPrice {
  symbol: AssetSymbol;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  quality: 'VALIDATED' | 'CACHED_STALE';
}

// Engine bias types
export interface EngineBias {
  engine: Engine;
  symbol: AssetSymbol;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  timestamp: number;
  reasoning?: string;
  entry?: number;
  takeProfit?: number;
  stopLoss?: number;
}

// Live trade types
export interface LiveTrade {
  id: string;
  engine: Engine;
  symbol: AssetSymbol;
  direction: 'BUY' | 'SELL';
  entry: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  takeProfit?: number;
  stopLoss?: number;
  timestamp: number;
  status: 'ACTIVE' | 'CLOSED' | 'PENDING' | 'SIGNAL' | 'ERROR';
  // FIXED: Add additional fields for proper analytics
  confidence?: number;
  pnlPips?: number;
  openedAt?: number;
  closedAt?: number;
  error?: boolean | string;
  type?: string;
}

// System info types
export interface SystemInfo {
  mode: string;
  engines: Engine[];
  assets: AssetSymbol[];
  apiCalls: number;
  uptime: number;
  performance: {
    [K in Engine]: {
      signals: number;
      avgConfidence: number;
      errors: number;
    };
  };
}