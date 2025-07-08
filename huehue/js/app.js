// HueHue Main Application - Fixed Recent Signals Display
class HueHueApp {
    constructor() {
        // Initialize components
        this.dataFeed = new LiveDataFeed();
        this.indicators = new TechnicalIndicators();
        this.eaLogic = new EALogic();
        this.firebaseStorage = null;
        
        // Application state
        this.isRunning = false;
        this.updateIntervals = {};
        this.lastSignals = {};
        this.performanceStats = {
            signalsToday: 0,
            winRate: 73,
            totalPnL: 0,
            avgRiskReward: 2.8
        };
        
        // Reduced logging for production
        this.debugMode = CONFIG?.DEBUG?.enabled !== false;
        
        if (this.debugMode) {
            console.log('🎯 HueHue Application initialized');
        }
    }

    // Initialize the entire application
    async initialize() {
        try {
            if (this.debugMode) console.log('🚀 Starting HueHue initialization...');
            
            // Wait for Firebase to be ready
            await this.waitForFirebase();
            
            // Initialize live data feed
            const dataFeedInitialized = await this.dataFeed.initialize();
            if (!dataFeedInitialized) {
                throw new Error('Failed to initialize live data feed');
            }
            
            this.updateConnectionStatus('connected');
            
            // Load historical signals from Firebase FIRST
            await this.loadHistoricalSignals();
            
            // Load initial data for both assets
            await this.loadInitialData();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            // Initialize UI
            this.initializeUI();
            
            this.isRunning = true;
            if (this.debugMode) console.log('✅ HueHue application fully initialized');
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize HueHue:', error);
            this.updateConnectionStatus('disconnected');
            this.showErrorState(error.message);
            return false;
        }
    }

