import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, updateDoc, addDoc, collection } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import tradeManager from './trade-manager.js';
import dailyTracker from './daily-tracker.js';

let currentUser = null;
let currentAccount = null;
let currentAccountId = null;
let balanceChart = null;
let trades = [];
let currentDailyDDLevel = null;

// DOM elements
const accountInitials = document.getElementById('account-initials');
const accountTitle = document.getElementById('account-title');
const accountSize = document.getElementById('account-size');
const accountPlatform = document.getElementById('account-platform');
const accountCreated = document.getElementById('account-created');
const accountPhase = document.getElementById('account-phase');
const accountStatus = document.getElementById('account-status');

const currentBalanceDisplay = document.getElementById('current-balance-display');
const totalPnlDisplay = document.getElementById('total-pnl-display');
const dailyDdDisplay = document.getElementById('daily-dd-display');
const maxDdDisplay = document.getElementById('max-dd-display');

const tradesList = document.getElementById('trades-list');
const tradingStats = document.getElementById('trading-stats');
const addTradeBtn = document.getElementById('add-trade-btn');
const editAccountBtn = document.getElementById('edit-account-btn');
const viewAllTradesBtn = document.getElementById('view-all-trades');

// Modal elements
const tradeModal = document.getElementById('trade-modal');
const tradeForm = document.getElementById('trade-form');
const editTradeModal = document.getElementById('edit-trade-modal');
const editTradeForm = document.getElementById('edit-trade-form');

// Chart elements
const balanceChartCanvas = document.getElementById('balance-chart');
const chartTimeframe = document.getElementById('chart-timeframe');
const dailyDdValue = document.getElementById('daily-dd-value');
const maxDdValue = document.getElementById('max-dd-value');

// Get account ID from URL parameters
function getAccountIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Auth state listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        currentAccountId = getAccountIdFromUrl();
        if (currentAccountId) {
            loadAccountData();
        } else {
            console.error('No account ID in URL');
            window.location.href = '../index.html';
        }
    } else {
        window.location.href = 'login.html';
    }
});

// Load account data
async function loadAccountData() {
    if (!currentUser || !currentAccountId) return;

    try {
        const accountDoc = await getDoc(doc(db, 'accounts', currentAccountId));
        
        if (!accountDoc.exists()) {
            console.error('Account not found');
            window.location.href = '../index.html';
            return;
        }

        currentAccount = accountDoc.data();
        
        // Get current daily DD level
        currentDailyDDLevel = await dailyTracker.getCurrentDailyDDLevel(
            currentAccountId,
            currentAccount.currentBalance,
            currentAccount.accountSize,
            currentAccount.dailyDrawdown
        );
        
        // Display account information
        displayAccountInfo();
        
        // Load trades
        await loadTrades();
        
        // Initialize chart
        initializeChart();
        
        // Update sidebar info
        updateSidebarInfo();
        
        // Start countdown timer
        startResetCountdown();
        
    } catch (error) {
        console.error('Error loading account data:', error);
    }
}

// Display account information
function displayAccountInfo() {
    if (!currentAccount) return;

    // Basic info
    const firmInitials = currentAccount.firmName.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
    const displayAlias = currentAccount.alias ? `${currentAccount.alias}-` : '';
    const displayPhase = currentAccount.phase.replace('Challenge ', '');
    
    accountInitials.textContent = firmInitials;
    accountTitle.textContent = `${displayAlias}${currentAccount.firmName} - ${displayPhase}`;
    accountSize.textContent = `$${currentAccount.accountSize.toLocaleString()}`;
    accountPlatform.textContent = currentAccount.platform;
    
    // Format creation date
    const createdDate = currentAccount.createdAt?.toDate?.() || new Date(currentAccount.createdAt);
    accountCreated.textContent = `Created ${createdDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    })}`;
    
    // Phase badge and status - CORRECTED (only phase/status horizontal)
    updatePhaseAndStatus();
    
    // Calculate metrics
    updateMetrics();
}

