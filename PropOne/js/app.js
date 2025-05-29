import { auth, db } from './firebase-config.js';
import { 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// DOM elements
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const logoutBtn = document.getElementById('logout-btn');
const userEmail = document.getElementById('user-email');
const accountsList = document.getElementById('accounts-list');
const addAccountBtn = document.getElementById('add-account-btn');
const addAccountModal = document.getElementById('add-account-modal');
const closeModal = document.querySelector('.close');
const cancelBtn = document.getElementById('cancel-btn');
const addAccountForm = document.getElementById('add-account-form');

// Navigation elements
const profileBtn = document.getElementById('profile-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const settingsBtn = document.getElementById('settings-btn');
const helpBtn = document.getElementById('help-btn');

// Form elements
const firmSelect = document.getElementById('firm-name');
const customFirmGroup = document.getElementById('custom-firm-group');
const customFirmInput = document.getElementById('custom-firm-name');
const accountSizeSelect = document.getElementById('account-size-select');
const customSizeGroup = document.getElementById('custom-size-group');
const customSizeInput = document.getElementById('custom-account-size');
const profitTargetPercent = document.getElementById('profit-target-percent');
const phaseSelect = document.getElementById('phase');
const profitTargetGroup = document.getElementById('profit-target-group');
const profitShareGroup = document.getElementById('profit-share-group');

let currentUser = null;
let editingAccountId = null;

// Updated prop firm templates with your specifications
const propFirmTemplates = {
    'FundingPips': {
        accountSizes: [10000, 25000, 50000, 100000, 200000],
        dailyDrawdown: 5,
        maxDrawdown: 10,
        phase1Target: 10,
        phase2Target: 5,
        platform: 'MT5'
    },
    'The5%ers': {
        accountSizes: [100000],
        dailyDrawdown: 5,
        maxDrawdown: 10,
        phase1Target: 8,
        phase2Target: 5,
        platform: 'MT5'
    },
    'Alpha Capital Group': {
        accountSizes: [25000, 50000, 100000, 200000],
        dailyDrawdown: 5,
        maxDrawdown: 10,
        phase1Target: 10,
        phase2Target: 5,
        platform: 'MT5'
    },
    'FunderPro': {
        accountSizes: [10000, 25000, 50000, 100000, 200000],
        dailyDrawdown: 5,
        maxDrawdown: 10,
        phase1Target: 10,
        phase2Target: 8,
        platform: 'MT5'
    },
    'ThinkCapital': {
        accountSizes: [25000, 50000, 100000, 200000],
        dailyDrawdown: 4,
        maxDrawdown: 8,
        phase1Target: 8,
        phase2Target: 5,
        platform: 'MT4'
    },
    'BrightFunded': {
        accountSizes: [10000, 25000, 50000, 100000, 200000],
        dailyDrawdown: 5,
        maxDrawdown: 10,
        phase1Target: 8,
        phase2Target: 5,
        platform: 'MT5'
    },
    'PipFarm': {
        accountSizes: [10000, 25000, 50000, 100000, 200000],
        dailyDrawdown: 3,
        maxDrawdown: 10,
        phase1Target: 9,
        phase2Target: 6,
        platform: 'MT4'
    },
    'FundedNext': {
        accountSizes: [5000, 10000, 25000, 50000, 100000, 200000],
        dailyDrawdown: 5,
        maxDrawdown: 10,
        phase1Target: 8,
        phase2Target: 5,
        platform: 'MT5'
    },
    'Instant Funding': {
        accountSizes: [5000, 10000, 25000, 50000, 100000, 200000],
        dailyDrawdown: 5,
        maxDrawdown: 10,
        phase1Target: 10,
        phase2Target: 5,
        platform: 'MT5'
    }
};

// Auth state listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        showApp(user);
        loadAccounts();
    } else {
        currentUser = null;
        showAuth();
    }
});

function showApp(user) {
    authSection.style.display = 'none';
    appSection.classList.remove('hidden');
    userEmail.textContent = user.email;
}

function showAuth() {
    authSection.style.display = 'block';
    appSection.classList.add('hidden');
}

// Navigation functions
if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
    });
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (profileBtn && profileDropdown && !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('show');
    }
});