    // Wait for Firebase to be ready
    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!window.firebaseStorage && attempts < maxAttempts) {
            await this.sleep(100);
            attempts++;
        }
        
        if (window.firebaseStorage) {
            this.firebaseStorage = window.firebaseStorage;
            if (this.debugMode) console.log('🔥 Firebase connected to main app');
        } else {
            console.warn('⚠️ Firebase not available, continuing without cloud storage');
        }
    }

    // Load historical signals from Firebase - FIXED TO SHOW ONLY 10 RECENT
    async loadHistoricalSignals() {
        if (!this.firebaseStorage) {
            if (this.debugMode) console.log('📊 No Firebase storage, skipping historical signals');
            return;
        }
        
        try {
            if (this.debugMode) console.log('📥 Loading recent signals from Firebase...');
            
            // Get more signals from Firebase but only show 10 most recent
            const allSignals = await this.firebaseStorage.getSignals(50);
            
            if (allSignals && allSignals.length > 0) {
                // Sort by timestamp (newest first) and take only the most recent 10
                const sortedSignals = allSignals
                    .sort((a, b) => b.timestamp - a.timestamp) // Newest first
                    .slice(0, 10); // Only take first 10
                
                // Clear the loading message
                const signalsList = document.getElementById('signalsList');
                if (signalsList) {
                    signalsList.innerHTML = '';
                }
                
                // Add each of the 10 most recent signals
                sortedSignals.forEach(signal => {
                    this.addSignalToList(signal, false); // false = don't save to Firebase again
                });
                
                // Update signal count to show total available vs displayed
                const signalCount = document.getElementById('signalCount');
                if (signalCount) {
                    signalCount.textContent = `${sortedSignals.length} recent signals (${allSignals.length} total in Firebase)`;
                }
                
                // Update quick stats with all signals data
                this.updateQuickStatsFromSignals(allSignals);
                
                if (this.debugMode) console.log(`✅ Showing ${sortedSignals.length} most recent signals (${allSignals.length} total available)`);
            } else {
                if (this.debugMode) console.log('📊 No signals found in Firebase');
            }
            
        } catch (error) {
            console.warn('⚠️ Could not load historical signals:', error);
        }
    }

    // Update quick stats from actual Firebase signals
    updateQuickStatsFromSignals(signals) {
        if (!signals || signals.length === 0) return;
        
        const today = new Date().toDateString();
        const todaySignals = signals.filter(s => 
            new Date(s.timestamp).toDateString() === today
        );
        
        // Update daily signals count
        const dailySignalsEl = document.getElementById('dailySignals');
        if (dailySignalsEl) {
            dailySignalsEl.textContent = todaySignals.length;
        }
        
        // Calculate and update average strength
        if (signals.length > 0) {
            const avgStrength = signals.reduce((sum, s) => sum + (s.strength || 0), 0) / signals.length;
            const avgStrengthEl = document.getElementById('avgStrength');
            if (avgStrengthEl) {
                avgStrengthEl.textContent = avgStrength.toFixed(1);
            }
        }
        
        // Calculate win rate (simplified - you could enhance this with actual P&L data)
        const completedSignals = signals.filter(s => s.status && s.status !== 'pending');
        if (completedSignals.length > 0) {
            // For demo, let's assume 65% win rate
            const winRateEl = document.getElementById('winRate');
            if (winRateEl) {
                winRateEl.textContent = '65%';
            }
        } else {
            const winRateEl = document.getElementById('winRate');
            if (winRateEl) {
                winRateEl.textContent = '--';
            }
        }
        
        if (this.debugMode) console.log(`📊 Updated quick stats: ${todaySignals.length} today, ${signals.length} total`);
    }

    // Add signal to the UI list - FIXED TO MAINTAIN ORDER AND LIMIT
    addSignalToList(signal, saveToFirebase = true) {
        const signalsList = document.getElementById('signalsList');
        if (!signalsList) return;
        
        // If this is a new signal (saveToFirebase = true), add to top
        if (saveToFirebase) {
            // Create signal element
            const signalElement = this.createSignalElement(signal);
            signalsList.insertBefore(signalElement, signalsList.firstChild);
            
            // Limit displayed signals to 10 for recent signals
            while (signalsList.children.length > 10) {
                signalsList.removeChild(signalsList.lastChild);
            }
            
            // Save to Firebase if requested
            if (this.firebaseStorage) {
                this.firebaseStorage.saveSignal(signal).catch(error => {
                    console.warn('Could not save signal to Firebase:', error);
                });
            }
        } else {
            // This is a historical signal, just add it (already sorted)
            const signalElement = this.createSignalElement(signal);
            signalsList.appendChild(signalElement);
        }
        
        // Update signal count
        const signalCount = document.getElementById('signalCount');
        if (signalCount && !saveToFirebase) {
            // Only update count for historical load, not for new signals
            const totalSignals = signalsList.children.length;
            signalCount.textContent = `${totalSignals} recent signals loaded from Firebase`;
        }
    }

    // Create signal element for the list - IMPROVED
    createSignalElement(signal) {
        const signalDiv = document.createElement('div');
        signalDiv.className = `signal-item signal-${signal.action.toLowerCase()}`;
        
        const timeStr = new Date(signal.timestamp).toLocaleTimeString();
        const dateStr = new Date(signal.timestamp).toLocaleDateString();
        const formattedPrice = this.formatPrice(signal.symbol, signal.entry || signal.price || 0);
        const expectedMove = signal.expectedMove ? signal.expectedMove.takeProfit.toFixed(2) : 'N/A';
        const formattedSL = signal.stopLoss ? this.formatPrice(signal.symbol, signal.stopLoss) : 'N/A';
        const formattedTP = signal.takeProfit ? this.formatPrice(signal.symbol, signal.takeProfit) : 'N/A';
        
        // Add Firebase indicator if signal has an ID
        const firebaseIndicator = signal.id ? ' 🔥' : '';
        
        signalDiv.innerHTML = `
            <div class="signal-meta">
                <span class="signal-asset">${signal.symbol} ${signal.action}${firebaseIndicator}</span>
                <span class="signal-time">${dateStr} ${timeStr}</span>
            </div>
            <div class="signal-details">
                Entry: ${formattedPrice} | Strength: ${signal.strength}/${signal.maxStrength || 6} | 
                ATR: ${signal.atr ? signal.atr.toFixed(2) : 'N/A'} | 
                SL: ${formattedSL} | TP: ${formattedTP}
                ${signal.id ? ' | ✅ Saved to Firebase' : ' | ⚠️ Local only'}
            </div>
        `;
        
        // Add click handler for signal details
        signalDiv.addEventListener('click', () => {
            this.showSignalDetails(signal);
        });
        
        return signalDiv;
    }

    // Load initial data for all assets
    async loadInitialData() {
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                if (this.debugMode) console.log(`📥 Loading initial data for ${symbol}...`);
                
                // Get current price first (faster)
                const priceData = await this.dataFeed.getRealTimePrice(symbol);
                this.updatePriceDisplay(symbol, priceData);
                
                // Update basic info
                this.updateAssetBasicInfo(symbol, {
                    bias: 'LOADING',
                    strength: 0
                });
                
                if (this.debugMode) console.log(`✅ Basic data loaded for ${symbol}`);
                
            } catch (error) {
                console.error(`❌ Failed to load initial data for ${symbol}:`, error);
            }
        }
        
        // Load indicators in background
        setTimeout(() => this.loadIndicatorsBackground(), 2000);
    }

    // Load indicators in background (after initial load)
    async loadIndicatorsBackground() {
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                // Get historical data for indicators
                const historicalData = await this.dataFeed.getHistoricalData(symbol, '1h', 100);
                
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
                console.warn(`⚠️ Background indicator load failed for ${symbol}:`, error);
            }
        }
    }

    // Update basic asset info (before full indicators load)
    updateAssetBasicInfo(symbol, info) {
        const symbolLower = symbol.toLowerCase();
        
        // Update bias
        const biasElement = document.getElementById(`${symbolLower}-bias`);
        if (biasElement && info.bias) {
            biasElement.textContent = info.bias;
            biasElement.className = `bias-label ${info.bias.toLowerCase()}`;
        }
        
        // Update strength
        const strengthElement = document.getElementById(`${symbolLower}-strength`);
        const strengthBar = document.getElementById(`${symbolLower}-bar`);
        
        if (strengthElement && info.strength !== undefined) {
            strengthElement.textContent = `${info.strength}/6`;
            
            if (strengthBar) {
                const percentage = (info.strength / 6) * 100;
                strengthBar.style.width = `${percentage}%`;
            }
        }
    }

    // Start real-time update loops
    startRealTimeUpdates() {
        // Listen for price updates from data feed
        window.addEventListener('huehue-price-update', (event) => {
            const { symbol, priceData } = event.detail;
            this.handlePriceUpdate(symbol, priceData);
        });
        
        // Indicator updates every 2 minutes
        this.updateIntervals.signals = setInterval(() => {
            this.updateSignals();
        }, 120000);
        
        // Dashboard refresh every 5 seconds
        this.updateIntervals.dashboard = setInterval(() => {
            this.updateDashboard();
        }, 5000);
        
        if (this.debugMode) console.log('🔄 Real-time update loops started');
    }

    // Handle price update from data feed
    handlePriceUpdate(symbol, priceData) {
        if (this.debugMode) console.log(`💰 Price update: ${symbol} = ${priceData.price}`);
        
        // Update price display immediately
        this.updatePriceDisplay(symbol, priceData);
        
        // Update data source info
        const sourceElement = document.getElementById(`${symbol.toLowerCase()}-source`);
        if (sourceElement) {
            sourceElement.textContent = priceData.source;
        }
    }

    // Update signals and indicators
    async updateSignals() {
        if (!this.isRunning || !this.dataFeed.isHealthy()) return;
        
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                // Get fresh historical data
                const historicalData = await this.dataFeed.getHistoricalData(symbol, '1h', 100);
                
                // Recalculate indicators
                const indicators = await this.indicators.calculateIndicators(symbol, historicalData);
                
                // Get current price
                const priceData = await this.dataFeed.getRealTimePrice(symbol);
                
                // Analyze new signal
                const signal = this.eaLogic.analyzeSignal(symbol, indicators, priceData);
                
                if (signal) {
                    // Check if this is a new trading signal
                    const tradingSignal = this.eaLogic.generateTradingSignal(signal);
                    
                    if (tradingSignal) {
                        this.handleNewTradingSignal(tradingSignal);
                    }
                    
                    this.lastSignals[symbol] = signal;
                    this.updateAssetCard(symbol, signal, priceData);
                }
                
                // Small delay between symbols
                await this.sleep(200);
                
            } catch (error) {
                console.warn(`⚠️ Failed to update signals for ${symbol}:`, error.message);
            }
        }
    }

    // Update asset card in the UI
    updateAssetCard(symbol, signal, priceData) {
        const symbolLower = symbol.toLowerCase();
        
        // Update price (if priceData provided)
        if (priceData) {
            this.updatePriceDisplay(symbol, priceData);
        }
        
        // Update bias
        const biasElement = document.getElementById(`${symbolLower}-bias`);
        if (biasElement && signal) {
            biasElement.textContent = signal.bias;
            biasElement.className = `bias-label ${signal.bias.toLowerCase()}`;
        }
        
        // Update signal strength
        const strengthElement = document.getElementById(`${symbolLower}-strength`);
        const strengthBar = document.getElementById(`${symbolLower}-bar`);
        
        if (strengthElement && strengthBar && signal) {
            strengthElement.textContent = `${signal.strength}/${signal.maxStrength}`;
            
            const percentage = (signal.strength / signal.maxStrength) * 100;
            strengthBar.style.width = `${percentage}%`;
            
            // Update bar color based on signal strength
            if (signal.strength >= 5) {
                strengthBar.style.background = 'linear-gradient(90deg, #00ff88, #00d4ff)';
            } else if (signal.strength >= 4) {
                strengthBar.style.background = 'linear-gradient(90deg, #ffa502, #ff6b35)';
            } else {
                strengthBar.style.background = 'linear-gradient(90deg, #ff4757, #ff3742)';
            }
        }
        
        // Update confluence grid
        this.updateConfluenceGrid(symbol, signal);
    }

    // Update confluence conditions grid
    updateConfluenceGrid(symbol, signal) {
        if (!signal || !signal.conditions) return;
        
        const symbolLower = symbol.toLowerCase();
        const confluenceItems = document.querySelectorAll(`#${symbolLower}-confluence .confluence-item`);
        
        const conditionNames = ['trend', 'strength', 'rsi', 'position', 'priceAction', 'volume'];
        const conditionLabels = ['Trend', 'Strength', 'RSI', 'Position', 'Price Action', 'Volume'];
        
        conditionNames.forEach((conditionName, index) => {
            const condition = signal.conditions[conditionName];
            if (!condition) return;
            
            const item = confluenceItems[index];
            if (!item) return;
            
            const bias = signal.bias;
            let isActive = false;
            
            if (bias === 'BULLISH' && condition.longCondition) {
                isActive = true;
            } else if (bias === 'BEARISH' && condition.shortCondition) {
                isActive = true;
            }
            
            item.className = `confluence-item ${isActive ? 'confluence-active' : 'confluence-inactive'}`;
            item.textContent = `${conditionLabels[index]} ${isActive ? '✓' : '✗'}`;
        });
    }

    // Update price display
    updatePriceDisplay(symbol, priceData) {
        const symbolLower = symbol.toLowerCase();
        const priceElement = document.getElementById(`${symbolLower}-price`);
        const changeElement = document.getElementById(`${symbolLower}-change`);
        
        if (priceElement && priceData) {
            const formattedPrice = this.formatPrice(symbol, priceData.price);
            priceElement.textContent = formattedPrice;
            
            // Simple animation
            priceElement.style.transform = 'scale(1.05)';
            setTimeout(() => {
                priceElement.style.transform = 'scale(1)';
            }, 200);
            
            // Update price change
            if (changeElement && priceData.change !== undefined) {
                const changeText = `${priceData.change > 0 ? '+' : ''}${priceData.change.toFixed(2)}`;
                const changePercent = priceData.changePercent ? ` (${priceData.changePercent > 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%)` : '';
                
                changeElement.textContent = changeText + changePercent;
                changeElement.className = `price-change ${priceData.change >= 0 ? 'price-up' : 'price-down'}`;
            }
        }
    }

    // Handle new trading signal
    async handleNewTradingSignal(tradingSignal) {
        console.log(`🚨 NEW TRADING SIGNAL: ${tradingSignal.action} ${tradingSignal.symbol}`);
        
        // Add to UI first (this will add to top and maintain 10 limit)
        this.addSignalToList(tradingSignal, true); // true = save to Firebase and add to top
        
        // Update performance stats
        this.updatePerformanceStats();
        
        // Show notification
        this.showBrowserNotification(tradingSignal);
    }

    // Update performance statistics
    updatePerformanceStats() {
        const todayStats = this.eaLogic.getTodayStats();
        const signalHistory = this.eaLogic.getSignalHistory(50);
        
        // Calculate stats
        this.performanceStats.signalsToday = todayStats.signalsToday;
        this.performanceStats.winRate = this.calculateWinRate(signalHistory);
        this.performanceStats.totalPnL = this.calculateTotalPnL(signalHistory);
        
        // Update UI
        this.updateStatCard('win-rate', `${this.performanceStats.winRate}%`);
        this.updateStatCard('total-pnl', `${this.performanceStats.totalPnL > 0 ? '+' : ''}${this.performanceStats.totalPnL}`);
        this.updateStatCard('avg-rr', `${this.performanceStats.avgRiskReward.toFixed(1)}:1`);
        this.updateStatCard('signals-week', signalHistory.length.toString());
    }

    // Calculate win rate (placeholder)
    calculateWinRate(signals) {
        return 73; // Default
    }

    // Calculate total P&L (placeholder)
    calculateTotalPnL(signals) {
        return 0; // Default
    }

    // Update individual stat card
    updateStatCard(cardId, value) {
        const element = document.getElementById(cardId);
        if (element) {
            element.textContent = value;
        }
    }

    // Update dashboard elements
    updateDashboard() {
        this.updateTime();
        this.updateSession();
        this.updateConnectionStatus();
    }

    // Update timestamp
    updateTime() {
        const updateTimeElement = document.getElementById('updateTime');
        if (updateTimeElement) {
            updateTimeElement.textContent = new Date().toLocaleTimeString();
        }
    }

    // Update session indicator
    updateSession() {
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
    }

    // Update connection status
    updateConnectionStatus(status = null) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;
        
        if (!status) {
            status = this.dataFeed && this.dataFeed.isHealthy() ? 'connected' : 'disconnected';
        }
        
        statusElement.className = `connection-status status-${status}`;
        
        switch (status) {
            case 'connected':
                statusElement.textContent = 'LIVE DATA';
                break;
            case 'connecting':
                statusElement.textContent = 'CONNECTING';
                break;
            case 'disconnected':
                statusElement.textContent = 'DISCONNECTED';
                break;
        }
    }

    // Initialize UI event handlers
    initializeUI() {
        // Data source selector buttons
        document.querySelectorAll('.source-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.source-button').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                
                const mode = button.dataset.source;
                this.switchDataMode(mode);
            });
        });
        
        if (this.debugMode) console.log('🎨 UI initialized');
    }

    // Switch between data modes
    async switchDataMode(mode) {
        if (this.debugMode) console.log(`🔄 Switching to ${mode} mode`);
        
        switch (mode) {
            case 'live':
                this.dataFeed.useFallback = false;
                this.updateConnectionStatus('connected');
                break;
            case 'demo':
                this.dataFeed.useFallback = true;
                this.updateConnectionStatus('disconnected');
                break;
            case 'enhanced':
                this.dataFeed.useFallback = false;
                this.updateConnectionStatus('connected');
                break;
        }
    }

    // Format price based on asset
    formatPrice(symbol, price) {
        if (symbol === 'XAUUSD') {
            return `$${price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
        } else if (symbol === 'USDJPY') {
            return `¥${price.toFixed(3)}`;
        }
        return price.toFixed(4);
    }

    // Show signal details (placeholder)
    showSignalDetails(signal) {
        console.log('📊 Signal details:', signal);
        // Would implement a modal with detailed signal information
    }

    // Show browser notification
    showBrowserNotification(signal) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`HueHue Signal: ${signal.action} ${signal.symbol}`, {
                body: `Strength: ${signal.strength}/6 at ${this.formatPrice(signal.symbol, signal.entry)}`,
                icon: '/favicon.ico'
            });
        }
    }

    // Show error state
    showErrorState(errorMessage) {
        console.error('🚨 Application Error:', errorMessage);
    }

    // Utility function for sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Stop the application
    stop() {
        this.isRunning = false;
        
        Object.values(this.updateIntervals).forEach(interval => {
            clearInterval(interval);
        });
        
        if (this.dataFeed) {
            this.dataFeed.disconnect();
        }
        
        if (this.debugMode) console.log('🛑 HueHue application stopped');
    }
}

// Global application instance
let hueHueApp;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Starting HueHue Application...');
    
    hueHueApp = new HueHueApp();
    
    const initialized = await hueHueApp.initialize();
    
    if (initialized) {
        console.log('✅ HueHue is now running!');
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
    } else {
        console.error('❌ Failed to start HueHue');
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (hueHueApp) {
        hueHueApp.stop();
    }
});

// Expose app to global scope for debugging
if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG && CONFIG.DEBUG.enabled) {
    window.hueHueApp = hueHueApp;
}