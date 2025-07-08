// HueHue Optimized Live Data Feed - Enhanced Performance Version
class OptimizedDataFeed {
    constructor() {
        this.baseUrl = CONFIG.TWELVE_DATA.baseUrl;
        this.apiKey = null;
        
        // API tracking
        this.apiCalls = 0;
        this.lastResetTime = Date.now();
        this.maxCallsPerMinute = CONFIG.TWELVE_DATA.maxCallsPerMinute;
        
        // Enhanced cache system with batch support
        this.cache = new Map();
        this.batchQueue = new Map();
        this.batchTimer = null;
        
        // Symbol mapping
        this.symbols = {
            'XAUUSD': 'XAU/USD',
            'USDJPY': 'USD/JPY'
        };
        
        // Error tracking and circuit breaker
        this.errorCount = 0;
        this.lastErrorTime = 0;
        this.circuitBreakerOpen = false;
        this.circuitBreakerOpenTime = 0;
        
        // Connection state
        this.isConnected = false;
        this.isInitialized = false;
        this.lastError = null;
        this.lastErrorCode = null;
        
        // Firebase reference
        this.firebaseStorage = null;
        
        // Performance metrics
        this.performanceMetrics = {
            apiCallsSaved: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        CONFIG.log('info', '📡 Optimized Data Feed initialized');
    }

    async initialize() {
        try {
            CONFIG.log('info', '🔌 Initializing data feed...');
            const startTime = Date.now();
            this.updateConnectionStatus('connecting');
            
            // Parallel initialization
            const [firebaseReady, apiKeyLoaded] = await Promise.all([
                this.waitForFirebase(),
                Promise.resolve() // API key will be loaded after Firebase
            ]);
            
            // Load API key from Firebase
            if (this.firebaseStorage) {
                await this.loadApiKeyFromFirebase();
            } else {
                // Use config fallback
                this.apiKey = CONFIG.TWELVE_DATA.apiKey;
            }
            
            if (!this.apiKey) {
                throw new Error('No API key available');
            }
            
            // Quick connection test with shorter timeout
            await this.quickConnectionTest();
            
            this.isConnected = true;
            this.isInitialized = true;
            this.hideErrorMessage();
            this.updateConnectionStatus('connected');
            
            const initTime = Date.now() - startTime;
            CONFIG.log('info', `✅ Data feed initialized in ${initTime}ms`);
            return true;
            
        } catch (error) {
            CONFIG.log('error', '❌ Data feed initialization failed:', error);
            this.handleConnectionError(error);
            return false;
        }
    }

    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 20; // Reduced from 30
        
        while (!window.firebaseStorage && attempts < maxAttempts) {
            await this.sleep(50); // Reduced from 100ms
            attempts++;
        }
        
        if (window.firebaseStorage) {
            this.firebaseStorage = window.firebaseStorage;
            CONFIG.log('info', '🔥 Firebase connected to data feed');
            return true;
        } else {
            CONFIG.log('warn', '⚠️ Firebase not available for data feed');
            return false;
        }
    }

    async loadApiKeyFromFirebase() {
        try {
            if (!this.firebaseStorage) {
                this.apiKey = CONFIG.TWELVE_DATA.apiKey;
                return;
            }
            
            // Try to get from Firebase first
            const storedKey = await this.firebaseStorage.getApiKey();
            
            if (storedKey) {
                this.apiKey = storedKey;
                CONFIG.log('info', '🔑 API key loaded from Firebase');
            } else {
                // Use config key and save to Firebase
                this.apiKey = CONFIG.TWELVE_DATA.apiKey;
                if (this.apiKey) {
                    await this.firebaseStorage.saveApiKey(this.apiKey);
                    CONFIG.log('info', '🔑 API key saved to Firebase');
                }
            }
            
        } catch (error) {
            CONFIG.log('warn', '⚠️ Could not load API key from Firebase:', error.message);
            this.apiKey = CONFIG.TWELVE_DATA.apiKey;
        }
    }

    async quickConnectionTest() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        try {
            const response = await fetch(
                `${this.baseUrl}/quote?symbol=EUR/USD&apikey=${this.apiKey}`,
                { 
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            const validation = CONFIG.validateApiResponse(data, ['close']);
            if (!validation.valid) {
                this.lastErrorCode = validation.code;
                throw new Error(validation.error);
            }
            
            this.trackApiCall();
            this.resetErrorCount();
            
            CONFIG.log('info', '✅ API connection test successful');
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Connection timeout (5s)');
            }
            
            this.trackError(error);
            throw error;
        }
    }

