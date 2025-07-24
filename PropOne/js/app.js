// COMPLETE PRODUCTION-READY App.js - Final Optimized Version
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
import compactView from './compact-view.js';
import cascadingHedging from './sequential-hedging.js';

// DOM elements - OPTIMIZED: Cache all DOM queries once
const DOM = {
    authSection: document.getElementById('auth-section'),
    appSection: document.getElementById('app-section'),
    logoutBtn: document.getElementById('logout-btn'),
    userEmail: document.getElementById('user-email'),
    accountsList: document.getElementById('accounts-list'),
    addAccountBtn: document.getElementById('add-account-btn'),
    addAccountModal: document.getElementById('add-account-modal'),
    closeModal: document.querySelector('.close'),
    cancelBtn: document.getElementById('cancel-btn'),
    addAccountForm: document.getElementById('add-account-form'),
    profileBtn: document.getElementById('profile-btn'),
    profileDropdown: document.getElementById('profile-dropdown'),
    settingsBtn: document.getElementById('settings-btn'),
    helpBtn: document.getElementById('help-btn'),
    firmSelect: document.getElementById('firm-name'),
    customFirmGroup: document.getElementById('custom-firm-group'),
    customFirmInput: document.getElementById('custom-firm-name'),
    accountSizeSelect: document.getElementById('account-size-select'),
    customSizeGroup: document.getElementById('custom-size-group'),
    customSizeInput: document.getElementById('custom-account-size'),
    profitTargetPercent: document.getElementById('profit-target-percent'),
    phaseSelect: document.getElementById('phase'),
    profitTargetGroup: document.getElementById('profit-target-group'),
    profitShareGroup: document.getElementById('profit-share-group'),
    tradeModal: document.getElementById('trade-modal'),
    tradeForm: document.getElementById('trade-form')
};

// State management
let currentUser = null;
let editingAccountId = null;
let currentFilter = 'active';
let allAccounts = [];
let loadAccountsTimeout = null;

// Prop firm templates - OPTIMIZED: Moved to readonly constant
const PROP_FIRM_TEMPLATES = Object.freeze({
    'FundingPips': { accountSizes: [10000, 25000, 50000, 100000, 200000], dailyDrawdown: 5, maxDrawdown: 10, phase1Target: 8, phase2Target: 5, platform: 'MT5' },
    'The5%ers': { accountSizes: [100000], dailyDrawdown: 5, maxDrawdown: 10, phase1Target: 8, phase2Target: 5, platform: 'MT5' },
    'Alpha Capital': { accountSizes: [25000, 50000, 100000, 200000], dailyDrawdown: 5, maxDrawdown: 10, phase1Target: 10, phase2Target: 5, platform: 'MT5' },
    'FunderPro': { accountSizes: [10000, 25000, 50000, 100000, 200000], dailyDrawdown: 5, maxDrawdown: 10, phase1Target: 10, phase2Target: 8, platform: 'TradeLocker' },
    'ThinkCapital': { accountSizes: [25000, 50000, 100000, 200000], dailyDrawdown: 4, maxDrawdown: 8, phase1Target: 8, phase2Target: 5, platform: 'TradingView' },
    'BrightFunded': { accountSizes: [10000, 25000, 50000, 100000, 200000], dailyDrawdown: 5, maxDrawdown: 10, phase1Target: 8, phase2Target: 5, platform: 'cTrader' },
    'PipFarm': { accountSizes: [10000, 25000, 50000, 100000, 200000], dailyDrawdown: 3, maxDrawdown: 10, phase1Target: 9, phase2Target: 6, platform: 'cTrader' },
    'FundedNext': { accountSizes: [5000, 10000, 25000, 50000, 100000, 200000], dailyDrawdown: 5, maxDrawdown: 10, phase1Target: 8, phase2Target: 5, platform: 'MT5' },
    'Instant Funding': { accountSizes: [5000, 10000, 25000, 50000, 100000, 200000], dailyDrawdown: 5, maxDrawdown: 10, phase1Target: 10, phase2Target: 5, platform: 'MT5' }
});

// PRODUCTION OPTIMIZATION: Enhanced SmartCache with error handling
class SmartCache {
    static getCacheKey(accountId, date = null) {
        try {
            const currentISTDate = date || dailyTracker.getCurrentISTDateString();
            return `daily_pnl_${accountId}_${currentISTDate}`;
        } catch (error) {
            console.warn('Cache key generation failed:', error);
            return `daily_pnl_${accountId}_${new Date().toISOString().split('T')[0]}`;
        }
    }
    
    static getTradeTrackingKey(accountId, date = null) {
        try {
            const currentISTDate = date || dailyTracker.getCurrentISTDateString();
            return `trade_count_${accountId}_${currentISTDate}`;
        } catch (error) {
            console.warn('Trade tracking key generation failed:', error);
            return `trade_count_${accountId}_${new Date().toISOString().split('T')[0]}`;
        }
    }
    
