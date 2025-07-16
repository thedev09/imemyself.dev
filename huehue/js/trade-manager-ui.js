// trade-manager-ui.js - FIXED VERSION
class TradeManagerUI {
    constructor() {
        this.firebaseStorage = null;
        this.activeTrades = [];
        this.tradeHistory = [];
        this.updateInterval = null;
    }

    async initialize() {
        console.log('🚀 Initializing Trade Manager UI...');
        
        // Wait for Firebase
        await this.waitForFirebase();
        
        // Load initial data
        await this.loadActiveTrades();
        await this.loadTradeHistory();
        await this.loadPerformanceStats();
        
        // Setup filters
        this.setupFilters();
        
        // Start auto-refresh for active trades
        this.startAutoRefresh();
        
        console.log('✅ Trade Manager UI ready');
    }

    async waitForFirebase() {
        let attempts = 0;
        while (!window.firebaseStorage && attempts < 50) {
            await this.sleep(100);
            attempts++;
        }
        
        if (window.firebaseStorage) {
            this.firebaseStorage = window.firebaseStorage;
        } else {
            throw new Error('Firebase not available');
        }
    }

    async loadActiveTrades() {
        try {
            const container = document.getElementById('activeTradesContainer');
            container.innerHTML = '<div class="loading-spinner">Loading active trades...</div>';
            
            const activeTrades = [];
            const engines = ['v1', 'v2', 'v3'];
            
            for (const engine of engines) {
                try {
                    console.log(`🔍 Loading active trades for ${engine}...`);
                    
                    // Get all documents and filter manually for better debugging
                    const tradesCollection = this.firebaseStorage.collection(this.firebaseStorage.db, `active_trades_${engine}`);
                    const snapshot = await this.firebaseStorage.getDocs(tradesCollection);
                    
                    console.log(`📊 Found ${snapshot.size} total documents in active_trades_${engine}`);
                    
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        console.log(`📈 ${engine} trade ${doc.id}:`, {
                            symbol: data.symbol,
                            status: data.status,
                            direction: data.direction,
                            entry: data.entry,
                            currentPrice: data.currentPrice
                        });
                        
                        // Only include ACTIVE trades (check current price vs SL/TP)
                        if (!data.status || data.status === 'ACTIVE') {
                            // Double-check if trade should still be active
                            const shouldBeActive = this.validateTradeStatus(data);
                            if (shouldBeActive) {
                                activeTrades.push({ 
                                    id: doc.id, 
                                    ...data,
                                    engine: engine 
                                });
                                console.log(`✅ Added active trade: ${data.symbol} ${data.direction}`);
                            } else {
                                console.log(`⚠️ Trade ${doc.id} should be closed but still marked as ACTIVE`);
                            }
                        }
                    });
                    
                } catch (error) {
                    console.error(`❌ Error loading ${engine} trades:`, error);
                }
            }
            
            console.log(`✅ Total valid active trades: ${activeTrades.length}`);
            
            this.activeTrades = activeTrades;
            this.renderActiveTrades();
            
        } catch (error) {
            console.error('❌ Error loading active trades:', error);
            document.getElementById('activeTradesContainer').innerHTML = 
                '<div class="no-trades">Error loading active trades: ' + error.message + '</div>';
        }
    }

    // Validate if a trade should still be active based on current price vs SL/TP
    validateTradeStatus(trade) {
        if (!trade.currentPrice || !trade.entry || !trade.stopLoss || !trade.takeProfit) {
            return true; // Can't validate, assume active
        }
        
        const direction = trade.direction || trade.action || 'BUY';
        const current = trade.currentPrice;
        const sl = trade.stopLoss;
        const tp = trade.takeProfit;
        
        console.log(`🔍 Validating ${trade.symbol}: Current=${current}, SL=${sl}, TP=${tp}, Direction=${direction}`);
        
        if (direction === 'BUY') {
            if (current <= sl) {
                console.log(`❌ BUY trade hit SL: ${current} <= ${sl}`);
                return false; // Hit stop loss
            }
            if (current >= tp) {
                console.log(`✅ BUY trade hit TP: ${current} >= ${tp}`);
                return false; // Hit take profit
            }
        } else if (direction === 'SELL') {
            if (current >= sl) {
                console.log(`❌ SELL trade hit SL: ${current} >= ${sl}`);
                return false; // Hit stop loss
            }
            if (current <= tp) {
                console.log(`✅ SELL trade hit TP: ${current} <= ${tp}`);
                return false; // Hit take profit
            }
        }
        
        console.log(`✅ Trade still active`);
        return true; // Still active
    }

    // Updated renderActiveTrades method with your exact mobile design