// Update phase badge and status - CORRECTED to only make phase/status horizontal
function updatePhaseAndStatus() {
    if (!currentAccount) return;
    
    const displayPhase = currentAccount.phase.replace('Challenge ', '');
    const isBreached = checkAccountBreach();
    const canUpgrade = checkCanUpgrade();
    
    // Get the account status container
    const statusContainer = document.querySelector('.account-status');
    
    let statusHtml = `
        <div class="status-row">
            <div class="phase-badge ${currentAccount.phase === 'Funded' ? 'funded' : ''}">${displayPhase}</div>
            <div class="status-badge ${isBreached ? 'breached' : ''}">${isBreached ? 'Breached' : 'Active'}</div>
        </div>
    `;
    
    // Add upgrade button if eligible
    if (canUpgrade && !isBreached) {
        statusHtml += `
            <button class="upgrade-btn-status" onclick="upgradeAccountFromStatus()">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 14l5-5 5 5z"/>
                </svg>
                Upgrade
            </button>
        `;
    }
    
    statusContainer.innerHTML = statusHtml;
}

// Check if account can be upgraded
function checkCanUpgrade() {
    if (!currentAccount || currentAccount.phase === 'Funded') return false;
    
    const currentPnL = currentAccount.currentBalance - currentAccount.accountSize;
    const isBreached = checkAccountBreach();
    
    return !isBreached && currentPnL >= currentAccount.profitTargetAmount;
}

// Check if account is breached
function checkAccountBreach() {
    if (!currentAccount) return false;
    
    const currentPnL = currentAccount.currentBalance - currentAccount.accountSize;
    const maxDrawdownAmount = currentAccount.accountSize * (currentAccount.maxDrawdown / 100);
    
    return currentPnL < -maxDrawdownAmount;
}

// Update key metrics
async function updateMetrics() {
    if (!currentAccount) return;

    const currentPnL = currentAccount.currentBalance - currentAccount.accountSize;
    const maxDdAmount = currentAccount.accountSize * (currentAccount.maxDrawdown / 100);
    const maxDdLevel = currentAccount.accountSize - maxDdAmount;

    currentBalanceDisplay.textContent = `$${currentAccount.currentBalance.toLocaleString()}`;
    
    totalPnlDisplay.textContent = `${currentPnL >= 0 ? '+' : ''}$${currentPnL.toLocaleString()}`;
    totalPnlDisplay.className = `metric-value ${currentPnL >= 0 ? 'positive' : 'negative'}`;
    
    dailyDdDisplay.textContent = `$${currentDailyDDLevel.toLocaleString()}`;
    maxDdDisplay.textContent = `$${maxDdLevel.toLocaleString()}`;
    
    // Update DD indicators
    dailyDdValue.textContent = `$${currentDailyDDLevel.toLocaleString()}`;
    maxDdValue.textContent = `$${maxDdLevel.toLocaleString()}`;
}

// Update sidebar info with additional details
function updateSidebarInfo() {
    const sidebarContainer = document.querySelector('.dd-indicators');
    if (!sidebarContainer || !currentAccount) return;
    
    const maxDdAmount = currentAccount.accountSize * (currentAccount.maxDrawdown / 100);
    const maxDdLevel = currentAccount.accountSize - maxDdAmount;
    
    let profitTargetHtml = '';
    if (currentAccount.phase !== 'Funded' && currentAccount.profitTargetAmount > 0) {
        const profitTargetLevel = currentAccount.accountSize + currentAccount.profitTargetAmount;
        profitTargetHtml = `
            <div class="dd-indicator">
                <div class="dd-indicator-color profit-target-color"></div>
                <div class="dd-indicator-label">
                    <span>Profit Target</span>
                    <span>$${profitTargetLevel.toLocaleString()}</span>
                </div>
            </div>
        `;
    }
    
    sidebarContainer.innerHTML = `
        <h4 style="margin-bottom: 15px; color: #fff; font-size: 1rem;">Account Levels</h4>
        
        <div class="dd-indicator">
            <div class="dd-indicator-color daily-dd-color"></div>
            <div class="dd-indicator-label">
                <span>Daily DD Level</span>
                <span>$${currentDailyDDLevel.toLocaleString()}</span>
            </div>
        </div>
        
        <div class="dd-indicator">
            <div class="dd-indicator-color max-dd-color"></div>
            <div class="dd-indicator-label">
                <span>Max DD Level</span>
                <span>$${maxDdLevel.toLocaleString()}</span>
            </div>
        </div>
        
        ${profitTargetHtml}
        
        <div class="dd-indicator">
            <div class="dd-indicator-color reset-color"></div>
            <div class="dd-indicator-label">
                <span>Next DD Reset</span>
                <span id="reset-countdown">Calculating...</span>
            </div>
        </div>
    `;
}

