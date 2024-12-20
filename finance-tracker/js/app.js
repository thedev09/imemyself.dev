// Initialize Firestore
const db = firebase.firestore();

// State management
const state = {
    accounts: [],
    transactions: []
};

// Data loading
async function loadUserData() {
    if (!currentUser) return;

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

        // Load transactions
        const transactionsSnapshot = await db.collection('users')
            .doc(currentUser.uid)
            .collection('transactions')
            .get();
        
        state.transactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderAccounts();
        renderTransactions();
        renderCharts();
    } catch (error) {
        console.error("Error loading data:", error);
        alert('Error loading data. Please refresh the page.');
    }
}

// Save functions
async function saveAccount(account) {
    if (!currentUser) return;

    try {
        await db.collection('users')
            .doc(currentUser.uid)
            .collection('accounts')
            .doc(account.id)
            .set(account);
    } catch (error) {
        console.error("Error saving account:", error);
        alert('Error saving account. Please try again.');
    }
}

async function saveTransaction(transaction) {
    if (!currentUser) return;

    try {
        await db.collection('users')
            .doc(currentUser.uid)
            .collection('transactions')
            .doc(transaction.id)
            .set(transaction);
    } catch (error) {
        console.error("Error saving transaction:", error);
        alert('Error saving transaction. Please try again.');
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