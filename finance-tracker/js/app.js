// State management
const state = {
    accounts: [],
    transactions: [],
    currentView: 'dashboard',
    isLoading: false,
    lastTransactionDate: null
};

// Validation functions
function validateTransaction(transaction) {
    if (!transaction.amount || isNaN(transaction.amount) || transaction.amount <= 0) {
        throw new Error('Please enter a valid amount greater than 0');
    }
    if (!transaction.accountId) {
        throw new Error('Please select an account');
    }
    if (!transaction.category) {
        throw new Error('Please select a category');
    }
    return true;
}

function validateAccount(account) {
    if (!account.name || account.name.trim().length === 0) {
        throw new Error('Account name is required');
    }
    if (!account.type) {
        throw new Error('Please select an account type');
    }
    if (!account.currency) {
        throw new Error('Please select a currency');
    }
    if (!account.balance || isNaN(account.balance)) {
        throw new Error('Please enter a valid initial balance');
    }
    return true;
}

// Firebase operations
// Account handling functions
async function saveAccount(account) {
    const user = getCurrentUser();
    if (!user) throw new Error('Please sign in to continue');
    
    // Ensure account has an ID
    if (!account.id) {
        account.id = Date.now().toString();
    }
    
    validateAccount(account);
    
    const accountData = {
        ...account,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        balance: parseFloat(account.balance) || 0 // Ensure balance is a number
    };
    
    try {
        // Save to Firestore
        const accountRef = db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(account.id);
            
        await accountRef.set(accountData);
            
        // Update local state
        const existingIndex = state.accounts.findIndex(a => a.id === account.id);
        if (existingIndex !== -1) {
            state.accounts[existingIndex] = accountData;
        } else {
            state.accounts.push(accountData);
        }
        
        // Immediately render accounts to show the new account
        renderAccounts();
        return accountData;
    } catch (error) {
        console.error('Error saving account:', error);
        showToast('Failed to save account. Please try again.', 'error');
        throw error;
    }
}

// Transaction handling function
async function saveTransaction(transaction) {
    const user = getCurrentUser();
    if (!user) throw new Error('Please sign in to continue');

    // Ensure transaction has an ID
    if (!transaction.id) {
        transaction.id = Date.now().toString();
    }

    // Validate transaction
    validateTransaction(transaction);

    // Get references
    const transactionRef = db.collection('users')
        .doc(user.uid)
        .collection('transactions')
        .doc(transaction.id);
        
    const accountRef = db.collection('users')
        .doc(user.uid)
        .collection('accounts')
        .doc(transaction.accountId);

    try {
        const result = await db.runTransaction(async (dbTransaction) => {
            // Get account data
            const accountDoc = await dbTransaction.get(accountRef);
            if (!accountDoc.exists) {
                throw new Error('Account not found');
            }

            const account = accountDoc.data();
            const currentBalance = parseFloat(account.balance) || 0;
            
            // Calculate new balance based on transaction type
            const amount = parseFloat(transaction.amount);
            const newBalance = transaction.type === 'income' 
                ? currentBalance + amount 
                : currentBalance - amount;

            // Prepare transaction data
            const transactionData = {
                ...transaction,
                amount: amount, // Ensure amount is a number
                userId: user.uid,
                createdAt: new Date().toISOString(),
                previousBalance: currentBalance,
                newBalance: newBalance
            };
            
            // Save transaction
            dbTransaction.set(transactionRef, transactionData);

            // Update account balance
            dbTransaction.update(accountRef, { 
                balance: newBalance,
                updatedAt: new Date().toISOString(),
                lastTransactionId: transaction.id
            });

            return { transactionData, newBalance, accountId: account.id };
        });

        // Update local state
        if (result) {
            // Update account in local state
            const accountIndex = state.accounts.findIndex(acc => acc.id === result.accountId);
            if (accountIndex !== -1) {
                state.accounts[accountIndex].balance = result.newBalance;
                state.accounts[accountIndex].updatedAt = result.transactionData.createdAt;
            }
            
            // Add transaction to local state
            state.transactions.unshift(result.transactionData);
            
            // Render updates
            await renderAll();
        }

        return true;
    } catch (error) {
        console.error('Error saving transaction:', error);
        showToast('Failed to save transaction. Please try again.', 'error');
        
        // Refresh data from server on error
        await loadUserData(true);
        throw error;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Account form handler
    const accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            toggleLoading(true);

            try {
                const formData = new FormData(e.target);
                const account = {
                    id: Date.now().toString(),
                    name: formData.get('name'),
                    type: formData.get('type'),
                    currency: formData.get('currency'),
                    balance: parseFloat(formData.get('balance')) || 0
                };
                
                await saveAccount(account);
                e.target.reset();
                showToast('Account created successfully!');
                
                // Force refresh data
                await loadUserData(true);
            } catch (error) {
                console.error('Error saving account:', error);
                showToast(error.message || 'Error saving account', 'error');
            } finally {
                toggleLoading(false);
            }
        });
    }

    // Transaction form handler
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            toggleLoading(true);

            try {
                const formData = new FormData(e.target);
                const selectedTypeBtn = document.querySelector('.type-btn.selected');
                
                if (!selectedTypeBtn) {
                    throw new Error('Please select a transaction type');
                }

                const transaction = {
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    type: selectedTypeBtn.dataset.type,
                    amount: parseFloat(formData.get('amount')),
                    accountId: formData.get('account'),
                    category: formData.get('category')
                };

                await saveTransaction(transaction);
                
                // Reset form
                e.target.reset();
                document.querySelectorAll('.type-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                document.querySelector('.type-btn.income').classList.add('selected');
                
                showToast('Transaction added successfully!');
            } catch (error) {
                console.error('Error adding transaction:', error);
                showToast(error.message || 'Error adding transaction', 'error');
            } finally {
                toggleLoading(false);
            }
        });
    }
});

