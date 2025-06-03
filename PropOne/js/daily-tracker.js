// Enhanced daily-tracker.js with proper IST reset logic
import { db } from './firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class DailyTracker {
    constructor() {
        this.dailySnapshots = [];
    }

    // Get current IST date string (YYYY-MM-DD)
    getCurrentISTDateString() {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    return istTime.toISOString().split('T')[0];
}

    // Get IST reset time for a given date (2:30 AM IST)
    getISTResetTime(dateString) {
        // Create date in IST timezone
        const date = new Date(dateString + 'T02:30:00.000Z');
        // Adjust for IST offset
        return new Date(date.getTime() + this.istOffset);
    }

    // Get the trading day for a given timestamp
    getTradingDay(timestamp = new Date()) {
    // Convert to IST timezone
    const istTime = new Date(timestamp.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const istHour = istTime.getHours();
    const istMinute = istTime.getMinutes();
    
    console.log(`IST Time: ${istTime.toLocaleString()}, Hour: ${istHour}, Minute: ${istMinute}`);
    
    // If it's before 2:30 AM IST, it belongs to the previous trading day
    if (istHour < 2 || (istHour === 2 && istMinute < 30)) {
        const previousDay = new Date(istTime);
        previousDay.setDate(previousDay.getDate() - 1);
        const tradingDay = previousDay.toISOString().split('T')[0];
        console.log(`Before 2:30 AM IST - Trading day: ${tradingDay}`);
        return tradingDay;
    } else {
        const tradingDay = istTime.toISOString().split('T')[0];
        console.log(`After 2:30 AM IST - Trading day: ${tradingDay}`);
        return tradingDay;
    }
}

    // Check if we need to create a new daily snapshot
    async shouldCreateSnapshot(accountId, currentBalance) {
        const tradingDay = this.getTradingDay();
        
        try {
            await this.loadSnapshotsForAccount(accountId);
            
            // Check if we already have a snapshot for today's trading day
            const existingSnapshot = this.dailySnapshots.find(
                snapshot => snapshot.accountId === accountId && snapshot.date === tradingDay
            );
            
            return !existingSnapshot;
        } catch (error) {
            console.error('Error checking snapshot:', error);
            return true; // Create snapshot if we can't check
        }
    }

    // Create daily snapshot
    async createDailySnapshot(accountId, balance, accountSize, dailyDrawdownPercent) {
        try {
            const tradingDay = this.getTradingDay();
            const dailyDDLevel = balance - (accountSize * (dailyDrawdownPercent / 100));
            
            const snapshotData = {
                accountId,
                date: tradingDay,
                startingBalance: balance,
                dailyDDLevel,
                accountSize,
                dailyDrawdownPercent,
                createdAt: new Date(),
                istTimestamp: new Date().getTime() + this.istOffset
            };
            
            const docRef = await addDoc(collection(db, 'dailySnapshots'), snapshotData);
            
            // Add to local cache
            this.dailySnapshots.push({
                id: docRef.id,
                ...snapshotData
            });
            
            console.log(`Created daily snapshot for ${accountId} on ${tradingDay}:`, snapshotData);
            
            return { success: true, id: docRef.id, snapshot: snapshotData };
        } catch (error) {
            console.error('Error creating daily snapshot:', error);
            return { success: false, error: error.message };
        }
    }

    // Load daily snapshots for an account
    async loadSnapshotsForAccount(accountId) {
        try {
            const q = query(
                collection(db, 'dailySnapshots'),
                where('accountId', '==', accountId),
                orderBy('date', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            this.dailySnapshots = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`Loaded ${this.dailySnapshots.length} snapshots for account ${accountId}`);
            
            return { success: true, snapshots: this.dailySnapshots };
        } catch (error) {
            console.error('Error loading daily snapshots:', error);
            return { success: false, error: error.message };
        }
    }

    // Get current daily DD level for an account
    // Add this method to your existing daily-tracker.js class

// Add this method to the DailyTracker class (insert it after existing methods)

    // Reset daily tracking after payout
    async resetAfterPayout(accountId, newBalance, accountSize, dailyDrawdownPercent) {
        try {
            const tradingDay = this.getTradingDay();
            
            console.log(`Resetting daily tracking after payout for account ${accountId}`);
            console.log(`New balance: ${newBalance}, Account size: ${accountSize}`);
            
            // Delete existing snapshot for today if it exists
            const q = query(
                collection(db, 'dailySnapshots'),
                where('accountId', '==', accountId),
                where('date', '==', tradingDay)
            );
            
            const existingSnapshots = await getDocs(q);
            const deletePromises = existingSnapshots.docs.map(doc => 
                deleteDoc(doc.ref)
            );
            await Promise.all(deletePromises);
            
            console.log(`Deleted ${existingSnapshots.docs.length} existing snapshots for ${tradingDay}`);
            
            // Create new snapshot with reset balance
            const dailyDDLevel = newBalance - (accountSize * (dailyDrawdownPercent / 100));
            
            const snapshotData = {
                accountId,
                date: tradingDay,
                startingBalance: newBalance,
                dailyDDLevel,
                accountSize,
                dailyDrawdownPercent,
                createdAt: new Date(),
                istTimestamp: new Date().getTime() + this.istOffset,
                isPayoutReset: true // Flag to indicate this was created after payout
            };
            
            const docRef = await addDoc(collection(db, 'dailySnapshots'), snapshotData);
            
            console.log(`Created new snapshot after payout:`, snapshotData);
            
            return { success: true, id: docRef.id, snapshot: snapshotData };
        } catch (error) {
            console.error('Error resetting daily tracking after payout:', error);
            return { success: false, error: error.message };
        }
    }

    // Updated method to get current daily DD level (add this to replace existing method)
    async getCurrentDailyDDLevel(accountId, currentBalance, accountSize, dailyDrawdownPercent) {
        try {
            await this.loadSnapshotsForAccount(accountId);
            
            const tradingDay = this.getTradingDay();
            let todaySnapshot = this.dailySnapshots.find(
                snapshot => snapshot.accountId === accountId && snapshot.date === tradingDay
            );
            
            // If no snapshot for today's trading day, create one
            if (!todaySnapshot) {
                console.log(`No snapshot found for ${accountId} on ${tradingDay}, creating new one`);
                const result = await this.createDailySnapshot(accountId, currentBalance, accountSize, dailyDrawdownPercent);
                if (result.success) {
                    todaySnapshot = result.snapshot;
                } else {
                    // Fallback calculation
                    console.warn('Failed to create snapshot, using fallback calculation');
                    return currentBalance - (accountSize * (dailyDrawdownPercent / 100));
                }
            }
            
            // For payout resets, use the snapshot's DD level directly
            if (todaySnapshot.isPayoutReset) {
                console.log(`Using payout reset DD level: ${todaySnapshot.dailyDDLevel}`);
                return todaySnapshot.dailyDDLevel;
            }
            
            return todaySnapshot.dailyDDLevel;
        } catch (error) {
            console.error('Error getting daily DD level:', error);
            // Fallback calculation
            return currentBalance - (accountSize * (dailyDrawdownPercent / 100));
        }
    }

    // Calculate daily P&L for an account
    async calculateDailyPnL(accountId, currentBalance) {
        try {
            await this.loadSnapshotsForAccount(accountId);
            
            const tradingDay = this.getTradingDay();
            const todaySnapshot = this.dailySnapshots.find(
                snapshot => snapshot.accountId === accountId && snapshot.date === tradingDay
            );
            
            if (todaySnapshot) {
                const dailyPnL = currentBalance - todaySnapshot.startingBalance;
                console.log(`Daily P&L for ${accountId}: ${dailyPnL} (Current: ${currentBalance}, Starting: ${todaySnapshot.startingBalance})`);
                return dailyPnL;
            } else {
                // No snapshot means no trading activity today
                console.log(`No snapshot for ${accountId} on ${tradingDay}, daily P&L = 0`);
                return 0;
            }
            
        } catch (error) {
            console.error('Error calculating daily P&L:', error);
            return 0;
        }
    }

    // Check and update daily snapshots when accounts are loaded
    async checkAndUpdateDailySnapshots(accountId, currentBalance, accountSize, dailyDrawdownPercent) {
        try {
            const shouldCreate = await this.shouldCreateSnapshot(accountId, currentBalance);
            
            if (shouldCreate) {
                console.log(`Creating daily snapshot for account ${accountId}`);
                await this.createDailySnapshot(accountId, currentBalance, accountSize, dailyDrawdownPercent);
            }
            
            return await this.getCurrentDailyDDLevel(accountId, currentBalance, accountSize, dailyDrawdownPercent);
        } catch (error) {
            console.error('Error checking daily snapshots:', error);
            // Fallback calculation
            return currentBalance - (accountSize * (dailyDrawdownPercent / 100));
        }
    }

    // Get historical daily balances for charting
    getHistoricalBalances(accountId) {
        return this.dailySnapshots
            .filter(snapshot => snapshot.accountId === accountId)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(snapshot => ({
                date: snapshot.date,
                balance: snapshot.startingBalance,
                dailyDDLevel: snapshot.dailyDDLevel
            }));
    }

    // Clean up old snapshots (keep last 90 days)
    async cleanupOldSnapshots(accountId, daysToKeep = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const cutoffDateString = cutoffDate.toISOString().split('T')[0];
            
            await this.loadSnapshotsForAccount(accountId);
            
            const oldSnapshots = this.dailySnapshots.filter(
                snapshot => snapshot.date < cutoffDateString
            );
            
            const deletePromises = oldSnapshots.map(snapshot => 
                deleteDoc(doc(db, 'dailySnapshots', snapshot.id))
            );
            
            await Promise.all(deletePromises);
            
            console.log(`Cleaned up ${oldSnapshots.length} old snapshots for account ${accountId}`);
            
            return { success: true, deletedCount: oldSnapshots.length };
        } catch (error) {
            console.error('Error cleaning up old snapshots:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete all snapshots for an account
    async deleteAllSnapshotsForAccount(accountId) {
        try {
            const q = query(
                collection(db, 'dailySnapshots'),
                where('accountId', '==', accountId)
            );
            
            const querySnapshot = await getDocs(q);
            const deletePromises = querySnapshot.docs.map(doc => 
                deleteDoc(doc.ref)
            );
            
            await Promise.all(deletePromises);
            
            console.log(`Deleted ${querySnapshot.docs.length} snapshots for account ${accountId}`);
            
            return { success: true, deletedCount: querySnapshot.docs.length };
        } catch (error) {
            console.error('Error deleting snapshots:', error);
            return { success: false, error: error.message };
        }
    }

    // Update snapshot when balance changes (for trades)
    async updateSnapshotForTrade(accountId, newBalance, accountSize, dailyDrawdownPercent) {
        try {
            const tradingDay = this.getTradingDay();
            
            await this.loadSnapshotsForAccount(accountId);
            
            // Find today's snapshot
            let todaySnapshot = this.dailySnapshots.find(
                snapshot => snapshot.accountId === accountId && snapshot.date === tradingDay
            );
            
            // If no snapshot exists for today, create one with the new balance as starting balance
            if (!todaySnapshot) {
                console.log(`Creating new snapshot for trade on ${tradingDay}`);
                return await this.createDailySnapshot(accountId, newBalance, accountSize, dailyDrawdownPercent);
            }
            
            // Snapshot exists, no need to update it - daily P&L will be calculated from current balance vs starting balance
            console.log(`Snapshot exists for ${tradingDay}, daily P&L will be calculated from difference`);
            return { success: true, snapshot: todaySnapshot };
            
        } catch (error) {
            console.error('Error updating snapshot for trade:', error);
            return { success: false, error: error.message };
        }
    }

    // Force create snapshot (for manual reset)
    async forceCreateSnapshot(accountId, balance, accountSize, dailyDrawdownPercent, customDate = null) {
        try {
            const tradingDay = customDate || this.getTradingDay();
            const dailyDDLevel = balance - (accountSize * (dailyDrawdownPercent / 100));
            
            const snapshotData = {
                accountId,
                date: tradingDay,
                startingBalance: balance,
                dailyDDLevel,
                accountSize,
                dailyDrawdownPercent,
                createdAt: new Date(),
                istTimestamp: new Date().getTime() + this.istOffset,
                isManual: true
            };
            
            const docRef = await addDoc(collection(db, 'dailySnapshots'), snapshotData);
            
            console.log(`Force created snapshot for ${accountId} on ${tradingDay}`);
            
            return { success: true, id: docRef.id, snapshot: snapshotData };
        } catch (error) {
            console.error('Error force creating snapshot:', error);
            return { success: false, error: error.message };
        }
    }

    // Get next reset time for display
    getNextResetTime() {
    // Get current IST time
    const now = new Date();
    const currentIST = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    
    // Calculate next 2:30 AM IST
    const nextReset = new Date(currentIST);
    nextReset.setHours(2, 30, 0, 0);
    
    // If it's already past 2:30 AM today, move to tomorrow
    if (currentIST.getHours() > 2 || (currentIST.getHours() === 2 && currentIST.getMinutes() >= 30)) {
        nextReset.setDate(nextReset.getDate() + 1);
    }
    
    return nextReset;
}

    // Get time until next reset
    getTimeUntilReset() {
    const now = new Date();
    const currentIST = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const nextReset = this.getNextResetTime();
    
    const timeDiff = nextReset.getTime() - currentIST.getTime();
    
    if (timeDiff <= 0) return { hours: 0, minutes: 0 };
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
}

    // Debug function to check current IST time and trading day
    // Debug function to check current IST time and trading day
debugTimeInfo() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const tradingDay = this.getTradingDay();
    const nextReset = this.getNextResetTime();
    const timeUntilReset = this.getTimeUntilReset();
    
    console.log('=== Daily Tracker Debug Info ===');
    console.log('UTC Time:', now.toISOString());
    console.log('IST Time:', istTime.toLocaleString());
    console.log('Current IST Hour:', istTime.getHours());
    console.log('Current IST Minute:', istTime.getMinutes());
    console.log('Trading Day:', tradingDay);
    console.log('Next Reset (IST):', nextReset.toLocaleString());
    console.log('Time Until Reset:', `${timeUntilReset.hours}h ${timeUntilReset.minutes}m`);
    console.log('================================');
    
    return {
        utcTime: now,
        istTime,
        tradingDay,
        nextReset,
        timeUntilReset
    };
}
}

// Create and export singleton instance
const dailyTracker = new DailyTracker();
export default dailyTracker;