// Start reset countdown timer
function startResetCountdown() {
    const updateCountdown = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(2, 30, 0, 0); // 2:30 AM
        
        // Convert to IST
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTomorrow = new Date(tomorrow.getTime() + istOffset);
        const istNow = new Date(now.getTime() + istOffset);
        
        const timeDiff = istTomorrow - istNow;
        
        if (timeDiff > 0) {
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            
            const countdownEl = document.getElementById('reset-countdown');
            if (countdownEl) {
                countdownEl.textContent = `${hours}h ${minutes}m`;
            }
        }
    };
    
    updateCountdown();
    setInterval(updateCountdown, 60000); // Update every minute
}

// Load trades
async function loadTrades() {
    if (!currentAccountId) return;

    try {
        const result = await tradeManager.loadTradesForAccount(currentAccountId);
        
        if (result.success) {
            trades = result.trades;
            displayTrades();
            updateTradingStats();
            updateChart();
        } else {
            console.error('Error loading trades:', result.error);
        }
    } catch (error) {
        console.error('Error loading trades:', error);
    }
}

// Display trades (limit to 4 for Recent Trades)
function displayTrades(limit = 4) {
    if (!tradesList) return;

    if (trades.length === 0) {
        tradesList.innerHTML = `
            <div class="empty-state">
                <p>No trades yet. Click "Add Trade" to get started!</p>
            </div>
        `;
        return;
    }

    const displayTrades = limit > 0 ? trades.slice(0, limit) : trades;
    
    tradesList.innerHTML = displayTrades.map(trade => {
        const formattedTrade = tradeManager.formatTradeForDisplay(trade);
        
        return `
            <div class="trade-item">
                <div class="trade-info">
                    <div class="trade-pnl ${formattedTrade.pnlClass}">${formattedTrade.formattedPnL}</div>
                    <div class="trade-details">
                        ${formattedTrade.instrument ? `${formattedTrade.instrument} • ` : ''}
                        ${formattedTrade.formattedDate} ${formattedTrade.formattedTime}
                        ${formattedTrade.notes ? ` • ${formattedTrade.notes}` : ''}
                    </div>
                </div>
                <div class="trade-actions">
                    <button class="trade-action-btn" onclick="editTrade('${trade.id}')">Edit</button>
                    <button class="trade-action-btn delete" onclick="deleteTrade('${trade.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Update trading statistics
function updateTradingStats() {
    if (!tradingStats || !currentAccount) return;

    const stats = tradeManager.getAccountStats(trades, currentAccount.accountSize);
    
    tradingStats.innerHTML = `
        <div class="stat-item">
            <div class="stat-label">Total Trades</div>
            <div class="stat-value">${stats.totalTrades}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Win Rate</div>
            <div class="stat-value">${stats.winRate}%</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Avg Win</div>
            <div class="stat-value ${stats.averageWin > 0 ? 'positive' : ''}">$${Math.abs(stats.averageWin).toLocaleString()}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Avg Loss</div>
            <div class="stat-value ${stats.averageLoss < 0 ? 'negative' : ''}">$${Math.abs(stats.averageLoss).toLocaleString()}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Largest Win</div>
            <div class="stat-value ${stats.largestWin > 0 ? 'positive' : ''}">$${stats.largestWin.toLocaleString()}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Largest Loss</div>
            <div class="stat-value ${stats.largestLoss < 0 ? 'negative' : ''}">$${Math.abs(stats.largestLoss).toLocaleString()}</div>
        </div>
    `;
}

// Initialize chart with corrected DD levels
function initializeChart() {
    if (!balanceChartCanvas || !currentAccount) return;

    const ctx = balanceChartCanvas.getContext('2d');
    
    // Generate chart data
    const chartData = tradeManager.generateChartData(trades, currentAccount.accountSize);
    
    // Calculate correct DD levels
    const maxDdAmount = currentAccount.accountSize * (currentAccount.maxDrawdown / 100);
    const maxDdLevel = currentAccount.accountSize - maxDdAmount;

    balanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(point => {
                let date;
                if (point.timestamp?.toDate && typeof point.timestamp.toDate === 'function') {
                    date = point.timestamp.toDate();
                } else if (point.timestamp instanceof Date) {
                    date = point.timestamp;
                } else {
                    date = new Date(point.timestamp);
                }
                
                if (isNaN(date.getTime())) {
                    date = new Date();
                }
                
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            datasets: [
                {
                    label: 'Balance',
                    data: chartData.map(point => point.balance),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                },
                {
                    label: 'Daily DD Level',
                    data: chartData.map(() => currentDailyDDLevel), // Use the correct current daily DD level
                    borderColor: '#ffa502',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Max DD Level',
                    data: chartData.map(() => maxDdLevel),
                    borderColor: '#ff4757',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 46, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#888'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#888',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Update chart
function updateChart() {
    if (!balanceChart || !currentAccount) return;

    const chartData = tradeManager.generateChartData(trades, currentAccount.accountSize);
    
    balanceChart.data.labels = chartData.map(point => {
        let date;
        if (point.timestamp?.toDate && typeof point.timestamp.toDate === 'function') {
            date = point.timestamp.toDate();
        } else if (point.timestamp instanceof Date) {
            date = point.timestamp;
        } else {
            date = new Date(point.timestamp);
        }
        
        if (isNaN(date.getTime())) {
            date = new Date();
        }
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    balanceChart.data.datasets[0].data = chartData.map(point => point.balance);
    balanceChart.data.datasets[1].data = chartData.map(() => currentDailyDDLevel); // Use correct daily DD
    balanceChart.update();
}

// View All Trades Modal
function showAllTradesModal() {
    // Create modal for all trades
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 80vh;">
            <span class="close">&times;</span>
            <h2>All Trades</h2>
            <div class="trades-list" style="max-height: 60vh; overflow-y: auto;">
                ${trades.map(trade => {
                    const formattedTrade = tradeManager.formatTradeForDisplay(trade);
                    return `
                        <div class="trade-item">
                            <div class="trade-info">
                                <div class="trade-pnl ${formattedTrade.pnlClass}">${formattedTrade.formattedPnL}</div>
                                <div class="trade-details">
                                    ${formattedTrade.instrument ? `${formattedTrade.instrument} • ` : ''}
                                    ${formattedTrade.formattedDate} ${formattedTrade.formattedTime}
                                    ${formattedTrade.notes ? ` • ${formattedTrade.notes}` : ''}
                                </div>
                            </div>
                            <div class="trade-actions">
                                <button class="trade-action-btn" onclick="editTrade('${trade.id}'); this.closest('.modal').remove();">Edit</button>
                                <button class="trade-action-btn delete" onclick="deleteTrade('${trade.id}'); this.closest('.modal').remove();">Delete</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Close modal
    modal.querySelector('.close').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Trade modal functions
function showTradeModal() {
    if (!tradeModal || !currentAccount) return;
    
    if (tradeForm) tradeForm.reset();
    
    const modalTitle = document.querySelector('#trade-modal h2');
    const currentBalanceDisplayModal = document.getElementById('current-balance-display-modal');
    
    if (modalTitle) modalTitle.textContent = `Add Trade - ${currentAccount.firmName}`;
    if (currentBalanceDisplayModal) {
        currentBalanceDisplayModal.textContent = `Current: $${currentAccount.currentBalance.toLocaleString()}`;
    }
    
    const accountIdInput = document.getElementById('trade-account-id');
    const oldBalanceInput = document.getElementById('trade-old-balance');
    
    if (accountIdInput) accountIdInput.value = currentAccountId;
    if (oldBalanceInput) oldBalanceInput.value = currentAccount.currentBalance;
    
    tradeModal.style.display = 'block';
}

function hideTradeModal() {
    if (tradeModal) tradeModal.style.display = 'none';
    if (tradeForm) tradeForm.reset();
}

// Edit Account Modal (Direct)
function showEditAccountModal() {
    // Create edit account modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content compact">
            <span class="close">&times;</span>
            <h2>Edit Account</h2>
            <form id="edit-account-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="edit-current-balance">Current Balance:</label>
                        <input type="number" id="edit-current-balance" step="0.01" required value="${currentAccount.currentBalance}">
                    </div>
                    <div class="form-group">
                        <label for="edit-alias">Alias:</label>
                        <input type="text" id="edit-alias" value="${currentAccount.alias || ''}" maxlength="3">
                    </div>
                </div>
                <div class="form-buttons">
                    <button type="button" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Account</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Handle form submission
    modal.querySelector('#edit-account-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newBalance = parseFloat(document.getElementById('edit-current-balance').value);
        const newAlias = document.getElementById('edit-alias').value.trim();
        
        try {
            await updateDoc(doc(db, 'accounts', currentAccountId), {
                currentBalance: newBalance,
                alias: newAlias || null,
                updatedAt: new Date()
            });
            
            modal.remove();
            await loadAccountData(); // Reload data
        } catch (error) {
            console.error('Error updating account:', error);
            alert('Error updating account: ' + error.message);
        }
    });
    
    // Close modal handlers
    modal.querySelector('.close').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-secondary').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Upgrade account from status area (FIXED)
window.upgradeAccountFromStatus = async function() {
    if (!currentAccount) return;
    
    let nextPhase;
    if (currentAccount.phase === 'Challenge Phase 1') {
        nextPhase = 'Challenge Phase 2';
    } else if (currentAccount.phase === 'Challenge Phase 2') {
        nextPhase = 'Funded';
    } else {
        return;
    }
    
    if (!confirm(`Upgrade to ${nextPhase}? This will create a new account and mark this one as upgraded.`)) {
        return;
    }
    
    try {
        // Create new account data based on current account
        const newAccountData = {
            userId: currentUser.uid,
            firmName: currentAccount.firmName,
            alias: currentAccount.alias,
            accountSize: currentAccount.accountSize,
            currentBalance: currentAccount.accountSize, // Reset balance
            phase: nextPhase,
            maxDrawdown: currentAccount.maxDrawdown,
            dailyDrawdown: currentAccount.dailyDrawdown,
            platform: currentAccount.platform,
            status: 'active',
            upgradedFrom: currentAccountId,
            upgradedTo: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Set phase-specific values
        if (nextPhase === 'Funded') {
            newAccountData.profitTargetPercent = 0;
            newAccountData.profitTargetAmount = 0;
            newAccountData.profitShare = 80; // Default profit share
        } else {
            // Use existing profit target settings for phase 2
            newAccountData.profitTargetPercent = currentAccount.profitTargetPercent;
            newAccountData.profitTargetAmount = currentAccount.profitTargetAmount;
            newAccountData.profitShare = 0;
        }
        
        // Add new account
        const docRef = await addDoc(collection(db, 'accounts'), newAccountData);
        
        // Mark current account as upgraded
        await updateDoc(doc(db, 'accounts', currentAccountId), {
            status: 'upgraded',
            upgradedTo: docRef.id,
            updatedAt: new Date()
        });
        
        alert(`Successfully upgraded to ${nextPhase}! Redirecting to new account...`);
        
        // Redirect to new account dashboard
        window.location.href = `account-dashboard.html?id=${docRef.id}`;
        
    } catch (error) {
        console.error('Error upgrading account:', error);
        alert('Error upgrading account: ' + error.message);
    }
};

// Edit trade functions
window.editTrade = function(tradeId) {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade || !editTradeModal) return;
    
    // Populate form
    document.getElementById('edit-trade-id').value = tradeId;
    document.getElementById('edit-trade-account-id').value = currentAccountId;
    document.getElementById('edit-trade-old-balance').value = trade.oldBalance;
    document.getElementById('edit-trade-new-balance').value = trade.newBalance;
    document.getElementById('edit-trade-instrument').value = trade.instrument || '';
    document.getElementById('edit-trade-type').value = trade.tradeType || '';
    document.getElementById('edit-trade-notes').value = trade.notes || '';
    
    editTradeModal.style.display = 'block';
};

window.deleteTrade = async function(tradeId) {
    if (!confirm('Are you sure you want to delete this trade?')) return;
    
    try {
        const result = await tradeManager.deleteTrade(tradeId, currentAccountId);
        
        if (result.success) {
            console.log('Trade deleted successfully');
            await loadAccountData(); // Reload all data
        } else {
            alert('Error deleting trade: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting trade:', error);
        alert('Error deleting trade: ' + error.message);
    }
};

// Event listeners
if (addTradeBtn) {
    addTradeBtn.addEventListener('click', showTradeModal);
}

if (editAccountBtn) {
    editAccountBtn.addEventListener('click', showEditAccountModal);
}

if (viewAllTradesBtn) {
    viewAllTradesBtn.addEventListener('click', showAllTradesModal);
}

// Trade form submission
if (tradeForm) {
    tradeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
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
                console.log('Trade added successfully!');
                hideTradeModal();
                await loadAccountData(); // Reload all data
            } else {
                alert('Error adding trade: ' + result.error);
            }
            
        } catch (error) {
            console.error('Error adding trade:', error);
            alert('Error adding trade: ' + error.message);
        }
    });
}

