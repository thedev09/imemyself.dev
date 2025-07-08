// HueHue Configuration - Updated for Live Data
const CONFIG = {
    // Twelve Data API Configuration
    TWELVE_DATA: {
        baseUrl: 'https://api.twelvedata.com',
        apiKey: 'b1b1a8bf0e4b4848b1a68bd4bb7ceb9c', // Your actual API key
        maxCallsPerMinute: 55, // Your Grow plan limit
        rateLimitBuffer: 5 // Keep 5 calls as buffer
    },

    // Trading Assets
    ASSETS: {
        XAUUSD: {
            symbol: 'XAUUSD',
            name: 'Gold',
            type: 'COMMODITY',
            twelveSymbol: 'XAU/USD',
            pipValue: 0.1,
            digits: 2,
            contractSize: 100,
            minMove: 0.01,
            tradingHours: {
                start: 23, // Sunday 23:00 UTC
                end: 21,   // Friday 21:00 UTC
            }
        },
        USDJPY: {
            symbol: 'USDJPY',
            name: 'Dollar Yen',
            type: 'FOREX',
            twelveSymbol: 'USD/JPY',
            pipValue: 0.01,
            digits: 3,
            contractSize: 100000,
            minMove: 0.001,
            tradingHours: {
                start: 23, // Sunday 23:00 UTC
                end: 21,   // Friday 21:00 UTC
            }
        }
    },

    // EA Parameters (exactly matching your MT5 EA)
    EA_PARAMS: {
        // Risk Management
        autoStopTarget: 10.0,        // Auto-stop profit target (%)
        maxDrawdown: 10.0,           // Maximum drawdown (%)
        dailyDrawdown: 4.0,          // Daily drawdown limit (%)
        riskPercent: 2.0,            // Risk per trade (%)
        maxTradesPerDay: 4,          // Maximum trades per day

        // Position Management
        stopLossATRMult: 1.8,        // Stop loss ATR multiplier
        takeProfitRatio: 2.8,        // Risk:Reward ratio
        baseMinPosition: 0.5,        // Min lots for base account
        baseMaxPosition: 2.0,        // Max lots for base account
        baseAccountSize: 50000.0,    // Base account size for scaling

        // Technical Indicators
        emaFastPeriod: 12,           // Fast EMA period
        emaSlowPeriod: 26,           // Slow EMA period
        smaTrendPeriod: 80,          // Trend SMA period
        rsiPeriod: 14,               // RSI period
        atrPeriod: 14,               // ATR period
        bbPeriod: 20,                // Bollinger Bands period
        bbDev: 2.0,                  // Bollinger Bands deviation

        // Entry Conditions
        rsiOversold: 40.0,           // RSI oversold level
        rsiOverbought: 60.0,         // RSI overbought level
        minTrendStrength: 3.0,       // Minimum trend strength (points)
        volumeMultiplier: 1.2,       // Volume multiplier

        // Signal Threshold
        minSignalStrength: 4,        // Minimum conditions met (4/6)
        maxSignalStrength: 6         // Maximum possible conditions
    },

    // Trading Hours
    TRADING_HOURS: {
        start: 2,                    // Trading start hour (UTC)
        end: 21,                     // Trading end hour (UTC)
        fridayClose: 20,             // Friday close hour (UTC)
        newsAvoidance: [7, 8, 12, 14] // Hours to avoid (major news)
    },

    // Update Intervals (optimized for API limits)
    UPDATE_INTERVALS: {
        priceUpdate: 10000,          // 10 seconds (to respect rate limits)
        indicatorUpdate: 60000,      // 1 minute
        signalCheck: 30000,          // 30 seconds
        dashboardRefresh: 5000,      // 5 seconds (UI only)
        dataBackup: 24 * 60 * 60 * 1000 // 24 hours
    },

    // Cache Settings
    CACHE: {
        priceMaxAge: 30000,          // 30 seconds for prices
        historicalMaxAge: 300000,    // 5 minutes for historical data
        indicatorMaxAge: 60000,      // 1 minute for indicators
        maxCacheSize: 100            // Maximum cache entries
    },

    // UI Settings
    UI: {
        theme: 'dark',
        animations: true,
        soundAlerts: false,
        showMiniCharts: true,
        maxSignalsDisplay: 20,
        autoScroll: true,
        priceUpdateAnimation: true
    },

    // Market Sessions
    MARKET_SESSIONS: {
        SYDNEY: { start: 21, end: 6, name: 'Sydney', emoji: '🇦🇺' },
        TOKYO: { start: 23, end: 8, name: 'Tokyo', emoji: '🇯🇵' },
        LONDON: { start: 7, end: 16, name: 'London', emoji: '🇬🇧' },
        NEW_YORK: { start: 13, end: 22, name: 'New York', emoji: '🇺🇸' }
    },

    // Signal Types
    SIGNAL_TYPES: {
        BUY: 'BUY',
        SELL: 'SELL',
        NEUTRAL: 'NEUTRAL'
    },

    // Confluence Conditions (matching your EA exactly)
    CONFLUENCE_CONDITIONS: {
        TREND: 'trend',              // Price vs SMA + EMA alignment
        STRENGTH: 'strength',        // EMA distance (trend strength)
        RSI: 'rsi',                 // RSI momentum
        POSITION: 'position',        // BB position + EMA relationship
        PRICE_ACTION: 'priceAction', // Candle pattern + momentum
        VOLUME: 'volume'            // Volume + volatility
    },

    // Debug and Development
    DEBUG: {
        enabled: true,               // Enable debug logging
        mockData: false,             // Use mock data instead of real APIs
        logLevel: 'info',            // log, info, warn, error
        showAPIRequests: true,       // Log API requests
        showRateLimit: true,         // Show rate limit info
        showCacheHits: false         // Show cache hit/miss info
    },

    // Data Source Priorities
    DATA_SOURCES: {
        primary: 'twelve_data',      // Primary: Twelve Data
        fallback: 'simulation',      // Fallback: Simulation
        available: ['twelve_data', 'simulation']
    }
};

// Helper Functions
CONFIG.getAssetConfig = function(symbol) {
    return CONFIG.ASSETS[symbol.toUpperCase()] || null;
};

CONFIG.isValidTradingTime = function() {
    const now = new Date();
    const hour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay();
    
    // No weekend trading
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    
    // Trading hours check
    if (hour < CONFIG.TRADING_HOURS.start || hour > CONFIG.TRADING_HOURS.end) return false;
    
    // Friday early close
    if (dayOfWeek === 5 && hour >= CONFIG.TRADING_HOURS.fridayClose) return false;
    
    return true;
};

CONFIG.getCurrentSession = function() {
    const hour = new Date().getUTCHours();
    
    for (const [sessionName, session] of Object.entries(CONFIG.MARKET_SESSIONS)) {
        let startHour = session.start;
        let endHour = session.end;
        
        // Handle sessions that cross midnight
        if (startHour > endHour) {
            if (hour >= startHour || hour < endHour) {
                return { name: sessionName, ...session, active: true };
            }
        } else {
            if (hour >= startHour && hour < endHour) {
                return { name: sessionName, ...session, active: true };
            }
        }
    }
    
    return { name: 'CLOSED', active: false };
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Debug log
if (CONFIG.DEBUG.enabled) {
    console.log('⚙️ HueHue Configuration Loaded');
    console.log('📊 Assets:', Object.keys(CONFIG.ASSETS));
    console.log('🔧 EA Params loaded');
    console.log('📡 Data source:', CONFIG.DATA_SOURCES.primary);
    console.log('⏰ Update intervals set');
    console.log('💾 Cache settings configured');
}