if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        profileDropdown.classList.remove('show');
        alert('Settings feature coming soon!');
    });
}

if (helpBtn) {
    helpBtn.addEventListener('click', () => {
        profileDropdown.classList.remove('show');
        alert('Help & Support coming soon!');
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log('Logout successful');
        });
    });
}

// Modal functions
if (addAccountBtn) {
    addAccountBtn.addEventListener('click', () => {
        resetModal();
        addAccountModal.style.display = 'block';
    });
}

function resetModal() {
    editingAccountId = null;
    if (addAccountForm) addAccountForm.reset();
    if (customFirmGroup) customFirmGroup.style.display = 'none';
    if (customSizeGroup) customSizeGroup.style.display = 'none';
    if (profitShareGroup) profitShareGroup.style.display = 'none';
    if (profitTargetGroup) profitTargetGroup.style.display = 'block';
    
    // Reset firm select to original options and enable it
    if (firmSelect) {
        firmSelect.innerHTML = `
            <option value="">Select Prop Firm</option>
            <option value="FundingPips">FundingPips</option>
            <option value="The5%ers">The5%ers</option>
            <option value="Alpha Capital Group">Alpha Capital Group</option>
            <option value="FunderPro">FunderPro</option>
            <option value="ThinkCapital">ThinkCapital</option>
            <option value="BrightFunded">BrightFunded</option>
            <option value="PipFarm">PipFarm</option>
            <option value="FundedNext">FundedNext</option>
            <option value="Instant Funding">Instant Funding</option>
            <option value="Other">Other</option>
        `;
        firmSelect.disabled = false;
    }
    
    const modalTitle = document.querySelector('#add-account-modal h2');
    const submitBtn = document.querySelector('#add-account-form button[type="submit"]');
    if (modalTitle) modalTitle.textContent = 'Add New Account';
    if (submitBtn) {
        submitBtn.textContent = 'Add Account';
        delete submitBtn.dataset.upgradeFrom;
    }
}

function hideModal() {
    if (addAccountModal) addAccountModal.style.display = 'none';
    resetModal();
}

if (closeModal) closeModal.addEventListener('click', hideModal);
if (cancelBtn) cancelBtn.addEventListener('click', hideModal);

window.addEventListener('click', (e) => {
    if (e.target === addAccountModal) hideModal();
});

// Form logic
if (firmSelect) {
    firmSelect.addEventListener('change', (e) => {
        const selectedFirm = e.target.value;
        
        if (selectedFirm === 'Other') {
            if (customFirmGroup) customFirmGroup.style.display = 'block';
            if (customFirmInput) customFirmInput.setAttribute('required', 'required');
        } else {
            if (customFirmGroup) customFirmGroup.style.display = 'none';
            if (customFirmInput) {
                customFirmInput.removeAttribute('required');
                customFirmInput.value = '';
            }
        }
        
        if (propFirmTemplates[selectedFirm]) {
            applyTemplate(selectedFirm);
        } else {
            resetTemplate();
        }
    });
}

function applyTemplate(firmName) {
    const template = propFirmTemplates[firmName];
    if (!template) return;
    
    // Set account size to first available option
    if (accountSizeSelect) accountSizeSelect.value = template.accountSizes[0].toString();
    
    // Set template values
    const dailyDrawdown = document.getElementById('daily-drawdown');
    const maxDrawdown = document.getElementById('max-drawdown');
    const platform = document.getElementById('platform');
    
    if (dailyDrawdown) dailyDrawdown.value = template.dailyDrawdown;
    if (maxDrawdown) maxDrawdown.value = template.maxDrawdown;
    if (platform) platform.value = template.platform;
    
    // Set profit target based on current phase
    updateProfitTargetFromTemplate(template);
    calculateTargetAmount();
}

function resetTemplate() {
    const dailyDrawdown = document.getElementById('daily-drawdown');
    const maxDrawdown = document.getElementById('max-drawdown');
    const platform = document.getElementById('platform');
    
    if (dailyDrawdown) dailyDrawdown.value = '';
    if (maxDrawdown) maxDrawdown.value = '';
    if (platform) platform.value = '';
}

