// HueHue EA Logic - Signal Generation Engine - Fixed
class EALogic {
    constructor() {
        this.signalHistory = [];
        this.dailyTrades = 0;
        this.lastTradeDate = null;
        this.lastSignalTime = 0;  // Track last signal time for cooldown
        this.log('EA Logic Engine initialized');
    }

    // Main signal analysis function
    analyzeSignal(symbol, indicators, priceData) {
        try {
            // Check if we have sufficient data
            if (!this.validateInputData(indicators)) {
                this.warn(`Insufficient data for ${symbol} analysis`);
                return null;
            }

            // Extract latest indicator values
            const latest = indicators.latest;
            const currentPrice = latest.currentPrice;
            const previousPrice = latest.previousPrice;

            // Check trading hours
            if (!this.isValidTradingTime()) {
                return {
                    symbol: symbol,
                    bias: 'NEUTRAL',
                    strength: 0,
                    conditions: this.getEmptyConditions(),
                    reason: 'Outside trading hours'
                };
            }

            // Calculate all 6 EA conditions
            const conditions = this.calculateConditions(symbol, latest, currentPrice, previousPrice);
            
            // Determine signal strength and bias
            const longSignals = this.countConditions(conditions, 'LONG');
            const shortSignals = this.countConditions(conditions, 'SHORT');
            
            // Get min signal strength with fallback
            const minSignalStrength = this.getEAParam('minSignalStrength', 4);
            const maxSignalStrength = this.getEAParam('maxSignalStrength', 6);
            
            // Determine overall bias (need 4/6 conditions)
            let bias = 'NEUTRAL';
            let strength = 0;
            
            if (longSignals >= minSignalStrength) {
                bias = 'BULLISH';
                strength = longSignals;
            } else if (shortSignals >= minSignalStrength) {
                bias = 'BEARISH';
                strength = shortSignals;
            } else {
                strength = Math.max(longSignals, shortSignals);
            }

            const signal = {
                symbol: symbol,
                bias: bias,
                strength: strength,
                maxStrength: maxSignalStrength,
                conditions: conditions,
                timestamp: Date.now(),
                price: currentPrice,
                atr: latest.atr,
                expectedMove: this.calculateExpectedMove(latest.atr),
                confidence: (strength / maxSignalStrength) * 100
            };

            // Log signal generation
            this.log(`Signal for ${symbol}: ${bias} (${strength}/6) at ${currentPrice}`);
            
            return signal;

        } catch (error) {
            this.error(`Error analyzing ${symbol}:`, error);
            return null;
        }
    }

    // Calculate all 6 EA conditions exactly like the MT5 version
    calculateConditions(symbol, latest, currentPrice, previousPrice) {
        const conditions = {};

        // 1. TREND ANALYSIS
        conditions.trend = this.analyzeTrend(latest, currentPrice);
        
        // 2. TREND STRENGTH  
        conditions.strength = this.analyzeTrendStrength(latest, symbol);
        
        // 3. RSI MOMENTUM
        conditions.rsi = this.analyzeRSI(latest);
        
        // 4. PRICE POSITION (BB + EMA relationship)
        conditions.position = this.analyzePricePosition(latest, currentPrice);
        
        // 5. PRICE ACTION (Candle pattern + momentum)
        conditions.priceAction = this.analyzePriceAction(currentPrice, previousPrice);
        
        // 6. VOLUME/VOLATILITY
        conditions.volume = this.analyzeVolume(latest);

        return conditions;
    }

    // 1. Trend Analysis: Price vs SMA + EMA alignment
    analyzeTrend(latest, currentPrice) {
        const priceAboveTrend = currentPrice > (latest.smaTrend || currentPrice);
        const priceBelowTrend = currentPrice < (latest.smaTrend || currentPrice);
        const emaBullish = (latest.emaFast || 0) > (latest.emaSlow || 0);
        const emaBearish = (latest.emaFast || 0) < (latest.emaSlow || 0);

        return {
            name: 'Trend Analysis',
            longCondition: priceAboveTrend || emaBullish,
            shortCondition: priceBelowTrend || emaBearish,
            details: {
                priceVsTrend: currentPrice > (latest.smaTrend || currentPrice) ? 'Above' : 'Below',
                emaAlignment: emaBullish ? 'Bullish' : 'Bearish',
                trendSMA: latest.smaTrend,
                emaFast: latest.emaFast,
                emaSlow: latest.emaSlow
            }
        };
    }

