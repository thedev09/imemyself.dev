// Compact View Module - compact-view.js
import { db } from './firebase-config.js';
import { doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class CompactView {
    constructor() {
        this.isCompactView = false;
        this.accounts = [];
        this.currentUser = null;
        this.initializeEventListeners();
        this.loadViewPreference();
    }

    // Initialize event listeners
    initializeEventListeners() {
        // View toggle button will be added by main app
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-toggle-btn')) {
                this.toggleView();
            }
            
            if (e.target.closest('.compact-account-card')) {
                const card = e.target.closest('.compact-account-card');
                // Don't navigate if trade button was clicked
                if (!e.target.closest('.compact-trade-btn')) {
                    const accountId = card.dataset.accountId;
                    if (accountId) {
                        this.openAccountDashboard(accountId);
                    }
                }
            }
            
            if (e.target.closest('.compact-trade-btn')) {
                e.stopPropagation();
                const card = e.target.closest('.compact-account-card');
                const accountId = card.dataset.accountId;
                const currentBalance = parseFloat(card.dataset.currentBalance);
                const firmName = card.dataset.firmName;
                
                if (typeof window.showTradeModal === 'function') {
                    window.showTradeModal(accountId, currentBalance, firmName);
                }
            }
        });
    }

    // Load user's view preference - Default to grid view
    loadViewPreference() {
        const saved = localStorage.getItem('propone-view-preference');
        if (saved === 'normal') {
            this.isCompactView = false;
        } else {
            // Default to grid view (compact)
            this.isCompactView = true;
        }
    }

    // Save user's view preference
    saveViewPreference() {
        localStorage.setItem('propone-view-preference', this.isCompactView ? 'compact' : 'normal');
    }

    // Create view toggle button
    createViewToggleButton() {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'view-toggle';
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = `view-toggle-btn ${this.isCompactView ? 'active' : ''}`;
        toggleBtn.innerHTML = `
            <svg class="view-toggle-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h6v6H3zm8 0h6v6h-6zm8 0h6v6h-6zM3 11h6v6H3zm8 0h6v6h-6zm8 0h6v6h-6z"/>
            </svg>
            Grid View
        `;
        
        toggleContainer.appendChild(toggleBtn);
        return toggleContainer;
    }

    // Toggle between normal and compact view
    toggleView() {
        this.isCompactView = !this.isCompactView;
        this.saveViewPreference();
        this.updateViewToggleButton();
        this.switchViewDisplay();
    }

    // Update toggle button appearance
    updateViewToggleButton() {
        const toggleBtn = document.querySelector('.view-toggle-btn');
        if (toggleBtn) {
            if (this.isCompactView) {
                toggleBtn.classList.add('active');
                toggleBtn.innerHTML = `
                    <svg class="view-toggle-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                    </svg>
                    List View
                `;
            } else {
                toggleBtn.classList.remove('active');
                toggleBtn.innerHTML = `
                    <svg class="view-toggle-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 3h6v6H3zm8 0h6v6h-6zm8 0h6v6h-6zM3 11h6v6H3zm8 0h6v6h-6zm8 0h6v6h-6z"/>
                    </svg>
                    Grid View
                `;
            }
        }
    }

    // Switch between view displays
    switchViewDisplay() {
        const normalContainer = document.getElementById('accounts-list');
        const compactContainer = document.querySelector('.compact-accounts-container');
        
        if (this.isCompactView) {
            if (normalContainer) normalContainer.style.display = 'none';
            if (compactContainer) {
                compactContainer.classList.add('active');
                this.renderCompactView();
            } else {
                this.createCompactContainer();
            }
        } else {
            if (normalContainer) normalContainer.style.display = 'block';
            if (compactContainer) compactContainer.classList.remove('active');
        }
    }

    // Create compact container
    createCompactContainer() {
        const container = document.createElement('div');
        container.className = 'compact-accounts-container active';
        
        // Add after the accounts list
        const accountsList = document.getElementById('accounts-list');
        if (accountsList) {
            accountsList.parentNode.insertBefore(container, accountsList.nextSibling);
            this.renderCompactView();
        }
    }

    // Set accounts data with proper initialization
    setAccounts(accounts, currentUser) {
        this.accounts = accounts;
        this.currentUser = currentUser;
        
        // Always render compact view if it's active, regardless of when called
        if (this.isCompactView) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                this.renderCompactView();
            }, 100);
        }
    }

    // Filter active accounts only
    getActiveAccounts() {
        return this.accounts.filter(doc => {
            const account = doc.data();
            const currentPnL = account.currentBalance - account.accountSize;
            const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
            const isBreached = currentPnL < -maxDrawdownAmount;
            return account.status === 'active' && !isBreached;
        });
    }

    // Render compact view
    renderCompactView() {
        const container = document.querySelector('.compact-accounts-container');
        if (!container) return;

        const activeAccounts = this.getActiveAccounts();
        
        if (activeAccounts.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        // Group accounts by phase
        const groupedAccounts = this.groupAccountsByPhase(activeAccounts);
        
        const sectionsHtml = this.renderPhaseGroups(groupedAccounts);
        
        container.innerHTML = sectionsHtml;
    }

    // Group accounts by phase
    groupAccountsByPhase(accounts) {
        const groups = {
            'Funded': [],
            'Challenge Phase 2': [],
            'Challenge Phase 1': []
        };

        accounts.forEach(doc => {
            const account = doc.data();
            if (groups[account.phase]) {
                groups[account.phase].push(doc);
            }
        });

        return groups;
    }

    // Render phase groups
    renderPhaseGroups(groupedAccounts) {
        const phaseOrder = ['Funded', 'Challenge Phase 2', 'Challenge Phase 1'];
        const phaseDisplayNames = {
            'Funded': 'Funded',
            'Challenge Phase 2': 'Phase 2', 
            'Challenge Phase 1': 'Phase 1'
        };

        return phaseOrder.map(phase => {
            const accounts = groupedAccounts[phase];
            if (accounts.length === 0) return '';

            const cardsHtml = accounts.map(doc => this.renderCompactCard(doc)).join('');
            
            return `
                <div class="phase-section">
                    <div class="phase-header">
                        <h3 class="phase-title">${phaseDisplayNames[phase]}</h3>
                        <div class="phase-count">${accounts.length} account${accounts.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="compact-accounts-grid">
                        ${cardsHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render compact header
    renderCompactHeader(accountCount) {
        return `
            <div class="compact-view-header">
                <h3 class="compact-view-title">Active Accounts Overview</h3>
                <div class="compact-view-stats">
                    <div class="compact-stat">
                        <span>Total:</span>
                        <span class="compact-stat-value">${accountCount}</span>
                    </div>
                    <div class="compact-stat">
                        <span>View:</span>
                        <span class="compact-stat-value">Grid Mode</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Render compact card (updated without phase badge, with daily P&L and upgrade logic)
    renderCompactCard(doc) {
        const account = doc.data();
        const accountId = doc.id;
        
        const firmInitials = account.firmName.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
        const displayName = account.alias ? `${account.alias}-${account.firmName}` : account.firmName;
        
        const currentPnL = account.currentBalance - account.accountSize;
        const balanceClass = currentPnL >= 0 ? 'positive' : currentPnL < 0 ? 'negative' : '';
        
        // Get daily P&L (assuming it's stored in account._dailyPnL)
        const dailyPnL = account._dailyPnL || 0;
        const dailyPnLClass = dailyPnL >= 0 ? 'positive' : dailyPnL < 0 ? 'negative' : '';
        
        // Check if account can be upgraded (reached profit target)
        const canUpgrade = this.checkCanUpgrade(account);
        
        // Determine button type and action
        let buttonHtml;
        if (canUpgrade) {
            buttonHtml = `<button class="compact-upgrade-btn" onclick="event.stopPropagation(); upgradeAccount('${accountId}', '${account.firmName}', ${account.accountSize}, '${account.phase}')">Upgrade</button>`;
        } else {
            buttonHtml = `<button class="compact-trade-btn">Trade</button>`;
        }
        
        return `
            <div class="compact-account-card" 
                 data-account-id="${accountId}"
                 data-current-balance="${account.currentBalance}"
                 data-firm-name="${account.firmName}">
                
                <div class="compact-header">
                    <div class="compact-firm-info">
                        <div class="compact-firm-logo">${firmInitials}</div>
                        <div class="compact-firm-name" title="${displayName}">${displayName}</div>
                    </div>
                    <div class="compact-daily-pnl ${dailyPnLClass}">
                        ${dailyPnL >= 0 ? '+' : ''}${dailyPnL.toLocaleString()}
                    </div>
                </div>
                
                <div class="compact-balance-row">
                    <div class="compact-balance ${balanceClass}">${account.currentBalance.toLocaleString()}</div>
                    ${buttonHtml}
                </div>
            </div>
        `;
    }

    // Check if account can be upgraded
    checkCanUpgrade(account) {
        if (account.phase === 'Funded') return false; // Already funded
        if (account.status !== 'active') return false; // Must be active
        
        const currentPnL = account.currentBalance - account.accountSize;
        const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
        const isBreached = currentPnL < -maxDrawdownAmount;
        
        if (isBreached) return false; // Can't upgrade if breached
        
        // Check if reached profit target
        return currentPnL >= (account.profitTargetAmount || 0);
    }

    // Render empty state
    renderEmptyState() {
        return `
            <div class="compact-empty-state">
                <h3>No Active Accounts</h3>
                <p>You don't have any active accounts to display in grid view.</p>
                <p>Add some accounts or switch to the regular view to see all your accounts.</p>
            </div>
        `;
    }

    // Open account dashboard
    openAccountDashboard(accountId) {
        window.location.href = `pages/account-dashboard.html?id=${accountId}`;
    }

    // Get current view state
    isInCompactView() {
        return this.isCompactView;
    }

    // Force refresh compact view
    refresh() {
        if (this.isCompactView) {
            this.renderCompactView();
        }
    }

    // Initialize with existing accounts (called from main app)
    initialize(accounts, currentUser) {
        this.accounts = accounts;
        this.currentUser = currentUser;
        
        // Add toggle button to filter section
        this.addToggleButtonToPage();
        
        // Apply saved view preference
        if (this.isCompactView) {
            this.switchViewDisplay();
        }
    }

    // Add toggle button to the page
    addToggleButtonToPage() {
        const filterSection = document.querySelector('.filter-section');
        if (filterSection && !document.querySelector('.view-toggle')) {
            const toggleElement = this.createViewToggleButton();
            filterSection.appendChild(toggleElement);
            this.updateViewToggleButton();
        }
    }

    // Update accounts when main app reloads data - Enhanced
    updateAccounts(accounts) {
        this.accounts = accounts;
        if (this.isCompactView) {
            // Force re-render with fresh data
            setTimeout(() => {
                this.renderCompactView();
            }, 50);
        }
    }
}

// Create and export singleton instance
const compactView = new CompactView();
export default compactView;