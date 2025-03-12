// mobile-transactions.js - Handle mobile transactions page logic
(function() {
    // Variables to track pagination and state
    let currentPage = 1;
    const pageSize = 10;
    let filteredTransactions = [];
    let mobileTransactionFilters = {
      dateRange: 'thisMonth',
      startDate: null,
      endDate: null,
      type: 'all',
      account: 'all',
      category: 'all',
      paymentMode: 'all'
    };
    
    // Check if we're on mobile
    function isMobile() {
      return window.innerWidth <= 768;
    }
    
    // Add this function to ensure the mobile navigation is always visible
function ensureMobileNavVisible() {
    if (!isMobile()) return;
    
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) {
      // Force display flex with important flag
      mobileNav.style.cssText = 'display: flex !important; z-index: 999 !important;';
    }
  }
  
  // Update your initMobileTransactions function to call this
  function initMobileTransactions() {
    if (!isMobile() || state.currentView !== 'transactions') {
      return;
    }
    
    console.log("Initializing mobile transactions view");
    
    // Force mobile navigation to be visible
    ensureMobileNavVisible();
    
      // Show mobile view, hide desktop view
  document.getElementById('transactions-view').style.display = 'none';
  document.body.classList.add('mobile-view');
  document.body.classList.add('transactions-active'); // Add this class
  
  // Check if mobile transactions container exists
  let mobileTransactionsView = document.getElementById('mobile-transactions-view');
  if (!mobileTransactionsView) {
    console.log("Creating mobile transactions view");
    createMobileTransactionsView();
  }
  
  // Setup navigation on the transactions view
  setupTransactionsNavigation();
    
    // Initialize filters
    initializeMobileFilters();
    
    // Apply initial filters
    applyMobileFilters();
    
    // Setup filter toggle
    setupFilterToggle();
    
    // Setup add transaction button
    setupAddTransactionButton();
    
    // Update active nav item
    updateMobileNavActive('transactions');
    
    // Ensure nav is visible one more time after everything is done
    setTimeout(ensureMobileNavVisible, 300);
  }
  
  // Add this new function to update the active nav tab
  function updateMobileNavActive(view) {
    const navItems = document.querySelectorAll('.mobile-nav-item');
    navItems.forEach(item => {
      const itemView = item.getAttribute('data-view');
      item.classList.toggle('active', itemView === view);
    });
  }
    
    // Create the mobile transactions view HTML
    function createMobileTransactionsView() {
        console.log("Creating mobile transactions view HTML");
        
        const mainContent = document.getElementById('mainContent');
        
        const mobileTransactionsHTML = `
          <div id="mobile-transactions-view" class="mobile-transactions-view">
            <div class="mobile-transactions-header">
              <h1 class="mobile-transactions-title">Transactions</h1>
              <button class="mobile-filter-toggle" id="mobile-filter-toggle">
                <i class="fas fa-filter"></i>
              </button>
            </div>
          
          <div class="mobile-stats-grid">
            <div class="mobile-stat-card">
              <div class="mobile-stat-label">Income</div>
              <div class="mobile-stat-value income" id="mobile-stat-income">₹0</div>
            </div>
            <div class="mobile-stat-card">
              <div class="mobile-stat-label">Expenses</div>
              <div class="mobile-stat-value expense" id="mobile-stat-expense">₹0</div>
            </div>
            <div class="mobile-stat-card">
              <div class="mobile-stat-label">Total Transactions</div>
              <div class="mobile-stat-value" id="mobile-stat-total">0</div>
            </div>
            <div class="mobile-stat-card">
              <div class="mobile-stat-label">Average</div>
              <div class="mobile-stat-value" id="mobile-stat-average">₹0</div>
            </div>
          </div>
          
          <div class="mobile-filters-section" id="mobile-filters-section">
            <div class="mobile-filter-group">
              <label class="mobile-filter-label">Date Range</label>
              <select id="mobile-filter-date" class="mobile-filter-select">
                <option value="thisMonth">This Month</option>
                <option value="thisWeek">This Week</option>
                <option value="thisYear">This Year</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
              
              <div id="mobile-custom-date-inputs" class="mobile-date-inputs" style="display: none;">
                <input type="date" id="mobile-filter-start-date" class="mobile-date-input">
                <input type="date" id="mobile-filter-end-date" class="mobile-date-input">
              </div>
            </div>
            
            <div class="mobile-filter-group">
              <label class="mobile-filter-label">Transaction Type</label>
              <select id="mobile-filter-type" class="mobile-filter-select">
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            
            <div class="mobile-filter-group">
              <label class="mobile-filter-label">Account</label>
              <select id="mobile-filter-account" class="mobile-filter-select">
                <option value="all">All Accounts</option>
                <!-- Will be populated by JavaScript -->
              </select>
            </div>
            
            <div class="mobile-filter-group">
              <label class="mobile-filter-label">Category</label>
              <select id="mobile-filter-category" class="mobile-filter-select">
                <option value="all">All Categories</option>
                <!-- Will be populated by JavaScript -->
              </select>
            </div>
            
            <div class="mobile-filter-actions">
              <button id="mobile-filter-reset" class="mobile-filter-reset">Reset</button>
              <button id="mobile-filter-apply" class="mobile-filter-apply">Apply Filters</button>
            </div>
          </div>
          
          <div id="mobile-transactions-list" class="mobile-transactions-list">
            <!-- Transactions will be rendered here -->
          </div>
          
          <button id="mobile-load-more" class="mobile-load-more" style="display: none;">
            Load More
          </button>
          
          <button id="mobile-add-transaction" class="mobile-fab">
            <i class="fas fa-plus"></i>
          </button>

          <div class="mobile-nav transactions-nav" id="transactions-mobile-nav">
        <a href="#" class="mobile-nav-item" data-view="dashboard">
          <i class="fas fa-home mobile-nav-icon"></i>
          <span>Home</span>
        </a>
        <a href="#" class="mobile-nav-item active" data-view="transactions">
          <i class="fas fa-list mobile-nav-icon"></i>
          <span>Transactions</span>
        </a>
        <a href="#" class="mobile-nav-item" data-view="analytics">
          <i class="fas fa-chart-line mobile-nav-icon"></i>
          <span>Analytics</span>
        </a>
        <a href="#" class="mobile-nav-item" data-view="settings">
          <i class="fas fa-cog mobile-nav-icon"></i>
          <span>Settings</span>
        </a>
      </div>
        </div>
      `;
      
      // Add to the main content
      mainContent.insertAdjacentHTML('beforeend', mobileTransactionsHTML);
  
  // Set up event listeners for the new navigation
  setupTransactionsNavigation();
    }

    function setupTransactionsNavigation() {
        const navItems = document.querySelectorAll('.transactions-nav .mobile-nav-item');
        navItems.forEach(item => {
          item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const view = this.getAttribute('data-view');
            if (view) {
              console.log("Mobile transactions navigation clicked for view:", view);
              
              // Update active tab
              navItems.forEach(tab => tab.classList.remove('active'));
              this.classList.add('active');
              
              // Switch view
              window.switchView(view);
            }
          });
        });
      }
    
    // Initialize the filter dropdowns
    function initializeMobileFilters() {
      console.log("Initializing mobile filters");
      
      // Populate account filter
      const accountSelect = document.getElementById('mobile-filter-account');
      if (accountSelect && state.accounts) {
        accountSelect.innerHTML = `
          <option value="all">All Accounts</option>
          ${state.accounts.map(acc => `
            <option value="${acc.id}">${escapeHtml(acc.name)}</option>
          `).join('')}
        `;
      }
      
      // Collect unique categories
      const categories = new Set();
      state.transactions.forEach(tx => {
        if (tx.category) categories.add(tx.category);
      });
      
      // Populate category filter
      const categorySelect = document.getElementById('mobile-filter-category');
      if (categorySelect) {
        categorySelect.innerHTML = `
          <option value="all">All Categories</option>
          ${[...categories].sort().map(cat => `
            <option value="${cat}">${escapeHtml(cat)}</option>
          `).join('')}
        `;
      }
      
      // Custom date range handling
      const dateRangeSelect = document.getElementById('mobile-filter-date');
      const customDateInputs = document.getElementById('mobile-custom-date-inputs');
      
      if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
          if (this.value === 'custom') {
            customDateInputs.style.display = 'grid';
            
            // Set default date range to current month
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            document.getElementById('mobile-filter-start-date').value = firstDay.toISOString().split('T')[0];
            document.getElementById('mobile-filter-end-date').value = lastDay.toISOString().split('T')[0];
          } else {
            customDateInputs.style.display = 'none';
          }
        });
      }
      
      // Reset filters button
      const resetButton = document.getElementById('mobile-filter-reset');
      if (resetButton) {
        resetButton.addEventListener('click', function() {
          // Reset all filter values
          document.getElementById('mobile-filter-date').value = 'thisMonth';
          document.getElementById('mobile-filter-type').value = 'all';
          document.getElementById('mobile-filter-account').value = 'all';
          document.getElementById('mobile-filter-category').value = 'all';
          
          // Hide custom date inputs
          customDateInputs.style.display = 'none';
          
          // Reset filter object
          mobileTransactionFilters = {
            dateRange: 'thisMonth',
            startDate: null,
            endDate: null,
            type: 'all',
            account: 'all',
            category: 'all',
            paymentMode: 'all'
          };
          
          // Apply filters and close filter section
          applyMobileFilters();
          toggleFilterSection(false);
        });
      }
      
      // Apply filters button
      const applyButton = document.getElementById('mobile-filter-apply');
      if (applyButton) {
        applyButton.addEventListener('click', function() {
          // Update filter values from inputs
          mobileTransactionFilters.dateRange = document.getElementById('mobile-filter-date').value;
          mobileTransactionFilters.type = document.getElementById('mobile-filter-type').value;
          mobileTransactionFilters.account = document.getElementById('mobile-filter-account').value;
          mobileTransactionFilters.category = document.getElementById('mobile-filter-category').value;
          
          // Handle custom date range
          if (mobileTransactionFilters.dateRange === 'custom') {
            mobileTransactionFilters.startDate = document.getElementById('mobile-filter-start-date').value;
            mobileTransactionFilters.endDate = document.getElementById('mobile-filter-end-date').value;
          } else {
            mobileTransactionFilters.startDate = null;
            mobileTransactionFilters.endDate = null;
          }
          
          // Apply filters and close filter section
          applyMobileFilters();
          toggleFilterSection(false);
        });
      }
    }
    
    // Toggle filter section visibility
    function toggleFilterSection(show) {
      const filterSection = document.getElementById('mobile-filters-section');
      if (filterSection) {
        if (show === undefined) {
          filterSection.classList.toggle('open');
        } else {
          show ? filterSection.classList.add('open') : filterSection.classList.remove('open');
        }
      }
    }
    
    // Setup filter toggle button
    function setupFilterToggle() {
      const filterToggle = document.getElementById('mobile-filter-toggle');
      if (filterToggle) {
        filterToggle.addEventListener('click', function() {
          toggleFilterSection();
        });
      }
    }

    // Add to your mobile-transactions.js file

