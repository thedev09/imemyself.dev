// HueHue Optimized Main Application - Performance Enhanced Version
class OptimizedHueHueApp {
    constructor() {
        if (typeof CONFIG === 'undefined') {
            console.error('❌ CONFIG not available - check script loading order');
            return;
        }
        
        // Core components
        this.dataFeed = null;
        this.indicators = null;
        this.eaLogic = null;
        this.firebaseStorage = null;
        
        // Application state
        this.isRunning = false;
        this.updateIntervals = {};
        this.lastSignals = {};
        
        // Performance tracking
        this.loadStartTime = Date.now();
        this.performanceMetrics = {
            firebaseInit: 0,
            dataFeedInit: 0,
            initialDataLoad: 0,
            totalInit: 0
        };
        
        // Performance stats
        this.performanceStats = {
            signalsToday: 0,
            winRate: 73,
            totalPnL: 0,
            avgRiskReward: 2.8
        };
        
        // Error tracking
        this.errorCount = 0;
        this.lastErrorTime = 0;
        this.maxErrors = 10;
        
        CONFIG.log('info', '🎯 Optimized HueHue Application initialized');
    }

    async initialize() {
        try {
            CONFIG.log('info', '🚀 Starting optimized HueHue initialization...');
            const startTime = Date.now();
            
            // Initialize UI first (instant feedback)
            this.updateConnectionStatus('connecting');
            this.hideErrorMessage();
            this.showLoadingState();
            
            // Parallel initialization of independent components
            const [firebaseReady, componentsReady] = await Promise.all([
                this.initializeFirebase(),
                this.initializeComponents()
            ]);
            
            if (!firebaseReady || !componentsReady) {
                throw new Error('Failed to initialize core components');
            }
            
            // Initialize data feed with Firebase (now that we have API key)
            const dataFeedSuccess = await this.dataFeed.initialize();
            if (!dataFeedSuccess) {
                throw new Error('Failed to initialize data feed connection');
            }
            
            // Parallel data loading
            await Promise.all([
                this.loadInitialDataOptimized(),
                this.loadHistoricalSignalsAsync() // Non-blocking
            ]);
            
            // Start update loops
            this.startOptimizedUpdates();
            
            // Initialize UI components
            this.initializeUI();
            this.hideLoadingState();
            
            this.isRunning = true;
            
            const totalTime = Date.now() - startTime;
            CONFIG.log('info', `✅ HueHue initialized in ${totalTime}ms`);
            this.logPerformanceMetrics();
            
            return true;
            
        } catch (error) {
            CONFIG.log('error', '❌ Failed to initialize HueHue:', error);
            this.handleApplicationError(error);
            this.hideLoadingState();
            return false;
        }
    }

    async initializeFirebase() {
        const startTime = Date.now();
        let attempts = 0;
        const maxAttempts = 20; // Reduced from 30
        
        while (!window.firebaseStorage && attempts < maxAttempts) {
            await this.sleep(50); // Reduced from 100ms
            attempts++;
        }
        
        if (window.firebaseStorage) {
            this.firebaseStorage = window.firebaseStorage;
            this.performanceMetrics.firebaseInit = Date.now() - startTime;
            CONFIG.log('info', `🔥 Firebase connected in ${this.performanceMetrics.firebaseInit}ms`);
            return true;
        }
        
        CONFIG.log('warn', '⚠️ Firebase not available, continuing without cloud storage');
        return true; // Don't block app if Firebase fails
    }

    async initializeComponents() {
        try {
            // Initialize all components in parallel
            const results = await Promise.allSettled([
                new Promise(resolve => {
                    this.dataFeed = new OptimizedDataFeed();
                    resolve(true);
                }),
                new Promise(resolve => {
                    this.indicators = new TechnicalIndicators();
                    resolve(true);
                }),
                new Promise(resolve => {
                    this.eaLogic = new EALogic();
                    resolve(true);
                })
            ]);
            
            return results.every(r => r.status === 'fulfilled');
        } catch (error) {
            CONFIG.log('error', 'Failed to initialize components:', error);
            return false;
        }
    }

