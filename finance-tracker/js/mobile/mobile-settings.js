// mobile-settings.js - Handle mobile settings page logic
(function() {
    // Check if we're on mobile
    function isMobile() {
      return window.innerWidth <= 768;
    }
    
    // Initialize mobile settings
    // Initialize mobile settings
  function initMobileSettings() {
    if (!isMobile() || state.currentView !== 'settings') {
      return;
    }
    
    console.log("Initializing mobile settings view");
    
    // Check if mobile settings container exists
    let mobileSettingsView = document.getElementById('mobile-settings-view');
    if (!mobileSettingsView) {
      console.log("Creating mobile settings view");
      createMobileSettingsView();
    } else {
      // View exists, ensure it's visible
      mobileSettingsView.style.display = 'block';
    }
    
    // Hide desktop view explicitly
    document.getElementById('settings-view').style.display = 'none';
    
    // Hide desktop navigation
    const desktopNav = document.querySelector('.nav');
    if (desktopNav) {
      desktopNav.style.display = 'none';
    }
    
    // Hide main tab buttons
    const tabButtons = document.querySelector('.tab-buttons');
    if (tabButtons) {
      tabButtons.style.display = 'none';
    }
    
    // Update body class
    document.body.classList.add('mobile-view');
    
    // Update user profile information
    updateMobileUserProfile();
    
    // Setup event listeners
    setupMobileNameEdit();
    setupMobileDataButtons();
    setupMobileNavigation();
    
    // Update active nav item
    updateMobileNavActive('settings');
  }
    
    // Create the mobile settings view HTML
    function createMobileSettingsView() {
      console.log("Creating mobile settings view HTML");
      
      const mainContent = document.getElementById('mainContent');
      
      const mobileSettingsHTML = `
        <div id="mobile-settings-view" class="mobile-settings-view">
          <div class="mobile-settings-header">
            <h1 class="mobile-settings-title">Settings</h1>
          </div>
          
          <div class="mobile-profile-section">
            <div class="mobile-profile-header">
              <img id="mobileProfilePicture" src="" alt="Profile Picture" class="mobile-profile-picture">
              <div class="mobile-profile-name">
                <span id="mobileUserName">User</span>
                <button class="mobile-edit-name-btn" onclick="toggleMobileNameEdit()">
                  <i class="fas fa-edit"></i>
                </button>
              </div>
              <div id="mobileUserEmail" class="mobile-user-email">user@example.com</div>
              <div id="mobileAuthMethod" class="mobile-auth-method">
                <i class="fas fa-lock"></i>
                <span>Email/Password</span>
              </div>
              
              <form id="mobileNameEditForm" class="mobile-name-edit-form">
                <input type="text" id="mobileNewName" class="mobile-name-input" placeholder="Enter new name" required>
                <button type="submit" class="mobile-confirm-name-btn">Update Name</button>
              </form>
            </div>
          </div>
          
          <div class="mobile-data-section">
            <h2>Data Management</h2>
            <div class="mobile-data-actions">
              <button id="mobileExportBtn" class="mobile-export-btn">
                <i class="fas fa-download"></i>
                Export Data
              </button>
              <button id="mobileClearTransactionsBtn" class="mobile-clear-transactions-btn">
                <i class="fas fa-eraser"></i>
                Clear Transactions
              </button>
              <button id="mobileClearDataBtn" class="mobile-clear-data-btn">
                <i class="fas fa-trash"></i>
                Clear All Data
              </button>
            </div>
          </div>
          
          <div class="mobile-nav">
            <a href="#" class="mobile-nav-item" data-view="dashboard">
              <i class="fas fa-home mobile-nav-icon"></i>
              <span>Home</span>
            </a>
            <a href="#" class="mobile-nav-item" data-view="transactions">
              <i class="fas fa-list mobile-nav-icon"></i>
              <span>Transactions</span>
            </a>
            <a href="#" class="mobile-nav-item" data-view="analytics">
              <i class="fas fa-chart-line mobile-nav-icon"></i>
              <span>Analytics</span>
            </a>
            <a href="#" class="mobile-nav-item active" data-view="settings">
              <i class="fas fa-cog mobile-nav-icon"></i>
              <span>Settings</span>
            </a>
          </div>
        </div>
      `;
      
      // Add to the main content
      mainContent.insertAdjacentHTML('beforeend', mobileSettingsHTML);
    }
    
    // Update user profile information
    function updateMobileUserProfile() {
      const user = getCurrentUser();
      if (!user) return;
      
      console.log("Updating mobile user profile");
      
      // Update profile picture
      const profilePicture = document.getElementById('mobileProfilePicture');
      if (profilePicture) {
        profilePicture.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`;
        profilePicture.onerror = () => {
          profilePicture.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`;
        };
      }
      
      // Update name and email
      const userName = document.getElementById('mobileUserName');
      const userEmail = document.getElementById('mobileUserEmail');
      if (userName) userName.textContent = user.displayName || 'User';
      if (userEmail) userEmail.textContent = user.email;
      
      // Update auth method
      const authMethod = document.getElementById('mobileAuthMethod');
      if (authMethod) {
        // Get provider and icon
        const provider = user.providerData[0].providerId;
        let authMethodText = '';
        let authMethodIcon = '';
        
        // Set correct provider text and icon
        switch(provider) {
          case 'google.com':
            authMethodText = 'Google Account';
            authMethodIcon = '<i class="fab fa-google"></i>';
            break;
          case 'password':
            authMethodText = 'Email/Password';
            authMethodIcon = '<i class="fas fa-envelope"></i>';
            break;
          default:
            authMethodText = 'Email/Password';
            authMethodIcon = '<i class="fas fa-envelope"></i>';
        }
        
        authMethod.innerHTML = `${authMethodIcon} <span>${authMethodText}</span>`;
      }
      
      // Set current name in edit form
      const newNameInput = document.getElementById('mobileNewName');
      if (newNameInput) {
        newNameInput.value = user.displayName || '';
      }
    }
    
    // Toggle name edit form visibility
    function toggleMobileNameEdit() {
      const nameForm = document.querySelector('.mobile-name-edit-form');
      if (!nameForm) return;
      
      nameForm.classList.toggle('active');
      if (nameForm.classList.contains('active')) {
        document.getElementById('mobileNewName').focus();
      }
    }
    
    // Setup name edit functionality
    function setupMobileNameEdit() {
      const form = document.getElementById('mobileNameEditForm');
      if (!form) return;
      
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('mobileNewName').value.trim();
        
        if (!newName) {
          showToast('Please enter a valid name', 'error');
          return;
        }
        
        toggleLoading(true);
        try {
          const user = getCurrentUser();
          
          // Update Firebase Auth profile
          await user.updateProfile({
            displayName: newName
          });
          
          // Update user document in Firestore
          await db.collection('users').doc(user.uid).update({
            displayName: newName,
            updatedAt: new Date().toISOString()
          });
          
          // Update UI
          document.getElementById('mobileUserName').textContent = newName;
          document.getElementById('userName').textContent = newName; // Update desktop UI as well
          toggleMobileNameEdit();
          showToast('Name updated successfully!');
        } catch (error) {
          console.error('Error updating name:', error);
          showToast(error.message || 'Error updating name', 'error');
        } finally {
          toggleLoading(false);
        }
      });
    }
    
    // Setup data management buttons
    function setupMobileDataButtons() {
      // Export data button
      const exportBtn = document.getElementById('mobileExportBtn');
      if (exportBtn) {
        exportBtn.addEventListener('click', exportMobileUserData);
      }
      
      // Clear transactions button
      const clearTransactionsBtn = document.getElementById('mobileClearTransactionsBtn');
      if (clearTransactionsBtn) {
        clearTransactionsBtn.addEventListener('click', confirmClearMobileTransactions);
      }
      
      // Clear all data button
      const clearDataBtn = document.getElementById('mobileClearDataBtn');
      if (clearDataBtn) {
        clearDataBtn.addEventListener('click', confirmClearMobileData);
      }
    }
    
    // Export user data
    async function exportMobileUserData() {
      toggleLoading(true);
      try {
        const user = getCurrentUser();
        if (!user) throw new Error('Please sign in to continue');
        
        // Fetch all user data
        const userData = {
          profile: {
            email: user.email,
            displayName: user.displayName,
            createdAt: user.metadata.creationTime
          },
          accounts: state.accounts,
          transactions: state.transactions
        };
        
        // Convert to JSON and create blob
        const jsonData = JSON.stringify(userData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Data exported successfully!');
      } catch (error) {
        console.error('Error exporting data:', error);
        showToast(error.message || 'Error exporting data', 'error');
      } finally {
        toggleLoading(false);
      }
    }
    
    // Show confirmation modal for clearing transactions
    function confirmClearMobileTransactions() {
      showMobileConfirmationModal(
        'Clear Transactions',
        'Are you sure you want to clear all your transactions? This action cannot be undone. Your accounts and their current balances will remain unchanged.',
        clearMobileTransactions
      );
    }
    
    // Clear all transactions
    async function clearMobileTransactions() {
      toggleLoading(true);
      try {
        const user = getCurrentUser();
        if (!user) throw new Error('Please sign in to continue');
        
        const batch = db.batch();
        
        // Delete all transactions
        const transactionsSnapshot = await db.collection('users')
          .doc(user.uid)
          .collection('transactions')
          .get();
        
        transactionsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // Update user document
        batch.update(db.collection('users').doc(user.uid), {
          transactionsCleared: new Date().toISOString()
        });
        
        await batch.commit();
        
        // Clear local transactions state
        state.transactions = [];
        
        // Re-render UI
        await loadUserData(true);
        showToast('All transactions cleared successfully');
      } catch (error) {
        console.error('Error clearing transactions:', error);
        showToast(error.message || 'Error clearing transactions', 'error');
      } finally {
        toggleLoading(false);
      }
    }
    
    // Show confirmation modal for clearing all data
    function confirmClearMobileData() {
      showMobileConfirmationModal(
        'Clear All Data',
        'Are you sure you want to clear all your data? This will delete all your accounts and transactions. This action cannot be undone.',
        clearMobileAllData
      );
    }
    
    // Clear all user data
    async function clearMobileAllData() {
      toggleLoading(true);
      try {
        const user = getCurrentUser();
        if (!user) throw new Error('Please sign in to continue');
        
        const batch = db.batch();
        
        // Delete all accounts
        const accountsSnapshot = await db.collection('users')
          .doc(user.uid)
          .collection('accounts')
          .get();
        
        accountsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // Delete all transactions
        const transactionsSnapshot = await db.collection('users')
          .doc(user.uid)
          .collection('transactions')
          .get();
        
        transactionsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // Update user document
        batch.update(db.collection('users').doc(user.uid), {
          dataCleared: new Date().toISOString()
        });
        
        await batch.commit();
        
        // Clear local state
        state.accounts = [];
        state.transactions = [];
        
        // Re-render UI
        await loadUserData(true);
        showToast('All data cleared successfully');
      } catch (error) {
        console.error('Error clearing data:', error);
        showToast(error.message || 'Error clearing data', 'error');
      } finally {
        toggleLoading(false);
      }
    }
    
    // Show confirmation modal
    function showMobileConfirmationModal(title, message, confirmAction) {
      // Remove any existing modals
      const existingModal = document.querySelector('.mobile-confirmation-overlay');
      if (existingModal) {
        existingModal.remove();
      }
      
      const modalHTML = `
        <div class="mobile-confirmation-overlay">
          <div class="mobile-confirmation-modal">
            <div class="mobile-confirmation-header">
              <h2>${title}</h2>
            </div>
            <div class="mobile-confirmation-body">
              <div class="mobile-confirmation-icon">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <p>${message}</p>
            </div>
            <div class="mobile-confirmation-actions">
              <button class="mobile-cancel-btn">Cancel</button>
              <button class="mobile-confirm-btn">Confirm</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // Add event listeners
      const modal = document.querySelector('.mobile-confirmation-overlay');
      const cancelBtn = modal.querySelector('.mobile-cancel-btn');
      const confirmBtn = modal.querySelector('.mobile-confirm-btn');
      
      // Close modal on cancel
      cancelBtn.addEventListener('click', () => {
        modal.remove();
      });
      
      // Execute action on confirm
      confirmBtn.addEventListener('click', () => {
        modal.remove();
        if (typeof confirmAction === 'function') {
          confirmAction();
        }
      });
      
      // Close on outside click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
    }
    
    // Setup mobile navigation
    function setupMobileNavigation() {
      const navItems = document.querySelectorAll('#mobile-settings-view .mobile-nav-item');
      navItems.forEach(item => {
        item.addEventListener('click', function(e) {
          e.preventDefault();
          
          const view = this.getAttribute('data-view');
          if (view) {
            console.log("Mobile settings navigation clicked for view:", view);
            window.switchView(view);
          }
        });
      });
    }
    
    // Update active navigation item
    function updateMobileNavActive(view) {
      const navItems = document.querySelectorAll('#mobile-settings-view .mobile-nav-item');
      navItems.forEach(item => {
        const itemView = item.getAttribute('data-view');
        item.classList.toggle('active', itemView === view);
      });
    }
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
      console.log("DOMContentLoaded event fired for mobile settings");
      
      // Hook into data loading
      const originalLoadUserData = window.loadUserData;
      window.loadUserData = async function(...args) {
        console.log("loadUserData called");
        const result = await originalLoadUserData.apply(this, args);
        
        if (isMobile() && state.currentView === 'settings') {
          console.log("Refreshing mobile settings after data load");
          setTimeout(updateMobileUserProfile, 100);
        }
        
        return result;
      };
    });
    
    // Make functions globally available
    window.initMobileSettings = initMobileSettings;
    window.toggleMobileNameEdit = toggleMobileNameEdit;
    window.updateMobileUserProfile = updateMobileUserProfile;
    window.exportMobileUserData = exportMobileUserData;
    window.confirmClearMobileTransactions = confirmClearMobileTransactions;
    window.confirmClearMobileData = confirmClearMobileData;
    window.showMobileConfirmationModal = showMobileConfirmationModal;
  })();