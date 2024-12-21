// Transaction Categories
const TRANSACTION_CATEGORIES = {
    income: [
        'Salary',
        'Gift',
        'Payouts',
        'Gambling',
        'Investments',
        'Business',
        'Freelance',
        'Rental Income',
        'Interest',
        'Dividends',
        'Bonus',
        'Commission',
        'Refunds',
        'Other Income'
    ],
    expense: [
        'Food & Dining',
        'Travel',
        'Entertainment',
        'Friends & Family',
        'Shopping',
        'Transportation',
        'Housing',
        'Utilities',
        'Healthcare',
        'Education',
        'Personal Care',
        'Gifts & Donations',
        'Bills',
        'Groceries',
        'Clothing',
        'Electronics',
        'Home Maintenance',
        'Vehicle',
        'Insurance',
        'Subscriptions',
        'Pets',
        'Sports & Fitness',
        'Books',
        'Hobbies',
        'Other Expenses'
    ]
};

const PAYMENT_MODES = {
    bank: [
        'UPI',
        'Bank Transfer',
        'Debit Card',
        'Credit Card',
        'Cash',
        'Net Banking'
    ],
    crypto: [
        'Crypto Transfer',
        'Crypto Card',
        'Exchange Transfer',
        'DeFi Transaction'
    ]
};

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

    if (view === 'analytics') {
        renderCharts();
    }
}

// Function to update category options based on transaction type
function updateCategoryOptions(transactionType) {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;

    const categories = TRANSACTION_CATEGORIES[transactionType] || [];
    
    categorySelect.innerHTML = `
        <option value="">Select a category</option>
        ${categories.map(category => `
            <option value="${category}">${category}</option>
        `).join('')}
    `;
}

// Add this function to app-ui.js
async function editAccount(accountId) {
    const account = state.accounts.find(acc => acc.id === accountId);
    if (!account) {
        showToast('Account not found', 'error');
        return;
    }

    // Switch to settings view
    switchView('settings');

    // Get the form elements
    const form = document.getElementById('account-form');
    if (!form) return;

    // Populate form with account data
    form.querySelector('#accountName').value = account.name;
    form.querySelector('#accountType').value = account.type;
    form.querySelector('#currency').value = account.currency;
    form.querySelector('#balance').value = account.balance;

    // Update form submit handler for editing
    const originalSubmitHandler = form.onsubmit;
    form.onsubmit = async (e) => {
        e.preventDefault();
        toggleLoading(true);

        try {
            const formData = new FormData(e.target);
            const updatedAccount = {
                id: accountId, // Keep the original ID
                name: formData.get('name'),
                type: formData.get('type'),
                currency: formData.get('currency'),
                balance: parseFloat(formData.get('balance')) || 0
            };
            
            await saveAccount(updatedAccount);
            form.reset();
            showToast('Account updated successfully!');
            await loadUserData(true);
            
            // Restore original submit handler
            form.onsubmit = originalSubmitHandler;
        } catch (error) {
            console.error('Error updating account:', error);
            showToast(error.message || 'Error updating account', 'error');
        } finally {
            toggleLoading(false);
        }
    };
}

// Make the function globally available
window.editAccount = editAccount;

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
            <div class="account-card">
                <div class="no-data">No accounts found</div>
                <button onclick="switchView('settings')" class="btn btn-primary">
                    + Add Account
                </button>
            </div>
        `;
        return;
    }

    const accountCards = state.accounts.map(account => `
        <div class="account-card ${account.type.toLowerCase()}">
            <div class="account-actions">
                <button onclick="editAccount('${account.id}')" 
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
            <span class="account-type ${account.type.toLowerCase()}">${account.type}</span>
            <h3 class="account-name">${escapeHtml(account.name)}</h3>
            <div class="account-balance">
                ${formatCurrency(account.balance, account.currency)}
            </div>
            <div class="account-updated">
                Last updated: ${formatDate(account.updatedAt)}
            </div>
        </div>
    `).join('');

    accountsGrid.innerHTML = accountCards + `
        <div class="account-card add-account" onclick="switchView('settings')">
            <div class="add-account-content">
                <span class="add-icon">+</span>
                <span class="add-text">Add New Account</span>
            </div>
        </div>
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
function renderTransactionItem(transaction, account) {
    return `
        <div class="transaction-item">
            <div class="transaction-main">
                <div class="transaction-primary">
                    <span class="transaction-title">${escapeHtml(transaction.category)}</span>
                    <span class="transaction-tag ${transaction.type.toLowerCase()}">${transaction.type.toUpperCase()}</span>
                </div>
                <div class="transaction-details">
                    <span class="transaction-time">${formatDate(transaction.date)}</span>
                    <span class="transaction-separator">•</span>
                    <span class="transaction-account">${escapeHtml(account?.name || '')}</span>
                    ${transaction.paymentMode ? `
                        <span class="transaction-separator">•</span>
                        <span class="transaction-payment">${escapeHtml(transaction.paymentMode)}</span>
                    ` : ''}
                    ${transaction.notes ? `
                        <span class="transaction-separator">•</span>
                        <span class="transaction-notes">${escapeHtml(transaction.notes)}</span>
                    ` : ''}
                </div>
            </div>
            <div class="transaction-amount ${transaction.type.toLowerCase()}">
                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount, account?.currency)}
            </div>
        </div>
    `;
}