// Improved modal closing function
function forceCloseMobileModal(modalId) {
    console.log("Force closing mobile modal:", modalId);
    
    // Find the modal element
    const modal = document.getElementById(modalId);
    if (!modal) {
      // Try finding any open modal with class mobile-modal-overlay
      const openModals = document.querySelectorAll('.mobile-modal-overlay');
      console.log("Found open modals:", openModals.length);
      
      openModals.forEach(openModal => {
        openModal.remove();
      });
      return;
    }
    
    // Remove without animation for reliability
    modal.remove();
    
    // Also check for any regular modals that might be open
    const regularModals = document.querySelectorAll('.modal-overlay');
    regularModals.forEach(regularModal => {
      regularModal.style.display = 'none';
      regularModal.remove();
    });
  }
  
  // Override the showMobileAddTransactionModal to use our custom version
  window.showMobileAddTransactionModal = function(preSelectedAccountId) {
    console.log("Showing custom mobile Add Transaction modal");
    
    // Create modal HTML with improved close handling
    const modalHTML = `
      <div class="mobile-modal-overlay" id="mobileAddTransactionModal">
        <div class="mobile-modal">
          <div class="mobile-modal-header">
            <h2>Add Transaction</h2>
            <button class="mobile-modal-close" onclick="forceCloseMobileModal('mobileAddTransactionModal')">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <!-- Rest of your add transaction form -->
          <div class="mobile-modal-body">
            <form id="mobileAddTransactionForm">
              <div class="mobile-segmented-control transaction-type-control">
                <input type="radio" id="mobileTypeExpense" name="type" value="expense" checked>
                <label for="mobileTypeExpense">Expense</label>
                
                <input type="radio" id="mobileTypeIncome" name="type" value="income">
                <label for="mobileTypeIncome">Income</label>
              </div>
              
              <!-- Amount field -->
              <div class="mobile-form-group">
                <label>Amount</label>
                <input type="number" name="amount" placeholder="0.00" step="0.01" min="0" required>
              </div>
              
              <!-- Account field -->
              <div class="mobile-form-group">
                <label>Account</label>
                <select name="account" required class="mobile-select">
                  <option value="">Select account</option>
                  ${state.accounts.map(acc => `
                    <option value="${acc.id}" ${acc.id === preSelectedAccountId ? 'selected' : ''}>
                      ${escapeHtml(acc.name)} (${formatCurrency(acc.balance, acc.currency)})
                    </option>
                  `).join('')}
                </select>
              </div>
              
              <!-- Category field -->
              <div class="mobile-form-group">
                <label>Category</label>
                <select name="category" required class="mobile-select" id="mobileCategorySelect">
                  <option value="">Select category</option>
                  ${TRANSACTION_CATEGORIES.expense.map(cat => `
                    <option value="${cat}">${cat}</option>
                  `).join('')}
                </select>
              </div>
              
              <!-- Payment Mode field -->
              <div class="mobile-form-group">
                <label>Payment Mode</label>
                <select name="paymentMode" required class="mobile-select" id="mobilePaymentModeSelect">
                  <option value="">Select payment mode</option>
                </select>
              </div>
              
              <!-- Description field -->
              <div class="mobile-form-group">
                <label>Description (Optional)</label>
                <input type="text" name="description" placeholder="What's this for?">
              </div>
              
              <div class="mobile-modal-actions">
                <button type="button" class="mobile-btn-secondary" onclick="forceCloseMobileModal('mobileAddTransactionModal')">Cancel</button>
                <button type="submit" class="mobile-btn-primary">Add Transaction</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  
    // Remove any existing modals
    forceCloseMobileModal('mobileAddTransactionModal');
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Set up event handlers
    setupMobileTransactionForm();
    
    // Add click handler for outside clicks
    const modal = document.getElementById('mobileAddTransactionModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === this) {
          forceCloseMobileModal('mobileAddTransactionModal');
        }
      });
    }
  };
  
  // Override the mobile add transaction button handler
  function setupAddTransactionButton() {
    const addButton = document.getElementById('mobile-add-transaction');
    if (addButton) {
      addButton.addEventListener('click', function() {
        window.showMobileAddTransactionModal();
      });
    }
  }
  
  // Setup the form handlers
  function setupMobileTransactionForm() {
    const form = document.getElementById('mobileAddTransactionForm');
    if (!form) return;
    
    // Transaction type change handler
    const typeRadios = form.querySelectorAll('input[name="type"]');
    typeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        updateMobileCategoryOptions(radio.value);
      });
    });
    
    // Account change handler for payment modes
    const accountSelect = form.querySelector('[name="account"]');
    if (accountSelect) {
      accountSelect.addEventListener('change', () => {
        const accountId = accountSelect.value;
        updateMobilePaymentModes(accountId);
      });
    }
    
    // Form submission handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const selectedType = form.querySelector('input[name="type"]:checked').value;
      
      try {
        const transaction = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type: selectedType,
          amount: parseFloat(formData.get('amount')),
          accountId: formData.get('account'),
          category: formData.get('category'),
          paymentMode: formData.get('paymentMode'),
          notes: formData.get('description') || ''
        };
        
        toggleLoading(true);
        await saveTransaction(transaction);
        forceCloseMobileModal('mobileAddTransactionModal');
        showToast('Transaction added successfully');
        await loadUserData(true);
      } catch (error) {
        console.error('Error adding transaction:', error);
        showToast(error.message || 'Error adding transaction', 'error');
      } finally {
        toggleLoading(false);
      }
    });
  }

  // Add this to your mobile-transactions.js file

// Create a mobile-friendly edit transaction modal
function showMobileEditTransactionModal(transactionId) {
    console.log("Showing mobile edit transaction modal for ID:", transactionId);
    
    const transaction = state.transactions.find(tx => tx.id === transactionId);
    if (!transaction) {
      showToast('Transaction not found', 'error');
      return;
    }
    
    const account = state.accounts.find(acc => acc.id === transaction.accountId);
    
    // Create modal HTML
    const modalHTML = `
      <div class="mobile-modal-overlay" id="mobileEditTransactionModal">
        <div class="mobile-modal">
          <div class="mobile-modal-header">
            <h2>Edit Transaction</h2>
            <button class="mobile-modal-close" onclick="forceCloseMobileModal('mobileEditTransactionModal')">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="mobile-modal-body">
            <form id="mobileEditTransactionForm">
              <!-- Transaction type -->
              <div class="mobile-segmented-control transaction-type-control">
                <input type="radio" id="mobileEditTypeIncome" name="type" value="income" ${transaction.type === 'income' ? 'checked' : ''}>
                <label for="mobileEditTypeIncome">Income</label>
                
                <input type="radio" id="mobileEditTypeExpense" name="type" value="expense" ${transaction.type === 'expense' ? 'checked' : ''}>
                <label for="mobileEditTypeExpense">Expense</label>
                
                ${transaction.type === 'transfer' ? `
                  <input type="radio" id="mobileEditTypeTransfer" name="type" value="transfer" checked disabled>
                  <label for="mobileEditTypeTransfer">Transfer</label>
                ` : ''}
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
                <!-- Amount field -->
                <div class="mobile-form-group">
                  <label>Amount</label>
                  <input type="number" name="amount" value="${transaction.amount}" step="0.01" min="0" required>
                </div>
                
                <!-- Account field -->
                <div class="mobile-form-group">
                  <label>Account</label>
                  <select name="account" required class="mobile-select" ${transaction.type === 'transfer' ? 'disabled' : ''}>
                    ${state.accounts.map(acc => `
                      <option value="${acc.id}" ${acc.id === transaction.accountId ? 'selected' : ''}>
                        ${escapeHtml(acc.name)}
                      </option>
                    `).join('')}
                  </select>
                </div>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
                <!-- Category field -->
                <div class="mobile-form-group">
                  <label>Category</label>
                  <select name="category" required class="mobile-select" id="mobileEditCategorySelect" ${transaction.type === 'transfer' ? 'disabled' : ''}>
                    <option value="">Select category</option>
                    ${TRANSACTION_CATEGORIES[transaction.type].map(cat => `
                      <option value="${cat}" ${cat === transaction.category ? 'selected' : ''}>${cat}</option>
                    `).join('')}
                  </select>
                </div>
                
                <!-- Payment Mode field -->
                <div class="mobile-form-group">
                  <label>Payment Mode</label>
                  <select name="paymentMode" required class="mobile-select" id="mobileEditPaymentModeSelect">
                    <option value="">Select payment mode</option>
                    ${account && PAYMENT_MODES[account.type.toLowerCase()] ? 
                      PAYMENT_MODES[account.type.toLowerCase()].map(mode => `
                        <option value="${mode}" ${mode === transaction.paymentMode ? 'selected' : ''}>${mode}</option>
                      `).join('') : ''}
                  </select>
                </div>
              </div>
              
              <!-- Notes field -->
              <div class="mobile-form-group" style="margin-top: 16px;">
                <label>Notes (Optional)</label>
                <input type="text" name="notes" value="${escapeHtml(transaction.notes || '')}" placeholder="Description">
              </div>
              
              <!-- Actions -->
              <div class="mobile-modal-actions" style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px;">
                <button type="button" class="mobile-btn-danger" onclick="deleteMobileTransaction('${transaction.id}')">
                  Delete
                </button>
                <button type="submit" class="mobile-btn-primary">
                  Update
                </button>
                <button type="button" class="mobile-btn-secondary" onclick="forceCloseMobileModal('mobileEditTransactionModal')">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    // Remove any existing modals first
    forceCloseMobileModal('mobileEditTransactionModal');
    forceCloseMobileModal('mobileTransactionDetailsModal');
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Setup form handlers
    setupMobileEditTransactionForm(transaction);
    
    // Add click handler for outside clicks
    const modal = document.getElementById('mobileEditTransactionModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === this) {
          forceCloseMobileModal('mobileEditTransactionModal');
        }
      });
    }
  }
  
  // Setup edit transaction form handlers
  function setupMobileEditTransactionForm(transaction) {
    const form = document.getElementById('mobileEditTransactionForm');
    if (!form) return;
    
    // Only setup type change handlers if not a transfer
    if (transaction.type !== 'transfer') {
      const typeRadios = form.querySelectorAll('input[name="type"]');
      typeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          updateMobileEditCategoryOptions(radio.value);
        });
      });
    }
    
    // Account change handler for payment modes
    const accountSelect = form.querySelector('[name="account"]');
    if (accountSelect && transaction.type !== 'transfer') {
      accountSelect.addEventListener('change', () => {
        const accountId = accountSelect.value;
        updateMobileEditPaymentModes(accountId);
      });
    }
    
    // Form submission handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      let selectedType = transaction.type;
      
      // Only get type from form if not a transfer
      if (transaction.type !== 'transfer') {
        selectedType = form.querySelector('input[name="type"]:checked').value;
      }
      
      try {
        const updatedTransaction = {
          ...transaction,
          type: selectedType,
          amount: parseFloat(formData.get('amount')),
          accountId: transaction.type === 'transfer' ? transaction.accountId : formData.get('account'),
          category: transaction.type === 'transfer' ? transaction.category : formData.get('category'),
          paymentMode: formData.get('paymentMode'),
          notes: formData.get('notes') || ''
        };
        
        toggleLoading(true);
        
        // Use existing updateTransaction if available, otherwise fallback
        if (typeof window.updateTransaction === 'function') {
          await window.updateTransaction(updatedTransaction);
        } else {
          // Simple fallback implementation
          await window.saveTransaction(updatedTransaction);
        }
        
        forceCloseMobileModal('mobileEditTransactionModal');
        showToast('Transaction updated successfully');
        await loadUserData(true);
      } catch (error) {
        console.error('Error updating transaction:', error);
        showToast(error.message || 'Error updating transaction', 'error');
      } finally {
        toggleLoading(false);
      }
    });
  }
  
  // Update category options for edit form
  function updateMobileEditCategoryOptions(transactionType) {
    const categorySelect = document.getElementById('mobileEditCategorySelect');
    if (!categorySelect) return;
  
    const categories = TRANSACTION_CATEGORIES[transactionType] || [];
    
    categorySelect.innerHTML = `
      <option value="">Select a category</option>
      ${categories.map(category => `
        <option value="${category}">${category}</option>
      `).join('')}
    `;
  }
  
  // Update payment modes for edit form
  function updateMobileEditPaymentModes(accountId) {
    const paymentModeSelect = document.getElementById('mobileEditPaymentModeSelect');
    if (!paymentModeSelect) return;
  
    const account = state.accounts.find(acc => acc.id === accountId);
    if (!account) {
      paymentModeSelect.innerHTML = '<option value="">Select payment mode</option>';
      return;
    }
  
    const modes = PAYMENT_MODES[account.type.toLowerCase()] || [];
    
    paymentModeSelect.innerHTML = `
      <option value="">Select payment mode</option>
      ${modes.map(mode => `
        <option value="${mode}">${mode}</option>
      `).join('')}
    `;
  }
  
  // Override the edit transaction function from details modal
  function editMobileTransaction(transactionId) {
    // Close details modal first
    forceCloseMobileModal('mobileTransactionDetailsModal');
    
    // Show our mobile-friendly edit modal
    showMobileEditTransactionModal(transactionId);
  }

    
    // Apply filters and render transactions
    function applyMobileFilters() {
      console.log("Applying mobile filters:", mobileTransactionFilters);
      
      // Reset pagination
      currentPage = 1;
      
      // Filter transactions using the existing function
      filteredTransactions = window.filterTransactions(state.transactions, mobileTransactionFilters);
      
      // Render transactions
      renderMobileTransactions();
      
      // Update stats
      updateMobileTransactionStats();
    }
    
    // Render transactions to the mobile list
    function renderMobileTransactions() {
      console.log("Rendering mobile transactions");
      
      const container = document.getElementById('mobile-transactions-list');
      const loadMoreButton = document.getElementById('mobile-load-more');
      
      if (!container) return;
      
      // Check for empty state
      if (filteredTransactions.length === 0) {
        container.innerHTML = `
          <div class="mobile-empty-transactions">
            <p>No transactions found</p>
            <button class="mobile-add-transaction-btn" onclick="showMobileAddTransactionModal()">
              <i class="fas fa-plus"></i> Add Transaction
            </button>
          </div>
        `;
        loadMoreButton.style.display = 'none';
        return;
      }
      
      // Slice transactions for current page
      const startIndex = 0;
      const endIndex = currentPage * pageSize;
      const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
      
      // Generate HTML for transactions
      container.innerHTML = paginatedTransactions.map(tx => {
        const account = state.accounts.find(a => a.id === tx.accountId);
        const typeClass = tx.type === 'income' ? 'income' : tx.type === 'expense' ? 'expense' : 'transfer';
        const amountPrefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
        const icon = tx.type === 'income' ? 'arrow-down' : tx.type === 'expense' ? 'arrow-up' : 'exchange-alt';
        
        return `
          <div class="mobile-transaction-item" onclick="showMobileTransactionDetails('${tx.id}')">
            <div class="mobile-transaction-icon ${typeClass}">
              <i class="fas fa-${icon}"></i>
            </div>
            <div class="mobile-transaction-info">
              <div class="mobile-transaction-header">
                <div class="mobile-transaction-title">${escapeHtml(tx.category)}</div>
                <div class="mobile-transaction-amount ${typeClass}">
                  ${amountPrefix}${formatCurrency(Math.abs(tx.amount), account ? account.currency : 'INR')}
                </div>
              </div>
              <div class="mobile-transaction-details">
                <span>${formatDate(tx.date)}</span>
                ${account ? `
                  <span class="mobile-transaction-separator">•</span>
                  <span>${escapeHtml(account.name)}</span>
                ` : ''}
                ${tx.paymentMode ? `
                  <span class="mobile-transaction-separator">•</span>
                  <span>${escapeHtml(tx.paymentMode)}</span>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      // Show/hide load more button
      if (filteredTransactions.length > endIndex) {
        loadMoreButton.style.display = 'block';
        loadMoreButton.onclick = loadMoreTransactions;
      } else {
        loadMoreButton.style.display = 'none';
      }
    }
    
    // Load more transactions
    function loadMoreTransactions() {
      currentPage++;
      renderMobileTransactions();
    }
    
    // Update transaction stats
    function updateMobileTransactionStats() {
      const stats = window.calculateTransactionStats(filteredTransactions);
      
      document.getElementById('mobile-stat-total').textContent = stats.total.toLocaleString();
      document.getElementById('mobile-stat-income').textContent = formatCurrency(stats.income);
      document.getElementById('mobile-stat-expense').textContent = formatCurrency(stats.expense);
      document.getElementById('mobile-stat-average').textContent = formatCurrency(stats.avgTransaction);
    }
    
    // Show transaction details in a mobile modal
    function showMobileTransactionDetails(transactionId) {
        console.log("Showing details for transaction:", transactionId);
        
        // First close any existing modals
        forceCloseMobileModal('mobileAccountDetailsModal');
        forceCloseMobileModal('mobileTransactionDetailsModal');
        
        const transaction = state.transactions.find(tx => tx.id === transactionId);
        if (!transaction) {
            showToast('Transaction not found', 'error');
            return;
        }
        
        const account = state.accounts.find(acc => acc.id === transaction.accountId);
        const typeClass = transaction.type === 'income' ? 'income' : 
                        transaction.type === 'expense' ? 'expense' : 'transfer';
        const amountPrefix = transaction.type === 'income' ? '+' : 
                            transaction.type === 'expense' ? '-' : '';
        const icon = transaction.type === 'income' ? 'arrow-down' : 
                    transaction.type === 'expense' ? 'arrow-up' : 'exchange-alt';
        
        // Create modal HTML
        const modalHTML = `
          <div class="mobile-modal-overlay" id="mobileTransactionDetailsModal">
            <div class="mobile-modal">
              <div class="mobile-modal-header">
                <h2>Transaction Details</h2>
                <button class="mobile-modal-close" onclick="forceCloseMobileModal('mobileTransactionDetailsModal')">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              
              <div class="mobile-modal-body">
                <div style="text-align: center; margin-bottom: 20px;">
                  <div class="transaction-icon ${typeClass}" style="margin: 0 auto 12px; width: 60px; height: 60px; font-size: 24px;">
                    <i class="fas fa-${icon}"></i>
                  </div>
                  <div style="font-size: 24px; font-weight: 700; color: white; margin-bottom: 4px;">
                    ${amountPrefix}${formatCurrency(Math.abs(transaction.amount), account ? account.currency : 'INR')}
                  </div>
                  <div style="color: #94a3b8; font-size: 16px;">
                    ${escapeHtml(transaction.category)}
                  </div>
                </div>
                
                <div class="mobile-account-info">
                  <div class="info-row">
                    <div class="info-label">Date</div>
                    <div class="info-value">${formatDate(transaction.date)}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Account</div>
                    <div class="info-value">${escapeHtml(account ? account.name : 'Unknown Account')}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Type</div>
                    <div class="info-value" style="text-transform: capitalize">${transaction.type}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Payment Mode</div>
                    <div class="info-value">${escapeHtml(transaction.paymentMode || '-')}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Notes</div>
                    <div class="info-value">${escapeHtml(transaction.notes || '-')}</div>
                  </div>
                </div>
                
                <div class="mobile-modal-actions" style="margin-top: 24px;">
                  <button class="mobile-btn-secondary" onclick="editMobileTransaction('${transaction.id}')">
                    <i class="fas fa-edit"></i> Edit
                  </button>
                  <button class="mobile-btn-danger" onclick="deleteMobileTransaction('${transaction.id}')">
                    <i class="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add click handler for outside clicks
        const modal = document.getElementById('mobileTransactionDetailsModal');
        if (modal) {
          modal.addEventListener('click', function(e) {
            if (e.target === this) {
              forceCloseMobileModal('mobileTransactionDetailsModal');
            }
          });
        }
    }
    
    // Delete transaction from mobile
    function deleteMobileTransaction(transactionId) {
      if (confirm('Are you sure you want to delete this transaction? This cannot be undone.')) {
        // Close details modal first
        forceCloseMobileModal('mobileTransactionDetailsModal');
        
        // Use the existing delete transaction function
        if (typeof window.deleteTransaction === 'function') {
          window.deleteTransaction(transactionId).then(() => {
            // Refresh the transactions list
            applyMobileFilters();
          });
        }
      }
    }
    
// Update your switchView hook
const originalSwitchView = window.switchView;
window.switchView = function(view) {
  // Call original function
  originalSwitchView(view);
  
  if (isMobile()) {
    // Add or remove transactions-active class based on view
    if (view === 'transactions') {
      document.body.classList.add('transactions-active');
      initMobileTransactions();
    } else {
      document.body.classList.remove('transactions-active');
    }
    
    // Update active nav item
    updateMobileNavActive(view);
  }
};

function cleanupMobileTransactions() {
    document.body.classList.remove('transactions-active');
    
    // If we want to fully remove the view
    const mobileTransactionsView = document.getElementById('mobile-transactions-view');
    if (mobileTransactionsView) {
      mobileTransactionsView.remove();
    }
  }
  
  // Hook into loadUserData to refresh transactions when data changes
  const originalLoadUserData = window.loadUserData;
  window.loadUserData = async function(...args) {
    const result = await originalLoadUserData.apply(this, args);
    
    // Refresh transactions if we're on the mobile transactions view
    if (isMobile() && state.currentView === 'transactions') {
      // Short delay to ensure data is fully loaded
      setTimeout(() => {
        applyMobileFilters();
      }, 100);
    }
    
    return result;
  };
  
  // Make functions available globally
  window.initMobileTransactions = initMobileTransactions;
  window.applyMobileFilters = applyMobileFilters;
  window.showMobileTransactionDetails = showMobileTransactionDetails;
  window.editMobileTransaction = editMobileTransaction;
  window.deleteMobileTransaction = deleteMobileTransaction;
  window.forceCloseMobileModal = forceCloseMobileModal;
  
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function() {
    if (isMobile() && state.currentView === 'transactions') {
      initMobileTransactions();
    }
    
    // Add resize listener
    window.addEventListener('resize', function() {
      if (isMobile() && state.currentView === 'transactions') {
        initMobileTransactions();
      }
    });
  });
})();