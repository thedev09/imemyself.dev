
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
        'Utilities',
        'Healthcare',
        'Personal Care',
        'Gifts & Donations',
        'Bills',
        'Groceries',
        'Vehicle',
        'Subscriptions',
        'Hobbies',
        'Eval',
        'Other Expenses'
    ],
    transfer: [ // Add this new category type
        'Self Transfer',
        'Account Transfer',
        'Wallet Transfer'
    ],
    adjustment: [  // Add this new type
        'Balance Reconciliation',
        'Bank Interest',
        'Bank Charges',
        'Missed Transaction',
        'Other Adjustment'
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
    const totalInUsd = (totals.inr / USD_TO_INR) + totals.usd;

    return `
        <div class="portfolio-summary">
            <div class="summary-header">
                <h2 class="summary-title">Portfolio Summary</h2>
                <button class="toggle-visibility-btn" onclick="togglePortfolioVisibility()">
                    <i class="fas fa-eye${isPortfolioVisible() ? '' : '-slash'}"></i>
                </button>
            </div>
            <div class="currency-section">
                <div class="balance-card clickable" data-currency="INR" style="cursor: pointer;">
                    <div class="balance-header">INR Balance</div>
                    <div class="balance-amount" data-balance-value>
                        ${isPortfolioVisible() ? '₹' + formatIndianNumber(totals.inr) : '₹ XXXXX'}
                    </div>
                    <div class="account-pills">
                        <div class="account-pill">${totals.inrBanks} Bank Account${totals.inrBanks !== 1 ? 's' : ''}</div>
                    </div>
                </div>

                <div class="balance-card clickable" data-currency="USD" style="cursor: pointer;">
                    <div class="balance-header">USD Balance</div>
                    <div class="balance-amount" data-balance-value>
                        ${isPortfolioVisible() ? '$' + totals.usd.toLocaleString('en-US', { 
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2 
                        }) : '$ XXXXX'}
                    </div>
                    <div class="account-pills">
                        <div class="account-pill">${totals.usdCrypto} Crypto Wallet${totals.usdCrypto !== 1 ? 's' : ''}</div>
                    </div>
                </div>

                <div class="balance-card total-portfolio">
                    <div class="balance-header">Total Portfolio Value</div>
                    <div class="balance-amount" data-balance-value>
                        ${isPortfolioVisible() ? '₹' + formatIndianNumber(totalInInr) : '₹ XXXXX'}
                    </div>
                    <div class="conversion-info">
                        <div class="usd-value" data-balance-value>
                            Total USD Value: ${isPortfolioVisible() ? '$' + totalInUsd.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }) : '$ XXXXX'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Add these functions near the top of app-ui.js with other core functions
function isPortfolioVisible() {
    return localStorage.getItem('portfolioVisible') === 'true';
}

function togglePortfolioVisibility() {
    const currentState = isPortfolioVisible();
    localStorage.setItem('portfolioVisible', !currentState);
    renderAccounts(); // Re-render to update the display
}

// Make them globally available
window.isPortfolioVisible = isPortfolioVisible;
window.togglePortfolioVisibility = togglePortfolioVisibility;

function renderDashboard() {
    // First render accounts
    renderAccounts();

    // Then render recent transactions
    const recentTransactionsContainer = document.getElementById('recent-transactions');
    if (recentTransactionsContainer) {
        if (!state.transactions.length) {
            recentTransactionsContainer.innerHTML = '<div class="no-data">No transactions found</div>';
            return;
        }

        const sortedTransactions = [...state.transactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5); // Get only the 5 most recent transactions

        recentTransactionsContainer.innerHTML = sortedTransactions
            .map(transaction => {
                const account = state.accounts.find(a => a.id === transaction.accountId);
                return renderTransactionItem(transaction, account);
            })
            .join('');
    }
}

function renderTransactionItem(transaction, account) {
    const isTransfer = transaction.type === 'transfer';
    const isAdjustment = transaction.type === 'adjustment';
    const isTransferOut = isTransfer && transaction.notes?.toLowerCase().includes('transfer to');
    const isDeletedAccount = !account || account.isDeleted; // Add this line
    
    // Handle the display amount prefix
    let amountPrefix = '';
    if (isAdjustment) {
        amountPrefix = transaction.isIncrease ? '+' : '-';
    } else if (isTransferOut) {
        amountPrefix = '-';
    } else if (transaction.type === 'income') {
        amountPrefix = '+';
    } else if (transaction.type === 'expense') {
        amountPrefix = '-';
    }

    return `
        <div class="transaction-item ${isAdjustment ? 'adjustment' : isTransfer ? 'transfer' : ''}">
            <div class="transaction-main">
                <div class="transaction-primary">
                    <div class="transaction-header">
                        <span class="transaction-title">
                            ${isTransfer ? ' ' : ''}${escapeHtml(transaction.category)}
                        </span>
                        <div class="transaction-actions">
                            <button onclick="event.stopPropagation(); editTransaction('${transaction.id}')" 
                                    class="action-btn edit" 
                                    title="Edit Transaction">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                    <span class="transaction-tag ${transaction.type}">
                        ${transaction.type.toUpperCase()}
                    </span>
                </div>
                <div class="transaction-details">
                    <span class="transaction-time">${formatDate(transaction.date)}</span>
                    <span class="transaction-separator">•</span>
                    <span class="transaction-account ${isDeletedAccount ? 'deleted-account' : ''}">
                        ${escapeHtml(isDeletedAccount ? transaction.accountName : account.name)}
                    </span>
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
            <div class="transaction-amount ${transaction.type}">
                ${amountPrefix}${formatCurrency(Math.abs(transaction.amount), account?.currency)}
            </div>
        </div>
    `;
}


function showFilteredAccounts(currency) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay filtered-accounts-modal';
    
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
                            <span class="account-type">${account.type}</span>
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

    modalDiv.addEventListener('click', (e) => {
        if (e.target === modalDiv) {
            modalDiv.remove();
        }
    });
}


function switchView(view) {
    console.log("Switching to view:", view);
    state.currentView = view;
    
    document.querySelectorAll('.view').forEach(el => {
        if (el.id === `${view}-view`) {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    });
    
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.toggle('active', el.dataset.view === view);
        el.setAttribute('aria-selected', el.dataset.view === view);
    });

    // Initialize view-specific components
    if (view === 'transactions') {
        console.log("Initializing transaction view");
        initializeTransactionView();
    } else if (view === 'analytics') {
        console.log("Initializing analytics view");
        initializeAnalytics();
    }
    else if (view === 'settings') {
        initializeSettings();
    }

    // Add this line to prevent pull-to-refresh on interactive elements after view change
    setTimeout(preventPullToRefreshOnElements, 300);
}

function initializeSelfTransfer() {
    const fromSelect = document.getElementById('fromAccount');
    const toSelect = document.getElementById('toAccount');
    const amountInput = document.getElementById('transferAmount');
    const convertedAmountGroup = document.getElementById('convertedAmountGroup');
    const convertedAmountInput = document.getElementById('convertedAmount');
    const form = document.getElementById('transfer-form');

    // Update account options
    if (fromSelect && toSelect && state.accounts) {
        const options = state.accounts.map(acc => `
            <option value="${acc.id}">
                ${escapeHtml(acc.name)} (${acc.currency} ${formatCurrency(acc.balance, acc.currency)})
            </option>
        `).join('');

        fromSelect.innerHTML = '<option value="">Select source account</option>' + options;
        toSelect.innerHTML = '<option value="">Select destination account</option>' + options;
    }
    // Handle amount changes
    function updateConvertedAmount() {
        if (!fromSelect || !toSelect || !amountInput || !convertedAmountGroup || !convertedAmountInput) return;

        const amount = parseFloat(amountInput.value) || 0;
        const fromAccountId = fromSelect.value;
        const toAccountId = toSelect.value;

        if (fromAccountId && toAccountId && amount > 0) {
            const converted = calculateConvertedAmount(amount, fromAccountId, toAccountId);
            const toAccount = state.accounts.find(acc => acc.id === toAccountId);
            
            if (fromAccountId !== toAccountId) {
                convertedAmountGroup.style.display = 'block';
                convertedAmountInput.value = formatCurrency(converted, toAccount?.currency || 'INR');
            } else {
                convertedAmountGroup.style.display = 'none';
            }
        } else {
            convertedAmountGroup.style.display = 'none';
        }
    }

    // Add event listeners
    if (fromSelect) fromSelect.addEventListener('change', updateConvertedAmount);
    if (toSelect) toSelect.addEventListener('change', updateConvertedAmount);
    if (amountInput) amountInput.addEventListener('input', updateConvertedAmount);

    // Handle form submission
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            toggleLoading(true);

            try {
                await handleSelfTransfer(
                    fromSelect.value,
                    toSelect.value,
                    amountInput.value
                );

                showToast('Transfer completed successfully');
                form.reset();
                convertedAmountGroup.style.display = 'none';
                await loadUserData(true);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                toggleLoading(false);
            }
        };
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

// Update the account form submission handler
document.addEventListener('DOMContentLoaded', () => {
    const accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = document.getElementById('submit-account-btn');
            
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Processing...';
            }

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
                
                toggleLoading(true);
                await saveAccount(account);
                e.target.reset();
                showToast('Account created successfully!');
                await loadUserData(true);
            } catch (error) {
                console.error('Error saving account:', error);
                showToast(error.message || 'Error saving account', 'error');
                
                // Re-enable submit button on error
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Add Account';
                }
            } finally {
                toggleLoading(false);
            }
        });
    }
});

// Add this function to app-ui.js
function showAddAccountModal() {
    const modalHTML = `
        <div class="modal-overlay" id="addAccountModal">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">
                        <h2>Add New Account</h2>
                    </div>
                    <button class="modal-close" onclick="closeModal('addAccountModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="addAccountForm">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="accountName" class="form-label">Account Name</label>
                                <input type="text" 
                                       id="accountName"
                                       class="form-input" 
                                       name="name" 
                                       required
                                       placeholder="Enter account name">
                            </div>
                            <div class="form-group">
                                <label for="accountType" class="form-label">Account Type</label>
                                <select id="accountType"
                                        class="form-select" 
                                        name="type"
                                        required>
                                    <option value="">Select account type</option>
                                    <option value="bank">Bank Account</option>
                                    <option value="crypto">Crypto Wallet</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="currency" class="form-label">Currency</label>
                                <select id="currency"
                                        class="form-select" 
                                        name="currency"
                                        required>
                                    <option value="">Select currency</option>
                                    <option value="USD">USD</option>
                                    <option value="INR">INR</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="balance" class="form-label">Initial Balance</label>
                                <input type="number" 
                                       id="balance"
                                       class="form-input" 
                                       name="balance" 
                                       required 
                                       step="0.01"
                                       min="0"
                                       placeholder="Enter initial balance">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('addAccountModal')">Cancel</button>
                            <button type="submit" class="btn btn-primary">Add Account</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('addAccountModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Setup form submission
    const form = document.getElementById('addAccountForm');
    form.addEventListener('submit', async (e) => {
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
            closeModal('addAccountModal');
            showToast('Account created successfully!');
            await loadUserData(true);
        } catch (error) {
            console.error('Error saving account:', error);
            showToast(error.message || 'Error saving account', 'error');
        } finally {
            toggleLoading(false);
        }
    });

    // Add click handler for closing on outside click
    const modal = document.getElementById('addAccountModal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal('addAccountModal');
        }
    });

    // Add escape key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal('addAccountModal');
        }
    });
}