function updateProfitTargetFromTemplate(template) {
    if (!phaseSelect || !profitTargetPercent) return;
    
    const selectedPhase = phaseSelect.value;
    
    if (selectedPhase === 'Challenge Phase 1') {
        profitTargetPercent.value = template.phase1Target;
    } else if (selectedPhase === 'Challenge Phase 2') {
        profitTargetPercent.value = template.phase2Target;
    } else if (selectedPhase === 'Funded') {
        profitTargetPercent.value = '';
    }
}

if (phaseSelect) {
    phaseSelect.addEventListener('change', (e) => {
        const selectedPhase = e.target.value;
        
        if (selectedPhase === 'Funded') {
            if (profitTargetGroup) profitTargetGroup.style.display = 'none';
            if (profitShareGroup) profitShareGroup.style.display = 'block';
            if (profitTargetPercent) profitTargetPercent.removeAttribute('required');
            const profitShare = document.getElementById('profit-share');
            if (profitShare) profitShare.setAttribute('required', 'required');
        } else {
            if (profitTargetGroup) profitTargetGroup.style.display = 'block';
            if (profitShareGroup) profitShareGroup.style.display = 'none';
            if (profitTargetPercent) profitTargetPercent.setAttribute('required', 'required');
            const profitShare = document.getElementById('profit-share');
            if (profitShare) profitShare.removeAttribute('required');
            
            // Update profit target based on selected firm and phase
            const selectedFirm = firmSelect.value;
            if (propFirmTemplates[selectedFirm]) {
                updateProfitTargetFromTemplate(propFirmTemplates[selectedFirm]);
                calculateTargetAmount();
            }
        }
    });
}

if (accountSizeSelect) {
    accountSizeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            if (customSizeGroup) customSizeGroup.style.display = 'block';
            if (customSizeInput) customSizeInput.setAttribute('required', 'required');
        } else {
            if (customSizeGroup) customSizeGroup.style.display = 'none';
            if (customSizeInput) {
                customSizeInput.removeAttribute('required');
                customSizeInput.value = '';
            }
        }
        calculateTargetAmount();
    });
}

function calculateTargetAmount() {
    if (!accountSizeSelect || !profitTargetPercent) return;
    
    const accountSize = accountSizeSelect.value === 'custom' 
        ? parseFloat(customSizeInput?.value) || 0
        : parseFloat(accountSizeSelect.value) || 0;
    
    const percentage = parseFloat(profitTargetPercent.value) || 0;
    const targetAmount = (accountSize * percentage / 100).toFixed(2);
    
    const targetAmountDisplay = document.getElementById('target-amount-display');
    if (targetAmountDisplay) targetAmountDisplay.textContent = targetAmount;
}

if (profitTargetPercent) profitTargetPercent.addEventListener('input', calculateTargetAmount);
if (customSizeInput) customSizeInput.addEventListener('input', calculateTargetAmount);

// Form submission
if (addAccountForm) {
    addAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('You must be logged in');
            return;
        }
        
        try {
            const firmName = firmSelect.value === 'Other' ? customFirmInput.value : firmSelect.value;
            const accountSize = accountSizeSelect.value === 'custom' ? parseFloat(customSizeInput.value) : parseFloat(accountSizeSelect.value);
            const currentBalance = parseFloat(document.getElementById('current-balance').value);
            const phase = document.getElementById('phase').value;
            const maxDrawdown = parseFloat(document.getElementById('max-drawdown').value);
            const dailyDrawdown = parseFloat(document.getElementById('daily-drawdown').value);
            const platform = document.getElementById('platform').value;
            
            let profitTargetPercentValue, profitTargetAmount, profitShare;
            
            if (phase === 'Funded') {
                profitShare = parseFloat(document.getElementById('profit-share').value) || 80;
                profitTargetPercentValue = 0;
                profitTargetAmount = 0;
            } else {
                profitTargetPercentValue = parseFloat(document.getElementById('profit-target-percent').value);
                profitTargetAmount = (accountSize * profitTargetPercentValue / 100);
                profitShare = 0;
            }
            
            const accountData = {
                userId: currentUser.uid,
                firmName,
                accountSize,
                currentBalance,
                phase,
                profitTargetPercent: profitTargetPercentValue,
                profitTargetAmount,
                profitShare,
                maxDrawdown,
                dailyDrawdown,
                platform,
                createdAt: editingAccountId ? undefined : new Date(),
                updatedAt: new Date()
            };
            
            if (editingAccountId) {
                delete accountData.createdAt;
                await updateDoc(doc(db, 'accounts', editingAccountId), accountData);
                console.log('Account updated successfully!');
            } else {
                await addDoc(collection(db, 'accounts'), accountData);
                console.log('Account added successfully!');
                
                const submitBtn = document.querySelector('#add-account-form button[type="submit"]');
                if (submitBtn?.dataset.upgradeFrom) {
                    await deleteDoc(doc(db, 'accounts', submitBtn.dataset.upgradeFrom));
                    console.log('Old account removed after upgrade');
                }
            }
            
            hideModal();
            loadAccounts();
            
        } catch (error) {
            console.error('Error saving account:', error);
            alert('Error saving account: ' + error.message);
        }
    });
}

