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
    if (!transaction.accountId || !state.accounts.find(a => a.id === transaction.accountId)) {
        throw new Error('Please select a valid account');
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
    if (!account.balance || isNaN(account.balance)) {
        throw new Error('Please enter a valid initial balance');
    }
    return true;
}

// Firebase operations
async function saveAccount(account) {
    if (!currentUser) throw new Error('Please sign in to continue');
    validateAccount(account);
    
    return FirebaseService.setDocument(
        `users/${currentUser.uid}/accounts`,
        account.id,
        account
    );
}

async function saveTransaction(transaction) {
    if (!currentUser) throw new Error('Please sign in to continue');
    validateTransaction(transaction);
    
    return FirebaseService.setDocument(
        `users/${currentUser.uid}/transactions`,
        transaction.id,
        transaction
    );
}

// View management
function switchView(view) {
    console.log('Switching to view:', view);
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
    if (!currentUser) return;
    
    state.isLoading = true;
    auth.toggleLoading(true);

    try {
        // Load accounts
        const accountsSnapshot = await db.collection('users')
            .doc(currentUser.uid)
            .collection('accounts')
            .get();
        
        state.accounts = accountsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Load transactions with pagination
        const transactionsQuery = db.collection('users')
            .doc(currentUser.uid)
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
        auth.showToast('Error loading data. Please refresh the page.', 'error');
    } finally {
        state.isLoading = false;
        auth.toggleLoading(false);
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
    
    const noDataMessage = '<div class="text-center p-4">No transactions found</div>';
    
    if (!state.transactions.length) {
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

    if (!monthlyCtx || !categoryCtx) return;

    // Prepare monthly data
    const monthlyData = processMonthlyData(state.transactions);
    
    // Prepare category data
    const categoryData = processCategoryData(state.transactions);

    // Create/update charts
    createMonthlyChart(monthlyCtx, monthlyData);
    createCategoryChart(categoryCtx, categoryData);
}

// Helper functions
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
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
        });
    });

    // Account form
    const accountForm = document.getElementById('account-form');
if (accountForm) {
    accountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        toggleLoading(true);

        try {
            const user = getCurrentUser();
            if (!user) {
                throw new Error('Please sign in to continue');
            }

            const formData = new FormData(e.target);
            const account = {
                id: Date.now().toString(),
                name: formData.get('name'),
                type: formData.get('type'),
                currency: formData.get('currency'),
                balance: parseFloat(formData.get('balance')),
                userId: user.uid,
                createdAt: new Date().toISOString()
            };
            
            await db.collection('users')
                .doc(user.uid)
                .collection('accounts')
                .doc(account.id)
                .set(account);

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
            auth.toggleLoading(true);

            try {
                const formData = new FormData(e.target);
                const transaction = {
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    type: document.querySelector('.type-btn.selected').dataset.type,
                    amount: parseFloat(formData.get('amount')),
                    accountId: formData.get('account'),
                    category: formData.get('category')
                };

                // Update account balance
                const account = state.accounts.find(a => a.id === transaction.accountId);
                if (account) {
                    account.balance += transaction.type === 'income' ? 
                        transaction.amount : -transaction.amount;
                    await saveAccount(account);
                }

                await saveTransaction(transaction);
                state.transactions.unshift(transaction);
                await renderAll();
                e.target.reset();
                auth.showToast('Transaction added successfully!');
            } catch (error) {
                console.error('Error saving transaction:', error);
                auth.showToast(error.message || 'Error saving transaction', 'error');
            } finally {
                auth.toggleLoading(false);
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

// Make functions available globally
window.loadUserData = loadUserData;
window.switchView = switchView;