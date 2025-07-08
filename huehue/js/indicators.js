// HueHue Technical Indicators Calculator - Fixed
class TechnicalIndicators {
    constructor() {
        this.cache = new Map();
        this.log('Technical Indicators initialized');
    }

    // Simple Moving Average
    static sma(data, period) {
        if (!data || data.length < period) return null;
        
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / period);
        }
        return result;
    }

    // Exponential Moving Average
    static ema(data, period) {
        if (!data || data.length < period) return null;
        
        const multiplier = 2 / (period + 1);
        const result = [];
        
        // Start with SMA for first value
        const firstSMA = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
        result.push(firstSMA);
        
        // Calculate EMA for remaining values
        for (let i = period; i < data.length; i++) {
            const ema = (data[i] - result[result.length - 1]) * multiplier + result[result.length - 1];
            result.push(ema);
        }
        
        return result;
    }

    // Relative Strength Index
    static rsi(data, period = 14) {
        if (!data || data.length < period + 1) return null;
        
        const changes = [];
        for (let i = 1; i < data.length; i++) {
            changes.push(data[i] - data[i - 1]);
        }
        
        const gains = changes.map(change => change > 0 ? change : 0);
        const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);
        
        const avgGains = this.sma(gains, period);
        const avgLosses = this.sma(losses, period);
        
        if (!avgGains || !avgLosses) return null;
        
        const result = [];
        for (let i = 0; i < avgGains.length; i++) {
            if (avgLosses[i] === 0) {
                result.push(100);
            } else {
                const rs = avgGains[i] / avgLosses[i];
                const rsi = 100 - (100 / (1 + rs));
                result.push(rsi);
            }
        }
        
        return result;
    }

    // Average True Range
    static atr(highs, lows, closes, period = 14) {
        if (!highs || !lows || !closes || highs.length < period + 1) return null;
        
        const trueRanges = [];
        
        for (let i = 1; i < highs.length; i++) {
            const tr1 = highs[i] - lows[i];
            const tr2 = Math.abs(highs[i] - closes[i - 1]);
            const tr3 = Math.abs(lows[i] - closes[i - 1]);
            
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        return this.sma(trueRanges, period);
    }

    // Bollinger Bands
    static bollingerBands(data, period = 20, stdDev = 2) {
        if (!data || data.length < period) return null;
        
        const smaValues = this.sma(data, period);
        if (!smaValues) return null;
        
        const result = {
            upper: [],
            middle: [],
            lower: []
        };
        
        for (let i = 0; i < smaValues.length; i++) {
            const dataSlice = data.slice(i, i + period);
            const mean = smaValues[i];
            
            // Calculate standard deviation
            const variance = dataSlice.reduce((sum, value) => {
                return sum + Math.pow(value - mean, 2);
            }, 0) / period;
            
            const standardDeviation = Math.sqrt(variance);
            
            result.middle.push(mean);
            result.upper.push(mean + (standardDeviation * stdDev));
            result.lower.push(mean - (standardDeviation * stdDev));
        }
        
        return result;
    }

    // MACD
    static macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (!data || data.length < slowPeriod) return null;
        
        const fastEMA = this.ema(data, fastPeriod);
        const slowEMA = this.ema(data, slowPeriod);
        
        if (!fastEMA || !slowEMA) return null;
        
        // Align arrays (slow EMA starts later)
        const startIndex = slowPeriod - fastPeriod;
        const alignedFastEMA = fastEMA.slice(startIndex);
        
        const macdLine = [];
        for (let i = 0; i < Math.min(alignedFastEMA.length, slowEMA.length); i++) {
            macdLine.push(alignedFastEMA[i] - slowEMA[i]);
        }
        
        const signalLine = this.ema(macdLine, signalPeriod);
        
        return {
            macd: macdLine,
            signal: signalLine,
            histogram: macdLine.map((macd, i) => signalLine && signalLine[i] ? macd - signalLine[i] : 0)
        };
    }

    // Calculate all indicators for a symbol
    async calculateIndicators(symbol, historicalData) {
        try {
            // Check if CONFIG is available
            if (typeof CONFIG === 'undefined') {
                throw new Error('CONFIG not available');
            }

            const cacheKey = `indicators_${symbol}_${Date.now() - (Date.now() % 60000)}`; // 1-minute cache
            const cached = this.getCachedData(cacheKey);
            
            if (cached) {
                this.log(`📦 Using cached indicators for ${symbol}`);
                return cached;
            }

            const bars = historicalData?.bars;
            if (!bars || bars.length < 100) {
                throw new Error(`Insufficient data for ${symbol}: ${bars ? bars.length : 0} bars`);
            }

            // Extract price arrays
            const closes = bars.map(bar => bar.close);
            const highs = bars.map(bar => bar.high);
            const lows = bars.map(bar => bar.low);
            const volumes = bars.map(bar => bar.volume || 0);

            // Get EA params with defaults
            const eaParams = CONFIG.EA_PARAMS || {
                emaFastPeriod: 12,
                emaSlowPeriod: 26,
                smaTrendPeriod: 80,
                rsiPeriod: 14,
                atrPeriod: 14,
                bbPeriod: 20,
                bbDev: 2.0
            };

            // Calculate all indicators
            const indicators = {
                timestamp: Date.now(),
                symbol: symbol,
                
                // Moving Averages
                emaFast: TechnicalIndicators.ema(closes, eaParams.emaFastPeriod),
                emaSlow: TechnicalIndicators.ema(closes, eaParams.emaSlowPeriod),
                smaTrend: TechnicalIndicators.sma(closes, eaParams.smaTrendPeriod),
                
                // Momentum Indicators
                rsi: TechnicalIndicators.rsi(closes, eaParams.rsiPeriod),
                macd: TechnicalIndicators.macd(closes, 12, 26, 9),
                
                // Volatility Indicators
                atr: TechnicalIndicators.atr(highs, lows, closes, eaParams.atrPeriod),
                bollingerBands: TechnicalIndicators.bollingerBands(closes, eaParams.bbPeriod, eaParams.bbDev),
                
                // Volume
                volumeSMA: TechnicalIndicators.sma(volumes, 20),
                
                // Raw data for reference
                currentPrice: closes[closes.length - 1],
                previousPrice: closes[closes.length - 2],
                currentVolume: volumes[volumes.length - 1]
            };

            // Get latest values (most recent)
            indicators.latest = this.getLatestValues(indicators);
            
            this.setCachedData(cacheKey, indicators);
            this.log(`✅ Calculated indicators for ${symbol}`);
            
            return indicators;
            
        } catch (error) {
            this.error(`Failed to calculate indicators for ${symbol}:`, error);
            throw error;
        }
    }

    // Extract latest values for easier access
    getLatestValues(indicators) {
        const latest = {};
        
        // Get the most recent value from each indicator
        if (indicators.emaFast && indicators.emaFast.length > 0) {
            latest.emaFast = indicators.emaFast[indicators.emaFast.length - 1];
        }
        
        if (indicators.emaSlow && indicators.emaSlow.length > 0) {
            latest.emaSlow = indicators.emaSlow[indicators.emaSlow.length - 1];
        }
        
        if (indicators.smaTrend && indicators.smaTrend.length > 0) {
            latest.smaTrend = indicators.smaTrend[indicators.smaTrend.length - 1];
        }
        
        if (indicators.rsi && indicators.rsi.length > 0) {
            latest.rsi = indicators.rsi[indicators.rsi.length - 1];
        }
        
        if (indicators.atr && indicators.atr.length > 0) {
            latest.atr = indicators.atr[indicators.atr.length - 1];
        }
        
        if (indicators.bollingerBands) {
            const bb = indicators.bollingerBands;
            if (bb.upper.length > 0) {
                latest.bbUpper = bb.upper[bb.upper.length - 1];
                latest.bbMiddle = bb.middle[bb.middle.length - 1];
                latest.bbLower = bb.lower[bb.lower.length - 1];
            }
        }
        
        if (indicators.macd && indicators.macd.macd.length > 0) {
            latest.macdMain = indicators.macd.macd[indicators.macd.macd.length - 1];
            if (indicators.macd.signal && indicators.macd.signal.length > 0) {
                latest.macdSignal = indicators.macd.signal[indicators.macd.signal.length - 1];
            }
        }
        
        if (indicators.volumeSMA && indicators.volumeSMA.length > 0) {
            latest.volumeSMA = indicators.volumeSMA[indicators.volumeSMA.length - 1];
        }
        
        // Add price information
        latest.currentPrice = indicators.currentPrice;
        latest.previousPrice = indicators.previousPrice;
        latest.currentVolume = indicators.currentVolume;
        
        return latest;
    }

    // Calculate trend strength (EMA distance in points)
    static calculateTrendStrength(emaFast, emaSlow, symbol) {
        if (!emaFast || !emaSlow) return 0;
        
        const distance = Math.abs(emaFast - emaSlow);
        
        // Convert to points based on asset type
        if (symbol === 'XAUUSD') {
            return distance; // Already in dollars
        } else if (symbol === 'USDJPY') {
            return distance * 100; // Convert to pips
        }
        
        return distance;
    }

    // Volume analysis
    static analyzeVolume(currentVolume, volumeSMA, multiplier = 1.2) {
        if (!currentVolume || !volumeSMA) return false;
        return currentVolume > (volumeSMA * multiplier);
    }

    // Bollinger Band squeeze detection
    static detectBBSqueeze(bbUpper, bbLower, atr) {
        if (!bbUpper || !bbLower || !atr) return false;
        const bbWidth = bbUpper - bbLower;
        return bbWidth < (atr * 2);
    }

    // Cache management
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        // Check if cache is still valid (5 minutes)
        if (Date.now() - cached.timestamp > 300000) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    setCachedData(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Limit cache size
        if (this.cache.size > 50) {
            const oldest = Math.min(...Array.from(this.cache.values()).map(v => v.timestamp));
            for (const [k, v] of this.cache.entries()) {
                if (v.timestamp === oldest) {
                    this.cache.delete(k);
                    break;
                }
            }
        }
    }

    // Logging
    log(message, ...args) {
        try {
            if (typeof CONFIG !== 'undefined' && CONFIG.log) {
                CONFIG.log('debug', `📊 [Indicators] ${message}`, ...args);
            } else {
                console.log(`📊 [Indicators] ${message}`, ...args);
            }
        } catch (error) {
            console.log(`📊 [Indicators] ${message}`, ...args);
        }
    }

    error(message, ...args) {
        try {
            if (typeof CONFIG !== 'undefined' && CONFIG.log) {
                CONFIG.log('error', `❌ [Indicators] ${message}`, ...args);
            } else {
                console.error(`❌ [Indicators] ${message}`, ...args);
            }
        } catch (error) {
            console.error(`❌ [Indicators] ${message}`, ...args);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TechnicalIndicators;
} else if (typeof window !== 'undefined') {
    window.TechnicalIndicators = TechnicalIndicators;
}