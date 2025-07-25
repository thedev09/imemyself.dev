// PERFORMANCE OPTIMIZED Compact View Module
import { db } from './firebase-config.js';
import { doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class CompactView {
    constructor() {
        this.isCompactView = false;
        this.accounts = [];
        this.currentUser = null;
        this.lastRenderHash = null; // PERFORMANCE: Track if re-render is needed
        this.initializeEventListeners();
        this.loadViewPreference();
    }

    // PERFORMANCE: Optimized event listeners
    initializeEventListeners() {
        // Use event delegation for better performance
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-toggle-btn')) {
                this.toggleView();
                return;
            }
            
            const compactCard = e.target.closest('.compact-account-card');
            if (compactCard) {
                if (e.target.closest('.compact-trade-btn') || e.target.closest('.compact-upgrade-btn')) {
                    e.stopPropagation();
                    this.handleButtonClick(e, compactCard);
                } else {
                    const accountId = compactCard.dataset.accountId;
                    if (accountId) {
                        this.openAccountDashboard(accountId);
                    }
                }
            }
        });
    }

    // PERFORMANCE: Handle button clicks efficiently
    handleButtonClick(e, card) {
        const accountId = card.dataset.accountId;
        const currentBalance = parseFloat(card.dataset.currentBalance);
        const firmName = card.dataset.firmName;
        const alias = card.dataset.alias || '';
        
        if (e.target.closest('.compact-trade-btn') && typeof window.showTradeModal === 'function') {
            window.showTradeModal(accountId, currentBalance, firmName, alias);
        } else if (e.target.closest('.compact-upgrade-btn')) {
            const account = this.accounts.find(doc => doc.id === accountId)?.data();
            if (account && typeof window.upgradeAccount === 'function') {
                window.upgradeAccount(accountId, account.firmName, account.accountSize, account.phase);
            }
        }
    }

    loadViewPreference() {
        // ALWAYS default to big detailed cards (list view) on every page load
        // Never save or remember user preference - always reset to big cards
        this.isCompactView = false;
        
        // Clear any existing saved preference to ensure we always start fresh
        localStorage.removeItem('propone-view-preference');
    }

    saveViewPreference() {
        // DON'T save preferences - we want to always reset to big cards on refresh
        // localStorage.setItem('propone-view-preference', this.isCompactView ? 'compact' : 'normal');
    }

    createViewToggleButton() {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'view-toggle';
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = `view-toggle-btn ${this.isCompactView ? 'active' : ''}`;
        // Start with "Compact View" text since we default to big cards
        toggleBtn.innerHTML = `
            <svg class="view-toggle-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h6v6H3zm8 0h6v6h-6zm8 0h6v6h-6zM3 11h6v6H3zm8 0h6v6h-6zm8 0h6v6h-6z"/>
            </svg>
            Compact View
        `;
        
        toggleContainer.appendChild(toggleBtn);
        return toggleContainer;
    }

    toggleView() {
        this.isCompactView = !this.isCompactView;
        this.saveViewPreference();
        this.updateViewToggleButton();
        this.switchViewDisplay();
    }

    updateViewToggleButton() {
        const toggleBtn = document.querySelector('.view-toggle-btn');
        if (toggleBtn) {
            toggleBtn.className = `view-toggle-btn ${this.isCompactView ? 'active' : ''}`;
            toggleBtn.innerHTML = this.isCompactView ? `
                <svg class="view-toggle-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                </svg>
                Detailed View
            ` : `
                <svg class="view-toggle-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3h6v6H3zm8 0h6v6h-6zm8 0h6v6h-6zM3 11h6v6H3zm8 0h6v6h-6zm8 0h6v6h-6z"/>
                </svg>
                Compact View
            `;
        }
    }

    switchViewDisplay() {
        const normalContainer = document.getElementById('accounts-list');
        const compactContainer = document.querySelector('.compact-accounts-container');
        const allFilterPills = document.querySelectorAll('.filter-pill');
        
        if (this.isCompactView) {
            if (normalContainer) normalContainer.style.display = 'none';
            
            // Hide all filter pills except "Active"
            allFilterPills.forEach(pill => {
                if (pill.dataset.filter === 'active') {
                    pill.style.display = 'inline-block';
                    pill.classList.add('active');
                    pill.style.pointerEvents = 'none';
                    pill.style.opacity = '1';
                } else {
                    pill.style.display = 'none';
                    pill.classList.remove('active');
                }
            });
            
            if (compactContainer) {
                compactContainer.classList.add('active');
                this.renderCompactView();
            } else {
                this.createCompactContainer();
            }
        } else {
            if (normalContainer) normalContainer.style.display = 'block';
            
            // Show all filter pills and restore interactivity
            allFilterPills.forEach(pill => {
                pill.style.display = 'inline-block';
                pill.style.pointerEvents = 'auto';
                pill.style.opacity = '1';
            });
            
            if (compactContainer) compactContainer.classList.remove('active');
        }
    }

    createCompactContainer() {
        const container = document.createElement('div');
        container.className = 'compact-accounts-container active';
        
        const accountsList = document.getElementById('accounts-list');
        const allFilterPills = document.querySelectorAll('.filter-pill');
        
        if (accountsList) {
            accountsList.parentNode.insertBefore(container, accountsList.nextSibling);
            this.renderCompactView();
        }
        
        // Hide all filter pills except "Active"
        allFilterPills.forEach(pill => {
            if (pill.dataset.filter === 'active') {
                pill.style.display = 'inline-block';
                pill.classList.add('active');
                pill.style.pointerEvents = 'none';
                pill.style.opacity = '1';
            } else {
                pill.style.display = 'none';
                pill.classList.remove('active');
            }
        });
    }

    // PERFORMANCE: Check if re-render is needed
    shouldRerender(accounts) {
        const currentHash = JSON.stringify(accounts.map(doc => ({
            id: doc.id,
            balance: doc.data().currentBalance,
            dailyPnL: doc.data()._dailyPnL,
            phase: doc.data().phase,
            status: doc.data().status
        })));
        
        if (currentHash === this.lastRenderHash) {
            return false;
        }
        
        this.lastRenderHash = currentHash;
        return true;
    }

    // PERFORMANCE: Filter active accounts efficiently
    getActiveAccounts() {
        return this.accounts.filter(doc => {
            const account = doc.data();
            if (account.status !== 'active') return false;
            
            const currentPnL = account.currentBalance - account.accountSize;
            const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
            return currentPnL >= -maxDrawdownAmount;
        });
    }

    // PERFORMANCE: Optimized render function
    renderCompactView() {
        const container = document.querySelector('.compact-accounts-container');
        if (!container) return;

        // Check if re-render is needed
        if (!this.shouldRerender(this.accounts)) {
            return;
        }

        const activeAccounts = this.getActiveAccounts();
        
        if (activeAccounts.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        // PERFORMANCE: Group accounts efficiently
        const groupedAccounts = this.groupAccountsByPhase(activeAccounts);
        const sectionsHtml = this.renderPhaseGroups(groupedAccounts);
        
        container.innerHTML = sectionsHtml;
    }

    groupAccountsByPhase(accounts) {
        const groups = {
            'Funded': [],
            'Challenge Phase 2': [],
            'Challenge Phase 1': []
        };

        accounts.forEach(doc => {
            const phase = doc.data().phase;
            if (groups[phase]) {
                groups[phase].push(doc);
            }
        });

        return groups;
    }

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

    // PERFORMANCE: Optimized card rendering
    renderCompactCard(doc) {
        const account = doc.data();
        const accountId = doc.id;
        
        const firmInitials = account.firmName.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
        const displayName = account.alias ? `${account.alias}-${account.firmName}` : account.firmName;
        
        const currentPnL = account.currentBalance - account.accountSize;
        const balanceClass = currentPnL >= 0 ? 'positive' : (currentPnL < 0 ? 'negative' : '');
        
        const dailyPnL = account._dailyPnL || 0;
        const dailyPnLClass = dailyPnL >= 0 ? 'positive' : (dailyPnL < 0 ? 'negative' : '');
        
        const canUpgrade = this.checkCanUpgrade(account);
        
        const buttonHtml = canUpgrade ? 
            `<button class="compact-upgrade-btn">Upgrade</button>` :
            `<button class="compact-trade-btn">Trade</button>`;
        
        return `
            <div class="compact-account-card" 
                 data-account-id="${accountId}"
                 data-current-balance="${account.currentBalance}"
                 data-firm-name="${account.firmName}"
                 data-alias="${account.alias || ''}">
                
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

    checkCanUpgrade(account) {
        if (account.phase === 'Funded' || account.status !== 'active') return false;
        
        const currentPnL = account.currentBalance - account.accountSize;
        const maxDrawdownAmount = account.accountSize * (account.maxDrawdown / 100);
        
        return currentPnL >= -maxDrawdownAmount && currentPnL >= (account.profitTargetAmount || 0);
    }

    renderEmptyState() {
        return `
            <div class="compact-empty-state">
                <h3>No Active Accounts</h3>
                <p>You don't have any active accounts to display in grid view.</p>
                <p>Add some accounts or switch to the regular view to see all your accounts.</p>
            </div>
        `;
    }

    openAccountDashboard(accountId) {
        window.location.href = `pages/account-dashboard.html?id=${accountId}`;
    }

    isInCompactView() {
        return this.isCompactView;
    }

    initialize(accounts, currentUser) {
        this.accounts = accounts;
        this.currentUser = currentUser;
        this.lastRenderHash = null; // Reset render hash
        
        this.addToggleButtonToPage();
        
        if (this.isCompactView) {
            // Use requestAnimationFrame for non-blocking render
            requestAnimationFrame(() => {
                this.switchViewDisplay();
            });
        }
    }

    addToggleButtonToPage() {
        const filterSection = document.querySelector('.filter-section');
        if (filterSection && !document.querySelector('.view-toggle')) {
            const toggleElement = this.createViewToggleButton();
            filterSection.appendChild(toggleElement);
            this.updateViewToggleButton();
        }
    }

    // PERFORMANCE: Smart update - only re-render if needed
    updateAccounts(accounts) {
        this.accounts = accounts;
        
        if (this.isCompactView && this.shouldRerender(accounts)) {
            // Use requestAnimationFrame for smooth updates
            requestAnimationFrame(() => {
                this.renderCompactView();
            });
        }
    }
}

// Create and export singleton instance
const compactView = new CompactView();
export default compactView;