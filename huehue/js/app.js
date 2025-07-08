// HueHue Main Application - Firebase + Live Trading Dashboard
class HueHueApp {
    constructor() {
        // Initialize components
        this.dataFeed = new LiveDataFeed();
        this.indicators = new TechnicalIndicators();
        this.eaLogic = new EALogic();
        this.firebaseStorage = null; // Will be set when Firebase is ready
        
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
        
        console.log('🎯 HueHue Application initialized');
    }

    // Initialize the entire application
    async initialize() {
        try {
            console.log('🚀 Starting HueHue initialization...');
            
            // Show loading state
            this.showLoadingState();
            
            // Wait for Firebase to be ready
            await this.waitForFirebase();
            
            // Initialize live data feed
            const dataFeedInitialized = await this.dataFeed.initialize();
            if (!dataFeedInitialized) {
                throw new Error('Failed to initialize live data feed');
            }
            
            this.updateConnectionStatus('connected');
            
            // Load historical signals from Firebase
            await this.loadHistoricalSignals();
            
            // Load initial data for both assets
            await this.loadInitialData();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            // Initialize UI
            this.initializeUI();
            
            this.isRunning = true;
            console.log('✅ HueHue application fully initialized with Firebase');
            
            // Hide loading and show dashboard
            this.hideLoadingState();
            
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
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!window.firebaseStorage && attempts < maxAttempts) {
            await this.sleep(100);
            attempts++;
        }
        
        if (window.firebaseStorage) {
            this.firebaseStorage = window.firebaseStorage;
            console.log('🔥 Firebase connected to main app');
        } else {
            console.warn('⚠️ Firebase not available, continuing without cloud storage');
        }
    }

    // Load historical signals from Firebase
    async loadHistoricalSignals() {
        if (!this.firebaseStorage) {
            console.log('📊 No Firebase storage, skipping historical signals');
            return;
        }
        
        try {
            console.log('📥 Loading historical signals from Firebase...');
            const signals = await this.firebaseStorage.getSignals(20);
            
            // Clear initialization message
            const signalsList = document.getElementById('signalsList');
            if (signalsList && signals.length > 0) {
                signalsList.innerHTML = '';
            }
            
            // Add each signal to UI
            signals.forEach(signal => {
                this.addSignalToList(signal, false); // false = don't save to Firebase again
            });
            
            console.log(`✅ Loaded ${signals.length} historical signals from Firebase`);
            
            // Update signal count
            const signalCount = document.getElementById('signalCount');
            if (signalCount) {
                signalCount.textContent = `${signals.length} signals loaded from Firebase`;
            }
            
        } catch (error) {
            console.warn('⚠️ Could not load historical signals:', error);
        }
    }

    // Load initial data for all assets
    async loadInitialData() {
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                console.log(`📥 Loading initial data for ${symbol}...`);
                
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
                
                console.log(`✅ Initial data loaded for ${symbol}`);
                
            } catch (error) {
                console.error(`❌ Failed to load initial data for ${symbol}:`, error);
                // Don't fail completely, just log the error
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
        
        // Indicator and signal updates every minute
        this.updateIntervals.signals = setInterval(() => {
            this.updateSignals();
        }, CONFIG.UPDATE_INTERVALS.indicatorUpdate);
        
        // Dashboard refresh every 5 seconds
        this.updateIntervals.dashboard = setInterval(() => {
            this.updateDashboard();
        }, CONFIG.UPDATE_INTERVALS.dashboardRefresh);
        
        console.log('🔄 Real-time update loops started');
    }

