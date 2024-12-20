// State management
const state = {
    accounts: [],
    transactions: [],
    currentView: 'dashboard',
    isLoading: false,
    lastTransactionDate: null,
    pageSize: 20
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
    
    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }
    return true;
}

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

        // Instead of checking for transactions, we'll mark the account as deleted
        await db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(accountId)
            .update({
                isDeleted: true,
                deletedAt: new Date().toISOString()
            });

        // Remove from state and update UI
        state.accounts = state.accounts.filter(acc => acc.id !== accountId);
        renderAccounts();
        showToast('Account deleted successfully');

        // Refresh transactions to update their display
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
    
    const accountData = {
        id: account.id || Date.now().toString(),
        name: account.name.trim(),
        type: account.type,
        currency: account.currency,
        balance: parseFloat(account.balance) || 0,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false
    };
    
    try {
        await db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(accountData.id)
            .set(accountData);
            
        const existingIndex = state.accounts.findIndex(a => a.id === accountData.id);
        if (existingIndex !== -1) {
            state.accounts[existingIndex] = accountData;
        } else {
            state.accounts.push(accountData);
        }
        
        renderAccounts();
        return accountData;
    } catch (error) {
        console.error('Error saving account:', error);
        throw new Error('Failed to save account. Please try again.');
    }
}

// Transaction Management
async function saveTransaction(transaction) {
    const user = getCurrentUser();
    if (!user) throw new Error('Please sign in to continue');

    validateTransaction(transaction);

    const transactionRef = db.collection('users')
        .doc(user.uid)
        .collection('transactions')
        .doc(transaction.id || Date.now().toString());
        
    // Find the account (even if it's deleted)
    const accountRef = db.collection('users')
        .doc(user.uid)
        .collection('accounts')
        .doc(transaction.accountId);

    try {
        const accountDoc = await accountRef.get();
        const account = accountDoc.data();

        // Store account info with transaction
        const transactionData = {
            id: transaction.id || Date.now().toString(),
            date: transaction.date || new Date().toISOString(),
            type: transaction.type,
            amount: parseFloat(transaction.amount),
            accountId: transaction.accountId,
            accountName: account ? account.name : 'Deleted Account',
            category: transaction.category,
            currency: account ? account.currency : 'USD',
            userId: user.uid,
            createdAt: new Date().toISOString()
        };
        
        await transactionRef.set(transactionData);

        // Only update account balance if account still exists
        if (account && !account.isDeleted) {
            const newBalance = transaction.type === 'income' 
                ? account.balance + parseFloat(transaction.amount)
                : account.balance - parseFloat(transaction.amount);

            await accountRef.update({ 
                balance: newBalance,
                updatedAt: new Date().toISOString()
            });

            // Update account in state
            const accountIndex = state.accounts.findIndex(acc => acc.id === transaction.accountId);
            if (accountIndex !== -1) {
                state.accounts[accountIndex].balance = newBalance;
                state.accounts[accountIndex].updatedAt = transactionData.createdAt;
            }
        }

        // Update state with new transaction
        state.transactions.unshift(transactionData);
        
        // Render updates
        renderAll();
        return true;
    } catch (error) {
        console.error('Error saving transaction:', error);
        throw new Error(error.message || 'Failed to save transaction. Please try again.');
    }
}

// Data loading
async function loadUserData(forceRefresh = false) {
    const user = getCurrentUser();
    if (!user) return;
    
    if (state.isLoading) return;
    state.isLoading = true;
    toggleLoading(true);

    try {
        const accountsSnapshot = await db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .where('isDeleted', '==', false)  // Only load active accounts
            .get();
        
        state.accounts = accountsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        let transactionsQuery = db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .orderBy('createdAt', 'desc')
            .limit(state.pageSize);

        if (state.lastTransactionDate && !forceRefresh) {
            transactionsQuery = transactionsQuery.startAfter(state.lastTransactionDate);
        }

        const transactionsSnapshot = await transactionsQuery.get();
        const newTransactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (forceRefresh) {
            state.transactions = newTransactions;
        } else {
            state.transactions = [...state.transactions, ...newTransactions];
        }

        if (newTransactions.length > 0) {
            state.lastTransactionDate = newTransactions[newTransactions.length - 1].createdAt;
        }

        await renderAll();
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data. Please try again.', 'error');
    } finally {
        state.isLoading = false;
        toggleLoading(false);
    }
}

// Helper functions
function formatCurrency(amount, currency = 'USD') {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    } catch (error) {
        return currency === 'INR' 
            ? `₹${amount.toFixed(2)}`
            : `$${amount.toFixed(2)}`;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

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
window.saveAccount = saveAccount;
window.deleteAccount = deleteAccount;
window.saveTransaction = saveTransaction;
window.loadUserData = loadUserData;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;