// Make sure this function is globally available
window.showAddAccountModal = showAddAccountModal;

function createEditAccountModal(account) {
    const modalHTML = `
        <div class="modal-overlay" id="edit-account-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">
                        <h2>Edit Account</h2>
                    </div>
                    <button class="modal-close" onclick="closeEditAccountModal()" aria-label="Close modal">×</button>
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
                                       required
                                       autocomplete="off">
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
                            <button type="button" class="btn btn-secondary" onclick="closeEditAccountModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Update Account</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('edit-account-modal');
    if (existingModal) {
        existingModal.remove();
    }

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

    // Focus the first input
    document.getElementById('editAccountName').focus();
}

// In app-ui.js

function setupEditAccountForm(account) {
    const form = document.getElementById('edit-account-form');
    if (!form) return;

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
                balance: parseFloat(formData.get('balance')) || 0,
                updatedAt: new Date().toISOString()
            };

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
        if (state.currentView === 'settings') {
            initializeSettings();
        }
    } catch (error) {
        console.error('Error rendering data:', error);
        showToast('Error displaying data. Please refresh the page.', 'error');
    }
}

function renderAccounts() {
    const accountsGrid = document.getElementById('accounts-grid');
    if (!accountsGrid) return;

    // Remove existing summary if any
    const existingSummary = document.querySelector('.portfolio-summary');
    if (existingSummary) {
        existingSummary.remove();
    }

    // Add portfolio summary
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

    // Handle no accounts case
    if (!state.accounts.length) {
        accountsGrid.innerHTML = `
            <div class="account-card add-account" onclick="showAddAccountModal()">
                <div class="add-account-content">
                    <span class="add-icon">+</span>
                    <span class="add-text">Add New Account</span>
                </div>
            </div>
        `;
        return;
    }

    // Sort accounts by displayOrder
    const sortedAccounts = [...state.accounts].sort((a, b) => 
        (a.displayOrder || 0) - (b.displayOrder || 0)
    );

    // Render account cards
    // In renderAccounts function
// In app-ui.js, in the renderAccounts function
accountsGrid.innerHTML = sortedAccounts.map(account => `
    <div class="account-card ${account.type.toLowerCase()}" 
         data-account-id="${account.id}"
         draggable="true"
         onclick="showAccountDetails('${account.id}')">
        <div class="account-actions">
            <button onclick="event.stopPropagation(); editAccount('${account.id}')" 
                    class="action-btn edit" 
                    title="Edit Account">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="event.stopPropagation(); showDeleteAccountModal('${account.id}')" 
                    class="action-btn delete" 
                    title="Delete Account">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <span class="account-type ${account.type.toLowerCase()}">${account.type}</span>
        <h3 class="account-name">${escapeHtml(account.name)}</h3>
        <div class="account-balance">
            ${formatCurrency(account.balance, account.currency)}
        </div>
        <div class="account-updated">
            Last updated: ${formatDate(account.lastActivityAt || account.updatedAt)}
        </div>
    </div>
`).join('') + `
    <div class="account-card add-account" onclick="showAddAccountModal()">
        <div class="add-account-content">
            <span class="add-icon">+</span>
            <span class="add-text">Add New Account</span>
        </div>
    </div>`;

    // Initialize drag and drop
    initializeAccountDragDrop();
}

// Add this to handle dashboard initialization
document.addEventListener('DOMContentLoaded', () => {
    if (state.currentView === 'dashboard') {
        renderDashboard();
    }
});

// Make sure these are globally available
window.renderDashboard = renderDashboard;
window.renderAccounts = renderAccounts;

// In app-ui.js, add this new function
function initializeAccountDragDrop() {
    const accountsGrid = document.getElementById('accounts-grid');
    let draggedCard = null;

    const cards = accountsGrid.querySelectorAll('.account-card:not(.add-account)');
    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedCard = card;
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            draggedCard = null;
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedCard === card) return;
            
            const rect = card.getBoundingClientRect();
            const midPoint = rect.y + rect.height / 2;
            const shouldInsertAfter = e.clientY > midPoint;
            
            if (shouldInsertAfter) {
                card.parentNode.insertBefore(draggedCard, card.nextSibling);
            } else {
                card.parentNode.insertBefore(draggedCard, card);
            }
        });

        card.addEventListener('dragend', async () => {
            await updateAccountOrder();
        });
    });
}

// Add function to update account order in database
async function updateAccountOrder() {
    const accountsGrid = document.getElementById('accounts-grid');
    const cards = accountsGrid.querySelectorAll('.account-card:not(.add-account)');
    const user = getCurrentUser();
    
    if (!user) return;

    const batch = db.batch();
    
    // Update displayOrder for each account
    cards.forEach((card, index) => {
        const accountId = card.dataset.accountId;
        const accountRef = db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(accountId);
            
        batch.update(accountRef, { 
            displayOrder: index,
            updatedAt: new Date().toISOString()
        });
        
        // Update local state
        const account = state.accounts.find(a => a.id === accountId);
        if (account) {
            account.displayOrder = index;
            account.updatedAt = new Date().toISOString();
        }
    });

    try {
        await batch.commit();
    } catch (error) {
        console.error('Error updating account order:', error);
        showToast('Error updating account order', 'error');
    }
}


// Make functions globally available
window.renderAccounts = renderAccounts;
window.renderPortfolioSummary = renderPortfolioSummary;


function initializeAnalytics() {
    const timeframeSelect = document.getElementById('timeframe-select');
    const yearSelect = document.getElementById('year-select');


    // Add this new code for trend period
    const trendPeriodSelect = document.getElementById('trend-period');
    if (trendPeriodSelect) {
        trendPeriodSelect.addEventListener('change', () => {
            renderIncomeExpenseChart();
        });
    }



    
    // Clear any existing charts
    cleanupCharts();

    // Populate year select
    function updateYearOptions() {
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
        yearSelect.innerHTML = years.map(year => `
            <option value="${year}" ${year === currentYear ? 'selected' : ''}>
                ${year}
            </option>
        `).join('');
    }

    // Toggle year select visibility based on timeframe
    timeframeSelect.addEventListener('change', () => {
        yearSelect.style.display = timeframeSelect.value === 'monthly' ? 'block' : 'none';
        updateAnalytics();
    });

    yearSelect.addEventListener('change', updateAnalytics);

    function updateAnalytics() {
        const timeframe = timeframeSelect.value;
        const selectedYear = parseInt(yearSelect.value);
        const data = getAnalyticsData(timeframe, selectedYear);

        // Update stats
        const totals = data.reduce((acc, curr) => ({
            income: acc.income + curr.income,
            expense: acc.expense + curr.expense
        }), { income: 0, expense: 0 });

        // In updateAnalytics function in app-ui.js
document.getElementById('analysis-income').textContent = formatCurrency(totals.income);
document.getElementById('analysis-expense').textContent = formatCurrency(totals.expense);
const savings = totals.income - totals.expense;
document.getElementById('analysis-savings').textContent = formatCurrency(Math.abs(savings));
        document.getElementById('analysis-savings').style.color = savings >= 0 ? '#4ade80' : '#f87171';

        // Clear existing chart
        const analysisCtx = document.getElementById('analysis-chart')?.getContext('2d');
        if (analysisCtx) {
            if (chartInstances.analysisChart) {
                chartInstances.analysisChart.destroy();
            }
            chartInstances.analysisChart = createAnalysisChart(analysisCtx, data, timeframe);
        }
    }

    // Render all charts
    renderIncomeExpenseChart();
    renderTopCategories();
    renderPaymentMethods();
    renderMonthlyBreakdown();

    const breakdownYear = document.getElementById('breakdown-year');
    if (breakdownYear) {
        breakdownYear.addEventListener('change', renderMonthlyBreakdown);
    }

    // Initial setup
    updateYearOptions();
    yearSelect.style.display = timeframeSelect.value === 'monthly' ? 'block' : 'none';
    updateAnalytics();
}

function createAnalysisChart(ctx, data, timeframe) {
    const labels = timeframe === 'yearly' ? 
        data.map(d => d.year.toString()) :
        data.map(d => d.month);
        
    const incomeData = data.map(d => d.income);
    const expenseData = data.map(d => d.expense);
    const savingsData = data.map(d => d.income - d.expense);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(74, 222, 128, 0.8)',
                    borderColor: '#22c55e',
                    borderWidth: 1,
                    order: 2
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(248, 113, 113, 0.8)',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    order: 2
                },
                {
                    label: 'Net Savings',
                    data: savingsData,
                    type: 'line',
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString();
                        },
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#94a3b8'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ₹' + 
                                   context.raw.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Make it globally available
window.initializeAnalytics = initializeAnalytics;

// Make functions globally available
window.initializeSelfTransfer = initializeSelfTransfer;
window.initializeAnalytics = initializeAnalytics;

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



function isPortfolioVisible() {
    return localStorage.getItem('portfolioVisible') === 'true';
}

function togglePortfolioVisibility() {
    const currentState = isPortfolioVisible();
    localStorage.setItem('portfolioVisible', !currentState);
    renderAccounts(); // Re-render to update the display
}

// Make them globally available
window.isPortfolioVisible = isPortfolioVisible;
window.togglePortfolioVisibility = togglePortfolioVisibility;


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
                    <div class="transaction-main">
                        <div class="transaction-primary">
                            <div class="transaction-left">
                                <span class="transaction-category">${escapeHtml(transaction.category)}</span>
                                <span class="transaction-amount ${transaction.type}">
                                    ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount, account.currency)}
                                </span>
                            </div>
                            <button onclick="editTransaction('${transaction.id}', '${account.id}')" 
                                    class="action-btn edit" 
                                    title="Edit Transaction">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="transaction-secondary">
                            <span class="transaction-date">${formatDate(transaction.date)}</span>
                            ${transaction.paymentMode ? `
                                <span class="transaction-dot">•</span>
                                <span class="transaction-payment">${escapeHtml(transaction.paymentMode)}</span>
                            ` : ''}
                            ${transaction.notes ? `
                                <span class="transaction-dot">•</span>
                                <span class="transaction-note">${escapeHtml(transaction.notes)}</span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderFilteredTransactions(transactions) {
    const tbody = document.getElementById('transactions-tbody');
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No transactions found</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(tx => {
        // Add deleted account handling
        const accountNameClass = tx.accountDeleted ? 'account-name deleted' : 'account-name';
        
        // Format amount prefix
        let amountPrefix = '';
        if (tx.type === 'income') amountPrefix = '+';
        else if (tx.type === 'expense') amountPrefix = '-';
        else if (tx.type === 'transfer' && tx.notes?.toLowerCase().includes('transfer to')) amountPrefix = '-';
        
        return `
            <tr>
                <td>${formatDate(tx.date)}</td>
                <td>
                    <span class="type-tag ${tx.type.toLowerCase()}">
                        ${tx.type.toUpperCase()}
                    </span>
                </td>
                <td class="amount-cell ${tx.type.toLowerCase()}">
                    ${amountPrefix}${formatCurrency(tx.amount, tx.currency)}
                </td>
                <td>${escapeHtml(tx.paymentMode || '')}</td>
                <td>
                    <span class="${accountNameClass}">
                        ${escapeHtml(tx.accountName || '')}
                    </span>
                </td>
                <td>${escapeHtml(tx.category || '')}</td>
                <td>${escapeHtml(tx.notes || '')}</td>
                <td class="actions-cell">
                    <div class="action-buttons">
                        <button onclick="editTransaction('${tx.id}')" 
                                class="action-btn edit" 
                                title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteTransaction('${tx.id}')" 
                                class="action-btn delete" 
                                title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updatePaymentModes(accountType) {
    const paymentModeSelect = document.getElementById('paymentMode');
    if (!paymentModeSelect) return;

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

    const modes = PAYMENT_MODES[accountType] || PAYMENT_MODES.bank;
    
    paymentModeSelect.innerHTML = `
        <option value="">Select payment mode</option>
        ${modes.map(mode => `
            <option value="${mode}">${mode}</option>
        `).join('')}
    `;
}

// Update in app-ui.js
function showAddTransactionModal() {
    const modalHTML = `
        <div class="modal-overlay" id="addTransactionModal">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">
                        <h2>Add Transaction</h2>
                    </div>
                    <button class="modal-close" onclick="closeModal('addTransactionModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="transaction-type-toggle">
                        <button class="type-btn expense active" data-type="expense">Expense</button>
                        <button class="type-btn income" data-type="income">Income</button>
                    </div>
                    <form id="transactionForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Amount</label>
                                <input type="number" id="amount" name="amount" placeholder="Enter amount" required>
                            </div>
                            <div class="form-group">
                                <label>Category</label>
                                <select id="category" name="category" required>
                                    <option value="">Select category</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Account</label>
                                <select id="account" name="account" required>
                                    <option value="">Select account</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Payment Mode</label>
                                <select id="paymentMode" name="paymentMode" required>
                                    <option value="">Select payment mode</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Description (Optional)</label>
                            <input type="text" id="description" name="description" placeholder="Enter description (optional)">
                        </div>
                        <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('addTransactionModal')">Cancel</button>
        <button type="submit" id="submit-transaction-btn" class="btn btn-primary">Add Transaction</button>
    </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('addTransactionModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add click handler for closing on outside click
    const modal = document.getElementById('addTransactionModal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) { // Click is on the overlay
            closeModal('addTransactionModal');
        }
    });

    setupTransactionForm();
}

function showTransferModal() {
    const modalHTML = `
        <div class="modal-overlay" id="transferModal">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">
                        <h2>Transfer Money</h2>
                    </div>
                    <button class="modal-close" onclick="closeModal('transferModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="transferForm">
                        <div class="form-group">
                            <label>From Account</label>
                            <select id="fromAccount" name="fromAccount" required>
                                <option value="">Select account</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>To Account</label>
                            <select id="toAccount" name="toAccount" required>
                                <option value="">Select account</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Amount</label>
                            <input type="number" id="transferAmount" name="amount" placeholder="Enter amount" required>
                        </div>
                        <div class="form-group" id="convertedAmountGroup" style="display: none;">
                            <label>Converted Amount</label>
                            <input type="text" id="convertedAmount" disabled>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <input type="text" id="transferDescription" name="description" placeholder="Enter description">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" onclick="closeModal('transferModal')">Cancel</button>
                            <button type="submit" id="submit-transfer-btn" class="btn-primary">Transfer</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('transferModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add click handler for closing on outside click
    const modal = document.getElementById('transferModal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) { // Click is on the overlay
            closeModal('transferModal');
        }
    });

    setupTransferForm();
}

// Make sure this exists in app-ui.js
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// Make it globally available
window.closeModal = closeModal;

function showModal(modalId) {
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }
    if (modalId === 'transferModal') {
        showTransferModal();
    } else if (modalId === 'addTransactionModal') {
        showAddTransactionModal();
    }
}


function setupTransactionForm() {
    const form = document.getElementById('transactionForm');
    if (!form) return;

    // Update account dropdown
    const accountSelect = document.getElementById('account');
    const amountInput = document.getElementById('amount');
    
    if (accountSelect && state.accounts) {
        accountSelect.innerHTML = `
            <option value="">Select account</option>
            ${state.accounts.map(acc => `
                <option value="${acc.id}">
                    ${escapeHtml(acc.name)} (${acc.currency} ${formatCurrency(acc.balance, acc.currency)})
                </option>
            `).join('')}
        `;
    }

    // Add amount precision handler
    accountSelect.addEventListener('change', (e) => {
        const selectedAccount = state.accounts.find(acc => acc.id === e.target.value);
        if (selectedAccount) {
            amountInput.step = (selectedAccount.type === 'crypto' || selectedAccount.currency === 'USD') 
                ? "0.000001" 
                : "0.01";
            updatePaymentModes(selectedAccount.type.toLowerCase());
        }
    });

    // Setup type buttons
    const typeButtons = document.querySelectorAll('.type-btn');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCategoryOptions(btn.dataset.type);
        });
    });

    // Force select expense by default
    const expenseBtn = document.querySelector('.type-btn.expense');
    if (expenseBtn) {
        expenseBtn.click();
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        await handleTransactionSubmit(formData);
    };
}

function showDeleteAccountModal(accountId) {
    const account = state.accounts.find(acc => acc.id === accountId);
    if (!account) return;

    const transactions = state.transactions.filter(tx => tx.accountId === accountId);

    const modalHTML = `
        <div class="modal-overlay" id="delete-account-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">
                        <h2>Delete Account</h2>
                    </div>
                    <button class="modal-close" onclick="closeModal('delete-account-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete "${escapeHtml(account.name)}"?</p>
                    <p>This account has ${transactions.length} transactions.</p>
                    
                    <div class="deletion-options">
                        <label class="deletion-option">
                            <input type="radio" 
                                   name="deletionType" 
                                   value="keep" 
                                   checked>
                            <div class="deletion-content">
                                <div class="deletion-title">Keep Transaction History</div>
                                <div class="deletion-description">
                                    Account will be deleted but all transactions will be preserved
                                </div>
                            </div>
                        </label>

                        <label class="deletion-option">
                            <input type="radio" 
                                   name="deletionType" 
                                   value="delete">
                            <div class="deletion-content">
                                <div class="deletion-title">Delete Everything</div>
                                <div class="deletion-description">
                                    Delete account and all its transactions permanently
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('delete-account-modal')">
                        Cancel
                    </button>
                    <button class="btn btn-danger" onclick="handleAccountDeletion('${accountId}')">
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listener for clicking outside
    const modal = document.getElementById('delete-account-modal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal('delete-account-modal');
        }
    });

    // Add escape key handler too
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal('delete-account-modal');
        }
    });
}

