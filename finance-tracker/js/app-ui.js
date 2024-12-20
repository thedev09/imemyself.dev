// UI Functions
function switchView(view) {
    state.currentView = view;
    
    document.querySelectorAll('.view').forEach(el => {
        if (el.id === `${view}-view`) {
            el.style.display = 'block';
            el.classList.add('loading');
        } else {
            el.style.display = 'none';
        }
    });
    
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.toggle('active', el.dataset.view === view);
        el.setAttribute('aria-selected', el.dataset.view === view);
    });

    setTimeout(() => {
        document.querySelectorAll('.view').forEach(el => {
            el.classList.remove('loading');
        });
    }, 300);

    // Refresh data when switching views
    if (view === 'analytics') {
        renderCharts();
    }
}

// Rendering functions
async function renderAll() {
    try {
        renderAccounts();
        renderTransactions();
        if (state.currentView === 'analytics') {
            await renderCharts();
        }
    } catch (error) {
        console.error('Error rendering data:', error);
        showToast('Error displaying data. Please refresh the page.', 'error');
    }
}

function renderAccounts() {
    const accountsGrid = document.getElementById('accounts-grid');
    const accountSelects = document.querySelectorAll('select[name="account"]');
    
    if (!accountsGrid) return;

    if (!state.accounts.length) {
        accountsGrid.innerHTML = `
            <div class="no-data">No accounts found</div>
            <button class="account-card add-account" onclick="switchView('settings')">
                + Add Account
            </button>
        `;
        return;
    }

    accountsGrid.innerHTML = state.accounts.map(account => `
        <div class="account-card">
            <div class="account-header">
                <span class="account-name">${escapeHtml(account.name)}</span>
                <span class="account-type">${escapeHtml(account.type)}</span>
            </div>
            <div class="account-balance">
                ${formatCurrency(account.balance, account.currency)}
            </div>
            <div class="account-updated">
                Last updated: ${formatDate(account.updatedAt)}
            </div>
        </div>
    `).join('') + `
        <button class="account-card add-account" onclick="switchView('settings')">
            + Add Account
        </button>
    `;

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
    const monthlyCtx = document.getElementById('monthly-chart')?.getContext('2d');
    const categoryCtx = document.getElementById('category-chart')?.getContext('2d');

    if (!monthlyCtx || !categoryCtx || !state.transactions.length) return;

    const monthlyData = processMonthlyData(state.transactions);
    const categoryData = processCategoryData(state.transactions);

    createMonthlyChart(monthlyCtx, monthlyData);
    createCategoryChart(categoryCtx, categoryData);
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
                
                e.target.reset();
                document.querySelectorAll('.type-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                document.querySelector('.type-btn.income').classList.add('selected');
                
                await loadUserData(true);
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

// Chart processing functions
function processMonthlyData(transactions) {
    const monthlyData = {};
    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { income: 0, expense: 0 };
        }
        
        if (transaction.type === 'income') {
            monthlyData[monthYear].income += parseFloat(transaction.amount);
        } else {
            monthlyData[monthYear].expense += parseFloat(transaction.amount);
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
            categoryData[transaction.category] += parseFloat(transaction.amount);
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


// Account Management Functions
async function deleteAccount(accountId) {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
        return;
    }

    toggleLoading(true);
    try {
        const user = getCurrentUser();
        if (!user) throw new Error('Please sign in to continue');

        // Check if account has any transactions
        const transactionsRef = await db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .where('accountId', '==', accountId)
            .limit(1)
            .get();

        if (!transactionsRef.empty) {
            throw new Error('Cannot delete account with existing transactions');
        }

        // Delete the account
        await db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(accountId)
            .delete();

        // Remove from state and update UI
        state.accounts = state.accounts.filter(acc => acc.id !== accountId);
        renderAccounts();
        showToast('Account deleted successfully');
    } catch (error) {
        console.error('Error deleting account:', error);
        showToast(error.message || 'Error deleting account', 'error');
    } finally {
        toggleLoading(false);
    }
}

async function editAccount(account) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            <h2 class="card-title">Edit Account</h2>
            <form id="edit-account-form" class="form-grid">
                <div class="form-group">
                    <label for="editAccountName" class="form-label">Account Name</label>
                    <input type="text" 
                           id="editAccountName"
                           class="form-input" 
                           name="name" 
                           value="${escapeHtml(account.name)}"
                           required>
                </div>
                <div class="form-group">
                    <label for="editAccountType" class="form-label">Account Type</label>
                    <select id="editAccountType"
                            class="form-select" 
                            name="type"
                            required>
                        <option value="bank" ${account.type === 'bank' ? 'selected' : ''}>Bank Account</option>
                        <option value="crypto" ${account.type === 'crypto' ? 'selected' : ''}>Crypto Wallet</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editCurrency" class="form-label">Currency</label>
                    <select id="editCurrency"
                            class="form-select" 
                            name="currency"
                            required>
                        <option value="USD" ${account.currency === 'USD' ? 'selected' : ''}>USD</option>
                        <option value="INR" ${account.currency === 'INR' ? 'selected' : ''}>INR</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const form = document.getElementById('edit-account-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        toggleLoading(true);

        try {
            const formData = new FormData(e.target);
            const updatedAccount = {
                ...account,
                name: formData.get('name'),
                type: formData.get('type'),
                currency: formData.get('currency'),
                updatedAt: new Date().toISOString()
            };

            await db.collection('users')
                .doc(getCurrentUser().uid)
                .collection('accounts')
                .doc(account.id)
                .update(updatedAccount);

            // Update state and UI
            const index = state.accounts.findIndex(acc => acc.id === account.id);
            if (index !== -1) {
                state.accounts[index] = updatedAccount;
            }
            renderAccounts();
            modal.remove();
            showToast('Account updated successfully');
        } catch (error) {
            console.error('Error updating account:', error);
            showToast(error.message || 'Error updating account', 'error');
        } finally {
            toggleLoading(false);
        }
    });
}

function renderAccounts() {
    const accountsGrid = document.getElementById('accounts-grid');
    const accountSelects = document.querySelectorAll('select[name="account"]');
    
    if (!accountsGrid) return;

    const accountCards = state.accounts.map(account => `
        <div class="account-card">
            <div class="account-actions">
                <button onclick="editAccount(${JSON.stringify(account)})" 
                        class="action-btn edit" 
                        title="Edit Account">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button onclick="deleteAccount('${account.id}')" 
                        class="action-btn delete" 
                        title="Delete Account">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
            <div class="account-header">
                <span class="account-name">${escapeHtml(account.name)}</span>
                <span class="account-type">${escapeHtml(account.type)}</span>
            </div>
            <div class="account-balance">
                ${formatCurrency(account.balance, account.currency)}
            </div>
            <div class="account-updated">
                Last updated: ${formatDate(account.updatedAt)}
            </div>
        </div>
    `).join('');

    accountsGrid.innerHTML = accountCards + `
        <button onclick="switchView('settings')" class="account-card add-account-card">
            <span class="add-account-icon">+</span>
            <span class="add-account-text">Add New Account</span>
        </button>
    `;

    // Update account select dropdowns
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

// Make UI functions globally available
window.switchView = switchView;
window.renderAll = renderAll;