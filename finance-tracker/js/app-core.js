// State management
const state = {
    accounts: [],
    transactions: [],
    currentView: 'dashboard',
    isLoading: false,
};

// Core validation functions
function validateTransaction(transaction) {
    const errors = [];
    
    if (!transaction.amount || isNaN(transaction.amount) || transaction.amount <= 0) {
        errors.push('Please enter a valid amount greater than 0');
    }
    if (!transaction.accountId) {
        errors.push('Please select an account');
    }
    if (!transaction.category) {
        errors.push('Please select a category');
    }
    if (!transaction.paymentMode) {
        errors.push('Please select a payment mode');
    }
    
    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }
    return true;
}
// Add these functions to app-core.js

async function handleSelfTransfer(fromAccountId, toAccountId, amount) {
    const user = getCurrentUser();
    if (!user) throw new Error('Please sign in to continue');

    // Find the source and destination accounts
    const fromAccount = state.accounts.find(acc => acc.id === fromAccountId);
    const toAccount = state.accounts.find(acc => acc.id === toAccountId);

    // Validate accounts and amount
    if (!fromAccount || !toAccount) {
        throw new Error('Invalid accounts selected');
    }

    if (fromAccount.id === toAccount.id) {
        throw new Error('Cannot transfer to the same account');
    }

    if (parseFloat(amount) <= 0) {
        throw new Error('Amount must be greater than 0');
    }

    if (parseFloat(amount) > fromAccount.balance) {
        throw new Error('Insufficient balance');
    }

    // Calculate converted amount if currencies are different
    let convertedAmount = amount;
    if (fromAccount.currency !== toAccount.currency) {
        if (fromAccount.currency === 'USD' && toAccount.currency === 'INR') {
            convertedAmount = amount * USD_TO_INR;
        } else if (fromAccount.currency === 'INR' && toAccount.currency === 'USD') {
            convertedAmount = amount / USD_TO_INR;
        }
    }

    // Create withdrawal transaction
    const withdrawal = {
        id: Date.now().toString(),
        type: 'transfer', // Changed from 'expense' to 'transfer'
        amount: parseFloat(amount),
        accountId: fromAccountId,
        category: 'Self Transfer',
        notes: `Transfer to ${toAccount.name}`,
        paymentMode: 'Account Transfer',
        date: new Date().toISOString(),
        currency: fromAccount.currency,
        amountInINR: fromAccount.currency === 'USD' ? parseFloat(amount) * USD_TO_INR : parseFloat(amount),
        exchangeRate: fromAccount.currency === 'USD' ? USD_TO_INR : 1,
        accountName: fromAccount.name,
        userId: user.uid,
        createdAt: new Date().toISOString()
    };

    // Create deposit transaction
    const deposit = {
        id: (Date.now() + 1).toString(),
        type: 'transfer', // Changed from 'income' to 'transfer'
        amount: parseFloat(convertedAmount),
        accountId: toAccountId,
        category: 'Self Transfer',
        notes: `Transfer from ${fromAccount.name}`,
        paymentMode: 'Account Transfer',
        date: new Date().toISOString(),
        currency: toAccount.currency,
        amountInINR: toAccount.currency === 'USD' ? parseFloat(convertedAmount) * USD_TO_INR : parseFloat(convertedAmount),
        exchangeRate: toAccount.currency === 'USD' ? USD_TO_INR : 1,
        accountName: toAccount.name,
        userId: user.uid,
        createdAt: new Date().toISOString()
    };

    try {
        // Create a batch operation
        const batch = db.batch();

        // Add both transactions to the batch
        const withdrawalRef = db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .doc(withdrawal.id);
        batch.set(withdrawalRef, withdrawal);

        const depositRef = db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .doc(deposit.id);
        batch.set(depositRef, deposit);

        // Update source account balance
        const fromAccountRef = db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(fromAccountId);
        batch.update(fromAccountRef, { 
            balance: fromAccount.balance - parseFloat(amount),
            updatedAt: new Date().toISOString()
        });

        // Update destination account balance
        const toAccountRef = db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(toAccountId);
        batch.update(toAccountRef, { 
            balance: toAccount.balance + parseFloat(convertedAmount),
            updatedAt: new Date().toISOString()
        });

        // Commit the batch
        await batch.commit();

        // Update local state
        state.transactions.unshift(withdrawal, deposit);
        
        const fromAccountIndex = state.accounts.findIndex(acc => acc.id === fromAccountId);
        if (fromAccountIndex !== -1) {
            state.accounts[fromAccountIndex].balance -= parseFloat(amount);
            state.accounts[fromAccountIndex].updatedAt = new Date().toISOString();
        }

        const toAccountIndex = state.accounts.findIndex(acc => acc.id === toAccountId);
        if (toAccountIndex !== -1) {
            state.accounts[toAccountIndex].balance += parseFloat(convertedAmount);
            state.accounts[toAccountIndex].updatedAt = new Date().toISOString();
        }

        return { 
            fromAccount, 
            toAccount, 
            amount, 
            convertedAmount 
        };

    } catch (error) {
        console.error('Error in handleSelfTransfer:', error);
        throw new Error('Failed to process transfer. Please try again.');
    }
}

