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

// Firebase operations
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
        updatedAt: new Date().toISOString()
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

async function saveTransaction(transaction) {
    const user = getCurrentUser();
    if (!user) throw new Error('Please sign in to continue');

    validateTransaction(transaction);

    const transactionRef = db.collection('users')
        .doc(user.uid)
        .collection('transactions')
        .doc(transaction.id || Date.now().toString());
        
    const accountRef = db.collection('users')
        .doc(user.uid)
        .collection('accounts')
        .doc(transaction.accountId);

    try {
        const result = await db.runTransaction(async (dbTransaction) => {
            const accountDoc = await dbTransaction.get(accountRef);
            if (!accountDoc.exists) {
                throw new Error('Account not found');
            }

            const account = accountDoc.data();
            const currentBalance = parseFloat(account.balance) || 0;
            const amount = parseFloat(transaction.amount);
            
            const newBalance = transaction.type === 'income' 
                ? currentBalance + amount 
                : currentBalance - amount;

            const transactionData = {
                id: transaction.id || Date.now().toString(),
                date: transaction.date || new Date().toISOString(),
                type: transaction.type,
                amount: amount,
                accountId: transaction.accountId,
                category: transaction.category,
                currency: account.currency,
                userId: user.uid,
                createdAt: new Date().toISOString(),
                previousBalance: currentBalance,
                newBalance: newBalance
            };
            
            dbTransaction.set(transactionRef, transactionData);
            dbTransaction.update(accountRef, { 
                balance: newBalance,
                updatedAt: new Date().toISOString(),
                lastTransactionId: transactionData.id
            });

            return { transactionData, newBalance, accountId: account.id, currency: account.currency };
        });

        if (result) {
            const accountIndex = state.accounts.findIndex(acc => acc.id === result.accountId);
            if (accountIndex !== -1) {
                state.accounts[accountIndex].balance = result.newBalance;
                state.accounts[accountIndex].updatedAt = result.transactionData.createdAt;
            }
            
            state.transactions.unshift(result.transactionData);
            await renderAll();
        }

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

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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
window.saveTransaction = saveTransaction;
window.loadUserData = loadUserData;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;