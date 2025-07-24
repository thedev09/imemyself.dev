// Fixed activity.js - Activity/History page functionality
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    collection, 
    query, 
    where, 
    getDocs 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import activityLogger from './activity-logger.js';

// DOM elements
const timePeriodSelect = document.getElementById('time-period');
const periodTotalEl = document.getElementById('period-total');
const periodTradesEl = document.getElementById('period-trades');
const periodAccountsEl = document.getElementById('period-accounts');
const periodUpgradesEl = document.getElementById('period-upgrades');
const periodPayoutsEl = document.getElementById('period-payouts');
const periodBreachesEl = document.getElementById('period-breaches');
const activityFeedEl = document.getElementById('activity-feed');
const refreshBtn = document.getElementById('refresh-activities');
const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreBtn = document.getElementById('load-more-btn');

let currentUser = null;
let allActivities = [];
let displayedActivities = [];
let currentFilter = 'all';
let currentTimePeriod = 'week';
let itemsPerPage = 50;
let currentPage = 1;

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

        // Always load ALL activities
        const result = await activityLogger.loadActivitiesForUser(currentUser.uid, 0);
        console.log('Activity load result:', result);

        if (result.success) {
            allActivities = result.activities;
            console.log('Loaded activities:', allActivities.length);
            await updateSummaryStats(); // Make this async to load breach count
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

async function updateSummaryStats() {
    // Always show all-time stats in the summary
    const summary = {
        total: allActivities.length,
        trades: allActivities.filter(a => a.type === 'trade_added').length,
        accounts: allActivities.filter(a => a.type === 'account_created').length,
        upgrades: allActivities.filter(a => a.type === 'account_upgraded').length,
        payouts: allActivities.filter(a => a.type === 'payout_requested').length,
        breaches: 0 // Will be loaded from accounts collection
    };

    // Get actual breach count from accounts collection
    try {
        const breachedQuery = query(
            collection(db, 'accounts'),
            where('userId', '==', currentUser.uid),
            where('status', '==', 'breached')
        );
        const breachedSnapshot = await getDocs(breachedQuery);
        summary.breaches = breachedSnapshot.size;
        console.log(`Found ${summary.breaches} breached accounts`);
    } catch (error) {
        console.error('Error loading breach count:', error);
        // Fallback to activity logs
        summary.breaches = allActivities.filter(a => a.type === 'account_status_changed' && a.data?.toStatus === 'breached').length;
    }
    
    if (periodTotalEl) periodTotalEl.textContent = summary.total;
    if (periodTradesEl) periodTradesEl.textContent = summary.trades;
    if (periodAccountsEl) periodAccountsEl.textContent = summary.accounts;
    if (periodUpgradesEl) periodUpgradesEl.textContent = summary.upgrades;
    if (periodPayoutsEl) periodPayoutsEl.textContent = summary.payouts;
    if (periodBreachesEl) periodBreachesEl.textContent = summary.breaches;

    // Add animation to updated values
    [periodTotalEl, periodTradesEl, periodAccountsEl, periodUpgradesEl, periodPayoutsEl, periodBreachesEl].forEach(el => {
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

function displayActivities(resetPagination = true) {
    if (!activityFeedEl) {
        console.error('Activity feed element not found');
        return;
    }

    if (!allActivities || allActivities.length === 0) {
        showEmptyState();
        hideLoadMore();
        return;
    }

    // Filter by time period first
    let timeFilteredActivities = allActivities;
    if (currentTimePeriod !== 'all') {
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
        }
        
        timeFilteredActivities = allActivities.filter(activity => {
            const activityDate = activity.timestamp?.toDate?.() || new Date(activity.timestamp);
            return activityDate >= startDate;
        });
    }

    // Then filter by activity type
    const filteredActivities = currentFilter === 'all' 
        ? timeFilteredActivities 
        : timeFilteredActivities.filter(activity => activity.type === currentFilter);

    if (filteredActivities.length === 0) {
        const periodText = currentTimePeriod === 'all' ? '' : ` for ${currentTimePeriod}`;
        showEmptyState(`No ${getFilterDisplayName(currentFilter)} activities found${periodText}.`);
        hideLoadMore();
        return;
    }

    // Handle pagination
    if (resetPagination) {
        currentPage = 1;
        displayedActivities = [];
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const newActivities = filteredActivities.slice(startIndex, endIndex);
    
    if (resetPagination) {
        displayedActivities = newActivities;
    } else {
        displayedActivities = [...displayedActivities, ...newActivities];
    }

    console.log(`Displaying ${displayedActivities.length} of ${filteredActivities.length} activities`);

    // Generate HTML
    const activityHTML = activityLogger.generateActivityFeedHTML(displayedActivities, 0);
    activityFeedEl.innerHTML = activityHTML;

    // Show/hide load more button
    if (displayedActivities.length < filteredActivities.length) {
        showLoadMore();
    } else {
        hideLoadMore();
    }

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

function showLoadMore() {
    if (loadMoreContainer) {
        loadMoreContainer.style.display = 'flex';
    }
}

function hideLoadMore() {
    if (loadMoreContainer) {
        loadMoreContainer.style.display = 'none';
    }
}

function loadMoreActivities() {
    currentPage++;
    displayActivities(false); // Don't reset pagination
}

function getFilterDisplayName(filter) {
    const filterNames = {
        'trade_added': 'trade',
        'account_created': 'account creation',
        'account_upgraded': 'upgrade',
        'payout_requested': 'payout',
        'account_edited': 'edit',
        'account_status_changed': 'breach'
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
            displayActivities();
        });
    }
    
    // Activity type filter pills
    const filterPills = document.querySelectorAll('.filter-pill');
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

    // Load more button
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            console.log('Load more clicked');
            loadMoreActivities();
        });
    }

    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            console.log('Refresh clicked');
            refreshBtn.style.transform = 'rotate(360deg)';
            refreshBtn.style.transition = 'transform 0.5s ease';
            await loadActivities();
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 500);
        });
    }
}

// Global function for error state retry
window.loadActivities = loadActivities;

console.log('Activity page initialized');