// app.js - Enhanced HueHue Application with SMOOTH LIVE TRADING DASHBOARD
class TripleEngineHueHueApp {
    constructor() {
        if (typeof CONFIG === 'undefined') {
            console.error('❌ CONFIG not available - check script loading order');
            return;
        }
        
        // Core components
        this.firebaseStorage = null;
        this.vpsStatusInterval = null;
        
        // Application state
        this.isRunning = false;
        this.updateIntervals = {
            dashboard: null,
            liveTrades: null
        };
        this.unsubscribers = []; // Store Firebase listeners
        
        // TRIPLE ENGINE STATE
        this.currentEngine = 'v1'; // Default to v1 (Smart)
        this.engineListeners = {
            v1: { analysis: [], signals: [], trades: [] },
            v2: { analysis: [], signals: [], trades: [] },
            v3: { analysis: [], signals: [], trades: [] }
        };
        
        // ✅ ENHANCED: Live Trading State
        this.activeTrades = {
            v1: [],
            v2: [],
            v3: []
        };
        
        // Performance stats for all three engines
        this.performanceStats = {
            v1: { trades: 0, totalPips: 0, winRate: 0, activeTrades: 0 },
            v2: { trades: 0, totalPips: 0, winRate: 0, activeTrades: 0 },
            v3: { trades: 0, totalPips: 0, winRate: 0, activeTrades: 0 }
        };
        
        // Engine descriptions
        this.engineDescriptions = {
            v1: 'Smart Analysis - Proven technical indicators',
            v2: 'AI Enhanced - Advanced intelligence + session awareness',
            v3: 'Simple & Effective - Fast signals + lower thresholds'
        };
        
        CONFIG.log('info', '🤖 Triple-Engine Live Trading Dashboard initialized (v1 Smart + v2 AI + v3 Simple)');
    }

    async initialize() {
        try {
            CONFIG.log('info', '🚀 Starting Triple-Engine Live Trading Dashboard...');
            
            // Initialize UI first
            this.updateConnectionStatus('connecting');
            this.hideErrorMessage();
            
            // Wait for Firebase
            await this.waitForFirebase();
            
            // Setup triple-engine toggle
            this.setupEngineToggle();
            
            // Setup real-time listeners for current engine
            await this.setupTripleEngineListeners();
            
            // ✅ Setup live trades listeners
            await this.setupLiveTradesListeners();
            
            // Setup VPS status monitoring
            await this.setupVpsStatusMonitoring();
            
            // Load initial data for current engine
            await this.loadInitialData();
            
            // ✅ Load initial live trades
            await this.loadInitialTrades();
            
            // Start update loops
            this.startUpdateLoops();
            
            // Initialize UI
            this.initializeUI();
            
            this.isRunning = true;
            this.updateConnectionStatus('connected');
            CONFIG.log('info', '✅ Triple-Engine Live Trading Dashboard ready!');
            CONFIG.log('info', `🎯 Current Engine: ${this.currentEngine} (${this.getEngineDisplayName(this.currentEngine)})`);
            
            return true;
            
        } catch (error) {
            CONFIG.log('error', '❌ Failed to initialize triple-engine app:', error);
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
            CONFIG.log('info', '🔥 Firebase connected to Live Trading Dashboard');
        } else {
            throw new Error('Firebase not available');
        }
    }

    // SETUP TRIPLE ENGINE TOGGLE FUNCTIONALITY
    setupEngineToggle() {
        const engineV1 = document.getElementById('engineV1');
        const engineV2 = document.getElementById('engineV2');
        const engineV3 = document.getElementById('engineV3');
        
        if (!engineV1 || !engineV2 || !engineV3) {
            CONFIG.log('warn', 'Engine toggle elements not found');
            return;
        }
        
        // Add event listeners for triple toggle
        engineV1.addEventListener('change', () => {
            if (engineV1.checked) {
                this.switchEngine('v1');
            }
        });
        
        engineV2.addEventListener('change', () => {
            if (engineV2.checked) {
                this.switchEngine('v2');
            }
        });
        
        engineV3.addEventListener('change', () => {
            if (engineV3.checked) {
                this.switchEngine('v3');
            }
        });
        
        CONFIG.log('info', '🔄 Triple engine toggle setup complete');
    }

    // SWITCH BETWEEN v1, v2, AND v3 ENGINES
    async switchEngine(newEngine) {
        if (this.currentEngine === newEngine) return;
        
        CONFIG.log('info', `🔄 Switching from ${this.currentEngine} to ${newEngine}...`);
        
        const oldEngine = this.currentEngine;
        this.currentEngine = newEngine;
        console.log(`🔍 DEBUG: Engine switched! Old: ${oldEngine}, New: ${this.currentEngine}`);
        
        try {
            // Update UI status
            this.updateEngineStatus(newEngine);
            
            // Force clear old data
            this.clearAnalysisDisplay();
            
            // Cleanup old listeners
            this.cleanupEngineListeners(oldEngine);
            
            // Setup new listeners
            await this.setupCurrentEngineListeners();
            
            // ✅ Switch live trades view
            await this.switchLiveTradesEngine(newEngine);
            
            // Reload data for new engine
            await this.loadInitialData();
            await this.loadInitialTrades();
            
            // Update performance stats
            this.updatePerformanceDisplay();
            
            // Update score labels for v3
            this.updateScoreLabels(newEngine);
            
            CONFIG.log('info', `✅ Successfully switched to ${newEngine} (${this.getEngineDisplayName(newEngine)})`);
            
        } catch (error) {
            CONFIG.log('error', `❌ Error switching to ${newEngine}:`, error);
            
            // Rollback on error
            this.currentEngine = oldEngine;
            this.updateEngineStatus(oldEngine);
        }
    }