// Update the renderTransactions function to use the new template
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

    // Render Recent Transactions
    if (recentTransactions) {
        recentTransactions.innerHTML = sortedTransactions
            .slice(0, 5)
            .map(transaction => {
                const account = state.accounts.find(a => a.id === transaction.accountId);
                return renderTransactionItem(transaction, account);
            })
            .join('');
    }

    // Render All Transactions Table (keeping the existing table format)
    if (allTransactions) {
        allTransactions.innerHTML = sortedTransactions
            .map(transaction => {
                const account = state.accounts.find(a => a.id === transaction.accountId);
                return `
                    <tr>
                        <td>${formatDate(transaction.date)}</td>
                        <td><span class="badge-${transaction.type}">${transaction.type}</span></td>
                        <td class="amount-${transaction.type}">
                            ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount, account?.currency)}
                        </td>
                        <td>${transaction.paymentMode ? `<span class="payment-mode-badge">${escapeHtml(transaction.paymentMode)}</span>` : ''}</td>
                        <td>${escapeHtml(account?.name || '')}</td>
                        <td>${escapeHtml(transaction.category)}</td>
                        <td>${transaction.notes ? `<span class="transaction-notes-text">${escapeHtml(transaction.notes)}</span>` : ''}</td>
                    </tr>
                `;
            })
            .join('');
    }

    // Render All Transactions Table
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
    <td>
        ${transaction.paymentMode ? 
            `<span class="payment-mode-badge">
                ${escapeHtml(transaction.paymentMode)}
            </span>` : 
            ''
        }
    </td>
    <td>${escapeHtml(account?.name || '')}</td>
    <td>${escapeHtml(transaction.category)}</td>
    <td>
        ${transaction.notes ? 
            `<span class="transaction-notes-text">
                ${escapeHtml(transaction.notes)}
            </span>` : 
            ''
        }
    </td>
</tr>
                `;
            })
            .join('');
    }
}


function updatePaymentModes(accountId) {
    const paymentModeSelect = document.getElementById('paymentMode');
    if (!paymentModeSelect) return;

    const account = state.accounts.find(acc => acc.id === accountId);
    if (!account) {
        paymentModeSelect.innerHTML = '<option value="">Select payment mode</option>';
        return;
    }

    const modes = PAYMENT_MODES[account.type.toLowerCase()] || [];
    
    paymentModeSelect.innerHTML = `
        <option value="">Select payment mode</option>
        ${modes.map(mode => `
            <option value="${mode}">${mode}</option>
        `).join('')}
    `;
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
            
            // Update categories when transaction type changes
            updateCategoryOptions(e.target.dataset.type);
        });
    });

    // Initialize with income categories
    updateCategoryOptions('income');

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
                    category: formData.get('category'),
                    notes: formData.get('notes') || '',
                    paymentMode: formData.get('paymentMode') // Add this line
                };

                await saveTransaction(transaction);
                
                e.target.reset();
                document.querySelectorAll('.type-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                document.querySelector('.type-btn.income').classList.add('selected');
                updateCategoryOptions('income');
                
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

// Add account change listener to update payment modes
const accountSelect = document.getElementById('account');
if (accountSelect) {
    accountSelect.addEventListener('change', (e) => {
        updatePaymentModes(e.target.value);
    });
}

// Make functions globally available
window.switchView = switchView;
window.renderAll = renderAll;
window.updateCategoryOptions = updateCategoryOptions;