// View management
function switchView(view) {
    state.currentView = view;
    
    // Show loading state
    document.querySelectorAll('.view').forEach(el => {
        if (el.id === `${view}-view`) {
            el.style.display = 'block';
            el.classList.add('loading');
        } else {
            el.style.display = 'none';
        }
    });
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.toggle('active', el.dataset.view === view);
        el.setAttribute('aria-selected', el.dataset.view === view);
    });

    // Remove loading state after content update
    setTimeout(() => {
        document.querySelectorAll('.view').forEach(el => {
            el.classList.remove('loading');
        });
    }, 300);
}

// Data loading
async function loadUserData(forceRefresh = false) {
    const user = getCurrentUser();
    if (!user) return;
    
    state.isLoading = true;
    toggleLoading(true);

    try {
        // Load accounts
        const accountsSnapshot = await db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .get();
        
        state.accounts = accountsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Load transactions with pagination
        let transactionsQuery = db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .orderBy('date', 'desc')
            .limit(20);

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
            state.lastTransactionDate = newTransactions[newTransactions.length - 1].date;
        }

        await renderAll();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data. Please refresh the page.', 'error');
    } finally {
        state.isLoading = false;
        toggleLoading(false);
    }
}

// Rendering functions
async function renderAll() {
    renderAccounts();
    renderTransactions();
    await renderCharts();
}

function renderAccounts() {
    const accountsGrid = document.getElementById('accounts-grid');
    const accountSelects = document.querySelectorAll('select[name="account"]');
    
    if (!accountsGrid) return;

    // Render accounts grid
    accountsGrid.innerHTML = state.accounts.map(account => `
        <div class="account-card">
            <div class="account-header">
                <span class="account-name">${escapeHtml(account.name)}</span>
                <span class="account-type">${account.type}</span>
            </div>
            <div class="account-balance">
                ${formatCurrency(account.balance, account.currency)}
            </div>
        </div>
    `).join('') + `
        <button class="account-card add-account" onclick="switchView('settings')">
            + Add Account
        </button>
    `;

    // Update account selects
    accountSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = `
            <option value="">Select an account</option>
            ${state.accounts.map(account => `
                <option value="${account.id}" ${currentValue === account.id ? 'selected' : ''}>
                    ${escapeHtml(account.name)} (${account.currency})
                </option>
            `).join('')}
        `;
    });
}

function renderTransactions() {
    const recentTransactions = document.getElementById('recent-transactions');
    const allTransactions = document.getElementById('all-transactions');
    
    if (!state.transactions.length) {
        const noDataMessage = '<div class="no-data">No transactions found</div>';
        if (recentTransactions) recentTransactions.innerHTML = noDataMessage;
        if (allTransactions) allTransactions.innerHTML = noDataMessage;
        return;
    }

    const sortedTransactions = [...state.transactions].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );

    if (recentTransactions) {
        recentTransactions.innerHTML = sortedTransactions
            .slice(0, 5)
            .map(transaction => {
                const account = state.accounts.find(a => a.id === transaction.accountId);
                return `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <div class="transaction-category">${escapeHtml(transaction.category)}</div>
                            <div class="transaction-date">${formatDate(transaction.date)}</div>
                        </div>
                        <div class="amount-${transaction.type}">
                            ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount, account?.currency)}
                        </div>
                    </div>
                `;
            })
            .join('');
    }

    if (allTransactions) {
        allTransactions.innerHTML = sortedTransactions
            .map(transaction => {
                const account = state.accounts.find(a => a.id === transaction.accountId);
                return `
                    <tr>
                        <td>${formatDate(transaction.date)}</td>
                        <td>
                            <span class="badge-${transaction.type}">
                                ${transaction.type}
                            </span>
                        </td>
                        <td class="amount-${transaction.type}">
                            ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount, account?.currency)}
                        </td>
                        <td>${escapeHtml(account?.name || '')}</td>
                        <td>${escapeHtml(transaction.category)}</td>
                    </tr>
                `;
            })
            .join('');
    }
}