    static getCachedData(accountId) {
        try {
            const cacheKey = this.getCacheKey(accountId);
            const cached = sessionStorage.getItem(cacheKey);
            
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (error) {
            console.warn('Cache retrieval failed:', error);
            this.invalidateCache(accountId);
        }
        return null;
    }
    
    static setCachedData(accountId, data) {
        try {
            const cacheKey = this.getCacheKey(accountId);
            const trackingKey = this.getTradeTrackingKey(accountId);
            const currentTradeCount = this.getCurrentTradeCount(accountId);
            
            const cacheData = {
                ...data,
                timestamp: Date.now(),
                tradeCount: currentTradeCount
            };
            
            sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
            sessionStorage.setItem(trackingKey, currentTradeCount.toString());
        } catch (error) {
            console.warn('Cache storage failed:', error);
        }
    }
    
    static getCurrentTradeCount(accountId) {
        try {
            const trackingKey = this.getTradeTrackingKey(accountId);
            const current = sessionStorage.getItem(trackingKey);
            return current ? parseInt(current) || 0 : 0;
        } catch (error) {
            console.warn('Trade count retrieval failed:', error);
            return 0;
        }
    }
    
    static incrementTradeCount(accountId) {
        try {
            const trackingKey = this.getTradeTrackingKey(accountId);
            const current = this.getCurrentTradeCount(accountId);
            sessionStorage.setItem(trackingKey, (current + 1).toString());
            this.invalidateCache(accountId);
        } catch (error) {
            console.warn('Trade count increment failed:', error);
        }
    }
    
    static invalidateCache(accountId) {
        try {
            const cacheKey = this.getCacheKey(accountId);
            sessionStorage.removeItem(cacheKey);
        } catch (error) {
            console.warn('Cache invalidation failed:', error);
        }
    }
    
    static invalidateAllCache() {
        try {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.startsWith('daily_pnl_') || key.startsWith('trade_count_')) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('Bulk cache invalidation failed:', error);
        }
    }
    
    static isCacheValid(accountId, cachedData) {
        if (!cachedData) return false;
        
        try {
            // Check cache age
            const cacheAge = Date.now() - cachedData.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (cacheAge > maxAge) {
                this.invalidateCache(accountId);
                return false;
            }
            
            // Check trade count
            const currentTradeCount = this.getCurrentTradeCount(accountId);
            if (cachedData.tradeCount !== currentTradeCount) {
                this.invalidateCache(accountId);
                return false;
            }
            
            return true;
        } catch (error) {
            console.warn('Cache validation failed:', error);
            this.invalidateCache(accountId);
            return false;
        }
    }
}

// OPTIMIZED: Debounced load accounts with better performance
const debouncedLoadAccounts = (() => {
    return () => {
        if (loadAccountsTimeout) {
            clearTimeout(loadAccountsTimeout);
        }
        loadAccountsTimeout = setTimeout(loadAccounts, 100); // Reduced from 150ms
    };
})();

// Auth state listener - OPTIMIZED: Single event listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        showApp(user);
        debouncedLoadAccounts();
    } else {
        currentUser = null;
        showAuth();
    }
});

function showApp(user) {
    if (DOM.authSection) DOM.authSection.style.display = 'none';
    if (DOM.appSection) DOM.appSection.classList.remove('hidden');
    if (DOM.userEmail) DOM.userEmail.textContent = user.email;
    addActivityHistoryToDropdown();
}

function showAuth() {
    if (DOM.authSection) DOM.authSection.style.display = 'block';
    if (DOM.appSection) DOM.appSection.classList.add('hidden');
}

// Migration function to add breachedAt to existing breached accounts
async function migrateBreachedAccounts() {
    if (!currentUser) return;
    
    try {
        // Check if migration has already been done for this user
        const migrationKey = `breach_migration_${currentUser.uid}`;
        if (localStorage.getItem(migrationKey)) {
            return; // Migration already done
        }
        
        const q = query(
            collection(db, 'accounts'),
            where('userId', '==', currentUser.uid),
            where('status', '==', 'breached')
        );
        
        const querySnapshot = await getDocs(q);
        const batch = [];
        
        for (const docRef of querySnapshot.docs) {
            const account = docRef.data();
            // Only update if breachedAt is missing
            if (!account.breachedAt) {
                batch.push(
                    updateDoc(doc(db, 'accounts', docRef.id), {
                        breachedAt: account.updatedAt || account.createdAt || new Date()
                    })
                );
            }
        }
        
        if (batch.length > 0) {
            await Promise.all(batch);
            console.log(`Migrated ${batch.length} breached accounts with breach timestamps`);
        }
        
        // Mark migration as complete
        localStorage.setItem(migrationKey, 'true');
        
    } catch (error) {
        console.error('Error migrating breached accounts:', error);
    }
}

