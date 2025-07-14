// app.js - Enhanced HueHue Application with TRIPLE-ENGINE v1/v2/v3 Toggle System
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
        this.updateIntervals = {};
        this.unsubscribers = []; // Store Firebase listeners
        
        // TRIPLE ENGINE STATE
        this.currentEngine = 'v1'; // Default to v1 (Smart)
        this.engineListeners = {
            v1: { analysis: [], signals: [] },
            v2: { analysis: [], signals: [] },
            v3: { analysis: [], signals: [] }
        };
        
        // Performance stats for all three engines
        this.performanceStats = {
            v1: { signalsToday: 0, totalSignals: 0, avgConfidence: 0, qualitySignals: 0 },
            v2: { signalsToday: 0, totalSignals: 0, avgConfidence: 0, qualitySignals: 0 },
            v3: { signalsToday: 0, totalSignals: 0, avgConfidence: 0, qualitySignals: 0 }
        };
        
        // Engine descriptions
        this.engineDescriptions = {
            v1: 'Smart Analysis - Proven technical indicators',
            v2: 'AI Enhanced - Advanced intelligence + session awareness',
            v3: 'Simple & Effective - Fast signals + lower thresholds'
        };
        
        CONFIG.log('info', '🤖 Triple-Engine HueHue Application initialized (v1 Smart + v2 AI + v3 Simple)');
    }

    async initialize() {
        try {
            CONFIG.log('info', '🚀 Starting Triple-Engine HueHue initialization...');
            
            // Initialize UI first
            this.updateConnectionStatus('connecting');
            this.hideErrorMessage();
            
            // Wait for Firebase
            await this.waitForFirebase();
            
            // Setup triple-engine toggle
            this.setupEngineToggle();
            
            // Setup real-time listeners for current engine
            await this.setupTripleEngineListeners();
            
            // Setup VPS status monitoring
            await this.setupVpsStatusMonitoring();
            
            // Load initial data for current engine
            await this.loadInitialData();
            
            // Start update loops
            this.startUpdateLoops();
            
            // Initialize UI
            this.initializeUI();
            
            this.isRunning = true;
            this.updateConnectionStatus('connected');
            CONFIG.log('info', '✅ Triple-Engine HueHue application ready!');
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
            CONFIG.log('info', '🔥 Firebase connected to Triple-Engine App');
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
        
        try {
            // Update UI status
            this.updateEngineStatus(newEngine);
            
            // Force clear old data
            this.clearAnalysisDisplay();
            
            // Cleanup old listeners
            this.cleanupEngineListeners(oldEngine);
            
            // Setup new listeners
            await this.setupCurrentEngineListeners();
            
            // Reload data for new engine
            await this.loadInitialData();
            
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
        const signalsVersion = document.getElementById('signalsVersion');
        const performanceVersion = document.getElementById('performanceVersion');
        const engineDescription = document.getElementById('engineDescText');
        
        if (signalsVersion) {
            signalsVersion.textContent = `(${engine})`;
            signalsVersion.className = `signals-version ${engine === 'v1' ? 'v1-active' : engine === 'v2' ? 'v2-active' : 'v3-active'}`;
        }
        
        if (performanceVersion) {
            performanceVersion.textContent = `(${engine})`;
            performanceVersion.className = `performance-version ${engine === 'v1' ? 'v1-active' : engine === 'v2' ? 'v2-active' : 'v3-active'}`;
        }
        
        if (engineDescription) {
            engineDescription.textContent = this.engineDescriptions[engine];
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
        const signalsCollection = `signals_${engine}`;
        
        CONFIG.log('info', `📡 Setting up ${engine} listeners (${analysisCollection}, ${signalsCollection})...`);
        
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
        
        // Listen for signals for current engine
        const signalsQuery = this.firebaseStorage.query(
            this.firebaseStorage.collection(this.firebaseStorage.db, signalsCollection),
            this.firebaseStorage.orderBy('timestamp', 'desc'),
            this.firebaseStorage.limit(20)
        );
        
        const signalsUnsub = this.firebaseStorage.onSnapshot(signalsQuery, (snapshot) => {
            const signals = [];
            snapshot.forEach((doc) => {
                signals.push({ id: doc.id, ...doc.data() });
            });
            this.handleSignalsUpdate(signals, engine);
        });
        
        this.engineListeners[engine].signals.push({ unsubscribe: signalsUnsub });
        
        CONFIG.log('info', `✅ ${engine} listeners setup complete`);
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
        
        // Cleanup signals listeners
        this.engineListeners[engine].signals.forEach(listener => {
            if (listener.unsubscribe) {
                listener.unsubscribe();
            }
        });
        this.engineListeners[engine].signals = [];
        
        CONFIG.log('info', `✅ ${engine} listeners cleaned up`);
    }

    // VPS STATUS MONITORING
    async setupVpsStatusMonitoring() {
        if (!this.firebaseStorage) return;
        
        CONFIG.log('info', '📡 Setting up VPS status monitoring for triple-engine...');
        
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
            CONFIG.log('info', '✅ VPS status monitoring active (triple-engine aware)');
            
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
            this.updateVpsStatusElement('VPS Offline', 'offline');
            return;
        }
        
        const lastHeartbeat = vpsData.lastHeartbeat;
        const timeSinceHeartbeat = now - lastHeartbeat;
        const offlineThreshold = 3 * 60 * 1000; // 3 minutes
        
        if (timeSinceHeartbeat > offlineThreshold) {
            const minutesAgo = Math.round(timeSinceHeartbeat / 60000);
            this.updateVpsStatusElement(`VPS Offline (${minutesAgo}m ago)`, 'offline');
        } else {
            const status = vpsData.status || 'active';
            const engineType = vpsData.type || 'unknown';
            
            if (status === 'active') {
                // Enhanced status with engine info
                const statusText = engineType.includes('triple') ? 'VPS Live (Triple)' : 'VPS Live';
                this.updateVpsStatusElement(statusText, 'online');
            } else {
                this.updateVpsStatusElement(`VPS ${status}`, 'offline');
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

    // HANDLE ANALYSIS UPDATES (enhanced for triple-engine)
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
            
            // Update analysis scores (engine-specific handling)
            if (analysis.analysis) {
                this.updateAnalysisScores(symbolLower, analysis.analysis, sourceEngine);
            }
            
            // Update trade levels
            this.updateTradeLevels(symbolLower, analysis);
            
            // Show engine-specific features
            this.updateEngineFeatures(symbolLower, analysis, sourceEngine);
            
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
            
        } catch (error) {
            CONFIG.log('error', `Error updating ${symbol} price:`, error);
        }
    }

    // HANDLE SIGNALS UPDATE (enhanced for triple-engine)
    handleSignalsUpdate(signals, sourceEngine) {
        try {
            // Only process if this update is for the currently active engine
            if (sourceEngine !== this.currentEngine) {
                CONFIG.log('debug', `Ignoring signals from ${sourceEngine} (current: ${this.currentEngine})`);
                return;
            }
            
            CONFIG.log('info', `📡 Received ${signals.length} ${sourceEngine} signals`);
            
            const signalsList = document.getElementById('signalsList');
            if (!signalsList) return;
            
            signalsList.innerHTML = '';
            
            const recentSignals = signals.slice(0, 10);
            
            if (recentSignals.length === 0) {
                const engineName = this.getEngineDisplayName(sourceEngine);
                signalsList.innerHTML = `
                    <div class="signal-item">
                        <div class="signal-meta">
                            <span class="signal-asset">SYSTEM</span>
                            <span class="signal-time">Monitoring</span>
                        </div>
                        <div class="signal-details">
                            ${engineName} monitoring market conditions... No quality signals found yet.
                        </div>
                    </div>
                `;
            } else {
                recentSignals.forEach(signal => {
                    try {
                        const element = this.createSignalElement(signal, sourceEngine);
                        if (element) signalsList.appendChild(element);
                    } catch (error) {
                        CONFIG.log('error', 'Error creating signal element:', error);
                    }
                });
            }
            
            this.updateElementSafely('signalCount', `${recentSignals.length} signals`);
            this.updatePerformanceStats(signals, sourceEngine);
            
        } catch (error) {
            CONFIG.log('error', `Error handling ${sourceEngine} signals update:`, error);
        }
    }

    // UI UPDATE METHODS

    updateConfidenceDisplay(symbolLower, confidence) {
        const confidenceElement = document.getElementById(`${symbolLower}-confidence`);
        if (confidenceElement && confidence !== undefined && confidence !== null) {
            confidenceElement.textContent = `${confidence}%`;
            
            // Force display update
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
        } else {
            CONFIG.log('warn', `Failed to update confidence: element=${!!confidenceElement}, confidence=${confidence}`);
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
        // Handle different score structures for different engines
        if (sourceEngine === 'v3') {
            // v3 has: technical, momentum, trend, volatility
            const scores = [
                { id: `${symbolLower}-technical-score`, value: analysis.technical },
                { id: `${symbolLower}-structure-score`, value: analysis.momentum }, // momentum maps to structure slot
                { id: `${symbolLower}-pattern-score`, value: analysis.trend }, // trend maps to pattern slot
                { id: `${symbolLower}-volume-score`, value: analysis.volatility } // volatility maps to volume slot
            ];
            scores.forEach(score => {
                this.updateScoreDisplay(score.id, score.value, sourceEngine);
            });
        } else {
            // v1/v2 have: technical, structure, patterns, volume
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
            
            // Add engine-specific styling
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

    // UPDATE ENGINE-SPECIFIC FEATURES
    updateEngineFeatures(symbolLower, analysis, sourceEngine) {
        const assetCard = document.querySelector(`[data-symbol="${symbolLower}"]`);
        if (assetCard) {
            if (sourceEngine === 'v2' && analysis.aiFeatures) {
                // Add AI-specific tooltip
                const aiInfo = `Session: ${analysis.aiFeatures.sessionWeight}x | Volatility: ${analysis.aiFeatures.volatilityRegime} | Confluence: ${analysis.aiFeatures.confluence}%`;
                assetCard.setAttribute('title', aiInfo);
            } else if (sourceEngine === 'v3') {
                // Add v3-specific tooltip
                const v3Info = `Simple & Effective Analysis | Lower Thresholds | Fast Signals`;
                assetCard.setAttribute('title', v3Info);
            } else {
                // Remove tooltip for v1
                assetCard.removeAttribute('title');
            }
        }
    }

    createSignalElement(signal, sourceEngine) {
        try {
            if (!signal?.symbol) return null;
            
            const signalDiv = document.createElement('div');
            signalDiv.className = `signal-item signal-${(signal.action || 'neutral').toLowerCase()}`;
            
            // Add engine-specific signal styling
            if (sourceEngine === 'v2') {
                signalDiv.classList.add('ai-signal');
            } else if (sourceEngine === 'v3') {
                signalDiv.classList.add('v3-signal');
            }
            
            const timestamp = signal.timestamp || Date.now();
            const timeStr = new Date(timestamp).toLocaleTimeString();
            const dateStr = new Date(timestamp).toLocaleDateString();
            
            const confidence = signal.confidence || 0;
            const thresholds = { v1: 75, v2: 80, v3: 65 };
            const isHighQuality = confidence >= thresholds[sourceEngine];
            
            if (isHighQuality && (signal.type?.includes('SIGNAL'))) {
                // High quality signal
                const engineEmojis = { v1: '🧠', v2: '🤖', v3: '⚡' };
                const engineNames = { v1: 'Smart', v2: 'AI Enhanced', v3: 'Simple & Effective' };
                
                const engineBadge = engineEmojis[sourceEngine];
                const engineName = engineNames[sourceEngine];
                
                signalDiv.className += ' professional';
                signalDiv.innerHTML = `
                    <div class="signal-meta">
                        <span class="signal-asset">
                            ${signal.symbol} ${signal.action} 
                            <span class="signal-confidence">${confidence}%</span>
                            ${engineBadge}
                        </span>
                        <span class="signal-time">${dateStr} ${timeStr}</span>
                    </div>
                    <div class="signal-details">
                        Entry: ${CONFIG.formatPrice(signal.symbol, signal.entry)} | SL: ${CONFIG.formatPrice(signal.symbol, signal.stopLoss)} | TP: ${CONFIG.formatPrice(signal.symbol, signal.takeProfit)} | ${engineName} Analysis
                    </div>
                `;
            } else {
                // Monitoring update
                signalDiv.innerHTML = `
                    <div class="signal-meta">
                        <span class="signal-asset">${signal.symbol || 'SYSTEM'}</span>
                        <span class="signal-time">${timeStr}</span>
                    </div>
                    <div class="signal-details">
                        ${signal.note || `${sourceEngine.toUpperCase()} Monitoring - ${confidence}% confidence`}
                    </div>
                `;
            }
            
            return signalDiv;
            
        } catch (error) {
            CONFIG.log('error', 'Error creating signal element:', error);
            return null;
        }
    }

    // LOAD INITIAL DATA (enhanced for current engine)
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
                    // Get latest analysis for current engine
                    const analysisDoc = await this.firebaseStorage.getDoc(
                        this.firebaseStorage.doc(this.firebaseStorage.db, analysisCollection, symbol)
                    );
                    
                    if (analysisDoc.exists()) {
                        const analysis = analysisDoc.data();
                        this.handleAnalysisUpdate(symbol, analysis, engine);
                    }
                    
                    // Get latest price (shared)
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
        
        // Load historical signals for current engine
        await this.loadHistoricalSignals();
    }

    async loadHistoricalSignals() {
        if (!this.firebaseStorage) return;
        
        const engine = this.currentEngine;
        const signalsCollection = `signals_${engine}`;
        
        try {
            const signalsQuery = this.firebaseStorage.query(
                this.firebaseStorage.collection(this.firebaseStorage.db, signalsCollection),
                this.firebaseStorage.orderBy('timestamp', 'desc'),
                this.firebaseStorage.limit(20)
            );
            const querySnapshot = await this.firebaseStorage.getDocs(signalsQuery);
            
            const signals = [];
            querySnapshot.forEach((doc) => {
                signals.push({ id: doc.id, ...doc.data() });
            });
            
            if (signals.length > 0) {
                this.handleSignalsUpdate(signals, engine);
            }
        } catch (error) {
            CONFIG.log('warn', `Could not load historical ${engine} signals:`, error);
        }
    }

    // PERFORMANCE STATS (enhanced for triple-engine)
    updatePerformanceStats(signals, sourceEngine) {
        if (!signals?.length) {
            this.resetPerformanceDisplay(sourceEngine);
            return;
        }
        
        try {
            const today = new Date().toDateString();
            const thisWeek = this.getWeekStart();
            
            // Different confidence thresholds for each engine
            const confidenceThresholds = { v1: 75, v2: 80, v3: 65 };
            const minConfidence = confidenceThresholds[sourceEngine];
            
            const qualitySignals = signals.filter(s => {
                return s.confidence >= minConfidence;
            });
            
            const todaySignals = qualitySignals.filter(s => 
                s.timestamp && new Date(s.timestamp).toDateString() === today
            );
            
            const weekSignals = qualitySignals.filter(s => 
                s.timestamp && new Date(s.timestamp) >= thisWeek
            );
            
            // Update stats for current engine
            this.performanceStats[sourceEngine] = {
                signalsToday: todaySignals.length,
                totalSignals: qualitySignals.length,
                avgConfidence: qualitySignals.length > 0 ? 
                    qualitySignals.reduce((sum, s) => sum + (s.confidence || 0), 0) / qualitySignals.length : 0,
                qualitySignals: qualitySignals.length
            };
            
            // Update display for current engine only
            if (sourceEngine === this.currentEngine) {
                this.updatePerformanceDisplay();
            }
            
        } catch (error) {
            CONFIG.log('error', `Error updating ${sourceEngine} performance stats:`, error);
        }
    }

    resetPerformanceDisplay(sourceEngine) {
        if (sourceEngine === this.currentEngine) {
            this.updateElementSafely('dailySignals', '0');
            this.updateElementSafely('weeklySignals', '0');
            this.updateElementSafely('avgConfidence', '0%');
            this.updateElementSafely('qualitySignals', '0');
        }
    }

    updatePerformanceDisplay() {
        const stats = this.performanceStats[this.currentEngine];
        
        this.updateElementSafely('dailySignals', stats.signalsToday);
        this.updateElementSafely('weeklySignals', stats.totalSignals);
        this.updateElementSafely('avgConfidence', `${stats.avgConfidence.toFixed(0)}%`);
        this.updateElementSafely('qualitySignals', stats.qualitySignals);
        
        // Show comparison if multiple engines have data
        this.updateEngineComparison();
    }

    updateEngineComparison() {
        const v1Stats = this.performanceStats.v1;
        const v2Stats = this.performanceStats.v2;
        const v3Stats = this.performanceStats.v3;
        const comparisonElement = document.getElementById('engineComparison');
        
        // Show comparison if at least 2 engines have data
        const enginesWithData = [v1Stats, v2Stats, v3Stats].filter(stats => stats.totalSignals > 0);
        
        if (comparisonElement && enginesWithData.length >= 2) {
            this.updateElementSafely('v1AvgConfidence', `${v1Stats.avgConfidence.toFixed(1)}%`);
            this.updateElementSafely('v2AvgConfidence', `${v2Stats.avgConfidence.toFixed(1)}%`);
            this.updateElementSafely('v3AvgConfidence', `${v3Stats.avgConfidence.toFixed(1)}%`);
            comparisonElement.style.display = 'block';
        }
    }

    getWeekStart() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        return new Date(now.setDate(diff));
    }

    // UPDATE LOOPS AND UI MANAGEMENT
    startUpdateLoops() {
        this.updateIntervals.dashboard = setInterval(() => {
            this.updateDashboard();
        }, 1000);
        
        CONFIG.log('info', '🔄 Update loops started');
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
        CONFIG.log('info', '🎨 Triple-Engine Professional UI initialized');
        
        // Set initial engine status
        this.updateEngineStatus(this.currentEngine);
        
        // Update score labels for current engine
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
            
            // Clear intervals
            Object.values(this.updateIntervals).forEach(interval => {
                clearInterval(interval);
            });

            if (this.vpsStatusInterval) {
                clearInterval(this.vpsStatusInterval);
                this.vpsStatusInterval = null;
            }
            
            // Cleanup all engine listeners
            Object.keys(this.engineListeners).forEach(engine => {
                this.cleanupEngineListeners(engine);
            });
            
            // Cleanup shared listeners
            this.unsubscribers.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            
            CONFIG.log('info', '🛑 Triple-Engine application stopped');
        } catch (error) {
            CONFIG.log('error', 'Error stopping triple-engine application:', error);
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
    
    CONFIG.log('info', '🚀 Starting Triple-Engine HueHue Application...');
    
    try {
        tripleEngineHueHueApp = new TripleEngineHueHueApp();
        window.tripleEngineHueHueApp = tripleEngineHueHueApp;
        
        const initialized = await tripleEngineHueHueApp.initialize();
        
        if (initialized) {
            CONFIG.log('info', '✅ Triple-Engine HueHue is running with v1 Smart + v2 AI + v3 Simple!');
        } else {
            CONFIG.log('error', '❌ Failed to start Triple-Engine HueHue');
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