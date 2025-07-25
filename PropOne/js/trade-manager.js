// Updated Trade Manager Module - trade-manager.js (Fixed queries)
import { db } from './firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    deleteDoc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class TradeManager {
    constructor() {
        this.trades = [];
    }

    // Add new trade
    async addTrade(tradeData) {
        try {
            const data = {
                ...tradeData,
                pnl: tradeData.newBalance - tradeData.oldBalance,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const docRef = await addDoc(collection(db, 'trades'), data);
            
            // Update account balance
            await this.updateAccountBalance(tradeData.accountId, tradeData.newBalance);
            
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error adding trade:', error);
            return { success: false, error: error.message };
        }
    }

    // Load trades for an account (SIMPLIFIED - No orderBy)
    async loadTradesForAccount(accountId) {
        try {
            const q = query(
                collection(db, 'trades'),
                where('accountId', '==', accountId)
                // Removed orderBy to avoid composite index requirement
            );
            
            const querySnapshot = await getDocs(q);
            this.trades = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Sort trades by timestamp in JavaScript instead
            this.trades.sort((a, b) => {
                const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
                const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
                return timestampB - timestampA; // Descending order (newest first)
            });
            
            console.log('Loaded trades:', this.trades);
            return { success: true, trades: this.trades };
        } catch (error) {
            console.error('Error loading trades:', error);
            return { success: false, error: error.message };
        }
    }

    // Update trade
    async updateTrade(tradeId, tradeData) {
        try {
            const data = {
                ...tradeData,
                pnl: tradeData.newBalance - tradeData.oldBalance,
                updatedAt: new Date()
            };
            
            await updateDoc(doc(db, 'trades', tradeId), data);
            
            // Recalculate account balance based on all trades
            await this.recalculateAccountBalance(tradeData.accountId);
            
            return { success: true };
        } catch (error) {
            console.error('Error updating trade:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete trade
    async deleteTrade(tradeId, accountId) {
        try {
            await deleteDoc(doc(db, 'trades', tradeId));
            
            // Recalculate account balance
            await this.recalculateAccountBalance(accountId);
            
            return { success: true };
        } catch (error) {
            console.error('Error deleting trade:', error);
            return { success: false, error: error.message };
        }
    }

    // Update account balance
    async updateAccountBalance(accountId, newBalance) {
        try {
            // Get account details to check for breach
            const accountDoc = await getDoc(doc(db, 'accounts', accountId));
            if (!accountDoc.exists()) {
                throw new Error('Account not found');
            }
            
            const account = accountDoc.data();
            const currentPnL = newBalance - account.accountSize;
            const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
            const isBreached = currentPnL < -maxDrawdownAmount;
            
            // Prepare update data
            const updateData = {
                currentBalance: newBalance,
                updatedAt: new Date()
            };
            
            // If account is breached and not already marked as breached, update status
            if (isBreached && account.status !== 'breached') {
                updateData.status = 'breached';
                updateData.breachedAt = new Date();
                console.log(`Account ${accountId} has been breached. Updating status.`);
                
                // Import activity logger if available
                if (typeof activityLogger !== 'undefined') {
                    try {
                        const { default: activityLogger } = await import('./activity-logger.js');
                        await activityLogger.logAccountStatusChanged(
                            account.userId,
                            accountId,
                            account.firmName,
                            account.alias,
                            'active',
                            'breached',
                            `Automatic breach detection - Balance: ${newBalance}, Max DD: ${-maxDrawdownAmount}`
                        );
                    } catch (logError) {
                        console.warn('Could not log breach activity:', logError);
                    }
                }
            }
            
            await updateDoc(doc(db, 'accounts', accountId), updateData);
            
            return { success: true, wasBreached: isBreached };
        } catch (error) {
            console.error('Error updating account balance:', error);
            return { success: false, error: error.message };
        }
    }

    // Recalculate account balance from all trades (SIMPLIFIED)
    async recalculateAccountBalance(accountId) {
        try {
            // Get account initial balance
            const accountDoc = await getDoc(doc(db, 'accounts', accountId));
            if (!accountDoc.exists()) {
                throw new Error('Account not found');
            }
            
            const account = accountDoc.data();
            let currentBalance = account.accountSize; // Start from initial account size
            
            // Get all trades for this account (no orderBy)
            const q = query(
                collection(db, 'trades'),
                where('accountId', '==', accountId)
            );
            
            const tradesSnapshot = await getDocs(q);
            const trades = tradesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Sort trades by timestamp
            trades.sort((a, b) => {
                const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
                const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
                return timestampA - timestampB; // Ascending order for calculation
            });
            
            // Calculate final balance from all trades
            trades.forEach(trade => {
                currentBalance = trade.newBalance;
            });
            
            // Update account with recalculated balance
            await this.updateAccountBalance(accountId, currentBalance);
            
            return { success: true, balance: currentBalance };
        } catch (error) {
            console.error('Error recalculating balance:', error);
            return { success: false, error: error.message };
        }
    }

    // Get account statistics
    getAccountStats(trades, accountSize) {
        if (!trades || trades.length === 0) {
            return {
                totalTrades: 0,
                totalPnL: 0,
                winningTrades: 0,
                losingTrades: 0,
                winRate: 0,
                averageWin: 0,
                averageLoss: 0,
                largestWin: 0,
                largestLoss: 0
            };
        }

        const totalTrades = trades.length;
        const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
        const winningTrades = trades.filter(trade => trade.pnl > 0);
        const losingTrades = trades.filter(trade => trade.pnl < 0);
        
        const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
        const averageWin = winningTrades.length > 0 ? 
            winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length : 0;
        const averageLoss = losingTrades.length > 0 ? 
            losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length : 0;
        
        const allPnLs = trades.map(trade => trade.pnl);
        const largestWin = Math.max(...allPnLs, 0);
        const largestLoss = Math.min(...allPnLs, 0);

        return {
            totalTrades,
            totalPnL,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: Math.round(winRate * 100) / 100,
            averageWin: Math.round(averageWin * 100) / 100,
            averageLoss: Math.round(averageLoss * 100) / 100,
            largestWin,
            largestLoss
        };
    }

    // Generate chart data for balance over time
    generateChartData(trades, initialBalance) {
        if (!trades || trades.length === 0) {
            return [{
                timestamp: new Date(),
                balance: initialBalance
            }];
        }

        // Sort trades by timestamp for chart
        const sortedTrades = [...trades].sort((a, b) => {
            const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
            const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
            return timestampA - timestampB;
        });

        const chartData = [{
            timestamp: sortedTrades[0].timestamp,
            balance: sortedTrades[0].oldBalance
        }];

        sortedTrades.forEach(trade => {
            chartData.push({
                timestamp: trade.timestamp,
                balance: trade.newBalance
            });
        });

        return chartData;
    }

    // Calculate daily drawdown levels
    calculateDailyDrawdown(currentBalance, accountSize, dailyDrawdownPercent) {
        const dailyDrawdownAmount = accountSize * (dailyDrawdownPercent / 100);
        return currentBalance - dailyDrawdownAmount;
    }

    // Calculate max drawdown level
    calculateMaxDrawdown(accountSize, maxDrawdownPercent) {
        return accountSize - (accountSize * (maxDrawdownPercent / 100));
    }

    // Check if account is in breach
    isAccountBreached(currentBalance, accountSize, maxDrawdownPercent, dailyDrawdownPercent) {
        const maxDrawdownLevel = this.calculateMaxDrawdown(accountSize, maxDrawdownPercent);
        const dailyDrawdownLevel = this.calculateDailyDrawdown(currentBalance, accountSize, dailyDrawdownPercent);
        
        return {
            isMaxDrawdownBreached: currentBalance <= maxDrawdownLevel,
            isDailyDrawdownBreached: currentBalance <= dailyDrawdownLevel,
            maxDrawdownLevel,
            dailyDrawdownLevel
        };
    }

    // Format trade for display
    formatTradeForDisplay(trade) {
        const timestamp = trade.timestamp?.toDate?.() || new Date(trade.timestamp);
            
        return {
            ...trade,
            formattedDate: timestamp.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            formattedTime: timestamp.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            formattedPnL: trade.pnl >= 0 ? `+$${trade.pnl.toLocaleString()}` : `-$${Math.abs(trade.pnl).toLocaleString()}`,
            pnlClass: trade.pnl >= 0 ? 'positive' : 'negative'
        };
    }

    // Delete all trades for an account
    async deleteAllTradesForAccount(accountId) {
        try {
            const q = query(
                collection(db, 'trades'),
                where('accountId', '==', accountId)
            );
            
            const querySnapshot = await getDocs(q);
            const deletePromises = querySnapshot.docs.map(doc => 
                deleteDoc(doc.ref)
            );
            
            await Promise.all(deletePromises);
            
            return { success: true, deletedCount: querySnapshot.docs.length };
        } catch (error) {
            console.error('Error deleting trades:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create and export singleton instance
const tradeManager = new TradeManager();
export default tradeManager;