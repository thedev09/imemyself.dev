// trade-manager-ui.js - FINAL VERSION with Fixed Progress Bar + Triple Engine Stats

class TradeManagerUI {
    constructor() {
        this.firebaseStorage = null;
        this.activeTrades = [];
        this.tradeHistory = [];
        this.filteredHistory = null; // Use null to indicate no filters applied
        this.currentPage = 1;
        this.tradesPerPage = 50;
        this.updateInterval = null;
        this.engineStats = {
            v1: { trades: 0, totalPips: 0, winRate: 0 },
            v2: { trades: 0, totalPips: 0, winRate: 0 },
            v3: { trades: 0, totalPips: 0, winRate: 0 }
        };
    }

    async initialize() {
        console.log('🚀 Initializing Trade Manager UI...');
        
        await this.waitForFirebase();
        await this.loadActiveTrades();
        await this.loadTradeHistory();
        await this.loadPerformanceStats();
        
        this.setupFilters();
        this.applyFilters(); // Apply default filters on load
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
            console.log('✅ Firebase connected to Trade Manager');
        } else {
            throw new Error('Firebase not available');
        }
    }

    async loadActiveTrades() {
        try {
            const container = document.getElementById('activeTradesContainer');
            // ✅ FIXED: Don't show loading spinner on refresh, only on initial load
            if (this.activeTrades.length === 0) {
                container.innerHTML = '<div class="loading-spinner">Loading active trades...</div>';
            }
            
            console.log('📥 Loading active trades from all engines...');
            
            const activeTrades = [];
            const engines = ['v1', 'v2', 'v3'];
            
            for (const engine of engines) {
                try {
                    console.log(`🔍 Loading active trades for ${engine}...`);
                    
                    const tradesCollection = this.firebaseStorage.collection(this.firebaseStorage.db, `active_trades_${engine}`);
                    const snapshot = await this.firebaseStorage.getDocs(tradesCollection);
                    
                    console.log(`📊 Found ${snapshot.size} documents in active_trades_${engine}`);
                    
                    snapshot.forEach(doc => {
                        const tradeData = doc.data();
                        console.log(`📋 ${engine} trade:`, tradeData);
                        
                        const trade = {
                            id: doc.id,
                            engine: engine,
                            ...tradeData
                        };
                        
                        if (this.validateTradeStatus(trade)) {
                            activeTrades.push(trade);
                            console.log(`✅ Added valid ${engine} trade: ${trade.symbol} ${trade.direction}`);
                        } else {
                            console.log(`❌ Trade ${trade.symbol} appears to be closed already`);
                        }
                    });
                    
                } catch (engineError) {
                    console.error(`❌ Error loading ${engine} trades:`, engineError);
                }
            }
            
            this.activeTrades = activeTrades;
            console.log(`📈 Total active trades loaded: ${this.activeTrades.length}`);
            
            this.renderActiveTrades();
            
        } catch (error) {
            console.error('❌ Error loading active trades:', error);
            document.getElementById('activeTradesContainer').innerHTML = 
                '<div class="no-trades">Error loading active trades: ' + error.message + '</div>';
        }
    }

    validateTradeStatus(trade) {
        if (!trade.currentPrice || !trade.entry || !trade.stopLoss || !trade.takeProfit) {
            return true;
        }
        
        const direction = trade.direction || trade.action || 'BUY';
        const current = trade.currentPrice;
        const sl = trade.stopLoss;
        const tp = trade.takeProfit;
        
        if (direction === 'BUY') {
            if (current <= sl || current >= tp) return false;
        } else if (direction === 'SELL') {
            if (current >= sl || current <= tp) return false;
        }
        
        return true;
    }

    renderActiveTrades() {
        const container = document.getElementById('activeTradesContainer');
        
        console.log(`🎨 Rendering ${this.activeTrades.length} active trades...`);
        
        if (this.activeTrades.length === 0) {
            container.innerHTML = '<div class="no-trades"><h3>No Active Trades</h3><p>The system is monitoring markets and will open trades when opportunities are found.</p></div>';
            return;
        }
        
        const gridClass = this.activeTrades.length === 1 ? 'single-trade' : 'multi-trade';
        container.className = `trades-grid ${gridClass}`;
        
        const isMobile = window.innerWidth <= 768;
        
        container.innerHTML = this.activeTrades.map(trade => {
            console.log(`🏗️ Rendering trade:`, trade);
            
            const direction = (trade.direction || trade.action || 'BUY').toLowerCase();
            const currentPrice = trade.currentPrice || trade.price || trade.entry || 0;
            const pnl = this.calculatePnL(trade, currentPrice);
            const progress = this.calculateProgress(trade, currentPrice);
            const openTime = trade.openTime || trade.timestamp || Date.now();
            
            if (isMobile) {
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
                            <div class="detail-item">
                                <div class="detail-label">Duration</div>
                                <div class="detail-value">${this.formatDuration(Date.now() - openTime)}</div>
                            </div>
                        </div>
                        
                        <div class="pnl-display">
                            <div class="pnl-value ${pnl.pips >= 0 ? 'profit' : 'loss'}">
                                ${pnl.pips >= 0 ? '+' : ''}${pnl.pips.toFixed(1)} pips
                            </div>
                            <div class="pnl-percentage">${pnl.percentage >= 0 ? '+' : ''}${pnl.percentage.toFixed(2)}%</div>
                        </div>
                        
                        <div class="trade-progress">
                            <div class="progress-bar" style="width: ${progress}%"></div>
                            <div class="progress-markers">
                                <span class="marker">SL</span>
                                <span class="marker">TP</span>
                            </div>
                        </div>
                        
                        <div class="trade-details">
                            <div class="detail-item">
                                <div class="detail-label">Stop Loss</div>
                                <div class="detail-value">${this.formatPrice(trade.symbol, trade.stopLoss || 0)}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Take Profit</div>
                                <div class="detail-value">${this.formatPrice(trade.symbol, trade.takeProfit || 0)}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Confidence</div>
                                <div class="detail-value">${trade.confidence || 0}%</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // ✅ Desktop layout with FIXED progress bar
                const progressInfo = this.calculateProgressPositions(trade, currentPrice);
                
                return `
                    <div class="active-trade-card ${direction}">
                        <!-- Row 1: Symbol + Engine/Direction -->
                        <div class="desktop-header">
                            <div class="desktop-symbol">${trade.symbol || 'N/A'}</div>
                            <div class="desktop-engine-direction">
                                <span class="engine-badge-desktop ${trade.engine}">${(trade.engine || 'UNK').toUpperCase()}</span>
                                <span class="direction-badge-desktop ${direction}">${(trade.direction || trade.action || 'N/A').toUpperCase()}</span>
                            </div>
                        </div>
                        
                        <!-- Row 2: Entry + Current -->
                        <div class="desktop-entry desktop-detail-item">
                            <div class="desktop-detail-label">Entry</div>
                            <div class="desktop-detail-value">${this.formatPrice(trade.symbol, trade.entry || 0)}</div>
                        </div>
                        <div class="desktop-current desktop-detail-item">
                            <div class="desktop-detail-label">Current</div>
                            <div class="desktop-detail-value">${this.formatPrice(trade.symbol, currentPrice)}</div>
                        </div>
                        
                        <!-- Row 3: Duration + Confidence -->
                        <div class="desktop-duration desktop-detail-item">
                            <div class="desktop-detail-label">Duration</div>
                            <div class="desktop-detail-value">${this.formatDuration(Date.now() - openTime)}</div>
                        </div>
                        <div class="desktop-confidence desktop-detail-item">
                            <div class="desktop-detail-label">Confidence</div>
                            <div class="desktop-detail-value">${trade.confidence || 0}%</div>
                        </div>
                        
                        <!-- Row 4: Pips (spans both columns) -->
                        <div class="desktop-pips">
                            <div class="desktop-pips-value ${pnl.pips >= 0 ? 'profit' : 'loss'}">
                                ${pnl.pips >= 0 ? '+' : ''}${pnl.pips.toFixed(1)} pips
                            </div>
                            <div class="desktop-pips-percentage">${pnl.percentage >= 0 ? '+' : ''}${pnl.percentage.toFixed(2)}%</div>
                        </div>
                        
                        <!-- ✅ Row 5: FIXED Progress Bar -->
                        <div class="desktop-progress">
                            <div class="progress-container">
                                <div class="progress-track ${pnl.pips >= 0 ? 'profit' : 'loss'}" style="width: ${progressInfo.currentProgress}%; left: ${progressInfo.slPosition}%;"></div>
                                <div class="progress-markers">
                                    <div class="progress-marker entry" style="left: ${progressInfo.entryPosition}%;"></div>
                                </div>
                            </div>
                            <div class="progress-labels">
                                <span>SL</span>
                                <span>TP</span>
                            </div>
                        </div>
                        
                        <!-- Row 6: SL + TP -->
                        <div class="desktop-sl desktop-detail-item">
                            <div class="desktop-detail-label">Stop Loss</div>
                            <div class="desktop-detail-value">${this.formatPrice(trade.symbol, trade.stopLoss || 0)}</div>
                        </div>
                        <div class="desktop-tp desktop-detail-item">
                            <div class="desktop-detail-label">Take Profit</div>
                            <div class="desktop-detail-value">${this.formatPrice(trade.symbol, trade.takeProfit || 0)}</div>
                        </div>
                    </div>
                `;
            }
        }).join('');
        
        console.log('✅ Active trades rendered successfully');
    }

    // ✅ FIXED: Corrected progress bar positions for both BUY and SELL trades
    calculateProgressPositions(trade, currentPrice) {
        const entry = trade.entry || 0;
        const sl = trade.stopLoss || 0;
        const tp = trade.takeProfit || 0;
        const direction = trade.direction || trade.action || 'BUY';
        
        let minPrice, maxPrice, entryPos, currentPos, progressWidth;
        
        if (direction === 'BUY') {
            // For BUY: SL (0%) < Entry < TP (100%)
            minPrice = sl;
            maxPrice = tp;
            
            entryPos = ((entry - sl) / (tp - sl)) * 100;
            currentPos = ((currentPrice - sl) / (tp - sl)) * 100;
            
            // Progress starts from SL (0%) and moves towards TP (100%)
            progressWidth = Math.max(0, currentPos);
        } else {
            // For SELL: TP (0%) < Entry < SL (100%)
            // But visually: SL is on left (0%), TP is on right (100%)
            minPrice = tp;
            maxPrice = sl;
            
            // Calculate positions in the visual space (SL=0%, TP=100%)
            entryPos = ((sl - entry) / (sl - tp)) * 100;
            currentPos = ((sl - currentPrice) / (sl - tp)) * 100;
            
            // For SELL, progress moves from entry towards TP (right side)
            // When current price goes DOWN (towards TP), progress should increase
            progressWidth = Math.max(0, currentPos);
        }
        
        // Clamp positions to 0-100%
        entryPos = Math.max(0, Math.min(100, entryPos));
        currentPos = Math.max(0, Math.min(100, currentPos));
        progressWidth = Math.max(0, Math.min(100, progressWidth));
        
        return {
            slPosition: 0,
            entryPosition: entryPos,
            currentPosition: currentPos,
            tpPosition: 100,
            currentProgress: progressWidth
        };
    }

    async loadTradeHistory() {
        try {
            const container = document.getElementById('tradeHistoryContainer');
            container.innerHTML = '<div class="loading-spinner">Loading trade history...</div>';
            
            console.log('📥 Loading trade history...');
            
            const historyCollection = this.firebaseStorage.collection(this.firebaseStorage.db, 'trade_history');
            const snapshot = await this.firebaseStorage.getDocs(historyCollection);
            
            this.tradeHistory = [];
            
            console.log(`📊 Found ${snapshot.size} trade history records`);
            
            snapshot.forEach(doc => {
                this.tradeHistory.push({ id: doc.id, ...doc.data() });
            });
            
            // Sort by close time (newest first)
            this.tradeHistory.sort((a, b) => {
                const timeA = a.closeTime || a.timestamp || 0;
                const timeB = b.closeTime || b.timestamp || 0;
                return timeB - timeA;
            });
            
            this.renderTradeHistory();
            
        } catch (error) {
            console.error('❌ Error loading trade history:', error);
            document.getElementById('tradeHistoryContainer').innerHTML = 
                '<div class="no-trades">Error loading trade history: ' + error.message + '</div>';
        }
    }

    renderTradeHistory() {
        const container = document.getElementById('tradeHistoryContainer');
        // Use filteredHistory if filters have been applied, otherwise use full history
        const allTrades = this.filteredHistory !== null ? this.filteredHistory : this.tradeHistory;
        
        if (allTrades.length === 0) {
            const message = this.filteredHistory !== null 
                ? 'No trades match the selected filters' 
                : 'No trade history found';
            container.innerHTML = `<div class="no-trades">${message}</div>`;
            return;
        }

        // Calculate pagination
        const totalPages = Math.ceil(allTrades.length / this.tradesPerPage);
        const startIndex = (this.currentPage - 1) * this.tradesPerPage;
        const endIndex = startIndex + this.tradesPerPage;
        const trades = allTrades.slice(startIndex, endIndex);
        
        container.innerHTML = trades.map(trade => {
            const pips = trade.finalPnLPips || 0;
            const isProfit = pips > 0;
            const direction = (trade.direction || trade.action || 'BUY').toLowerCase();
            const openDate = new Date(trade.openTime || Date.now());
            
            // Calculate duration
            const duration = trade.closeTime && trade.openTime ? 
                this.formatDuration(trade.closeTime - trade.openTime) : 
                'N/A';
            
            // Format date and time separately in Indian format
            const formatDate = (date) => {
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            };
            
            const formatTime = (date) => {
                return date.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });
            };
            
            const dateStr = formatDate(openDate);
            const timeStr = formatTime(openDate);
            
            return `
                <div class="trade-history-row ${isProfit ? 'profit' : 'loss'}">
                    <div class="col-symbol trade-symbol">${trade.symbol || 'N/A'}</div>
                    <div class="col-direction">
                        <span class="trade-direction-badge ${direction}">${direction.toUpperCase()}</span>
                    </div>
                    <div class="col-time trade-time">
                        <div class="trade-date">${dateStr}</div>
                        <div class="trade-time-value">${timeStr}</div>
                    </div>
                    <div class="col-open-price trade-price">${this.formatPrice(trade.symbol, trade.entry || 0)}</div>
                    <div class="col-close-price trade-price">${this.formatPrice(trade.symbol, trade.closePrice || 0)}</div>
                    <div class="col-pips trade-pips ${isProfit ? 'profit' : 'loss'}">
                        ${pips >= 0 ? '+' : ''}${pips.toFixed(1)}
                    </div>
                    <div class="col-tp trade-price">${this.formatPrice(trade.symbol, trade.takeProfit || 0)}</div>
                    <div class="col-sl trade-price">${this.formatPrice(trade.symbol, trade.stopLoss || 0)}</div>
                    <div class="col-duration trade-duration">${duration}</div>
                    <div class="col-reason trade-reason">${this.formatExitReason(trade.exitReason || trade.status)}</div>
                </div>
            `;
        }).join('');

        // Add pagination info
        if (totalPages > 1) {
            container.innerHTML += `
                <div style="padding: 20px; text-align: center; color: #a0a0a0; font-size: 0.9em; border-top: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.02);">
                    Showing ${startIndex + 1}-${Math.min(endIndex, allTrades.length)} of ${allTrades.length} trades
                    ${this.currentPage > 1 ? `<span style="margin-left: 20px; color: #00d4ff; cursor: pointer;" onclick="window.tradeManager.loadMoreTrades('prev')">← Previous</span>` : ''}
                    ${this.currentPage < totalPages ? `<span style="margin-left: 10px; color: #00d4ff; cursor: pointer;" onclick="window.tradeManager.loadMoreTrades('next')">Next →</span>` : ''}
                </div>
            `;
        }
        
        console.log(`✅ Trade history rendered: Page ${this.currentPage}/${totalPages}, ${trades.length} trades shown`);
    }

    loadMoreTrades(direction) {
        const allTrades = this.filteredHistory.length > 0 ? this.filteredHistory : this.tradeHistory;
        const totalPages = Math.ceil(allTrades.length / this.tradesPerPage);
        
        if (direction === 'next' && this.currentPage < totalPages) {
            this.currentPage++;
        } else if (direction === 'prev' && this.currentPage > 1) {
            this.currentPage--;
        }
        
        this.renderTradeHistory();
        
        // Scroll to top of trade history
        const container = document.querySelector('.trade-history-scroll');
        if (container) {
            container.scrollTop = 0;
        }
    }

    // ✅ NEW: Load performance stats for ALL THREE engines
    async loadPerformanceStats() {
        try {
            console.log('📊 Loading performance statistics for all engines...');
            
            // Calculate stats for each engine separately
            const engines = ['v1', 'v2', 'v3'];
            
            for (const engine of engines) {
                const engineTrades = this.tradeHistory.filter(t => t.engine === engine);
                const totalTrades = engineTrades.length;
                const winningTrades = engineTrades.filter(t => (t.finalPnLPips || 0) > 0);
                const totalPips = engineTrades.reduce((sum, t) => sum + (t.finalPnLPips || 0), 0);
                const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

                // Store stats
                this.engineStats[engine] = {
                    trades: totalTrades,
                    totalPips: totalPips,
                    winRate: winRate
                };

                // Update UI elements
                const pipsElement = document.getElementById(`${engine}-total-pips`);
                const winRateElement = document.getElementById(`${engine}-win-rate`);
                const tradesElement = document.getElementById(`${engine}-total-trades`);

                if (pipsElement) {
                    pipsElement.textContent = `${totalPips >= 0 ? '+' : ''}${totalPips.toFixed(1)}`;
                    pipsElement.className = `engine-stat-value pips ${totalPips >= 0 ? '' : 'negative'}`;
                }
                if (winRateElement) winRateElement.textContent = `${winRate.toFixed(1)}%`;
                if (tradesElement) tradesElement.textContent = totalTrades.toString();

                console.log(`📈 ${engine.toUpperCase()} Performance: ${totalTrades} trades, ${totalPips.toFixed(1)} pips, ${winRate.toFixed(1)}% win rate`);
            }
            
        } catch (error) {
            console.error('❌ Error loading performance stats:', error);
        }
    }

    setupFilters() {
        const engineFilter = document.getElementById('engineFilter');
        const resultFilter = document.getElementById('resultFilter');
        const timeFilter = document.getElementById('timeFilter');
        const symbolFilter = document.getElementById('symbolFilter');
        
        if (engineFilter) engineFilter.addEventListener('change', () => this.applyFilters());
        if (resultFilter) resultFilter.addEventListener('change', () => this.applyFilters());
        if (timeFilter) timeFilter.addEventListener('change', () => this.applyFilters());
        if (symbolFilter) symbolFilter.addEventListener('change', () => this.applyFilters());
    }

    applyFilters() {
        const engine = document.getElementById('engineFilter')?.value;
        const result = document.getElementById('resultFilter')?.value;
        const time = document.getElementById('timeFilter')?.value;
        const symbol = document.getElementById('symbolFilter')?.value;
        
        console.log(`🔍 Applying filters - Engine: ${engine}, Result: ${result}, Time: ${time}, Symbol: ${symbol}`);
        
        let filtered = [...this.tradeHistory];
        
        // Engine filter
        if (engine && engine !== 'all') {
            filtered = filtered.filter(t => t.engine === engine);
        }
        
        // Result filter
        if (result === 'profit') {
            filtered = filtered.filter(t => (t.finalPnLPips || 0) > 0);
        } else if (result === 'loss') {
            filtered = filtered.filter(t => (t.finalPnLPips || 0) < 0);
        }
        
        // Time filter
        if (time && time !== 'all') {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            // Calculate Monday to Friday week
            const startOfWeek = new Date(startOfToday);
            const dayOfWeek = startOfToday.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days to Monday
            startOfWeek.setDate(startOfToday.getDate() - daysToMonday);
            
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            filtered = filtered.filter(t => {
                const tradeDate = new Date(t.closeTime || t.timestamp || 0);
                switch (time) {
                    case 'today':
                        return tradeDate >= startOfToday;
                    case 'week':
                        // Monday to Friday only
                        const tradeDayOfWeek = tradeDate.getDay();
                        return tradeDate >= startOfWeek && tradeDayOfWeek >= 1 && tradeDayOfWeek <= 5;
                    case 'month':
                        return tradeDate >= startOfMonth;
                    default:
                        return true;
                }
            });
        }
        
        // Symbol filter
        if (symbol && symbol !== 'all') {
            filtered = filtered.filter(t => t.symbol === symbol);
        }
        
        this.filteredHistory = filtered;
        this.currentPage = 1; // Reset to first page when filters change
        console.log(`🔍 Applied filters: ${filtered.length} trades found out of ${this.tradeHistory.length}`);
        this.renderTradeHistory();
    }

    startAutoRefresh() {
    this.updateInterval = setInterval(() => {
        this.loadActiveTrades();
    }, 15000);  // ✅ FIXED: 15 seconds instead of 30
    
    console.log('⏰ Enhanced auto-refresh started - 15 second intervals');
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
        
        const percentage = entry > 0 ? (priceDiff / entry) * 100 : 0;
        
        return { pips, percentage, dollars: priceDiff };
    }

    calculateProgress(trade, currentPrice) {
        const entry = trade.entry || 0;
        const stopLoss = trade.stopLoss || 0;
        const takeProfit = trade.takeProfit || 0;
        
        if (!entry || !stopLoss || !takeProfit || !currentPrice) return 50;
        
        const totalDistance = Math.abs(takeProfit - stopLoss);
        const direction = trade.direction || trade.action || 'BUY';
        
        let currentDistance;
        if (direction === 'BUY') {
            currentDistance = currentPrice - stopLoss;
        } else {
            currentDistance = stopLoss - currentPrice;
        }
        
        const progress = totalDistance > 0 ? (currentDistance / totalDistance) * 100 : 50;
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
            const remainingHours = hours % 24;
            return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
        } else if (hours > 0) {
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        } else {
            return `${minutes}m`;
        }
    }

    formatExitReason(status) {
        const reasons = {
            'CLOSED_TP': 'Take Profit',
            'CLOSED_SL': 'Stop Loss',
            'TIME_EXPIRY': 'Time Expiry',
            'FLIPPED': 'Flipped'
        };
        return reasons[status] || status || 'Unknown';
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Trade Manager page loaded');
    
    try {
        const tradeManager = new TradeManagerUI();
        window.tradeManager = tradeManager; // Make globally accessible
        await tradeManager.initialize();
    } catch (error) {
        console.error('❌ Failed to initialize Trade Manager:', error);
        
        const container = document.getElementById('activeTradesContainer');
        if (container) {
            container.innerHTML = `
                <div class="no-trades">
                    <h3>❌ Connection Error</h3>
                    <p>Failed to connect to Firebase: ${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer;">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    }
});