    async loadInitialDataOptimized() {
        const startTime = Date.now();
        const assets = Object.keys(CONFIG.ASSETS);
        
        // Load all assets in parallel with proper error handling
        const results = await Promise.allSettled(
            assets.map(symbol => this.loadAssetDataQuick(symbol))
        );
        
        // Process results
        results.forEach((result, index) => {
            const symbol = assets[index];
            if (result.status === 'rejected') {
                CONFIG.log('warn', `Failed to load ${symbol}:`, result.reason);
                this.handleAssetError(symbol, result.reason);
            }
        });
        
        this.performanceMetrics.initialDataLoad = Date.now() - startTime;
        CONFIG.log('info', `📊 Initial data loaded in ${this.performanceMetrics.initialDataLoad}ms`);
        
        // Load full indicators after initial display (non-blocking)
        setTimeout(() => this.loadIndicatorsOptimized(), 100);
    }

    async loadAssetDataQuick(symbol) {
        try {
            // Just get current price first (fastest)
            const priceData = await Promise.race([
                this.dataFeed.getRealTimePrice(symbol),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Price timeout')), 5000))
            ]);
            
            // Update UI immediately
            this.updatePriceDisplay(symbol, priceData);
            this.updateAssetBasicInfo(symbol, {
                bias: 'ANALYZING',
                strength: 0
            });
            
            return priceData;
            
        } catch (error) {
            throw error;
        }
    }

    async loadIndicatorsOptimized() {
        if (!this.isRunning) return;
        
        const assets = Object.keys(CONFIG.ASSETS);
        
        // Process assets in parallel
        await Promise.allSettled(
            assets.map(symbol => this.processAssetIndicators(symbol))
        );
    }

    async processAssetIndicators(symbol) {
        try {
            // Get data with shorter timeout
            const [historicalData, priceData] = await Promise.all([
                Promise.race([
                    this.dataFeed.getHistoricalData(symbol, '1h', 100),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Historical timeout')), 8000))
                ]),
                this.dataFeed.getRealTimePrice(symbol)
            ]);
            
            // Calculate indicators
            const indicators = await this.indicators.calculateIndicators(symbol, historicalData);
            
            // Analyze signal
            const signal = this.eaLogic.analyzeSignal(symbol, indicators, priceData);
            
            if (signal) {
                this.lastSignals[symbol] = signal;
                this.updateAssetCard(symbol, signal, priceData);
            }
            
        } catch (error) {
            CONFIG.log('warn', `Indicator processing failed for ${symbol}:`, error.message);
        }
    }

    async loadHistoricalSignalsAsync() {
        // Non-blocking Firebase load
        if (!this.firebaseStorage) return;
        
        try {
            const allSignals = await this.firebaseStorage.getSignals(20); // Reduced from 50
            
            if (allSignals && allSignals.length > 0) {
                // Update UI in chunks to prevent blocking
                this.updateSignalsUI(allSignals.slice(0, 10));
                this.updateQuickStatsFromSignals(allSignals);
            }
            
        } catch (error) {
            CONFIG.log('warn', 'Could not load historical signals:', error);
        }
    }

    updateSignalsUI(signals) {
        const signalsList = document.getElementById('signalsList');
        if (!signalsList) return;
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        signalsList.innerHTML = '';
        
        signals.forEach(signal => {
            try {
                const element = this.createSignalElement(signal);
                if (element) fragment.appendChild(element);
            } catch (error) {
                CONFIG.log('warn', 'Error creating signal element:', error);
            }
        });
        
        signalsList.appendChild(fragment);
        this.updateElementSafely('signalCount', `${signals.length} recent signals`);
    }

