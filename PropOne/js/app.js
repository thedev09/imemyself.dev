// Enhanced app.js - Add daily P&L tracking to main dashboard
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
import tradeManager from './trade-manager.js';
import dailyTracker from './daily-tracker.js';
import activityLogger from './activity-logger.js';
import payoutManager from './payout-manager.js';

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

// Trade modal elements
const tradeModal = document.getElementById('trade-modal');
const tradeForm = document.getElementById('trade-form');

let currentUser = null;
let editingAccountId = null;
let currentFilter = 'active';
let allAccounts = [];

// Prop firm templates
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
    'Alpha Capital': {
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
        platform: 'TradeLocker'
    },
    'ThinkCapital': {
        accountSizes: [25000, 50000, 100000, 200000],
        dailyDrawdown: 4,
        maxDrawdown: 8,
        phase1Target: 8,
        phase2Target: 5,
        platform: 'TradingView'
    },
    'BrightFunded': {
        accountSizes: [10000, 25000, 50000, 100000, 200000],
        dailyDrawdown: 5,
        maxDrawdown: 10,
        phase1Target: 8,
        phase2Target: 5,
        platform: 'cTrader'
    },
    'PipFarm': {
        accountSizes: [10000, 25000, 50000, 100000, 200000],
        dailyDrawdown: 3,
        maxDrawdown: 10,
        phase1Target: 9,
        phase2Target: 6,
        platform: 'cTrader'
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
    
    // Add Activity History to profile dropdown immediately
    addActivityHistoryToDropdown();
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

document.addEventListener('click', (e) => {
    if (profileBtn && profileDropdown && !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('show');
    }
});

if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        profileDropdown.classList.remove('show');
        window.location.href = 'pages/settings.html';
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

// Trade modal functions
function showTradeModal(accountId, currentBalance, firmName) {
    if (!tradeModal) return;
    
    // Reset form
    if (tradeForm) tradeForm.reset();
    
    // Set account info in modal
    const modalTitle = document.querySelector('#trade-modal h2');
    const currentBalanceDisplay = document.getElementById('current-balance-display');
    
    if (modalTitle) modalTitle.textContent = `Add Trade - ${firmName}`;
    if (currentBalanceDisplay) currentBalanceDisplay.textContent = `Current: $${currentBalance.toLocaleString()}`;
    
    // Store account data in form
    const accountIdInput = document.getElementById('trade-account-id');
    const oldBalanceInput = document.getElementById('trade-old-balance');
    
    if (accountIdInput) accountIdInput.value = accountId;
    if (oldBalanceInput) oldBalanceInput.value = currentBalance;
    
    tradeModal.style.display = 'block';
}

function hideTradeModal() {
    if (tradeModal) tradeModal.style.display = 'none';
    if (tradeForm) tradeForm.reset();
}

// Trade form submission handler
if (tradeForm) {
    tradeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('You must be logged in');
            return;
        }
        
        try {
            const accountId = document.getElementById('trade-account-id').value;
            const oldBalance = parseFloat(document.getElementById('trade-old-balance').value);
            const newBalance = parseFloat(document.getElementById('trade-new-balance').value);
            const instrument = document.getElementById('trade-instrument').value.trim();
            const tradeType = document.getElementById('trade-type').value;
            const notes = document.getElementById('trade-notes').value.trim();
            
            if (!newBalance || newBalance < 0) {
                alert('Please enter a valid new balance');
                return;
            }
            
            // Get account data for daily tracking
            const accountDoc = await getDoc(doc(db, 'accounts', accountId));
            if (accountDoc.exists()) {
                const accountData = accountDoc.data();
                
                // Update daily snapshot for trade
                await dailyTracker.updateSnapshotForTrade(
                    accountId,
                    newBalance,
                    accountData.accountSize,
                    accountData.dailyDrawdown
                );
            }
            
            const tradeData = {
                accountId,
                oldBalance,
                newBalance,
                timestamp: new Date(),
                instrument: instrument || null,
                tradeType: tradeType || null,
                notes: notes || null
            };
            
            const result = await tradeManager.addTrade(tradeData);
            
            if (result.success) {
                await activityLogger.logTradeAdded(currentUser.uid, tradeData);
                console.log('Trade added successfully!');
                hideTradeModal();
                loadAccounts(); // Refresh the account display with new daily P&L
            } else {
                alert('Error adding trade: ' + result.error);
            }
            
        } catch (error) {
            console.error('Error adding trade:', error);
            alert('Error adding trade: ' + error.message);
        }
    });
}



// Trade modal close handlers
const tradeModalClose = document.querySelector('#trade-modal .close');
const tradeCancelBtn = document.getElementById('trade-cancel-btn');