function calculateConvertedAmount(amount, fromAccountId, toAccountId) {
    const fromAccount = state.accounts.find(acc => acc.id === fromAccountId);
    const toAccount = state.accounts.find(acc => acc.id === toAccountId);
    
    if (!fromAccount || !toAccount) return amount;

    // If same currency, no conversion needed
    if (fromAccount.currency === toAccount.currency) return amount;

    // USD to INR conversion
    if (fromAccount.currency === 'USD' && toAccount.currency === 'INR') {
        return amount * USD_TO_INR;
    }

    // INR to USD conversion
    if (fromAccount.currency === 'INR' && toAccount.currency === 'USD') {
        return amount / USD_TO_INR;
    }

    return amount;
}

function getAnalyticsData(timeframe = 'monthly', selectedYear = new Date().getFullYear()) {
    // Filter out adjustments and transfers from calculations
    const transactions = state.transactions.filter(tx => 
        tx.type !== 'adjustment' && tx.type !== 'transfer'
    );
    
    if (timeframe === 'yearly') {
        const yearlyStats = {};
        
        transactions.forEach(tx => {
            const year = new Date(tx.date).getFullYear();
            
            if (!yearlyStats[year]) {
                yearlyStats[year] = { 
                    year, 
                    income: 0, 
                    expense: 0 
                };
            }
            
            const amount = tx.amountInINR || tx.amount;
            if (tx.type === 'income') {
                yearlyStats[year].income += amount;
            } else if (tx.type === 'expense') {
                yearlyStats[year].expense += amount;
            }
        });

        return Object.values(yearlyStats).sort((a, b) => a.year - b.year);
    } else {
        const monthlyStats = {};
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        
        // Initialize all months with zero values
        months.forEach((month, index) => {
            monthlyStats[month] = { 
                month,
                monthIndex: index, 
                income: 0, 
                expense: 0 
            };
        });

        transactions
            .filter(tx => new Date(tx.date).getFullYear() === selectedYear)
            .forEach(tx => {
                const month = months[new Date(tx.date).getMonth()];
                const amount = tx.amountInINR || tx.amount;
                
                if (tx.type === 'income') {
                    monthlyStats[month].income += amount;
                } else if (tx.type === 'expense') {
                    monthlyStats[month].expense += amount;
                }
            });

        return Object.values(monthlyStats).sort((a, b) => a.monthIndex - b.monthIndex);
    }
}