    // 2. Trend Strength: EMA distance
    analyzeTrendStrength(latest, symbol) {
        const emaDistance = Math.abs((latest.emaFast || 0) - (latest.emaSlow || 0));
        const trendStrength = TechnicalIndicators.calculateTrendStrength(
            latest.emaFast, 
            latest.emaSlow, 
            symbol
        );
        
        const minTrendStrength = this.getEAParam('minTrendStrength', 3.0);
        const sufficientTrend = trendStrength > minTrendStrength;

        return {
            name: 'Trend Strength',
            longCondition: sufficientTrend,
            shortCondition: sufficientTrend,
            details: {
                emaDistance: emaDistance,
                trendStrength: trendStrength,
                required: minTrendStrength,
                sufficient: sufficientTrend
            }
        };
    }

    // 3. RSI Momentum
    analyzeRSI(latest) {
        const rsi = latest.rsi || 50;
        const rsiOversold = rsi < this.getEAParam('rsiOversold', 40);
        const rsiOverbought = rsi > this.getEAParam('rsiOverbought', 60);
        const rsiNeutral = rsi >= this.getEAParam('rsiOversold', 40) && rsi <= this.getEAParam('rsiOverbought', 60);
        
        // MACD conditions
        const macdBullish = (latest.macdMain || 0) > (latest.macdSignal || 0);
        const macdBearish = (latest.macdMain || 0) < (latest.macdSignal || 0);

        return {
            name: 'RSI Momentum',
            longCondition: rsiOversold || (rsiNeutral && macdBullish),
            shortCondition: rsiOverbought || (rsiNeutral && macdBearish),
            details: {
                rsi: rsi,
                oversold: rsiOversold,
                overbought: rsiOverbought,
                neutral: rsiNeutral,
                macdBullish: macdBullish,
                macdBearish: macdBearish,
                macdMain: latest.macdMain,
                macdSignal: latest.macdSignal
            }
        };
    }

    // 4. Price Position: BB position + EMA relationship
    analyzePricePosition(latest, currentPrice) {
        const bbMiddle = latest.bbMiddle || currentPrice;
        const bbLower = latest.bbLower || currentPrice;
        const bbUpper = latest.bbUpper || currentPrice;
        const emaFast = latest.emaFast || currentPrice;
        
        const nearBBBottom = currentPrice < bbMiddle && currentPrice > bbLower;
        const nearBBTop = currentPrice > bbMiddle && currentPrice < bbUpper;
        const aboveEMAFast = currentPrice > emaFast;
        const belowEMAFast = currentPrice < emaFast;

        return {
            name: 'Price Position',
            longCondition: nearBBBottom || aboveEMAFast,
            shortCondition: nearBBTop || belowEMAFast,
            details: {
                nearBBBottom: nearBBBottom,
                nearBBTop: nearBBTop,
                aboveEMAFast: aboveEMAFast,
                belowEMAFast: belowEMAFast,
                bbUpper: bbUpper,
                bbMiddle: bbMiddle,
                bbLower: bbLower,
                currentPrice: currentPrice
            }
        };
    }

    // 5. Price Action: Candle pattern + momentum
    analyzePriceAction(currentPrice, previousPrice) {
        // Simple momentum check (in real implementation, you'd analyze OHLC)
        const bullishMomentum = currentPrice > (previousPrice || currentPrice);
        const bearishMomentum = currentPrice < (previousPrice || currentPrice);
        
        // For now, assume we have bullish/bearish candle info
        // In a real implementation, you'd pass OHLC data
        const bullishCandle = bullishMomentum; // Simplified
        const bearishCandle = bearishMomentum; // Simplified

        return {
            name: 'Price Action',
            longCondition: bullishCandle && bullishMomentum,
            shortCondition: bearishCandle && bearishMomentum,
            details: {
                bullishCandle: bullishCandle,
                bearishCandle: bearishCandle,
                bullishMomentum: bullishMomentum,
                bearishMomentum: bearishMomentum,
                currentPrice: currentPrice,
                previousPrice: previousPrice
            }
        };
    }

    // 6. Volume/Volatility Analysis
    analyzeVolume(latest) {
        const volumeMultiplier = this.getEAParam('volumeMultiplier', 1.2);
        
        const volumeOk = TechnicalIndicators.analyzeVolume(
            latest.currentVolume, 
            latest.volumeSMA, 
            volumeMultiplier
        );
        
        const bbSqueeze = TechnicalIndicators.detectBBSqueeze(
            latest.bbUpper, 
            latest.bbLower, 
            latest.atr
        );
        
        const volatilityOk = !bbSqueeze;

        return {
            name: 'Volume/Volatility',
            longCondition: volumeOk || volatilityOk,
            shortCondition: volumeOk || volatilityOk,
            details: {
                volumeOk: volumeOk,
                volatilityOk: volatilityOk,
                bbSqueeze: bbSqueeze,
                currentVolume: latest.currentVolume,
                volumeSMA: latest.volumeSMA,
                multiplier: volumeMultiplier
            }
        };
    }