renderActiveTrades() {
    const container = document.getElementById('activeTradesContainer');
    
    console.log(`🎨 Rendering ${this.activeTrades.length} active trades...`);
    
    if (this.activeTrades.length === 0) {
        container.innerHTML = '<div class="no-trades">No active trades found</div>';
        return;
    }
    
    const isMobile = window.innerWidth <= 768;
    
    container.innerHTML = this.activeTrades.map(trade => {
        console.log(`🏗️ Rendering trade:`, trade);
        
        const direction = (trade.direction || trade.action || 'BUY').toLowerCase();
        const currentPrice = trade.currentPrice || trade.price || trade.entry || 0;
        const pnl = this.calculatePnL(trade, currentPrice);
        const progress = this.calculateProgress(trade, currentPrice);
        const openTime = trade.openTime || Date.now();
        
        if (isMobile) {
            // Your exact mobile design
            return `
                <div class="active-trade-card ${direction}">
                    <div class="trade-header">
                        <div class="trade-symbol">${trade.symbol || 'N/A'}</div>
                        <div class="trade-header-right">
                            <span class="engine-stat ${trade.engine}">${(trade.engine || 'UNK').toUpperCase()}</span>
                            <div class="trade-direction ${direction}">${(trade.direction || trade.action || 'N/A').toUpperCase()}</div>
                        </div>
                    </div>
                    
                    <div class="trade-details">
                        <div class="detail-item">
                            <div class="detail-label">Entry</div>
                            <div class="detail-value">${this.formatPrice(trade.symbol, trade.entry || 0)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Current</div>
                            <div class="detail-value">${this.formatPrice(trade.symbol, currentPrice)}</div>
                        </div>
                    </div>
                    
                    <div class="pnl-display">
                        <div class="pnl-value ${pnl.pips >= 0 ? 'profit' : 'loss'}">
                            ${pnl.pips >= 0 ? '+' : ''}${pnl.pips.toFixed(1)} pips
                        </div>
                    </div>
                    
                    <div class="trade-progress">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                        <div class="progress-markers">
                            <span class="marker">SL</span>
                            <span class="marker" style="color: #00ff88;">TP</span>
                        </div>
                    </div>
                    
                    <div class="trade-details">
                        <div class="detail-item">
                            <div class="detail-label">Stop Loss</div>
                            <div class="detail-value" style="color: #ff4757;">
                                ${this.formatPrice(trade.symbol, trade.stopLoss || 0)}
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Take Profit</div>
                            <div class="detail-value" style="color: #00ff88;">
                                ${this.formatPrice(trade.symbol, trade.takeProfit || 0)}
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Duration</div>
                            <div class="detail-value">${this.formatDuration(Date.now() - openTime)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Confidence</div>
                            <div class="detail-value">${trade.confidence || 0}%</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Desktop layout (unchanged)
            return `
                <div class="active-trade-card ${direction}">
                    <div class="trade-header">
                        <div>
                            <div class="trade-symbol">${trade.symbol || 'N/A'}</div>
                            <span class="engine-stat ${trade.engine}">${(trade.engine || 'UNK').toUpperCase()}</span>
                        </div>
                        <div class="trade-direction ${direction}">${(trade.direction || trade.action || 'N/A').toUpperCase()}</div>
                    </div>
                    
                    <div class="trade-details">
                        <div class="detail-item">
                            <div class="detail-label">Entry</div>
                            <div class="detail-value">${this.formatPrice(trade.symbol, trade.entry || 0)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Current</div>
                            <div class="detail-value">${this.formatPrice(trade.symbol, currentPrice)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Duration</div>
                            <div class="detail-value">${this.formatDuration(Date.now() - openTime)}</div>
                        </div>
                    </div>
                    
                    <div class="pnl-display">
                        <div class="pnl-value ${pnl.pips >= 0 ? 'profit' : 'loss'}">
                            ${pnl.pips >= 0 ? '+' : ''}${pnl.pips.toFixed(1)} pips
                        </div>
                        <div class="pnl-percentage">
                            ${pnl.percentage >= 0 ? '+' : ''}${pnl.percentage.toFixed(2)}%
                        </div>
                    </div>
                    
                    <div class="trade-progress">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                        <div class="progress-markers">
                            <span class="marker">SL</span>
                            <span class="marker" style="color: #00ff88;">TP</span>
                        </div>
                    </div>
                    
                    <div class="trade-details" style="margin-top: 15px;">
                        <div class="detail-item">
                            <div class="detail-label">Stop Loss</div>
                            <div class="detail-value" style="color: #ff4757;">
                                ${this.formatPrice(trade.symbol, trade.stopLoss || 0)}
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Take Profit</div>
                            <div class="detail-value" style="color: #00ff88;">
                                ${this.formatPrice(trade.symbol, trade.takeProfit || 0)}
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Confidence</div>
                            <div class="detail-value">${trade.confidence || 0}%</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');
    
    console.log('✅ Active trades rendered successfully');
}

    async loadTradeHistory() {
        try {
            const container = document.getElementById('tradeHistoryContainer');
            container.innerHTML = '<div class="loading-spinner">Loading trade history...</div>';
            
            console.log('📥 Loading trade history...');
            
            const historyQuery = this.firebaseStorage.query(
                this.firebaseStorage.collection(this.firebaseStorage.db, 'trade_history'),
                this.firebaseStorage.orderBy('closeTime', 'desc'),
                this.firebaseStorage.limit(50)
            );
            
            const snapshot = await this.firebaseStorage.getDocs(historyQuery);
            this.tradeHistory = [];
            
            console.log(`📊 Found ${snapshot.size} trade history records`);
            
            snapshot.forEach(doc => {
                this.tradeHistory.push({ id: doc.id, ...doc.data() });
            });
            
            this.renderTradeHistory();
            
        } catch (error) {
            console.error('❌ Error loading trade history:', error);
            document.getElementById('tradeHistoryContainer').innerHTML = 
                '<div class="no-trades">Error loading trade history: ' + error.message + '</div>';
        }
    }

    // Updated renderTradeHistory method with better mobile layout
renderTradeHistory(filteredTrades = null) {
    const container = document.getElementById('tradeHistoryContainer');
    const trades = filteredTrades || this.tradeHistory;
    
    if (trades.length === 0) {
        container.innerHTML = '<div class="no-trades">No trade history found</div>';
        return;
    }
    
    const isMobile = window.innerWidth <= 768;
    
    container.innerHTML = trades.map(trade => {
        const isProfit = (trade.finalPnLPips || 0) > 0;
        const closeDate = new Date(trade.closeTime || Date.now());
        
        if (isMobile) {
            // Mobile layout with proper left-right alignment
            return `
                <div class="history-trade-card ${isProfit ? 'profit' : 'loss'}" 
                     onclick="alert('Trade Details:\\n\\nSymbol: ${trade.symbol}\\nDirection: ${trade.direction || trade.action}\\nEngine: ${trade.engine}\\nEntry: ${this.formatPrice(trade.symbol, trade.entry)}\\nExit: ${this.formatPrice(trade.symbol, trade.closePrice)}\\nP&L: ${(trade.finalPnLPips || 0).toFixed(1)} pips (${(trade.finalPnLPercentage || 0).toFixed(2)}%)\\nDuration: ${this.formatDuration(trade.duration || 0)}\\nReason: ${this.formatExitReason(trade.status)}')">
                    
                    <div class="mobile-trade-row">
                        <span class="mobile-trade-label">Symbol</span>
                        <span class="mobile-trade-value symbol">${trade.symbol}</span>
                    </div>
                    
                    <div class="mobile-trade-row">
                        <span class="mobile-trade-label">Date</span>
                        <span class="mobile-trade-value date">${closeDate.toLocaleDateString()} ${closeDate.toLocaleTimeString()}</span>
                    </div>
                    
                    <div class="mobile-trade-row">
                        <span class="mobile-trade-label">Direction</span>
                        <span class="trade-direction ${(trade.direction || trade.action || 'buy').toLowerCase()}">
                            ${(trade.direction || trade.action || 'N/A').toUpperCase()}
                        </span>
                    </div>
                    
                    <div class="mobile-trade-row">
                        <span class="mobile-trade-label">Engine</span>
                        <span class="engine-stat ${trade.engine}">${(trade.engine || 'UNK').toUpperCase()}</span>
                    </div>
                    
                    <div class="mobile-trade-row">
                        <span class="mobile-trade-label">P&L</span>
                        <span class="mobile-trade-value pips-only" style="color: ${isProfit ? '#00ff88' : '#ff4757'};">
                            ${isProfit ? '+' : ''}${(trade.finalPnLPips || 0).toFixed(1)} pips
                        </span>
                    </div>
                    
                    <div class="mobile-trade-row">
                        <span class="mobile-trade-label">Details</span>
                        <div class="mobile-trade-value details">
                            <span class="exit-reason">${this.formatExitReason(trade.status)}</span>
                            <span class="trade-duration">${this.formatDuration(trade.duration || 0)}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Desktop layout (unchanged)
            return `
                <div class="history-trade-card ${isProfit ? 'profit' : 'loss'}" 
                     onclick="alert('Trade Details:\\n\\nSymbol: ${trade.symbol}\\nDirection: ${trade.direction || trade.action}\\nEngine: ${trade.engine}\\nEntry: ${this.formatPrice(trade.symbol, trade.entry)}\\nExit: ${this.formatPrice(trade.symbol, trade.closePrice)}\\nP&L: ${(trade.finalPnLPips || 0).toFixed(1)} pips (${(trade.finalPnLPercentage || 0).toFixed(2)}%)\\nDuration: ${this.formatDuration(trade.duration || 0)}\\nReason: ${this.formatExitReason(trade.status)}')">
                    <div>
                        <div style="font-weight: bold;">${trade.symbol}</div>
                        <div style="font-size: 0.8em; color: #a0a0a0;">
                            ${closeDate.toLocaleDateString()} ${closeDate.toLocaleTimeString()}
                        </div>
                    </div>
                    <div>
                        <span class="trade-direction ${(trade.direction || trade.action || 'buy').toLowerCase()}" style="font-size: 0.9em;">
                            ${(trade.direction || trade.action || 'N/A').toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <span class="engine-stat ${trade.engine}">${(trade.engine || 'UNK').toUpperCase()}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: ${isProfit ? '#00ff88' : '#ff4757'}; font-weight: bold;">
                            ${isProfit ? '+' : ''}${(trade.finalPnLPips || 0).toFixed(1)} pips
                        </div>
                        <div style="font-size: 0.8em; color: #a0a0a0;">
                            ${isProfit ? '+' : ''}${(trade.finalPnLPercentage || 0).toFixed(2)}%
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8em; color: #a0a0a0;">
                            ${this.formatExitReason(trade.status)}
                        </div>
                        <div style="font-size: 0.8em; color: #a0a0a0;">
                            ${this.formatDuration(trade.duration || 0)}
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');
}

    async loadPerformanceStats() {
        try {
            const container = document.getElementById('performanceStats');
            container.innerHTML = '<div class="loading-spinner">Calculating performance...</div>';
            
            console.log('📊 Calculating performance stats...');
            
            // Calculate stats for each engine
            const engines = ['v1', 'v2', 'v3'];
            const engineStats = {};
            let totalStats = {
                totalTrades: 0,
                totalPips: 0,
                winCount: 0,
                lossCount: 0
            };
            
            for (const engine of engines) {
                const engineTrades = this.tradeHistory.filter(t => t.engine === engine);
                const wins = engineTrades.filter(t => (t.finalPnLPips || 0) > 0);
                const losses = engineTrades.filter(t => (t.finalPnLPips || 0) < 0);
                
                engineStats[engine] = {
                    trades: engineTrades.length,
                    wins: wins.length,
                    losses: losses.length,
                    winRate: engineTrades.length > 0 ? (wins.length / engineTrades.length * 100) : 0,
                    totalPips: engineTrades.reduce((sum, t) => sum + (t.finalPnLPips || 0), 0),
                    avgWin: wins.length > 0 ? wins.reduce((sum, t) => sum + (t.finalPnLPips || 0), 0) / wins.length : 0,
                    avgLoss: losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.finalPnLPips || 0), 0) / losses.length) : 0
                };
                
                totalStats.totalTrades += engineTrades.length;
                totalStats.totalPips += engineStats[engine].totalPips;
                totalStats.winCount += wins.length;
                totalStats.lossCount += losses.length;
            }
            
            const overallWinRate = totalStats.totalTrades > 0 ? 
                (totalStats.winCount / totalStats.totalTrades * 100) : 0;
            
            // Render stats
            container.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${totalStats.totalTrades}</div>
                    <div class="stat-label">Total Trades</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: ${overallWinRate >= 50 ? '#00ff88' : '#ff4757'};">
                        ${overallWinRate.toFixed(1)}%
                    </div>
                    <div class="stat-label">Win Rate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: ${totalStats.totalPips >= 0 ? '#00ff88' : '#ff4757'};">
                        ${totalStats.totalPips >= 0 ? '+' : ''}${totalStats.totalPips.toFixed(1)}
                    </div>
                    <div class="stat-label">Total Pips</div>
                </div>
                <div class="stat-card">
                    <div class="engine-stat v1">V1 Engine</div>
                    <div style="font-size: 0.9em;">
                        <div>Trades: ${engineStats.v1.trades}</div>
                        <div>Win Rate: ${engineStats.v1.winRate.toFixed(1)}%</div>
                        <div style="color: ${engineStats.v1.totalPips >= 0 ? '#00ff88' : '#ff4757'};">
                            ${engineStats.v1.totalPips >= 0 ? '+' : ''}${engineStats.v1.totalPips.toFixed(1)} pips
                        </div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="engine-stat v2">V2 Engine</div>
                    <div style="font-size: 0.9em;">
                        <div>Trades: ${engineStats.v2.trades}</div>
                        <div>Win Rate: ${engineStats.v2.winRate.toFixed(1)}%</div>
                        <div style="color: ${engineStats.v2.totalPips >= 0 ? '#00ff88' : '#ff4757'};">
                            ${engineStats.v2.totalPips >= 0 ? '+' : ''}${engineStats.v2.totalPips.toFixed(1)} pips
                        </div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="engine-stat v3">V3 Engine</div>
                    <div style="font-size: 0.9em;">
                        <div>Trades: ${engineStats.v3.trades}</div>
                        <div>Win Rate: ${engineStats.v3.winRate.toFixed(1)}%</div>
                        <div style="color: ${engineStats.v3.totalPips >= 0 ? '#00ff88' : '#ff4757'};">
                            ${engineStats.v3.totalPips >= 0 ? '+' : ''}${engineStats.v3.totalPips.toFixed(1)} pips
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('❌ Error loading performance stats:', error);
            document.getElementById('performanceStats').innerHTML = 
                '<div class="no-trades">Error loading performance stats</div>';
        }
    }

    setupFilters() {
        const engineFilter = document.getElementById('engineFilter');
        const resultFilter = document.getElementById('resultFilter');
        
        if (engineFilter) engineFilter.addEventListener('change', () => this.applyFilters());
        if (resultFilter) resultFilter.addEventListener('change', () => this.applyFilters());
    }

    applyFilters() {
        const engine = document.getElementById('engineFilter')?.value;
        const result = document.getElementById('resultFilter')?.value;
        
        let filtered = [...this.tradeHistory];
        
        if (engine && engine !== 'all') {
            filtered = filtered.filter(t => t.engine === engine);
        }
        
        if (result === 'profit') {
            filtered = filtered.filter(t => (t.finalPnLPips || 0) > 0);
        } else if (result === 'loss') {
            filtered = filtered.filter(t => (t.finalPnLPips || 0) < 0);
        }
        
        this.renderTradeHistory(filtered);
    }

    startAutoRefresh() {
        // Update active trades every 30 seconds
        this.updateInterval = setInterval(() => {
            this.loadActiveTrades();
        }, 30000);
        
        // Also update current prices for active trades
        this.updateCurrentPrices();
        setInterval(() => this.updateCurrentPrices(), 5000);
    }

    async updateCurrentPrices() {
        // Get latest prices from Firebase
        for (const trade of this.activeTrades) {
            try {
                const priceDoc = await this.firebaseStorage.getDoc(
                    this.firebaseStorage.doc(this.firebaseStorage.db, 'prices', trade.symbol)
                );
                
                if (priceDoc.exists()) {
                    const priceData = priceDoc.data();
                    trade.currentPrice = priceData.price;
                }
            } catch (error) {
                console.error(`❌ Error updating price for ${trade.symbol}:`, error);
            }
        }
        
        // Re-render with updated prices
        this.renderActiveTrades();
    }

    // Helper functions
    calculatePnL(trade, currentPrice) {
        const entry = trade.entry || 0;
        const direction = trade.direction || trade.action || 'BUY';
        
        if (!entry || !currentPrice) {
            return { pips: 0, percentage: 0, dollars: 0 };
        }
        
        const priceDiff = direction === 'BUY' ? 
            currentPrice - entry : 
            entry - currentPrice;
        
        let pips = 0;
        if (trade.symbol === 'XAUUSD') {
            pips = priceDiff * 10;
        } else if (trade.symbol === 'USDJPY') {
            pips = priceDiff * 100;
        } else if (trade.symbol === 'BTCUSD') {
            pips = priceDiff;
        }
        
        const percentage = (priceDiff / entry) * 100;
        
        return { pips, percentage, dollars: priceDiff };
    }

    calculateProgress(trade, currentPrice) {
        const entry = trade.entry || 0;
        const stopLoss = trade.stopLoss || 0;
        const takeProfit = trade.takeProfit || 0;
        
        if (!entry || !stopLoss || !takeProfit || !currentPrice) return 0;
        
        const totalDistance = Math.abs(takeProfit - stopLoss);
        const direction = trade.direction || trade.action || 'BUY';
        
        let currentDistance;
        if (direction === 'BUY') {
            currentDistance = currentPrice - stopLoss;
        } else {
            currentDistance = stopLoss - currentPrice;
        }
        
        const progress = (currentDistance / totalDistance) * 100;
        return Math.max(0, Math.min(100, progress));
    }

    formatPrice(symbol, price) {
        if (!price || isNaN(price)) return '--';
        
        if (symbol === 'XAUUSD') {
            return `$${price.toFixed(2)}`;
        } else if (symbol === 'USDJPY') {
            return `¥${price.toFixed(3)}`;
        } else if (symbol === 'BTCUSD') {
            return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        }
        return price.toFixed(4);
    }

    formatDuration(ms) {
        if (!ms || isNaN(ms)) return '0m';
        
        const hours = Math.floor(ms / (60 * 60 * 1000));
        const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    formatExitReason(status) {
        const reasons = {
            'CLOSED_TP': 'Take Profit ✅',
            'CLOSED_SL': 'Stop Loss ❌',
            'TIME_EXPIRY': 'Time Expiry ⏰',
            'FLIPPED': 'Flipped 🔄'
        };
        return reasons[status] || status || 'Unknown';
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const tradeManager = new TradeManagerUI();
    await tradeManager.initialize();
});