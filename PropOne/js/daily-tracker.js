// Daily Tracker Module - daily-tracker.js
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
        const date = new Date(dateString + 'T02:30:00+05:30');
        return date;
    }

    // Check if we need to create a new daily snapshot
    shouldCreateSnapshot(accountId, currentBalance) {
        const today = this.getCurrentISTDateString();
        
        // Check if we already have a snapshot for today
        const todaySnapshot = this.dailySnapshots.find(
            snapshot => snapshot.accountId === accountId && snapshot.date === today
        );
        
        return !todaySnapshot;
    }

    // Create daily snapshot
    async createDailySnapshot(accountId, balance, accountSize, dailyDrawdownPercent) {
        try {
            const today = this.getCurrentISTDateString();
            const dailyDDLevel = balance - (accountSize * (dailyDrawdownPercent / 100));
            
            const snapshotData = {
                accountId,
                date: today,
                startingBalance: balance,
                dailyDDLevel,
                accountSize,
                dailyDrawdownPercent,
                createdAt: new Date()
            };
            
            const docRef = await addDoc(collection(db, 'dailySnapshots'), snapshotData);
            
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
                where('accountId', '==', accountId)
            );
            
            const querySnapshot = await getDocs(q);
            this.dailySnapshots = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
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
            
            const today = this.getCurrentISTDateString();
            let todaySnapshot = this.dailySnapshots.find(
                snapshot => snapshot.accountId === accountId && snapshot.date === today
            );
            
            // If no snapshot for today, create one
            if (!todaySnapshot) {
                const result = await this.createDailySnapshot(accountId, currentBalance, accountSize, dailyDrawdownPercent);
                if (result.success) {
                    todaySnapshot = result.snapshot;
                } else {
                    // Fallback calculation
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

    // Check if we've passed the IST reset time (2:30 AM) and need to update snapshots
    async checkAndUpdateDailySnapshots(accountId, currentBalance, accountSize, dailyDrawdownPercent) {
        try {
            const today = this.getCurrentISTDateString();
            const now = new Date();
            const todayResetTime = this.getISTResetTime(today);
            
            // If it's past 2:30 AM IST today and we don't have a snapshot, create one
            if (now >= todayResetTime && this.shouldCreateSnapshot(accountId, currentBalance)) {
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

    // Clean up old snapshots (optional - keep last 30 days)
    async cleanupOldSnapshots(accountId, daysToKeep = 30) {
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
            
            return { success: true, deletedCount: querySnapshot.docs.length };
        } catch (error) {
            console.error('Error deleting snapshots:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create and export singleton instance
const dailyTracker = new DailyTracker();
export default dailyTracker;