function setupTransferForm() {
    const form = document.getElementById('transferForm');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        console.log("Transfer form submitted");
        const formData = new FormData(form);
        await handleTransferSubmit(formData);
    };
}

function setupTransferForm() {
    // Populate account dropdowns
    const fromAccountSelect = document.getElementById('fromAccount');
    const toAccountSelect = document.getElementById('toAccount');

    if (fromAccountSelect && toAccountSelect && state.accounts) {
        const accountOptions = '<option value="">Select account</option>' + 
            state.accounts.map(acc => `
                <option value="${acc.id}">
                    ${escapeHtml(acc.name)} (${acc.currency} ${formatCurrency(acc.balance, acc.currency)})
                </option>
            `).join('');

        fromAccountSelect.innerHTML = accountOptions;
        toAccountSelect.innerHTML = accountOptions;
    }

    // Handle converted amount display
    fromAccountSelect.addEventListener('change', updateConvertedAmount);
    toAccountSelect.addEventListener('change', updateConvertedAmount);
    document.getElementById('transferAmount').addEventListener('input', updateConvertedAmount);

    // Setup form submission
    const form = document.getElementById('transferForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        await handleTransferSubmit(new FormData(form));
        closeModal('transferModal');
    };
}

function updateConvertedAmount() {
    const fromAccount = document.getElementById('fromAccount').value;
    const toAccount = document.getElementById('toAccount').value;
    const amount = document.getElementById('transferAmount').value;
    const convertedGroup = document.getElementById('convertedAmountGroup');
    const convertedInput = document.getElementById('convertedAmount');

    if (fromAccount && toAccount && amount > 0) {
        const fromAcc = state.accounts.find(acc => acc.id === fromAccount);
        const toAcc = state.accounts.find(acc => acc.id === toAccount);

        if (fromAcc.currency !== toAcc.currency) {
            convertedGroup.style.display = 'block';
            const convertedAmount = calculateConvertedAmount(amount, fromAccount, toAccount);
            convertedInput.value = formatCurrency(convertedAmount, toAcc.currency);
        } else {
            convertedGroup.style.display = 'none';
        }
    } else {
        convertedGroup.style.display = 'none';
    }
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

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
    console.log("Initializing transaction view with transactions:", state.transactions.length);

    // Initialize filter dropdowns
    const filterDateSelect = document.getElementById('filter-date');
    const customDateInputs = document.getElementById('custom-date-inputs');
    const filterTypeSelect = document.getElementById('filter-type');
    const filterAccountSelect = document.getElementById('filter-account');
    const filterCategorySelect = document.getElementById('filter-category');
    const filterPaymentSelect = document.getElementById('filter-payment');
    const exportButton = document.getElementById('export-csv');
    const tbody = document.getElementById('transactions-tbody');

    if (!tbody) {
        console.error("Transactions tbody element not found");
        return;
    }

    // Set default filter values
    transactionFilters.dateRange = 'thisMonth';
    transactionFilters.type = 'all';
    transactionFilters.account = 'all';
    transactionFilters.category = 'all';
    transactionFilters.paymentMode = 'all';

    // Initialize account filter
    if (filterAccountSelect && state.accounts) {
        filterAccountSelect.innerHTML = `
            <option value="all">All Accounts</option>
            ${state.accounts.map(acc => `
                <option value="${acc.id}">${escapeHtml(acc.name)}</option>
            `).join('')}
        `;
    }

    // Collect unique categories and payment modes
    const categories = new Set();
    const paymentModes = new Set();
    state.transactions.forEach(tx => {
        if (tx.category) categories.add(tx.category);
        if (tx.paymentMode) paymentModes.add(tx.paymentMode);
    });

    // Initialize category filter
    if (filterCategorySelect) {
        filterCategorySelect.innerHTML = `
            <option value="all">All Categories</option>
            ${[...categories].map(cat => `
                <option value="${cat}">${escapeHtml(cat)}</option>
            `).join('')}
        `;
    }

    // Initialize payment mode filter
    if (filterPaymentSelect) {
        filterPaymentSelect.innerHTML = `
            <option value="all">All Payment Modes</option>
            ${[...paymentModes].map(mode => `
                <option value="${mode}">${escapeHtml(mode)}</option>
            `).join('')}
        `;
    }

    // Add event listeners
    filterDateSelect.addEventListener('change', (e) => {
        transactionFilters.dateRange = e.target.value;
        if (e.target.value === 'custom') {
            customDateInputs.style.display = 'grid';
            // Set default date range for custom filter (current month)
            const { startDate, endDate } = dateFilters.getCurrentMonthDates();
            document.getElementById('filter-start-date').value = startDate.toISOString().split('T')[0];
            document.getElementById('filter-end-date').value = endDate.toISOString().split('T')[0];
            transactionFilters.startDate = startDate.toISOString().split('T')[0];
            transactionFilters.endDate = endDate.toISOString().split('T')[0];
        } else {
            customDateInputs.style.display = 'none';
            transactionFilters.startDate = null;
            transactionFilters.endDate = null;
        }
        updateTransactionView();
    });
    
    // Add these listeners for custom date inputs
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    
    if (startDateInput && endDateInput) {
        startDateInput.addEventListener('change', (e) => {
            transactionFilters.startDate = e.target.value;
            updateTransactionView();
        });
    
        endDateInput.addEventListener('change', (e) => {
            transactionFilters.endDate = e.target.value;
            updateTransactionView();
        });
    }

    // Event listeners for other filters
    if (filterTypeSelect) {
        filterTypeSelect.addEventListener('change', (e) => {
            transactionFilters.type = e.target.value;
            updateTransactionView();
        });
    }

    if (filterAccountSelect) {
        filterAccountSelect.addEventListener('change', (e) => {
            transactionFilters.account = e.target.value;
            updateTransactionView();
        });
    }

    if (filterCategorySelect) {
        filterCategorySelect.addEventListener('change', (e) => {
            transactionFilters.category = e.target.value;
            updateTransactionView();
        });
    }

    if (filterPaymentSelect) {
        filterPaymentSelect.addEventListener('change', (e) => {
            transactionFilters.paymentMode = e.target.value;
            updateTransactionView();
        });
    }

    // Initial render
    updateTransactionView();
}


