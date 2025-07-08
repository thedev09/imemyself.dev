// HueHue Optimized Main Application with Centralized Signals
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
        this.isMasterSession = false;
        this.masterCheckInterval = null;
        
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
            if (typeof CONFIG === 'undefined') {
                throw new Error('CONFIG not loaded - check script loading order');
            }
            
            CONFIG.log('info', '🚀 Starting optimized HueHue initialization...');
            
            // Initialize UI first
            this.updateConnectionStatus('connecting');
            this.hideErrorMessage();
            
            // Wait for Firebase
            await this.waitForFirebase();
            
            // Initialize core components
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
            
            // Setup real-time listeners
            this.setupRealtimeListeners();
            
            // Check if we should be master
            await this.checkMasterStatus();
            
            // Load initial data
            await this.loadInitialData();
            
            // Load historical signals
            await this.loadHistoricalSignals();
            
            // Start appropriate update loops
            this.startUpdateLoops();
            
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

    setupRealtimeListeners() {
        if (!this.firebaseStorage) return;
        
        // Listen for real-time signal updates
        this.firebaseStorage.onSignalsUpdate((signals) => {
            this.handleRealtimeSignals(signals);
        });
        
        // Listen for analysis updates for each symbol
        const symbols = Object.keys(CONFIG.ASSETS);
        symbols.forEach(symbol => {
            this.firebaseStorage.onAnalysisUpdate(symbol, (analysis) => {
                this.handleAnalysisUpdate(symbol, analysis);
            });
        });
        
        CONFIG.log('info', '📡 Real-time listeners setup complete');
    }

    async checkMasterStatus() {
        if (!this.firebaseStorage) return;
        
        try {
            this.isMasterSession = await this.firebaseStorage.checkAndBecomeMaster();
            
            if (this.isMasterSession) {
                CONFIG.log('info', '👑 This session is the MASTER - will calculate and broadcast analysis');
                
                // Update heartbeat every minute
                this.masterCheckInterval = setInterval(async () => {
                    const stillMaster = await this.firebaseStorage.updateMasterHeartbeat();
                    if (!stillMaster) {
                        this.isMasterSession = false;
                        CONFIG.log('warn', '👥 Lost master status');
                    }
                }, 60000);
            } else {
                CONFIG.log('info', '👥 This session is a FOLLOWER - will receive analysis updates');
                
                // Check periodically if we should become master
                this.masterCheckInterval = setInterval(async () => {
                    if (!this.isMasterSession) {
                        this.isMasterSession = await this.firebaseStorage.checkAndBecomeMaster();
                        if (this.isMasterSession) {
                            CONFIG.log('info', '👑 Promoted to MASTER session');
                            this.startMasterUpdates();
                        }
                    }
                }, 180000); // Check every 3 minutes
            }
        } catch (error) {
            CONFIG.log('error', 'Error checking master status:', error);
        }
    }

    startUpdateLoops() {
        // All sessions get price updates
        this.updateIntervals.prices = setInterval(async () => {
            await this.updateAllPrices();
        }, CONFIG.UPDATE_INTERVALS.priceUpdate);
        
        // Dashboard updates for all
        this.updateIntervals.dashboard = setInterval(() => {
            this.updateDashboard();
        }, CONFIG.UPDATE_INTERVALS.dashboardRefresh);
        
        // Only master calculates indicators and signals
        if (this.isMasterSession) {
            this.startMasterUpdates();
        }
        
        CONFIG.log('info', '🔄 Update loops started');
    }

    startMasterUpdates() {
        // Master calculates and broadcasts signals
        this.updateIntervals.signals = setInterval(async () => {
            await this.calculateAndBroadcastSignals();
        }, CONFIG.UPDATE_INTERVALS.indicatorUpdate);
        
        // Immediate calculation
        setTimeout(() => this.calculateAndBroadcastSignals(), 5000);
    }

    async calculateAndBroadcastSignals() {
        if (!this.isRunning || !this.dataFeed?.isHealthy() || !this.isMasterSession) return;
        
        CONFIG.log('info', '🧮 Master calculating signals...');
        
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                const [historicalData, priceData] = await Promise.all([
                    this.dataFeed.getHistoricalData(symbol, '1h', 100),
                    this.dataFeed.getRealTimePrice(symbol)
                ]);
                
                const indicators = await this.indicators.calculateIndicators(symbol, historicalData);
                const signal = this.eaLogic.analyzeSignal(symbol, indicators, priceData);
                
                if (signal && this.firebaseStorage) {
                    // Save analysis to Firebase for all sessions
                    await this.firebaseStorage.saveAnalysis(symbol, {
                        ...signal,
                        price: priceData.price,
                        change: priceData.change,
                        changePercent: priceData.changePercent
                    });
                    
                    // Check for trading signal
                    const tradingSignal = this.eaLogic.generateTradingSignal(signal);
                    if (tradingSignal) {
                        await this.firebaseStorage.saveSignal(tradingSignal);
                    }
                }
                
                // Small delay between symbols
                await this.sleep(500);
                
            } catch (error) {
                CONFIG.log('warn', `Failed to calculate signals for ${symbol}:`, error.message);
            }
        }
    }

    handleRealtimeSignals(signals) {
        CONFIG.log('info', `📡 Received ${signals.length} real-time signals`);
        
        const signalsList = document.getElementById('signalsList');
        if (!signalsList) return;
        
        // Clear and rebuild list
        signalsList.innerHTML = '';
        
        // Show most recent 10
        const recentSignals = signals.slice(0, 10);
        
        recentSignals.forEach(signal => {
            try {
                const element = this.createSignalElement(signal);
                if (element) signalsList.appendChild(element);
            } catch (error) {
                CONFIG.log('warn', 'Error creating signal element:', error);
            }
        });
        
        this.updateElementSafely('signalCount', `${recentSignals.length} recent signals`);
        this.updateQuickStatsFromSignals(signals);
    }

    handleAnalysisUpdate(symbol, analysis) {
        CONFIG.log('info', `📊 Analysis update for ${symbol}: ${analysis.bias} (${analysis.strength}/6)`);
        
        // Update UI with centralized analysis
        this.updateAssetCard(symbol, analysis, { 
            price: analysis.price,
            change: analysis.change,
            changePercent: analysis.changePercent
        });
        
        // Store as last signal
        this.lastSignals[symbol] = analysis;
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
                this.handleRealtimeSignals(allSignals);
                CONFIG.log('info', `✅ Loaded ${allSignals.length} recent signals`);
            } else {
                CONFIG.log('info', '📊 No signals found in Firebase');
            }
            
        } catch (error) {
            CONFIG.log('warn', '⚠️ Could not load historical signals:', error);
        }
    }

    async loadInitialData() {
        const assets = Object.keys(CONFIG.ASSETS);
        
        // First, try to load cached analysis from Firebase
        if (this.firebaseStorage) {
            for (const symbol of assets) {
                try {
                    const cachedAnalysis = await this.firebaseStorage.getAnalysis(symbol);
                    if (cachedAnalysis && Date.now() - cachedAnalysis.timestamp < 300000) { // 5 minutes
                        this.handleAnalysisUpdate(symbol, cachedAnalysis);
                    }
                } catch (error) {
                    CONFIG.log('warn', `Could not load cached analysis for ${symbol}`);
                }
            }
        }
        
        // Then load current prices
        for (const symbol of assets) {
            try {
                CONFIG.log('debug', `📥 Loading initial data for ${symbol}...`);
                
                const priceData = await Promise.race([
                    this.dataFeed.getRealTimePrice(symbol),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Price fetch timeout')), 10000))
                ]);
                
                this.updatePriceDisplay(symbol, priceData);
                
                // If no cached analysis, show loading state
                if (!this.lastSignals[symbol]) {
                    this.updateAssetBasicInfo(symbol, {
                        bias: 'LOADING',
                        strength: 0
                    });
                }
                
                CONFIG.log('debug', `✅ Basic data loaded for ${symbol}`);
                
            } catch (error) {
                CONFIG.log('error', `❌ Failed to load initial data for ${symbol}:`, error.message);
                this.handleAssetError(symbol, error);
            }
        }
        
        // If we're master, calculate indicators after initial load
        if (this.isMasterSession) {
            setTimeout(() => this.calculateAndBroadcastSignals(), 3000);
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
                
                await this.sleep(200);
                
            } catch (error) {
                CONFIG.log('warn', `Failed to update price for ${symbol}:`, error.message);
                this.handleAssetError(symbol, error);
            }
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
                    ${signal.id ? ' | ✅ Synced' : ' | ⚠️ Local only'}
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
            
            CONFIG.log('debug', `Performance stats: ${todaySignals.length} today, ${weekSignals.length} this week, ${strongSignals.length} strong`);
            
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
            this.updateMasterStatus();
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
            const masterIndicator = this.isMasterSession ? ' 👑' : '';
            const sessionText = session.active ? 
                `${session.emoji} ${session.name} Session${masterIndicator}` : 
                `🌙 Market Quiet${masterIndicator}`;
            
            sessionIndicator.textContent = sessionText;
            sessionIndicator.className = session.active ? 
                'session-indicator session-active' : 
                'session-indicator';
                
        } catch (error) {
            CONFIG.log('warn', 'Error updating session:', error);
        }
    }

    updateMasterStatus() {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement && statusElement.textContent === 'LIVE DATA') {
            statusElement.textContent = this.isMasterSession ? 'LIVE DATA 👑' : 'LIVE DATA';
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
            
            if (this.masterCheckInterval) {
                clearInterval(this.masterCheckInterval);
            }
            
            if (this.dataFeed) {
                this.dataFeed.disconnect();
            }
            
            if (this.firebaseStorage) {
                this.firebaseStorage.cleanup();
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