// HueHue Optimized Configuration - Updated with BTCUSD Support
const CONFIG = {
    // Twelve Data API Configuration
    TWELVE_DATA: {
        baseUrl: 'https://api.twelvedata.com',
        apiKey: 'Lol',
        maxCallsPerMinute: 55,
        rateLimitBuffer: 5,
        timeoutMs: 10000
    },

    // Trading Assets - Updated with BTCUSD
    ASSETS: {
        XAUUSD: {
            symbol: 'XAUUSD',
            name: 'Gold',
            type: 'COMMODITY',
            twelveSymbol: 'XAU/USD',
            marketType: 'FOREX',
            tradingHours: '5_days',
            pipValue: 0.1,
            digits: 2,
            contractSize: 100,
            minMove: 0.01
        },
        USDJPY: {
            symbol: 'USDJPY',
            name: 'Dollar Yen',
            type: 'FOREX',
            twelveSymbol: 'USD/JPY',
            marketType: 'FOREX',
            tradingHours: '5_days',
            pipValue: 0.01,
            digits: 3,
            contractSize: 100000,
            minMove: 0.001
        },
        BTCUSD: {
            symbol: 'BTCUSD',
            name: 'Bitcoin',
            type: 'CRYPTO',
            twelveSymbol: 'BTC/USD',
            marketType: 'CRYPTO',
            tradingHours: '24_7',
            pipValue: 1,
            digits: 0,
            contractSize: 1,
            minMove: 1
        }
    },

    // EA Parameters - Much More Restrictive
    EA_PARAMS: {
        riskPercent: 2.0,
        stopLossATRMult: 1.8,
        takeProfitRatio: 2.8,
        emaFastPeriod: 12,
        emaSlowPeriod: 26,
        smaTrendPeriod: 80,
        rsiPeriod: 14,
        atrPeriod: 14,
        bbPeriod: 20,
        bbDev: 2.0,
        rsiOversold: 30.0,        // More restrictive (was 40)
        rsiOverbought: 70.0,      // More restrictive (was 60)
        minTrendStrength: 5.0,    // Much higher (was 3.0)
        volumeMultiplier: 1.5,    // Higher volume requirement (was 1.2)
        minSignalStrength: 5,     // Require 5/6 conditions (was 4)
        maxSignalStrength: 6,
        maxTradesPerDay: 2,       // Only 2 trades per day (was 4)
        dailyDrawdown: 4.0,
        signalCooldown: 3600000   // 1 hour cooldown between signals (new)
    },

    // Trading Hours
    TRADING_HOURS: {
        start: 2,
        end: 21,
        fridayClose: 20,
        newsAvoidance: [7, 8, 12, 14] // UTC hours to avoid during major news
    },

    // Update Intervals - Much Less Frequent
    UPDATE_INTERVALS: {
        priceUpdate: 30000,          // 30 seconds (was 15)
        indicatorUpdate: 600000,     // 10 minutes (was 3 minutes)
        signalCheck: 300000,         // 5 minutes (was 1 minute)
        dashboardRefresh: 10000,     // 10 seconds (was 5)
        errorRetry: 30000,
        healthCheck: 60000
    },

    // Cache Settings - Optimized
    CACHE: {
        priceMaxAge: 30000,          // 30 seconds
        historicalMaxAge: 300000,    // 5 minutes
        indicatorMaxAge: 180000,     // 3 minutes
        maxCacheSize: 50             // Reduced cache size
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

    // Error Handling Configuration
    ERROR_HANDLING: {
        maxRetries: 3,
        retryDelay: 5000,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 300000, // 5 minutes
        logLevel: 'error' // 'debug', 'info', 'warn', 'error'
    },

    // Performance Settings
    PERFORMANCE: {
        enableCache: true,
        enableRateLimit: true,
        enableErrorTracking: true,
        maxConcurrentRequests: 3,
        requestTimeout: 10000
    }
};

// Helper Functions - Updated with BTCUSD support
CONFIG.getAssetConfig = function(symbol) {
    return CONFIG.ASSETS[symbol?.toUpperCase()] || null;
};

CONFIG.isValidTradingTime = function() {
    const now = new Date();
    const hour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay();
    
    // No weekend trading for forex
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    
    // Trading hours check
    if (hour < CONFIG.TRADING_HOURS.start || hour > CONFIG.TRADING_HOURS.end) return false;
    
    // Friday early close
    if (dayOfWeek === 5 && hour >= CONFIG.TRADING_HOURS.fridayClose) return false;
    
    return true;
};

// NEW: Check if specific asset is closed for weekend
CONFIG.isAssetClosedForWeekend = function(symbol) {
    const asset = CONFIG.getAssetConfig(symbol);
    if (!asset) return false;
    
    // Crypto never closes (24/7/365)
    if (asset.tradingHours === '24_7') return false;
    
    // Check if it's weekend for forex/commodity markets
    const now = new Date();
    const day = now.getUTCDay();
    const hour = now.getUTCHours();
    
    return (day === 6) || (day === 0 && hour < 21);
};

CONFIG.getCurrentSession = function() {
    const now = new Date();
    const hour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    
    // FIRST CHECK: Weekend market closure (for forex only - crypto runs 24/7)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return { name: 'Market Closed - Weekend', active: false };
    }
    
    // SECOND CHECK: Friday early close (after 20:00 UTC on Friday)
    if (dayOfWeek === 5 && hour >= 20) {
        return { name: 'Market Closed - Weekend', active: false };
    }
    
    // THIRD CHECK: Sunday night market opening (after 21:00 UTC on Sunday)
    if (dayOfWeek === 0 && hour < 21) {
        return { name: 'Market Closed - Weekend', active: false };
    }
    
    // NOW CHECK ACTIVE SESSIONS (Monday 00:00 UTC to Friday 20:00 UTC)
    
    // London + NY overlap (most important) - 13:00-16:00 UTC
    if (hour >= 13 && hour < 16) {
        return { name: 'London + New York Session', active: true };
    }
    // New York session - 13:00-22:00 UTC
    else if (hour >= 13 && hour < 22) {
        return { name: 'New York Session', active: true };
    }
    // London session - 07:00-16:00 UTC
    else if (hour >= 7 && hour < 16) {
        return { name: 'London Session', active: true };
    }
    // Tokyo session - 23:00-08:00 UTC (spans midnight)
    else if (hour >= 23 || hour < 8) {
        return { name: 'Tokyo Session', active: true };
    }
    // Sydney session - 21:00-06:00 UTC (spans midnight)
    else if (hour >= 21 || hour < 6) {
        return { name: 'Sydney Session', active: true };
    }
    
    // If no session matches, market is closed
    return { name: 'Market Closed', active: false };
};