    startOptimizedUpdates() {
        try {
            // Stagger update intervals to prevent simultaneous calls
            
            // Price updates every 30 seconds
            this.updateIntervals.prices = setInterval(async () => {
                await this.updatePricesOptimized();
            }, CONFIG.UPDATE_INTERVALS.priceUpdate);
            
            // Indicator updates every 10 minutes (staggered by 30s)
            setTimeout(() => {
                this.updateIntervals.signals = setInterval(async () => {
                    await this.updateSignalsOptimized();
                }, CONFIG.UPDATE_INTERVALS.indicatorUpdate);
            }, 30000);
            
            // Dashboard refresh every 10 seconds
            this.updateIntervals.dashboard = setInterval(() => {
                this.updateDashboard();
            }, CONFIG.UPDATE_INTERVALS.dashboardRefresh);
            
            // Health check every minute (staggered by 45s)
            setTimeout(() => {
                this.updateIntervals.healthCheck = setInterval(() => {
                    this.performHealthCheck();
                }, CONFIG.UPDATE_INTERVALS.healthCheck);
            }, 45000);
            
            CONFIG.log('info', '🔄 Optimized update loops started');
        } catch (error) {
            CONFIG.log('error', 'Error starting updates:', error);
        }
    }

    async updatePricesOptimized() {
        if (!this.isRunning || !this.dataFeed?.isHealthy()) return;
        
        const assets = Object.keys(CONFIG.ASSETS);
        
        // Update all prices in parallel
        await Promise.allSettled(
            assets.map(symbol => 
                this.dataFeed.getRealTimePrice(symbol)
                    .then(priceData => {
                        this.updatePriceDisplay(symbol, priceData);
                        this.clearAssetError(symbol);
                    })
                    .catch(error => {
                        CONFIG.log('warn', `Price update failed for ${symbol}:`, error.message);
                        this.handleAssetError(symbol, error);
                    })
            )
        );
    }

    async updateSignalsOptimized() {
        if (!this.isRunning || !this.dataFeed?.isHealthy()) return;
        
        const assets = Object.keys(CONFIG.ASSETS);
        
        // Process all assets in parallel
        await Promise.allSettled(
            assets.map(async symbol => {
                try {
                    const [historicalData, priceData] = await Promise.all([
                        this.dataFeed.getHistoricalData(symbol, '1h', 100),
                        this.dataFeed.getRealTimePrice(symbol)
                    ]);
                    
                    const indicators = await this.indicators.calculateIndicators(symbol, historicalData);
                    const signal = this.eaLogic.analyzeSignal(symbol, indicators, priceData);
                    
                    if (signal) {
                        const tradingSignal = this.eaLogic.generateTradingSignal(signal);
                        if (tradingSignal) {
                            this.handleNewTradingSignal(tradingSignal);
                        }
                        
                        this.lastSignals[symbol] = signal;
                        this.updateAssetCard(symbol, signal, priceData);
                        this.clearAssetError(symbol);
                    }
                } catch (error) {
                    CONFIG.log('warn', `Signal update failed for ${symbol}:`, error.message);
                    this.handleAssetError(symbol, error);
                }
            })
        );
    }

    showLoadingState() {
        // Add loading indicators to asset cards
        const assets = Object.keys(CONFIG.ASSETS);
        assets.forEach(symbol => {
            const symbolLower = symbol.toLowerCase();
            const priceElement = document.getElementById(`${symbolLower}-price`);
            const biasElement = document.getElementById(`${symbolLower}-bias`);
            
            if (priceElement) priceElement.textContent = 'Loading...';
            if (biasElement) {
                biasElement.textContent = 'LOADING';
                biasElement.className = 'bias-label neutral';
            }
        });
    }

    hideLoadingState() {
        // Loading state is replaced by actual data
    }

    logPerformanceMetrics() {
        this.performanceMetrics.totalInit = Date.now() - this.loadStartTime;
        CONFIG.log('info', '📊 Performance Metrics:', {
            firebaseInit: `${this.performanceMetrics.firebaseInit}ms`,
            dataFeedInit: `${this.performanceMetrics.dataFeedInit}ms`,
            initialDataLoad: `${this.performanceMetrics.initialDataLoad}ms`,
            totalInit: `${this.performanceMetrics.totalInit}ms`
        });
    }

    // Keep all other methods unchanged...
    // (Include all the remaining methods from the original app.js without modification)