async function deleteTransaction(transactionId) {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
        return;
    }

    const user = getCurrentUser();
    if (!user) throw new Error('Please sign in to continue');

    try {
        toggleLoading(true);
        
        const transaction = state.transactions.find(tx => tx.id === transactionId);
        if (!transaction) throw new Error('Transaction not found');

        const account = state.accounts.find(acc => acc.id === transaction.accountId);
        if (!account) throw new Error('Account not found');

        // Calculate balance adjustment
        const amountAdjustment = transaction.type === 'income' ? -transaction.amount : transaction.amount;

        const batch = db.batch();

        // Delete transaction
        const transactionRef = db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .doc(transactionId);
        batch.delete(transactionRef);

        // Update account balance
        const accountRef = db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(account.id);
        batch.update(accountRef, { 
            balance: account.balance + amountAdjustment,
            updatedAt: new Date().toISOString()
        });

        await batch.commit();

        // Update local state
        state.transactions = state.transactions.filter(tx => tx.id !== transactionId);
        
        const accountIndex = state.accounts.findIndex(acc => acc.id === account.id);
        if (accountIndex !== -1) {
            state.accounts[accountIndex].balance += amountAdjustment;
            state.accounts[accountIndex].updatedAt = new Date().toISOString();
        }

        showToast('Transaction deleted successfully');
        await loadUserData(true);
    } catch (error) {
        console.error('Error deleting transaction:', error);
        showToast(error.message || 'Error deleting transaction', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Make it globally available
window.deleteTransaction = deleteTransaction;
// Make functions globally available
window.handleSelfTransfer = handleSelfTransfer;
window.calculateConvertedAmount = calculateConvertedAmount;
window.getAnalyticsData = getAnalyticsData;
function validateAccount(account) {
    const errors = [];
    
    if (!account.name || account.name.trim().length === 0) {
        errors.push('Account name is required');
    }
    if (!account.type) {
        errors.push('Please select an account type');
    }
    if (!account.currency || !['USD', 'INR'].includes(account.currency)) {
        errors.push('Please select a valid currency (USD or INR)');
    }
    if (isNaN(parseFloat(account.balance))) {
        errors.push('Please enter a valid initial balance');
    }
    
    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }
    return true;
}

// Account Management Functions
async function deleteAccount(accountId) {
    if (!confirm('Are you sure you want to delete this account? The transactions will be preserved for record-keeping.')) {
        return;
    }

    toggleLoading(true);
    try {
        const user = getCurrentUser();
        if (!user) throw new Error('Please sign in to continue');

        await db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(accountId)
            .update({
                isDeleted: true,
                deletedAt: new Date().toISOString()
            });

        state.accounts = state.accounts.filter(acc => acc.id !== accountId);
        renderAccounts();
        showToast('Account deleted successfully');

        if (typeof window.loadUserData === 'function') {
            await window.loadUserData(true);
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        showToast(error.message || 'Error deleting account', 'error');
    } finally {
        toggleLoading(false);
    }
}

async function saveAccount(account) {
    const user = getCurrentUser();
    if (!user) throw new Error('Please sign in to continue');
    
    validateAccount(account);
    
    // Find if account already exists
    const existingAccount = state.accounts.find(a => a.id === account.id);
    
    // If it's a new account, get the highest current displayOrder and add 1
    if (!account.displayOrder) {
        const highestOrder = Math.max(...state.accounts.map(a => a.displayOrder || 0), 0);
        account.displayOrder = highestOrder + 1;
    }
    
    const accountData = {
        ...account,
        userId: user.uid,
        createdAt: account.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
        displayOrder: account.displayOrder
    };

    try {
        const batch = db.batch();
        
        // If this is an update and balance changed, create adjustment transaction
        if (existingAccount && existingAccount.balance !== account.balance) {
            const balanceDiff = account.balance - existingAccount.balance;
            
            const adjustmentTransaction = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                type: 'adjustment',
                amount: Math.abs(balanceDiff),
                isIncrease: balanceDiff > 0,
                currency: account.currency,
                amountInINR: account.currency === 'USD' ? Math.abs(balanceDiff * USD_TO_INR) : Math.abs(balanceDiff),
                exchangeRate: account.currency === 'USD' ? USD_TO_INR : 1,
                accountId: account.id,
                accountName: account.name,
                category: 'Balance Reconciliation',
                notes: balanceDiff > 0 ? 'Balance adjusted upward' : 'Balance adjusted downward',
                paymentMode: 'Balance Adjustment',
                userId: user.uid,
                createdAt: new Date().toISOString()
            };

            const transactionRef = db.collection('users')
                .doc(user.uid)
                .collection('transactions')
                .doc(adjustmentTransaction.id);
            batch.set(transactionRef, adjustmentTransaction);
        }

        // Save account
        const accountRef = db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(accountData.id);
        batch.set(accountRef, accountData);

        await batch.commit();
        
        // Update local state
        const existingIndex = state.accounts.findIndex(a => a.id === accountData.id);
        if (existingIndex !== -1) {
            state.accounts[existingIndex] = accountData;
        } else {
            state.accounts.push(accountData);
        }
        
        return accountData;
    } catch (error) {
        console.error('Error in saveAccount:', error);
        throw new Error('Failed to save account. Please try again.');
    }
}

// Update renderAccountActivity to show detailed history
function renderAccountActivity(account) {
    const activities = [];

    // Add account creation
    activities.push({
        type: 'creation',
        date: account.createdAt,
        details: 'Account Created',
        icon: '📅'
    });

    // Add all history entries
    if (account.history) {
        account.history.forEach(entry => {
            if (entry.changes) {
                entry.changes.forEach(change => {
                    activities.push({
                        type: 'update',
                        date: entry.timestamp,
                        details: change,
                        icon: '🔄'
                    });
                });
            }
        });
    }

    // Sort activities by date, most recent first
    const sortedActivities = activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedActivities.length === 0) {
        return '<div class="no-activity">No activity found for this account</div>';
    }

    return `
        <div class="activity-list">
            ${sortedActivities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        ${activity.icon}
                    </div>
                    <div class="activity-info">
                        <div class="activity-title">${escapeHtml(activity.details)}</div>
                        <div class="activity-date">${formatDate(activity.date)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}
// Transaction Management
// Add this constant at the top of app-core.js
const USD_TO_INR = 84;

// Update the saveTransaction function
async function saveTransaction(transaction) {
    const user = getCurrentUser();
    if (!user) throw new Error('Please sign in to continue');

    validateTransaction(transaction);

    const transactionRef = db.collection('users')
        .doc(user.uid)
        .collection('transactions')
        .doc(transaction.id || Date.now().toString());
        
    try {
        const accountRef = db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(transaction.accountId);
            
        const accountDoc = await accountRef.get();
        const account = accountDoc.data();

        // Calculate amounts based on currency
        const originalAmount = parseFloat(transaction.amount);
        const currency = account ? account.currency : 'INR';
        const amountInINR = currency === 'USD' ? originalAmount * USD_TO_INR : originalAmount;
        
        const transactionData = {
            id: transaction.id || Date.now().toString(),
            date: transaction.date || new Date().toISOString(),
            type: transaction.type,
            amount: originalAmount,
            currency: currency,
            amountInINR: amountInINR,
            exchangeRate: currency === 'USD' ? USD_TO_INR : 1,
            accountId: transaction.accountId,
            accountName: account ? account.name : 'Deleted Account',
            category: transaction.category,
            notes: transaction.notes || '',
            paymentMode: transaction.paymentMode,
            userId: user.uid,
            createdAt: new Date().toISOString()
        };
        
        await transactionRef.set(transactionData);

        // Update account balance in its native currency
        if (account && !account.isDeleted) {
            const newBalance = transaction.type === 'income' 
                ? account.balance + originalAmount
                : account.balance - originalAmount;

            await accountRef.update({ 
                balance: newBalance,
                updatedAt: new Date().toISOString()
            });

            const accountIndex = state.accounts.findIndex(acc => acc.id === transaction.accountId);
            if (accountIndex !== -1) {
                state.accounts[accountIndex].balance = newBalance;
                state.accounts[accountIndex].updatedAt = transactionData.createdAt;
            }
        }

        state.transactions.unshift(transactionData);
        
        renderAll();
        return true;
    } catch (error) {
        console.error('Error saving transaction:', error);
        throw new Error(error.message || 'Failed to save transaction. Please try again.');
    }
}

// Data loading
// In app-core.js
async function loadUserData(forceRefresh = false) {
    const user = getCurrentUser();
    if (!user) return;
    
    if (state.isLoading) return;
    state.isLoading = true;
    toggleLoading(true);

    try {
        // Load accounts (keep existing accounts loading code)
        const accountsSnapshot = await db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .where('isDeleted', '==', false)
            .get();
        
        state.accounts = accountsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Modified transaction loading - load all transactions
        const transactionsSnapshot = await db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .orderBy('date', 'desc')
            .get();

        state.transactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        await renderAll();
        initializeTransactionView();
        updateTransactionView();

    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading transactions: ' + error.message, 'error');
    } finally {
        state.isLoading = false;
        toggleLoading(false);
    }
}

// Add this to app-core.js near formatCurrency function
function formatIndianNumber(number) {
    const roundedNum = Math.abs(Number(number).toFixed(2));
    const [whole, decimal] = roundedNum.toString().split('.');
    
    // Convert to Indian format
    let formattedWhole = whole;
    if (whole.length > 3) {
        const last3 = whole.substring(whole.length - 3);
        const remaining = whole.substring(0, whole.length - 3);
        formattedWhole = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
    }
    
    return formattedWhole + (decimal ? "." + decimal : "");
}

// Update formatCurrency function
function formatCurrency(amount, currency = 'INR', showBoth = false) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    
    try {
        if (currency === 'USD' && showBoth) {
            const inr = amount * USD_TO_INR;
            return `$${amount.toFixed(2)} (₹${formatIndianNumber(inr)})`;
        }
        
        return currency === 'USD' 
            ? `$${amount.toFixed(2)}`
            : `₹${formatIndianNumber(amount)}`;
    } catch (error) {
        return currency === 'USD' 
            ? `$${amount.toFixed(2)}`
            : `₹${formatIndianNumber(amount)}`;
    }
}

// Make it globally available


// Updated formatDate function to include time in IST
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

// Add to app-core.js
// In app-core.js
function filterTransactions(transactions, filters) {
    return transactions.filter(tx => {
        // Type filter
        if (filters.type !== 'all' && tx.type !== filters.type) return false;
        
        // Account filter
        if (filters.account !== 'all' && tx.accountId !== filters.account) return false;
        
        // Category filter
        if (filters.category !== 'all' && tx.category !== filters.category) return false;
        
        // Payment mode filter
        if (filters.paymentMode !== 'all' && tx.paymentMode !== filters.paymentMode) return false;
        
        // Date filter
        const txDate = new Date(tx.date);
        const now = new Date();
        
        switch (filters.dateRange) {
            case 'week':
                return txDate >= new Date(now - 7 * 24 * 60 * 60 * 1000);
            case 'month':
                return txDate >= new Date(now.setMonth(now.getMonth() - 1));
            case 'year':
                return txDate >= new Date(now.setFullYear(now.getFullYear() - 1));
            case 'custom':
                const start = filters.startDate ? new Date(filters.startDate) : null;
                const end = filters.endDate ? new Date(filters.endDate) : null;
                return (!start || txDate >= start) && (!end || txDate <= end);
            default:
                return true;
        }
    });
}

function calculateTransactionStats(transactions) {
    // Filter out self transfers
    const nonTransferTransactions = transactions.filter(tx => tx.category !== 'Self Transfer');
    
    return {
        total: transactions.length, // Keep total count including transfers
        income: nonTransferTransactions.reduce((sum, tx) => 
            tx.type === 'income' ? sum + tx.amountInINR : sum, 0),
        expense: nonTransferTransactions.reduce((sum, tx) => 
            tx.type === 'expense' ? sum + tx.amountInINR : sum, 0),
        avgTransaction: nonTransferTransactions.reduce((sum, tx) => 
            sum + tx.amountInINR, 0) / nonTransferTransactions.length || 0
    };
}

// Make functions globally available
window.filterTransactions = filterTransactions;
window.calculateTransactionStats = calculateTransactionStats;

// Style for deleted accounts
const style = document.createElement('style');
style.textContent = `
    .deleted-account {
        text-decoration: line-through;
        color: var(--gray-500);
    }
`;
document.head.appendChild(style);

// Initialize Firebase Auth listener
document.addEventListener('DOMContentLoaded', () => {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                await loadUserData(true);
            } catch (error) {
                console.error('Error loading initial data:', error);
                showToast('Error loading data. Please refresh the page.', 'error');
            }
        }
    });
});

// Make functions globally available
window.formatIndianNumber = formatIndianNumber;
window.saveAccount = saveAccount;
window.deleteAccount = deleteAccount;
window.saveTransaction = saveTransaction;
window.loadUserData = loadUserData;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;