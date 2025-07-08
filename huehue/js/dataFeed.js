// HueHue Live Data Feed - Firebase + Twelve Data Integration
class LiveDataFeed {
    constructor() {
        // API key will be loaded from Firebase
        this.apiKey = null;
        this.baseUrl = 'https://api.twelvedata.com';
        
        // API usage tracking (55 calls/minute limit)
        this.apiCalls = 0;
        this.lastResetTime = Date.now();
        this.maxCallsPerMinute = 55;
        
        // Cache for reducing API calls
        this.cache = new Map();
        this.priceCache = new Map();
        
        // Symbol mapping for Twelve Data
        this.symbols = {
            'XAUUSD': 'XAU/USD',
            'USDJPY': 'USD/JPY'
        };
        
        // Firebase storage reference
        this.firebaseStorage = null;
        
        // Fallback mode
        this.useFallback = false;
        this.isInitialized = false;
        this.updateInterval = null;
        
        console.log('💰 Live Data Feed initialized (Firebase + Twelve Data)');
    }

    // Initialize the live data feed with Firebase
    async initialize() {
        try {
            console.log('🔌 Connecting to Firebase + Twelve Data...');
            
            // Wait for Firebase to be ready
            await this.waitForFirebase();
            
            // Load API key from Firebase
            await this.loadApiKeyFromFirebase();
            
            if (!this.apiKey) {
                console.warn('⚠️ No API key found, will prompt user');
            }
            
            // Test API connection with timeout
            const testResult = await this.testConnectionWithTimeout();
            
            if (!testResult.success) {
                console.warn('⚠️ Twelve Data connection failed, enabling fallback mode');
                console.warn('Error:', testResult.error);
                this.useFallback = true;
                
                // Initialize fallback mode
                await this.initializeFallbackMode();
            } else {
                console.log('✅ Twelve Data connection successful');
                console.log(`📊 Plan: ${testResult.plan} | Calls/min: ${this.maxCallsPerMinute}`);
                this.useFallback = false;
            }
            
            // Load initial data (real or simulated)
            await this.loadInitialData();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            this.isInitialized = true;
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize data feed:', error);
            
            // Enable fallback mode as last resort
            console.log('🔄 Enabling fallback simulation mode...');
            this.useFallback = true;
            await this.initializeFallbackMode();
            
            this.isInitialized = true;
            return true; // Don't fail completely
        }
    }

    // Wait for Firebase to be ready
    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds max wait
        
        while (!window.firebaseStorage && attempts < maxAttempts) {
            await this.sleep(100);
            attempts++;
        }
        
