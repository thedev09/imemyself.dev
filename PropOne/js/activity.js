// Fixed activity.js - Activity/History page functionality
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import activityLogger from './activity-logger.js';

// DOM elements
const timePeriodSelect = document.getElementById('time-period');
const periodTotalEl = document.getElementById('period-total');
const periodTradesEl = document.getElementById('period-trades');
const periodAccountsEl = document.getElementById('period-accounts');
const periodUpgradesEl = document.getElementById('period-upgrades');
const activityFeedEl = document.getElementById('activity-feed');
const filterPills = document.querySelectorAll('.filter-pill');
const activityLimitSelect = document.getElementById('activity-limit');
const refreshBtn = document.getElementById('refresh-activities');

let currentUser = null;
let allActivities = [];
let currentFilter = 'all';
let currentTimePeriod = 'month';

// Initialize page
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        initializePage();
    } else {
        window.location.href = 'login.html';
    }
});

async function initializePage() {
    console.log('Initializing activity page for user:', currentUser.email);
    
    // Load activities immediately
    await loadActivities();
    
    // Setup event listeners
    setupEventListeners();
}

async function loadActivities() {
    if (!currentUser) return;

    try {
        console.log('Loading activities for user:', currentUser.uid);
        
        // Show loading state
        showLoadingState();

        const limit = parseInt(activityLimitSelect?.value) || 50;
        console.log('Loading with limit:', limit);
        
        const result = await activityLogger.loadActivitiesForUser(currentUser.uid, limit);
        console.log('Activity load result:', result);

        if (result.success) {
            allActivities = result.activities;
            console.log('Loaded activities:', allActivities.length);
            updateSummaryStats();
            displayActivities();
        } else {
            console.error('Error loading activities:', result.error);
            showErrorState('Error loading activities: ' + result.error);
        }
    } catch (error) {
        console.error('Error loading activities:', error);
        showErrorState('Failed to load activities');
    }
}

function updateSummaryStats() {
    const summary = getTimePeriodSummary(allActivities);
    
    if (periodTotalEl) periodTotalEl.textContent = summary.total;
    if (periodTradesEl) periodTradesEl.textContent = summary.trades;
    if (periodAccountsEl) periodAccountsEl.textContent = summary.accounts;
    if (periodUpgradesEl) periodUpgradesEl.textContent = summary.upgrades;

    // Add animation to updated values
    [periodTotalEl, periodTradesEl, periodAccountsEl, periodUpgradesEl].forEach(el => {
        if (el) {
            el.style.transform = 'scale(1.1)';
            el.style.transition = 'transform 0.3s ease';
            setTimeout(() => {
                el.style.transform = 'scale(1)';
            }, 300);
        }
    });
}

function getTimePeriodSummary(activities) {
    const now = new Date();
    let startDate;
    
    switch (currentTimePeriod) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        case 'all':
        default:
            startDate = new Date(0); // Beginning of time
            break;
    }
    
    const filteredActivities = activities.filter(activity => {
        const activityDate = activity.timestamp?.toDate?.() || new Date(activity.timestamp);
        return activityDate >= startDate;
    });

    const summary = {
        total: filteredActivities.length,
        trades: filteredActivities.filter(a => a.type === 'trade_added').length,
        accounts: filteredActivities.filter(a => a.type === 'account_created').length,
        upgrades: filteredActivities.filter(a => a.type === 'account_upgraded').length,
        payouts: filteredActivities.filter(a => a.type === 'payout_requested').length
    };

    console.log('Summary for', currentTimePeriod + ':', summary);
    return summary;
}

function displayActivities() {
    if (!activityFeedEl) {
        console.error('Activity feed element not found');
        return;
    }

    if (!allActivities || allActivities.length === 0) {
        showEmptyState();
        return;
    }

    // Filter activities
    const filteredActivities = currentFilter === 'all' 
        ? allActivities 
        : allActivities.filter(activity => activity.type === currentFilter);

    console.log('Displaying activities:', filteredActivities.length, 'of', allActivities.length);

    if (filteredActivities.length === 0) {
        showEmptyState(`No ${getFilterDisplayName(currentFilter)} activities found.`);
        return;
    }

    // Generate HTML
    const limit = currentFilter === 'all' ? 0 : 50; // Show all for filtered views
    const activityHTML = activityLogger.generateActivityFeedHTML(filteredActivities, limit);
    
    activityFeedEl.innerHTML = activityHTML;

    // Add fade-in animation
    const items = activityFeedEl.querySelectorAll('.activity-item');
    items.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        setTimeout(() => {
            item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

function showLoadingState() {
    if (activityFeedEl) {
        activityFeedEl.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading activities...</p>
            </div>
        `;
    }
}

function showEmptyState(message = 'No activities yet. Start by adding an account or making a trade!') {
    if (activityFeedEl) {
        activityFeedEl.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 15px;">📝</div>
                <p>${message}</p>
            </div>
        `;
    }
}

function showErrorState(message) {
    if (activityFeedEl) {
        activityFeedEl.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 15px;">❌</div>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="loadActivities()" style="margin-top: 15px;">
                    Try Again
                </button>
            </div>
        `;
    }
}

function getFilterDisplayName(filter) {
    const filterNames = {
        'trade_added': 'trade',
        'account_created': 'account creation',
        'account_upgraded': 'upgrade',
        'payout_requested': 'payout',
        'account_edited': 'edit',
        'account_status_changed': 'status change'
    };
    return filterNames[filter] || filter;
}

function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Time period selector
    if (timePeriodSelect) {
        timePeriodSelect.addEventListener('change', (e) => {
            currentTimePeriod = e.target.value;
            console.log('Time period changed to:', currentTimePeriod);
            updateSummaryStats();
            displayActivities();
        });
    }
    
    // Filter pills
    if (filterPills) {
        filterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                // Update active state
                filterPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                
                // Update current filter
                currentFilter = pill.dataset.filter;
                console.log('Filter changed to:', currentFilter);
                
                // Display filtered activities
                displayActivities();
            });
        });
    }

    // Activity limit selector
    if (activityLimitSelect) {
        activityLimitSelect.addEventListener('change', () => {
            console.log('Activity limit changed');
            loadActivities();
        });
    }

    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            console.log('Refresh clicked');
            refreshBtn.style.transform = 'rotate(180deg)';
            await loadActivities();
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 300);
        });
    }
}

// Global function for error state retry
window.loadActivities = loadActivities;

console.log('Activity page initialized');