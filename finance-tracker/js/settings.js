// Initialize settings page
function initializeSettings() {
    renderUserProfile();
    setupNameEdit();
    setupDataManagement();
}

// Render user profile section
function renderUserProfile() {
    const user = getCurrentUser();
    if (!user) return;

    const settingsView = document.getElementById('settings-view');
    if (!settingsView) return;

    // Get auth provider and icon
    const provider = user.providerData[0].providerId;
    let authMethodText = '';
    let authMethodIcon = '';

    // Set correct provider text and icon
    switch(provider) {
        case 'google.com':
            authMethodText = 'Google Account';
            authMethodIcon = '<i class="fab fa-google"></i>';
            break;
        case 'password':
            authMethodText = 'Email/Password';
            authMethodIcon = '<i class="fas fa-envelope"></i>';
            break;
        default:
            authMethodText = 'Email/Password';
            authMethodIcon = '<i class="fas fa-envelope"></i>';
    }

    settingsView.innerHTML = `
        <div class="settings-container">
            <div class="profile-section">
                <div class="profile-header">
                    <img src="${user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`}" 
                         alt="Profile Picture" 
                         class="profile-picture">
                    <div class="profile-info">
                        <div class="name-section">
                            <span class="current-name">${escapeHtml(user.displayName || 'User')}</span>
                            <button class="edit-name-btn" onclick="toggleNameEdit()">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                        <form class="name-edit-form" id="nameEditForm">
                            <input type="text" 
                                   class="name-input" 
                                   id="newName" 
                                   value="${escapeHtml(user.displayName || '')}" 
                                   placeholder="Enter new name"
                                   required>
                            <button type="submit" class="confirm-name-btn">
                                <i class="fas fa-check"></i>
                            </button>
                        </form>
                        <div class="user-email">${escapeHtml(user.email)}</div>
                        <div class="auth-method">
                            ${authMethodIcon}
                            ${authMethodText}
                        </div>
                    </div>
                </div>
            </div>

            <div class="data-section">
    <h2>Data Management</h2>
    <div class="data-actions">
        <button onclick="exportUserData()" class="export-btn">
            <i class="fas fa-download"></i>
            Export Data
        </button>
        <button onclick="clearAllTransactions()" class="clear-transactions-btn">
            <i class="fas fa-eraser"></i>
            Clear Transactions
        </button>
        <button onclick="clearAllData()" class="clear-data-btn">
            <i class="fas fa-trash"></i>
            Clear All
        </button>
    </div>
</div>
        </div>
    `;
}

// Toggle name edit form
function toggleNameEdit() {
    const nameForm = document.querySelector('.name-edit-form');
    nameForm.classList.toggle('active');
    if (nameForm.classList.contains('active')) {
        document.getElementById('newName').focus();
    }
}

// Setup name edit functionality
function setupNameEdit() {
    const form = document.getElementById('nameEditForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('newName').value.trim();
        
        if (!newName) {
            showToast('Please enter a valid name', 'error');
            return;
        }

        toggleLoading(true);
        try {
            const user = getCurrentUser();
            await user.updateProfile({
                displayName: newName
            });

            // Update user document in Firestore
            await db.collection('users').doc(user.uid).update({
                displayName: newName,
                updatedAt: new Date().toISOString()
            });

            // Update UI
            document.querySelector('.current-name').textContent = newName;
            document.getElementById('userName').textContent = newName;
            toggleNameEdit();
            showToast('Name updated successfully!');
        } catch (error) {
            console.error('Error updating name:', error);
            showToast(error.message || 'Error updating name', 'error');
        } finally {
            toggleLoading(false);
        }
    });
}

// Setup data management functionality
function setupDataManagement() {
    // Already handled by onclick attributes in the HTML
}

// Export user data
async function exportUserData() {
    toggleLoading(true);
    try {
        const user = getCurrentUser();
        if (!user) throw new Error('Please sign in to continue');

        // Fetch all user data
        const userData = {
            profile: {
                email: user.email,
                displayName: user.displayName,
                createdAt: user.metadata.creationTime
            },
            accounts: state.accounts,
            transactions: state.transactions
        };

        // Convert to JSON and create blob
        const jsonData = JSON.stringify(userData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Data exported successfully!');
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast(error.message || 'Error exporting data', 'error');
    } finally {
        toggleLoading(false);
    }
}


async function clearAllTransactions() {
    const confirmed = confirm(
        'Are you sure you want to clear all your transactions? This action cannot be undone.\n\n' +
        'Your accounts and their current balances will remain unchanged.'
    );

    if (!confirmed) return;

    toggleLoading(true);
    try {
        const user = getCurrentUser();
        if (!user) throw new Error('Please sign in to continue');

        const batch = db.batch();

        // Delete all transactions
        const transactionsSnapshot = await db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .get();
        
        transactionsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Update user document
        batch.update(db.collection('users').doc(user.uid), {
            transactionsCleared: new Date().toISOString()
        });

        await batch.commit();

        // Clear local transactions state
        state.transactions = [];

        // Re-render UI
        await loadUserData(true);
        showToast('All transactions cleared successfully');
    } catch (error) {
        console.error('Error clearing transactions:', error);
        showToast(error.message || 'Error clearing transactions', 'error');
    } finally {
        toggleLoading(false);
    }
}


// Clear all user data
async function clearAllData() {
    const confirmed = confirm(
        'Are you sure you want to clear all your data? This action cannot be undone.\n\n' +
        'This will delete all your accounts and transactions.'
    );

    if (!confirmed) return;

    toggleLoading(true);
    try {
        const user = getCurrentUser();
        if (!user) throw new Error('Please sign in to continue');

        const batch = db.batch();

        // Delete all accounts
        const accountsSnapshot = await db.collection('users')
            .doc(user.uid)
            .collection('accounts')
            .get();
        
        accountsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete all transactions
        const transactionsSnapshot = await db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .get();
        
        transactionsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Update user document
        batch.update(db.collection('users').doc(user.uid), {
            dataCleared: new Date().toISOString()
        });

        await batch.commit();

        // Clear local state
        state.accounts = [];
        state.transactions = [];

        // Re-render UI
        await loadUserData(true);
        showToast('All data cleared successfully');
    } catch (error) {
        console.error('Error clearing data:', error);
        showToast(error.message || 'Error clearing data', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Make functions globally available
window.initializeSettings = initializeSettings;
window.toggleNameEdit = toggleNameEdit;
window.exportUserData = exportUserData;
window.clearAllTransactions = clearAllTransactions;
window.clearAllData = clearAllData;