    // ✅ Setup Live Trades Listeners
    async setupLiveTradesListeners() {
        if (!this.firebaseStorage) return;
        
        CONFIG.log('info', '📊 Setting up live trades listeners for all engines...');
        
        const engines = ['v1', 'v2', 'v3'];
        
        for (const engine of engines) {
            try {
                const tradesRef = this.firebaseStorage.collection(this.firebaseStorage.db, `active_trades_${engine}`);
                const tradesQuery = this.firebaseStorage.query(
                    tradesRef,
                    this.firebaseStorage.orderBy('openTime', 'desc')
                );
                
                const unsubscribe = this.firebaseStorage.onSnapshot(tradesQuery, (snapshot) => {
                    const trades = [];
                    snapshot.forEach((doc) => {
                        trades.push({ id: doc.id, ...doc.data() });
                    });
                    
                    this.activeTrades[engine] = trades;

                    console.log(`🔍 Firebase listener: ${engine} has ${trades.length} trades, current engine: ${this.currentEngine}`);
                    
                    // Update display if this is the current engine
                    if (engine === this.currentEngine) {
                        this.updateLiveTradesDisplay(trades);
                    }
                    
                    // Update performance stats
                    this.updateTradePerformanceStats(engine, trades);
                    
                    CONFIG.log('debug', `📊 ${engine} live trades updated: ${trades.length} active`);
                });
                
                this.engineListeners[engine].trades.push({ unsubscribe });
                
            } catch (error) {
                CONFIG.log('error', `Error setting up ${engine} trades listener:`, error);
            }
        }
        
        CONFIG.log('info', '✅ Live trades listeners ready for all engines');
    }

    // ✅ Switch Live Trades Engine View
    async switchLiveTradesEngine(engine) {
        CONFIG.log('info', `🔄 Switching live trades view to ${engine}`);
        
        const trades = this.activeTrades[engine] || [];
        this.updateLiveTradesDisplay(trades);
        
        // Update trades version indicator
        const tradesVersion = document.getElementById('tradesVersion');
        if (tradesVersion) {
            tradesVersion.textContent = `(${engine})`;
        }
    }

    updateLiveTradesDisplay(trades) {
    console.log(`🔍 DEBUG: updateLiveTradesDisplay called with ${trades.length} trades for ${this.currentEngine}:`, trades);
    
    const liveTradesList = document.getElementById('liveTradesList');
    const activeTradesCount = document.getElementById('activeTradesCount');
    
    if (!liveTradesList) return;
    
    // Update active trades count smoothly
    if (activeTradesCount) {
        const newCount = `${trades.length} active`;
        if (activeTradesCount.textContent !== newCount) {
            activeTradesCount.style.transform = 'scale(1.1)';
            activeTradesCount.textContent = newCount;
            setTimeout(() => {
                activeTradesCount.style.transform = 'scale(1)';
            }, 200);
        }
    }
    
    if (trades.length === 0) {  // ❌ THIS IS THE PROBLEM LINE
        // Only update if content is different
        const expectedNoTradesContent = `🤖 ${this.getEngineDisplayName(this.currentEngine)} Active`;
        if (!liveTradesList.querySelector('.no-active-trades') || 
            !liveTradesList.textContent.includes(expectedNoTradesContent)) {
            liveTradesList.innerHTML = `
                <div class="no-active-trades">
                    <h3>🤖 ${this.getEngineDisplayName(this.currentEngine)} Active</h3>
                    <p>No active trades currently. The system is monitoring market conditions and will open trades when high-quality opportunities are found.</p>
                </div>
            `;
        }
        return;
    }
    
    // ✅ THE ISSUE: This part never runs because trades.length is being checked incorrectly
        
        // Sort trades by openTime (newest first)
        const sortedTrades = [...trades].sort((a, b) => {
            const timeA = a.openTime || a.timestamp || Date.now();
            const timeB = b.openTime || b.timestamp || Date.now();
            return timeB - timeA;
        });
        
        // ✅ SMOOTH UPDATE: Only update what changed
        this.updateTradesSmoothly(liveTradesList, sortedTrades);
    }