        if (window.firebaseStorage) {
            this.firebaseStorage = window.firebaseStorage;
            console.log('🔥 Firebase storage connected');
        } else {
            throw new Error('Firebase not available after 3 seconds');
        }
    }

    // Load API key from Firebase
    async loadApiKeyFromFirebase() {
        try {
            if (!this.firebaseStorage) {
                throw new Error('Firebase storage not available');
            }
            
            // Try to get API key from Firebase
            let apiKey = await this.firebaseStorage.getApiKey();
            
            // If not found, prompt user and save
            if (!apiKey) {
                apiKey = prompt('🔑 Enter your Twelve Data API key (will be saved securely to Firebase):');
                if (apiKey && apiKey.trim()) {
                    const saved = await this.firebaseStorage.saveApiKey(apiKey.trim());
                    if (saved) {
                        console.log('🔥 API key saved to Firebase');
                    }
                }
            }
            
            this.apiKey = apiKey;
            console.log('🔑 API key loaded:', this.apiKey ? 'Success ✅' : 'Missing ❌');
            
        } catch (error) {
            console.warn('⚠️ Could not load API key from Firebase:', error.message);
            this.apiKey = null;
        }
    }

    // Test API connection with timeout
    async testConnectionWithTimeout() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.code && data.code !== 200) {
                throw new Error(data.message || `API Error ${data.code}`);
            }
            
            this.trackApiCall();
            
            return {
                success: true,
                plan: 'Grow Plan',
                data: data
            };
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            let errorMessage = error.message;
            if (error.name === 'AbortError') {
                errorMessage = 'Connection timeout (10s)';
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    // Initialize fallback simulation mode
    async initializeFallbackMode() {
        console.log('🎭 Initializing simulation mode...');
        
        // Initialize with realistic prices
        this.simulatedPrices = {
            XAUUSD: { 
                current: 2085.34, 
                previous: 2072.89,
                high: 2095.67,
                low: 2078.12,
                open: 2081.45
            },
            USDJPY: { 
                current: 150.12, 
                previous: 150.46,
                high: 150.78,
                low: 149.89,
                open: 150.23
            }
        };
        
        console.log('✅ Simulation mode ready');
    }

    // Load initial data for both symbols
    async loadInitialData() {
        console.log('📥 Loading initial data...');
        
        for (const [symbol, twelveSymbol] of Object.entries(this.symbols)) {
            try {
                // Get current price
                const priceData = await this.getRealTimePrice(symbol);
                console.log(`✅ ${symbol}: ${this.formatPrice(symbol, priceData.price)} (${priceData.source})`);
                
                // Get historical data for indicators
                const historicalData = await this.getHistoricalData(symbol, '1h', 100);
                console.log(`📊 ${symbol}: ${historicalData.bars.length} historical bars (${historicalData.source})`);
                
            } catch (error) {
                console.warn(`⚠️ Failed to load ${symbol}:`, error.message);
            }
        }
    }

    // Start real-time update loop
    startRealTimeUpdates() {
        // Update prices every 10 seconds (real) or 2 seconds (simulation)
        const updateInterval = this.useFallback ? 2000 : 10000;
        
        this.updateInterval = setInterval(async () => {
            try {
                await this.updateAllPrices();
            } catch (error) {
                console.warn('Price update failed:', error.message);
            }
        }, updateInterval);
        
        console.log(`🔄 Real-time updates started (${updateInterval/1000}s interval, ${this.useFallback ? 'simulated' : 'live'} mode)`);
    }

    // Update all symbol prices
    async updateAllPrices() {
        if (!this.useFallback && !this.canMakeApiCall()) {
            console.log('⏳ Rate limit reached, skipping update');
            return;
        }
        
        for (const symbol of Object.keys(this.symbols)) {
            try {
                const priceData = await this.getRealTimePrice(symbol);
                
                // Dispatch price update event
                window.dispatchEvent(new CustomEvent('huehue-price-update', {
                    detail: { symbol, priceData }
                }));
                
                // Small delay between calls (only for real API)
                if (!this.useFallback) {
                    await this.sleep(100);
                }
                
            } catch (error) {
                console.warn(`Failed to update ${symbol}:`, error.message);
            }
        }
    }

    // Get real-time price (real or simulated)
    async getRealTimePrice(symbol) {
        if (this.useFallback) {
            return this.getSimulatedPrice(symbol);
        }
        
        // Check cache first (30 second cache)
        const cacheKey = `price_${symbol}`;
        const cached = this.getCachedData(cacheKey, 30000);
        if (cached) {
            return cached;
        }
        
        if (!this.canMakeApiCall()) {
            throw new Error('Rate limit exceeded');
        }
        
        const twelveSymbol = this.symbols[symbol];
        if (!twelveSymbol) {
            throw new Error(`Unknown symbol: ${symbol}`);
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
            
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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.code && data.code !== 200) {
                throw new Error(data.message || 'API Error');
            }
            
            this.trackApiCall();
            
            // Convert to our format
            const priceData = {
                symbol: symbol,
                price: parseFloat(data.close),
                change: parseFloat(data.change),
                changePercent: parseFloat(data.percent_change),
                timestamp: Date.now(),
                source: 'Twelve Data',
                high: parseFloat(data.high),
                low: parseFloat(data.low),
                open: parseFloat(data.open),
                volume: parseInt(data.volume) || 0
            };
            
            // Cache the result
            this.setCachedData(cacheKey, priceData);
            
            console.log(`💰 ${symbol}: ${this.formatPrice(symbol, priceData.price)} (${priceData.change > 0 ? '+' : ''}${priceData.change.toFixed(2)})`);
            
            return priceData;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn(`⏰ Timeout getting price for ${symbol}, switching to fallback`);
                this.useFallback = true;
                return this.getSimulatedPrice(symbol);
            }
            
            console.error(`Failed to get price for ${symbol}:`, error);
            throw error;
        }
    }

    // Get simulated price data
    getSimulatedPrice(symbol) {
        if (!this.simulatedPrices[symbol]) {
            throw new Error(`No simulation data for ${symbol}`);
        }
        
        const simData = this.simulatedPrices[symbol];
        
        // Simulate realistic price movements
        const volatility = symbol === 'XAUUSD' ? 1.5 : 0.08;
        const change = (Math.random() - 0.5) * volatility;
        
        // Update simulated price
        simData.previous = simData.current;
        simData.current += change;
        
        // Keep realistic ranges
        if (symbol === 'XAUUSD') {
            simData.current = Math.max(2050, Math.min(2120, simData.current));
        } else {
            simData.current = Math.max(148, Math.min(152, simData.current));
        }
        
        const priceChange = simData.current - simData.previous;
        const changePercent = (priceChange / simData.previous) * 100;
        
        return {
            symbol: symbol,
            price: simData.current,
            change: priceChange,
            changePercent: changePercent,
            timestamp: Date.now(),
            source: 'Simulation',
            high: simData.high,
            low: simData.low,
            open: simData.open,
            volume: Math.floor(Math.random() * 50000) + 10000
        };
    }

    // Get historical data (real or simulated)
    async getHistoricalData(symbol, period = '1h', limit = 100) {
        if (this.useFallback) {
            return this.generateSimulatedHistoricalData(symbol, period, limit);
        }
        
        // Check cache first (5 minute cache)
        const cacheKey = `historical_${symbol}_${period}_${limit}`;
        const cached = this.getCachedData(cacheKey, 300000);
        if (cached) {
            return cached;
        }
        
        if (!this.canMakeApiCall()) {
            console.warn('Rate limit reached, using simulated historical data');
            return this.generateSimulatedHistoricalData(symbol, period, limit);
        }
        
        const twelveSymbol = this.symbols[symbol];
        if (!twelveSymbol) {
            throw new Error(`Unknown symbol: ${symbol}`);
        }
        
        // Convert period to Twelve Data format
        const interval = period === '1h' ? '1h' : '1day';
        const outputsize = Math.min(limit, 5000); // Twelve Data limit
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for historical
            
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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.code && data.code !== 200) {
                throw new Error(data.message || 'API Error');
            }
            
            if (!data.values || !Array.isArray(data.values)) {
                throw new Error('Invalid historical data format');
            }
            
            this.trackApiCall();
            
            // Convert to our format
            const bars = data.values
                .slice(0, limit)
                .map(bar => ({
                    timestamp: new Date(bar.datetime).getTime(),
                    open: parseFloat(bar.open),
                    high: parseFloat(bar.high),
                    low: parseFloat(bar.low),
                    close: parseFloat(bar.close),
                    volume: parseInt(bar.volume) || 0
                }))
                .reverse(); // Most recent first
            
            const historicalData = {
                symbol: symbol,
                period: period,
                bars: bars,
                source: 'Twelve Data'
            };
            
            // Cache the result
            this.setCachedData(cacheKey, historicalData);
            
            console.log(`📊 Historical data for ${symbol}: ${bars.length} bars`);
            
            return historicalData;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn(`⏰ Timeout getting historical data for ${symbol}, using simulation`);
            }
            
            console.warn(`Using simulated historical data for ${symbol}:`, error.message);
            return this.generateSimulatedHistoricalData(symbol, period, limit);
        }
    }

    // Generate simulated historical data
    generateSimulatedHistoricalData(symbol, period, limit) {
        const currentPrice = symbol === 'XAUUSD' ? 2085 : 150;
        const volatility = symbol === 'XAUUSD' ? 3 : 0.2;
        
        const bars = [];
        let price = currentPrice;
        const now = Date.now();
        const intervalMs = period === '1h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        
        for (let i = limit - 1; i >= 0; i--) {
            const timestamp = now - (i * intervalMs);
            const change = (Math.random() - 0.5) * volatility;
            
            const open = price;
            const close = price + change;
            const high = Math.max(open, close) + Math.random() * (volatility / 4);
            const low = Math.min(open, close) - Math.random() * (volatility / 4);
            
            bars.push({
                timestamp: timestamp,
                open: open,
                high: high,
                low: low,
                close: close,
                volume: Math.floor(Math.random() * 50000) + 10000
            });
            
            price = close;
        }
        
        return {
            symbol: symbol,
            period: period,
            bars: bars,
            source: 'Simulation'
        };
    }

    // Rate limiting functions
    canMakeApiCall() {
        this.resetApiCallsIfNeeded();
        return this.apiCalls < this.maxCallsPerMinute;
    }

    trackApiCall() {
        this.resetApiCallsIfNeeded();
        this.apiCalls++;
        console.log(`📈 API calls: ${this.apiCalls}/${this.maxCallsPerMinute}`);
    }

    resetApiCallsIfNeeded() {
        const now = Date.now();
        if (now - this.lastResetTime >= 60000) { // 1 minute
            this.apiCalls = 0;
            this.lastResetTime = now;
            console.log('🔄 API call counter reset');
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
        if (this.cache.size > 100) {
            const oldest = Math.min(...Array.from(this.cache.values()).map(v => v.timestamp));
            for (const [k, v] of this.cache.entries()) {
                if (v.timestamp === oldest) {
                    this.cache.delete(k);
                    break;
                }
            }
        }
    }

    // Utility functions
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    formatPrice(symbol, price) {
        if (symbol === 'XAUUSD') {
            return `$${price.toFixed(2)}`;
        } else if (symbol === 'USDJPY') {
            return `¥${price.toFixed(3)}`;
        }
        return price.toFixed(4);
    }

    // Health check
    isHealthy() {
        return this.isInitialized && (this.useFallback || this.canMakeApiCall());
    }

    // Get statistics
    getStats() {
        return {
            initialized: this.isInitialized,
            useFallback: this.useFallback,
            apiCalls: this.apiCalls,
            maxCalls: this.maxCallsPerMinute,
            cacheSize: this.cache.size,
            canMakeCall: this.canMakeApiCall(),
            mode: this.useFallback ? 'Simulation' : 'Live Data'
        };
    }

    // Cleanup
    disconnect() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.isInitialized = false;
        console.log('📡 Live data feed disconnected');
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.LiveDataFeed = LiveDataFeed;
}