// PRODUCTION-OPTIMIZED: Main loadAccounts function with enhanced error handling
async function loadAccounts() {
    if (!currentUser) return;

    if (loadAccountsTimeout) {
        clearTimeout(loadAccountsTimeout);
        loadAccountsTimeout = null;
    }
    
    try {
        // Run migration for existing breached accounts (one-time)
        await migrateBreachedAccounts();
        
        // Show loading state
        if (DOM.accountsList) {
            DOM.accountsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">Loading accounts...</div>';
        }

        const q = query(
            collection(db, 'accounts'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        allAccounts = querySnapshot.docs;
        
        if (allAccounts.length === 0) {
            displayAccounts([]);
            setupFilters();
            return;
        }

        // PRODUCTION: Optimized batch processing with smart caching
        const processedAccounts = await Promise.all(
            allAccounts.map(async (docRef) => {
                const accountId = docRef.id;
                const accountData = docRef.data();
                
                try {
                    const cached = SmartCache.getCachedData(accountId);
                    let dailyPnL = 0;
                    let currentDailyDDLevel = accountData.currentBalance - (accountData.accountSize * (accountData.dailyDrawdown / 100));
                    
                    if (cached && SmartCache.isCacheValid(accountId, cached)) {
                        // Use cached data
                        dailyPnL = cached.dailyPnL;
                        currentDailyDDLevel = cached.currentDailyDDLevel;
                    } else {
                        // Calculate fresh data with fallback
                        try {
                            dailyPnL = await dailyTracker.calculateDailyPnL(accountId, accountData.currentBalance);
                            currentDailyDDLevel = await dailyTracker.getCurrentDailyDDLevel(
                                accountId,
                                accountData.currentBalance,
                                accountData.accountSize,
                                accountData.dailyDrawdown
                            );
                            
                            SmartCache.setCachedData(accountId, { dailyPnL, currentDailyDDLevel });
                        } catch (dailyError) {
                            console.warn(`Daily P&L calculation failed for ${accountId}:`, dailyError);
                            // Continue with fallback values
                        }
                    }
                    
                    return {
                        id: accountId,
                        data: () => ({
                            ...accountData,
                            _dailyPnL: dailyPnL,
                            _currentDailyDDLevel: currentDailyDDLevel
                        }),
                        exists: docRef.exists,
                        metadata: docRef.metadata,
                        ref: docRef.ref
                    };
                    
                } catch (error) {
                    console.warn(`Error processing account ${accountId}:`, error);
                    return {
                        id: accountId,
                        data: () => ({
                            ...accountData,
                            _dailyPnL: 0,
                            _currentDailyDDLevel: accountData.currentBalance - (accountData.accountSize * (accountData.dailyDrawdown / 100))
                        }),
                        exists: docRef.exists,
                        metadata: docRef.metadata,
                        ref: docRef.ref
                    };
                }
            })
        );
        
        allAccounts = processedAccounts;
        
        // OPTIMIZED: Efficient sorting with breach date handling
        allAccounts.sort((a, b) => {
            const accountA = a.data();
            const accountB = b.data();
            
            // Check if accounts are breached
            const isBreachedA = accountA.status === 'breached' || 
                (accountA.currentBalance - accountA.accountSize) < -(accountA.accountSize * (accountA.maxDrawdown / 100));
            const isBreachedB = accountB.status === 'breached' || 
                (accountB.currentBalance - accountB.accountSize) < -(accountB.accountSize * (accountB.maxDrawdown / 100));
            
            // If both are breached, sort by breach date (most recent first)
            if (isBreachedA && isBreachedB) {
                // Get breach timestamps
                const breachDateA = accountA.breachedAt?.toDate?.() || accountA.breachedAt || accountA.updatedAt?.toDate?.() || accountA.updatedAt || new Date(0);
                const breachDateB = accountB.breachedAt?.toDate?.() || accountB.breachedAt || accountB.updatedAt?.toDate?.() || accountB.updatedAt || new Date(0);
                
                // Convert to timestamps for comparison
                const timestampA = breachDateA instanceof Date ? breachDateA.getTime() : new Date(breachDateA).getTime();
                const timestampB = breachDateB instanceof Date ? breachDateB.getTime() : new Date(breachDateB).getTime();
                
                // Sort by most recent breach first
                return timestampB - timestampA;
            }
            
            // If only one is breached, non-breached comes first
            if (isBreachedA !== isBreachedB) {
                return isBreachedA ? 1 : -1;
            }
            
            // For non-breached accounts, use existing logic
            const phaseOrder = { 'Funded': 0, 'Challenge Phase 2': 1, 'Challenge Phase 1': 2 };
            const orderA = phaseOrder[accountA.phase] ?? 3;
            const orderB = phaseOrder[accountB.phase] ?? 3;
            
            return orderA !== orderB ? orderA - orderB : accountB.currentBalance - accountA.currentBalance;
        });
        
        // Update UI efficiently
        const summaryStats = generateSummaryStatsOptimized(allAccounts);
        displaySummaryStats(summaryStats);
        displayAccounts(getFilteredAccounts());
        setupFilters();
        
        // Initialize compact view asynchronously
        requestAnimationFrame(() => {
            if (compactView?.initialize) {
                compactView.initialize(allAccounts, currentUser);
            }
        });
        
    } catch (error) {
        console.error('Error loading accounts:', error);
        if (DOM.accountsList) {
            DOM.accountsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ff4757;">
                    Error loading accounts. Please refresh the page.
                    <br><br>
                    <button onclick="retryLoadAccounts()" class="btn btn-primary">Retry</button>
                </div>
            `;
        }
    }
}

// Trade modal functions - OPTIMIZED with null checks
function showTradeModal(accountId, currentBalance, firmName) {
    if (!DOM.tradeModal) return;
    
    DOM.tradeForm?.reset();
    
    const modalTitle = document.querySelector('#trade-modal h2');
    const currentBalanceDisplay = document.getElementById('current-balance-display');
    
    if (modalTitle) modalTitle.textContent = `Add Trade - ${firmName}`;
    if (currentBalanceDisplay) currentBalanceDisplay.textContent = `Current: $${currentBalance.toLocaleString()}`;
    
    const accountIdInput = document.getElementById('trade-account-id');
    const oldBalanceInput = document.getElementById('trade-old-balance');
    
    if (accountIdInput) accountIdInput.value = accountId;
    if (oldBalanceInput) oldBalanceInput.value = currentBalance;
    
    DOM.tradeModal.style.display = 'block';
}

function hideTradeModal() {
    if (DOM.tradeModal) DOM.tradeModal.style.display = 'none';
    DOM.tradeForm?.reset();
}

function addActivityHistoryToDropdown() {
    if (!DOM.profileDropdown) return;
    
    // Check if activity link already exists
    if (DOM.profileDropdown.querySelector('.activity-link')) return;
    
    // Find settings button to insert activity link before it
    const settingsBtn = DOM.profileDropdown.querySelector('#settings-btn');
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
            DOM.profileDropdown.classList.remove('show');
            window.location.href = 'pages/activity.html';
        };
        
        // Insert before settings button
        settingsBtn.parentNode.insertBefore(activityLink, settingsBtn);
    }
}

function resetModal() {
    editingAccountId = null;
    DOM.addAccountForm?.reset();
    if (DOM.customFirmGroup) DOM.customFirmGroup.style.display = 'none';
    if (DOM.customSizeGroup) DOM.customSizeGroup.style.display = 'none';
    if (DOM.profitShareGroup) DOM.profitShareGroup.style.display = 'none';
    if (DOM.profitTargetGroup) DOM.profitTargetGroup.style.display = 'block';
    
    if (DOM.accountSizeSelect) DOM.accountSizeSelect.value = '100000';
    const currentBalanceInput = document.getElementById('current-balance');
    if (currentBalanceInput) currentBalanceInput.value = '100000';
    
    const profitShareInput = document.getElementById('profit-share');
    if (profitShareInput) profitShareInput.value = '80';
    
    if (DOM.firmSelect) {
        DOM.firmSelect.innerHTML = `
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
        DOM.firmSelect.disabled = false;
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
    if (DOM.addAccountModal) DOM.addAccountModal.style.display = 'none';
    resetModal();
}

// OPTIMIZED: Extracted helper functions for better maintainability
function handleFirmSelection(selectedFirm) {
    if (selectedFirm === 'Other') {
        if (DOM.customFirmGroup) DOM.customFirmGroup.style.display = 'block';
        if (DOM.customFirmInput) DOM.customFirmInput.setAttribute('required', 'required');
    } else {
        if (DOM.customFirmGroup) DOM.customFirmGroup.style.display = 'none';
        if (DOM.customFirmInput) {
            DOM.customFirmInput.removeAttribute('required');
            DOM.customFirmInput.value = '';
        }
    }
    
    if (PROP_FIRM_TEMPLATES[selectedFirm]) {
        applyTemplate(selectedFirm);
    } else {
        resetTemplate();
    }
}

function applyTemplate(firmName) {
    const template = PROP_FIRM_TEMPLATES[firmName];
    if (!template) return;
    
    const targetSize = template.accountSizes.includes(100000) ? '100000' : template.accountSizes[0].toString();
    if (DOM.accountSizeSelect) DOM.accountSizeSelect.value = targetSize;
    
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
    if (!DOM.phaseSelect || !DOM.profitTargetPercent) return;
    
    const selectedPhase = DOM.phaseSelect.value;
    
    if (selectedPhase === 'Challenge Phase 1') {
        DOM.profitTargetPercent.value = template.phase1Target;
    } else if (selectedPhase === 'Challenge Phase 2') {
        DOM.profitTargetPercent.value = template.phase2Target;
    } else if (selectedPhase === 'Funded') {
        DOM.profitTargetPercent.value = '';
    }
}

function handlePhaseSelection(selectedPhase) {
    if (selectedPhase === 'Funded') {
        if (DOM.profitTargetGroup) DOM.profitTargetGroup.style.display = 'none';
        if (DOM.profitShareGroup) DOM.profitShareGroup.style.display = 'block';
        if (DOM.profitTargetPercent) DOM.profitTargetPercent.removeAttribute('required');
        const profitShare = document.getElementById('profit-share');
        if (profitShare) profitShare.setAttribute('required', 'required');
    } else {
        if (DOM.profitTargetGroup) DOM.profitTargetGroup.style.display = 'block';
        if (DOM.profitShareGroup) DOM.profitShareGroup.style.display = 'none';
        if (DOM.profitTargetPercent) DOM.profitTargetPercent.setAttribute('required', 'required');
        const profitShare = document.getElementById('profit-share');
        if (profitShare) profitShare.removeAttribute('required');
        
        const selectedFirm = DOM.firmSelect?.value;
        if (PROP_FIRM_TEMPLATES[selectedFirm]) {
            updateProfitTargetFromTemplate(PROP_FIRM_TEMPLATES[selectedFirm]);
            calculateTargetAmount();
        }
    }
}

function handleAccountSizeSelection(value) {
    if (value === 'custom') {
        if (DOM.customSizeGroup) DOM.customSizeGroup.style.display = 'block';
        if (DOM.customSizeInput) DOM.customSizeInput.setAttribute('required', 'required');
    } else {
        if (DOM.customSizeGroup) DOM.customSizeGroup.style.display = 'none';
        if (DOM.customSizeInput) {
            DOM.customSizeInput.removeAttribute('required');
            DOM.customSizeInput.value = '';
        }
        const currentBalanceInput = document.getElementById('current-balance');
        if (currentBalanceInput) currentBalanceInput.value = value;
    }
    calculateTargetAmount();
}

function calculateTargetAmount() {
    if (!DOM.accountSizeSelect || !DOM.profitTargetPercent) return;
    
    const accountSize = DOM.accountSizeSelect.value === 'custom' 
        ? parseFloat(DOM.customSizeInput?.value) || 0
        : parseFloat(DOM.accountSizeSelect.value) || 0;
    
    const percentage = parseFloat(DOM.profitTargetPercent.value) || 0;
    const targetAmount = (accountSize * percentage / 100).toFixed(2);
    
    const targetAmountDisplay = document.getElementById('target-amount-display');
    if (targetAmountDisplay) targetAmountDisplay.textContent = targetAmount;
}

function generateSummaryStatsOptimized(accounts) {
    // Calculate cascading hedging potential
    const hedgingResults = cascadingHedging.generateDashboardSummary(accounts);
    
    const stats = {
        funded: { count: 0, totalFunding: 0, totalYourShare: 0, totalEstPayout: 0 },
        challenge: { 
            phase1Active: 0, 
            estimatedFundedAccounts: hedgingResults.estimatedFundedAccounts,
            phase2Active: 0,
            estimatedFundedDrawdown: hedgingResults.estimatedFundedDrawdown
        },
        inactive: { 
            phase1Breached: 0, 
            phase2Breached: 0, 
            fundedBreached: 0, 
            totalPassed: 0 
        }
    };
    
    // Count accounts by status (existing logic)
    for (const doc of accounts) {
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
                const availableDrawdown = maxDrawdownAmount - Math.abs(Math.min(0, currentPnL));
                const currentProfit = Math.max(0, currentPnL);
                stats.funded.totalEstPayout += availableDrawdown + currentProfit;
            } else if (account.phase === 'Challenge Phase 1') {
                stats.challenge.phase1Active++;
            } else if (account.phase === 'Challenge Phase 2') {
                stats.challenge.phase2Active++;
            }
        } else if (account.status === 'breached' || (account.status === 'active' && isBreached)) {
            if (account.phase === 'Challenge Phase 1') stats.inactive.phase1Breached++;
            else if (account.phase === 'Challenge Phase 2') stats.inactive.phase2Breached++;
            else if (account.phase === 'Funded') stats.inactive.fundedBreached++;
        } else if (account.status === 'upgraded') {
            stats.inactive.totalPassed++;
        }
    }
    
    stats.inactive.totalPassed += stats.funded.count;
    return stats;
}

function displaySummaryStats(stats) {
    const summaryContainer = document.getElementById('summary-stats');
    if (!summaryContainer) return;
    
    summaryContainer.innerHTML = `
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
                    <div class="summary-stat-label">Est Funded Accounts</div>
                    <div class="summary-stat-value positive">${stats.challenge.estimatedFundedAccounts}</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">Phase 2</div>
                    <div class="summary-stat-value">${stats.challenge.phase2Active} accounts</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">Est Funded Drawdown</div>
                    <div class="summary-stat-value positive">${stats.challenge.estimatedFundedDrawdown.toLocaleString()}</div>
                </div>
            </div>
        </div>
        
        <div class="summary-card inactive">
            <h3>Portfolio Overview</h3>
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
}

function setupFilters() {
    const filterContainer = document.querySelector('.filter-pills');
    if (!filterContainer) return;
    
    if (filterContainer.dataset.initialized) return;
    
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
            if (compactView?.updateAccounts) {
                compactView.updateAccounts(getFilteredAccounts());
            }
        });
    });
    filterContainer.dataset.initialized = 'true';
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

function calculateEnhancedProgress(account) {
    const currentPnL = account.currentBalance - account.accountSize;
    const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
    
    const leftLimit = -maxDrawdownAmount;
    let rightLimit;
    
    if (account.phase === 'Funded') {
        rightLimit = account.accountSize * 0.2;
    } else {
        rightLimit = account.profitTargetAmount || (account.accountSize * 0.1);
    }
    
    const maxRange = Math.max(Math.abs(leftLimit), Math.abs(rightLimit));
    const symmetricalLeft = -maxRange;
    const symmetricalRight = maxRange;
    const totalRange = symmetricalRight - symmetricalLeft;
    
    const distanceFromLeft = currentPnL - symmetricalLeft;
    const progressPercent = Math.max(0, Math.min(100, (distanceFromLeft / totalRange) * 100));
    
    let progressColor;
    if (currentPnL < 0) {
        progressColor = 'loss';
    } else if (account.phase === 'Funded') {
        progressColor = 'profit';
    } else {
        progressColor = 'target';
    }
    
    let progressText;
    if (account.phase === 'Funded') {
        if (currentPnL >= 0) {
            progressText = currentPnL === 0 ? '+$0 profit' : `+${currentPnL.toLocaleString()} profit`;
        } else {
            progressText = `${Math.abs(currentPnL).toLocaleString()} drawdown`;
        }
    } else {
        const targetRemaining = Math.max(0, account.profitTargetAmount - currentPnL);
        if (currentPnL >= account.profitTargetAmount) {
            progressText = 'Target Reached!';
        } else if (currentPnL < 0) {
            progressText = `${Math.abs(currentPnL).toLocaleString()} drawdown`;
        } else {
            progressText = `${targetRemaining.toLocaleString()} to target`;
        }
    }
    
    return {
        progressPercent,
        progressColor,
        progressText,
        leftLimit: symmetricalLeft,
        rightLimit: symmetricalRight,
        centerPoint: 0
    };
}

function generateProgressBarHTML(account) {
    const progress = calculateEnhancedProgress(account);
    
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

function displayAccounts(accounts) {
    if (!DOM.accountsList) return;
    
    // Update compact view efficiently
    if (compactView?.updateAccounts) {
        compactView.updateAccounts(accounts);
    }
    
    // Handle compact view display
    if (compactView?.isInCompactView && compactView.isInCompactView()) {
        DOM.accountsList.style.display = 'none';
        return;
    } else {
        DOM.accountsList.style.display = 'block';
    }
    
    if (accounts.length === 0) {
        let emptyMessage = 'No accounts found.';
        if (currentFilter === 'active') {
            emptyMessage = 'No active accounts yet. Add your first prop firm account to get started!';
        } else if (currentFilter === 'breached') {
            emptyMessage = 'No breached accounts - great job maintaining your rules!';
        } else if (currentFilter === 'upgraded') {
            emptyMessage = 'No upgraded accounts yet.';
        }
        
        DOM.accountsList.innerHTML = `
            <div class="empty-state">
                <h3>No accounts found</h3>
                <p>${emptyMessage}</p>
            </div>
        `;
        return;
    }
    
    // PERFORMANCE: Build HTML string efficiently
    const accountsHTML = accounts.map(doc => {
        const account = doc.data();
        const accountId = doc.id;
        
        const totalPnL = account.currentBalance - account.accountSize;
        const dailyPnL = account._dailyPnL || 0;
        const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
        const isMaxDrawdownBreached = totalPnL < -maxDrawdownAmount;
        const isBreached = isMaxDrawdownBreached;
        
        const firmInitials = account.firmName.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
        
        let upgradeButtonHtml = '';
        let statusBadgeHtml = '';
        
        let displayPhase = account.phase;
        if (account.phase === 'Challenge Phase 1') displayPhase = 'Phase 1';
        else if (account.phase === 'Challenge Phase 2') displayPhase = 'Phase 2';
        
        if (account.status === 'upgraded') {
            const nextPhase = account.phase === 'Challenge Phase 1' ? 'Phase 2' : 'Funded';
            statusBadgeHtml = `<div class="status-badge upgraded">Upgraded to ${nextPhase}</div>`;
        }
        
        // Stats
        const stat1Value = account.currentBalance.toLocaleString();
        const stat2Value = `${dailyPnL >= 0 ? '+' : ''}${dailyPnL.toLocaleString()}`;
        const stat3Value = `${totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}`;
        
        let stat4Label, stat4Value;
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
                upgradeButtonHtml = `<button class="action-btn upgrade-btn" onclick="upgradeAccount('${accountId}', '${account.firmName}', ${account.accountSize}, '${account.phase}', '${account.alias || ''}')">Upgrade</button>`;
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
        
        const progressBarHtml = generateProgressBarHTML(account);
        const bottomRowHtml = getBottomRowHtml(account, accountId, isBreached, upgradeButtonHtml);
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
                        <div class="stat-label">Balance</div>
                        <div class="stat-value">${stat1Value}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Daily P&L</div>
                        <div class="stat-value ${dailyPnL >= 0 ? 'positive' : 'negative'}">${stat2Value}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total P&L</div>
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
    }).join('');
    
    DOM.accountsList.innerHTML = `<div class="accounts-grid">${accountsHTML}</div>`;
}

function getBottomRowHtml(account, accountId, isBreached, upgradeButtonHtml) {
    if (account.status === 'breached' || isBreached) {
        // Get breach date for display
        let breachDateText = '';
        if (account.breachedAt) {
            const breachDate = account.breachedAt?.toDate?.() || account.breachedAt;
            const date = breachDate instanceof Date ? breachDate : new Date(breachDate);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                breachDateText = ' - Today';
            } else if (diffDays === 1) {
                breachDateText = ' - Yesterday';
            } else if (diffDays < 7) {
                breachDateText = ` - ${diffDays} days ago`;
            } else {
                breachDateText = ` - ${date.toLocaleDateString()}`;
            }
        }
        
        return `
            <div class="bottom-row" onclick="event.stopPropagation()">
                <div class="breach-warning">⚠️ BREACHED${breachDateText}</div>
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

// OPTIMIZED: Event listeners setup with null checks
function setupEventListeners() {
    // Navigation
    DOM.profileBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.profileDropdown?.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (DOM.profileBtn && DOM.profileDropdown && 
            !DOM.profileBtn.contains(e.target) && 
            !DOM.profileDropdown.contains(e.target)) {
            DOM.profileDropdown.classList.remove('show');
        }
    });

    DOM.settingsBtn?.addEventListener('click', () => {
        DOM.profileDropdown?.classList.remove('show');
        window.location.href = 'pages/settings.html';
    });

    DOM.helpBtn?.addEventListener('click', () => {
        DOM.profileDropdown?.classList.remove('show');
        alert('Help & Support coming soon!');
    });

    DOM.logoutBtn?.addEventListener('click', () => {
        signOut(auth).then(() => console.log('Logout successful'));
    });

    // Trade form with enhanced error handling
    DOM.tradeForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('You must be logged in');
            return;
        }
        
        try {
            const accountId = document.getElementById('trade-account-id')?.value;
            const oldBalance = parseFloat(document.getElementById('trade-old-balance')?.value);
            const newBalance = parseFloat(document.getElementById('trade-new-balance')?.value);
            const instrument = document.getElementById('trade-instrument')?.value.trim();
            const tradeType = document.getElementById('trade-type')?.value;
            const notes = document.getElementById('trade-notes')?.value.trim();
            
            if (!newBalance || newBalance < 0) {
                alert('Please enter a valid new balance');
                return;
            }
            
            // CRITICAL: Cache invalidation before trade
            SmartCache.invalidateCache(accountId);
            
            // Update daily tracking
            const accountDoc = await getDoc(doc(db, 'accounts', accountId));
            if (accountDoc.exists()) {
                const accountData = accountDoc.data();
                await dailyTracker.updateSnapshotForTrade(
                    accountId, newBalance, accountData.accountSize, accountData.dailyDrawdown
                );
            }
            
            const tradeData = {
                accountId, oldBalance, newBalance,
                timestamp: new Date(),
                instrument: instrument || null,
                tradeType: tradeType || null,
                notes: notes || null
            };
            
            const result = await tradeManager.addTrade(tradeData);
            
            if (result.success) {
                SmartCache.incrementTradeCount(accountId);
                await activityLogger.logTradeAdded(currentUser.uid, tradeData);
                hideTradeModal();
                debouncedLoadAccounts();
            } else {
                alert('Error adding trade: ' + result.error);
            }
            
        } catch (error) {
            console.error('Error adding trade:', error);
            alert('Error adding trade: ' + error.message);
        }
    });

    // Modal events
    DOM.addAccountBtn?.addEventListener('click', () => {
        resetModal();
        if (DOM.addAccountModal) DOM.addAccountModal.style.display = 'block';
    });

    DOM.closeModal?.addEventListener('click', hideModal);
    DOM.cancelBtn?.addEventListener('click', hideModal);

    // Trade modal close handlers
    document.querySelector('#trade-modal .close')?.addEventListener('click', hideTradeModal);
    document.getElementById('trade-cancel-btn')?.addEventListener('click', hideTradeModal);

    // Form logic
    DOM.firmSelect?.addEventListener('change', (e) => {
        handleFirmSelection(e.target.value);
    });

    DOM.phaseSelect?.addEventListener('change', (e) => {
        handlePhaseSelection(e.target.value);
    });

    DOM.accountSizeSelect?.addEventListener('change', (e) => {
        handleAccountSizeSelection(e.target.value);
    });

    DOM.profitTargetPercent?.addEventListener('input', calculateTargetAmount);
    DOM.customSizeInput?.addEventListener('input', calculateTargetAmount);

    // Form submission
    DOM.addAccountForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('You must be logged in');
            return;
        }
        
        try {
            const firmName = DOM.firmSelect.value === 'Other' ? DOM.customFirmInput.value : DOM.firmSelect.value;
            const alias = document.getElementById('alias').value.trim();
            const accountSize = DOM.accountSizeSelect.value === 'custom' ? parseFloat(DOM.customSizeInput.value) : parseFloat(DOM.accountSizeSelect.value);
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
            debouncedLoadAccounts();
            
        } catch (error) {
            console.error('Error saving account:', error);
            alert('Error saving account: ' + error.message);
        }
    });

    // Window click handler
    window.addEventListener('click', (e) => {
        if (e.target === DOM.addAccountModal) hideModal();
    });
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
        
        DOM.addAccountModal.style.display = 'block';
        document.querySelector('#add-account-modal h2').textContent = 'Edit Account';
        document.querySelector('#add-account-form button[type="submit"]').textContent = 'Update Account';
        
        const firmNameCleaned = account.firmName;
        
        DOM.firmSelect.innerHTML = `<option value="${firmNameCleaned}" selected>${firmNameCleaned}</option>`;
        DOM.firmSelect.disabled = true;
        
        if ([5000, 10000, 25000, 50000, 100000, 200000].includes(account.accountSize)) {
            DOM.accountSizeSelect.value = account.accountSize.toString();
        } else {
            DOM.accountSizeSelect.value = 'custom';
            DOM.customSizeGroup.style.display = 'block';
            DOM.customSizeInput.value = account.accountSize;
            DOM.customSizeInput.setAttribute('required', 'required');
        }
        
        document.getElementById('current-balance').value = account.currentBalance;
        document.getElementById('alias').value = account.alias || '';
        document.getElementById('phase').value = account.phase;
        document.getElementById('max-drawdown').value = account.maxDrawdown;
        document.getElementById('daily-drawdown').value = account.dailyDrawdown;
        document.getElementById('platform').value = account.platform;
        
        if (account.phase === 'Funded') {
            DOM.profitTargetGroup.style.display = 'none';
            DOM.profitShareGroup.style.display = 'block';
            document.getElementById('profit-share').value = account.profitShare || 80;
            document.getElementById('profit-share').setAttribute('required', 'required');
            DOM.profitTargetPercent.removeAttribute('required');
        } else {
            DOM.profitTargetGroup.style.display = 'block';
            DOM.profitShareGroup.style.display = 'none';
            document.getElementById('profit-target-percent').value = account.profitTargetPercent;
            DOM.profitTargetPercent.setAttribute('required', 'required');
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
                breachedAt: new Date(),
                updatedAt: new Date()
            });
            console.log('Account marked as breached!');
            debouncedLoadAccounts();
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
                debouncedLoadAccounts();
                deleteModal.remove();
            } catch (error) {
                console.error('Error deleting account:', error);
                alert('Error deleting account: ' + error.message);
            }
        }
    });
};

