// HueHue EA Logic - Signal Generation Engine
class EALogic {
    constructor() {
        this.signalHistory = [];
        this.dailyTrades = 0;
        this.lastTradeDate = null;
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
            
            // Determine overall bias (need 4/6 conditions)
            let bias = 'NEUTRAL';
            let strength = 0;
            
            if (longSignals >= CONFIG.EA_PARAMS.minSignalStrength) {
                bias = 'BULLISH';
                strength = longSignals;
            } else if (shortSignals >= CONFIG.EA_PARAMS.minSignalStrength) {
                bias = 'BEARISH';
                strength = shortSignals;
            } else {
                strength = Math.max(longSignals, shortSignals);
            }

            const signal = {
                symbol: symbol,
                bias: bias,
                strength: strength,
                maxStrength: CONFIG.EA_PARAMS.maxSignalStrength,
                conditions: conditions,
                timestamp: Date.now(),
                price: currentPrice,
                atr: latest.atr,
                expectedMove: this.calculateExpectedMove(latest.atr),
                confidence: (strength / CONFIG.EA_PARAMS.maxSignalStrength) * 100
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
        const priceAboveTrend = currentPrice > latest.smaTrend;
        const priceBelowTrend = currentPrice < latest.smaTrend;
        const emaBullish = latest.emaFast > latest.emaSlow;
        const emaBearish = latest.emaFast < latest.emaSlow;

        return {
            name: 'Trend Analysis',
            longCondition: priceAboveTrend || emaBullish,
            shortCondition: priceBelowTrend || emaBearish,
            details: {
                priceVsTrend: currentPrice > latest.smaTrend ? 'Above' : 'Below',
                emaAlignment: emaBullish ? 'Bullish' : 'Bearish',
                trendSMA: latest.smaTrend,
                emaFast: latest.emaFast,
                emaSlow: latest.emaSlow
            }
        };
    }

    // 2. Trend Strength: EMA distance
    analyzeTrendStrength(latest, symbol) {
        const emaDistance = Math.abs(latest.emaFast - latest.emaSlow);
        const trendStrength = TechnicalIndicators.calculateTrendStrength(
            latest.emaFast, 
            latest.emaSlow, 
            symbol
        );
        
        const sufficientTrend = trendStrength > CONFIG.EA_PARAMS.minTrendStrength;

        return {
            name: 'Trend Strength',
            longCondition: sufficientTrend,
            shortCondition: sufficientTrend,
            details: {
                emaDistance: emaDistance,
                trendStrength: trendStrength,
                required: CONFIG.EA_PARAMS.minTrendStrength,
                sufficient: sufficientTrend
            }
        };
    }

    // 3. RSI Momentum
    analyzeRSI(latest) {
        const rsi = latest.rsi;
        const rsiOversold = rsi < CONFIG.EA_PARAMS.rsiOversold;
        const rsiOverbought = rsi > CONFIG.EA_PARAMS.rsiOverbought;
        const rsiNeutral = rsi >= CONFIG.EA_PARAMS.rsiOversold && rsi <= CONFIG.EA_PARAMS.rsiOverbought;
        
        // MACD conditions
        const macdBullish = latest.macdMain > (latest.macdSignal || 0);
        const macdBearish = latest.macdMain < (latest.macdSignal || 0);

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
        const nearBBBottom = currentPrice < latest.bbMiddle && currentPrice > latest.bbLower;
        const nearBBTop = currentPrice > latest.bbMiddle && currentPrice < latest.bbUpper;
        const aboveEMAFast = currentPrice > latest.emaFast;
        const belowEMAFast = currentPrice < latest.emaFast;

        return {
            name: 'Price Position',
            longCondition: nearBBBottom || aboveEMAFast,
            shortCondition: nearBBTop || belowEMAFast,
            details: {
                nearBBBottom: nearBBBottom,
                nearBBTop: nearBBTop,
                aboveEMAFast: aboveEMAFast,
                belowEMAFast: belowEMAFast,
                bbUpper: latest.bbUpper,
                bbMiddle: latest.bbMiddle,
                bbLower: latest.bbLower,
                currentPrice: currentPrice
            }
        };
    }

    // 5. Price Action: Candle pattern + momentum
    analyzePriceAction(currentPrice, previousPrice) {
        // Simple momentum check (in real implementation, you'd analyze OHLC)
        const bullishMomentum = currentPrice > previousPrice;
        const bearishMomentum = currentPrice < previousPrice;
        
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
        const volumeOk = TechnicalIndicators.analyzeVolume(
            latest.currentVolume, 
            latest.volumeSMA, 
            CONFIG.EA_PARAMS.volumeMultiplier
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
                multiplier: CONFIG.EA_PARAMS.volumeMultiplier
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
        const required = [
            'emaFast', 'emaSlow', 'smaTrend', 'rsi', 'atr',
            'bbUpper', 'bbMiddle', 'bbLower', 'currentPrice'
        ];
        
        return required.every(field => latest[field] !== undefined && latest[field] !== null);
    }

    // Check if current time is within trading hours
    isValidTradingTime() {
        const now = new Date();
        const hour = now.getUTCHours();
        const dayOfWeek = now.getUTCDay();
        
        // No weekend trading
        if (dayOfWeek === 0 || dayOfWeek === 6) return false;
        
        // Trading hours check
        if (hour < CONFIG.TRADING_HOURS.start || hour > CONFIG.TRADING_HOURS.end) return false;
        
        // Friday early close
        if (dayOfWeek === 5 && hour >= CONFIG.TRADING_HOURS.fridayClose) return false;
        
        // Avoid major news times
        const minute = now.getUTCMinutes();
        if (CONFIG.TRADING_HOURS.newsAvoidance.includes(hour) && minute <= 30) return false;
        
        return true;
    }

    // Calculate expected move based on ATR and risk/reward
    calculateExpectedMove(atr) {
        if (!atr) return 0;
        
        const stopDistance = atr * CONFIG.EA_PARAMS.stopLossATRMult;
        const expectedMove = stopDistance * CONFIG.EA_PARAMS.takeProfitRatio;
        
        return {
            stopLoss: stopDistance,
            takeProfit: expectedMove,
            riskReward: CONFIG.EA_PARAMS.takeProfitRatio
        };
    }

    // Generate trading signal if conditions are met
    generateTradingSignal(signal) {
        if (!signal || signal.bias === 'NEUTRAL') return null;
        
        if (signal.strength < CONFIG.EA_PARAMS.minSignalStrength) return null;
        
        // Check daily trade limit
        this.checkNewTradingDay();
        if (this.dailyTrades >= CONFIG.EA_PARAMS.maxTradesPerDay) {
            return null;
        }
        
        const tradingSignal = {
            ...signal,
            type: 'TRADING_SIGNAL',
            action: signal.bias === 'BULLISH' ? 'BUY' : 'SELL',
            entry: signal.price,
            stopLoss: signal.bias === 'BULLISH' ? 
                signal.price - signal.expectedMove.stopLoss : 
                signal.price + signal.expectedMove.stopLoss,
            takeProfit: signal.bias === 'BULLISH' ? 
                signal.price + signal.expectedMove.takeProfit : 
                signal.price - signal.expectedMove.takeProfit,
            risk: this.calculateRisk(signal),
            id: this.generateSignalId()
        };
        
        // Add to history
        this.signalHistory.unshift(tradingSignal);
        if (this.signalHistory.length > 100) {
            this.signalHistory = this.signalHistory.slice(0, 100);
        }
        
        this.dailyTrades++;
        this.log(`🚨 TRADING SIGNAL: ${tradingSignal.action} ${signal.symbol} at ${signal.price}`);
        
        return tradingSignal;
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
        const stopDistance = Math.abs(signal.price - signal.stopLoss);
        return {
            stopDistance: stopDistance,
            riskPercent: CONFIG.EA_PARAMS.riskPercent,
            atrMultiplier: CONFIG.EA_PARAMS.stopLossATRMult
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
        
        return {
            signalsToday: todaySignals.length,
            tradesRemaining: CONFIG.EA_PARAMS.maxTradesPerDay - this.dailyTrades,
            averageStrength: todaySignals.length > 0 ? 
                todaySignals.reduce((sum, s) => sum + s.strength, 0) / todaySignals.length : 0
        };
    }

    // Logging methods
    log(message, ...args) {
        if (CONFIG.DEBUG.enabled && CONFIG.DEBUG.logLevel !== 'error') {
            console.log(`🧠 [EA Logic] ${message}`, ...args);
        }
    }

    warn(message, ...args) {
        if (CONFIG.DEBUG.enabled) {
            console.warn(`⚠️ [EA Logic] ${message}`, ...args);
        }
    }

    error(message, ...args) {
        console.error(`❌ [EA Logic] ${message}`, ...args);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EALogic;
} else if (typeof window !== 'undefined') {
    window.EALogic = EALogic;
}