function updateTransactionView() {
    console.log("Updating transaction view...");
    console.log("Current filters:", transactionFilters);
    console.log("Total transactions:", state.transactions.length);

    try {
        const filteredTransactions = filterTransactions(state.transactions, transactionFilters);
        console.log("Filtered transactions:", filteredTransactions.length);
        
        // Sort transactions
        const sortedTransactions = [...filteredTransactions].sort((a, b) => {
            let aVal = a[currentSort.key];
            let bVal = b[currentSort.key];
            
            if (currentSort.key === 'date') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            }
            
            if (currentSort.key === 'amount') {
                aVal = parseFloat(aVal);
                bVal = parseFloat(bVal);
            }
            
            if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        // Render transactions table
        renderFilteredTransactions(sortedTransactions);

        // Update stats with filtered transactions
        const stats = calculateTransactionStats(filteredTransactions);
        document.getElementById('stat-total').textContent = stats.total.toLocaleString();
        document.getElementById('stat-income').textContent = formatCurrency(stats.income);
        document.getElementById('stat-expense').textContent = formatCurrency(stats.expense);
        document.getElementById('stat-average').textContent = formatCurrency(stats.avgTransaction);

    } catch (error) {
        console.error("Error in updateTransactionView:", error);
        const tbody = document.getElementById('transactions-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">Error updating transactions view</td></tr>';
        }
    }
}

function calculateTransactionStats(transactions) {
    return {
        total: transactions.length,
        income: transactions.reduce((sum, tx) => {
            if (tx.type !== 'income') return sum;
            const amount = tx.amountInINR !== undefined && tx.amountInINR !== null 
                ? tx.amountInINR 
                : tx.amount;
            return sum + (amount || 0);
        }, 0),
        expense: transactions.reduce((sum, tx) => {
            if (tx.type !== 'expense') return sum;
            const amount = tx.amountInINR !== undefined && tx.amountInINR !== null 
                ? tx.amountInINR 
                : tx.amount;
            return sum + (amount || 0);
        }, 0),
        avgTransaction: transactions.length ? transactions.reduce((sum, tx) => {
            const amount = tx.amountInINR !== undefined && tx.amountInINR !== null 
                ? tx.amountInINR 
                : tx.amount;
            return sum + (amount || 0);
        }, 0) / transactions.length : 0
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

// Make functions globally available
window.updateTransactionView = updateTransactionView;
window.initializeTransactionView = initializeTransactionView;

function showAccountDetails(accountId) {
    const account = state.accounts.find(acc => acc.id === accountId);
    if (!account) return;

    // Create and show modal
    const modalHTML = `
        <div class="modal-overlay" id="account-details-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">
                        <h2>${escapeHtml(account.name)}</h2>
                        <span class="account-type ${account.type.toLowerCase()}">${account.type}</span>
                        <div class="account-balance">
                            ${formatCurrency(account.balance, account.currency)}
                        </div>
                    </div>
                    <button class="modal-close" onclick="closeAccountDetailsModal()">×</button>
                </div>
                
                <div class="modal-tabs">
                    <button class="modal-tab active" data-tab="transactions">Transactions</button>
                    <button class="modal-tab" data-tab="activity">Account Activity</button>
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

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners
    const modal = document.getElementById('account-details-modal');
    
    // Tab switching
    modal.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            modal.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            modal.querySelector(`#${tab.dataset.tab}-tab`).classList.add('active');
        });
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAccountDetailsModal();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAccountDetailsModal();
        }
    });
}

