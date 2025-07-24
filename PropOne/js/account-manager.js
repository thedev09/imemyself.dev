// Account Manager Module - account-manager.js
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
    getDoc,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class AccountManager {
    constructor() {
        this.accounts = [];
        this.filters = {
            active: accounts => accounts.filter(doc => {
                const account = doc.data();
                const currentPnL = account.currentBalance - account.accountSize;
                const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
                const isBreached = currentPnL < -maxDrawdownAmount;
                return account.status === 'active' && !isBreached;
            }),
            funded: accounts => accounts.filter(doc => {
                const account = doc.data();
                const currentPnL = account.currentBalance - account.accountSize;
                const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
                const isBreached = currentPnL < -maxDrawdownAmount;
                return account.phase === 'Funded' && account.status === 'active' && !isBreached;
            }),
            phase1: accounts => accounts.filter(doc => {
                const account = doc.data();
                const currentPnL = account.currentBalance - account.accountSize;
                const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
                const isBreached = currentPnL < -maxDrawdownAmount;
                return account.phase === 'Challenge Phase 1' && account.status === 'active' && !isBreached;
            }),
            phase2: accounts => accounts.filter(doc => {
                const account = doc.data();
                const currentPnL = account.currentBalance - account.accountSize;
                const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
                const isBreached = currentPnL < -maxDrawdownAmount;
                return account.phase === 'Challenge Phase 2' && account.status === 'active' && !isBreached;
            }),
            breached: accounts => accounts.filter(doc => {
                const account = doc.data();
                const currentPnL = account.currentBalance - account.accountSize;
                const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
                const isBreached = currentPnL < -maxDrawdownAmount;
                return account.status === 'breached' || (account.status === 'active' && isBreached);
            }),
            upgraded: accounts => accounts.filter(doc => doc.data().status === 'upgraded'),
            all: accounts => accounts
        };
    }

    // Load all accounts for a user
    async loadAccountsForUser(userId) {
        try {
            const q = query(
                collection(db, 'accounts'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            this.accounts = querySnapshot.docs;
            
            // Sort accounts: Funded > Phase 2 > Phase 1, then by balance
            this.accounts.sort((a, b) => {
    const accountA = a.data();
    const accountB = b.data();
    
    const getPhaseOrder = (phase) => {
        if (phase === 'Funded') return 0;
        if (phase === 'Challenge Phase 2') return 1;
        if (phase === 'Challenge Phase 1') return 2;
        return 3;
    };
    
    const phaseOrderA = getPhaseOrder(accountA.phase);
    const phaseOrderB = getPhaseOrder(accountB.phase);
    
    if (phaseOrderA !== phaseOrderB) {
        return phaseOrderA - phaseOrderB;
    }
    
    // Within same phase, sort by current balance (highest first)
    return accountB.currentBalance - accountA.currentBalance;
});
            
            return { success: true, accounts: this.accounts };
        } catch (error) {
            console.error('Error loading accounts:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all accounts
    getAllAccounts() {
        return this.accounts;
    }

    // Get filtered accounts
    getFilteredAccounts(filterType = 'active') {
        if (!this.filters[filterType]) {
            console.warn(`Unknown filter type: ${filterType}`);
            return this.accounts;
        }
        return this.filters[filterType](this.accounts);
    }

    // Add new account
    async addAccount(userId, accountData) {
        try {
            const data = {
                userId,
                ...accountData,
                status: 'active',
                upgradedFrom: null,
                upgradedTo: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const docRef = await addDoc(collection(db, 'accounts'), data);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error adding account:', error);
            return { success: false, error: error.message };
        }
    }

    // Update account
    async updateAccount(accountId, accountData) {
        try {
            const data = {
                ...accountData,
                updatedAt: new Date()
            };
            
            await updateDoc(doc(db, 'accounts', accountId), data);
            return { success: true };
        } catch (error) {
            console.error('Error updating account:', error);
            return { success: false, error: error.message };
        }
    }

    // Get account by ID
    async getAccount(accountId) {
        try {
            const docRef = doc(db, 'accounts', accountId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                return { success: false, error: 'Account not found' };
            }
            
            return { success: true, account: docSnap.data(), id: accountId };
        } catch (error) {
            console.error('Error getting account:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete account
    async deleteAccount(accountId) {
        try {
            await deleteDoc(doc(db, 'accounts', accountId));
            return { success: true };
        } catch (error) {
            console.error('Error deleting account:', error);
            return { success: false, error: error.message };
        }
    }

    // Mark account as breached
    async markAccountAsBreached(accountId, userId = null, reason = 'System detected breach') {
        try {
            // Get account data before updating for logging
            const accountDoc = await getDoc(doc(db, 'accounts', accountId));
            const accountData = accountDoc.data();
            
            await updateDoc(doc(db, 'accounts', accountId), {
                status: 'breached',
                breachedAt: new Date(),
                updatedAt: new Date()
            });
            
            // Log the breach activity if userId is provided
            if (userId) {
                const activityLogger = (await import('./activity-logger.js')).default;
                await activityLogger.logAccountStatusChanged(
                    userId,
                    accountId,
                    accountData.firmName,
                    accountData.alias,
                    accountData.status || 'active',
                    'breached',
                    reason
                );
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error marking account as breached:', error);
            return { success: false, error: error.message };
        }
    }

    // Upgrade account
    async upgradeAccount(oldAccountId, newAccountData) {
        try {
            // Add new account
            const newAccountResult = await this.addAccount(newAccountData.userId, newAccountData);
            if (!newAccountResult.success) {
                return newAccountResult;
            }

            // Mark old account as upgraded
            await updateDoc(doc(db, 'accounts', oldAccountId), {
                status: 'upgraded',
                upgradedTo: newAccountResult.id,
                updatedAt: new Date()
            });

            // Link new account to old account
            await updateDoc(doc(db, 'accounts', newAccountResult.id), {
                upgradedFrom: oldAccountId
            });

            return { success: true, newAccountId: newAccountResult.id };
        } catch (error) {
            console.error('Error upgrading account:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete all accounts for a user
    async deleteAllAccountsForUser(userId) {
        try {
            const q = query(
                collection(db, 'accounts'),
                where('userId', '==', userId)
            );
            
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            
            querySnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            this.accounts = [];
            
            return { success: true, deletedCount: querySnapshot.docs.length };
        } catch (error) {
            console.error('Error deleting all accounts:', error);
            return { success: false, error: error.message };
        }
    }

    // Generate summary statistics
    generateSummaryStats() {
        const stats = {
            funded: { count: 0, totalFunding: 0, totalProfit: 0 },
            challenge: { 
                phase1Active: 0, 
                phase1Capital: 0, 
                phase2Active: 0, 
                phase2Capital: 0 
            },
            inactive: { 
                phase1Breached: 0, 
                phase2Breached: 0, 
                fundedBreached: 0, 
                totalPassed: 0 
            }
        };
        
        this.accounts.forEach(doc => {
            const account = doc.data();
            const currentPnL = account.currentBalance - account.accountSize;
            const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
            const isBreached = currentPnL < -maxDrawdownAmount;
            
            if (account.status === 'active' && !isBreached) {
                if (account.phase === 'Funded') {
                    stats.funded.count++;
                    stats.funded.totalFunding += account.accountSize;
                    if (currentPnL > 0) {
                        const yourShare = currentPnL * (account.profitShare || 80) / 100;
                        stats.funded.totalProfit += yourShare;
                    }
                } else if (account.phase === 'Challenge Phase 1') {
                    stats.challenge.phase1Active++;
                    stats.challenge.phase1Capital += account.accountSize;
                } else if (account.phase === 'Challenge Phase 2') {
                    stats.challenge.phase2Active++;
                    stats.challenge.phase2Capital += account.accountSize;
                }
            } else if (account.status === 'breached' || (account.status === 'active' && isBreached)) {
                if (account.phase === 'Challenge Phase 1') {
                    stats.inactive.phase1Breached++;
                } else if (account.phase === 'Challenge Phase 2') {
                    stats.inactive.phase2Breached++;
                } else if (account.phase === 'Funded') {
                    stats.inactive.fundedBreached++;
                }
            } else if (account.status === 'upgraded') {
                stats.inactive.totalPassed++;
            }
        });
        
        // Add currently funded accounts to passed count
        stats.inactive.totalPassed += stats.funded.count;
        
        return stats;
    }

    // Calculate account health
    calculateAccountHealth(account) {
        const currentPnL = account.currentBalance - account.accountSize;
        const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
        const dailyDrawdownAmount = account.currentBalance * (account.dailyDrawdown / 100);
        
        return {
            currentPnL,
            maxDrawdownAmount,
            dailyDrawdownAmount,
            isMaxDrawdownBreached: currentPnL < -maxDrawdownAmount,
            isDailyDrawdownBreached: false, // Would need intraday tracking
            drawdownPercentage: Math.abs(currentPnL / maxDrawdownAmount) * 100,
            profitPercentage: account.profitTargetAmount > 0 ? (currentPnL / account.profitTargetAmount) * 100 : 0,
            isTargetReached: account.profitTargetAmount > 0 && currentPnL >= account.profitTargetAmount
        };
    }

    // Get account count
    getAccountCount() {
        return this.accounts.length;
    }

    // Calculate total data size
    calculateDataSize() {
        let totalSize = 0;
        this.accounts.forEach(doc => {
            const dataStr = JSON.stringify(doc.data());
            totalSize += new Blob([dataStr]).size;
        });
        return totalSize;
    }

    // Export accounts data
    exportAccountsData() {
        return this.accounts.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore timestamps to ISO strings
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
        }));
    }

    // Import accounts data
    async importAccountsData(userId, accountsData) {
        try {
            const batch = writeBatch(db);
            let importCount = 0;

            for (const accountData of accountsData) {
                // Remove the old ID and add current user ID
                const { id, ...cleanAccountData } = accountData;
                cleanAccountData.userId = userId;
                
                // Convert ISO strings back to dates
                if (cleanAccountData.createdAt && typeof cleanAccountData.createdAt === 'string') {
                    cleanAccountData.createdAt = new Date(cleanAccountData.createdAt);
                }
                if (cleanAccountData.updatedAt && typeof cleanAccountData.updatedAt === 'string') {
                    cleanAccountData.updatedAt = new Date(cleanAccountData.updatedAt);
                }

                // Add to batch
                const docRef = doc(collection(db, 'accounts'));
                batch.set(docRef, cleanAccountData);
                importCount++;
            }

            await batch.commit();
            return { success: true, importedCount: importCount };
        } catch (error) {
            console.error('Error importing accounts:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create and export singleton instance
const accountManager = new AccountManager();
export default accountManager;