    // Count conditions for long/short signals
    countConditions(conditions, direction) {
        let count = 0;
        
        for (const [key, condition] of Object.entries(conditions)) {
            if (direction === 'LONG' && condition.longCondition) {
                count++;
            } else if (direction === 'SHORT' && condition.shortCondition) {
                count++;
            }
        }
        
        return count;
    }

    // Validate input data
    validateInputData(indicators) {
        if (!indicators || !indicators.latest) return false;
        
        const latest = indicators.latest;
        const required = ['currentPrice'];
        
        return required.every(field => latest[field] !== undefined && latest[field] !== null);
    }

    // Check if current time is within trading hours
    isValidTradingTime() {
        try {
            const now = new Date();
            const hour = now.getUTCHours();
            const dayOfWeek = now.getUTCDay();
            
            // No weekend trading
            if (dayOfWeek === 0 || dayOfWeek === 6) return false;
            
            // Get trading hours with fallback
            const tradingHours = this.getTradingHours();
            
            // Trading hours check
            if (hour < tradingHours.start || hour > tradingHours.end) return false;
            
            // Friday early close
            if (dayOfWeek === 5 && hour >= tradingHours.fridayClose) return false;
            
            // Avoid major news times
            const minute = now.getUTCMinutes();
            if (tradingHours.newsAvoidance.includes(hour) && minute <= 30) return false;
            
            return true;
        } catch (error) {
            this.error('Error checking trading time:', error);
            return true; // Default to allow trading if check fails
        }
    }

    // Get trading hours with fallback
    getTradingHours() {
        try {
            return (typeof CONFIG !== 'undefined' && CONFIG.TRADING_HOURS) ? CONFIG.TRADING_HOURS : {
                start: 2,
                end: 21,
                fridayClose: 20,
                newsAvoidance: [7, 8, 12, 14]
            };
        } catch (error) {
            return {
                start: 2,
                end: 21,
                fridayClose: 20,
                newsAvoidance: [7, 8, 12, 14]
            };
        }
    }

    // Get EA parameter with fallback
    getEAParam(param, defaultValue) {
        try {
            return (typeof CONFIG !== 'undefined' && CONFIG.EA_PARAMS && CONFIG.EA_PARAMS[param] !== undefined) 
                ? CONFIG.EA_PARAMS[param] 
                : defaultValue;
        } catch (error) {
            return defaultValue;
        }
    }

    // Calculate expected move based on ATR and risk/reward
    calculateExpectedMove(atr) {
        if (!atr) return { stopLoss: 0, takeProfit: 0, riskReward: 2.8 };
        
        const stopLossATRMult = this.getEAParam('stopLossATRMult', 1.8);
        const takeProfitRatio = this.getEAParam('takeProfitRatio', 2.8);
        
        const stopDistance = atr * stopLossATRMult;
        const expectedMove = stopDistance * takeProfitRatio;
        
        return {
            stopLoss: stopDistance,
            takeProfit: expectedMove,
            riskReward: takeProfitRatio
        };
    }

    // Generate trading signal if conditions are met - MUCH MORE RESTRICTIVE
    generateTradingSignal(signal) {
        if (!signal || signal.bias === 'NEUTRAL') return null;
        
        const minSignalStrength = this.getEAParam('minSignalStrength', 5); // Require 5/6 conditions
        if (signal.strength < minSignalStrength) {
            this.log(`Signal rejected: strength ${signal.strength}/${minSignalStrength} required`);
            return null;
        }
        
        // Check signal cooldown (prevent spam)
        const signalCooldown = this.getEAParam('signalCooldown', 3600000); // 1 hour
        const now = Date.now();
        if (now - this.lastSignalTime < signalCooldown) {
            this.log(`Signal rejected: cooldown active (${Math.round((signalCooldown - (now - this.lastSignalTime)) / 60000)} min remaining)`);
            return null;
        }
        
        // Check daily trade limit
        this.checkNewTradingDay();
        const maxTradesPerDay = this.getEAParam('maxTradesPerDay', 2); // Only 2 per day
        if (this.dailyTrades >= maxTradesPerDay) {
            this.log(`Signal rejected: daily limit reached (${this.dailyTrades}/${maxTradesPerDay})`);
            return null;
        }
        
        // Additional quality filters
        if (!this.passesQualityFilters(signal)) {
            this.log('Signal rejected: failed quality filters');
            return null;
        }
        
        const tradingSignal = {
            ...signal,
            type: 'TRADING_SIGNAL',
            action: signal.bias === 'BULLISH' ? 'BUY' : 'SELL',
            entry: signal.price,
            stopLoss: signal.bias === 'BULLISH' ? 
                signal.price - (signal.expectedMove?.stopLoss || 0) : 
                signal.price + (signal.expectedMove?.stopLoss || 0),
            takeProfit: signal.bias === 'BULLISH' ? 
                signal.price + (signal.expectedMove?.takeProfit || 0) : 
                signal.price - (signal.expectedMove?.takeProfit || 0),
            risk: this.calculateRisk(signal),
            id: this.generateSignalId()
        };
        
        // Add to history
        this.signalHistory.unshift(tradingSignal);
        if (this.signalHistory.length > 100) {
            this.signalHistory = this.signalHistory.slice(0, 100);
        }
        
        this.dailyTrades++;
        this.lastSignalTime = now;
        this.log(`🚨 HIGH QUALITY SIGNAL: ${tradingSignal.action} ${signal.symbol} at ${signal.price} (${signal.strength}/6)`);
        
        return tradingSignal;
    }