async function renderCharts() {
    if (state.currentView !== 'analytics') return;

    const monthlyCtx = document.getElementById('monthly-chart')?.getContext('2d');
    const categoryCtx = document.getElementById('category-chart')?.getContext('2d');

    if (!monthlyCtx || !categoryCtx || !state.transactions.length) return;

    // Process monthly data
    const monthlyData = processMonthlyData(state.transactions);
    
    // Process category data
    const categoryData = processCategoryData(state.transactions);

    // Create/update charts
    createMonthlyChart(monthlyCtx, monthlyData);
    createCategoryChart(categoryCtx, categoryData);
}

// Helper functions
function processMonthlyData(transactions) {
    const monthlyData = {};
    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { income: 0, expense: 0 };
        }
        
        if (transaction.type === 'income') {
            monthlyData[monthYear].income += transaction.amount;
        } else {
            monthlyData[monthYear].expense += transaction.amount;
        }
    });
    
    return monthlyData;
}

function processCategoryData(transactions) {
    const categoryData = {};
    transactions.forEach(transaction => {
        if (!categoryData[transaction.category]) {
            categoryData[transaction.category] = 0;
        }
        if (transaction.type === 'expense') {
            categoryData[transaction.category] += transaction.amount;
        }
    });
    
    return categoryData;
}

function createMonthlyChart(ctx, data) {
    const labels = Object.keys(data).sort();
    const incomeData = labels.map(month => data[month].income);
    const expenseData = labels.map(month => data[month].expense);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#22c55e'
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    backgroundColor: '#ef4444'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createCategoryChart(ctx, data) {
    const labels = Object.keys(data);
    const values = Object.values(data);

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#3b82f6',
                    '#ef4444',
                    '#22c55e',
                    '#f59e0b',
                    '#8b5cf6',
                    '#ec4899'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
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

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            switchView(e.target.dataset.view);
        });
    });

    // Transaction type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.type-btn').forEach(b => {
                b.classList.remove('selected');
                b.setAttribute('aria-pressed', 'false');
            });
            e.target.classList.add('selected');
            e.target.setAttribute('aria-pressed', 'true');
        });
    });

    // Account form
    const accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            toggleLoading(true);

            try {
                const formData = new FormData(e.target);
                const account = {
                    id: Date.now().toString(),
                    name: formData.get('name'),
                    type: formData.get('type'),
                    currency: formData.get('currency'),
                    balance: parseFloat(formData.get('balance'))
                };
                
                await saveAccount(account);
                state.accounts.push(account);
                renderAccounts();
                e.target.reset();
                showToast('Account created successfully!');
            } catch (error) {
                console.error('Error saving account:', error);
                showToast(error.message || 'Error saving account', 'error');
            } finally {
                toggleLoading(false);
            }
        });
    }

    // Transaction form
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            toggleLoading(true);

            try {
                const formData = new FormData(e.target);
                const selectedTypeBtn = document.querySelector('.type-btn.selected');
                
                if (!selectedTypeBtn) {
                    throw new Error('Please select a transaction type');
                }

                const transaction = {
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    type: selectedTypeBtn.dataset.type,
                    amount: parseFloat(formData.get('amount')),
                    accountId: formData.get('account'),
                    category: formData.get('category')
                };

                validateTransaction(transaction);
                await saveTransaction(transaction);
                
                e.target.reset();
                document.querySelector('.type-btn.income').classList.add('selected');
                document.querySelector('.type-btn.expense').classList.remove('selected');
                
                await renderAll();
                showToast('Transaction added successfully!');
            } catch (error) {
                console.error('Error adding transaction:', error);
                showToast(error.message || 'Error adding transaction', 'error');
            } finally {
                toggleLoading(false);
            }
        });
    }

    // Infinite scroll for transactions
    const transactionsView = document.getElementById('transactions-view');
    if (transactionsView) {
        transactionsView.addEventListener('scroll', async () => {
            if (state.isLoading) return;
            
            const threshold = 100;
            const bottomReached = 
                transactionsView.scrollHeight - transactionsView.scrollTop - transactionsView.clientHeight < threshold;
                
            if (bottomReached) {
                await loadUserData();
            }
        });
    }
});

// Make functions globally available
window.loadUserData = loadUserData;
window.switchView = switchView;
window.renderAll = renderAll;
window.getCurrentUser = getCurrentUser;
window.showToast = showToast;
window.toggleLoading = toggleLoading;