if (tradeModalClose) tradeModalClose.addEventListener('click', hideTradeModal);
if (tradeCancelBtn) tradeCancelBtn.addEventListener('click', hideTradeModal);

// Make functions global for onclick handlers
window.showTradeModal = showTradeModal;
window.hideTradeModal = hideTradeModal;

// Account modal functions
if (addAccountBtn) {
    addAccountBtn.addEventListener('click', () => {
        resetModal();
        addAccountModal.style.display = 'block';
    });
}

function addActivityHistoryToDropdown() {
    const profileDropdown = document.getElementById('profile-dropdown');
    if (!profileDropdown) return;
    
    // Check if activity link already exists
    if (profileDropdown.querySelector('.activity-link')) return;
    
    // Find settings button to insert activity link before it
    const settingsBtn = profileDropdown.querySelector('#settings-btn');
    if (settingsBtn) {
        const activityLink = document.createElement('button');
        activityLink.className = 'dropdown-item activity-link';
        activityLink.innerHTML = `
            <svg class="item-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13,9H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            </svg>
            Activity History
        `;
        activityLink.onclick = () => {
            profileDropdown.classList.remove('show');
            window.location.href = 'pages/activity.html';
        };
        
        // Insert before settings button
        settingsBtn.parentNode.insertBefore(activityLink, settingsBtn);
    }
}