    // ✅ SMOOTH: Update trades without rebuilding everything
    updateTradesSmoothly(container, newTrades) {

        if (newTrades.length > 0) {
        const noTradesDiv = container.querySelector('.no-active-trades');
        if (noTradesDiv) {
            noTradesDiv.remove();
            console.log('🗑️ Removed no-active-trades div');
        }
    }
        // Get existing trade elements
        const existingElements = container.querySelectorAll('.live-trade-item[data-trade-id]');
        const existingTradeIds = new Set();
        
        existingElements.forEach(el => {
            existingTradeIds.add(el.getAttribute('data-trade-id'));
        });
        
        // Get new trade IDs
        const newTradeIds = new Set(newTrades.map(trade => trade.id));
        
        // Remove trades that no longer exist
        existingElements.forEach(el => {
            const tradeId = el.getAttribute('data-trade-id');
            if (!newTradeIds.has(tradeId)) {
                el.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                el.style.opacity = '0';
                el.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                }, 300);
            }
        });
        
        // Update or add trades
        newTrades.forEach((trade, index) => {
            const existingElement = container.querySelector(`[data-trade-id="${trade.id}"]`);
            
            if (existingElement) {
                // ✅ UPDATE EXISTING: Only update the parts that changed
                this.updateExistingTradeElement(existingElement, trade);
            } else {
                // ✅ ADD NEW: Create new trade element with animation
                const newElement = this.createTradeElementWithId(trade);
                newElement.style.opacity = '0';
                newElement.style.transform = 'translateX(20px)';
                
                // Insert in correct position
                const nextElement = container.children[index];
                if (nextElement) {
                    container.insertBefore(newElement, nextElement);
                } else {
                    container.appendChild(newElement);
                }
                
                // Animate in
                setTimeout(() => {
                    newElement.style.transition = 'opacity 0.3s ease-in, transform 0.3s ease-in';
                    newElement.style.opacity = '1';
                    newElement.style.transform = 'translateX(0)';
                }, 50);
            }
        });
    }

    // ✅ SMOOTH: Create trade element with unique ID
    createTradeElementWithId(trade) {
        const element = document.createElement('div');
        element.className = 'live-trade-item';
        element.setAttribute('data-trade-id', trade.id);
        
        // Calculate values
        const currentPrice = trade.currentPrice || trade.entry;
        const pnl = this.calculateTradePnL(trade, currentPrice);
        const progress = this.calculateTradeProgress(trade, currentPrice);
        const duration = this.formatTradeDuration(Date.now() - trade.openTime);
        
        const pnlClass = pnl.pips > 0 ? 'profit' : pnl.pips < 0 ? 'loss' : 'neutral';
        const pnlSign = pnl.pips > 0 ? '+' : '';
        
        element.className = `live-trade-item ${pnlClass}`;
        element.innerHTML = `
            <div class="trade-header">
                <div class="trade-symbol-direction">
                    <span class="trade-symbol">${trade.symbol}</span>
                    <span class="trade-direction ${trade.direction.toLowerCase()}">${trade.direction}</span>
                </div>
                <div class="trade-pnl ${pnlClass}">
                    ${pnlSign}${pnl.pips.toFixed(1)} pips
                </div>
            </div>
            
            <div class="trade-details">
                Entry: ${this.formatPrice(trade.symbol, trade.entry)} → Current: ${this.formatPrice(trade.symbol, currentPrice)}
                <br>SL: ${this.formatPrice(trade.symbol, trade.stopLoss)} | TP: ${this.formatPrice(trade.symbol, trade.takeProfit)} | ${duration}
            </div>
            
            <div class="trade-progress">
                <div class="trade-progress-bar ${pnlClass}" style="width: ${progress}%"></div>
            </div>
        `;
        
        return element;
    }

    // ✅ SMOOTH: Update only the content that changed in existing element
    updateExistingTradeElement(element, trade) {
        // Calculate current values
        const currentPrice = trade.currentPrice || trade.entry;
        const pnl = this.calculateTradePnL(trade, currentPrice);
        const progress = this.calculateTradeProgress(trade, currentPrice);
        const duration = this.formatTradeDuration(Date.now() - trade.openTime);
        
        // Update P&L if it changed
        const pnlElement = element.querySelector('.trade-pnl');
        if (pnlElement) {
            const newPnlText = `${pnl.pips > 0 ? '+' : ''}${pnl.pips.toFixed(1)} pips`;
            const newPnlClass = pnl.pips > 0 ? 'profit' : pnl.pips < 0 ? 'loss' : 'neutral';
            
            if (pnlElement.textContent !== newPnlText) {
                // ✅ SMOOTH P&L UPDATE with flash animation
                pnlElement.style.transition = 'all 0.2s ease-in-out';
                pnlElement.style.transform = 'scale(1.1)';
                pnlElement.textContent = newPnlText;
                pnlElement.className = `trade-pnl ${newPnlClass}`;
                
                // Update trade item class
                element.className = `live-trade-item ${newPnlClass}`;
                
                setTimeout(() => {
                    pnlElement.style.transform = 'scale(1)';
                }, 200);
            }
        }
        
        // Update current price in details
        const detailsElement = element.querySelector('.trade-details');
        if (detailsElement) {
            const newDetailsText = `Entry: ${this.formatPrice(trade.symbol, trade.entry)} → Current: ${this.formatPrice(trade.symbol, currentPrice)}<br>SL: ${this.formatPrice(trade.symbol, trade.stopLoss)} | TP: ${this.formatPrice(trade.symbol, trade.takeProfit)} | ${duration}`;
            
            if (detailsElement.innerHTML !== newDetailsText) {
                detailsElement.innerHTML = newDetailsText;
            }
        }
        
        // Update progress bar smoothly
        const progressBar = element.querySelector('.trade-progress-bar');
        if (progressBar) {
            const newWidth = `${progress}%`;
            if (progressBar.style.width !== newWidth) {
                progressBar.style.transition = 'width 0.5s ease-in-out';
                progressBar.style.width = newWidth;
                
                // Update color
                const newPnlClass = pnl.pips > 0 ? 'profit' : pnl.pips < 0 ? 'loss' : 'neutral';
                progressBar.className = `trade-progress-bar ${newPnlClass}`;
            }
        }
    }

    // ✅ Create Live Trade Element (Fallback for initial creation)
    createLiveTradeElement(trade) {
        try {
            const currentPrice = trade.currentPrice || trade.entry;
            const pnl = this.calculateTradePnL(trade, currentPrice);
            const progress = this.calculateTradeProgress(trade, currentPrice);
            const duration = this.formatTradeDuration(Date.now() - trade.openTime);
            
            const pnlClass = pnl.pips > 0 ? 'profit' : pnl.pips < 0 ? 'loss' : 'neutral';
            const pnlSign = pnl.pips > 0 ? '+' : '';
            
            return `
                <div class="live-trade-item ${pnlClass}" data-trade-id="${trade.id}" onclick="this.showTradeDetails('${trade.id}')">
                    <div class="trade-header">
                        <div class="trade-symbol-direction">
                            <span class="trade-symbol">${trade.symbol}</span>
                            <span class="trade-direction ${trade.direction.toLowerCase()}">${trade.direction}</span>
                        </div>
                        <div class="trade-pnl ${pnlClass}">
                            ${pnlSign}${pnl.pips.toFixed(1)} pips
                        </div>
                    </div>
                    
                    <div class="trade-details">
                        Entry: ${this.formatPrice(trade.symbol, trade.entry)} → Current: ${this.formatPrice(trade.symbol, currentPrice)}
                        <br>SL: ${this.formatPrice(trade.symbol, trade.stopLoss)} | TP: ${this.formatPrice(trade.symbol, trade.takeProfit)} | ${duration}
                    </div>
                    
                    <div class="trade-progress">
                        <div class="trade-progress-bar ${pnlClass}" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        } catch (error) {
            CONFIG.log('error', 'Error creating live trade element:', error);
            return '';
        }
    }

    // ✅ Calculate Trade P&L
    calculateTradePnL(trade, currentPrice) {
        let pips = 0;
        const priceDiff = trade.direction === 'BUY' ? 
            currentPrice - trade.entry : 
            trade.entry - currentPrice;
        
        if (trade.symbol === 'XAUUSD') {
            pips = priceDiff * 10;
        } else if (trade.symbol === 'USDJPY') {
            pips = priceDiff * 100;
        } else if (trade.symbol === 'BTCUSD') {
            pips = priceDiff;
        }
        
        const percentage = (priceDiff / trade.entry) * 100;
        
        return { pips, percentage };
    }

    // ✅ Calculate Trade Progress to TP/SL
    calculateTradeProgress(trade, currentPrice) {
        const entry = trade.entry;
        const stopLoss = trade.stopLoss;
        const takeProfit = trade.takeProfit;
        
        if (!entry || !stopLoss || !takeProfit) return 50;
        
        const totalDistance = Math.abs(takeProfit - stopLoss);
        let currentDistance;
        
        if (trade.direction === 'BUY') {
            currentDistance = currentPrice - stopLoss;
        } else {
            currentDistance = stopLoss - currentPrice;
        }
        
        const progress = (currentDistance / totalDistance) * 100;
        return Math.max(0, Math.min(100, progress));
    }

    // ✅ Update Trade Performance Stats
    updateTradePerformanceStats(engine, trades) {
        this.performanceStats[engine].activeTrades = trades.length;
        
        // Calculate total P&L for active trades
        let totalPips = 0;
        trades.forEach(trade => {
            const currentPrice = trade.currentPrice || trade.entry;
            const pnl = this.calculateTradePnL(trade, currentPrice);
            totalPips += pnl.pips;
        });
        
        this.performanceStats[engine].totalPips = totalPips;
        
        // Update display if this is current engine
        if (engine === this.currentEngine) {
            this.updatePerformanceDisplay();
        }
    }

    // ✅ Load Initial Trades
    async loadInitialTrades() {
        if (!this.firebaseStorage) return;
        
        CONFIG.log('info', '📊 Loading initial live trades...');
        
        try {
            const engine = this.currentEngine;
            const tradesRef = this.firebaseStorage.collection(this.firebaseStorage.db, `active_trades_${engine}`);
            const querySnapshot = await this.firebaseStorage.getDocs(tradesRef);
            
            const trades = [];
            querySnapshot.forEach((doc) => {
                trades.push({ id: doc.id, ...doc.data() });
            });
            
            this.activeTrades[engine] = trades;
            this.updateLiveTradesDisplay(trades);
            this.updateTradePerformanceStats(engine, trades);
            
            CONFIG.log('info', `📊 Loaded ${trades.length} active trades for ${engine}`);
        } catch (error) {
            CONFIG.log('error', 'Error loading initial trades:', error);
        }
    }

    // SETUP TRIPLE-ENGINE LISTENERS
    async setupTripleEngineListeners() {
        if (!this.firebaseStorage) return;
        
        CONFIG.log('info', '📡 Setting up triple-engine real-time listeners...');
        
        // Setup listeners for current engine
        await this.setupCurrentEngineListeners();
        
        CONFIG.log('info', '✅ Triple-engine listeners ready');
    }

    // SETUP LISTENERS FOR CURRENT ENGINE
    async setupCurrentEngineListeners() {
        const engine = this.currentEngine;
        const analysisCollection = `analysis_${engine}`;
        
        CONFIG.log('info', `📡 Setting up ${engine} listeners (${analysisCollection})...`);
        
        // Listen for analysis updates for each asset
        ['XAUUSD', 'USDJPY', 'BTCUSD'].forEach(symbol => {
            const analysisRef = this.firebaseStorage.doc(this.firebaseStorage.db, analysisCollection, symbol);
            
            const analysisUnsub = this.firebaseStorage.onSnapshot(analysisRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    CONFIG.log('info', `📊 ${symbol} ${engine} analysis update: ${data.bias} (${data.confidence}%)`);
                    this.handleAnalysisUpdate(symbol, data, engine);
                }
            });
            
            this.engineListeners[engine].analysis.push({ symbol, unsubscribe: analysisUnsub });
        });
        
        // Listen for price updates (shared collection)
        ['XAUUSD', 'USDJPY', 'BTCUSD'].forEach(symbol => {
            const priceRef = this.firebaseStorage.doc(this.firebaseStorage.db, 'prices', symbol);
            
            const priceUnsub = this.firebaseStorage.onSnapshot(priceRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    CONFIG.log('debug', `💰 ${symbol} price update: ${data.price}`);
                    this.handlePriceUpdate(symbol, data);
                }
            });
            
            this.unsubscribers.push(priceUnsub);
        });
        
        CONFIG.log('info', `✅ ${engine} listeners setup complete`);
    }

    // Get engine display name
    getEngineDisplayName(engine) {
        const names = {
            v1: 'Smart Analysis',
            v2: 'AI Enhanced',
            v3: 'Simple & Effective'
        };
        return names[engine] || engine;
    }

    // Clear analysis display when switching engines
    clearAnalysisDisplay() {
        const assets = ['xauusd', 'usdjpy', 'btcusd'];
        
        assets.forEach(symbol => {
            this.updateBiasDisplay(symbol, 'ANALYZING');
            this.updateConfidenceDisplay(symbol, 0);
            this.updateActionDisplay(symbol, 'WAIT');
            
            // Clear all scores
            const scores = ['technical', 'structure', 'pattern', 'volume'];
            scores.forEach(scoreType => {
                const element = document.getElementById(`${symbol}-${scoreType}-score`);
                if (element) {
                    element.textContent = '--';
                    element.className = 'score-value';
                }
            });
        });
        
        CONFIG.log('info', '🧹 Analysis display cleared for engine switch');
    }

    // UPDATE ENGINE STATUS UI
    updateEngineStatus(engine) {
        const tradesVersion = document.getElementById('tradesVersion');
        const performanceVersion = document.getElementById('performanceVersion');
        
        if (tradesVersion) {
            tradesVersion.textContent = `(${engine})`;
            tradesVersion.className = `signals-version ${engine === 'v1' ? 'v1-active' : engine === 'v2' ? 'v2-active' : 'v3-active'}`;
        }
        
        if (performanceVersion) {
            performanceVersion.textContent = `(${engine})`;
            performanceVersion.className = `performance-version ${engine === 'v1' ? 'v1-active' : engine === 'v2' ? 'v2-active' : 'v3-active'}`;
        }
        
        // Update asset cards visual indicators
        this.updateAssetCardsEngine(engine);
    }

    // UPDATE ASSET CARDS FOR CURRENT ENGINE
    updateAssetCardsEngine(engine) {
        const assetCards = document.querySelectorAll('.asset-card');
        
        assetCards.forEach(card => {
            // Remove all engine classes
            card.classList.remove('ai-enhanced', 'simple-enhanced');
            
            // Add appropriate class
            if (engine === 'v2') {
                card.classList.add('ai-enhanced');
            } else if (engine === 'v3') {
                card.classList.add('simple-enhanced');
            }
        });
    }

    // UPDATE SCORE LABELS FOR v3
    updateScoreLabels(engine) {
        const assets = ['xauusd', 'usdjpy', 'btcusd'];
        
        assets.forEach(symbol => {
            if (engine === 'v3') {
                // v3 uses different score labels
                this.updateElementSafely(`${symbol}-score-label-1`, 'Technical');
                this.updateElementSafely(`${symbol}-score-label-2`, 'Momentum');
                this.updateElementSafely(`${symbol}-score-label-3`, 'Trend');
                this.updateElementSafely(`${symbol}-score-label-4`, 'Volatility');
            } else {
                // v1/v2 use standard labels
                this.updateElementSafely(`${symbol}-score-label-1`, 'Technical');
                this.updateElementSafely(`${symbol}-score-label-2`, 'Structure');
                this.updateElementSafely(`${symbol}-score-label-3`, 'Patterns');
                this.updateElementSafely(`${symbol}-score-label-4`, 'Volume');
            }
        });
    }

    // CLEANUP ENGINE LISTENERS
    cleanupEngineListeners(engine) {
        CONFIG.log('info', `🧹 Cleaning up ${engine} listeners...`);
        
        // Cleanup analysis listeners
        this.engineListeners[engine].analysis.forEach(listener => {
            if (listener.unsubscribe) {
                listener.unsubscribe();
            }
        });
        this.engineListeners[engine].analysis = [];
        
        // Cleanup trades listeners
        this.engineListeners[engine].trades.forEach(listener => {
            if (listener.unsubscribe) {
                listener.unsubscribe();
            }
        });
        this.engineListeners[engine].trades = [];
        
        CONFIG.log('info', `✅ ${engine} listeners cleaned up`);
    }

    // VPS STATUS MONITORING
    async setupVpsStatusMonitoring() {
        if (!this.firebaseStorage) return;
        
        CONFIG.log('info', '📡 Setting up VPS status monitoring...');
        
        try {
            const vpsRef = this.firebaseStorage.doc(this.firebaseStorage.db, 'system', 'generator');
            const vpsUnsub = this.firebaseStorage.onSnapshot(vpsRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    this.updateVpsStatus(data);
                } else {
                    this.updateVpsStatus(null);
                }
            });
            this.unsubscribers.push(vpsUnsub);
            
            this.vpsStatusInterval = setInterval(() => {
                this.checkVpsStatus();
            }, 30000);
            
            await this.checkVpsStatus();
            CONFIG.log('info', '✅ VPS status monitoring active');
            
        } catch (error) {
            CONFIG.log('error', 'Error setting up VPS monitoring:', error);
            this.updateVpsStatusElement('VPS Error', 'offline');
        }
    }

    async checkVpsStatus() {
        if (!this.firebaseStorage) return;
        
        try {
            const vpsRef = this.firebaseStorage.doc(this.firebaseStorage.db, 'system', 'generator');
            const docSnap = await this.firebaseStorage.getDoc(vpsRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                this.updateVpsStatus(data);
            } else {
                this.updateVpsStatus(null);
            }
        } catch (error) {
            CONFIG.log('error', 'Error checking VPS status:', error);
            this.updateVpsStatusElement('VPS Error', 'offline');
        }
    }

    updateVpsStatus(vpsData) {
        const now = Date.now();
        
        if (!vpsData) {
            this.updateVpsStatusElement('Offline', 'offline');
            return;
        }
        
        const lastHeartbeat = vpsData.lastHeartbeat;
        const timeSinceHeartbeat = now - lastHeartbeat;
        const offlineThreshold = 3 * 60 * 1000; // 3 minutes
        
        if (timeSinceHeartbeat > offlineThreshold) {
            this.updateVpsStatusElement('Offline', 'offline');
        } else {
            const status = vpsData.status || 'active';
            
            if (status === 'active') {
                this.updateVpsStatusElement('Live', 'online');
            } else {
                this.updateVpsStatusElement('Offline', 'offline');
            }
        }
    }

    updateVpsStatusElement(text, status) {
        const vpsElement = document.getElementById('vpsStatus');
        if (vpsElement) {
            vpsElement.textContent = text;
            vpsElement.className = `vps-status ${status}`;
        }
    }

    // HANDLE ANALYSIS UPDATES
    handleAnalysisUpdate(symbol, analysis, sourceEngine) {
        try {
            // Only process if this update is for the currently active engine
            if (sourceEngine !== this.currentEngine) {
                CONFIG.log('debug', `Ignoring ${symbol} analysis from ${sourceEngine} (current: ${this.currentEngine})`);
                return;
            }
            
            CONFIG.log('info', `🧠 Processing ${symbol} ${sourceEngine} analysis: ${analysis.bias} (${analysis.confidence}%)`);
            
            // Check if asset is closed for weekend
            const isAssetClosed = CONFIG.isAssetClosedForWeekend(symbol);
            
            if (isAssetClosed && symbol !== 'BTCUSD') {
                const symbolLower = symbol.toLowerCase();
                this.updateBiasDisplay(symbolLower, 'CLOSED');
                this.updateConfidenceDisplay(symbolLower, 0);
                this.updateActionDisplay(symbolLower, 'CLOSED');
                
                const scores = ['technical', 'structure', 'pattern', 'volume'];
                scores.forEach(scoreType => {
                    const element = document.getElementById(`${symbolLower}-${scoreType}-score`);
                    if (element) {
                        element.textContent = '--';
                        element.className = 'score-value';
                    }
                });
                
                const levelsElement = document.getElementById(`${symbolLower}-levels`);
                if (levelsElement) {
                    levelsElement.style.display = 'none';
                }
                
                CONFIG.log('info', `🏖️ ${symbol} closed for weekend`);
                return;
            }

            // Normal processing for active markets
            const symbolLower = symbol.toLowerCase();
            
            // Update confidence and bias
            this.updateConfidenceDisplay(symbolLower, analysis.confidence || 0);
            this.updateBiasDisplay(symbolLower, analysis.bias);
            this.updateActionDisplay(symbolLower, analysis.action);
            
            CONFIG.log('debug', `Updated ${symbol} ${sourceEngine} confidence to ${analysis.confidence}%`);
            
            // Update analysis scores
            if (analysis.analysis) {
                this.updateAnalysisScores(symbolLower, analysis.analysis, sourceEngine);
            }
            
            // Update trade levels
            this.updateTradeLevels(symbolLower, analysis);
            
            CONFIG.log('info', `✅ ${symbol} ${sourceEngine} display updated successfully`);
            
        } catch (error) {
            CONFIG.log('error', `Error updating ${symbol} ${sourceEngine} display:`, error);
        }
    }

    // HANDLE PRICE UPDATES
    handlePriceUpdate(symbol, priceData) {
        try {
            const symbolLower = symbol.toLowerCase();
            
            const priceElement = document.getElementById(`${symbolLower}-price`);
            if (priceElement && priceData.price !== undefined) {
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
            
            const changeElement = document.getElementById(`${symbolLower}-change`);
            if (changeElement && priceData.change !== undefined) {
                const changeText = `${priceData.change > 0 ? '+' : ''}${priceData.change.toFixed(2)}`;
                const changePercent = priceData.changePercent ? 
                    ` (${priceData.changePercent > 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%)` : '';
                
                changeElement.textContent = changeText + changePercent;
                changeElement.className = `price-change ${priceData.change >= 0 ? 'price-up' : 'price-down'}`;
            }
            
            // ✅ SMOOTH: Update live trades with new prices
            this.updateLiveTradesWithPrice(symbol, priceData.price);
            
        } catch (error) {
            CONFIG.log('error', `Error updating ${symbol} price:`, error);
        }
    }

    // ✅ SMOOTH: Update Live Trades with New Price (No rebuilding!)
    updateLiveTradesWithPrice(symbol, newPrice) {
        const currentTrades = this.activeTrades[this.currentEngine] || [];
        const symbolTrades = currentTrades.filter(trade => trade.symbol === symbol);
        
        if (symbolTrades.length > 0) {
            // Update current price for these trades
            symbolTrades.forEach(trade => {
                trade.currentPrice = newPrice;
            });
            
            // ✅ SMOOTH UPDATE: Only update affected trades, not rebuild everything
            this.updateSpecificTrades(symbolTrades);
        }
    }

    // ✅ SMOOTH: Update only specific trades that changed
    // ✅ FIXED: Update only specific trades that changed
updateSpecificTrades(changedTrades) {
    const liveTradesList = document.getElementById('liveTradesList');
    if (!liveTradesList) return;
    
    // ✅ FIX: Use the parameter changedTrades, not undefined 'trades'
    changedTrades.forEach(trade => {
        const existingElement = liveTradesList.querySelector(`[data-trade-id="${trade.id}"]`);
        if (existingElement) {
            this.updateExistingTradeElement(existingElement, trade);
        }
    });
}
    // UI UPDATE METHODS
    updateConfidenceDisplay(symbolLower, confidence) {
        const confidenceElement = document.getElementById(`${symbolLower}-confidence`);
        if (confidenceElement && confidence !== undefined && confidence !== null) {
            confidenceElement.textContent = `${confidence}%`;
            
            confidenceElement.style.opacity = '0.5';
            setTimeout(() => {
                confidenceElement.style.opacity = '1';
            }, 100);
            
            confidenceElement.className = 'confidence-score';
            if (confidence >= 75) {
                confidenceElement.classList.add('confidence-high');
            } else if (confidence >= 50) {
                confidenceElement.classList.add('confidence-medium');
            } else {
                confidenceElement.classList.add('confidence-low');
            }
            
            CONFIG.log('debug', `Confidence display updated: ${symbolLower} = ${confidence}%`);
        }
    }

    updateBiasDisplay(symbolLower, bias) {
        const biasElement = document.getElementById(`${symbolLower}-bias`);
        if (biasElement && bias) {
            biasElement.textContent = bias;
            biasElement.className = `bias-label ${bias.toLowerCase()}`;
        }
    }

    updateActionDisplay(symbolLower, action) {
        const actionElement = document.getElementById(`${symbolLower}-action`);
        if (actionElement && action) {
            actionElement.textContent = action;
            actionElement.className = `analysis-action ${action}`;
        }
    }

    updateAnalysisScores(symbolLower, analysis, sourceEngine) {
        if (sourceEngine === 'v3') {
            const scores = [
                { id: `${symbolLower}-technical-score`, value: analysis.technical },
                { id: `${symbolLower}-structure-score`, value: analysis.momentum },
                { id: `${symbolLower}-pattern-score`, value: analysis.trend },
                { id: `${symbolLower}-volume-score`, value: analysis.volatility }
            ];
            scores.forEach(score => {
                this.updateScoreDisplay(score.id, score.value, sourceEngine);
            });
        } else {
            const scores = [
                { id: `${symbolLower}-technical-score`, value: analysis.technical },
                { id: `${symbolLower}-structure-score`, value: analysis.structure },
                { id: `${symbolLower}-pattern-score`, value: analysis.patterns },
                { id: `${symbolLower}-volume-score`, value: analysis.volume }
            ];
            scores.forEach(score => {
                this.updateScoreDisplay(score.id, score.value, sourceEngine);
            });
        }
    }

    updateScoreDisplay(elementId, score, sourceEngine) {
        const element = document.getElementById(elementId);
        if (element && score !== undefined) {
            element.textContent = `${score}%`;
            
            element.className = 'score-value';
            if (score >= 70) {
                element.classList.add('score-high');
            } else if (score >= 50) {
                element.classList.add('score-medium');
            } else {
                element.classList.add('score-low');
            }
            
            if (sourceEngine === 'v2') {
                element.classList.add('ai-enhanced-score');
            } else if (sourceEngine === 'v3') {
                element.classList.add('v3-enhanced');
            }
        }
    }

    updateTradeLevels(symbolLower, analysis) {
        const levelsElement = document.getElementById(`${symbolLower}-levels`);
        if (!levelsElement) return;
        
        if (analysis.action === 'BUY' || analysis.action === 'SELL') {
            levelsElement.style.display = 'block';
            
            this.updateElementSafely(`${symbolLower}-entry`, CONFIG.formatPrice(analysis.symbol, analysis.entry));
            this.updateElementSafely(`${symbolLower}-stop`, CONFIG.formatPrice(analysis.symbol, analysis.stopLoss));
            this.updateElementSafely(`${symbolLower}-target`, CONFIG.formatPrice(analysis.symbol, analysis.takeProfit));
        } else {
            levelsElement.style.display = 'none';
        }
    }

    // LOAD INITIAL DATA
    async loadInitialData() {
        const assets = ['XAUUSD', 'USDJPY', 'BTCUSD'];
        const engine = this.currentEngine;
        const analysisCollection = `analysis_${engine}`;
        
        CONFIG.log('info', `📥 Loading initial data for ${engine}...`);
        
        for (const symbol of assets) {
            try {
                this.updateBiasDisplay(symbol.toLowerCase(), 'ANALYZING');
                this.updateConfidenceDisplay(symbol.toLowerCase(), 0);
                
                if (this.firebaseStorage) {
                    const analysisDoc = await this.firebaseStorage.getDoc(
                        this.firebaseStorage.doc(this.firebaseStorage.db, analysisCollection, symbol)
                    );
                    
                    if (analysisDoc.exists()) {
                        const analysis = analysisDoc.data();
                        this.handleAnalysisUpdate(symbol, analysis, engine);
                    }
                    
                    const priceDoc = await this.firebaseStorage.getDoc(
                        this.firebaseStorage.doc(this.firebaseStorage.db, 'prices', symbol)
                    );
                    
                    if (priceDoc.exists()) {
                        const priceData = priceDoc.data();
                        this.handlePriceUpdate(symbol, priceData);
                    }
                }
                
            } catch (error) {
                CONFIG.log('error', `Failed to load ${symbol} for ${engine}:`, error);
                this.handleAssetError(symbol, error);
            }
        }
    }

    // ✅ Update Performance Display (Enhanced for Trading)
    updatePerformanceDisplay() {
        const stats = this.performanceStats[this.currentEngine];
        
        this.updateElementSafely('dailyTrades', stats.trades);
        this.updateElementSafely('activeTrades', stats.activeTrades);
        this.updateElementSafely('totalPnL', `${stats.totalPips > 0 ? '+' : ''}${stats.totalPips.toFixed(1)}`);
        this.updateElementSafely('winRate', `${stats.winRate.toFixed(1)}%`);
        
        // Update comparison if multiple engines have data
        this.updateEngineComparison();
    }

    updateEngineComparison() {
        const v1Stats = this.performanceStats.v1;
        const v2Stats = this.performanceStats.v2;
        const v3Stats = this.performanceStats.v3;
        const comparisonElement = document.getElementById('engineComparison');
        
        const enginesWithData = [v1Stats, v2Stats, v3Stats].filter(stats => stats.trades > 0);
        
        if (comparisonElement && enginesWithData.length >= 2) {
            this.updateElementSafely('v1Performance', `${v1Stats.totalPips.toFixed(1)} pips`);
            this.updateElementSafely('v2Performance', `${v2Stats.totalPips.toFixed(1)} pips`);
            this.updateElementSafely('v3Performance', `${v3Stats.totalPips.toFixed(1)} pips`);
            comparisonElement.style.display = 'block';
        }
    }

    // ✅ ENHANCED: Update loops with smooth trade refresh
    startUpdateLoops() {
        this.updateIntervals.dashboard = setInterval(() => {
            this.updateDashboard();
        }, 1000);
        
        // ✅ SMOOTH: Add live trades refresh every 15 seconds (duration updates only)
        this.updateIntervals.liveTrades = setInterval(() => {
            this.refreshLiveTrades();
        }, 15000);
        
        CONFIG.log('info', '🔄 Enhanced update loops started with 15s smooth live trades refresh');
    }

    // ✅ SMOOTH: Only update timestamps, no rebuilding
    async refreshLiveTrades() {
        try {
            if (!this.isRunning) return;
            
            // ✅ SMOOTH: Don't reload from Firebase, just update display with current data
            const currentTrades = this.activeTrades[this.currentEngine] || [];
            
            // Only update duration and any calculated fields, don't rebuild everything
            this.updateTradeTimestamps(currentTrades);
            
            CONFIG.log('debug', `🔄 Live trades timestamps refreshed for ${this.currentEngine}: ${currentTrades.length} trades`);
            
        } catch (error) {
            CONFIG.log('error', 'Error refreshing live trades:', error);
        }
    }

    // ✅ SMOOTH: Update only timestamps/duration without rebuilding
    updateTradeTimestamps(trades) {
        const liveTradesList = document.getElementById('liveTradesList');
        if (!liveTradesList) return;
        
        trades.forEach(trade => {
            const element = liveTradesList.querySelector(`[data-trade-id="${trade.id}"]`);
            if (element) {
                const duration = this.formatTradeDuration(Date.now() - trade.openTime);
                const detailsElement = element.querySelector('.trade-details');
                
                if (detailsElement) {
                    const currentPrice = trade.currentPrice || trade.entry;
                    const newText = `Entry: ${this.formatPrice(trade.symbol, trade.entry)} → Current: ${this.formatPrice(trade.symbol, currentPrice)}<br>SL: ${this.formatPrice(trade.symbol, trade.stopLoss)} | TP: ${this.formatPrice(trade.symbol, trade.takeProfit)} | ${duration}`;
                    
                    if (detailsElement.innerHTML !== newText) {
                        detailsElement.innerHTML = newText;
                    }
                }
            }
        });
    }

    updateDashboard() {
        try {
            this.updateTime();
            this.updateSession();
        } catch (error) {
            CONFIG.log('error', 'Error updating dashboard:', error);
        }
    }

    updateTime() {
        this.updateElementSafely('updateTime', new Date().toLocaleTimeString());
    }

    updateSession() {
        try {
            const sessionIndicator = document.getElementById('sessionIndicator');
            if (!sessionIndicator) return;
            
            if (typeof CONFIG === 'undefined' || !CONFIG.getCurrentSession) {
                console.warn('CONFIG not ready for session update');
                return;
            }
            
            const session = CONFIG.getCurrentSession();
            const sessionText = session.active ? session.name : 'Market Closed';
            
            sessionIndicator.textContent = sessionText;
            sessionIndicator.className = session.active ? 'session-indicator session-active' : 'session-indicator';
                
        } catch (error) {
            console.error('Error updating session:', error);
            const sessionIndicator = document.getElementById('sessionIndicator');
            if (sessionIndicator) {
                sessionIndicator.textContent = 'Loading...';
                sessionIndicator.className = 'session-indicator';
            }
        }
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
        CONFIG.log('info', '🎨 Live Trading Dashboard UI initialized');
        
        this.updateEngineStatus(this.currentEngine);
        this.updateScoreLabels(this.currentEngine);
    }

    handleApplicationError(error) {
        CONFIG.log('error', 'Application error:', error.message);
        
        const errorElement = document.getElementById('apiErrorMessage');
        if (errorElement) {
            const errorDescription = document.getElementById('errorDescription');
            if (errorDescription) {
                errorDescription.textContent = error.message;
            }
            errorElement.classList.add('show');
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

    // ✅ Helper Methods for Trading
    formatPrice(symbol, price) {
        if (!price || price === 0) return '--';
        
        if (symbol === 'XAUUSD') {
            return `${price.toFixed(2)}`;
        } else if (symbol === 'USDJPY') {
            return `¥${price.toFixed(3)}`;
        } else if (symbol === 'BTCUSD') {
            return `${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        }
        return price.toFixed(4);
    }

    formatTradeDuration(ms) {
        const hours = Math.floor(ms / (60 * 60 * 1000));
        const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
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
            CONFIG.log('error', `Failed to update element ${elementId}:`, error);
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

            if (this.vpsStatusInterval) {
                clearInterval(this.vpsStatusInterval);
                this.vpsStatusInterval = null;
            }
            
            Object.keys(this.engineListeners).forEach(engine => {
                this.cleanupEngineListeners(engine);
            });
            
            this.unsubscribers.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            
            CONFIG.log('info', '🛑 Live Trading Dashboard stopped');
        } catch (error) {
            CONFIG.log('error', 'Error stopping application:', error);
        }
    }
}

// Global application instance
let tripleEngineHueHueApp;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof CONFIG === 'undefined') {
        console.error('❌ CONFIG not loaded - check script loading order');
        return;
    }
    
    CONFIG.log('info', '🚀 Starting Live Trading Dashboard...');
    
    try {
        tripleEngineHueHueApp = new TripleEngineHueHueApp();
        window.tripleEngineHueHueApp = tripleEngineHueHueApp;
        
        const initialized = await tripleEngineHueHueApp.initialize();
        
        if (initialized) {
            CONFIG.log('info', '✅ Live Trading Dashboard is running with v1 Smart + v2 AI + v3 Simple!');
        } else {
            CONFIG.log('error', '❌ Failed to start Live Trading Dashboard');
        }
    } catch (error) {
        CONFIG.log('error', '❌ Critical error:', error);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    try {
        if (tripleEngineHueHueApp) {
            tripleEngineHueHueApp.stop();
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