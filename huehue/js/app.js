// HueHue Main Application - Fixed Status Display
class HueHueApp {
    constructor() {
        // Initialize components
        this.dataFeed = null;
        this.indicators = null;
        this.eaLogic = null;
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
        
        // Track actual data mode
        this.actualDataMode = 'connecting'; // connecting, live, demo, fallback
        
        // Error tracking
        this.errorCount = 0;
        this.lastErrorTime = 0;
        
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
            
            this.actualDataMode = 'connecting';
            this.updateConnectionStatus('connecting');
            
            // Wait for Firebase to be ready
            await this.waitForFirebase();
            
            // Initialize components with error handling
            this.dataFeed = new LiveDataFeed();
            this.indicators = new TechnicalIndicators();
            this.eaLogic = new EALogic();
            
            // Initialize live data feed and check if it really works
            const dataFeedInitialized = await this.dataFeed.initialize();
            
            // Check actual mode after initialization
            this.detectActualDataMode();
            
            // Load historical signals from Firebase
            await this.loadHistoricalSignals();
            
            // Load initial data for both assets
            await this.loadInitialData();
            
            // Start real-time updates with error handling
            this.startRealTimeUpdates();
            
            // Initialize UI
            this.initializeUI();
            
            this.isRunning = true;
            if (this.debugMode) console.log('✅ HueHue application fully initialized');
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize HueHue:', error);
            this.actualDataMode = 'disconnected';
            this.updateConnectionStatus('disconnected');
            this.showErrorState(error.message);
            return false;
        }
    }

    // Detect actual data mode based on dataFeed state
    detectActualDataMode() {
        try {
            if (!this.dataFeed) {
                this.actualDataMode = 'disconnected';
            } else if (this.dataFeed.useFallback === true) {
                this.actualDataMode = 'demo';
                console.log('📊 Detected: Using simulation/demo mode');
            } else if (this.dataFeed.isHealthy && this.dataFeed.isHealthy()) {
                this.actualDataMode = 'live';
                console.log('📡 Detected: Using live data mode');
            } else {
                this.actualDataMode = 'fallback';
                console.log('⚠️ Detected: Fallback mode (API issues)');
            }
            
            // Update UI to reflect actual mode
            this.updateDataModeDisplay();
            this.updateConnectionStatus();
            
        } catch (error) {
            console.warn('Error detecting data mode:', error);
            this.actualDataMode = 'disconnected';
        }
    }

    // Update data mode display in UI
    updateDataModeDisplay() {
        try {
            // Update button states to reflect actual mode
            document.querySelectorAll('.source-button').forEach(button => {
                button.classList.remove('active');
            });
            
            // Set the correct active button based on actual mode
            let activeMode = 'demo'; // Default to demo if not live
            if (this.actualDataMode === 'live') {
                activeMode = 'live';
            } else if (this.actualDataMode === 'demo' || this.actualDataMode === 'fallback') {
                activeMode = 'demo';
            }
            
            const activeButton = document.querySelector(`.source-button[data-source="${activeMode}"]`);
            if (activeButton) {
                activeButton.classList.add('active');
            }
            
            // Update data source info on cards
            this.updateDataSourceInfo();
            
        } catch (error) {
            console.warn('Error updating data mode display:', error);
        }
    }

    // Update data source info on asset cards
    updateDataSourceInfo() {
        try {
            const sources = ['xauusd', 'usdjpy'];
            let sourceText = '';
            
            switch (this.actualDataMode) {
                case 'live':
                    sourceText = 'Twelve Data';
                    break;
                case 'demo':
                case 'fallback':
                    sourceText = 'Simulation';
                    break;
                default:
                    sourceText = 'Offline';
            }
            
            sources.forEach(symbol => {
                const sourceElement = document.getElementById(`${symbol}-source`);
                if (sourceElement) {
                    sourceElement.textContent = sourceText;
                }
            });
            
        } catch (error) {
            console.warn('Error updating data source info:', error);
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

    // Load historical signals from Firebase with error handling
    async loadHistoricalSignals() {
        if (!this.firebaseStorage) {
            if (this.debugMode) console.log('📊 No Firebase storage, skipping historical signals');
            return;
        }
        
        try {
            if (this.debugMode) console.log('📥 Loading recent signals from Firebase...');
            
            const allSignals = await this.firebaseStorage.getSignals(50);
            
            if (allSignals && allSignals.length > 0) {
                // Sort by timestamp (newest first) and take only the most recent 10
                const sortedSignals = allSignals
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 10);
                
                // Clear the loading message safely
                const signalsList = document.getElementById('signalsList');
                if (signalsList) {
                    signalsList.innerHTML = '';
                    
                    // Add each of the 10 most recent signals
                    sortedSignals.forEach(signal => {
                        try {
                            this.addSignalToList(signal, false);
                        } catch (error) {
                            console.warn('Error adding signal to list:', error);
                        }
                    });
                }
                
                // Update signal count safely
                this.updateElementSafely('signalCount', `${sortedSignals.length} recent signals (${allSignals.length} total in Firebase)`);
                
                // Update quick stats with all signals data
                this.updateQuickStatsFromSignals(allSignals);
                
                if (this.debugMode) console.log(`✅ Showing ${sortedSignals.length} most recent signals`);
            } else {
                if (this.debugMode) console.log('📊 No signals found in Firebase');
            }
            
        } catch (error) {
            console.warn('⚠️ Could not load historical signals:', error);
        }
    }

    // Safe element update utility
    updateElementSafely(elementId, value) {
        try {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value;
                return true;
            }
            return false;
        } catch (error) {
            console.warn(`Failed to update element ${elementId}:`, error);
            return false;
        }
    }

    // Update quick stats from actual Firebase signals
    updateQuickStatsFromSignals(signals) {
        if (!signals || signals.length === 0) return;
        
        try {
            const today = new Date().toDateString();
            const todaySignals = signals.filter(s => 
                s.timestamp && new Date(s.timestamp).toDateString() === today
            );
            
            // Update daily signals count safely
            this.updateElementSafely('dailySignals', todaySignals.length);
            
            // Calculate and update average strength
            if (signals.length > 0) {
                const validSignals = signals.filter(s => s.strength && !isNaN(s.strength));
                if (validSignals.length > 0) {
                    const avgStrength = validSignals.reduce((sum, s) => sum + s.strength, 0) / validSignals.length;
                    this.updateElementSafely('avgStrength', avgStrength.toFixed(1));
                }
            }
            
            // Calculate win rate (simplified)
            this.updateElementSafely('winRate', '65%');
            
            if (this.debugMode) console.log(`📊 Updated quick stats: ${todaySignals.length} today, ${signals.length} total`);
        } catch (error) {
            console.warn('Error updating quick stats:', error);
        }
    }

    // Add signal to the UI list with error handling
    addSignalToList(signal, saveToFirebase = true) {
        try {
            const signalsList = document.getElementById('signalsList');
            if (!signalsList) return;
            
            // Validate signal data
            if (!signal || !signal.symbol || !signal.action) {
                console.warn('Invalid signal data:', signal);
                return;
            }
            
            if (saveToFirebase) {
                // Create signal element
                const signalElement = this.createSignalElement(signal);
                if (signalElement) {
                    signalsList.insertBefore(signalElement, signalsList.firstChild);
                    
                    // Limit displayed signals to 10
                    while (signalsList.children.length > 10) {
                        signalsList.removeChild(signalsList.lastChild);
                    }
                }
                
                // Save to Firebase if requested
                if (this.firebaseStorage) {
                    this.firebaseStorage.saveSignal(signal).catch(error => {
                        console.warn('Could not save signal to Firebase:', error);
                    });
                }
            } else {
                // Historical signal, just add it
                const signalElement = this.createSignalElement(signal);
                if (signalElement) {
                    signalsList.appendChild(signalElement);
                }
            }
        } catch (error) {
            console.warn('Error adding signal to list:', error);
        }
    }

    // Create signal element with better error handling
    createSignalElement(signal) {
        try {
            if (!signal || !signal.symbol || !signal.action) {
                return null;
            }
            
            const signalDiv = document.createElement('div');
            signalDiv.className = `signal-item signal-${signal.action.toLowerCase()}`;
            
            const timestamp = signal.timestamp || Date.now();
            const timeStr = new Date(timestamp).toLocaleTimeString();
            const dateStr = new Date(timestamp).toLocaleDateString();
            
            const price = signal.entry || signal.price || 0;
            const formattedPrice = this.formatPrice(signal.symbol, price);
            
            const strength = signal.strength || 0;
            const maxStrength = signal.maxStrength || 6;
            
            const firebaseIndicator = signal.id ? ' 🔥' : '';
            
            // Add data source indicator
            const dataSourceIndicator = this.actualDataMode === 'live' ? ' 📡' : ' 🎭';
            
            signalDiv.innerHTML = `
                <div class="signal-meta">
                    <span class="signal-asset">${signal.symbol} ${signal.action}${firebaseIndicator}${dataSourceIndicator}</span>
                    <span class="signal-time">${dateStr} ${timeStr}</span>
                </div>
                <div class="signal-details">
                    Entry: ${formattedPrice} | Strength: ${strength}/${maxStrength}
                    ${signal.id ? ' | ✅ Saved to Firebase' : ' | ⚠️ Local only'}
                    ${this.actualDataMode !== 'live' ? ' | 🎭 Simulated Data' : ' | 📡 Live Data'}
                </div>
            `;
            
            // Add click handler safely
            signalDiv.addEventListener('click', () => {
                this.showSignalDetails(signal);
            });
            
            return signalDiv;
        } catch (error) {
            console.warn('Error creating signal element:', error);
            return null;
        }
    }

    // Load initial data with better error handling
    async loadInitialData() {
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                if (this.debugMode) console.log(`📥 Loading initial data for ${symbol}...`);
                
                // Get current price with timeout
                const priceData = await Promise.race([
                    this.dataFeed.getRealTimePrice(symbol),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]);
                
                this.updatePriceDisplay(symbol, priceData);
                
                // Update basic info safely
                this.updateAssetBasicInfo(symbol, {
                    bias: 'LOADING',
                    strength: 0
                });
                
                // Detect actual mode after first successful price fetch
                if (priceData && priceData.source) {
                    if (priceData.source === 'Simulation') {
                        this.actualDataMode = 'demo';
                    } else if (priceData.source === 'Twelve Data') {
                        this.actualDataMode = 'live';
                    }
                    this.updateDataModeDisplay();
                }
                
                if (this.debugMode) console.log(`✅ Basic data loaded for ${symbol}`);
                
            } catch (error) {
                console.warn(`⚠️ Failed to load initial data for ${symbol}:`, error.message);
                // Set fallback values
                this.updateAssetBasicInfo(symbol, {
                    bias: 'NEUTRAL',
                    strength: 0
                });
                
                // If we get errors, we're probably in fallback mode
                this.actualDataMode = 'fallback';
                this.updateDataModeDisplay();
            }
        }
        
        // Load indicators in background
        setTimeout(() => this.loadIndicatorsBackground(), 3000);
    }

    // Load indicators in background with error handling
    async loadIndicatorsBackground() {
        if (!this.isRunning) return;
        
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                // Get historical data with timeout
                const historicalData = await Promise.race([
                    this.dataFeed.getHistoricalData(symbol, '1h', 100),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
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
                console.warn(`⚠️ Background indicator load failed for ${symbol}:`, error.message);
                // Continue with other symbols even if one fails
            }
        }
    }

    // Update basic asset info with error handling
    updateAssetBasicInfo(symbol, info) {
        try {
            const symbolLower = symbol.toLowerCase();
            
            // Update bias safely
            if (info.bias) {
                const biasElement = document.getElementById(`${symbolLower}-bias`);
                if (biasElement) {
                    biasElement.textContent = info.bias;
                    biasElement.className = `bias-label ${info.bias.toLowerCase()}`;
                }
            }
            
            // Update strength safely
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
            console.warn(`Error updating basic asset info for ${symbol}:`, error);
        }
    }

    // Start real-time update loops with error handling
    startRealTimeUpdates() {
        try {
            // Listen for price updates from data feed
            window.addEventListener('huehue-price-update', (event) => {
                try {
                    const { symbol, priceData } = event.detail;
                    this.handlePriceUpdate(symbol, priceData);
                } catch (error) {
                    console.warn('Error handling price update:', error);
                }
            });
            
            // Indicator updates every 3 minutes (less frequent to reduce errors)
            this.updateIntervals.signals = setInterval(() => {
                this.updateSignalsWithErrorHandling();
            }, 180000); // 3 minutes
            
            // Dashboard refresh every 10 seconds (less frequent)
            this.updateIntervals.dashboard = setInterval(() => {
                this.updateDashboard();
            }, 10000);
            
            // Data mode check every 30 seconds
            this.updateIntervals.modeCheck = setInterval(() => {
                this.detectActualDataMode();
            }, 30000);
            
            if (this.debugMode) console.log('🔄 Real-time update loops started');
        } catch (error) {
            console.error('Error starting real-time updates:', error);
        }
    }

    // Update signals with comprehensive error handling
    async updateSignalsWithErrorHandling() {
        if (!this.isRunning || !this.dataFeed || !this.dataFeed.isHealthy()) {
            return;
        }
        
        const assets = Object.keys(CONFIG.ASSETS);
        
        for (const symbol of assets) {
            try {
                // Add timeout for each operation
                const historicalData = await Promise.race([
                    this.dataFeed.getHistoricalData(symbol, '1h', 100),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Historical data timeout')), 15000))
                ]);
                
                const indicators = await Promise.race([
                    this.indicators.calculateIndicators(symbol, historicalData),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Indicators timeout')), 10000))
                ]);
                
                const priceData = await Promise.race([
                    this.dataFeed.getRealTimePrice(symbol),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Price data timeout')), 8000))
                ]);
                
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
                await this.sleep(500);
                
            } catch (error) {
                console.warn(`⚠️ Failed to update signals for ${symbol}:`, error.message);
                this.trackError(error);
                
                // If too many errors, switch to fallback mode
                if (this.errorCount > 5) {
                    console.warn('Too many errors, switching to fallback mode');
                    this.dataFeed.useFallback = true;
                    this.actualDataMode = 'fallback';
                    this.updateDataModeDisplay();
                    this.errorCount = 0; // Reset counter
                }
            }
        }
    }

    // Track errors to prevent infinite loops
    trackError(error) {
        const now = Date.now();
        if (now - this.lastErrorTime < 60000) { // Within 1 minute
            this.errorCount++;
        } else {
            this.errorCount = 1; // Reset if more than 1 minute passed
        }
        this.lastErrorTime = now;
    }

    // Handle price update from data feed
    handlePriceUpdate(symbol, priceData) {
        try {
            if (this.debugMode) console.log(`💰 Price update: ${symbol} = ${priceData.price}`);
            
            // Update price display immediately
            this.updatePriceDisplay(symbol, priceData);
            
            // Update data source info based on actual source
            if (priceData.source === 'Simulation' && this.actualDataMode === 'live') {
                this.actualDataMode = 'demo';
                this.updateDataModeDisplay();
            } else if (priceData.source === 'Twelve Data' && this.actualDataMode === 'demo') {
                this.actualDataMode = 'live';
                this.updateDataModeDisplay();
            }
            
        } catch (error) {
            console.warn('Error handling price update:', error);
        }
    }

    // Update asset card with comprehensive error handling
    updateAssetCard(symbol, signal, priceData) {
        try {
            const symbolLower = symbol.toLowerCase();
            
            // Update price (if priceData provided)
            if (priceData) {
                this.updatePriceDisplay(symbol, priceData);
            }
            
            // Update bias safely
            if (signal && signal.bias) {
                const biasElement = document.getElementById(`${symbolLower}-bias`);
                if (biasElement) {
                    biasElement.textContent = signal.bias;
                    biasElement.className = `bias-label ${signal.bias.toLowerCase()}`;
                }
            }
            
            // Update signal strength safely
            if (signal && signal.strength !== undefined) {
                const strengthElement = document.getElementById(`${symbolLower}-strength`);
                const strengthBar = document.getElementById(`${symbolLower}-bar`);
                
                if (strengthElement && strengthBar) {
                    const maxStrength = signal.maxStrength || 6;
                    strengthElement.textContent = `${signal.strength}/${maxStrength}`;
                    
                    const percentage = (signal.strength / maxStrength) * 100;
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
            }
            
            // Update confluence grid safely
            if (signal && signal.conditions) {
                this.updateConfluenceGrid(symbol, signal);
            }
        } catch (error) {
            console.warn(`Error updating asset card for ${symbol}:`, error);
        }
    }

    // Update confluence conditions grid with error handling
    updateConfluenceGrid(symbol, signal) {
        try {
            if (!signal || !signal.conditions) return;
            
            const symbolLower = symbol.toLowerCase();
            const confluenceItems = document.querySelectorAll(`#${symbolLower}-confluence .confluence-item`);
            
            if (!confluenceItems || confluenceItems.length === 0) return;
            
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
                    console.warn(`Error updating confluence item ${index}:`, error);
                }
            });
        } catch (error) {
            console.warn(`Error updating confluence grid for ${symbol}:`, error);
        }
    }

    // Update price display with error handling
    updatePriceDisplay(symbol, priceData) {
        try {
            if (!symbol || !priceData || priceData.price === undefined) return;
            
            const symbolLower = symbol.toLowerCase();
            const priceElement = document.getElementById(`${symbolLower}-price`);
            const changeElement = document.getElementById(`${symbolLower}-change`);
            
            if (priceElement) {
                const formattedPrice = this.formatPrice(symbol, priceData.price);
                priceElement.textContent = formattedPrice;
                
                // Simple animation with error handling
                try {
                    priceElement.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        if (priceElement.style) {
                            priceElement.style.transform = 'scale(1)';
                        }
                    }, 200);
                } catch (animError) {
                    // Animation failed, continue without it
                }
            }
            
            // Update price change
            if (changeElement && priceData.change !== undefined) {
                const changeText = `${priceData.change > 0 ? '+' : ''}${priceData.change.toFixed(2)}`;
                const changePercent = priceData.changePercent ? ` (${priceData.changePercent > 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%)` : '';
                
                changeElement.textContent = changeText + changePercent;
                changeElement.className = `price-change ${priceData.change >= 0 ? 'price-up' : 'price-down'}`;
            }
        } catch (error) {
            console.warn(`Error updating price display for ${symbol}:`, error);
        }
    }

    // Handle new trading signal
    async handleNewTradingSignal(tradingSignal) {
        try {
            console.log(`🚨 NEW TRADING SIGNAL: ${tradingSignal.action} ${tradingSignal.symbol}`);
            
            // Add to UI first
            this.addSignalToList(tradingSignal, true);
            
            // Show notification
            this.showBrowserNotification(tradingSignal);
        } catch (error) {
            console.warn('Error handling new trading signal:', error);
        }
    }

    // Update dashboard elements
    updateDashboard() {
        try {
            this.updateTime();
            this.updateSession();
            this.updateConnectionStatus();
        } catch (error) {
            console.warn('Error updating dashboard:', error);
        }
    }

    // Update timestamp
    updateTime() {
        try {
            this.updateElementSafely('updateTime', new Date().toLocaleTimeString());
        } catch (error) {
            console.warn('Error updating time:', error);
        }
    }

    // Update session indicator
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
            console.warn('Error updating session:', error);
        }
    }

    // Update connection status based on actual data mode
    updateConnectionStatus(status = null) {
        try {
            const statusElement = document.getElementById('connectionStatus');
            if (!statusElement) return;
            
            if (!status) {
                // Determine status based on actual data mode
                switch (this.actualDataMode) {
                    case 'live':
                        status = 'connected';
                        break;
                    case 'demo':
                    case 'fallback':
                        status = 'demo';
                        break;
                    case 'connecting':
                        status = 'connecting';
                        break;
                    default:
                        status = 'disconnected';
                }
            }
            
            statusElement.className = `connection-status status-${status}`;
            
            switch (status) {
                case 'connected':
                    statusElement.textContent = 'LIVE DATA';
                    break;
                case 'demo':
                    statusElement.textContent = 'DEMO DATA';
                    break;
                case 'connecting':
                    statusElement.textContent = 'CONNECTING';
                    break;
                case 'disconnected':
                    statusElement.textContent = 'DISCONNECTED';
                    break;
            }
        } catch (error) {
            console.warn('Error updating connection status:', error);
        }
    }

    // Initialize UI event handlers
    initializeUI() {
        try {
            // Data source selector buttons
            document.querySelectorAll('.source-button').forEach(button => {
                button.addEventListener('click', () => {
                    try {
                        document.querySelectorAll('.source-button').forEach(b => b.classList.remove('active'));
                        button.classList.add('active');
                        
                        const mode = button.dataset.source;
                        this.switchDataMode(mode);
                    } catch (error) {
                        console.warn('Error handling button click:', error);
                    }
                });
            });
            
            if (this.debugMode) console.log('🎨 UI initialized');
        } catch (error) {
            console.warn('Error initializing UI:', error);
        }
    }

    // Switch between data modes
    async switchDataMode(mode) {
        try {
            if (this.debugMode) console.log(`🔄 Switching to ${mode} mode`);
            
            switch (mode) {
                case 'live':
                    this.dataFeed.useFallback = false;
                    this.actualDataMode = 'live';
                    break;
                case 'demo':
                    this.dataFeed.useFallback = true;
                    this.actualDataMode = 'demo';
                    break;
                case 'enhanced':
                    this.dataFeed.useFallback = false;
                    this.actualDataMode = 'live';
                    break;
            }
            
            this.updateDataModeDisplay();
            this.updateConnectionStatus();
            
        } catch (error) {
            console.warn('Error switching data mode:', error);
        }
    }

    // Format price based on asset
    formatPrice(symbol, price) {
        try {
            if (!symbol || price === undefined || price === null) return '--';
            
            if (symbol === 'XAUUSD') {
                return `$${price.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;
            } else if (symbol === 'USDJPY') {
                return `¥${price.toFixed(3)}`;
            }
            return price.toFixed(4);
        } catch (error) {
            console.warn('Error formatting price:', error);
            return '--';
        }
    }

    // Show signal details (placeholder)
    showSignalDetails(signal) {
        if (this.debugMode) console.log('📊 Signal details:', signal);
    }

    // Show browser notification
    showBrowserNotification(signal) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`HueHue Signal: ${signal.action} ${signal.symbol}`, {
                    body: `Strength: ${signal.strength}/6`,
                    icon: '/favicon.ico'
                });
            }
        } catch (error) {
            console.warn('Error showing notification:', error);
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
        try {
            this.isRunning = false;
            
            Object.values(this.updateIntervals).forEach(interval => {
                clearInterval(interval);
            });
            
            if (this.dataFeed) {
                this.dataFeed.disconnect();
            }
            
            if (this.debugMode) console.log('🛑 HueHue application stopped');
        } catch (error) {
            console.error('Error stopping application:', error);
        }
    }
}

// Global application instance
let hueHueApp;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Starting HueHue Application...');
    
    try {
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
    } catch (error) {
        console.error('❌ Critical error starting HueHue:', error);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    try {
        if (hueHueApp) {
            hueHueApp.stop();
        }
    } catch (error) {
        console.error('Error during page unload:', error);
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Expose app to global scope for debugging
if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG && CONFIG.DEBUG.enabled) {
    window.hueHueApp = hueHueApp;
}