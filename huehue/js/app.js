// HueHue Optimized Main Application - Single Mode, Real Error Handling
class OptimizedHueHueApp {
    constructor() {
        // Ensure CONFIG is available before proceeding
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
            // Ensure CONFIG is available
            if (typeof CONFIG === 'undefined') {
                throw new Error('CONFIG not loaded - check script loading order');
            }
            
            CONFIG.log('info', '🚀 Starting optimized HueHue initialization...');
            
            // Initialize UI first
            this.updateConnectionStatus('connecting');
            this.hideErrorMessage();
            
            // Wait for Firebase
            await this.waitForFirebase();
            
            // Initialize core components with error handling
            try {
                this.dataFeed = new OptimizedDataFeed();
            } catch (error) {
                throw new Error(`Failed to initialize data feed: ${error.message}`);
            }
            
            try {
                this.indicators = new TechnicalIndicators();
            } catch (error) {
                throw new Error(`Failed to initialize indicators: ${error.message}`);
            }
            
            try {
                this.eaLogic = new EALogic();
            } catch (error) {
                throw new Error(`Failed to initialize EA logic: ${error.message}`);
            }
            
            // Initialize data feed
            const dataFeedSuccess = await this.dataFeed.initialize();
            if (!dataFeedSuccess) {
                throw new Error('Failed to initialize data feed connection');
            }
            
            // Load historical signals from Firebase
            await this.loadHistoricalSignals();
            
            // Load initial data for both assets
            await this.loadInitialData();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            // Initialize UI components
            this.initializeUI();
            
            this.isRunning = true;
            CONFIG.log('info', '✅ Optimized HueHue application fully initialized');
            
            return true;
            
        } catch (error) {
            CONFIG.log('error', '❌ Failed to initialize HueHue:', error);
            this.handleApplicationError(error);
            return false;
        }
    }

    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 30;
        
        while (!window.firebaseStorage && attempts < maxAttempts) {
            await this.sleep(100);
            attempts++;
        }
        
        if (window.firebaseStorage) {
            this.firebaseStorage = window.firebaseStorage;
            CONFIG.log('info', '🔥 Firebase connected to main app');
        } else {
            CONFIG.log('warn', '⚠️ Firebase not available, continuing without cloud storage');
        }
    }

    async loadHistoricalSignals() {
        if (!this.firebaseStorage) {
            CONFIG.log('info', '📊 No Firebase storage, skipping historical signals');
            return;
        }
        
        try {
            CONFIG.log('info', '📥 Loading recent signals from Firebase...');
            
            const allSignals = await this.firebaseStorage.getSignals(50);
            
            if (allSignals && allSignals.length > 0) {
                const sortedSignals = allSignals
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 10);
                
                const signalsList = document.getElementById('signalsList');
                if (signalsList) {
                    signalsList.innerHTML = '';
                    
                    sortedSignals.forEach(signal => {
                        try {
                            this.addSignalToList(signal, false);
                        } catch (error) {
                            CONFIG.log('warn', 'Error adding signal to list:', error);
                        }
                    });
                }
                
                this.updateElementSafely('signalCount', `${sortedSignals.length} recent signals`);
                this.updateQuickStatsFromSignals(allSignals);
                
                CONFIG.log('info', `✅ Loaded ${sortedSignals.length} recent signals`);
            } else {
                CONFIG.log('info', '📊 No signals found in Firebase');
            }
            
        } catch (error) {
            CONFIG.log('warn', '⚠️ Could not load historical signals:', error);
        }
    }

    async loadInitialData() {
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                CONFIG.log('debug', `📥 Loading initial data for ${symbol}...`);
                
                // Get current price with timeout
                const priceData = await Promise.race([
                    this.dataFeed.getRealTimePrice(symbol),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Price fetch timeout')), 10000))
                ]);
                
                this.updatePriceDisplay(symbol, priceData);
                this.updateAssetBasicInfo(symbol, {
                    bias: 'LOADING',
                    strength: 0
                });
                
                CONFIG.log('debug', `✅ Basic data loaded for ${symbol}`);
                
            } catch (error) {
                CONFIG.log('error', `❌ Failed to load initial data for ${symbol}:`, error.message);
                this.handleAssetError(symbol, error);
            }
        }
        
        // Load indicators in background
        setTimeout(() => this.loadIndicatorsBackground(), 3000);
    }

    async loadIndicatorsBackground() {
        if (!this.isRunning) return;
        
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                // Get historical data with timeout
                const historicalData = await Promise.race([
                    this.dataFeed.getHistoricalData(symbol, '1h', 100),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Historical data timeout')), 15000))
                ]);
                
                // Calculate indicators
                const indicators = await this.indicators.calculateIndicators(symbol, historicalData);
                
                // Get current price
                const priceData = await this.dataFeed.getRealTimePrice(symbol);
                
                // Analyze signal
                const signal = this.eaLogic.analyzeSignal(symbol, indicators, priceData);
                
                if (signal) {
                    this.lastSignals[symbol] = signal;
                    this.updateAssetCard(symbol, signal, priceData);
                }
                
            } catch (error) {
                CONFIG.log('warn', `⚠️ Background indicator load failed for ${symbol}:`, error.message);
                this.handleAssetError(symbol, error);
            }
        }
    }

    startRealTimeUpdates() {
        try {
            // Price updates every 15 seconds
            this.updateIntervals.prices = setInterval(async () => {
                await this.updateAllPrices();
            }, CONFIG.UPDATE_INTERVALS.priceUpdate);
            
            // Indicator updates every 3 minutes
            this.updateIntervals.signals = setInterval(async () => {
                await this.updateSignalsWithErrorHandling();
            }, CONFIG.UPDATE_INTERVALS.indicatorUpdate);
            
            // Dashboard refresh every 5 seconds
            this.updateIntervals.dashboard = setInterval(() => {
                this.updateDashboard();
            }, CONFIG.UPDATE_INTERVALS.dashboardRefresh);
            
            // Health check every minute
            this.updateIntervals.healthCheck = setInterval(() => {
                this.performHealthCheck();
            }, CONFIG.UPDATE_INTERVALS.healthCheck);
            
            CONFIG.log('info', '🔄 Real-time update loops started');
        } catch (error) {
            CONFIG.log('error', 'Error starting real-time updates:', error);
        }
    }

    async updateAllPrices() {
        if (!this.isRunning || !this.dataFeed?.isHealthy()) {
            return;
        }
        
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                const priceData = await this.dataFeed.getRealTimePrice(symbol);
                this.updatePriceDisplay(symbol, priceData);
                this.clearAssetError(symbol);
                
                // Small delay between calls
                await this.sleep(200);
                
            } catch (error) {
                CONFIG.log('warn', `Failed to update price for ${symbol}:`, error.message);
                this.handleAssetError(symbol, error);
            }
        }
    }

    async updateSignalsWithErrorHandling() {
        if (!this.isRunning || !this.dataFeed?.isHealthy()) {
            return;
        }
        
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                const [historicalData, priceData] = await Promise.all([
                    this.dataFeed.getHistoricalData(symbol, '1h', 100),
                    this.dataFeed.getRealTimePrice(symbol)
                ]);
                
                const indicators = await this.indicators.calculateIndicators(symbol, historicalData);
                const signal = this.eaLogic.analyzeSignal(symbol, indicators, priceData);
                
                if (signal) {
                    // Check for new trading signal
                    const tradingSignal = this.eaLogic.generateTradingSignal(signal);
                    
                    if (tradingSignal) {
                        this.handleNewTradingSignal(tradingSignal);
                    }
                    
                    this.lastSignals[symbol] = signal;
                    this.updateAssetCard(symbol, signal, priceData);
                    this.clearAssetError(symbol);
                }
                
                // Small delay between symbols
                await this.sleep(500);
                
            } catch (error) {
                CONFIG.log('warn', `Failed to update signals for ${symbol}:`, error.message);
                this.handleAssetError(symbol, error);
            }
        }
    }

    performHealthCheck() {
        try {
            if (!this.dataFeed?.isHealthy()) {
                CONFIG.log('warn', 'Data feed health check failed');
                // Attempt to reconnect
                setTimeout(() => {
                    this.dataFeed?.retryConnection();
                }, 5000);
            }
            
            // Reset error count periodically
            if (Date.now() - this.lastErrorTime > 300000) { // 5 minutes
                this.errorCount = 0;
            }
            
        } catch (error) {
            CONFIG.log('error', 'Health check error:', error);
        }
    }

    updateAssetCard(symbol, signal, priceData) {
        try {
            const symbolLower = symbol.toLowerCase();
            
            // Update price if provided
            if (priceData) {
                this.updatePriceDisplay(symbol, priceData);
            }
            
            // Update bias
            if (signal?.bias) {
                const biasElement = document.getElementById(`${symbolLower}-bias`);
                if (biasElement) {
                    biasElement.textContent = signal.bias;
                    biasElement.className = `bias-label ${signal.bias.toLowerCase()}`;
                }
            }
            
            // Update signal strength
            if (signal?.strength !== undefined) {
                const strengthElement = document.getElementById(`${symbolLower}-strength`);
                const strengthBar = document.getElementById(`${symbolLower}-bar`);
                
                if (strengthElement && strengthBar) {
                    const maxStrength = signal.maxStrength || 6;
                    strengthElement.textContent = `${signal.strength}/${maxStrength}`;
                    
                    const percentage = (signal.strength / maxStrength) * 100;
                    strengthBar.style.width = `${percentage}%`;
                    
                    // Update bar color based on strength
                    if (signal.strength >= 5) {
                        strengthBar.style.background = 'linear-gradient(90deg, #00ff88, #00d4ff)';
                    } else if (signal.strength >= 4) {
                        strengthBar.style.background = 'linear-gradient(90deg, #ffa502, #ff6b35)';
                    } else {
                        strengthBar.style.background = 'linear-gradient(90deg, #ff4757, #ff3742)';
                    }
                }
            }
            
            // Update confluence grid
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
                
                // Simple price update animation
                priceElement.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    if (priceElement.style) {
                        priceElement.style.transform = 'scale(1)';
                    }
                }, 200);
            }
            
            // Update price change
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
            
            // Update bias
            if (info.bias) {
                const biasElement = document.getElementById(`${symbolLower}-bias`);
                if (biasElement) {
                    biasElement.textContent = info.bias;
                    biasElement.className = `bias-label ${info.bias.toLowerCase()}`;
                }
            }
            
            // Update strength
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
            
            // Add to UI
            this.addSignalToList(tradingSignal, true);
            
            // Show notification
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
                
                // Limit displayed signals to 10
                while (signalsList.children.length > 10) {
                    signalsList.removeChild(signalsList.lastChild);
                }
            }
            
            // Save to Firebase if requested
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
            
            // Add click handler
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
            // Set realistic zeros when no signals
            this.updateElementSafely('dailySignals', '0');
            this.updateElementSafely('weeklySignals', '0');
            this.updateElementSafely('avgStrength', '0.0');
            this.updateElementSafely('strongSignals', '0');
            return;
        }
        
        try {
            const today = new Date().toDateString();
            const thisWeek = this.getWeekStart();
            
            // Only count actual trading signals, not analysis signals
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
            
            // Update with real counts
            this.updateElementSafely('dailySignals', todaySignals.length);
            this.updateElementSafely('weeklySignals', weekSignals.length);
            this.updateElementSafely('strongSignals', strongSignals.length);
            
            // Calculate average strength of real signals only
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
            
            CONFIG.log('debug', `Performance stats: ${todaySignals.length} today, ${weekSignals.length} this week, ${strongSignals.length} strong`);
            
        } catch (error) {
            CONFIG.log('warn', 'Error updating performance stats:', error);
        }
    }

    updateMarketStatus() {
        try {
            // Update market session
            const session = CONFIG.getCurrentSession();
            const sessionText = session.active ? 
                `${session.emoji} ${session.name}` : 
                '🌙 Closed';
            
            this.updateElementSafely('marketSession', sessionText);
            
            // Update API calls used
            if (this.dataFeed) {
                const stats = this.dataFeed.getStats();
                this.updateElementSafely('apiCallsUsed', `${stats.apiCalls || 0}/${stats.maxCalls || 55}`);
            }
            
            // Update last data update time
            this.updateElementSafely('lastDataUpdate', new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            }));
            
        } catch (error) {
            CONFIG.log('warn', 'Error updating market status:', error);
        }
    }

    getWeekStart() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
        return new Date(now.setDate(diff));
    }

    updateDashboard() {
        try {
            this.updateTime();
            this.updateSession();
            // Remove updateMarketStatus() call since we removed the top bar
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
            // No data source buttons to initialize anymore
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
    // Check if CONFIG is loaded
    if (typeof CONFIG === 'undefined') {
        console.error('❌ CONFIG not loaded - check script loading order');
        return;
    }
    
    CONFIG.log('info', '🚀 Starting Optimized HueHue Application...');
    
    try {
        optimizedHueHueApp = new OptimizedHueHueApp();
        
        // Check if constructor succeeded
        if (!optimizedHueHueApp) {
            throw new Error('Failed to create application instance');
        }
        
        const initialized = await optimizedHueHueApp.initialize();
        
        if (initialized) {
            CONFIG.log('info', '✅ Optimized HueHue is now running!');
            
            // Request notification permission
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
            
        } else {
            CONFIG.log('error', '❌ Failed to start Optimized HueHue');
        }
    } catch (error) {
        CONFIG.log('error', '❌ Critical error starting Optimized HueHue:', error);
        
        // Show basic error message if UI is available
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