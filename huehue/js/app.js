// HueHue Main Application - Fixed Real-time Updates
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
        this.vpsMode = true; // Default to VPS mode
        this.unsubscribers = []; // Store Firebase listeners
        
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
        
        CONFIG.log('info', '🎯 HueHue Application initialized');
    }

    async initialize() {
        try {
            CONFIG.log('info', '🚀 Starting HueHue initialization...');
            
            // Initialize UI first
            this.updateConnectionStatus('connecting');
            this.hideErrorMessage();
            
            // Wait for Firebase
            await this.waitForFirebase();
            
            // Check if VPS is active
            this.vpsMode = await this.checkVPSActive();
            
            CONFIG.log('info', this.vpsMode ? '🚀 VPS Mode Active' : '💻 Standalone Mode');
            
            // Always use VPS mode since we have a VPS running
            this.vpsMode = true;
            
            // Setup real-time listeners
            await this.setupRealtimeListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Start update loops
            this.startUpdateLoops();
            
            // Initialize UI
            this.initializeUI();
            
            this.isRunning = true;
            this.updateConnectionStatus('connected');
            CONFIG.log('info', '✅ HueHue application ready!');
            
            return true;
            
        } catch (error) {
            CONFIG.log('error', '❌ Failed to initialize:', error);
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
            CONFIG.log('info', '🔥 Firebase connected');
        } else {
            throw new Error('Firebase not available');
        }
    }

    async checkVPSActive() {
        if (!this.firebaseStorage) return false;
        
        try {
            // Check for VPS heartbeat
            const systemDoc = await this.firebaseStorage.getDoc(
                this.firebaseStorage.doc(this.firebaseStorage.db, 'system', 'generator')
            );
            
            if (systemDoc.exists()) {
                const data = systemDoc.data();
                const lastHeartbeat = data.lastHeartbeat || 0;
                
                // VPS is active if heartbeat is within 2 minutes
                if (Date.now() - lastHeartbeat < 120000) {
                    CONFIG.log('info', `👑 VPS Generator active (${data.type || 'unknown'})`);
                    return true;
                }
            }
        } catch (error) {
            CONFIG.log('warn', 'Could not check VPS status:', error);
        }
        
        return false;
    }

    async setupRealtimeListeners() {
        if (!this.firebaseStorage) return;
        
        CONFIG.log('info', '📡 Setting up real-time listeners...');
        
        // Listen for signal updates
        const signalsQuery = this.firebaseStorage.query(
            this.firebaseStorage.collection(this.firebaseStorage.db, 'signals'),
            this.firebaseStorage.orderBy('timestamp', 'desc'),
            this.firebaseStorage.limit(20)
        );
        
        const signalsUnsubscribe = this.firebaseStorage.onSnapshot(signalsQuery, (snapshot) => {
            const signals = [];
            snapshot.forEach((doc) => {
                signals.push({ id: doc.id, ...doc.data() });
            });
            this.handleRealtimeSignals(signals);
        });
        
        this.unsubscribers.push(signalsUnsubscribe);
        
        // Listen for analysis updates for each symbol
        Object.keys(CONFIG.ASSETS).forEach(symbol => {
            const analysisDoc = this.firebaseStorage.doc(this.firebaseStorage.db, 'analysis', symbol);
            
            const analysisUnsubscribe = this.firebaseStorage.onSnapshot(analysisDoc, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    CONFIG.log('info', `📊 Analysis update for ${symbol}: ${data.bias} (${data.strength}/6)`);
                    this.handleAnalysisUpdate(symbol, data);
                }
            });
            
            this.unsubscribers.push(analysisUnsubscribe);
            
            // Listen for price updates
            const priceDoc = this.firebaseStorage.doc(this.firebaseStorage.db, 'prices', symbol);
            
            const priceUnsubscribe = this.firebaseStorage.onSnapshot(priceDoc, (doc) => {
                if (doc.exists()) {
                    const priceData = doc.data();
                    CONFIG.log('debug', `💰 Price update for ${symbol}: ${priceData.price}`);
                    this.updatePriceDisplay(symbol, priceData);
                }
            });
            
            this.unsubscribers.push(priceUnsubscribe);
        });
        
        CONFIG.log('info', '✅ Real-time listeners ready');
    }

    async loadInitialData() {
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                // Show loading state
                this.updateAssetBasicInfo(symbol, {
                    bias: 'LOADING',
                    strength: 0
                });
                
                // Load from Firebase
                if (this.firebaseStorage) {
                    // Get latest price
                    const priceDoc = await this.firebaseStorage.getDoc(
                        this.firebaseStorage.doc(this.firebaseStorage.db, 'prices', symbol)
                    );
                    
                    if (priceDoc.exists()) {
                        const priceData = priceDoc.data();
                        this.updatePriceDisplay(symbol, priceData);
                    }
                    
                    // Get latest analysis
                    const analysisDoc = await this.firebaseStorage.getDoc(
                        this.firebaseStorage.doc(this.firebaseStorage.db, 'analysis', symbol)
                    );
                    
                    if (analysisDoc.exists()) {
                        const analysis = analysisDoc.data();
                        this.handleAnalysisUpdate(symbol, analysis);
                    }
                }
                
            } catch (error) {
                CONFIG.log('error', `Failed to load ${symbol}:`, error);
                this.handleAssetError(symbol, error);
            }
        }
        
        // Load historical signals
        await this.loadHistoricalSignals();
    }

    async loadHistoricalSignals() {
        if (!this.firebaseStorage) return;
        
        try {
            const signals = await this.firebaseStorage.getSignals(20);
            if (signals && signals.length > 0) {
                this.handleRealtimeSignals(signals);
            }
        } catch (error) {
            CONFIG.log('warn', 'Could not load historical signals:', error);
        }
    }

    startUpdateLoops() {
        // Dashboard updates
        this.updateIntervals.dashboard = setInterval(() => {
            this.updateDashboard();
        }, 1000); // Update time every second
        
        // Performance updates
        this.updateIntervals.performance = setInterval(() => {
            this.updatePerformanceStats();
        }, 5000); // Every 5 seconds
        
        CONFIG.log('info', '🔄 Update loops started');
    }

    handleRealtimeSignals(signals) {
        CONFIG.log('info', `📡 Received ${signals.length} signals`);
        
        const signalsList = document.getElementById('signalsList');
        if (!signalsList) return;
        
        signalsList.innerHTML = '';
        
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
        
        this.lastSignals[symbol] = analysis;
        
        // Update the asset card with analysis data
        this.updateAssetCard(symbol, analysis, {
            price: analysis.price,
            change: analysis.change,
            changePercent: analysis.changePercent
        });
    }

    updateAssetCard(symbol, signal, priceData) {
        try {
            const symbolLower = symbol.toLowerCase();
            
            // Update bias
            if (signal?.bias) {
                const biasElement = document.getElementById(`${symbolLower}-bias`);
                if (biasElement) {
                    biasElement.textContent = signal.bias;
                    biasElement.className = `bias-label ${signal.bias.toLowerCase()}`;
                }
            }
            
            // Update strength
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
            
            // Update data source indicator
            const sourceElement = document.getElementById(`${symbolLower}-source`);
            if (sourceElement) {
                sourceElement.textContent = '🚀 VPS Data';
                sourceElement.style.color = '#00ff88';
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
            const conditionLabels = ['Trend', 'Strength', 'RSI', 'Position', 'Action', 'Volume'];
            
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
                
                // Add update animation
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
            CONFIG.log('warn', `Error updating basic info for ${symbol}:`, error);
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
            
        } catch (e) {
            CONFIG.log('error', 'Error handling asset error:', e);
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
            
            // Show source icon
            let sourceIcon = '';
            let sourceText = '';
            if (signal.source === 'vps_smart_hybrid') {
                sourceIcon = ' 🚀';
                sourceText = 'VPS';
            } else if (signal.id) {
                sourceIcon = ' 🔥';
                sourceText = 'Cloud';
            } else {
                sourceIcon = ' 💻';
                sourceText = 'Local';
            }
            
            signalDiv.innerHTML = `
                <div class="signal-meta">
                    <span class="signal-asset">${signal.symbol} ${signal.action}${sourceIcon}</span>
                    <span class="signal-time">${dateStr} ${timeStr}</span>
                </div>
                <div class="signal-details">
                    Entry: ${formattedPrice} | Strength: ${strength}/${maxStrength} | Source: ${sourceText}
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
            
            const strongSignals = realSignals.filter(s => s.strength >= 5);
            
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
            CONFIG.log('warn', 'Error updating stats:', error);
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
            
            // Add VPS indicator to session
            const dataSourceText = '🚀 VPS Active';
            
            const sessionText = session.active ? 
                `${session.emoji} ${session.name} Session | ${dataSourceText}` : 
                `🌙 Market Quiet | ${dataSourceText}`;
            
            sessionIndicator.textContent = sessionText;
            sessionIndicator.className = session.active ? 
                'session-indicator session-active' : 
                'session-indicator';
                
        } catch (error) {
            CONFIG.log('warn', 'Error updating session:', error);
        }
    }

    updatePerformanceStats() {
        // This can be extended to calculate real performance metrics
        // For now, we'll keep it simple
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;
        
        statusElement.className = `connection-status status-${status}`;
        
        switch (status) {
            case 'connected':
                statusElement.textContent = 'LIVE DATA';
                break;
            case 'connecting':
                statusElement.textContent = 'CONNECTING';
                break;
            case 'error':
                statusElement.textContent = 'API ERROR';
                break;
        }
    }

    hideErrorMessage() {
        const errorElement = document.getElementById('apiErrorMessage');
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }

    initializeUI() {
        CONFIG.log('info', '🎨 UI initialized');
    }

    handleApplicationError(error) {
        this.errorCount++;
        this.lastErrorTime = Date.now();
        
        CONFIG.log('error', `Application error ${this.errorCount}:`, error.message);
        
        // Show error to user
        const errorElement = document.getElementById('apiErrorMessage');
        if (errorElement) {
            const errorDescription = document.getElementById('errorDescription');
            if (errorDescription) {
                errorDescription.textContent = error.message;
            }
            errorElement.classList.add('show');
        }
        
        if (this.errorCount >= this.maxErrors) {
            CONFIG.log('error', '🚨 Too many errors, stopping');
            this.stop();
        }
    }

    showSignalDetails(signal) {
        const details = `Signal Details:\n\n` +
            `Symbol: ${signal.symbol}\n` +
            `Action: ${signal.action}\n` +
            `Strength: ${signal.strength}/${signal.maxStrength || 6}\n` +
            `Bias: ${signal.bias}\n` +
            `Entry: ${CONFIG.formatPrice(signal.symbol, signal.entry || signal.price)}\n` +
            `Time: ${new Date(signal.timestamp).toLocaleString()}\n` +
            `Source: ${signal.source || 'Unknown'}`;
        
        alert(details);
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
            
            // Clear intervals
            Object.values(this.updateIntervals).forEach(interval => {
                clearInterval(interval);
            });
            
            // Unsubscribe from Firebase listeners
            this.unsubscribers.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            
            CONFIG.log('info', '🛑 Application stopped');
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
    
    CONFIG.log('info', '🚀 Starting HueHue Application...');
    
    try {
        optimizedHueHueApp = new OptimizedHueHueApp();
        window.optimizedHueHueApp = optimizedHueHueApp; // Make available globally for debugging
        
        const initialized = await optimizedHueHueApp.initialize();
        
        if (initialized) {
            CONFIG.log('info', '✅ HueHue is running!');
            
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        } else {
            CONFIG.log('error', '❌ Failed to start HueHue');
        }
    } catch (error) {
        CONFIG.log('error', '❌ Critical error:', error);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    try {
        if (optimizedHueHueApp) {
            optimizedHueHueApp.stop();
        }
    } catch (error) {
        CONFIG.log('error', 'Error during unload:', error);
    }
});

// Global error handlers
window.addEventListener('error', (event) => {
    CONFIG.log('error', 'Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    CONFIG.log('error', 'Unhandled rejection:', event.reason);
});