// Edit trade form submission
if (editTradeForm) {
    editTradeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const tradeId = document.getElementById('edit-trade-id').value;
            const accountId = document.getElementById('edit-trade-account-id').value;
            const oldBalance = parseFloat(document.getElementById('edit-trade-old-balance').value);
            const newBalance = parseFloat(document.getElementById('edit-trade-new-balance').value);
            const instrument = document.getElementById('edit-trade-instrument').value.trim();
            const tradeType = document.getElementById('edit-trade-type').value;
            const notes = document.getElementById('edit-trade-notes').value.trim();
            
            if (!newBalance || newBalance < 0) {
                alert('Please enter a valid new balance');
                return;
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
            
            const result = await tradeManager.updateTrade(tradeId, tradeData);
            
            if (result.success) {
                console.log('Trade updated successfully!');
                editTradeModal.style.display = 'none';
                await loadAccountData(); // Reload all data
            } else {
                alert('Error updating trade: ' + result.error);
            }
            
        } catch (error) {
            console.error('Error updating trade:', error);
            alert('Error updating trade: ' + error.message);
        }
    });
}

// Modal close handlers
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) modal.style.display = 'none';
    });
});

document.querySelectorAll('[id$="-cancel-btn"]').forEach(cancelBtn => {
    cancelBtn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) modal.style.display = 'none';
    });
});

// Chart timeframe change
if (chartTimeframe) {
    chartTimeframe.addEventListener('change', () => {
        updateChart();
    });
}

console.log('Account dashboard initialized');