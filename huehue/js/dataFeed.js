// HueHue Optimized Live Data Feed - No Demo Mode, Real Error Handling
class OptimizedDataFeed {
    constructor() {
        this.baseUrl = CONFIG.TWELVE_DATA.baseUrl;
        this.apiKey = null; // Will be loaded from Firebase
        
        // API tracking
        this.apiCalls = 0;
        this.lastResetTime = Date.now();
        this.maxCallsPerMinute = CONFIG.TWELVE_DATA.maxCallsPerMinute;
        
        // Cache system
        this.cache = new Map();
        
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
        
        CONFIG.log('info', '📡 Optimized Data Feed initialized');
    }

    async initialize() {
        try {
            CONFIG.log('info', '🔌 Initializing data feed...');
            this.updateConnectionStatus('connecting');
            
            // Wait for Firebase
            await this.waitForFirebase();
            
            // Load API key from Firebase
            await this.loadApiKeyFromFirebase();
            
            if (!this.apiKey) {
                throw new Error('No API key available');
            }
            
            // Test connection with detailed error handling
            await this.testConnection();
            
            this.isConnected = true;
            this.isInitialized = true;
            this.hideErrorMessage();
            this.updateConnectionStatus('connected');
            
            CONFIG.log('info', '✅ Data feed initialized successfully');
            return true;
            
        } catch (error) {
            CONFIG.log('error', '❌ Data feed initialization failed:', error);
            this.handleConnectionError(error);
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
            throw new Error('Firebase not available after 3 seconds');
        }
    }

    async loadApiKeyFromFirebase() {
        try {
            if (!this.firebaseStorage) {
                throw new Error('Firebase storage not available');
            }
            
            let apiKey = await this.firebaseStorage.getApiKey();
            
            if (!apiKey) {
                apiKey = prompt('🔑 Enter your Twelve Data API key (will be saved securely):');
                if (apiKey && apiKey.trim()) {
                    await this.firebaseStorage.saveApiKey(apiKey.trim());
                    CONFIG.log('info', '🔥 API key saved to Firebase');
                }
            }
            
            this.apiKey = apiKey;
            CONFIG.log('info', '🔑 API key loaded:', this.apiKey ? 'Success ✅' : 'Missing ❌');
            
        } catch (error) {
            CONFIG.log('warn', '⚠️ Could not load API key from Firebase:', error.message);
            // Fallback to config
            this.apiKey = CONFIG.TWELVE_DATA.apiKey;
            CONFIG.log('warn', 'Using fallback API key from config');
        }
    }