    performHealthCheck() {
        try {
            if (!this.dataFeed?.isHealthy()) {
                CONFIG.log('warn', 'Data feed health check failed');
                setTimeout(() => {
                    this.dataFeed?.retryConnection();
                }, 5000);
            }
            
            if (Date.now() - this.lastErrorTime > 300000) {
                this.errorCount = 0;
            }
            
        } catch (error) {
            CONFIG.log('error', 'Health check error:', error);
        }
    }

    updateAssetCard(symbol, signal, priceData) {
        try {
            const symbolLower = symbol.toLowerCase();
            
            if (priceData) {
                this.updatePriceDisplay(symbol, priceData);
            }
            
            if (signal?.bias) {
                const biasElement = document.getElementById(`${symbolLower}-bias`);
                if (biasElement) {
                    biasElement.textContent = signal.bias;
                    biasElement.className = `bias-label ${signal.bias.toLowerCase()}`;
                }
            }
            
            if (signal?.strength !== undefined) {
                const strengthElement = document.getElementById(`${symbolLower}-strength`);
                const strengthBar = document.getElementById(`${symbolLower}-bar`);
                
                if (strengthElement && strengthBar) {
                    const maxStrength = signal.maxStrength || 6;
                    strengthElement.textContent = `${signal.strength}/${maxStrength}`;
                    
                    const percentage = (signal.strength / maxStrength) * 100;
                    strengthBar.style.width = `${percentage}%`;
                    
                    if (signal.strength >= 5) {
                        strengthBar.style.background = 'linear-gradient(90deg, #00ff88, #00d4ff)';
                    } else if (signal.strength >= 4) {
                        strengthBar.style.background = 'linear-gradient(90deg, #ffa502, #ff6b35)';
                    } else {
                        strengthBar.style.background = 'linear-gradient(90deg, #ff4757, #ff3742)';
                    }
                }
            }
            
            if (signal?.conditions) {
                this.updateConfluenceGrid(symbol, signal);
            }
            
        } catch (error) {
            CONFIG.log('warn', `Error updating asset card for ${symbol}:`, error);
        }
    }

    updateConfluenceGrid(symbol, signal) {
        try {
            const symbolLower = symbol.toLowerCase();
            const confluenceItems = document.querySelectorAll(`#${symbolLower}-confluence .confluence-item`);
            
            if (!confluenceItems?.length || !signal?.conditions) return;
            
            const conditionNames = ['trend', 'strength', 'rsi', 'position', 'priceAction', 'volume'];
            const conditionLabels = ['Trend', 'Strength', 'RSI', 'Position', 'Price Action', 'Volume'];
            
            conditionNames.forEach((conditionName, index) => {
                try {
                    const condition = signal.conditions[conditionName];
                    const item = confluenceItems[index];
                    
                    if (!condition || !item) return;
                    
                    const bias = signal.bias;
                    let isActive = false;
                    
                    if (bias === 'BULLISH' && condition.longCondition) {
                        isActive = true;
                    } else if (bias === 'BEARISH' && condition.shortCondition) {
                        isActive = true;
                    }
                    
                    item.className = `confluence-item ${isActive ? 'confluence-active' : 'confluence-inactive'}`;
                    item.textContent = `${conditionLabels[index]} ${isActive ? '✓' : '✗'}`;
                    
                } catch (error) {
                    CONFIG.log('warn', `Error updating confluence item ${index}:`, error);
                }
            });
            
        } catch (error) {
            CONFIG.log('warn', `Error updating confluence grid for ${symbol}:`, error);
        }
    }

    updatePriceDisplay(symbol, priceData) {
        try {
            if (!symbol || !priceData || priceData.price === undefined) return;
            
            const symbolLower = symbol.toLowerCase();
            const priceElement = document.getElementById(`${symbolLower}-price`);
            const changeElement = document.getElementById(`${symbolLower}-change`);
            
            if (priceElement) {
                const formattedPrice = CONFIG.formatPrice(symbol, priceData.price);
                priceElement.textContent = formattedPrice;
                priceElement.classList.remove('error');
                
                priceElement.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    if (priceElement.style) {
                        priceElement.style.transform = 'scale(1)';
                    }
                }, 200);
            }
            
