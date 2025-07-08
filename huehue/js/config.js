// HueHue Configuration - Simple Fix
const CONFIG = {
    // Twelve Data API Configuration
    TWELVE_DATA: {
        baseUrl: 'https://api.twelvedata.com',
        apiKey: 'b1b1a8bf0e4b4848b1a68bd4bb7ceb9c',
        maxCallsPerMinute: 55,
        rateLimitBuffer: 5
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
                start: 23,
                end: 21,
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
                start: 23,
                end: 21,
            }
        }
    },

    // EA Parameters
    EA_PARAMS: {
        autoStopTarget: 10.0,
        maxDrawdown: 10.0,
        dailyDrawdown: 4.0,
        riskPercent: 2.0,
        maxTradesPerDay: 4,
        stopLossATRMult: 1.8,
        takeProfitRatio: 2.8,
        baseMinPosition: 0.5,
        baseMaxPosition: 2.0,
        baseAccountSize: 50000.0,
        emaFastPeriod: 12,
        emaSlowPeriod: 26,
        smaTrendPeriod: 80,
        rsiPeriod: 14,
        atrPeriod: 14,
        bbPeriod: 20,
        bbDev: 2.0,
        rsiOversold: 40.0,
        rsiOverbought: 60.0,
        minTrendStrength: 3.0,
        volumeMultiplier: 1.2,
        minSignalStrength: 4,
        maxSignalStrength: 6
    },

    // Trading Hours
    TRADING_HOURS: {
        start: 2,
        end: 21,
        fridayClose: 20,
        newsAvoidance: [7, 8, 12, 14]
    },

    // Update Intervals (optimized)
    UPDATE_INTERVALS: {
        priceUpdate: 15000,          // 15 seconds
        indicatorUpdate: 120000,     // 2 minutes
        signalCheck: 60000,          // 1 minute
        dashboardRefresh: 5000,      // 5 seconds
        dataBackup: 24 * 60 * 60 * 1000
    },

    // Cache Settings
    CACHE: {
        priceMaxAge: 30000,
        historicalMaxAge: 300000,
        indicatorMaxAge: 60000,
        maxCacheSize: 100
    },

    // UI Settings (simplified)
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

    // Confluence Conditions
    CONFLUENCE_CONDITIONS: {
        TREND: 'trend',
        STRENGTH: 'strength',
        RSI: 'rsi',
        POSITION: 'position',
        PRICE_ACTION: 'priceAction',
        VOLUME: 'volume'
    },

    // Debug Settings (reduced for production)
    DEBUG: {
        enabled: false,              // Set to false for production
        mockData: false,
        logLevel: 'error',
        showAPIRequests: false,
        showRateLimit: false,
        showCacheHits: false
    },

    // Data Sources
    DATA_SOURCES: {
        primary: 'twelve_data',
        fallback: 'simulation',
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
    
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    if (hour < CONFIG.TRADING_HOURS.start || hour > CONFIG.TRADING_HOURS.end) return false;
    if (dayOfWeek === 5 && hour >= CONFIG.TRADING_HOURS.fridayClose) return false;
    
    return true;
};

CONFIG.getCurrentSession = function() {
    const hour = new Date().getUTCHours();
    
    // London + NY overlap (most important)
    if (hour >= 13 && hour < 16) {
        return { name: 'LONDON_NY', emoji: '🇬🇧🇺🇸', active: true };
    }
    // London session
    else if (hour >= 7 && hour < 16) {
        return { name: 'LONDON', emoji: '🇬🇧', active: true };
    }
    // New York session
    else if (hour >= 13 && hour < 22) {
        return { name: 'NEW_YORK', emoji: '🇺🇸', active: true };
    }
    // Tokyo session
    else if ((hour >= 23) || (hour < 8)) {
        return { name: 'TOKYO', emoji: '🇯🇵', active: true };
    }
    // Sydney session
    else if ((hour >= 21) || (hour < 6)) {
        return { name: 'SYDNEY', emoji: '🇦🇺', active: true };
    }
    
    return { name: 'CLOSED', emoji: '🌙', active: false };
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Simple log (only if debug enabled)
if (CONFIG.DEBUG.enabled) {
    console.log('⚙️ HueHue Configuration Loaded');
}