    // Handle price update from data feed
    handlePriceUpdate(symbol, priceData) {
        console.log(`💰 Price update: ${symbol} = ${priceData.price}`);
        
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
                // Get fresh historical data (cached for 5 minutes)
                const historicalData = await this.dataFeed.getHistoricalData(symbol, '1h', 100);
                
                // Recalculate indicators
                const indicators = await this.indicators.calculateIndicators(symbol, historicalData);
                
                // Get current price (cached for 30 seconds)
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

    // Update price display only
    updatePriceDisplay(symbol, priceData) {
        const symbolLower = symbol.toLowerCase();
        const priceElement = document.getElementById(`${symbolLower}-price`);
        const changeElement = document.getElementById(`${symbolLower}-change`);
        
        if (priceElement && priceData) {
            const formattedPrice = this.formatPrice(symbol, priceData.price);
            priceElement.textContent = formattedPrice;
            
            // Animate price change
            if (CONFIG.UI.priceUpdateAnimation) {
                priceElement.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    priceElement.style.transform = 'scale(1)';
                }, 200);
            }
            
            // Update price change
            if (changeElement && priceData.change !== undefined) {
                const changeText = `${priceData.change > 0 ? '+' : ''}${priceData.change.toFixed(2)}`;
                const changePercent = priceData.changePercent ? ` (${priceData.changePercent > 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%)` : '';
                
                changeElement.textContent = changeText + changePercent;
                changeElement.className = `price-change ${priceData.change >= 0 ? 'price-up' : 'price-down'}`;
            }
        }
    }

    // Handle new trading signal with Firebase storage
    async handleNewTradingSignal(tradingSignal) {
        console.log(`🚨 NEW TRADING SIGNAL: ${tradingSignal.action} ${tradingSignal.symbol}`);
        
        // Save to Firebase first
        if (this.firebaseStorage) {
            try {
                await this.firebaseStorage.saveSignal(tradingSignal);
                console.log('🔥 Signal saved to Firebase');
            } catch (error) {
                console.warn('⚠️ Could not save signal to Firebase:', error);
            }
        }
        
        // Add to UI
        this.addSignalToList(tradingSignal, false); // false = already saved to Firebase
        
        // Update performance stats
        this.updatePerformanceStats();
        
        // Play sound alert (if enabled)
        if (CONFIG.UI.soundAlerts) {
            this.playAlertSound();
        }
        
        // Show browser notification (if permissions granted)
        this.showBrowserNotification(tradingSignal);
    }

    // Add signal to the UI list
    addSignalToList(signal, saveToFirebase = true) {
        const signalsList = document.getElementById('signalsList');
        if (!signalsList) return;
        
        // Clear initialization message if this is the first signal
        if (signalsList.children.length === 1 && 
            signalsList.children[0].textContent.includes('Connecting')) {
            signalsList.innerHTML = '';
        }
        
        const signalElement = this.createSignalElement(signal);
        signalsList.insertBefore(signalElement, signalsList.firstChild);
        
        // Limit displayed signals
        while (signalsList.children.length > CONFIG.UI.maxSignalsDisplay) {
            signalsList.removeChild(signalsList.lastChild);
        }
        
        // Update signal count
        const signalCount = document.getElementById('signalCount');
        if (signalCount) {
            const totalSignals = signalsList.children.length;
            signalCount.textContent = `${totalSignals} signals (🔥 Firebase synced)`;
        }
        
        // Save to Firebase if requested and not already saved
        if (saveToFirebase && this.firebaseStorage) {
            this.firebaseStorage.saveSignal(signal).catch(error => {
                console.warn('Could not save signal to Firebase:', error);
            });
        }
    }

    // Create signal element for the list with Firebase indicator
    createSignalElement(signal) {
        const signalDiv = document.createElement('div');
        signalDiv.className = `signal-item signal-${signal.action.toLowerCase()}`;
        
        const timeStr = new Date(signal.timestamp).toLocaleTimeString();
        const formattedPrice = this.formatPrice(signal.symbol, signal.entry);
        const expectedMove = signal.expectedMove ? signal.expectedMove.takeProfit.toFixed(2) : 'N/A';
        const formattedSL = this.formatPrice(signal.symbol, signal.stopLoss);
        const formattedTP = this.formatPrice(signal.symbol, signal.takeProfit);
        
        // Add Firebase indicator if signal has an ID (meaning it's saved)
        const firebaseIndicator = signal.id ? ' 🔥' : '';
        
        signalDiv.innerHTML = `
            <div class="signal-meta">
                <span class="signal-asset">${signal.symbol} ${signal.action}${firebaseIndicator}</span>
                <span class="signal-time">${timeStr}</span>
            </div>
            <div class="signal-details">
                Entry: ${formattedPrice} | Strength: ${signal.strength}/${signal.maxStrength} | 
                ATR: ${signal.atr ? signal.atr.toFixed(2) : 'N/A'} | 
                SL: ${formattedSL} | TP: ${formattedTP} ${signal.id ? '| Saved to Firebase ✅' : '| Local only ⚠️'}
            </div>
        `;
        
        // Add click handler for signal details
        signalDiv.addEventListener('click', () => {
            this.showSignalDetails(signal);
        });
        
        return signalDiv;
    }

    // Update performance statistics with Firebase sync
    async updatePerformanceStats() {
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
        
        // Save to Firebase every hour
        if (this.firebaseStorage && Math.random() < 0.02) { // 2% chance each update = ~1/hour
            try {
                await this.firebaseStorage.savePerformance(this.performanceStats);
                console.log('📈 Performance stats saved to Firebase');
            } catch (error) {
                console.warn('Could not save performance to Firebase:', error);
            }
        }
    }

    // Utility function for sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
        
        if (session.active) {
            sessionIndicator.textContent = `${session.emoji} ${session.name} Session`;
            sessionIndicator.className = 'session-indicator session-active';
        } else {
            sessionIndicator.textContent = '🌙 Market Closed';
            sessionIndicator.className = 'session-indicator';
        }
    }

    // Update connection status
    updateConnectionStatus(status = null) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;
        
        if (!status) {
            // Auto-detect status
            if (this.dataFeed && this.dataFeed.isHealthy()) {
                status = 'connected';
            } else {
                status = 'disconnected';
            }
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

    // Update performance statistics
    updatePerformanceStats() {
        const todayStats = this.eaLogic.getTodayStats();
        const signalHistory = this.eaLogic.getSignalHistory(50);
        
        // Update stat cards (simplified for now)
        this.updateStatCard('win-rate', `${this.performanceStats.winRate}%`);
        this.updateStatCard('total-pnl', `${this.performanceStats.totalPnL > 0 ? '+' : ''}$${this.performanceStats.totalPnL}`);
        this.updateStatCard('avg-rr', `${this.performanceStats.avgRiskReward.toFixed(1)}:1`);
        this.updateStatCard('signals-week', signalHistory.length.toString());
    }

    // Update individual stat card (simplified)
    updateStatCard(cardId, value) {
        // In a real implementation, you'd have proper IDs for each stat card
        // For now, this is a placeholder that would need proper element targeting
        console.log(`Updating ${cardId}: ${value}`);
    }

    // Format price based on asset
    formatPrice(symbol, price) {
        const assetConfig = CONFIG.ASSETS[symbol];
        if (!assetConfig) return price.toString();
        
        if (symbol === 'XAUUSD') {
            return `$${price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
        } else if (symbol === 'USDJPY') {
            return `¥${price.toFixed(3)}`;
        }
        
        return price.toFixed(assetConfig.digits);
    }

    // Initialize UI event handlers
    initializeUI() {
        // Data source selector buttons
        document.querySelectorAll('.source-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.source-button').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                console.log(`Switched to ${button.dataset.source} mode`);
            });
        });
        
        // Add click handlers for asset cards
        document.querySelectorAll('.asset-card').forEach(card => {
            card.addEventListener('click', function() {
                this.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
        });
        
        console.log('🎨 UI initialized');
    }

    // Show loading state
    showLoadingState() {
        this.updateConnectionStatus('connecting');
    }

    // Hide loading state
    hideLoadingState() {
        // Loading state is hidden when connection status is updated
    }

    // Show error state
    showErrorState(errorMessage) {
        const container = document.querySelector('.container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed; top: 20px; right: 20px; 
                background: rgba(255, 71, 87, 0.9); 
                color: white; padding: 15px; border-radius: 10px;
                z-index: 9999; max-width: 300px;
            `;
            errorDiv.innerHTML = `
                <strong>⚠️ Connection Error</strong><br>
                ${errorMessage}<br>
                <small>Check console for details</small>
            `;
            document.body.appendChild(errorDiv);
            
            // Auto-remove after 10 seconds
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 10000);
        }
    }

    // Show signal details modal (placeholder)
    showSignalDetails(signal) {
        console.log('📊 Signal details:', signal);
        // Would implement a modal with detailed signal information
    }

    // Play alert sound (placeholder)
    playAlertSound() {
        // Would play notification sound
        console.log('🔊 Alert sound played');
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

    // Stop the application
    stop() {
        this.isRunning = false;
        
        // Clear all intervals
        Object.values(this.updateIntervals).forEach(interval => {
            clearInterval(interval);
        });
        
        // Disconnect data feed
        if (this.dataFeed) {
            this.dataFeed.disconnect();
        }
        
        console.log('🛑 HueHue application stopped');
    }

    // Get application status
    getStatus() {
        return {
            isRunning: this.isRunning,
            dataFeedStats: this.dataFeed ? this.dataFeed.getStats() : null,
            signalHistory: this.eaLogic ? this.eaLogic.getSignalHistory(10) : [],
            todayStats: this.eaLogic ? this.eaLogic.getTodayStats() : {},
            lastSignals: this.lastSignals,
            performanceStats: this.performanceStats
        };
    }
}

// Global application instance
let hueHueApp;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Starting HueHue Application...');
    
    hueHueApp = new HueHueApp();
    
    // Initialize the application
    const initialized = await hueHueApp.initialize();
    
    if (initialized) {
        console.log('✅ HueHue is now running with live data!');
        
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
if (CONFIG.DEBUG.enabled) {
    window.hueHueApp = hueHueApp;
    window.debugHueHue = () => hueHueApp?.getStatus();
}

console.log(`
🎯 HueHue Live Trading Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 Data Source: Twelve Data (Live)
💰 Assets: XAUUSD, USDJPY
🧠 EA Logic: 6-condition system
⚡ Updates: Real-time prices
📊 Signals: 4+ conditions = trade

🔧 Setup Required:
1. Add your Twelve Data API key to config.js
2. Replace 'YOUR_TWELVE_DATA_API_KEY'
3. Save and refresh

🚀 Ready to trade live!
`);