function resetModal() {
    editingAccountId = null;
    if (addAccountForm) addAccountForm.reset();
    if (customFirmGroup) customFirmGroup.style.display = 'none';
    if (customSizeGroup) customSizeGroup.style.display = 'none';
    if (profitShareGroup) profitShareGroup.style.display = 'none';
    if (profitTargetGroup) profitTargetGroup.style.display = 'block';
    
    if (accountSizeSelect) accountSizeSelect.value = '100000';
    const currentBalanceInput = document.getElementById('current-balance');
    if (currentBalanceInput) currentBalanceInput.value = '100000';
    
    const profitShareInput = document.getElementById('profit-share');
    if (profitShareInput) profitShareInput.value = '80';
    
    if (firmSelect) {
        firmSelect.innerHTML = `
            <option value="">Select Prop Firm</option>
            <option value="FundingPips">FundingPips</option>
            <option value="The5%ers">The5%ers</option>
            <option value="Alpha Capital">Alpha Capital</option>
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
    
    const targetSize = template.accountSizes.includes(100000) ? '100000' : template.accountSizes[0].toString();
    if (accountSizeSelect) accountSizeSelect.value = targetSize;
    
    const currentBalanceInput = document.getElementById('current-balance');
    if (currentBalanceInput) currentBalanceInput.value = targetSize;
    
    const dailyDrawdown = document.getElementById('daily-drawdown');
    const maxDrawdown = document.getElementById('max-drawdown');
    const platform = document.getElementById('platform');
    
    if (dailyDrawdown) dailyDrawdown.value = template.dailyDrawdown;
    if (maxDrawdown) maxDrawdown.value = template.maxDrawdown;
    if (platform) platform.value = template.platform;
    
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
            const currentBalanceInput = document.getElementById('current-balance');
            if (currentBalanceInput) currentBalanceInput.value = e.target.value;
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
            const alias = document.getElementById('alias').value.trim();
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
                alias,
                accountSize,
                currentBalance,
                phase,
                profitTargetPercent: profitTargetPercentValue,
                profitTargetAmount,
                profitShare,
                maxDrawdown,
                dailyDrawdown,
                platform,
                status: 'active',
                upgradedFrom: null,
                upgradedTo: null,
                createdAt: editingAccountId ? undefined : new Date(),
                updatedAt: new Date()
            };
            
            if (editingAccountId) {
                delete accountData.createdAt;
                await updateDoc(doc(db, 'accounts', editingAccountId), accountData);
                console.log('Account updated successfully!');
            } else {
                const docRef = await addDoc(collection(db, 'accounts'), accountData);
                console.log('Account added successfully!');

                // Check if this is an upgrade
                const submitBtn = document.querySelector('#add-account-form button[type="submit"]');
                const upgradeFromId = submitBtn?.dataset.upgradeFrom;
                
                if (upgradeFromId) {
                    // This is an upgrade - get old account data for logging
                    try {
                        const oldAccountDoc = await getDoc(doc(db, 'accounts', upgradeFromId));
                        if (oldAccountDoc.exists()) {
                            const oldAccountData = oldAccountDoc.data();
                            
                            // Log the upgrade activity
                            await activityLogger.logAccountUpgraded(
                                currentUser.uid,
                                upgradeFromId,
                                docRef.id,
                                oldAccountData.phase,
                                phase,
                                firmName,
                                alias
                            );
                            console.log('Upgrade activity logged successfully');
                        }
                    } catch (error) {
                        console.error('Error logging upgrade activity:', error);
                    }
                    
                    // Mark old account as upgraded
                    await updateDoc(doc(db, 'accounts', upgradeFromId), {
                        status: 'upgraded',
                        upgradedTo: docRef.id,
                        updatedAt: new Date()
                    });
                    
                    // Link new account to old account
                    await updateDoc(doc(db, 'accounts', docRef.id), {
                        upgradedFrom: upgradeFromId
                    });
                    
                    console.log('Old account marked as upgraded');
                } else {
                    // Regular account creation
                    await activityLogger.logAccountCreated(currentUser.uid, {
                        ...accountData,
                        accountId: docRef.id
                    });
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
        allAccounts = querySnapshot.docs;
        
        // Load daily P&L data for all accounts
        await loadDailyPnLForAllAccounts();
        
        allAccounts.sort((a, b) => {
            const accountA = a.data();
            const accountB = b.data();
            
            const getPhaseOrder = (phase) => {
                if (phase === 'Funded') return 0;
                if (phase === 'Challenge Phase 2') return 1;
                if (phase === 'Challenge Phase 1') return 2;
                return 3;
            };
            
            const phaseOrderA = getPhaseOrder(accountA.phase);
            const phaseOrderB = getPhaseOrder(accountB.phase);
            
            if (phaseOrderA !== phaseOrderB) {
                return phaseOrderA - phaseOrderB;
            }
            
            return accountB.currentBalance - accountA.currentBalance;
        });
        
        generateSummaryStats(allAccounts);
        displayAccounts(getFilteredAccounts());
        setupFilters();
        
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

// New function to load daily P&L data for all accounts
async function loadDailyPnLForAllAccounts() {
    console.log('Loading daily P&L for all accounts...');
    
    const dailyPnLPromises = allAccounts.map(async (doc) => {
        const accountId = doc.id;
        const account = doc.data();
        
        try {
            // Only check/create snapshot once per session per account
            const sessionKey = `snapshot_checked_${accountId}_${dailyTracker.getCurrentISTDateString()}`;
            if (!sessionStorage.getItem(sessionKey)) {
                // Check and update daily snapshots (only once per session)
                await dailyTracker.checkAndUpdateDailySnapshots(
                    accountId,
                    account.currentBalance,
                    account.accountSize,
                    account.dailyDrawdown
                );
                sessionStorage.setItem(sessionKey, 'true');
            }
            
            // Calculate daily P&L
            const dailyPnL = await dailyTracker.calculateDailyPnL(accountId, account.currentBalance);
            
            // Get current daily DD level
            const currentDailyDDLevel = await dailyTracker.getCurrentDailyDDLevel(
                accountId,
                account.currentBalance,
                account.accountSize,
                account.dailyDrawdown
            );
            
            // Store in account data for display
            account._dailyPnL = dailyPnL;
            account._currentDailyDDLevel = currentDailyDDLevel;
            
            console.log(`Account ${accountId}: Daily P&L = ${dailyPnL}`);
            
        } catch (error) {
            console.error(`Error loading daily P&L for account ${accountId}:`, error);
            account._dailyPnL = 0; // Fallback
            account._currentDailyDDLevel = account.currentBalance - (account.accountSize * (account.dailyDrawdown / 100));
        }
    });
    
    await Promise.all(dailyPnLPromises);
    console.log('Finished loading daily P&L for all accounts');
}

const dropdownFixCSS = `
.profile-dropdown {
    background: rgba(26, 26, 46, 0.95) !important;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff !important;
}

.dropdown-item {
    color: #ccc !important;
    background: transparent !important;
}

.dropdown-item:hover {
    background: rgba(255, 255, 255, 0.05) !important;
    color: #fff !important;
}

.profile-email {
    color: #888 !important;
}
`;

// Inject dropdown fix CSS
if (!document.getElementById('dropdown-fix-css')) {
    const style = document.createElement('style');
    style.id = 'dropdown-fix-css';
    style.textContent = dropdownFixCSS;
    document.head.appendChild(style);
}

// Calculate actual daily P&L for an account
async function calculateDailyPnL(accountId, account) {
    try {
        // Load daily snapshots for this account
        const result = await dailyTracker.loadSnapshotsForAccount(accountId);
        
        if (!result.success) {
            return 0;
        }
        
        const today = dailyTracker.getCurrentISTDateString();
        const snapshots = result.snapshots || [];
        
        // Find today's snapshot
        const todaySnapshot = snapshots.find(snapshot => snapshot.date === today);
        
        if (todaySnapshot) {
            // Daily P&L = current balance - starting balance for today
            return account.currentBalance - todaySnapshot.startingBalance;
        } else {
            // If no snapshot for today, create one and daily P&L is 0
            await dailyTracker.createDailySnapshot(
                accountId,
                account.currentBalance,
                account.accountSize,
                account.dailyDrawdown
            );
            return 0;
        }
        
    } catch (error) {
        console.error('Error calculating daily P&L:', error);
        return 0;
    }
}

// Replace your generateSummaryStats function with this original version

function generateSummaryStats(accounts) {
    const summaryContainer = document.getElementById('summary-stats');
    if (!summaryContainer) return;
    
    const stats = {
        funded: { count: 0, totalFunding: 0, totalYourShare: 0, totalEstPayout: 0 },
        challenge: { 
            phase1Active: 0, 
            phase1Capital: 0, 
            phase2Active: 0, 
            phase2Capital: 0 
        },
        inactive: { 
            phase1Breached: 0, 
            phase2Breached: 0, 
            fundedBreached: 0, 
            totalPassed: 0 
        }
    };
    
    accounts.forEach(doc => {
        const account = doc.data();
        const currentPnL = account.currentBalance - account.accountSize;
        const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
        const isBreached = currentPnL < -maxDrawdownAmount;
        
        if (account.status === 'active' && !isBreached) {
            if (account.phase === 'Funded') {
                stats.funded.count++;
                stats.funded.totalFunding += account.accountSize;
                if (currentPnL > 0) {
                    const yourShare = currentPnL * (account.profitShare || 80) / 100;
                    stats.funded.totalYourShare += yourShare;
                }
                
                // Calculate estimated payout: available drawdown + current profit
                const availableDrawdown = maxDrawdownAmount - Math.abs(Math.min(0, currentPnL));
                const currentProfit = Math.max(0, currentPnL);
                const estimatedPayout = availableDrawdown + currentProfit;
                stats.funded.totalEstPayout += estimatedPayout;
                
            } else if (account.phase === 'Challenge Phase 1') {
                stats.challenge.phase1Active++;
                stats.challenge.phase1Capital += account.accountSize;
            } else if (account.phase === 'Challenge Phase 2') {
                stats.challenge.phase2Active++;
                stats.challenge.phase2Capital += account.accountSize;
            }
        } else if (account.status === 'breached' || (account.status === 'active' && isBreached)) {
            if (account.phase === 'Challenge Phase 1') {
                stats.inactive.phase1Breached++;
            } else if (account.phase === 'Challenge Phase 2') {
                stats.inactive.phase2Breached++;
            } else if (account.phase === 'Funded') {
                stats.inactive.fundedBreached++;
            }
        } else if (account.status === 'upgraded') {
            stats.inactive.totalPassed++;
        }
    });
    
    // Add currently funded accounts to passed count
    stats.inactive.totalPassed += stats.funded.count;
    
    const summaryHTML = `
        <div class="summary-card funded">
            <h3>Funded Accounts</h3>
            <div class="summary-stats">
                <div class="summary-stat">
                    <div class="summary-stat-label">Accounts</div>
                    <div class="summary-stat-value">${stats.funded.count}</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">Total Funding</div>
                    <div class="summary-stat-value">${stats.funded.totalFunding.toLocaleString()}</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">Your Share</div>
                    <div class="summary-stat-value ${stats.funded.totalYourShare >= 0 ? 'positive' : 'negative'}">${stats.funded.totalYourShare.toLocaleString()}</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">Est. Payout</div>
                    <div class="summary-stat-value positive">${stats.funded.totalEstPayout.toLocaleString()}</div>
                </div>
            </div>
        </div>
        
        <div class="summary-card challenge">
            <h3>Challenge Accounts</h3>
            <div class="summary-stats">
                <div class="summary-stat">
                    <div class="summary-stat-label">Phase 1</div>
                    <div class="summary-stat-value">${stats.challenge.phase1Active} accounts</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">P1 Capital</div>
                    <div class="summary-stat-value">${stats.challenge.phase1Capital.toLocaleString()}</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">Phase 2</div>
                    <div class="summary-stat-value">${stats.challenge.phase2Active} accounts</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">P2 Capital</div>
                    <div class="summary-stat-value">${stats.challenge.phase2Capital.toLocaleString()}</div>
                </div>
            </div>
        </div>
        
        <div class="summary-card inactive">
            <h3>Inactive Stats</h3>
            <div class="summary-stats">
                <div class="summary-stat">
                    <div class="summary-stat-label">P1 Breached</div>
                    <div class="summary-stat-value">${stats.inactive.phase1Breached}</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">P2 Breached</div>
                    <div class="summary-stat-value">${stats.inactive.phase2Breached}</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">Funded Breached</div>
                    <div class="summary-stat-value">${stats.inactive.fundedBreached}</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">Total Passed</div>
                    <div class="summary-stat-value positive">${stats.inactive.totalPassed}</div>
                </div>
            </div>
        </div>
    `;
    
    summaryContainer.innerHTML = summaryHTML;
}

// FIXED progress bar calculation
function calculateEnhancedProgress(account) {
    const currentPnL = account.currentBalance - account.accountSize;
    const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
    
    // Define the range - FIXED to make center line the neutral point
    const leftLimit = -maxDrawdownAmount; // e.g., -10k for 10% max DD
    let rightLimit;
    
    if (account.phase === 'Funded') {
        rightLimit = account.accountSize * 0.2; // 20% for funded accounts
    } else {
        rightLimit = account.profitTargetAmount || (account.accountSize * 0.1);
    }
    
    // FIXED: Make the total range symmetrical around the starting balance (0 P&L)
    // Use the larger of leftLimit or rightLimit to create equal ranges
    const maxRange = Math.max(Math.abs(leftLimit), Math.abs(rightLimit));
    const symmetricalLeft = -maxRange;
    const symmetricalRight = maxRange;
    const totalRange = symmetricalRight - symmetricalLeft;
    
    // Calculate position - now the center (50%) represents starting balance
    const distanceFromLeft = currentPnL - symmetricalLeft;
    const progressPercent = Math.max(0, Math.min(100, (distanceFromLeft / totalRange) * 100));
    
    // For account at starting balance:
    // currentPnL = 0
    // distanceFromLeft = 0 - (-maxRange) = maxRange
    // progressPercent = maxRange / (2 * maxRange) * 100 = 50% ✅ (CENTER!)
    
    // Determine color based on position
    let progressColor;
    if (currentPnL < 0) {
        progressColor = 'loss';
    } else if (account.phase === 'Funded') {
        progressColor = 'profit';
    } else {
        progressColor = 'target';
    }
    
    // Generate progress text
    let progressText;
    if (account.phase === 'Funded') {
        if (currentPnL >= 0) {
            progressText = currentPnL === 0 ? '+$0 profit' : `+$${currentPnL.toLocaleString()} profit`;
        } else {
            progressText = `$${Math.abs(currentPnL).toLocaleString()} drawdown`;
        }
    } else {
        const targetRemaining = Math.max(0, account.profitTargetAmount - currentPnL);
        if (currentPnL >= account.profitTargetAmount) {
            progressText = 'Target Reached!';
        } else if (currentPnL < 0) {
            progressText = `$${Math.abs(currentPnL).toLocaleString()} drawdown`;
        } else {
            progressText = `$${targetRemaining.toLocaleString()} to target`;
        }
    }
    
    return {
        progressPercent,
        progressColor,
        progressText,
        leftLimit: symmetricalLeft,  // Use symmetrical range for display
        rightLimit: symmetricalRight,
        centerPoint: 0
    };
}

// Enhanced progress bar HTML with simplified scale (percentages only)
function generateProgressBarHTML(account) {
    const progress = calculateEnhancedProgress(account);
    
    // Calculate percentage labels
    const leftPercent = `-${account.maxDrawdown}%`;
    const rightPercent = account.phase === 'Funded' ? '+20%' : `+${account.profitTargetPercent || 10}%`;
    
    return `
        <div class="progress-container">
            <div class="progress-label">
                <span>${account.phase === 'Funded' ? 'Account Health' : 'Progress to Target'}</span>
                <span>${progress.progressText}</span>
            </div>
            <div class="progress-scale">
                <span class="scale-left">${leftPercent}</span>
                <span class="scale-right">${rightPercent}</span>
            </div>
            <div class="progress-bar enhanced">
                <div class="progress-fill ${progress.progressColor}" style="width: ${Math.max(2, progress.progressPercent)}%;"></div>
                <div class="center-line"></div>
            </div>
        </div>
    `;
}

// Helper function to generate tooltip data
function generateTooltipData(account, dailyPnL) {
    const totalPnL = account.currentBalance - account.accountSize;
    const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
    const availableDrawdown = maxDrawdownAmount + totalPnL;
    
    if (account.phase === 'Funded') {
        return `Balance: ${account.currentBalance.toLocaleString()} | Daily: ${dailyPnL >= 0 ? '+' : ''}${dailyPnL.toLocaleString()} | Total: ${totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()} | Available DD: ${availableDrawdown.toLocaleString()}`;
    } else {
        const targetRemaining = Math.max(0, account.profitTargetAmount - totalPnL);
        return `Balance: ${account.currentBalance.toLocaleString()} | Daily: ${dailyPnL >= 0 ? '+' : ''}${dailyPnL.toLocaleString()} | Target: ${targetRemaining.toLocaleString()} | Available DD: ${availableDrawdown.toLocaleString()}`;
    }
}

function setupFilters() {
    const filterContainer = document.querySelector('.filter-pills');
    if (!filterContainer) return;
    
    filterContainer.innerHTML = `
        <button class="filter-pill active" data-filter="active">Active</button>
        <button class="filter-pill" data-filter="funded">Funded</button>
        <button class="filter-pill" data-filter="phase2">Phase 2</button>
        <button class="filter-pill" data-filter="phase1">Phase 1</button>
        <button class="filter-pill" data-filter="breached">Breached</button>
        <button class="filter-pill" data-filter="upgraded">Upgraded</button>
        <button class="filter-pill" data-filter="all">All</button>
    `;
    
    const filterPills = document.querySelectorAll('.filter-pill');
    
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.dataset.filter;
            displayAccounts(getFilteredAccounts());
        });
    });
}

function getFilteredAccounts() {
    return allAccounts.filter(doc => {
        const account = doc.data();
        const currentPnL = account.currentBalance - account.accountSize;
        const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
        const isBreached = currentPnL < -maxDrawdownAmount;
        
        switch (currentFilter) {
            case 'active':
                return account.status === 'active' && !isBreached;
            case 'funded':
                return account.phase === 'Funded' && account.status === 'active' && !isBreached;
            case 'phase1':
                return account.phase === 'Challenge Phase 1' && account.status === 'active' && !isBreached;
            case 'phase2':
                return account.phase === 'Challenge Phase 2' && account.status === 'active' && !isBreached;
            case 'breached':
                return account.status === 'breached' || (account.status === 'active' && isBreached);
            case 'upgraded':
                return account.status === 'upgraded';
            case 'all':
                return true;
            default:
                return account.status === 'active' && !isBreached;
        }
    });
}

// Enhanced displayAccounts function with new 4-stat layout
function displayAccounts(accounts) {
    if (!accountsList) return;
    
    if (accounts.length === 0) {
        let emptyMessage = 'No accounts found.';
        if (currentFilter === 'active') {
            emptyMessage = 'No active accounts yet. Add your first prop firm account to get started!';
        } else if (currentFilter === 'breached') {
            emptyMessage = 'No breached accounts - great job maintaining your rules!';
        } else if (currentFilter === 'upgraded') {
            emptyMessage = 'No upgraded accounts yet.';
        }
        
        accountsList.innerHTML = `
            <div class="empty-state">
                <h3>No accounts found</h3>
                <p>${emptyMessage}</p>
            </div>
        `;
        return;
    }
    
    accountsList.innerHTML = `<div class="accounts-grid">${accounts.map(doc => {
        const account = doc.data();
        const accountId = doc.id;
        
        const totalPnL = account.currentBalance - account.accountSize;
        const dailyPnL = account._dailyPnL || 0;
        const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
        
        const isMaxDrawdownBreached = totalPnL < -maxDrawdownAmount;
        const isBreached = isMaxDrawdownBreached;
        
        const firmInitials = account.firmName.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
        
        // Calculate stats based on account phase
        let stat1Label, stat1Value, stat2Label, stat2Value, stat3Label, stat3Value, stat4Label, stat4Value;
        let upgradeButtonHtml = '';
        let statusBadgeHtml = '';
        
        let displayPhase = account.phase;
        if (account.phase === 'Challenge Phase 1') displayPhase = 'Phase 1';
        else if (account.phase === 'Challenge Phase 2') displayPhase = 'Phase 2';
        else if (account.phase === 'Challenge Phase 3') displayPhase = 'Phase 3';
        
        if (account.status === 'upgraded') {
            const nextPhase = account.phase === 'Challenge Phase 1' ? 'Phase 2' : 'Funded';
            statusBadgeHtml = `<div class="status-badge upgraded">Upgraded to ${nextPhase}</div>`;
        }
        
        // New 4-stat layout: Balance, Daily P&L, Total P&L, Your Share/Target Remaining
        stat1Label = 'Balance';
        stat1Value = `${account.currentBalance.toLocaleString()}`;
        
        stat2Label = 'Daily P&L';
        stat2Value = `${dailyPnL >= 0 ? '+' : ''}${dailyPnL.toLocaleString()}`;
        
        stat3Label = 'Total P&L';
        stat3Value = `${totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}`;
        
        if (account.phase === 'Funded') {
            stat4Label = 'Your Share';
            if (totalPnL > 0) {
                const yourShare = totalPnL * (account.profitShare || 80) / 100;
                stat4Value = `${yourShare.toLocaleString()}`;
            } else {
                stat4Value = '$0';
            }
        } else {
            stat4Label = 'Target Remaining';
            const remainingTarget = Math.max(0, account.profitTargetAmount - totalPnL);
            stat4Value = `${remainingTarget.toLocaleString()}`;
            
            if (account.profitTargetAmount > 0 && totalPnL >= account.profitTargetAmount && !isBreached && account.status === 'active') {
                upgradeButtonHtml = `<button class="action-btn upgrade-btn" onclick="upgradeAccount('${accountId}', '${account.firmName}', ${account.accountSize}, '${account.phase}')">Upgrade</button>`;
            }
        }
        
        let cardClass = 'account-card';
        if (account.status === 'breached' || isBreached) {
            cardClass += ' breached';
        } else if (account.status === 'upgraded') {
            cardClass += ' upgraded';
        }
        
        const phaseClass = (account.status === 'breached' || isBreached) ? 'phase-badge breached' : 
                         account.status === 'upgraded' ? 'phase-badge upgraded' :
                         account.phase === 'Funded' ? 'phase-badge funded' : 'phase-badge';
        
        // Generate enhanced progress bar (using total P&L for progress)
        const progressBarHtml = generateProgressBarHTML(account);
        
        // Get bottom row HTML
        const bottomRowHtml = getBottomRowHtml(account, accountId, isBreached, upgradeButtonHtml);
        
        // Add tooltip data for progress bar
        const tooltipData = generateTooltipData(account, dailyPnL);
        
        return `
            <div class="${cardClass}" onclick="openAccountDashboard('${accountId}')" style="cursor: pointer;">
                <div class="firm-header">
                    <div class="firm-info-container">
                        <div class="firm-logo">${firmInitials}</div>
                        <div class="firm-info">
                            <h3>${account.alias ? `${account.alias}-${account.firmName}` : account.firmName}</h3>
                            <p>${account.accountSize.toLocaleString()} • ${account.platform}</p>
                        </div>
                    </div>
                    <div class="${phaseClass}">${displayPhase}</div>
                </div>
                
                ${statusBadgeHtml}
                
                <div class="account-stats">
                    <div class="stat-item">
                        <div class="stat-label">${stat1Label}</div>
                        <div class="stat-value">${stat1Value}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">${stat2Label}</div>
                        <div class="stat-value ${dailyPnL >= 0 ? 'positive' : 'negative'}">${stat2Value}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">${stat3Label}</div>
                        <div class="stat-value ${totalPnL >= 0 ? 'positive' : 'negative'}">${stat3Value}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">${stat4Label}</div>
                        <div class="stat-value ${account.phase === 'Funded' && totalPnL > 0 ? 'positive' : ''}">${stat4Value}</div>
                    </div>
                </div>
                
                <div data-tooltip="${tooltipData}">
                    ${progressBarHtml}
                </div>
                
                ${bottomRowHtml}
            </div>
        `;
    }).join('')}</div>`;
}


// Add this function to handle account card clicks
window.openAccountDashboard = function(accountId) {
    window.location.href = `pages/account-dashboard.html?id=${accountId}`;
}

// Update the getBottomRowHtml function to prevent event bubbling
function getBottomRowHtml(account, accountId, isBreached, upgradeButtonHtml) {
    if (account.status === 'breached' || isBreached) {
        return `
            <div class="bottom-row" onclick="event.stopPropagation()">
                <div class="breach-warning">⚠️ BREACHED</div>
                <div class="account-actions">
                    <button class="action-btn edit-btn" onclick="editAccount('${accountId}')">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteAccount('${accountId}')">Delete</button>
                </div>
            </div>
        `;
    } else if (account.status === 'upgraded') {
        return `
            <div class="account-actions" onclick="event.stopPropagation()">
                <button class="action-btn delete-btn" onclick="deleteAccount('${accountId}')">Delete</button>
            </div>
        `;
    } else {
        let payoutButtonHtml = '';
        
        // Add payout button for funded accounts with profit
        if (account.phase === 'Funded') {
            const totalPnL = account.currentBalance - account.accountSize;
            if (totalPnL > 0) {
                payoutButtonHtml = `<button class="action-btn payout-btn" onclick="requestPayout('${accountId}')">Payout</button>`;
            }
        }
        
        return `
            <div class="account-actions" onclick="event.stopPropagation()">
                ${upgradeButtonHtml}
                ${payoutButtonHtml}
                <button class="action-btn trade-btn" onclick="showTradeModal('${accountId}', ${account.currentBalance}, '${account.firmName}')">Trade</button>
                <button class="action-btn edit-btn" onclick="editAccount('${accountId}')">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteAccount('${accountId}')">Delete</button>
            </div>
        `;
    }
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
        
        if (account.status === 'upgraded') {
            alert('Cannot edit upgraded accounts. This account has been superseded by a newer version.');
            return;
        }
        
        editingAccountId = accountId;
        
        addAccountModal.style.display = 'block';
        document.querySelector('#add-account-modal h2').textContent = 'Edit Account';
        document.querySelector('#add-account-form button[type="submit"]').textContent = 'Update Account';
        
        const firmNameCleaned = account.firmName;
        
        firmSelect.innerHTML = `<option value="${firmNameCleaned}" selected>${firmNameCleaned}</option>`;
        firmSelect.disabled = true;
        
        if ([5000, 10000, 25000, 50000, 100000, 200000].includes(account.accountSize)) {
            accountSizeSelect.value = account.accountSize.toString();
        } else {
            accountSizeSelect.value = 'custom';
            customSizeGroup.style.display = 'block';
            customSizeInput.value = account.accountSize;
            customSizeInput.setAttribute('required', 'required');
        }
        
        document.getElementById('current-balance').value = account.currentBalance;
        document.getElementById('alias').value = account.alias || '';
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
    const deleteModal = document.createElement('div');
    deleteModal.className = 'modal';
    deleteModal.innerHTML = `
        <div class="modal-content compact delete-modal">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Delete Account</h2>
            <p>What would you like to do with this account?</p>
            <div class="delete-options">
                <button class="btn btn-warning" id="mark-breached-btn">Mark as Breached</button>
                <button class="btn btn-danger" id="delete-permanent-btn">Delete Permanently</button>
            </div>
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="margin-top: 20px; width: 100%;">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(deleteModal);
    deleteModal.style.display = 'block';
    
    deleteModal.querySelector('#mark-breached-btn').addEventListener('click', async () => {
        try {
            await updateDoc(doc(db, 'accounts', accountId), {
                status: 'breached',
                updatedAt: new Date()
            });
            console.log('Account marked as breached!');
            loadAccounts();
            deleteModal.remove();
        } catch (error) {
            console.error('Error marking account as breached:', error);
            alert('Error marking account as breached: ' + error.message);
        }
    });
    
    deleteModal.querySelector('#delete-permanent-btn').addEventListener('click', async () => {
        if (confirm('Are you absolutely sure? This will permanently delete the account and cannot be undone.')) {
            try {
                await deleteDoc(doc(db, 'accounts', accountId));
                console.log('Account deleted permanently!');
                loadAccounts();
                deleteModal.remove();
            } catch (error) {
                console.error('Error deleting account:', error);
                alert('Error deleting account: ' + error.message);
            }
        }
    });
};

window.upgradeAccount = async function(accountId, firmName, accountSize, currentPhase) {
    resetModal();
    addAccountModal.style.display = 'block';
    
    document.querySelector('#add-account-modal h2').textContent = 'Upgrade to Next Phase';
    
    firmSelect.value = firmName;
    if (propFirmTemplates[firmName]) {
        applyTemplate(firmName);
    }
    
    accountSizeSelect.value = accountSize.toString();
    document.getElementById('current-balance').value = accountSize;
    
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
    
    if (propFirmTemplates[firmName]) {
        updateProfitTargetFromTemplate(propFirmTemplates[firmName]);
        calculateTargetAmount();
    }
    
    const submitBtn = document.querySelector('#add-account-form button[type="submit"]');
    submitBtn.textContent = 'Create Upgraded Account';
    submitBtn.dataset.upgradeFrom = accountId;
};

// Add this to your app.js - Updated requestPayout function

window.requestPayout = async function(accountId) {
    try {
        const accountDoc = await getDoc(doc(db, 'accounts', accountId));
        if (!accountDoc.exists()) {
            alert('Account not found');
            return;
        }
        
        const account = accountDoc.data();
        
        if (account.phase !== 'Funded') {
            alert('Only funded accounts can request payouts');
            return;
        }
        
        // Make currentUser available globally for payout manager
        window.currentUser = currentUser;
        window.auth = auth;
        
        // Show payout modal
        payoutManager.showPayoutModal(accountId, account);
        
    } catch (error) {
        console.error('Error requesting payout:', error);
        alert('Error: ' + error.message);
    }
};

// STEP 7: Add this CSS at the bottom of your app.js (before the console.log):
const payoutButtonCSS = `
.payout-btn {
    background: linear-gradient(45deg, #f39c12 0%, #e74c3c 100%);
    color: white;
    border: 1px solid transparent;
}

.payout-btn:hover {
    background: linear-gradient(45deg, #d68910 0%, #c0392b 100%);
    transform: translateY(-1px);
}
`;

// Inject payout button CSS
if (!document.getElementById('payout-btn-css')) {
    const style = document.createElement('style');
    style.id = 'payout-btn-css';
    style.textContent = payoutButtonCSS;
    document.head.appendChild(style);
}


console.log('Enhanced app with daily P&L tracking initialized');