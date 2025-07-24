// activity-logger.js - FIXED HTML generation with clickable activities
import { db } from './firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class ActivityLogger {
    constructor() {
        this.activities = [];
    }

    // Log different types of activities
    async logActivity(userId, type, data) {
        try {
            const activityData = {
                userId,
                type, // 'account_created', 'account_edited', 'trade_added', 'account_upgraded', 'payout_requested'
                data,
                timestamp: new Date(),
                id: Date.now().toString() // Unique ID for this activity
            };

            const docRef = await addDoc(collection(db, 'activities'), activityData);
            
            console.log(`Activity logged: ${type}`, data);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error logging activity:', error);
            return { success: false, error: error.message };
        }
    }

    // Account created
    async logAccountCreated(userId, accountData) {
        return await this.logActivity(userId, 'account_created', {
            firmName: accountData.firmName,
            alias: accountData.alias,
            accountSize: accountData.accountSize,
            phase: accountData.phase,
            platform: accountData.platform,
            accountId: accountData.accountId || 'unknown'
        });
    }

    // Account edited
    async logAccountEdited(userId, accountId, oldData, newData) {
        const changes = {};
        
        // Track what changed
        if (oldData.currentBalance !== newData.currentBalance) {
            changes.balance = { from: oldData.currentBalance, to: newData.currentBalance };
        }
        if (oldData.alias !== newData.alias) {
            changes.alias = { from: oldData.alias, to: newData.alias };
        }
        
        return await this.logActivity(userId, 'account_edited', {
            accountId,
            firmName: oldData.firmName,
            alias: oldData.alias || newData.alias,
            changes
        });
    }

    // Trade added
    async logTradeAdded(userId, tradeData) {
        const pnl = tradeData.newBalance - tradeData.oldBalance;
        
        return await this.logActivity(userId, 'trade_added', {
            accountId: tradeData.accountId,
            oldBalance: tradeData.oldBalance,
            newBalance: tradeData.newBalance,
            pnl: pnl,
            instrument: tradeData.instrument,
            tradeType: tradeData.tradeType,
            notes: tradeData.notes
        });
    }

    // Account upgraded
    async logAccountUpgraded(userId, oldAccountId, newAccountId, fromPhase, toPhase, firmName, alias) {
        return await this.logActivity(userId, 'account_upgraded', {
            oldAccountId,
            newAccountId,
            fromPhase,
            toPhase,
            firmName,
            alias
        });
    }

    // Payout requested
    async logPayoutRequested(userId, accountId, payoutAmount, newBalance, oldBalance, firmName, alias) {
        return await this.logActivity(userId, 'payout_requested', {
            accountId,
            firmName,
            alias,
            payoutAmount,
            oldBalance,
            newBalance,
            profitBeforePayout: oldBalance - newBalance + payoutAmount
        });
    }

    // Account deleted/breached
    async logAccountStatusChanged(userId, accountId, firmName, alias, fromStatus, toStatus, reason = null) {
        return await this.logActivity(userId, 'account_status_changed', {
            accountId,
            firmName,
            alias,
            fromStatus,
            toStatus,
            reason
        });
    }

    // Load activities for user
    async loadActivitiesForUser(userId, limitCount = 50) {
        try {
            // Build query based on limit
            let q;
            if (limitCount > 0) {
                q = query(
                    collection(db, 'activities'),
                    where('userId', '==', userId),
                    orderBy('timestamp', 'desc'),
                    limit(limitCount)
                );
            } else {
                // If limit is 0 or negative, get all activities without limit
                q = query(
                    collection(db, 'activities'),
                    where('userId', '==', userId),
                    orderBy('timestamp', 'desc')
                );
            }

            const querySnapshot = await getDocs(q);
            this.activities = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log(`Loaded ${this.activities.length} activities for user ${userId}`);
            return { success: true, activities: this.activities };
        } catch (error) {
            console.error('Error loading activities:', error);
            return { success: false, error: error.message };
        }
    }

    // Get activity display info
    getActivityDisplayInfo(activity) {
        const timestamp = activity.timestamp?.toDate?.() || new Date(activity.timestamp);
        const timeStr = timestamp.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let icon, title, description, color, accountId;

        switch (activity.type) {
            case 'account_created':
                icon = '🎯';
                color = 'blue';
                title = 'Account Created';
                description = `${activity.data.firmName}${activity.data.alias ? ` (${activity.data.alias})` : ''} • ${activity.data.phase} • $${activity.data.accountSize.toLocaleString()}`;
                accountId = activity.data.accountId;
                break;

            case 'account_edited':
                icon = '✏️';
                color = 'orange';
                title = 'Account Edited';
                description = `${activity.data.firmName}${activity.data.alias ? ` (${activity.data.alias})` : ''}`;
                if (activity.data.changes.balance) {
                    description += ` • Balance: $${activity.data.changes.balance.to.toLocaleString()}`;
                }
                accountId = activity.data.accountId;
                break;

            case 'trade_added':
                icon = activity.data.pnl >= 0 ? '📈' : '📉';
                color = activity.data.pnl >= 0 ? 'green' : 'red';
                title = 'Trade Added';
                description = `${activity.data.pnl >= 0 ? '+' : ''}$${activity.data.pnl.toLocaleString()}`;
                if (activity.data.instrument) {
                    description += ` (${activity.data.instrument})`;
                }
                description += ` • Balance: $${activity.data.newBalance.toLocaleString()}`;
                accountId = activity.data.accountId;
                break;

            case 'account_upgraded':
                icon = '🚀';
                color = 'purple';
                title = 'Account Upgraded';
                description = `${activity.data.firmName}${activity.data.alias ? ` (${activity.data.alias})` : ''} • ${activity.data.fromPhase} → ${activity.data.toPhase}`;
                // For upgrades, link to the new account
                accountId = activity.data.newAccountId;
                break;

            case 'payout_requested':
                icon = '💰';
                color = 'gold';
                title = 'Payout Requested';
                description = `${activity.data.firmName}${activity.data.alias ? ` (${activity.data.alias})` : ''} • $${activity.data.payoutAmount.toLocaleString()} payout`;
                accountId = activity.data.accountId;
                break;

            case 'account_status_changed':
                icon = activity.data.toStatus === 'breached' ? '❌' : '🔄';
                color = activity.data.toStatus === 'breached' ? 'red' : 'gray';
                title = 'Status Changed';
                description = `${activity.data.firmName}${activity.data.alias ? ` (${activity.data.alias})` : ''} • ${activity.data.fromStatus} → ${activity.data.toStatus}`;
                accountId = activity.data.accountId;
                break;

            default:
                icon = '📝';
                color = 'gray';
                title = 'Activity';
                description = activity.type;
                accountId = activity.data.accountId;
        }

        return {
            icon,
            title,
            description,
            timeStr,
            color,
            timestamp,
            accountId // Include accountId for navigation
        };
    }

    // ENHANCED: Generate activity feed HTML with clickable items
    generateActivityFeedHTML(activities, limit = 10) {
        if (!activities || activities.length === 0) {
            return `
                <div class="empty-state">
                    <p>No activities yet. Start by adding an account or making a trade!</p>
                </div>
            `;
        }

        const displayActivities = limit > 0 ? activities.slice(0, limit) : activities;

        return displayActivities.map(activity => {
            const display = this.getActivityDisplayInfo(activity);
            
            // Determine if item should be clickable
            const isClickable = display.accountId && display.accountId !== 'unknown';
            const clickableClass = isClickable ? 'clickable' : '';
            const clickHandler = isClickable ? `onclick="navigateToAccount('${display.accountId}')"` : '';
            const cursorStyle = isClickable ? 'cursor: pointer;' : '';
            
            return `
                <div class="activity-item ${display.color} ${clickableClass}" 
                     ${clickHandler} 
                     style="${cursorStyle}" 
                     title="${isClickable ? 'Click to view account details' : ''}">
                    <div class="activity-icon">${display.icon}</div>
                    <div class="activity-content-area">
                        <div class="activity-main-info">
                            <div class="activity-title">${display.title}</div>
                            <div class="activity-description">${display.description}</div>
                        </div>
                        <div class="activity-time">${display.timeStr}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Get daily activity summary
    getDailyActivitySummary(activities) {
        const today = new Date().toDateString();
        const todayActivities = activities.filter(activity => {
            const activityDate = (activity.timestamp?.toDate?.() || new Date(activity.timestamp)).toDateString();
            return activityDate === today;
        });

        const summary = {
            total: todayActivities.length,
            trades: todayActivities.filter(a => a.type === 'trade_added').length,
            accounts: todayActivities.filter(a => a.type === 'account_created').length,
            upgrades: todayActivities.filter(a => a.type === 'account_upgraded').length,
            payouts: todayActivities.filter(a => a.type === 'payout_requested').length
        };

        return summary;
    }
}

// Global function for navigation (will be called from HTML onclick)
window.navigateToAccount = function(accountId) {
    if (accountId && accountId !== 'unknown') {
        // Check if we're already on an account page to avoid nested navigation
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('account-dashboard.html')) {
            // We're already on an account page, just change the ID parameter
            window.location.href = `account-dashboard.html?id=${accountId}`;
        } else if (currentPath.includes('/pages/')) {
            // We're in the pages directory (like activity.html)
            window.location.href = `account-dashboard.html?id=${accountId}`;
        } else {
            // We're in the root directory
            window.location.href = `pages/account-dashboard.html?id=${accountId}`;
        }
    }
};

// Create and export singleton instance
const activityLogger = new ActivityLogger();
export default activityLogger;