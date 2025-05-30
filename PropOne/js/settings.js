// Fixed settings.js with proper modular integration
import { auth, db } from './firebase-config.js';
import authManager from './auth.js';
import accountManager from './account-manager.js';
import dataExporter from './data-export.js';
import notifications from './notifications.js';
import dataValidator from './data-validator.js';

// Initialize auth manager
authManager.init();

// DOM elements
const userEmailEl = document.getElementById('user-email');
const authMethodEl = document.getElementById('auth-method');
const accountCreatedEl = document.getElementById('account-created');
const accountCountEl = document.getElementById('account-count');
const dataSizeEl = document.getElementById('data-size');
const changePasswordBtn = document.getElementById('change-password-btn');
const changePasswordModal = document.getElementById('change-password-modal');
const changePasswordForm = document.getElementById('change-password-form');

// Button elements
const exportDataBtn = document.getElementById('export-data-btn');
const importDataBtn = document.getElementById('import-data-btn');
const importFileInput = document.getElementById('import-file-input');
const savePreferencesBtn = document.getElementById('save-preferences-btn');
const deleteAllDataBtn = document.getElementById('delete-all-data-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');

let currentUser = null;

// Initialize settings page
authManager.onAuthStateChange((user) => {
    if (user) {
        currentUser = user;
        loadUserProfile();
        loadUserData();
        loadPreferences();
    } else {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
    }
});

// Load user profile information
function loadUserProfile() {
    if (!currentUser) return;

    console.log('Loading user profile for:', currentUser.email);

    const profile = authManager.getUserProfile();
    
    if (userEmailEl) userEmailEl.textContent = profile.email;
    if (authMethodEl) authMethodEl.textContent = profile.authMethod;
    
    // Show/hide change password button based on auth method
    if (changePasswordBtn) {
        changePasswordBtn.style.display = profile.canChangePassword ? 'inline-block' : 'none';
    }
    
    // Set account creation date
    if (accountCreatedEl) {
        accountCreatedEl.textContent = authManager.getFormattedCreationDate();
    }
}

