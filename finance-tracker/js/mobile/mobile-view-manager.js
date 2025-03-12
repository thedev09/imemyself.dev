// mobile-view-manager.js - Central manager for mobile views
(function() {
    // Available views and their states
    const mobileViews = {
      dashboard: {
        id: 'mobile-dashboard',
        initialized: false,
        active: false
      },
      transactions: {
        id: 'mobile-transactions-view',
        initialized: false,
        active: false
      },
      analytics: {
        id: 'mobile-analytics-view',
        initialized: false,
        active: false
      },
      settings: {
        id: 'mobile-settings-view',
        initialized: false,
        active: false
      }
    };
    
    // Check if we're on mobile
    function isMobile() {
      return window.innerWidth <= 768;
    }
    
    // Initialize a specific view if needed
    function initializeView(viewName) {
      if (!mobileViews[viewName]) return false;
      
      // Each view has its own initialization function
      const initFunctions = {
        dashboard: window.initMobileDashboard,
        transactions: window.initMobileTransactions,
        settings: window.initMobileSettings,
        analytics: window.initMobileAnalytics // This may not exist yet
      };
      
      if (typeof initFunctions[viewName] === 'function') {
        // Mark the view as initialized
        mobileViews[viewName].initialized = true;
        console.log(`Mobile view manager: Initializing ${viewName} view`);
        
        // Call the view's specific initialization function
        initFunctions[viewName]();
        return true;
      }
      
      return false;
    }
    
    // Show a specific view and hide others
    // Show a specific view and hide others
  function switchToView(viewName) {
    // Only proceed if we're on mobile
    if (!isMobile()) return;
    
    console.log(`Mobile view manager: Switching to ${viewName} view`);
    
    // Hide all views first
    Object.keys(mobileViews).forEach(view => {
      const viewElement = document.getElementById(mobileViews[view].id);
      if (viewElement) {
        viewElement.style.display = 'none';
        mobileViews[view].active = false;
      }
    });
    
    // Initialize the view if needed
    if (!mobileViews[viewName].initialized) {
      initializeView(viewName);
    }
    
    // Show the target view
    const viewElement = document.getElementById(mobileViews[viewName].id);
    if (viewElement) {
      viewElement.style.display = 'block';
      mobileViews[viewName].active = true;
    } else {
      console.error(`Mobile view manager: Element for ${viewName} view not found`);
    }
    
    // Always hide the desktop content when on mobile
    document.getElementById('settings-view').style.display = 'none';
    document.getElementById('transactions-view').style.display = 'none';
    document.getElementById('analytics-view').style.display = 'none';
    
    // Hide desktop navigation
    const topNavs = document.querySelectorAll('nav.nav, .tab-buttons, nav:not(.mobile-nav)');
    topNavs.forEach(nav => {
      nav.style.display = 'none';
    });
    
    // Make sure body has mobile class
    document.body.classList.add('mobile-view');
    
    // Update all navigation menus
    updateMobileNavigation(viewName);
    }
    
    // Update all navigation indicators
    function updateMobileNavigation(activeView) {
      // Update navigation in each view
      document.querySelectorAll('.mobile-nav-item').forEach(navItem => {
        const itemView = navItem.getAttribute('data-view');
        navItem.classList.toggle('active', itemView === activeView);
      });
    }
    
    // Cleanup views when switching to desktop
    function cleanupMobileViews() {
      Object.keys(mobileViews).forEach(view => {
        const viewElement = document.getElementById(mobileViews[view].id);
        if (viewElement) {
          viewElement.style.display = 'none';
        }
        mobileViews[view].active = false;
      });
      
      // Remove mobile class from body
      document.body.classList.remove('mobile-view');
    }
    
    // Override the main switchView function to integrate with our system
    const originalSwitchView = window.switchView;
    window.switchView = function(view) {
      // Call original method to handle desktop switching
      originalSwitchView(view);
      
      // Apply our mobile view management
      if (isMobile()) {
        switchToView(view);
      } else {
        cleanupMobileViews();
      }
    };
    
    // Add resize handler to switch between mobile and desktop
    window.addEventListener('resize', function() {
      const activeView = state.currentView;
      
      if (isMobile()) {
        switchToView(activeView);
      } else {
        cleanupMobileViews();
        // Re-enable desktop view
        document.getElementById(`${activeView}-view`).style.display = 'block';
      }
    });
    
    // Initialize manager on page load
    document.addEventListener('DOMContentLoaded', function() {
      console.log("Mobile view manager initializing");
      
      // Apply current view on load if we're on mobile
      if (isMobile()) {
        // Give a short delay to ensure other scripts have initialized
        setTimeout(() => {
          switchToView(state.currentView);
        }, 100);
      }
    });
    
    // Make functions globally available
    window.mobileViewManager = {
      switchToView,
      initializeView,
      isMobile,
      cleanupMobileViews
    };
  })();