// Load and display accounts
async function loadAccounts() {
    if (!currentUser) return;
    
    try {
        const q = query(
            collection(db, 'accounts'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        displayAccounts(querySnapshot.docs);
        
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

function displayAccounts(accounts) {
    if (!accountsList) return;
    
    if (accounts.length === 0) {
        accountsList.innerHTML = `
            <div class="empty-state">
                <h3>No accounts yet</h3>
                <p>Add your first prop firm account to get started tracking your trading progress.</p>
            </div>
        `;
        return;
    }
    
    accountsList.innerHTML = `<div class="accounts-grid">${accounts.map(doc => {
        const account = doc.data();
        const accountId = doc.id;
        
        const currentPnL = account.currentBalance - account.accountSize;
        const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
        
        // Fixed: Daily DD should be calculated from day's starting balance, not account size
        // For now, we'll use current balance as proxy for "today's starting balance"
        // In real implementation, you'd track daily starting balance
        const dailyStartBalance = account.currentBalance; // This should be actual day start balance
        const dailyDrawdownAmount = dailyStartBalance * (account.dailyDrawdown / 100);
        
        // Check for breaches - Max DD from account start, Daily DD from day start
        const isMaxDrawdownBreached = currentPnL < -maxDrawdownAmount;
        // Daily DD breach would be: today's low < (today's start - daily DD amount)
        // For now, we'll disable daily DD breach since we don't track intraday data
        const isDailyDrawdownBreached = false; // Disabled until we have proper daily tracking
        const isBreached = isMaxDrawdownBreached || isDailyDrawdownBreached;
        
        // Get firm initials for logo
        const firmInitials = account.firmName.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
        
        let stat1Label, stat1Value, stat2Label, stat2Value, stat3Label, stat3Value, stat4Label, stat4Value;
        let progressLabel, progressPercent, progressColor, progressText;
        let upgradeButtonHtml = '';
        
        // Simplified phase names
        let displayPhase = account.phase;
        if (account.phase === 'Challenge Phase 1') displayPhase = 'Phase 1';
        else if (account.phase === 'Challenge Phase 2') displayPhase = 'Phase 2';
        else if (account.phase === 'Challenge Phase 3') displayPhase = 'Phase 3';
        
        if (account.phase === 'Funded') {
            // Funded account stats
            stat1Label = 'Balance';
            stat1Value = `${account.currentBalance.toLocaleString()}`;
            stat2Label = 'Daily P&L';
            stat2Value = `${currentPnL >= 0 ? '+' : ''}${currentPnL.toLocaleString()}`;
            stat3Label = 'Profit Share';
            stat3Value = `${account.profitShare || 80}%`;
            stat4Label = 'Your Share';
            if (currentPnL > 0) {
                const yourShare = currentPnL * (account.profitShare || 80) / 100;
                stat4Value = `${yourShare.toLocaleString()}`;
            } else {
                stat4Value = '$0';
            }
            
            progressLabel = 'Account Health';
            progressText = currentPnL >= 0 ? 'Profitable' : 'In Drawdown';
            progressPercent = Math.max(20, Math.min(100, 100 - Math.abs(currentPnL / maxDrawdownAmount) * 100));
            progressColor = currentPnL >= 0 ? 'profit' : 'loss';
            
        } else {
            // Challenge phase stats
            const remainingTarget = Math.max(0, account.profitTargetAmount - currentPnL);
            
            stat1Label = 'Balance';
            stat1Value = `${account.currentBalance.toLocaleString()}`;
            stat2Label = 'Daily P&L';
            stat2Value = `${currentPnL >= 0 ? '+' : ''}${currentPnL.toLocaleString()}`;
            stat3Label = 'Target Remaining';
            stat3Value = `${remainingTarget.toLocaleString()}`;
            stat4Label = 'Max DD';
            stat4Value = `${account.maxDrawdown}%`;
            
            if (account.profitTargetAmount > 0) {
                progressPercent = Math.max(0, Math.min(100, (currentPnL / account.profitTargetAmount) * 100));
                
                if (currentPnL >= account.profitTargetAmount) {
                    progressColor = 'profit';
                    progressLabel = 'Target Progress';
                    progressText = 'Target Reached!';
                    if (!isBreached) {
                        upgradeButtonHtml = `<button class="action-btn upgrade-btn" onclick="upgradeAccount('${accountId}', '${account.firmName}', ${account.accountSize}, '${account.phase}')">Upgrade</button>`;
                    }
                } else if (currentPnL < 0) {
                    progressColor = 'loss';
                    progressLabel = 'Drawdown Risk';
                    progressText = `${Math.abs((currentPnL / maxDrawdownAmount) * 100).toFixed(1)}% of Max DD`;
                    progressPercent = Math.abs(currentPnL / maxDrawdownAmount) * 100;
                } else {
                    progressColor = 'target';
                    progressLabel = 'Target Progress';
                    progressText = `${progressPercent.toFixed(1)}% Complete`;
                }
            } else {
                progressPercent = 0;
                progressColor = 'target';
                progressLabel = 'Target Progress';
                progressText = 'No Target Set';
            }
        }
        
        const cardClass = isBreached ? 'account-card breached' : 'account-card';
        const phaseClass = isBreached ? 'phase-badge breached' : 
                         account.phase === 'Funded' ? 'phase-badge funded' : 'phase-badge';
        
        // Fixed layout: breach warning on left, buttons on right
        const breachAndActionsHtml = isBreached ? `
            <div class="bottom-row">
                <div class="breach-warning">⚠️ ACCOUNT BREACHED</div>
                <div class="account-actions">
                    ${upgradeButtonHtml}
                    <button class="action-btn edit-btn" onclick="editAccount('${accountId}')">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteAccount('${accountId}')">Delete</button>
                </div>
            </div>
        ` : `
            <div class="account-actions">
                ${upgradeButtonHtml}
                <button class="action-btn edit-btn" onclick="editAccount('${accountId}')">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteAccount('${accountId}')">Delete</button>
            </div>
        `;
        
        return `
            <div class="${cardClass}">
                <div class="firm-header">
                    <div class="firm-info-container">
                        <div class="firm-logo">${firmInitials}</div>
                        <div class="firm-info">
                            <h3>${account.firmName}</h3>
                            <p>${account.accountSize.toLocaleString()} • ${account.platform}</p>
                        </div>
                    </div>
                    <div class="${phaseClass}">${displayPhase}</div>
                </div>
                
                <div class="account-stats">
                    <div class="stat-item">
                        <div class="stat-label">${stat1Label}</div>
                        <div class="stat-value">${stat1Value}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">${stat2Label}</div>
                        <div class="stat-value ${currentPnL >= 0 ? 'positive' : 'negative'}">${stat2Value}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">${stat3Label}</div>
                        <div class="stat-value">${stat3Value}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">${stat4Label}</div>
                        <div class="stat-value ${account.phase === 'Funded' && currentPnL > 0 ? 'positive' : ''}">${stat4Value}</div>
                    </div>
                </div>
                
                <div class="progress-container">
                    <div class="progress-label">
                        <span>${progressLabel}</span>
                        <span>${progressText}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${progressColor}" style="width: ${Math.max(2, progressPercent)}%;"></div>
                    </div>
                </div>
                
                ${breachAndActionsHtml}
            </div>
        `;
    }).join('')}</div>`;
}

// Global functions for buttons
window.editAccount = async function(accountId) {
    try {
        const docRef = doc(db, 'accounts', accountId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            alert('Account not found');
            return;
        }
        
        const account = docSnap.data();
        editingAccountId = accountId;
        
        addAccountModal.style.display = 'block';
        document.querySelector('#add-account-modal h2').textContent = 'Edit Account';
        document.querySelector('#add-account-form button[type="submit"]').textContent = 'Update Account';
        
        // Fill form with existing data - FIRM NAME IS READ-ONLY WHEN EDITING
        const firmNameCleaned = account.firmName;
        
        // Display firm name but make it uneditable
        firmSelect.innerHTML = `<option value="${firmNameCleaned}" selected>${firmNameCleaned}</option>`;
        firmSelect.disabled = true;
        
        // Set account size
        if ([5000, 10000, 25000, 50000, 100000, 200000].includes(account.accountSize)) {
            accountSizeSelect.value = account.accountSize.toString();
        } else {
            accountSizeSelect.value = 'custom';
            customSizeGroup.style.display = 'block';
            customSizeInput.value = account.accountSize;
            customSizeInput.setAttribute('required', 'required');
        }
        
        document.getElementById('current-balance').value = account.currentBalance;
        document.getElementById('phase').value = account.phase;
        document.getElementById('max-drawdown').value = account.maxDrawdown;
        document.getElementById('daily-drawdown').value = account.dailyDrawdown;
        document.getElementById('platform').value = account.platform;
        
        if (account.phase === 'Funded') {
            profitTargetGroup.style.display = 'none';
            profitShareGroup.style.display = 'block';
            document.getElementById('profit-share').value = account.profitShare || 80;
            document.getElementById('profit-share').setAttribute('required', 'required');
            profitTargetPercent.removeAttribute('required');
        } else {
            profitTargetGroup.style.display = 'block';
            profitShareGroup.style.display = 'none';
            document.getElementById('profit-target-percent').value = account.profitTargetPercent;
            profitTargetPercent.setAttribute('required', 'required');
            document.getElementById('profit-share').removeAttribute('required');
            calculateTargetAmount();
        }
        
    } catch (error) {
        console.error('Error loading account for editing:', error);
        alert('Error loading account: ' + error.message);
    }
};

window.deleteAccount = async function(accountId) {
    if (confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
        try {
            await deleteDoc(doc(db, 'accounts', accountId));
            console.log('Account deleted successfully!');
            loadAccounts();
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Error deleting account: ' + error.message);
        }
    }
};

window.upgradeAccount = function(accountId, firmName, accountSize, currentPhase) {
    resetModal();
    addAccountModal.style.display = 'block';
    
    document.querySelector('#add-account-modal h2').textContent = 'Upgrade to Next Phase';
    
    // Set firm name and apply template
    firmSelect.value = firmName;
    if (propFirmTemplates[firmName]) {
        applyTemplate(firmName);
    }
    
    // Set account size
    accountSizeSelect.value = accountSize.toString();
    
    // Set current balance to account size (starting fresh for new phase)
    document.getElementById('current-balance').value = accountSize;
    
    // Determine next phase
    let nextPhase;
    if (currentPhase === 'Challenge Phase 1') {
        nextPhase = 'Challenge Phase 2';
    } else if (currentPhase === 'Challenge Phase 2') {
        nextPhase = 'Funded';
    } else {
        nextPhase = 'Funded';
    }
    
    phaseSelect.value = nextPhase;
    phaseSelect.dispatchEvent(new Event('change'));
    
    // Apply template for the new phase
    if (propFirmTemplates[firmName]) {
        updateProfitTargetFromTemplate(propFirmTemplates[firmName]);
        calculateTargetAmount();
    }
    
    // Change button text and store upgrade info
    const submitBtn = document.querySelector('#add-account-form button[type="submit"]');
    submitBtn.textContent = 'Create Upgraded Account';
    submitBtn.dataset.upgradeFrom = accountId;
};