// Initialize Firestore
const db = firebase.firestore();

// State management
const state = {
    accounts: [],
    transactions: []
};

// Navigation function
function switchView(view) {
    console.log('Switching to view:', view);
    state.currentView = view;
    document.querySelectorAll('.view').forEach(el => {
        el.style.display = el.id === `${view}-view` ? 'block' : 'none';
    });
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.toggle('active', el.dataset.view === view);
    });
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');

    // Navigation buttons
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            console.log('Nav link clicked:', e.target.dataset.view);
            switchView(e.target.dataset.view);
        });
    });

    // Transaction type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('Transaction type button clicked');
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
        });
    });

    // Account form
    const accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Account form submitted');
            const formData = new FormData(e.target);
            const account = {
                id: Date.now().toString(),
                name: formData.get('name'),
                type: formData.get('type'),
                currency: formData.get('currency'),
                balance: parseFloat(formData.get('balance'))
            };
            
            try {
                await saveAccount(account);
                state.accounts.push(account);
                renderAccounts();
                e.target.reset();
                console.log('Account saved successfully');
            } catch (error) {
                console.error('Error saving account:', error);
                alert('Error saving account. Please try again.');
            }
        });
    }

    // Transaction form
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Transaction form submitted');
            const formData = new FormData(e.target);
            const transaction = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                type: document.querySelector('.type-btn.selected').dataset.type,
                amount: parseFloat(formData.get('amount')),
                accountId: formData.get('account'),
                category: formData.get('category')
            };

            try {
                // Update account balance
                const account = state.accounts.find(a => a.id === transaction.accountId);
                if (account) {
                    account.balance += transaction.type === 'income' ? 
                        transaction.amount : -transaction.amount;
                    await saveAccount(account);
                }

                await saveTransaction(transaction);
                state.transactions.push(transaction);
                renderTransactions();
                renderCharts();
                e.target.reset();
                console.log('Transaction saved successfully');
            } catch (error) {
                console.error('Error saving transaction:', error);
                alert('Error saving transaction. Please try again.');
            }
        });
    }

    // Initial render
    loadUserData();
});

// Data loading
async function loadUserData() {
    if (!currentUser) return;
    console.log('Loading user data for:', currentUser.uid);

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
        console.log('Loaded accounts:', state.accounts);

        // Load transactions
        const transactionsSnapshot = await db.collection('users')
            .doc(currentUser.uid)
            .collection('transactions')
            .get();
        
        state.transactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log('Loaded transactions:', state.transactions);

        renderAccounts();
        renderTransactions();
        renderCharts();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Please refresh the page.');
    }
}
// UI Rendering Functions
function renderAccounts() {
    const accountsGrid = document.getElementById('accounts-grid');
    const accountSelects = document.querySelectorAll('select[name="account"]');
    
    if (!accountsGrid) return;

    accountsGrid.innerHTML = state.accounts.map(account => `
        <div class="account-card">
            <div class="account-header">
                <span>${account.name}</span>
                <span class="account-type">${account.type}</span>
            </div>
            <div class="account-balance">
                ${account.balance.toFixed(2)} ${account.currency}
            </div>
        </div>
    `).join('') + `
        <button class="account-card add-account" onclick="switchView('settings')">
            + Add Account
        </button>
    `;

    accountSelects.forEach(select => {
        select.innerHTML = state.accounts.map(account => `
            <option value="${account.id}">${account.name} (${account.currency})</option>
        `).join('');
    });
}

function renderTransactions() {
    const recentTransactions = document.getElementById('recent-transactions');
    const allTransactions = document.getElementById('all-transactions');
    
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
                            <div class="transaction-category">${transaction.category}</div>
                            <div class="transaction-date">${new Date(transaction.date).toLocaleDateString()}</div>
                        </div>
                        <div class="amount-${transaction.type}">
                            ${transaction.type === 'income' ? '+' : '-'}${transaction.amount} ${account?.currency}
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
                        <td>${new Date(transaction.date).toLocaleDateString()}</td>
                        <td>
                            <span class="badge-${transaction.type}">
                                ${transaction.type}
                            </span>
                        </td>
                        <td class="amount-${transaction.type}">
                            ${transaction.type === 'income' ? '+' : '-'}${transaction.amount} ${account?.currency}
                        </td>
                        <td>${account?.name}</td>
                        <td>${transaction.category}</td>
                    </tr>
                `;
            })
            .join('');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Account form submission
    document.getElementById('account-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
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
    });

    // Transaction form submission
    document.getElementById('transaction-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
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
        state.transactions.push(transaction);
        renderTransactions();
        renderCharts();
        e.target.reset();
    });
});