    async testConnection() {
        if (this.circuitBreakerOpen) {
            this.checkCircuitBreaker();
            if (this.circuitBreakerOpen) {
                throw new Error('Circuit breaker is open - too many recent failures');
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TWELVE_DATA.timeoutMs);
        
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
            
            // Handle HTTP errors
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            
            // Validate API response
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
                throw new Error(`Connection timeout (${CONFIG.TWELVE_DATA.timeoutMs / 1000}s)`);
            }
            
            this.trackError(error);
            throw error;
        }
    }

    async getRealTimePrice(symbol) {
        if (!this.isConnected) {
            throw new Error('Data feed not connected - call initialize() first');
        }

        if (this.circuitBreakerOpen) {
            this.checkCircuitBreaker();
            if (this.circuitBreakerOpen) {
                throw new Error('Circuit breaker is open - service temporarily unavailable');
            }
        }

        // Check cache first
        const cacheKey = `price_${symbol}`;
        const cached = this.getCachedData(cacheKey, CONFIG.CACHE.priceMaxAge);
        if (cached) {
            CONFIG.log('debug', `📦 Using cached price for ${symbol}`);
            return cached;
        }

        // Check rate limit
        if (!this.canMakeApiCall()) {
            throw new Error(`Rate limit exceeded (${this.apiCalls}/${this.maxCallsPerMinute} calls/minute)`);
        }

        const twelveSymbol = this.symbols[symbol];
        if (!twelveSymbol) {
            throw new Error(`Unknown symbol: ${symbol}`);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TWELVE_DATA.timeoutMs);

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
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            
            // Validate response
            const validation = CONFIG.validateApiResponse(data, ['close', 'change']);
            if (!validation.valid) {
                this.lastErrorCode = validation.code;
                throw new Error(validation.error);
            }
            
            this.trackApiCall();
            this.resetErrorCount();
            
            // Convert to our format
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
                volume: parseInt(data.volume) || 0
            };
            
            // Cache the result
            this.setCachedData(cacheKey, priceData);
            
            CONFIG.log('debug', `💰 ${symbol}: ${CONFIG.formatPrice(symbol, priceData.price)}`);
            
            return priceData;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                error.message = `Timeout getting price for ${symbol} (${CONFIG.TWELVE_DATA.timeoutMs / 1000}s)`;
            }
            
            this.trackError(error);
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
                throw new Error('Circuit breaker is open - service temporarily unavailable');
            }
        }

        // Check cache first
        const cacheKey = `historical_${symbol}_${period}_${limit}`;
        const cached = this.getCachedData(cacheKey, CONFIG.CACHE.historicalMaxAge);
        if (cached) {
            CONFIG.log('debug', `📦 Using cached historical data for ${symbol}`);
            return cached;
        }

        if (!this.canMakeApiCall()) {
            throw new Error(`Rate limit exceeded (${this.apiCalls}/${this.maxCallsPerMinute} calls/minute)`);
        }

        const twelveSymbol = this.symbols[symbol];
        if (!twelveSymbol) {
            throw new Error(`Unknown symbol: ${symbol}`);
        }

        const interval = period === '1h' ? '1h' : '1day';
        const outputsize = Math.min(limit, 5000);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TWELVE_DATA.timeoutMs * 1.5);

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
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            
            // Validate response
            const validation = CONFIG.validateApiResponse(data, ['values']);
            if (!validation.valid) {
                this.lastErrorCode = validation.code;
                throw new Error(validation.error);
            }
            
            if (!Array.isArray(data.values)) {
                throw new Error('Invalid historical data format - values is not an array');
            }
            
            this.trackApiCall();
            this.resetErrorCount();
            
            // Convert to our format
            const bars = data.values
                .slice(0, limit)
                .map(bar => {
                    try {
                        return {
                            timestamp: new Date(bar.datetime).getTime(),
                            open: parseFloat(bar.open) || 0,
                            high: parseFloat(bar.high) || 0,
                            low: parseFloat(bar.low) || 0,
                            close: parseFloat(bar.close) || 0,
                            volume: parseInt(bar.volume) || 0
                        };
                    } catch (e) {
                        CONFIG.log('warn', 'Error parsing bar data:', bar);
                        return null;
                    }
                })
                .filter(bar => bar !== null)
                .reverse(); // Most recent first
            
            const historicalData = {
                symbol: symbol,
                period: period,
                bars: bars,
                source: 'Twelve Data'
            };
            
            // Cache the result
            this.setCachedData(cacheKey, historicalData);
            
            CONFIG.log('debug', `📊 Historical data for ${symbol}: ${bars.length} bars`);
            
            return historicalData;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                error.message = `Timeout getting historical data for ${symbol}`;
            }
            
            this.trackError(error);
            throw error;
        }
    }

    // Error tracking and circuit breaker
    trackError(error) {
        this.errorCount++;
        this.lastErrorTime = Date.now();
        this.lastError = error.message;
        
        CONFIG.log('error', `API Error ${this.errorCount}:`, error.message);
        
        // Open circuit breaker if too many errors
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
        
        CONFIG.log('error', '🚫 Circuit breaker opened - too many API failures');
        this.updateConnectionStatus('error');
        this.showErrorMessage(`Service temporarily unavailable (${this.errorCount} consecutive failures)`);
    }

    checkCircuitBreaker() {
        if (this.circuitBreakerOpen) {
            const timeOpen = Date.now() - this.circuitBreakerOpenTime;
            if (timeOpen >= CONFIG.ERROR_HANDLING.circuitBreakerTimeout) {
                this.circuitBreakerOpen = false;
                this.errorCount = 0;
                CONFIG.log('info', '🔄 Circuit breaker reset - retrying connection');
            }
        }
    }

    // Rate limiting
    canMakeApiCall() {
        this.resetApiCallsIfNeeded();
        return this.apiCalls < this.maxCallsPerMinute;
    }

    trackApiCall() {
        this.resetApiCallsIfNeeded();
        this.apiCalls++;
        CONFIG.log('debug', `📈 API calls: ${this.apiCalls}/${this.maxCallsPerMinute}`);
    }

    resetApiCallsIfNeeded() {
        const now = Date.now();
        if (now - this.lastResetTime >= 60000) {
            this.apiCalls = 0;
            this.lastResetTime = now;
            CONFIG.log('debug', '🔄 API call counter reset');
        }
    }

    // Cache management
    getCachedData(key, maxAge) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > maxAge) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    setCachedData(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Clean old cache entries
        if (this.cache.size > CONFIG.CACHE.maxCacheSize) {
            const oldest = Math.min(...Array.from(this.cache.values()).map(v => v.timestamp));
            for (const [k, v] of this.cache.entries()) {
                if (v.timestamp === oldest) {
                    this.cache.delete(k);
                    break;
                }
            }
        }
    }

    // UI Error Handling
    handleConnectionError(error) {
        this.isConnected = false;
        this.lastError = error.message;
        
        // Extract error code if available
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

    // Public methods for retrying
    async retryConnection() {
        CONFIG.log('info', '🔄 Retrying connection...');
        this.circuitBreakerOpen = false;
        this.errorCount = 0;
        return await this.initialize();
    }

    // Health check
    isHealthy() {
        return this.isConnected && !this.circuitBreakerOpen && this.canMakeApiCall();
    }

    // Get statistics
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
            lastErrorCode: this.lastErrorCode
        };
    }

    // Utility functions
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Cleanup
    disconnect() {
        this.isConnected = false;
        this.isInitialized = false;
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