            if (changeElement && priceData.change !== undefined) {
                const changeText = `${priceData.change > 0 ? '+' : ''}${priceData.change.toFixed(2)}`;
                const changePercent = priceData.changePercent ? 
                    ` (${priceData.changePercent > 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%)` : '';
                
                changeElement.textContent = changeText + changePercent;
                changeElement.className = `price-change ${priceData.change >= 0 ? 'price-up' : 'price-down'}`;
            }
            
        } catch (error) {
            CONFIG.log('warn', `Error updating price display for ${symbol}:`, error);
        }
    }

    updateAssetBasicInfo(symbol, info) {
        try {
            const symbolLower = symbol.toLowerCase();
            
            if (info.bias) {
                const biasElement = document.getElementById(`${symbolLower}-bias`);
                if (biasElement) {
                    biasElement.textContent = info.bias;
                    biasElement.className = `bias-label ${info.bias.toLowerCase()}`;
                }
            }
            
            if (info.strength !== undefined) {
                const strengthElement = document.getElementById(`${symbolLower}-strength`);
                const strengthBar = document.getElementById(`${symbolLower}-bar`);
                
                if (strengthElement) {
                    strengthElement.textContent = `${info.strength}/6`;
                }
                
                if (strengthBar) {
                    const percentage = (info.strength / 6) * 100;
                    strengthBar.style.width = `${percentage}%`;
                }
            }
            
        } catch (error) {
            CONFIG.log('warn', `Error updating basic asset info for ${symbol}:`, error);
        }
    }

    handleAssetError(symbol, error) {
        try {
            const symbolLower = symbol.toLowerCase();
            const assetCard = document.querySelector(`[data-symbol="${symbolLower}"]`);
            const priceElement = document.getElementById(`${symbolLower}-price`);
            const biasElement = document.getElementById(`${symbolLower}-bias`);
            
            if (assetCard) {
                assetCard.classList.add('offline');
            }
            
            if (priceElement) {
                priceElement.textContent = 'Error';
                priceElement.classList.add('error');
            }
            
            if (biasElement) {
                biasElement.textContent = 'ERROR';
                biasElement.className = 'bias-label error';
            }
            
            CONFIG.log('error', `Asset ${symbol} error:`, error.message);
            
        } catch (e) {
            CONFIG.log('error', 'Error handling asset error:', e);
        }
    }

    clearAssetError(symbol) {
        try {
            const symbolLower = symbol.toLowerCase();
            const assetCard = document.querySelector(`[data-symbol="${symbolLower}"]`);
            const priceElement = document.getElementById(`${symbolLower}-price`);
            
            if (assetCard) {
                assetCard.classList.remove('offline');
            }
            
            if (priceElement) {
                priceElement.classList.remove('error');
            }
            
        } catch (error) {
            CONFIG.log('warn', 'Error clearing asset error:', error);
        }
    }

    async handleNewTradingSignal(tradingSignal) {
        try {
            CONFIG.log('info', `🚨 NEW TRADING SIGNAL: ${tradingSignal.action} ${tradingSignal.symbol}`);
            
            this.addSignalToList(tradingSignal, true);
            this.showBrowserNotification(tradingSignal);
            
        } catch (error) {
            CONFIG.log('error', 'Error handling new trading signal:', error);
        }
    }

    addSignalToList(signal, saveToFirebase = true) {
        try {
            const signalsList = document.getElementById('signalsList');
            if (!signalsList || !signal?.symbol || !signal?.action) return;
            
            const signalElement = this.createSignalElement(signal);
            if (signalElement) {
                if (saveToFirebase) {
                    signalsList.insertBefore(signalElement, signalsList.firstChild);
                } else {
                    signalsList.appendChild(signalElement);
                }
                
                while (signalsList.children.length > 10) {
                    signalsList.removeChild(signalsList.lastChild);
                }
            }
            
            if (saveToFirebase && this.firebaseStorage) {
                this.firebaseStorage.saveSignal(signal).catch(error => {
                    CONFIG.log('warn', 'Could not save signal to Firebase:', error);
                });
            }
            
        } catch (error) {
            CONFIG.log('warn', 'Error adding signal to list:', error);
        }
    }

    createSignalElement(signal) {
        try {
            if (!signal?.symbol || !signal?.action) return null;
            
            const signalDiv = document.createElement('div');
            signalDiv.className = `signal-item signal-${signal.action.toLowerCase()}`;
            
            const timestamp = signal.timestamp || Date.now();
            const timeStr = new Date(timestamp).toLocaleTimeString();
            const dateStr = new Date(timestamp).toLocaleDateString();
            
            const price = signal.entry || signal.price || 0;
            const formattedPrice = CONFIG.formatPrice(signal.symbol, price);
            
            const strength = signal.strength || 0;
            const maxStrength = signal.maxStrength || 6;
            
            const firebaseIndicator = signal.id ? ' 🔥' : '';
            
            signalDiv.innerHTML = `
                <div class="signal-meta">
                    <span class="signal-asset">${signal.symbol} ${signal.action}${firebaseIndicator}</span>
                    <span class="signal-time">${dateStr} ${timeStr}</span>
                </div>
                <div class="signal-details">
                    Entry: ${formattedPrice} | Strength: ${strength}/${maxStrength}
                    ${signal.id ? ' | ✅ Saved to Firebase' : ' | ⚠️ Local only'}
                </div>
            `;
            
            signalDiv.addEventListener('click', () => {
                this.showSignalDetails(signal);
            });
            
            return signalDiv;
            
        } catch (error) {
            CONFIG.log('warn', 'Error creating signal element:', error);
            return null;
        }
    }

    updateQuickStatsFromSignals(signals) {
        if (!signals?.length) {
            this.updateElementSafely('dailySignals', '0');
            this.updateElementSafely('weeklySignals', '0');
            this.updateElementSafely('avgStrength', '0.0');
            this.updateElementSafely('strongSignals', '0');
            return;
        }
        
        try {
            const today = new Date().toDateString();
            const thisWeek = this.getWeekStart();
            
            const realSignals = signals.filter(s => s.type === 'TRADING_SIGNAL' || s.action);
            
            const todaySignals = realSignals.filter(s => 
                s.timestamp && new Date(s.timestamp).toDateString() === today
            );
            
            const weekSignals = realSignals.filter(s => 
                s.timestamp && new Date(s.timestamp) >= thisWeek
            );
            
            const strongSignals = realSignals.filter(s => 
                s.strength >= 5
            );
            
            this.updateElementSafely('dailySignals', todaySignals.length);
            this.updateElementSafely('weeklySignals', weekSignals.length);
            this.updateElementSafely('strongSignals', strongSignals.length);
            
            if (realSignals.length > 0) {
                const validSignals = realSignals.filter(s => s.strength && !isNaN(s.strength));
                if (validSignals.length > 0) {
                    const avgStrength = validSignals.reduce((sum, s) => sum + s.strength, 0) / validSignals.length;
                    this.updateElementSafely('avgStrength', avgStrength.toFixed(1));
                } else {
                    this.updateElementSafely('avgStrength', '0.0');
                }
            } else {
                this.updateElementSafely('avgStrength', '0.0');
            }
            
        } catch (error) {
            CONFIG.log('warn', 'Error updating performance stats:', error);
        }
    }

    getWeekStart() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        return new Date(now.setDate(diff));
    }

    updateDashboard() {
        try {
            this.updateTime();
            this.updateSession();
        } catch (error) {
            CONFIG.log('warn', 'Error updating dashboard:', error);
        }
    }

    updateTime() {
        this.updateElementSafely('updateTime', new Date().toLocaleTimeString());
    }

    updateSession() {
        try {
            const sessionIndicator = document.getElementById('sessionIndicator');
            if (!sessionIndicator) return;
            
            const session = CONFIG.getCurrentSession();
            const sessionText = session.active ? 
                `${session.emoji} ${session.name} Session` : 
                '🌙 Market Quiet';
            
            sessionIndicator.textContent = sessionText;
            sessionIndicator.className = session.active ? 
                'session-indicator session-active' : 
                'session-indicator';
                
        } catch (error) {
            CONFIG.log('warn', 'Error updating session:', error);
        }
    }

    updateConnectionStatus(status) {
        if (this.dataFeed?.updateConnectionStatus) {
            this.dataFeed.updateConnectionStatus(status);
        }
    }

    hideErrorMessage() {
        if (this.dataFeed?.hideErrorMessage) {
            this.dataFeed.hideErrorMessage();
        }
    }

    initializeUI() {
        try {
            CONFIG.log('info', '🎨 UI initialized');
        } catch (error) {
            CONFIG.log('warn', 'Error initializing UI:', error);
        }
    }

    handleApplicationError(error) {
        this.errorCount++;
        this.lastErrorTime = Date.now();
        
        CONFIG.log('error', `Application error ${this.errorCount}:`, error.message);
        
        if (this.errorCount >= this.maxErrors) {
            CONFIG.log('error', '🚨 Too many application errors, stopping updates');
            this.stop();
        }
    }

    showSignalDetails(signal) {
        CONFIG.log('info', '📊 Signal details:', signal);
    }

    showBrowserNotification(signal) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`HueHue Signal: ${signal.action} ${signal.symbol}`, {
                    body: `Strength: ${signal.strength}/6`,
                    icon: '/favicon.ico'
                });
            }
        } catch (error) {
            CONFIG.log('warn', 'Error showing notification:', error);
        }
    }

    updateElementSafely(elementId, value) {
        try {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value;
                return true;
            }
            return false;
        } catch (error) {
            CONFIG.log('warn', `Failed to update element ${elementId}:`, error);
            return false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stop() {
        try {
            this.isRunning = false;
            
            Object.values(this.updateIntervals).forEach(interval => {
                clearInterval(interval);
            });
            
            if (this.dataFeed) {
                this.dataFeed.disconnect();
            }
            
            CONFIG.log('info', '🛑 Optimized HueHue application stopped');
        } catch (error) {
            CONFIG.log('error', 'Error stopping application:', error);
        }
    }
}

