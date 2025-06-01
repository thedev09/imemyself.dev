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
        this.istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    }

    // Get current IST date string (YYYY-MM-DD)
    getCurrentISTDateString() {
        const now = new Date();
        const istTime = new Date(now.getTime() + this.istOffset);
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
        const istTime = new Date(timestamp.getTime() + this.istOffset);
        const istHour = istTime.getHours();
        const istMinute = istTime.getMinutes();
        
        // If it's before 2:30 AM IST, it belongs to the previous trading day
        if (istHour < 2 || (istHour === 2 && istMinute < 30)) {
            const previousDay = new Date(istTime);
            previousDay.setDate(previousDay.getDate() - 1);
            return previousDay.toISOString().split('T')[0];
        } else {
            return istTime.toISOString().split('T')[0];
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
        const now = new Date();
        const istNow = new Date(now.getTime() + this.istOffset);
        
        // Calculate next 2:30 AM IST
        const nextReset = new Date(istNow);
        nextReset.setHours(2, 30, 0, 0);
        
        // If it's already past 2:30 AM today, move to tomorrow
        if (istNow.getHours() > 2 || (istNow.getHours() === 2 && istNow.getMinutes() >= 30)) {
            nextReset.setDate(nextReset.getDate() + 1);
        }
        
        return nextReset;
    }

    // Get time until next reset
    getTimeUntilReset() {
        const now = new Date();
        const nextReset = this.getNextResetTime();
        const timeDiff = nextReset.getTime() - (now.getTime() + this.istOffset);
        
        if (timeDiff <= 0) return { hours: 0, minutes: 0 };
        
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        return { hours, minutes };
    }

    // Debug function to check current IST time and trading day
    debugTimeInfo() {
        const now = new Date();
        const istTime = new Date(now.getTime() + this.istOffset);
        const tradingDay = this.getTradingDay();
        const nextReset = this.getNextResetTime();
        const timeUntilReset = this.getTimeUntilReset();
        
        console.log('=== Daily Tracker Debug Info ===');
        console.log('UTC Time:', now.toISOString());
        console.log('IST Time:', istTime.toISOString());
        console.log('Trading Day:', tradingDay);
        console.log('Next Reset:', nextReset.toISOString());
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