function closeAccountDetailsModal() {
    const modal = document.getElementById('account-details-modal');
    if (modal) {
        modal.remove();
    }
}

// Make sure these functions are globally available
window.showAccountDetails = showAccountDetails;
window.closeAccountDetailsModal = closeAccountDetailsModal;

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

// Add this function to handle transaction editing
function createEditTransactionModal(transaction) {
    const account = state.accounts.find(acc => acc.id === transaction.accountId);
    const isTransfer = transaction.type === 'transfer';
    
    const modalHTML = `
        <div class="modal-overlay" id="edit-transaction-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">
                        <h2>Edit Transaction</h2>
                        <span class="transaction-date">${formatDate(transaction.date)}</span>
                    </div>
                    <button class="modal-close" onclick="closeEditTransactionModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="edit-transaction-form">
                        ${!isTransfer ? `
                            <div class="transaction-type">
                                <button type="button" 
                                        class="type-btn income ${transaction.type === 'income' ? 'selected' : ''}" 
                                        data-type="income" 
                                        onclick="updateTransactionType(this)">
                                    Income
                                </button>
                                <button type="button" 
                                        class="type-btn expense ${transaction.type === 'expense' ? 'selected' : ''}" 
                                        data-type="expense"
                                        onclick="updateTransactionType(this)">
                                    Expense
                                </button>
                            </div>
                        ` : ''}
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="editAmount" class="form-label">Amount</label>
                                <input type="number" 
                                       id="editAmount"
                                       class="form-input" 
                                       name="amount" 
                                       value="${transaction.amount}"
                                       step="${account.type === 'crypto' || account.currency === 'USD' ? '0.000001' : '0.01'}"
                                       min="0"
                                       required>
                            </div>
                            <div class="form-group">
                                <label for="editAccount" class="form-label">Account</label>
                                <select id="editAccount"
                                        class="form-select" 
                                        name="account"
                                        required
                                        ${isTransfer ? 'disabled' : ''}>
                                    <option value="">Select an account</option>
                                    ${state.accounts.map(acc => `
                                        <option value="${acc.id}" ${acc.id === transaction.accountId ? 'selected' : ''}>
                                            ${escapeHtml(acc.name)} (${acc.currency})
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="editCategory" class="form-label">Category</label>
                                <select id="editCategory"
                                        class="form-select" 
                                        name="category"
                                        required
                                        ${isTransfer ? 'disabled' : ''}>
                                    <option value="">Select a category</option>
                                    ${TRANSACTION_CATEGORIES[transaction.type]?.map(category => `
                                        <option value="${category}" ${category === transaction.category ? 'selected' : ''}>
                                            ${category}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="editPaymentMode" class="form-label">Payment Mode</label>
                                <select id="editPaymentMode"
                                        class="form-select" 
                                        name="paymentMode"
                                        required>
                                    <option value="">Select payment mode</option>
                                    ${PAYMENT_MODES[account?.type?.toLowerCase() || 'bank'].map(mode => `
                                        <option value="${mode}" ${mode === transaction.paymentMode ? 'selected' : ''}>
                                            ${mode}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="editNotes" class="form-label">Notes (Optional)</label>
                                <input type="text" 
                                       id="editNotes"
                                       class="form-input" 
                                       name="notes" 
                                       value="${escapeHtml(transaction.notes || '')}"
                                       placeholder="Add any additional details"
                                       ${isTransfer ? 'readonly' : ''}>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" 
                                    class="btn btn-danger"
                                    onclick="if(confirm('Are you sure you want to delete this transaction?')) { deleteTransaction('${transaction.id}').then(() => closeEditTransactionModal()); }">
                                Delete
                            </button>
                            <button type="submit" class="btn btn-primary">Update</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('edit-transaction-modal');
    const form = document.getElementById('edit-transaction-form');
    const accountSelect = document.getElementById('editAccount');

    // Update payment modes when account changes
    if (accountSelect && !isTransfer) {
        accountSelect.addEventListener('change', (e) => {
            const selectedAccount = state.accounts.find(acc => acc.id === e.target.value);
            updateEditPaymentModes(selectedAccount?.type?.toLowerCase() || 'bank', transaction.paymentMode);
        });
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        toggleLoading(true);

        try {
            const formData = new FormData(e.target);
            const selectedType = isTransfer ? 'transfer' : 
                document.querySelector('.type-btn.selected')?.dataset.type || transaction.type;
            
            const updatedTransaction = {
                ...transaction,
                type: selectedType,
                amount: parseFloat(formData.get('amount')),
                accountId: isTransfer ? transaction.accountId : formData.get('account'),
                category: isTransfer ? transaction.category : formData.get('category'),
                notes: formData.get('notes') || '',
                paymentMode: formData.get('paymentMode')
            };

            await updateTransaction(updatedTransaction);
            closeEditTransactionModal();
            showToast('Transaction updated successfully!');
            await loadUserData(true);
        } catch (error) {
            console.error('Error updating transaction:', error);
            showToast(error.message || 'Error updating transaction', 'error');
        } finally {
            toggleLoading(false);
        }
    });

    // Close when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeEditTransactionModal();
        }
    });

    // Close on escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeEditTransactionModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function updateEditPaymentModes(accountType, currentMode) {
    const paymentModeSelect = document.getElementById('editPaymentMode');
    const modes = PAYMENT_MODES[accountType] || [];
    
    paymentModeSelect.innerHTML = `
        <option value="">Select payment mode</option>
        ${modes.map(mode => `
            <option value="${mode}" ${mode === currentMode ? 'selected' : ''}>
                ${mode}
            </option>
        `).join('')}
    `;
}

