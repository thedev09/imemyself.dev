// app.js - Professional Smart Analyzer Integration
class ProfessionalHueHueApp {
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
        
        // Performance stats
        this.performanceStats = {
            signalsToday: 0,
            totalSignals: 0,
            avgConfidence: 0,
            qualitySignals: 0
        };
        
        CONFIG.log('info', '🧠 Professional HueHue Application initialized');
    }

    async initialize() {
        try {
            CONFIG.log('info', '🚀 Starting Professional HueHue initialization...');
            
            // Initialize UI first
            this.updateConnectionStatus('connecting');
            this.hideErrorMessage();
            
            // Wait for Firebase
            await this.waitForFirebase();
            
            // Setup real-time listeners for Smart Analyzer data
            await this.setupSmartAnalyzerListeners();
            
            // Setup VPS status monitoring
            await this.setupVpsStatusMonitoring();
            
            // Load initial data
            await this.loadInitialData();
            
            // Start update loops
            this.startUpdateLoops();
            
            // Initialize UI
            this.initializeUI();
            
            this.isRunning = true;
            this.updateConnectionStatus('connected');
            CONFIG.log('info', '✅ Professional HueHue application ready!');
            
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
            CONFIG.log('info', '🔥 Firebase connected to Professional App');
        } else {
            throw new Error('Firebase not available');
        }
    }

    async setupSmartAnalyzerListeners() {
        if (!this.firebaseStorage) return;
        
        CONFIG.log('info', '📡 Setting up Smart Analyzer real-time listeners...');
        
        // Listen for XAUUSD analysis updates
        const xauAnalysisRef = this.firebaseStorage.doc(this.firebaseStorage.db, 'analysis', 'XAUUSD');
        const xauAnalysisUnsub = this.firebaseStorage.onSnapshot(xauAnalysisRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                CONFIG.log('info', `📊 XAUUSD analysis update: ${data.bias} (${data.confidence}%)`);
                this.handleSmartAnalysisUpdate('XAUUSD', data);
            }
        });
        this.unsubscribers.push(xauAnalysisUnsub);
        
        // Listen for USDJPY analysis updates
        const usdAnalysisRef = this.firebaseStorage.doc(this.firebaseStorage.db, 'analysis', 'USDJPY');
        const usdAnalysisUnsub = this.firebaseStorage.onSnapshot(usdAnalysisRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                CONFIG.log('info', `📊 USDJPY analysis update: ${data.bias} (${data.confidence}%)`);
                this.handleSmartAnalysisUpdate('USDJPY', data);
            }
        });
        this.unsubscribers.push(usdAnalysisUnsub);
        
        // Listen for price updates
        ['XAUUSD', 'USDJPY'].forEach(symbol => {
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
        
        // Listen for high-quality signals
        const signalsQuery = this.firebaseStorage.query(
            this.firebaseStorage.collection(this.firebaseStorage.db, 'signals'),
            this.firebaseStorage.orderBy('timestamp', 'desc'),
            this.firebaseStorage.limit(20)
        );
        
        const signalsUnsub = this.firebaseStorage.onSnapshot(signalsQuery, (snapshot) => {
            const signals = [];
            snapshot.forEach((doc) => {
                signals.push({ id: doc.id, ...doc.data() });
            });
            this.handleSignalsUpdate(signals);
        });
        this.unsubscribers.push(signalsUnsub);
        
        CONFIG.log('info', '✅ Smart Analyzer listeners ready');
    }

    // VPS STATUS MONITORING METHODS
    async setupVpsStatusMonitoring() {
        if (!this.firebaseStorage) return;
        
        CONFIG.log('info', '📡 Setting up VPS status monitoring...');
        
        try {
            // Listen for VPS heartbeat updates
            const vpsRef = this.firebaseStorage.doc(this.firebaseStorage.db, 'system', 'generator');
            const vpsUnsub = this.firebaseStorage.onSnapshot(vpsRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    this.updateVpsStatus(data);
                } else {
                    // No VPS document = VPS offline
                    this.updateVpsStatus(null);
                }
            });
            this.unsubscribers.push(vpsUnsub);
            
            // Also check VPS status every 30 seconds
            this.vpsStatusInterval = setInterval(() => {
                this.checkVpsStatus();
            }, 30000);
            
            // Initial check
            await this.checkVpsStatus();
            
            CONFIG.log('info', '✅ VPS status monitoring active');
            
        } catch (error) {
            CONFIG.log('error', 'Error setting up VPS monitoring:', error);
            this.updateVpsStatusElement('VPS Error', 'offline');
        }
    }

    // Check VPS status from Firebase
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

    // Update VPS status based on heartbeat data
    updateVpsStatus(vpsData) {
        const now = Date.now();
        
        if (!vpsData) {
            // No VPS data = offline
            this.updateVpsStatusElement('VPS Offline', 'offline');
            return;
        }
        
        const lastHeartbeat = vpsData.lastHeartbeat;
        const timeSinceHeartbeat = now - lastHeartbeat;
        
        // Consider VPS offline if no heartbeat for more than 3 minutes
        const offlineThreshold = 3 * 60 * 1000; // 3 minutes
        
        if (timeSinceHeartbeat > offlineThreshold) {
            const minutesAgo = Math.round(timeSinceHeartbeat / 60000);
            this.updateVpsStatusElement(`VPS Offline (${minutesAgo}m ago)`, 'offline');
        } else {
            // VPS is active
            const status = vpsData.status || 'active';
            if (status === 'active') {
                this.updateVpsStatusElement('VPS Live', 'online');
            } else {
                this.updateVpsStatusElement(`VPS ${status}`, 'offline');
            }
        }
    }

    // Update the VPS status element in the UI
    updateVpsStatusElement(text, status) {
        const vpsElement = document.getElementById('vpsStatus');
        if (vpsElement) {
            vpsElement.textContent = text;
            vpsElement.className = `vps-status ${status}`;
        }
    }

    // Handle Smart Analyzer analysis updates
    handleSmartAnalysisUpdate(symbol, analysis) {
        try {
            CONFIG.log('info', `🧠 Processing ${symbol} analysis: ${analysis.bias} (${analysis.confidence}%)`);
            
            const symbolLower = symbol.toLowerCase();
            
            // Update confidence score with color coding
            this.updateConfidenceDisplay(symbolLower, analysis.confidence);
            
            // Update bias display
            this.updateBiasDisplay(symbolLower, analysis.bias);
            
            // Update action button
            this.updateActionDisplay(symbolLower, analysis.action);
            
            // Update analysis scores
            if (analysis.analysis) {
                this.updateAnalysisScores(symbolLower, analysis.analysis);
            }
            
            // Update trade levels if it's a trading signal
            this.updateTradeLevels(symbolLower, analysis);
            
            CONFIG.log('info', `✅ ${symbol} display updated successfully`);
            
        } catch (error) {
            CONFIG.log('error', `Error updating ${symbol} display:`, error);
        }
    }

    // Handle price updates
    handlePriceUpdate(symbol, priceData) {
        try {
            const symbolLower = symbol.toLowerCase();
            
            // Update price display
            const priceElement = document.getElementById(`${symbolLower}-price`);
            if (priceElement && priceData.price !== undefined) {
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
            
            // Update change display
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

    // Handle signals updates
    handleSignalsUpdate(signals) {
        try {
            CONFIG.log('info', `📡 Received ${signals.length} signals`);
            
            const signalsList = document.getElementById('signalsList');
            if (!signalsList) return;
            
            signalsList.innerHTML = '';
            
            const recentSignals = signals.slice(0, 10);
            
            if (recentSignals.length === 0) {
                // Show monitoring state
                signalsList.innerHTML = `
                    <div class="signal-item">
                        <div class="signal-meta">
                            <span class="signal-asset">SYSTEM</span>
                            <span class="signal-time">Monitoring</span>
                        </div>
                        <div class="signal-details">
                            Smart analyzer monitoring market conditions... No quality signals found yet.
                        </div>
                    </div>
                `;
            } else {
                recentSignals.forEach(signal => {
                    try {
                        const element = this.createSignalElement(signal);
                        if (element) signalsList.appendChild(element);
                    } catch (error) {
                        CONFIG.log('error', 'Error creating signal element:', error);
                    }
                });
            }
            
            this.updateElementSafely('signalCount', `${recentSignals.length} signals`);
            this.updatePerformanceStats(signals);
            
        } catch (error) {
            CONFIG.log('error', 'Error handling signals update:', error);
        }
    }

    // UI Update Methods
    updateConfidenceDisplay(symbolLower, confidence) {
        const confidenceElement = document.getElementById(`${symbolLower}-confidence`);
        if (confidenceElement && confidence !== undefined) {
            confidenceElement.textContent = `${confidence}%`;
            
            // Color coding based on confidence level
            confidenceElement.className = 'confidence-score';
            if (confidence >= 75) {
                confidenceElement.classList.add('confidence-high');
            } else if (confidence >= 50) {
                confidenceElement.classList.add('confidence-medium');
            } else {
                confidenceElement.classList.add('confidence-low');
            }
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

    updateAnalysisScores(symbolLower, analysis) {
        const scores = [
            { id: `${symbolLower}-technical-score`, value: analysis.technical },
            { id: `${symbolLower}-structure-score`, value: analysis.structure },
            { id: `${symbolLower}-pattern-score`, value: analysis.patterns },
            { id: `${symbolLower}-volume-score`, value: analysis.volume }
        ];
        
        scores.forEach(score => {
            this.updateScoreDisplay(score.id, score.value);
        });
    }

    updateScoreDisplay(elementId, score) {
        const element = document.getElementById(elementId);
        if (element && score !== undefined) {
            element.textContent = `${score}%`;
            
            // Color coding based on score
            element.className = 'score-value';
            if (score >= 70) {
                element.classList.add('score-high');
            } else if (score >= 50) {
                element.classList.add('score-medium');
            } else {
                element.classList.add('score-low');
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

    createSignalElement(signal) {
        try {
            if (!signal?.symbol) return null;
            
            const signalDiv = document.createElement('div');
            
            const timestamp = signal.timestamp || Date.now();
            const timeStr = new Date(timestamp).toLocaleTimeString();
            const dateStr = new Date(timestamp).toLocaleDateString();
            
            if (signal.confidence >= 75 && signal.type === 'HIGH_QUALITY_SIGNAL') {
                // High quality professional signal
                signalDiv.className = `signal-item signal-${signal.action.toLowerCase()} professional`;
                signalDiv.innerHTML = `
                    <div class="signal-meta">
                        <span class="signal-asset">
                            ${signal.symbol} ${signal.action} 
                            <span class="signal-confidence">${signal.confidence}%</span>
                            🧠
                        </span>
                        <span class="signal-time">${dateStr} ${timeStr}</span>
                    </div>
                    <div class="signal-details">
                        Entry: ${CONFIG.formatPrice(signal.symbol, signal.entry)} | SL: ${CONFIG.formatPrice(signal.symbol, signal.stopLoss)} | TP: ${CONFIG.formatPrice(signal.symbol, signal.takeProfit)} | Professional Analysis
                    </div>
                `;
            } else {
                // Monitoring update
                signalDiv.className = `signal-item signal-${(signal.action || 'neutral').toLowerCase()}`;
                signalDiv.innerHTML = `
                    <div class="signal-meta">
                        <span class="signal-asset">${signal.symbol || 'SYSTEM'}</span>
                        <span class="signal-time">${timeStr}</span>
                    </div>
                    <div class="signal-details">
                        ${signal.note || `Monitoring - ${signal.confidence || 0}% confidence`}
                    </div>
                `;
            }
            
            return signalDiv;
            
        } catch (error) {
            CONFIG.log('error', 'Error creating signal element:', error);
            return null;
        }
    }

    async loadInitialData() {
        const assets = ['XAUUSD', 'USDJPY'];
        
        for (const symbol of assets) {
            try {
                // Show loading state
                this.updateBiasDisplay(symbol.toLowerCase(), 'ANALYZING');
                this.updateConfidenceDisplay(symbol.toLowerCase(), 0);
                
                // Load from Firebase if available
                if (this.firebaseStorage) {
                    // Get latest analysis
                    const analysisDoc = await this.firebaseStorage.getDoc(
                        this.firebaseStorage.doc(this.firebaseStorage.db, 'analysis', symbol)
                    );
                    
                    if (analysisDoc.exists()) {
                        const analysis = analysisDoc.data();
                        this.handleSmartAnalysisUpdate(symbol, analysis);
                    }
                    
                    // Get latest price
                    const priceDoc = await this.firebaseStorage.getDoc(
                        this.firebaseStorage.doc(this.firebaseStorage.db, 'prices', symbol)
                    );
                    
                    if (priceDoc.exists()) {
                        const priceData = priceDoc.data();
                        this.handlePriceUpdate(symbol, priceData);
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
            const signalsQuery = this.firebaseStorage.query(
                this.firebaseStorage.collection(this.firebaseStorage.db, 'signals'),
                this.firebaseStorage.orderBy('timestamp', 'desc'),
                this.firebaseStorage.limit(20)
            );
            const querySnapshot = await this.firebaseStorage.getDocs(signalsQuery);
            
            const signals = [];
            querySnapshot.forEach((doc) => {
                signals.push({ id: doc.id, ...doc.data() });
            });
            
            if (signals.length > 0) {
                this.handleSignalsUpdate(signals);
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
        
        // Add safety check for CONFIG
        if (typeof CONFIG === 'undefined' || !CONFIG.getCurrentSession) {
            console.warn('CONFIG not ready for session update');
            return;
        }
        
        const session = CONFIG.getCurrentSession();
        
        // Simple session text without broken flags
        const sessionText = session.active ? session.name : 'Market Closed';
        
        // Set the text directly
        sessionIndicator.textContent = sessionText;
        
        // Update the CSS class for styling
        sessionIndicator.className = session.active ? 'session-indicator session-active' : 'session-indicator';
            
    } catch (error) {
        console.error('Error updating session:', error);
        // Fallback: show a safe default
        const sessionIndicator = document.getElementById('sessionIndicator');
        if (sessionIndicator) {
            sessionIndicator.textContent = 'Loading...';
            sessionIndicator.className = 'session-indicator';
        }
    }
}

    updatePerformanceStats(signals) {
        if (!signals?.length) {
            this.updateElementSafely('dailySignals', '0');
            this.updateElementSafely('weeklySignals', '0');
            this.updateElementSafely('avgConfidence', '0%');
            this.updateElementSafely('qualitySignals', '0');
            return;
        }
        
        try {
            const today = new Date().toDateString();
            const thisWeek = this.getWeekStart();
            
            const qualitySignals = signals.filter(s => s.confidence >= 75);
            
            const todaySignals = qualitySignals.filter(s => 
                s.timestamp && new Date(s.timestamp).toDateString() === today
            );
            
            const weekSignals = qualitySignals.filter(s => 
                s.timestamp && new Date(s.timestamp) >= thisWeek
            );
            
            this.updateElementSafely('dailySignals', todaySignals.length);
            this.updateElementSafely('weeklySignals', weekSignals.length);
            this.updateElementSafely('qualitySignals', qualitySignals.length);
            
            if (qualitySignals.length > 0) {
                const avgConfidence = qualitySignals.reduce((sum, s) => sum + (s.confidence || 0), 0) / qualitySignals.length;
                this.updateElementSafely('avgConfidence', `${avgConfidence.toFixed(0)}%`);
            } else {
                this.updateElementSafely('avgConfidence', '0%');
            }
            
        } catch (error) {
            CONFIG.log('error', 'Error updating performance stats:', error);
        }
    }

    getWeekStart() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        return new Date(now.setDate(diff));
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
        CONFIG.log('info', '🎨 Professional UI initialized');
    }

    handleApplicationError(error) {
        CONFIG.log('error', 'Application error:', error.message);
        
        // Show error to user
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

            // Clear VPS status interval
            if (this.vpsStatusInterval) {
                clearInterval(this.vpsStatusInterval);
                this.vpsStatusInterval = null;
            }
            
            // Unsubscribe from Firebase listeners
            this.unsubscribers.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            
            CONFIG.log('info', '🛑 Professional application stopped');
        } catch (error) {
            CONFIG.log('error', 'Error stopping application:', error);
        }
    }
}

// Global application instance
let professionalHueHueApp;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof CONFIG === 'undefined') {
        console.error('❌ CONFIG not loaded - check script loading order');
        return;
    }
    
    CONFIG.log('info', '🚀 Starting Professional HueHue Application...');
    
    try {
        professionalHueHueApp = new ProfessionalHueHueApp();
        window.professionalHueHueApp = professionalHueHueApp; // Make available globally for debugging
        
        const initialized = await professionalHueHueApp.initialize();
        
        if (initialized) {
            CONFIG.log('info', '✅ Professional HueHue is running!');
        } else {
            CONFIG.log('error', '❌ Failed to start Professional HueHue');
        }
    } catch (error) {
        CONFIG.log('error', '❌ Critical error:', error);
    }

    if (typeof CONFIG !== 'undefined' && CONFIG.getCurrentSession) {
        const sessionIndicator = document.getElementById('sessionIndicator');
        if (sessionIndicator) {
            const session = CONFIG.getCurrentSession();
            sessionIndicator.textContent = session.active ? session.name : 'Market Closed';
            sessionIndicator.className = session.active ? 'session-indicator session-active' : 'session-indicator';
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    try {
        if (professionalHueHueApp) {
            professionalHueHueApp.stop();
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