// Load user data statistics
async function loadUserData() {
    if (!currentUser) return;

    try {
        console.log('Loading user data for:', currentUser.uid);
        
        const result = await accountManager.loadAccountsForUser(currentUser.uid);
        
        if (result.success) {
            const accounts = accountManager.getAllAccounts();
            console.log('Found accounts:', accounts.length);
            
            // Update account count
            if (accountCountEl) accountCountEl.textContent = accounts.length;
            
            // Calculate data size
            const dataSize = accountManager.calculateDataSize();
            if (dataSizeEl) dataSizeEl.textContent = formatBytes(dataSize);
            
        } else {
            console.error('Error loading accounts:', result.error);
            notifications.error('Error loading account data');
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
        notifications.error('Error loading data statistics');
    }
}

// Format bytes to human readable format
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Load user preferences
function loadPreferences() {
    try {
        const preferences = JSON.parse(localStorage.getItem('propone-preferences') || '{}');
        
        // Set default account size
        const defaultAccountSize = document.getElementById('default-account-size');
        if (defaultAccountSize && preferences.defaultAccountSize) {
            defaultAccountSize.value = preferences.defaultAccountSize;
        }
        
        // Set currency display
        const currencyDisplay = document.getElementById('currency-display');
        if (currencyDisplay && preferences.currencyDisplay) {
            currencyDisplay.value = preferences.currencyDisplay;
        }
        
        // Set theme preference
        const themePreference = document.getElementById('theme-preference');
        if (themePreference && preferences.theme) {
            themePreference.value = preferences.theme;
        }
        
        // Set notifications
        const notificationsSelect = document.getElementById('notifications');
        if (notificationsSelect && preferences.notifications) {
            notificationsSelect.value = preferences.notifications;
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

// Save user preferences
function savePreferences() {
    try {
        const preferences = {
            defaultAccountSize: document.getElementById('default-account-size')?.value,
            currencyDisplay: document.getElementById('currency-display')?.value,
            theme: document.getElementById('theme-preference')?.value,
            notifications: document.getElementById('notifications')?.value,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('propone-preferences', JSON.stringify(preferences));
        notifications.success('Preferences saved successfully!');
    } catch (error) {
        console.error('Error saving preferences:', error);
        notifications.error('Error saving preferences');
    }
}

// Export user data
async function exportUserData() {
    if (!currentUser) {
        notifications.warning('You must be logged in to export data');
        return;
    }

    try {
        const accounts = accountManager.getAllAccounts();
        
        if (accounts.length === 0) {
            notifications.warning('No account data to export');
            return;
        }

        const exportData = {
            exportInfo: {
                exportDate: new Date().toISOString(),
                userEmail: currentUser.email,
                accountCount: accounts.length,
                version: '1.0'
            },
            accounts: accountManager.exportAccountsData(),
            preferences: JSON.parse(localStorage.getItem('propone-preferences') || '{}')
        };

        const result = dataExporter.exportToJSON(exportData);
        
        if (result.success) {
            notifications.success(`Data exported successfully as ${result.filename}`);
        } else {
            notifications.error('Error exporting data');
        }
        
    } catch (error) {
        console.error('Error exporting data:', error);
        notifications.error('Error exporting data: ' + error.message);
    }
}

// Import user data
async function importUserData(file) {
    if (!file) return;

    try {
        // Validate file
        const fileValidation = dataValidator.validateFileUpload(file, {
            maxSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['application/json'],
            allowedExtensions: ['.json']
        });

        if (!fileValidation.valid) {
            notifications.error(fileValidation.errors.join(', '));
            return;
        }

        const importResult = await dataExporter.importFromJSON(file);
        
        if (!importResult.success) {
            notifications.error('Error reading file: ' + importResult.error);
            return;
        }

        const importData = importResult.data;

        // Validate import data
        const dataValidation = dataValidator.validateImportData(importData);
        if (!dataValidation.valid) {
            notifications.error('Invalid backup file: ' + dataValidation.errors.join(', '));
            return;
        }

        // Confirm import
        const confirmMessage = `Import ${importData.accounts.length} accounts? This will not overwrite existing accounts.`;
        
        notifications.showCustomConfirm({
            title: 'Confirm Data Import',
            message: confirmMessage,
            confirmText: 'Import',
            cancelText: 'Cancel',
            confirmClass: 'btn-primary',
            onConfirm: async () => {
                try {
                    const importAccountsResult = await accountManager.importAccountsData(currentUser.uid, importData.accounts);
                    
                    if (importAccountsResult.success) {
                        // Import preferences if available
                        if (importData.preferences) {
                            localStorage.setItem('propone-preferences', JSON.stringify(importData.preferences));
                            loadPreferences();
                        }

                        notifications.success(`Successfully imported ${importAccountsResult.importedCount} accounts!`);
                        loadUserData(); // Refresh data statistics
                    } else {
                        notifications.error('Error importing accounts: ' + importAccountsResult.error);
                    }
                } catch (error) {
                    console.error('Error during import:', error);
                    notifications.error('Error importing data: ' + error.message);
                }
            }
        });

    } catch (error) {
        console.error('Error importing data:', error);
        notifications.error('Error importing data: ' + error.message);
    }
}

// Delete all user data
async function deleteAllUserData() {
    if (!currentUser) {
        notifications.warning('You must be logged in');
        return;
    }

    notifications.showCustomConfirm({
        title: 'Delete All Data',
        message: 'This will permanently delete ALL your account data. This action cannot be undone.',
        confirmText: 'Delete All Data',
        cancelText: 'Cancel',
        confirmClass: 'btn-danger',
        onConfirm: async () => {
            // Second confirmation with typed text
            notifications.showCustomPrompt({
                title: 'Final Confirmation',
                message: 'Type "DELETE ALL DATA" to confirm this irreversible action:',
                placeholder: 'DELETE ALL DATA',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                validator: (value) => ({
                    valid: value === 'DELETE ALL DATA',
                    message: 'You must type exactly "DELETE ALL DATA" to confirm'
                }),
                onSubmit: async (value) => {
                    try {
                        const result = await accountManager.deleteAllAccountsForUser(currentUser.uid);
                        
                        if (result.success) {
                            // Clear local preferences
                            localStorage.removeItem('propone-preferences');
                            
                            notifications.success(`Successfully deleted ${result.deletedCount} accounts`);
                            
                            // Refresh page after delay
                            setTimeout(() => {
                                window.location.reload();
                            }, 2000);
                        } else {
                            notifications.error('Error deleting data: ' + result.error);
                        }
                    } catch (error) {
                        console.error('Error deleting data:', error);
                        notifications.error('Error deleting data: ' + error.message);
                    }
                }
            });
        }
    });
}

// Delete user account
async function deleteUserAccount() {
    if (!currentUser) {
        notifications.warning('You must be logged in');
        return;
    }

    notifications.showCustomConfirm({
        title: 'Delete Account',
        message: 'This will permanently delete your account and ALL data. This action cannot be undone.',
        confirmText: 'Delete Account',
        cancelText: 'Cancel',
        confirmClass: 'btn-danger',
        onConfirm: async () => {
            // Second confirmation with typed text
            notifications.showCustomPrompt({
                title: 'Final Confirmation',
                message: 'Type "DELETE ACCOUNT" to confirm this irreversible action:',
                placeholder: 'DELETE ACCOUNT',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                validator: (value) => ({
                    valid: value === 'DELETE ACCOUNT',
                    message: 'You must type exactly "DELETE ACCOUNT" to confirm'
                }),
                onSubmit: async (value) => {
                    try {
                        // First delete all user data
                        await accountManager.deleteAllAccountsForUser(currentUser.uid);
                        
                        // Clear local data
                        localStorage.clear();
                        
                        // Delete the user account
                        const result = await authManager.deleteAccount();
                        
                        if (result.success) {
                            notifications.success('Account deleted successfully');
                            
                            // Redirect to login page
                            setTimeout(() => {
                                window.location.href = 'login.html';
                            }, 2000);
                        } else {
                            notifications.error(result.error);
                        }
                    } catch (error) {
                        console.error('Error deleting account:', error);
                        notifications.error('Error deleting account: ' + error.message);
                    }
                }
            });
        }
    });
}

// Change password functionality
function showChangePasswordModal() {
    if (changePasswordModal) changePasswordModal.style.display = 'block';
}

function hideChangePasswordModal() {
    if (changePasswordModal) changePasswordModal.style.display = 'none';
    if (changePasswordForm) changePasswordForm.reset();
}

async function changePassword(currentPassword, newPassword) {
    try {
        const result = await authManager.changePassword(currentPassword, newPassword);
        
        if (result.success) {
            notifications.success('Password changed successfully!');
            hideChangePasswordModal();
        } else {
            notifications.error(result.error);
        }
    } catch (error) {
        console.error('Error changing password:', error);
        notifications.error('Error changing password: ' + error.message);
    }
}

// Event listeners
if (exportDataBtn) {
    exportDataBtn.addEventListener('click', exportUserData);
}

if (importDataBtn) {
    importDataBtn.addEventListener('click', () => {
        if (importFileInput) importFileInput.click();
    });
}

if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importUserData(e.target.files[0]);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    });
}

if (savePreferencesBtn) {
    savePreferencesBtn.addEventListener('click', savePreferences);
}

if (deleteAllDataBtn) {
    deleteAllDataBtn.addEventListener('click', deleteAllUserData);
}

if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', deleteUserAccount);
}

if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', showChangePasswordModal);
}

if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password')?.value;
        const newPassword = document.getElementById('new-password')?.value;
        const confirmPassword = document.getElementById('confirm-new-password')?.value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            notifications.error('Please fill in all fields');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            notifications.error('New passwords do not match');
            return;
        }
        
        if (newPassword.length < 6) {
            notifications.error('New password must be at least 6 characters');
            return;
        }
        
        changePassword(currentPassword, newPassword);
    });
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === changePasswordModal) {
        hideChangePasswordModal();
    }
});

// Global functions for modal
window.hideChangePasswordModal = hideChangePasswordModal;

console.log('Settings page initialized successfully');