window.upgradeAccount = async function(accountId, firmName, accountSize, currentPhase, alias = '') {
    resetModal();
    DOM.addAccountModal.style.display = 'block';
    
    document.querySelector('#add-account-modal h2').textContent = 'Upgrade to Next Phase';
    
    DOM.firmSelect.value = firmName;
    if (PROP_FIRM_TEMPLATES[firmName]) {
        applyTemplate(firmName);
    }
    
    DOM.accountSizeSelect.value = accountSize.toString();
    document.getElementById('current-balance').value = accountSize;
    
    // Prefill the alias field
    document.getElementById('alias').value = alias;
    
    let nextPhase;
    if (currentPhase === 'Challenge Phase 1') {
        nextPhase = 'Challenge Phase 2';
    } else if (currentPhase === 'Challenge Phase 2') {
        nextPhase = 'Funded';
    } else {
        nextPhase = 'Funded';
    }
    
    DOM.phaseSelect.value = nextPhase;
    DOM.phaseSelect.dispatchEvent(new Event('change'));
    
    if (PROP_FIRM_TEMPLATES[firmName]) {
        updateProfitTargetFromTemplate(PROP_FIRM_TEMPLATES[firmName]);
        calculateTargetAmount();
    }
    
    const submitBtn = document.querySelector('#add-account-form button[type="submit"]');
    submitBtn.textContent = 'Create Upgraded Account';
    submitBtn.dataset.upgradeFrom = accountId;
};

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

