// Fixed payout-manager.js - Payout system for funded accounts
import { db } from './firebase-config.js';
import dailyTracker from './daily-tracker.js';
import { doc, updateDoc, addDoc, collection, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import activityLogger from './activity-logger.js';

class PayoutManager {
    constructor() {
        this.payouts = [];
    }

    // Calculate available payout amount
    calculateAvailablePayout(account) {
        const totalPnL = account.currentBalance - account.accountSize;
        const profitShare = account.profitShare || 80;
        
        if (totalPnL <= 0) {
            return {
                available: 0,
                totalProfit: totalPnL,
                yourShare: 0,
                companyShare: 0
            };
        }

        const yourShare = totalPnL * (profitShare / 100);
        const companyShare = totalPnL * ((100 - profitShare) / 100);

        return {
            available: yourShare,
            totalProfit: totalPnL,
            yourShare: yourShare,
            companyShare: companyShare,
            profitShare: profitShare
        };
    }

    // Request payout
    async requestPayout(userId, accountId, payoutAmount, reason = '') {
        try {
            console.log('Requesting payout:', { userId, accountId, payoutAmount, reason });
            
            // Get account data
            const accountDoc = await getDoc(doc(db, 'accounts', accountId));
            if (!accountDoc.exists()) {
                return { success: false, error: 'Account not found' };
            }

            const account = accountDoc.data();
            console.log('Account data:', account);
            
            // Validate account is funded
            if (account.phase !== 'Funded') {
                return { success: false, error: 'Only funded accounts can request payouts' };
            }

            // Calculate available payout
            const payoutInfo = this.calculateAvailablePayout(account);
            console.log('Payout info:', payoutInfo);
            
            if (payoutAmount > payoutInfo.available) {
                return { success: false, error: `Payout amount exceeds available amount of $${payoutInfo.available.toLocaleString()}` };
            }

            const oldBalance = account.currentBalance;
            const newBalance = account.accountSize; // Reset to account size
            
            // Create payout record
            const payoutData = {
                userId,
                accountId,
                firmName: account.firmName,
                alias: account.alias,
                payoutAmount,
                oldBalance,
                newBalance,
                totalProfit: payoutInfo.totalProfit,
                profitShare: account.profitShare,
                reason: reason || 'Regular payout',
                status: 'completed',
                requestedAt: new Date(),
                processedAt: new Date()
            };

            console.log('Creating payout record:', payoutData);

            // Add payout record
            const payoutRef = await addDoc(collection(db, 'payouts'), payoutData);
            console.log('Payout record created with ID:', payoutRef.id);

            // Update account balance to account size (reset)
            await updateDoc(doc(db, 'accounts', accountId), {
                currentBalance: newBalance,
                updatedAt: new Date(),
                lastPayoutAt: new Date(),
                lastPayoutAmount: payoutAmount
            });
            console.log('Account balance updated');

            // CRITICAL FIX: Reset daily tracking after payout
            console.log('Resetting daily tracking after payout...');
            const resetResult = await dailyTracker.resetAfterPayout(
                accountId,
                newBalance,
                account.accountSize,
                account.dailyDrawdown
            );
            
            if (resetResult.success) {
                console.log('Daily tracking reset successfully after payout');
            } else {
                console.error('Failed to reset daily tracking after payout:', resetResult.error);
                // Don't fail the payout, but log the error
            }

            // Log activity
            await activityLogger.logPayoutRequested(
                userId,
                accountId,
                payoutAmount,
                newBalance,
                oldBalance,
                account.firmName,
                account.alias
            );
            console.log('Activity logged');

            return { 
                success: true, 
                payoutId: payoutRef.id,
                payout: payoutData
            };

        } catch (error) {
            console.error('Error requesting payout:', error);
            return { success: false, error: error.message };
        }
    }

    // Show payout modal
    showPayoutModal(accountId, account) {
        console.log('Showing payout modal for account:', accountId, account);
        
        const payoutInfo = this.calculateAvailablePayout(account);
        
        if (payoutInfo.available <= 0) {
            alert('No profit available for payout');
            return;
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content compact">
                <span class="close">&times;</span>
                <h2>Request Payout</h2>
                
                <div class="payout-info">
                    <div class="account-info">
                        <h3>${account.alias ? `${account.alias}-` : ''}${account.firmName}</h3>
                        <p>Funded Account • $${account.accountSize.toLocaleString()}</p>
                    </div>
                    
                    <div class="payout-breakdown">
                        <div class="breakdown-item">
                            <span>Current Balance:</span>
                            <span>$${account.currentBalance.toLocaleString()}</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Account Size:</span>
                            <span>$${account.accountSize.toLocaleString()}</span>
                        </div>
                        <div class="breakdown-item profit">
                            <span>Total Profit:</span>
                            <span>${payoutInfo.totalProfit.toLocaleString()}</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Your Share (${payoutInfo.profitShare}%):</span>
                            <span class="available">${payoutInfo.available.toLocaleString()}</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Company Share:</span>
                            <span>${payoutInfo.companyShare.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <form id="payout-form">
                    <div class="form-group">
                        <label for="payout-amount">Payout Amount:</label>
                        <input type="number" id="payout-amount" step="0.01" max="${payoutInfo.available}" min="1" value="${payoutInfo.available}" required>
                        <small>Maximum available: ${payoutInfo.available.toLocaleString()}</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="payout-reason">Reason (Optional):</label>
                        <input type="text" id="payout-reason" placeholder="e.g., Monthly payout, Emergency withdrawal" maxlength="100">
                    </div>
                    
                    <div class="payout-warning">
                        <p><strong>⚠️ Warning:</strong> After payout, your account balance will reset to ${account.accountSize.toLocaleString()}. This action cannot be undone.</p>
                    </div>
                    
                    <div class="form-buttons">
                        <button type="button" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Request Payout</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Handle form submission
        modal.querySelector('#payout-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const payoutAmount = parseFloat(document.getElementById('payout-amount').value);
            const reason = document.getElementById('payout-reason').value.trim();
            
            if (payoutAmount > payoutInfo.available) {
                alert(`Payout amount cannot exceed ${payoutInfo.available.toLocaleString()}`);
                return;
            }

            if (payoutAmount <= 0) {
                alert('Payout amount must be greater than 0');
                return;
            }

            // Confirm payout
            if (!confirm(`Request payout of ${payoutAmount.toLocaleString()}? Your account balance will reset to ${account.accountSize.toLocaleString()}.`)) {
                return;
            }

            try {
                // Get current user ID
                const userId = getCurrentUserId();
                if (!userId) {
                    alert('Error: User not authenticated');
                    return;
                }

                console.log('Processing payout with userId:', userId);

                const result = await this.requestPayout(
                    userId,
                    accountId,
                    payoutAmount,
                    reason
                );

                if (result.success) {
                    alert(`Payout of ${payoutAmount.toLocaleString()} requested successfully!`);
                    modal.remove();
                    
                    // Reload accounts to show updated balance
                    if (typeof loadAccounts === 'function') {
                        loadAccounts();
                    } else if (window.loadAccounts) {
                        window.loadAccounts();
                    } else {
                        // Reload the page if no reload function available
                        window.location.reload();
                    }
                } else {
                    alert('Error requesting payout: ' + result.error);
                }
            } catch (error) {
                console.error('Error processing payout:', error);
                alert('Error processing payout: ' + error.message);
            }
        });

        // Close modal handlers
        modal.querySelector('.close').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-secondary').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        return modal;
    }

    // Load payout history for account
    async loadPayoutHistory(accountId) {
        try {
            const q = query(
                collection(db, 'payouts'),
                where('accountId', '==', accountId),
                orderBy('requestedAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error loading payout history:', error);
            return [];
        }
    }

    // Get total payouts for account
    async getTotalPayouts(accountId) {
        try {
            const payouts = await this.loadPayoutHistory(accountId);
            return payouts.reduce((total, payout) => total + payout.payoutAmount, 0);
        } catch (error) {
            console.error('Error calculating total payouts:', error);
            return 0;
        }
    }
}

// CSS for payout modal (add to your CSS file)
const payoutCSS = `
.payout-info {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
}

.account-info {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.account-info h3 {
    font-size: 1.2rem;
    margin-bottom: 5px;
    color: #fff;
}

.account-info p {
    color: #888;
    margin: 0;
}

.payout-breakdown {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.breakdown-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.breakdown-item.profit {
    font-weight: 600;
    color: #2ed573;
}

.breakdown-item .available {
    color: #667eea;
    font-weight: 600;
}

.payout-warning {
    background: rgba(255, 165, 2, 0.1);
    border: 1px solid rgba(255, 165, 2, 0.3);
    border-radius: 8px;
    padding: 12px;
    margin: 15px 0;
    font-size: 0.9rem;
}

.payout-warning p {
    margin: 0;
    color: #ffa502;
}

.form-group small {
    color: #888;
    font-size: 0.8rem;
    margin-top: 4px;
    display: block;
}
`;

// Inject CSS
if (!document.getElementById('payout-css')) {
    const style = document.createElement('style');
    style.id = 'payout-css';
    style.textContent = payoutCSS;
    document.head.appendChild(style);
}

// Helper function to get current user ID - FIXED
function getCurrentUserId() {
    // Try multiple ways to get the current user ID
    if (window.currentUser?.uid) {
        console.log('Got user ID from window.currentUser:', window.currentUser.uid);
        return window.currentUser.uid;
    }
    
    if (window.auth?.currentUser?.uid) {
        console.log('Got user ID from window.auth.currentUser:', window.auth.currentUser.uid);
        return window.auth.currentUser.uid;
    }
    
    // Try to import and get from auth
    try {
        import('./firebase-config.js').then(({ auth }) => {
            if (auth.currentUser?.uid) {
                console.log('Got user ID from imported auth:', auth.currentUser.uid);
                return auth.currentUser.uid;
            }
        });
    } catch (error) {
        console.error('Error importing auth:', error);
    }
    
    console.error('No current user found');
    return null;
}

// Create and export singleton instance
const payoutManager = new PayoutManager();
export default payoutManager;