function updateTransactionType(button) {
    // Update button states
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');

    // Update category options based on new type
    const categorySelect = document.getElementById('editCategory');
    const type = button.dataset.type;
    const categories = TRANSACTION_CATEGORIES[type] || [];
    
    categorySelect.innerHTML = `
        <option value="">Select a category</option>
        ${categories.map(category => `
            <option value="${category}">${category}</option>
        `).join('')}
    `;
}

function closeEditTransactionModal() {
    const modal = document.getElementById('edit-transaction-modal');
    if (modal) {
        modal.remove();
    }
}

// In app-core.js
async function updateTransaction(transaction) {
    const user = getCurrentUser();
    if (!user) throw new Error('Please sign in to continue');

    // Find old transaction
    const oldTransaction = state.transactions.find(tx => tx.id === transaction.id);
    if (!oldTransaction) throw new Error('Transaction not found');

    // Find accounts
    const oldAccount = state.accounts.find(acc => acc.id === oldTransaction.accountId);
    const newAccount = state.accounts.find(acc => acc.id === transaction.accountId);
    if (!oldAccount || !newAccount) throw new Error('Account not found');

    const batch = db.batch();

    // Calculate balance adjustments
    // First, reverse the old transaction completely
    let oldAdjustment;
    if (oldTransaction.type === 'income') {
        oldAdjustment = -oldTransaction.amount; // Subtract the old income
    } else if (oldTransaction.type === 'expense') {
        oldAdjustment = +oldTransaction.amount; // Add back the old expense
    }

    // Then, apply the new transaction
    let newAdjustment;
    if (transaction.type === 'income') {
        newAdjustment = +transaction.amount; // Add the new income
    } else if (transaction.type === 'expense') {
        newAdjustment = -transaction.amount; // Subtract the new expense
    }

    // Update transaction document
    const transactionRef = db.collection('users')
        .doc(user.uid)
        .collection('transactions')
        .doc(transaction.id);

    const transactionData = {
        ...transaction,
        currency: newAccount.currency,
        amountInINR: newAccount.currency === 'USD' ? transaction.amount * USD_TO_INR : transaction.amount,
        exchangeRate: newAccount.currency === 'USD' ? USD_TO_INR : 1,
        accountName: newAccount.name,
        updatedAt: new Date().toISOString()
    };

    batch.set(transactionRef, transactionData);

    // If account changed, update both old and new account balances
    if (oldAccount.id !== newAccount.id) {
        // Update old account balance
        const oldAccountRef = db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(oldAccount.id);
        batch.update(oldAccountRef, { 
            balance: oldAccount.balance + oldAdjustment,
            updatedAt: new Date().toISOString()
        });

        // Update new account balance
        const newAccountRef = db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(newAccount.id);
        batch.update(newAccountRef, { 
            balance: newAccount.balance + newAdjustment,
            updatedAt: new Date().toISOString()
        });
    } else {
        // Same account, apply net adjustment
        const accountRef = db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .doc(newAccount.id);
        batch.update(accountRef, { 
            balance: newAccount.balance + (oldAdjustment + newAdjustment),
            updatedAt: new Date().toISOString()
        });
    }

    try {
        await batch.commit();

        // Update local state
        const transactionIndex = state.transactions.findIndex(tx => tx.id === transaction.id);
        if (transactionIndex !== -1) {
            state.transactions[transactionIndex] = transactionData;
        }

        // Update account balances in local state
        if (oldAccount.id !== newAccount.id) {
            const oldAccountIndex = state.accounts.findIndex(acc => acc.id === oldAccount.id);
            if (oldAccountIndex !== -1) {
                state.accounts[oldAccountIndex].balance += oldAdjustment;
                state.accounts[oldAccountIndex].updatedAt = transactionData.updatedAt;
            }

            const newAccountIndex = state.accounts.findIndex(acc => acc.id === newAccount.id);
            if (newAccountIndex !== -1) {
                state.accounts[newAccountIndex].balance += newAdjustment;
                state.accounts[newAccountIndex].updatedAt = transactionData.updatedAt;
            }
        } else {
            const accountIndex = state.accounts.findIndex(acc => acc.id === newAccount.id);
            if (accountIndex !== -1) {
                state.accounts[accountIndex].balance += (oldAdjustment + newAdjustment);
                state.accounts[accountIndex].updatedAt = transactionData.updatedAt;
            }
        }

        await renderAll();
    } catch (error) {
        console.error('Error updating transaction:', error);
        throw new Error('Failed to update transaction. Please try again.');
    }
}