// Global application instance
let optimizedHueHueApp;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof CONFIG === 'undefined') {
        console.error('❌ CONFIG not loaded - check script loading order');
        return;
    }
    
    CONFIG.log('info', '🚀 Starting Optimized HueHue Application...');
    
    try {
        optimizedHueHueApp = new OptimizedHueHueApp();
        
        if (!optimizedHueHueApp) {
            throw new Error('Failed to create application instance');
        }
        
        const initialized = await optimizedHueHueApp.initialize();
        
        if (initialized) {
            CONFIG.log('info', '✅ Optimized HueHue is now running!');
            
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
            
        } else {
            CONFIG.log('error', '❌ Failed to start Optimized HueHue');
        }
    } catch (error) {
        CONFIG.log('error', '❌ Critical error starting Optimized HueHue:', error);
        
        const errorElement = document.getElementById('apiErrorMessage');
        if (errorElement) {
            const errorDescription = document.getElementById('errorDescription');
            if (errorDescription) {
                errorDescription.textContent = `Application failed to start: ${error.message}`;
            }
            errorElement.classList.add('show');
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    try {
        if (optimizedHueHueApp) {
            optimizedHueHueApp.stop();
        }
    } catch (error) {
        CONFIG.log('error', 'Error during page unload:', error);
    }
});

// Global error handlers
window.addEventListener('error', (event) => {
    CONFIG.log('error', 'Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    CONFIG.log('error', 'Unhandled promise rejection:', event.reason);
});

// Expose app to global scope for debugging
if (CONFIG.ERROR_HANDLING.logLevel === 'debug') {
    window.optimizedHueHueApp = optimizedHueHueApp;
}