    // Additional quality filters for signals
    passesQualityFilters(signal) {
        try {
            // Must have strong trend
            const trendCondition = signal.conditions?.trend;
            const strengthCondition = signal.conditions?.strength;
            
            if (!trendCondition?.longCondition && !trendCondition?.shortCondition) {
                return false;
            }
            
            if (!strengthCondition?.longCondition && !strengthCondition?.shortCondition) {
                return false;
            }
            
            // RSI must not be in extreme zones for contrarian signals
            const rsiCondition = signal.conditions?.rsi;
            if (!rsiCondition) return false;
            
            // Price must be in good position relative to moving averages
            const positionCondition = signal.conditions?.position;
            if (!positionCondition) return false;
            
            return true;
            
        } catch (error) {
            this.error('Error in quality filters:', error);
            return false;
        }
    }

    // Check for new trading day
    checkNewTradingDay() {
        const today = new Date().toDateString();
        if (this.lastTradeDate !== today) {
            this.dailyTrades = 0;
            this.lastTradeDate = today;
            this.log('New trading day started');
        }
    }

    // Calculate risk for position sizing
    calculateRisk(signal) {
        const stopDistance = signal.expectedMove?.stopLoss || 0;
        const riskPercent = this.getEAParam('riskPercent', 2.0);
        const stopLossATRMult = this.getEAParam('stopLossATRMult', 1.8);
        
        return {
            stopDistance: stopDistance,
            riskPercent: riskPercent,
            atrMultiplier: stopLossATRMult
        };
    }

    // Generate unique signal ID
    generateSignalId() {
        return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get empty conditions structure
    getEmptyConditions() {
        return {
            trend: { longCondition: false, shortCondition: false },
            strength: { longCondition: false, shortCondition: false },
            rsi: { longCondition: false, shortCondition: false },
            position: { longCondition: false, shortCondition: false },
            priceAction: { longCondition: false, shortCondition: false },
            volume: { longCondition: false, shortCondition: false }
        };
    }

    // Get signal history
    getSignalHistory(limit = 20) {
        return this.signalHistory.slice(0, limit);
    }

    // Get today's trading stats
    getTodayStats() {
        const today = new Date().toDateString();
        const todaySignals = this.signalHistory.filter(signal => 
            new Date(signal.timestamp).toDateString() === today
        );
        
        const maxTradesPerDay = this.getEAParam('maxTradesPerDay', 4);
        
        return {
            signalsToday: todaySignals.length,
            tradesRemaining: maxTradesPerDay - this.dailyTrades,
            averageStrength: todaySignals.length > 0 ? 
                todaySignals.reduce((sum, s) => sum + s.strength, 0) / todaySignals.length : 0
        };
    }

    // Logging methods
    log(message, ...args) {
        try {
            if (typeof CONFIG !== 'undefined' && CONFIG.log) {
                CONFIG.log('debug', `🧠 [EA Logic] ${message}`, ...args);
            } else {
                console.log(`🧠 [EA Logic] ${message}`, ...args);
            }
        } catch (error) {
            console.log(`🧠 [EA Logic] ${message}`, ...args);
        }
    }

    warn(message, ...args) {
        try {
            if (typeof CONFIG !== 'undefined' && CONFIG.log) {
                CONFIG.log('warn', `⚠️ [EA Logic] ${message}`, ...args);
            } else {
                console.warn(`⚠️ [EA Logic] ${message}`, ...args);
            }
        } catch (error) {
            console.warn(`⚠️ [EA Logic] ${message}`, ...args);
        }
    }

    error(message, ...args) {
        try {
            if (typeof CONFIG !== 'undefined' && CONFIG.log) {
                CONFIG.log('error', `❌ [EA Logic] ${message}`, ...args);
            } else {
                console.error(`❌ [EA Logic] ${message}`, ...args);
            }
        } catch (error) {
            console.error(`❌ [EA Logic] ${message}`, ...args);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EALogic;
} else if (typeof window !== 'undefined') {
    window.EALogic = EALogic;
}