// Add this function to handle account card clicks
window.openAccountDashboard = function(accountId) {
    window.location.href = `pages/account-dashboard.html?id=${accountId}`;
}

// PRODUCTION: Clean session cache on startup
function cleanupSessionCache() {
    try {
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key?.startsWith('daily_pnl_')) {
                try {
                    const data = JSON.parse(sessionStorage.getItem(key));
                    if (data.timestamp && (now - data.timestamp) > maxAge) {
                        keysToRemove.push(key);
                    }
                } catch (e) {
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
        console.warn('Session cleanup failed:', error);
    }
}

// Initialize application
function initializeApp() {
    try {
        setupEventListeners();
        cleanupSessionCache();
        
        // Add utility functions to window for debugging (only in development)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.clearDailyPnLCache = () => {
                SmartCache.invalidateAllCache();
                debouncedLoadAccounts();
            };
            window.SmartCache = SmartCache;
        }
        
        // Add manual migration trigger (available in production for admins)
        window.runBreachMigration = async () => {
            if (currentUser) {
                const migrationKey = `breach_migration_${currentUser.uid}`;
                localStorage.removeItem(migrationKey);
                await migrateBreachedAccounts();
                debouncedLoadAccounts();
                console.log('Breach migration completed');
            }
        };
        
        console.log('PropOne initialized successfully');
    } catch (error) {
        console.error('App initialization failed:', error);
    }
}

// Inject CSS for dropdown fixes and payout button
const appCSS = `
/* Profile dropdown fixes */
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

/* Payout button styling */
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

// Inject CSS if not already present
if (!document.getElementById('app-css-fixes')) {
    const style = document.createElement('style');
    style.id = 'app-css-fixes';
    style.textContent = appCSS;
    document.head.appendChild(style);
}

// Start the application
initializeApp();

// Make essential functions global
window.showTradeModal = showTradeModal;
window.hideTradeModal = hideTradeModal;
window.retryLoadAccounts = () => {
    if (DOM.accountsList) {
        DOM.accountsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">Retrying...</div>';
    }
    loadAccounts();
};

console.log('Enhanced PropOne app with compact view initialized');