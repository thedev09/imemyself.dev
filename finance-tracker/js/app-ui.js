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

    // Store the original submit handler
    const originalSubmitHandler = form.onsubmit;
    
    // Add a flag to the form to indicate we're in edit mode
    form.dataset.editMode = 'true';
    form.dataset.editAccountId = accountId;

    // Update form submit handler for editing
    form.onsubmit = async (e) => {
        e.preventDefault();
        toggleLoading(true);

        try {
            const formData = new FormData(e.target);
            const updatedAccount = {
                ...account, // Keep all original properties
                id: accountId, // Ensure we keep the original ID
                name: formData.get('name'),
                type: formData.get('type'),
                currency: formData.get('currency'),
                balance: parseFloat(formData.get('balance')) || 0,
                updatedAt: new Date().toISOString()
            };
            
            await saveAccount(updatedAccount);
            form.reset();
            showToast('Account updated successfully!');
            await loadUserData(true);
            
            // Clean up edit mode
            form.dataset.editMode = 'false';
            delete form.dataset.editAccountId;
            
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

// Also update the account form's default submit handler to check for edit mode
document.addEventListener('DOMContentLoaded', () => {
    const accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            // If we're in edit mode, don't handle the submit here
            if (accountForm.dataset.editMode === 'true') return;

            e.preventDefault();
            toggleLoading(true);

            try {
                const formData = new FormData(e.target);
                const account = {
                    id: Date.now().toString(),
                    name: formData.get('name'),
                    type: formData.get('type'),
                    currency: formData.get('currency'),
                    balance: parseFloat(formData.get('balance')) || 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
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
});

// In app-ui.js
function createEditAccountModal(account) {
    const modalHTML = `
        <div class="modal-overlay" id="edit-account-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">
                        <h2>Edit Account</h2>
                    </div>
                    <button class="modal-close" onclick="closeEditAccountModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="edit-account-form">
                        <div class="form-grid">
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
                            <div class="form-group">
                                <label for="editBalance" class="form-label">Balance</label>
                                <input type="number" 
                                       id="editBalance"
                                       class="form-input" 
                                       name="balance" 
                                       value="${account.balance}"
                                       required 
                                       step="0.01"
                                       min="0">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="submit" class="btn btn-primary">Update Account</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Add modal to the document
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Get the modal and form elements
    const modal = document.getElementById('edit-account-modal');
    const form = document.getElementById('edit-account-form');

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        toggleLoading(true);

        try {
            const formData = new FormData(e.target);
            const updatedAccount = {
                ...account, // Keep original properties
                id: account.id, // Ensure we keep the original ID
                name: formData.get('name'),
                type: formData.get('type'),
                currency: formData.get('currency'),
                balance: parseFloat(formData.get('balance')) || 0,
                updatedAt: new Date().toISOString()
            };

            console.log('Updating account:', updatedAccount); // Debug log
            
            await saveAccount(updatedAccount);
            closeEditAccountModal();
            showToast('Account updated successfully!');
            await loadUserData(true);
        } catch (error) {
            console.error('Error updating account:', error);
            showToast(error.message || 'Error updating account', 'error');
        } finally {
            toggleLoading(false);
        }
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeEditAccountModal();
        }
    });

    // Close on escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeEditAccountModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function closeEditAccountModal() {
    const modal = document.getElementById('edit-account-modal');
    if (modal) {
        modal.remove();
    }
}

// Simplified edit account function
async function editAccount(accountId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const account = state.accounts.find(acc => acc.id === accountId);
    if (!account) {
        showToast('Account not found', 'error');
        return;
    }

    createEditAccountModal(account);
}

window.editAccount = editAccount;
window.closeEditAccountModal = closeEditAccountModal;

function closeEditAccountModal() {
    const modal = document.getElementById('edit-account-modal');
    if (modal) {
        modal.remove();
    }
}

// Replace the existing editAccount function with this new version
async function editAccount(accountId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const account = state.accounts.find(acc => acc.id === accountId);
    if (!account) {
        showToast('Account not found', 'error');
        return;
    }

    createEditAccountModal(account);
}

// Make functions globally available
window.editAccount = editAccount;
window.closeEditAccountModal = closeEditAccountModal;

// Make the function globally available
window.editAccount = editAccount;

// Rendering functions
async function renderAll() {
    try {
        // Check if elements exist before rendering
        const accountsGrid = document.getElementById('accounts-grid');
        if (accountsGrid) {
            renderAccounts();
        }
        
        const transactionsElement = document.getElementById('recent-transactions');
        if (transactionsElement) {
            renderTransactions();
        }
        
        if (state.currentView === 'analytics') {
            const monthlyChart = document.getElementById('monthly-chart');
            const categoryChart = document.getElementById('category-chart');
            if (monthlyChart && categoryChart) {
                await renderCharts();
            }
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
        <div class="account-card ${account.type.toLowerCase()}" onclick="showAccountDetails('${account.id}')">
            <div class="account-actions">
                <button onclick="event.stopPropagation(); editAccount('${account.id}')" 
                        class="action-btn edit" 
                        title="Edit Account">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button onclick="event.stopPropagation(); deleteAccount('${account.id}')" 
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
// Add this function to app-ui.js

function renderPortfolioSummary() {
    const USD_TO_INR = 84;

    const totals = state.accounts.reduce((acc, account) => {
        const amount = parseFloat(account.balance) || 0;
        
        if (account.currency === 'INR') {
            acc.inr += amount;
            if (account.type === 'bank') acc.inrBanks++;
        } else if (account.currency === 'USD') {
            acc.usd += amount;
            if (account.type === 'crypto') acc.usdCrypto++;
        }
        
        return acc;
    }, { inr: 0, usd: 0, inrBanks: 0, usdCrypto: 0 });

    const usdInInr = totals.usd * USD_TO_INR;
    const totalInInr = totals.inr + usdInInr;

    return `
        <div class="portfolio-summary">
            <h2>Portfolio Summary</h2>
            <div class="currency-section">
                <div class="balance-card clickable" data-currency="INR" style="cursor: pointer;">
                    <div class="balance-header">INR Balance</div>
                    <div class="balance-amount">₹${totals.inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                    <div class="account-pills">
                        <div class="account-pill">${totals.inrBanks} Bank Accounts</div>
                    </div>
                </div>
                <div class="balance-card clickable" data-currency="USD" style="cursor: pointer;">
                    <div class="balance-header">USD Balance</div>
                    <div class="balance-amount">$${totals.usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                    <div class="account-pills">
                        <div class="account-pill">${totals.usdCrypto} Crypto Wallets</div>
                    </div>
                </div>
                <div class="balance-card">
                    <div class="balance-header">Total Portfolio (INR)</div>
                    <div class="balance-amount">₹${totalInInr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                    <div class="exchange-rate">1 USD = ₹${USD_TO_INR}</div>
                </div>
            </div>
        </div>
    `;
}

// Update the renderAccounts function
const originalRenderAccounts = window.renderAccounts;
window.renderAccounts = function() {
    const accountsGrid = document.getElementById('accounts-grid');
    if (!accountsGrid) return;

    // Remove existing summary if any
    const existingSummary = document.querySelector('.portfolio-summary');
    if (existingSummary) {
        existingSummary.remove();
    }

    // Insert summary before the accounts grid
    accountsGrid.insertAdjacentHTML('beforebegin', renderPortfolioSummary());
    
    // Add click handlers to the balance cards
    document.querySelectorAll('.balance-card.clickable').forEach(card => {
        card.addEventListener('click', (e) => {
            const currency = e.currentTarget.dataset.currency;
            if (currency) {
                showFilteredAccounts(currency);
            }
        });
    });
    
    // Call original render function
    originalRenderAccounts();
};

function showFilteredAccounts(currency) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay';
    
    const filteredAccounts = state.accounts.filter(acc => acc.currency === currency);
    const totalBalance = filteredAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    
    modalDiv.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title">
                    <h2>${currency} Accounts</h2>
                    <div class="total-balance">
                        Total: ${formatCurrency(totalBalance, currency)}
                    </div>
                </div>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="filtered-accounts-grid">
                    ${filteredAccounts.map(account => `
                        <div class="account-card ${account.type}" onclick="showAccountDetails('${account.id}')">
                            <span class="account-type ${account.type}">${account.type}</span>
                            <h3 class="account-name">${escapeHtml(account.name)}</h3>
                            <div class="account-balance">
                                ${formatCurrency(account.balance, account.currency)}
                            </div>
                            <div class="account-updated">
                                Last updated: ${formatDate(account.updatedAt)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    // Close when clicking outside
    modalDiv.addEventListener('click', (e) => {
        if (e.target === modalDiv) {
            modalDiv.remove();
        }
    });
}


// Update the renderAll function to include the new dashboard render
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


// Add to app-ui.js

// First, make sure closeAccountModal is globally available
window.closeAccountModal = closeAccountModal;

function closeAccountModal() {
    const modal = document.getElementById('account-modal');
    if (modal) {
        modal.remove();
    }
}

function renderAccountActivity(account) {
    const activities = [];

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

function createAccountDetailsModal(account) {
    // Create modal HTML
    const modalHTML = `
        <div class="modal-overlay" id="account-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">
                        <h2>${escapeHtml(account.name)}</h2>
                        <span class="account-type ${account.type.toLowerCase()}">${account.type}</span>
                        <div class="account-balance">
                            ${formatCurrency(account.balance, account.currency)}
                        </div>
                    </div>
                    <button class="modal-close" onclick="closeAccountModal()">×</button>
                </div>
                
                <div class="modal-tabs">
                    <button class="modal-tab active" data-tab="transactions">
                        Transactions
                    </button>
                    <button class="modal-tab" data-tab="activity">
                        Account Activity
                    </button>
                </div>

                <div class="modal-body">
                    <div class="tab-content active" id="transactions-tab">
                        ${renderAccountTransactions(account)}
                    </div>
                    <div class="tab-content" id="activity-tab">
                        ${renderAccountActivity(account)}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to the document
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners for tabs
    const modal = document.getElementById('account-modal');
    modal.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update visible content
            modal.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            modal.querySelector(`#${tab.dataset.tab}-tab`).classList.add('active');
        });
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAccountModal();
        }
    });

    // Close on escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeAccountModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}


// Add this to app-ui.js


function renderAccountTransactions(account) {
    const transactions = state.transactions
        .filter(t => t.accountId === account.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (transactions.length === 0) {
        return '<div class="no-transactions">No transactions found for this account</div>';
    }

    return `
        <div class="transactions-list">
            ${transactions.map(transaction => `
                <div class="modal-transaction-item">
                    <div class="transaction-icon ${transaction.type}">
                        ${transaction.type === 'income' ? '↑' : '↓'}
                    </div>
                    <div class="transaction-info">
                        <div class="transaction-primary">
                            <span class="transaction-category">${escapeHtml(transaction.category)}</span>
                            <span class="transaction-amount ${transaction.type}">
                                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount, account.currency)}
                            </span>
                        </div>
                        <div class="transaction-secondary">
                            <span class="transaction-date">${formatDate(transaction.date)}</span>
                            ${transaction.paymentMode ? `
                                <span class="transaction-payment">${escapeHtml(transaction.paymentMode)}</span>
                            ` : ''}
                            ${transaction.notes ? `
                                <span class="transaction-note">${escapeHtml(transaction.notes)}</span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Add to app-ui.js
const transactionFilters = {
    dateRange: 'all',
    startDate: '',
    endDate: '',
    type: 'all',
    account: 'all',
    category: 'all',
    paymentMode: 'all'
};

let currentSort = {
    key: 'date',
    direction: 'desc'
};

// Initialize transaction filters and sorting
function initializeTransactionView() {
    const filterDateSelect = document.getElementById('filter-date');
    const customDateInputs = document.getElementById('custom-date-inputs');
    const filterTypeSelect = document.getElementById('filter-type');
    const filterAccountSelect = document.getElementById('filter-account');
    const filterCategorySelect = document.getElementById('filter-category');
    const filterPaymentSelect = document.getElementById('filter-payment');
    const exportButton = document.getElementById('export-csv');
    const sortableHeaders = document.querySelectorAll('.sortable');

    // Initialize filter options
    if (state.accounts) {
        filterAccountSelect.innerHTML = `
            <option value="all">All Accounts</option>
            ${state.accounts.map(acc => `
                <option value="${acc.id}">${escapeHtml(acc.name)}</option>
            `).join('')}
        `;
    }

    // Populate unique categories and payment modes
    const categories = new Set();
    const paymentModes = new Set();
    state.transactions.forEach(tx => {
        if (tx.category) categories.add(tx.category);
        if (tx.paymentMode) paymentModes.add(tx.paymentMode);
    });

    filterCategorySelect.innerHTML = `
        <option value="all">All Categories</option>
        ${[...categories].map(cat => `
            <option value="${cat}">${escapeHtml(cat)}</option>
        `).join('')}
    `;

    filterPaymentSelect.innerHTML = `
        <option value="all">All Payment Modes</option>
        ${[...paymentModes].map(mode => `
            <option value="${mode}">${escapeHtml(mode)}</option>
        `).join('')}
    `;

    // Event Listeners
    filterDateSelect.addEventListener('change', (e) => {
        transactionFilters.dateRange = e.target.value;
        customDateInputs.style.display = e.target.value === 'custom' ? 'grid' : 'none';
        updateTransactionView();
    });

    document.getElementById('filter-start-date')?.addEventListener('change', (e) => {
        transactionFilters.startDate = e.target.value;
        updateTransactionView();
    });

    document.getElementById('filter-end-date')?.addEventListener('change', (e) => {
        transactionFilters.endDate = e.target.value;
        updateTransactionView();
    });

    filterTypeSelect.addEventListener('change', (e) => {
        transactionFilters.type = e.target.value;
        updateTransactionView();
    });

    filterAccountSelect.addEventListener('change', (e) => {
        transactionFilters.account = e.target.value;
        updateTransactionView();
    });

    filterCategorySelect.addEventListener('change', (e) => {
        transactionFilters.category = e.target.value;
        updateTransactionView();
    });

    filterPaymentSelect.addEventListener('change', (e) => {
        transactionFilters.paymentMode = e.target.value;
        updateTransactionView();
    });

    // Sorting
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const key = header.dataset.sort;
            if (currentSort.key === key) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.key = key;
                currentSort.direction = 'asc';
            }
            
            // Update header classes
            sortableHeaders.forEach(h => h.classList.remove('asc', 'desc'));
            header.classList.add(currentSort.direction);
            
            updateTransactionView();
        });
    });

    // Export CSV
    exportButton.addEventListener('click', exportTransactionsToCSV);
}

// Update transaction view with filters and sorting
function updateTransactionView() {
    const filteredTransactions = window.filterTransactions(state.transactions, transactionFilters);
    
    // Sort transactions
    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        let aVal = a[currentSort.key];
        let bVal = b[currentSort.key];
        
        // Handle date sorting
        if (currentSort.key === 'date') {
            aVal = new Date(aVal).getTime();
            bVal = new Date(bVal).getTime();
        }
        
        // Handle amount sorting
        if (currentSort.key === 'amount') {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        }
        
        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Update stats
    const stats = window.calculateTransactionStats(filteredTransactions);
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-income').textContent = window.formatCurrency(stats.income);
    document.getElementById('stat-expense').textContent = window.formatCurrency(stats.expense);
    document.getElementById('stat-average').textContent = window.formatCurrency(stats.avgTransaction);

    // Render transactions
    renderFilteredTransactions(sortedTransactions);
}

// Render filtered transactions
// Update the renderFilteredTransactions function
function renderFilteredTransactions(transactions) {
    const tbody = document.getElementById('transactions-tbody');
    if (!tbody) return;

    tbody.innerHTML = transactions.map(tx => `
        <tr class="transaction-row">
            <td>${window.formatDate(tx.date)}</td>
            <td>
                <span class="badge-${tx.type}">${tx.type}</span>
            </td>
            <td class="amount-${tx.type}">
                ${tx.type === 'income' ? '+' : '-'}${window.formatCurrency(tx.amount, tx.currency, true)}
            </td>
            <td>${tx.paymentMode ? `<span class="payment-mode-badge">${escapeHtml(tx.paymentMode)}</span>` : ''}</td>
            <td>${escapeHtml(tx.accountName || '')}</td>
            <td>${escapeHtml(tx.category)}</td>
            <td>${tx.notes ? `<span class="transaction-notes-text">${escapeHtml(tx.notes)}</span>` : ''}</td>
        </tr>
    `).join('');
}

// Update the calculateTransactionStats function
function calculateTransactionStats(transactions) {
    return {
        total: transactions.length,
        income: transactions.reduce((sum, tx) => 
            tx.type === 'income' ? sum + tx.amountInINR : sum, 0),
        expense: transactions.reduce((sum, tx) => 
            tx.type === 'expense' ? sum + tx.amountInINR : sum, 0),
        avgTransaction: transactions.reduce((sum, tx) => 
            sum + tx.amountInINR, 0) / transactions.length || 0
    };
}

// Export to CSV function
function exportTransactionsToCSV() {
    const filteredTransactions = window.filterTransactions(state.transactions, transactionFilters);
    const csv = [
        ['Date', 'Type', 'Original Amount', 'Currency', 'Amount in INR', 'Payment Mode', 'Account', 'Category', 'Notes'],
        ...filteredTransactions.map(tx => [
            window.formatDate(tx.date),
            tx.type,
            tx.amount,
            tx.currency,
            tx.amountInINR,
            tx.paymentMode,
            tx.accountName,
            tx.category,
            tx.notes
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Update the switchView function to initialize transaction view
const originalSwitchView = window.switchView;
window.switchView = function(view) {
    originalSwitchView(view);
    if (view === 'transactions') {
        initializeTransactionView();
        updateTransactionView();
    }
};

// Make functions globally available
window.updateTransactionView = updateTransactionView;
window.initializeTransactionView = initializeTransactionView;

// Update showAccountDetails function
function showAccountDetails(accountId) {
    const account = state.accounts.find(acc => acc.id === accountId);
    if (!account) return;
    createAccountDetailsModal(account);
}

// Make functions globally available
window.showAccountDetails = showAccountDetails;
window.closeAccountModal = closeAccountModal;

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
window.showFilteredAccounts = showFilteredAccounts;