CONFIG.shouldAvoidNews = function() {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    
    return CONFIG.TRADING_HOURS.newsAvoidance.includes(hour) && minute <= 30;
};

CONFIG.formatPrice = function(symbol, price) {
    if (!symbol || price === undefined || price === null || isNaN(price)) {
        return '--';
    }
    
    try {
        const asset = CONFIG.getAssetConfig(symbol);
        if (!asset) return price.toFixed(4);
        
        if (symbol === 'XAUUSD') {
            return `$${price.toLocaleString('en-US', {
                minimumFractionDigits: asset.digits,
                maximumFractionDigits: asset.digits
            })}`;
        } else if (symbol === 'USDJPY') {
            return `¥${price.toFixed(asset.digits)}`;
        } else if (symbol === 'BTCUSD') {
            return `$${price.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            })}`;
        }
        
        return price.toFixed(asset.digits);
    } catch (error) {
        console.warn('Error formatting price:', error);
        return '--';
    }
};

CONFIG.validateApiResponse = function(data, expectedFields = []) {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid response format' };
    }
    
    // Check for API error codes
    if (data.code && data.code !== 200) {
        return { 
            valid: false, 
            error: data.message || `API Error ${data.code}`,
            code: data.code 
        };
    }
    
    // Check for expected fields
    for (const field of expectedFields) {
        if (data[field] === undefined || data[field] === null) {
            return { 
                valid: false, 
                error: `Missing required field: ${field}` 
            };
        }
    }
    
    return { valid: true };
};

CONFIG.log = function(level, message, ...args) {
    try {
        const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
        const currentLevel = logLevels[CONFIG.ERROR_HANDLING?.logLevel] || 3;
        const messageLevel = logLevels[level] || 0;
        
        if (messageLevel >= currentLevel) {
            const timestamp = new Date().toISOString();
            const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
            
            switch (level) {
                case 'error':
                    console.error(prefix, message, ...args);
                    break;
                case 'warn':
                    console.warn(prefix, message, ...args);
                    break;
                case 'info':
                    console.info(prefix, message, ...args);
                    break;
                default:
                    console.log(prefix, message, ...args);
            }
        }
    } catch (error) {
        // Fallback logging if CONFIG is not properly loaded
        console.log(`[${level.toUpperCase()}]`, message, ...args);
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Log initialization
CONFIG.log('info', '⚙️ HueHue Optimized Configuration Loaded with BTCUSD support');