// Function to handle edit transaction click
function editTransaction(transactionId) {
    const transaction = state.transactions.find(tx => tx.id === transactionId);
    if (!transaction) {
        showToast('Transaction not found', 'error');
        return;
    }
    createEditTransactionModal(transaction);
}

// Make functions globally available
window.editTransaction = editTransaction;
window.updateTransactionType = updateTransactionType;
window.closeEditTransactionModal = closeEditTransactionModal;


document.addEventListener('DOMContentLoaded', async () => {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                await loadUserData(true);
                // Initialize based on current view
                if (state.currentView === 'dashboard') {
                    initializeSelfTransfer();
                } else if (state.currentView === 'analytics') {
                    initializeAnalytics();
                }
            } catch (error) {
                console.error('Error in initial load:', error);
                showToast('Error loading data. Please refresh the page.', 'error');
            }
        }
    });

    // Other event listeners...
});

// Make it globally available
window.switchView = switchView;
// Make functions globally available
window.renderAll = renderAll;
window.updateCategoryOptions = updateCategoryOptions;
window.showFilteredAccounts = showFilteredAccounts;
window.editTransaction = editTransaction;
window.updateTransactionType = updateTransactionType;
window.closeEditTransactionModal = closeEditTransactionModal;
// At the bottom of app-ui.js
window.initializeAccountDragDrop = initializeAccountDragDrop;
window.updateAccountOrder = updateAccountOrder;
window.showDeleteAccountModal = showDeleteAccountModal;
window.handleAccountDeletion = handleAccountDeletion;
window.closeModal = closeModal;