    async getRealTimePrice(symbol) {
        if (!this.isConnected) {
            throw new Error('Data feed not connected');
        }

        if (this.circuitBreakerOpen) {
            this.checkCircuitBreaker();
            if (this.circuitBreakerOpen) {
                throw new Error('Circuit breaker is open');
            }
        }

        // Enhanced cache check
        const cacheKey = `price_${symbol}`;
        const cached = this.getCachedData(cacheKey, CONFIG.CACHE.priceMaxAge);
        if (cached) {
            this.performanceMetrics.cacheHits++;
            CONFIG.log('debug', `📦 Cache hit for ${symbol} price`);
            return cached;
        }

        this.performanceMetrics.cacheMisses++;

        // Check rate limit
        if (!this.canMakeApiCall()) {
            // Return stale cache if available
            const staleCache = this.getCachedData(cacheKey, CONFIG.CACHE.priceMaxAge * 2);
            if (staleCache) {
                CONFIG.log('warn', `⚠️ Rate limited, using stale cache for ${symbol}`);
                return staleCache;
            }
            throw new Error(`Rate limit exceeded (${this.apiCalls}/${this.maxCallsPerMinute} calls/minute)`);
        }

        const twelveSymbol = this.symbols[symbol];
        if (!twelveSymbol) {
            throw new Error(`Unknown symbol: ${symbol}`);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced from 10s

        try {
            const response = await fetch(
                `${this.baseUrl}/quote?symbol=${twelveSymbol}&apikey=${this.apiKey}`,
                { 
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            const validation = CONFIG.validateApiResponse(data, ['close']);
            if (!validation.valid) {
                this.lastErrorCode = validation.code;
                throw new Error(validation.error);
            }
            
            this.trackApiCall();
            this.resetErrorCount();
            
            // Convert to our format with all available data
            const priceData = {
                symbol: symbol,
                price: parseFloat(data.close) || 0,
                change: parseFloat(data.change) || 0,
                changePercent: parseFloat(data.percent_change) || 0,
                timestamp: Date.now(),
                source: 'Twelve Data',
                high: parseFloat(data.high) || 0,
                low: parseFloat(data.low) || 0,
                open: parseFloat(data.open) || 0,
                volume: parseInt(data.volume) || 0,
                previousClose: parseFloat(data.previous_close) || 0
            };
            
            // Enhanced caching
            this.setCachedData(cacheKey, priceData);
            
            // Also cache as historical data point
            this.updateHistoricalCache(symbol, priceData);
            
            CONFIG.log('debug', `💰 ${symbol}: ${CONFIG.formatPrice(symbol, priceData.price)}`);
            
            return priceData;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                error.message = `Timeout getting price for ${symbol} (8s)`;
            }
            
            this.trackError(error);
            
            // Try to return stale cache on error
            const staleCache = this.getCachedData(cacheKey, CONFIG.CACHE.priceMaxAge * 3);
            if (staleCache) {
                CONFIG.log('warn', `⚠️ API error, using stale cache for ${symbol}`);
                return staleCache;
            }
            
            throw error;
        }
    }

    async getHistoricalData(symbol, period = '1h', limit = 100) {
        if (!this.isConnected) {
            throw new Error('Data feed not connected');
        }

        if (this.circuitBreakerOpen) {
            this.checkCircuitBreaker();
            if (this.circuitBreakerOpen) {
                throw new Error('Circuit breaker is open');
            }
        }

        // Enhanced cache check
        const cacheKey = `historical_${symbol}_${period}_${limit}`;
        const cached = this.getCachedData(cacheKey, CONFIG.CACHE.historicalMaxAge);
        if (cached) {
            this.performanceMetrics.cacheHits++;
            CONFIG.log('debug', `📦 Cache hit for ${symbol} historical data`);
            return cached;
        }

        this.performanceMetrics.cacheMisses++;

        if (!this.canMakeApiCall()) {
            // Return stale cache if available
            const staleCache = this.getCachedData(cacheKey, CONFIG.CACHE.historicalMaxAge * 2);
            if (staleCache) {
                CONFIG.log('warn', `⚠️ Rate limited, using stale historical cache for ${symbol}`);
                return staleCache;
            }
            throw new Error(`Rate limit exceeded`);
        }

        const twelveSymbol = this.symbols[symbol];
        if (!twelveSymbol) {
            throw new Error(`Unknown symbol: ${symbol}`);
        }

        const interval = period === '1h' ? '1h' : '1day';
        const outputsize = Math.min(limit, 500); // Reduced from 5000

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // Reduced from 15s

        try {
            const response = await fetch(
                `${this.baseUrl}/time_series?symbol=${twelveSymbol}&interval=${interval}&outputsize=${outputsize}&apikey=${this.apiKey}`,
                { 
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            const validation = CONFIG.validateApiResponse(data, ['values']);
            if (!validation.valid) {
                this.lastErrorCode = validation.code;
                throw new Error(validation.error);
            }
            
            if (!Array.isArray(data.values)) {
                throw new Error('Invalid historical data format');
            }
            
            this.trackApiCall();
            this.resetErrorCount();
            
            // Convert to our format with optimized parsing
            const bars = [];
            for (let i = 0; i < Math.min(data.values.length, limit); i++) {
                const bar = data.values[i];
                try {
                    bars.push({
                        timestamp: new Date(bar.datetime).getTime(),
                        open: parseFloat(bar.open) || 0,
                        high: parseFloat(bar.high) || 0,
                        low: parseFloat(bar.low) || 0,
                        close: parseFloat(bar.close) || 0,
                        volume: parseInt(bar.volume) || 0
                    });
                } catch (e) {
                    CONFIG.log('warn', 'Error parsing bar data:', e);
                }
            }
            
            bars.reverse(); // Most recent first
            
            const historicalData = {
                symbol: symbol,
                period: period,
                bars: bars,
                source: 'Twelve Data',
                timestamp: Date.now()
            };
            
            // Enhanced caching with longer TTL for historical data
            this.setCachedData(cacheKey, historicalData);
            
            CONFIG.log('debug', `📊 Historical data for ${symbol}: ${bars.length} bars`);
            
            return historicalData;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                error.message = `Timeout getting historical data for ${symbol}`;
            }
            
            this.trackError(error);
            
            // Try to return stale cache on error
            const staleCache = this.getCachedData(cacheKey, CONFIG.CACHE.historicalMaxAge * 3);
            if (staleCache) {
                CONFIG.log('warn', `⚠️ API error, using stale historical cache for ${symbol}`);
                return staleCache;
            }
            
            throw error;
        }
    }

    // Update historical cache with real-time data
    updateHistoricalCache(symbol, priceData) {
        const cacheKey = `historical_${symbol}_1h_100`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && cached.data && cached.data.bars) {
            // Add new price as latest bar
            const newBar = {
                timestamp: priceData.timestamp,
                open: priceData.open || priceData.price,
                high: priceData.high || priceData.price,
                low: priceData.low || priceData.price,
                close: priceData.price,
                volume: priceData.volume || 0
            };
            
            // Update the most recent bar if within same hour
            const lastBar = cached.data.bars[cached.data.bars.length - 1];
            const hourDiff = Math.floor((newBar.timestamp - lastBar.timestamp) / 3600000);
            
            if (hourDiff === 0) {
                // Update existing bar
                lastBar.close = newBar.close;
                lastBar.high = Math.max(lastBar.high, newBar.high);
                lastBar.low = Math.min(lastBar.low, newBar.low);
                lastBar.volume = newBar.volume;
            } else if (hourDiff > 0) {
                // Add new bar
                cached.data.bars.push(newBar);
                // Keep only last 100 bars
                if (cached.data.bars.length > 100) {
                    cached.data.bars.shift();
                }
            }
            
            this.performanceMetrics.apiCallsSaved++;
        }
    }

    // Enhanced cache management
    getCachedData(key, maxAge) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        const age = Date.now() - cached.timestamp;
        if (age > maxAge) {
            // Don't delete immediately - keep for stale cache fallback
            if (age > maxAge * 3) {
                this.cache.delete(key);
            }
            return null;
        }
        
        return cached.data;
    }

    setCachedData(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Smarter cache cleanup
        if (this.cache.size > CONFIG.CACHE.maxCacheSize) {
            // Remove oldest entries that are also expired
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            for (const [k, v] of entries) {
                const age = Date.now() - v.timestamp;
                if (age > CONFIG.CACHE.historicalMaxAge * 2) {
                    this.cache.delete(k);
                    if (this.cache.size <= CONFIG.CACHE.maxCacheSize * 0.8) {
                        break;
                    }
                }
            }
        }
    }

    // Error tracking and circuit breaker
    trackError(error) {
        this.errorCount++;
        this.lastErrorTime = Date.now();
        this.lastError = error.message;
        
        CONFIG.log('error', `API Error ${this.errorCount}:`, error.message);
        
        if (this.errorCount >= CONFIG.ERROR_HANDLING.circuitBreakerThreshold) {
            this.openCircuitBreaker();
        }
        
        this.handleConnectionError(error);
    }

    resetErrorCount() {
        if (this.errorCount > 0) {
            CONFIG.log('info', '✅ API errors cleared');
            this.errorCount = 0;
            this.hideErrorMessage();
        }
    }

    openCircuitBreaker() {
        this.circuitBreakerOpen = true;
        this.circuitBreakerOpenTime = Date.now();
        this.isConnected = false;
        
        CONFIG.log('error', '🚫 Circuit breaker opened');
        this.updateConnectionStatus('error');
        this.showErrorMessage(`Service unavailable (${this.errorCount} failures)`);
    }

    checkCircuitBreaker() {
        if (this.circuitBreakerOpen) {
            const timeOpen = Date.now() - this.circuitBreakerOpenTime;
            if (timeOpen >= CONFIG.ERROR_HANDLING.circuitBreakerTimeout) {
                this.circuitBreakerOpen = false;
                this.errorCount = 0;
                CONFIG.log('info', '🔄 Circuit breaker reset');
            }
        }
    }

    // Rate limiting with better tracking
    canMakeApiCall() {
        this.resetApiCallsIfNeeded();
        const buffer = CONFIG.TWELVE_DATA.rateLimitBuffer || 5;
        return this.apiCalls < (this.maxCallsPerMinute - buffer);
    }

    trackApiCall() {
        this.resetApiCallsIfNeeded();
        this.apiCalls++;
        CONFIG.log('debug', `📈 API calls: ${this.apiCalls}/${this.maxCallsPerMinute}`);
    }

    resetApiCallsIfNeeded() {
        const now = Date.now();
        if (now - this.lastResetTime >= 60000) {
            if (this.apiCalls > 0) {
                CONFIG.log('info', `📊 API calls in last minute: ${this.apiCalls}`);
            }
            this.apiCalls = 0;
            this.lastResetTime = now;
        }
    }

    // UI Error Handling
    handleConnectionError(error) {
        this.isConnected = false;
        this.lastError = error.message;
        
        const codeMatch = error.message.match(/(\d{3})/);
        this.lastErrorCode = codeMatch ? codeMatch[1] : 'Unknown';
        
        this.updateConnectionStatus('error');
        this.showErrorMessage(error.message);
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

    showErrorMessage(message) {
        const errorElement = document.getElementById('apiErrorMessage');
        const errorDescription = document.getElementById('errorDescription');
        const errorStatus = document.getElementById('errorStatus');
        const errorCode = document.getElementById('errorCode');
        const errorMessage = document.getElementById('errorMessage');
        const errorTime = document.getElementById('errorTime');
        
        if (errorElement && errorDescription) {
            errorDescription.textContent = message;
            
            if (errorStatus) errorStatus.textContent = this.isConnected ? 'Connected' : 'Disconnected';
            if (errorCode) errorCode.textContent = this.lastErrorCode || 'Unknown';
            if (errorMessage) errorMessage.textContent = this.lastError || message;
            if (errorTime) errorTime.textContent = new Date().toLocaleTimeString();
            
            errorElement.classList.add('show');
        }
    }

    hideErrorMessage() {
        const errorElement = document.getElementById('apiErrorMessage');
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }

    // Public methods
    async retryConnection() {
        CONFIG.log('info', '🔄 Retrying connection...');
        this.circuitBreakerOpen = false;
        this.errorCount = 0;
        return await this.initialize();
    }

    isHealthy() {
        return this.isConnected && !this.circuitBreakerOpen && this.canMakeApiCall();
    }

    getStats() {
        return {
            initialized: this.isInitialized,
            connected: this.isConnected,
            apiCalls: this.apiCalls,
            maxCalls: this.maxCallsPerMinute,
            cacheSize: this.cache.size,
            errorCount: this.errorCount,
            circuitBreakerOpen: this.circuitBreakerOpen,
            lastError: this.lastError,
            lastErrorCode: this.lastErrorCode,
            performance: this.performanceMetrics
        };
    }

    // Utility functions
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    disconnect() {
        this.isConnected = false;
        this.isInitialized = false;
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        CONFIG.log('info', '📡 Data feed disconnected');
    }
}

// Global functions for UI
window.retryConnection = async function() {
    if (window.dataFeed && typeof window.dataFeed.retryConnection === 'function') {
        try {
            const success = await window.dataFeed.retryConnection();
            if (success) {
                CONFIG.log('info', '✅ Connection retry successful');
            } else {
                CONFIG.log('error', '❌ Connection retry failed');
            }
        } catch (error) {
            CONFIG.log('error', '❌ Connection retry error:', error);
        }
    }
};

window.toggleErrorDetails = function() {
    const detailsElement = document.getElementById('errorTechnicalDetails');
    if (detailsElement) {
        detailsElement.classList.toggle('show');
    }
};

// Export for browser
if (typeof window !== 'undefined') {
    window.OptimizedDataFeed = OptimizedDataFeed;
}