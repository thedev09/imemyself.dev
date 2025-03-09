// mobile-dashboard.js - with mobile-only visibility toggle fix
(function() {
    // Check if we're on mobile
    function isMobile() {
      return window.innerWidth <= 768;
    }
    
    // Initialize mobile dashboard
    function initMobileDashboard() {
      console.log("Initializing mobile dashboard");
      
      if (!isMobile()) {
        console.log("Not mobile, skipping initialization");
        document.getElementById('mobile-dashboard').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.body.classList.remove('mobile-view');
        return;
      }
      
      console.log("Mobile device detected, setting up mobile view");
      
      // Only show mobile dashboard on dashboard view
      if (state.currentView === 'dashboard') {
        console.log("Current view is dashboard, showing mobile dashboard");
        const mobileDashboard = document.getElementById('mobile-dashboard');
        if (mobileDashboard) {
          mobileDashboard.style.display = 'block';
        }
        document.getElementById('mainContent').style.display = 'none';
        document.body.classList.add('mobile-view');
        
        // Update user info
        updateMobileUserInfo();
        
        // Check if portfolio summary exists and create/update it
        ensurePortfolioSummaryExists();
        
        // Update portfolio summary
        updateMobilePortfolio();
        
        // Render accounts
        renderMobileAccounts();
        
        // Render recent transactions
        renderMobileRecentTransactions();
        
        // Setup navigation
        setupMobileNavigation();
      } else {
        console.log("Current view is not dashboard, hiding mobile dashboard");
        document.getElementById('mobile-dashboard').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.body.classList.remove('mobile-view');
      }
    }
    
    // Ensure portfolio summary exists with correct structure
    function ensurePortfolioSummaryExists() {
      console.log("Ensuring portfolio summary exists");
      const mobileDashboard = document.getElementById('mobile-dashboard');
      if (!mobileDashboard) return;
      
      let portfolioSummary = mobileDashboard.querySelector('.portfolio-summary');
      
      // If it doesn't exist or needs to be recreated
      if (!portfolioSummary || portfolioSummary.querySelector('.total-portfolio-value') === null) {
        console.log("Creating new portfolio summary");
        
        // Remove existing if present but incomplete
        if (portfolioSummary) {
          portfolioSummary.remove();
        }
        
        // Create new portfolio summary with correct structure
        portfolioSummary = document.createElement('div');
        portfolioSummary.className = 'portfolio-summary mobile-portfolio';
        
        // Use existing visibility state if available, otherwise default to visible
        const isVisible = window.isPortfolioVisible ? window.isPortfolioVisible() : 
                        localStorage.getItem('portfolioVisible') !== 'false';
        const eyeIcon = isVisible ? 'eye' : 'eye-slash';
        
        portfolioSummary.innerHTML = `
          <div class="summary-header">
            <div class="summary-title">
              Total Portfolio Value
              <button class="toggle-visibility-btn" onclick="mobileTogglePortfolioVisibility()">
                <i class="fas fa-${eyeIcon}"></i>
              </button>
            </div>
          </div>
          <div class="total-portfolio-value" data-balance-value>₹0</div>
          
          <div class="currency-section">
            <div class="balance-card">
              <div class="balance-header">INR Balance</div>
              <div class="balance-amount" data-balance-value>₹0</div>
            </div>
            <div class="balance-card">
              <div class="balance-header">USD Balance</div>
              <div class="balance-amount" data-balance-value>$0.00</div>
            </div>
          </div>
        `;
        
        // Insert after profile info
        const profileInfo = mobileDashboard.querySelector('.profile-info-mobile');
        if (profileInfo) {
          profileInfo.after(portfolioSummary);
        } else {
          // If profile info doesn't exist, insert at beginning
          mobileDashboard.prepend(portfolioSummary);
        }
        
        console.log("New portfolio summary created and inserted");
      } else {
        console.log("Portfolio summary already exists");
      }
    }
    
    // Update user info in mobile header
    function updateMobileUserInfo() {
      const user = getCurrentUser();
      if (!user) return;
      
      console.log("Updating mobile user info");
      
      const avatar = document.getElementById('userAvatarMobile');
      const name = document.getElementById('userNameMobile');
      
      if (avatar) {
        avatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`;
        avatar.onerror = () => {
          avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`;
        };
      }
      
      if (name) {
        name.textContent = user.displayName || 'User';
      }
    }
    
    // Mobile-specific toggle portfolio visibility
    function mobileTogglePortfolioVisibility() {
      // Get current visibility state
      const currentState = localStorage.getItem('portfolioVisible') !== 'false';
      
      // Toggle and save the new state
      const newState = !currentState;
      localStorage.setItem('portfolioVisible', newState);
      
      // Update eye icon
      const toggleBtn = document.querySelector('.mobile-dashboard .toggle-visibility-btn i');
      if (toggleBtn) {
        toggleBtn.className = newState ? 'fas fa-eye' : 'fas fa-eye-slash';
      }
      
      // Update the display values
      updateMobilePortfolio();
      
      console.log("Mobile portfolio visibility toggled:", newState);
    }
    
    // Update portfolio summary for mobile with direct element targeting
    function updateMobilePortfolio() {
      console.log("Updating mobile portfolio");
      
      // Ensure portfolio summary exists
      ensurePortfolioSummaryExists();
      
      // Calculate totals from accounts
      const USD_TO_INR = 84; // Exchange rate
      let inrTotal = 0;
      let usdTotal = 0;
      
      state.accounts.forEach(account => {
        const balance = parseFloat(account.balance) || 0;
        if (account.currency === 'INR') {
          inrTotal += balance;
        } else if (account.currency === 'USD') {
          usdTotal += balance;
        }
      });
      
      const totalInINR = inrTotal + (usdTotal * USD_TO_INR);
      
      console.log("Portfolio values calculated:", {
        inrTotal,
        usdTotal,
        totalInINR
      });
      
      // Check if values should be visible
      const isVisible = localStorage.getItem('portfolioVisible') !== 'false';
      
      // Find elements
      const mobileDashboard = document.getElementById('mobile-dashboard');
      const portfolioSummary = mobileDashboard.querySelector('.portfolio-summary');
      
      if (!portfolioSummary) {
        console.error("Portfolio summary still not found after ensuring it exists");
        return;
      }
      
      // Make sure portfolio summary is always visible (container itself)
      portfolioSummary.style.display = 'block';
      portfolioSummary.style.visibility = 'visible';
      portfolioSummary.style.opacity = '1';
      
      // Update eye icon based on visibility state
      const eyeIcon = portfolioSummary.querySelector('.toggle-visibility-btn i');
      if (eyeIcon) {
        eyeIcon.className = isVisible ? 'fas fa-eye' : 'fas fa-eye-slash';
      }
      
      // Update total value
      const totalValue = portfolioSummary.querySelector('.total-portfolio-value');
      if (totalValue) {
        totalValue.textContent = isVisible ? formatCurrency(totalInINR) : '₹ XXXXX';
        console.log("Updated total portfolio value:", totalValue.textContent);
      } else {
        console.error("Total portfolio value element not found");
      }
      
      // Update INR balance
      const inrBalance = portfolioSummary.querySelector('.currency-section .balance-card:first-child .balance-amount');
      if (inrBalance) {
        inrBalance.textContent = isVisible ? 
          '₹' + formatIndianNumber(inrTotal) : '₹ XXXXX';
        console.log("Updated INR balance:", inrBalance.textContent);
      } else {
        console.error("INR balance element not found");
      }
      
      // Update USD balance
      const usdBalance = portfolioSummary.querySelector('.currency-section .balance-card:last-child .balance-amount');
      if (usdBalance) {
        usdBalance.textContent = isVisible ? 
          '$' + usdTotal.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }) : '$ XXXXX';
        console.log("Updated USD balance:", usdBalance.textContent);
      } else {
        console.error("USD balance element not found");
      }
      
      console.log("Portfolio summary updated with current values");
    }
    
    // Render accounts for mobile view
    function renderMobileAccounts() {
        console.log("Rendering mobile accounts");
        
        const accountsGrid = document.getElementById('mobile-accounts-grid');
        if (!accountsGrid) {
          console.error("Mobile accounts grid not found");
          return;
        }
        
        // Handle no accounts case
        if (!state.accounts.length) {
          accountsGrid.innerHTML = `
            <div class="empty-accounts">
              <p>No accounts yet</p>
              <button class="add-first-account" onclick="showMobileAddAccountModal()">
                <i class="fas fa-plus"></i> Add Your First Account
              </button>
            </div>
          `;
          return;
        }
        
        // Sort accounts by displayOrder
        const sortedAccounts = [...state.accounts].sort((a, b) => 
          (a.displayOrder || 0) - (b.displayOrder || 0)
        );
        
        // Render account cards without the add account card
        accountsGrid.innerHTML = sortedAccounts.map(account => `
          <div class="account-card ${account.type.toLowerCase()}" 
               data-account-id="${account.id}"
               onclick="showMobileAccountDetails('${account.id}')">
            <span class="account-type ${account.type.toLowerCase()}">${account.type}</span>
            <h3 class="account-name">${escapeHtml(account.name)}</h3>
            <div class="account-balance">
              ${formatCurrency(account.balance, account.currency)}
            </div>
          </div>
        `).join('');
        
        // Make sure the + button in the header is properly hooked up
        const addAccountBtn = document.querySelector('.add-account-btn');
        if (addAccountBtn) {
          addAccountBtn.onclick = () => showMobileAddAccountModal();
        }
      }



// Mobile modals system with improved UX
function showMobileAddAccountModal() {
    console.log("Showing mobile Add Account modal");
    
    // Create mobile-optimized modal HTML
    const modalHTML = `
      <div class="mobile-modal-overlay" id="mobileAddAccountModal">
        <div class="mobile-modal">
          <div class="mobile-modal-header">
            <h2>Add New Account</h2>
            <button class="mobile-modal-close" onclick="closeMobileModal('mobileAddAccountModal')">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="mobile-modal-body">
            <form id="mobileAddAccountForm">
              <div class="mobile-form-group">
                <label>Account Name</label>
                <input type="text" name="name" placeholder="Enter account name" required>
              </div>
              
              <div class="mobile-form-group">
                <label>Account Type</label>
                <div class="mobile-segmented-control">
                  <input type="radio" id="mobileTypeBank" name="type" value="bank" checked>
                  <label for="mobileTypeBank">Bank Account</label>
                  
                  <input type="radio" id="mobileTypeCrypto" name="type" value="crypto">
                  <label for="mobileTypeCrypto">Crypto Wallet</label>
                </div>
              </div>
              
              <div class="mobile-form-group">
                <label>Currency</label>
                <div class="mobile-segmented-control">
                  <input type="radio" id="mobileCurrencyINR" name="currency" value="INR" checked>
                  <label for="mobileCurrencyINR">INR</label>
                  
                  <input type="radio" id="mobileCurrencyUSD" name="currency" value="USD">
                  <label for="mobileCurrencyUSD">USD</label>
                </div>
              </div>
              
              <div class="mobile-form-group">
                <label>Initial Balance</label>
                <input type="number" name="balance" placeholder="0.00" step="0.01" min="0" required>
              </div>
              
              <div class="mobile-modal-actions">
                <button type="button" class="mobile-btn-secondary" onclick="closeMobileModal('mobileAddAccountModal')">Cancel</button>
                <button type="submit" class="mobile-btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  
    // Remove existing modal if any
    closeMobileModal('mobileAddAccountModal');
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  
    // Add form submission handler
    const form = document.getElementById('mobileAddAccountForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        
        toggleLoading(true);
        try {
          const account = {
            id: Date.now().toString(),
            name: formData.get('name'),
            type: formData.get('type'),
            currency: formData.get('currency'),
            balance: parseFloat(formData.get('balance')) || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await saveAccount(account);
          closeMobileModal('mobileAddAccountModal');
          showToast('Account created successfully!');
          await loadUserData(true);
        } catch (error) {
          console.error('Error saving account:', error);
          showToast(error.message || 'Error saving account', 'error');
        } finally {
          toggleLoading(false);
        }
      });
    }
  
    // Handle outside click
    const overlay = document.getElementById('mobileAddAccountModal');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeMobileModal('mobileAddAccountModal');
        }
      });
    }
  }
  
  // Mobile Transfer Modal
  function showMobileTransferModal() {
    console.log("Showing mobile Transfer modal");
    
    // Generate account options
    const accountOptions = state.accounts.map(account => ({
      id: account.id,
      name: account.name,
      balance: account.balance,
      currency: account.currency
    }));
    
    // Create mobile-optimized modal HTML
    const modalHTML = `
      <div class="mobile-modal-overlay" id="mobileTransferModal">
        <div class="mobile-modal">
          <div class="mobile-modal-header">
            <h2>Transfer Money</h2>
            <button class="mobile-modal-close" onclick="closeMobileModal('mobileTransferModal')">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="mobile-modal-body">
            <form id="mobileTransferForm">
              <div class="mobile-form-group">
                <label>From Account</label>
                <select name="fromAccount" required class="mobile-select">
                  <option value="">Select source account</option>
                  ${accountOptions.map(acc => `
                    <option value="${acc.id}">${escapeHtml(acc.name)} (${formatCurrency(acc.balance, acc.currency)})</option>
                  `).join('')}
                </select>
              </div>
              
              <div class="mobile-form-group">
                <label>To Account</label>
                <select name="toAccount" required class="mobile-select">
                  <option value="">Select destination account</option>
                  ${accountOptions.map(acc => `
                    <option value="${acc.id}">${escapeHtml(acc.name)} (${formatCurrency(acc.balance, acc.currency)})</option>
                  `).join('')}
                </select>
              </div>
              
              <div class="mobile-form-group">
                <label>Amount</label>
                <div class="mobile-input-with-icon">
                  <span class="mobile-currency-symbol"></span>
                  <input type="number" name="amount" placeholder="0.00" step="0.01" min="0" required>
                </div>
              </div>
              
              <div class="mobile-form-group" id="mobileConvertedAmountGroup" style="display: none;">
                <label>Converted Amount</label>
                <div class="mobile-converted-amount" id="mobileConvertedAmount"></div>
              </div>
              
              <div class="mobile-form-group">
                <label>Description (Optional)</label>
                <input type="text" name="description" placeholder="What's this transfer for?">
              </div>
              
              <div class="mobile-modal-actions">
                <button type="button" class="mobile-btn-secondary" onclick="closeMobileModal('mobileTransferModal')">Cancel</button>
                <button type="submit" class="mobile-btn-primary">Transfer Money</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  
    // Remove existing modal if any
    closeMobileModal('mobileTransferModal');
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  
    // Set up for converted amount calculation
    const form = document.getElementById('mobileTransferForm');
    if (form) {
      const fromSelect = form.querySelector('[name="fromAccount"]');
      const toSelect = form.querySelector('[name="toAccount"]');
      const amountInput = form.querySelector('[name="amount"]');
      const convertedGroup = document.getElementById('mobileConvertedAmountGroup');
      const convertedDisplay = document.getElementById('mobileConvertedAmount');
      
      // Update currency symbol based on selected account
      if (fromSelect) {
        fromSelect.addEventListener('change', () => {
          const selectedAccount = state.accounts.find(acc => acc.id === fromSelect.value);
          const currencySymbol = form.querySelector('.mobile-currency-symbol');
          if (selectedAccount && currencySymbol) {
            currencySymbol.textContent = selectedAccount.currency === 'USD' ? '$' : '₹';
          }
          updateConvertedAmount();
        });
      }
      
      // Calculate converted amount
      const updateConvertedAmount = () => {
        if (!fromSelect.value || !toSelect.value || !amountInput.value) {
          convertedGroup.style.display = 'none';
          return;
        }
        
        const fromAccount = state.accounts.find(acc => acc.id === fromSelect.value);
        const toAccount = state.accounts.find(acc => acc.id === toSelect.value);
        const amount = parseFloat(amountInput.value) || 0;
        
        if (fromAccount && toAccount && amount > 0 && fromAccount.currency !== toAccount.currency) {
          convertedGroup.style.display = 'block';
          
          const convertedAmount = calculateConvertedAmount(amount, fromAccount.id, toAccount.id);
          convertedDisplay.textContent = formatCurrency(convertedAmount, toAccount.currency);
        } else {
          convertedGroup.style.display = 'none';
        }
      };
      
      // Set up event listeners
      if (fromSelect) fromSelect.addEventListener('change', updateConvertedAmount);
      if (toSelect) toSelect.addEventListener('change', updateConvertedAmount);
      if (amountInput) amountInput.addEventListener('input', updateConvertedAmount);
      
      // Set up form submission
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const fromAccountId = formData.get('fromAccount');
        const toAccountId = formData.get('toAccount');
        const amount = parseFloat(formData.get('amount')) || 0;
        const description = formData.get('description') || '';
        
        // Validate
        if (fromAccountId === toAccountId) {
          showToast('Cannot transfer to the same account', 'error');
          return;
        }
        
        const fromAccount = state.accounts.find(acc => acc.id === fromAccountId);
        if (fromAccount && amount > fromAccount.balance) {
          showToast('Insufficient balance for transfer', 'error');
          return;
        }
        
        toggleLoading(true);
        try {
          await handleSelfTransfer(fromAccountId, toAccountId, amount, description);
          closeMobileModal('mobileTransferModal');
          showToast('Transfer completed successfully');
          await loadUserData(true);
        } catch (error) {
          console.error('Error processing transfer:', error);
          showToast(error.message || 'Error processing transfer', 'error');
        } finally {
          toggleLoading(false);
        }
      });
    }
  
    // Handle outside click
    const overlay = document.getElementById('mobileTransferModal');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeMobileModal('mobileTransferModal');
        }
      });
    }
  }
  
  // In mobile-dashboard.js
function showMobileAccountDetails(accountId) {
    console.log("Showing mobile account details for:", accountId);
    
    const account = state.accounts.find(acc => acc.id === accountId);
    if (!account) {
      showToast('Account not found', 'error');
      return;
    }
    
    // Get account transactions
    const transactions = state.transactions
      .filter(tx => tx.accountId === accountId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Create modal HTML with improved header design
    const modalHTML = `
      <div class="mobile-modal-overlay" id="mobileAccountDetailsModal">
        <div class="mobile-modal mobile-account-modal">
          <div class="mobile-account-header ${account.type.toLowerCase()}">
            <button class="mobile-modal-close light" onclick="closeMobileModal('mobileAccountDetailsModal')">
              <i class="fas fa-times"></i>
            </button>
            <div class="account-badge">${account.type}</div>
            <h2>${escapeHtml(account.name)}</h2>
            <div class="account-balance">${formatCurrency(account.balance, account.currency)}</div>
          </div>
          
          <div class="mobile-account-actions">
            <button class="mobile-action-btn" onclick="showMobileAddTransactionModal('${accountId}')">
              <i class="fas fa-plus"></i>
              <span>Add</span>
            </button>
            <button class="mobile-action-btn" onclick="showMobileEditAccountModal('${accountId}')">
              <i class="fas fa-edit"></i>
              <span>Edit</span>
            </button>
            <button class="mobile-action-btn" onclick="showMobileDeleteAccountModal('${accountId}')">
              <i class="fas fa-trash"></i>
              <span>Delete</span>
            </button>
          </div>
          
          <div class="mobile-modal-body">
            <div class="mobile-section-header">
              <h3>Recent Transactions</h3>
              ${transactions.length > 5 ? 
                `<button class="mobile-text-btn" onclick="showMobileAccountTransactions('${accountId}')">View All</button>` 
                : ''}
            </div>
            
            <div class="mobile-transactions-list">
              ${transactions.length > 0 ? 
                transactions.slice(0, 5).map(tx => {
                  const typeClass = tx.type === 'income' ? 'income' : tx.type === 'expense' ? 'expense' : 'transfer';
                  const prefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
                  const icon = tx.type === 'income' ? 'arrow-down' : tx.type === 'expense' ? 'arrow-up' : 'exchange-alt';
                  
                  return `
                    <div class="mobile-transaction-item">
                      <div class="transaction-icon ${typeClass}">
                        <i class="fas fa-${icon}"></i>
                      </div>
                      <div class="transaction-details">
                        <div class="transaction-header">
                          <div class="transaction-title">${escapeHtml(tx.category)}</div>
                          <div class="transaction-amount ${typeClass}">${prefix}${formatCurrency(Math.abs(tx.amount), account.currency)}</div>
                        </div>
                        <div class="transaction-subtext">
                          <span>${formatDate(tx.date)}</span>
                          ${tx.paymentMode ? `<span class="transaction-dot">•</span><span>${escapeHtml(tx.paymentMode)}</span>` : ''}
                          ${tx.notes ? `<span class="transaction-dot">•</span><span>${escapeHtml(tx.notes)}</span>` : ''}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('') 
                : '<div class="mobile-empty-state">No transactions for this account yet</div>'}
            </div>
            
            <div class="mobile-section-header">
              <h3>Account Info</h3>
            </div>
            
            <div class="mobile-account-info">
              <div class="info-row">
                <div class="info-label">Currency</div>
                <div class="info-value">${account.currency}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Created On</div>
                <div class="info-value">${formatDate(account.createdAt)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Last Updated</div>
                <div class="info-value">${formatDate(account.updatedAt)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  
    // Remove existing modal if any
    closeMobileModal('mobileAccountDetailsModal');
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
  
  // Helper function to render transaction list with consistent styling
  function renderMobileTransactionsList(transactions, account) {
    return transactions.map(tx => {
      const typeClass = tx.type === 'income' ? 'income' : tx.type === 'expense' ? 'expense' : 'transfer';
      const prefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
      const icon = tx.type === 'income' ? 'arrow-down' : tx.type === 'expense' ? 'arrow-up' : 'exchange-alt';
      
      return `
        <div class="mobile-transaction-item">
          <div class="transaction-icon ${typeClass}">
            <i class="fas fa-${icon}"></i>
          </div>
          <div class="transaction-details">
            <div class="transaction-primary">
              <span class="transaction-category">${escapeHtml(tx.category)}</span>
              <span class="transaction-amount ${typeClass}">${prefix}${formatCurrency(Math.abs(tx.amount), account.currency)}</span>
            </div>
            <div class="transaction-secondary">
              <span class="transaction-date">${formatDate(tx.date)}</span>
              ${tx.paymentMode ? `<span class="transaction-dot">•</span><span>${escapeHtml(tx.paymentMode)}</span>` : ''}
              ${tx.notes ? `<span class="transaction-dot">•</span><span class="transaction-notes">${escapeHtml(tx.notes)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // View all transactions for an account
  
  function showMobileAccountTransactions(accountId) {
    const account = state.accounts.find(acc => acc.id === accountId);
    if (!account) {
      showToast('Account not found', 'error');
      return;
    }
    
    // Get all account transactions
    const transactions = state.transactions
      .filter(tx => tx.accountId === accountId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Create modal HTML
    const modalHTML = `
      <div class="mobile-modal-overlay" id="mobileTransactionsModal">
        <div class="mobile-modal">
          <div class="mobile-modal-header">
            <h2>${escapeHtml(account.name)} Transactions</h2>
            <button class="mobile-modal-close" onclick="closeMobileModal('mobileTransactionsModal')">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="mobile-modal-body">
            <div class="mobile-transactions-list">
              ${transactions.length > 0 ? 
                transactions.map(tx => {
                  const typeClass = tx.type === 'income' ? 'income' : tx.type === 'expense' ? 'expense' : 'transfer';
                  const prefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
                  const icon = tx.type === 'income' ? 'arrow-down' : tx.type === 'expense' ? 'arrow-up' : 'exchange-alt';
                  
                  return `
                    <div class="mobile-transaction-item">
                      <div class="transaction-icon ${typeClass}">
                        <i class="fas fa-${icon}"></i>
                      </div>
                      <div class="transaction-details">
                        <div class="transaction-header">
                          <div class="transaction-title">${escapeHtml(tx.category)}</div>
                          <div class="transaction-amount ${typeClass}">${prefix}${formatCurrency(Math.abs(tx.amount), account.currency)}</div>
                        </div>
                        <div class="transaction-subtext">
                          <span>${formatDate(tx.date)}</span>
                          ${tx.paymentMode ? `<span class="transaction-dot">•</span><span>${escapeHtml(tx.paymentMode)}</span>` : ''}
                          ${tx.notes ? `<span class="transaction-dot">•</span><span>${escapeHtml(tx.notes)}</span>` : ''}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('') 
                : '<div class="mobile-empty-state">No transactions for this account yet</div>'}
            </div>
          </div>
        </div>
      </div>
    `;
  
    // Remove existing modal if any
    closeMobileModal('mobileTransactionsModal');
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  
    // Handle outside click
    const overlay = document.getElementById('mobileTransactionsModal');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeMobileModal('mobileTransactionsModal');
        }
      });
    }
  }
  
  
  // Add Transaction Modal
  function showMobileAddTransactionModal(preSelectedAccountId = null) {
    console.log("Showing mobile Add Transaction modal");
    
    // Create modal HTML
    const modalHTML = `
      <div class="mobile-modal-overlay" id="mobileAddTransactionModal">
        <div class="mobile-modal">
          <div class="mobile-modal-header">
            <h2>Add Transaction</h2>
            <button class="mobile-modal-close" onclick="closeMobileModal('mobileAddTransactionModal')">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="mobile-modal-body">
            <form id="mobileAddTransactionForm">
              <div class="mobile-segmented-control transaction-type-control">
                <input type="radio" id="mobileTypeExpense" name="type" value="expense" checked>
                <label for="mobileTypeExpense">Expense</label>
                
                <input type="radio" id="mobileTypeIncome" name="type" value="income">
                <label for="mobileTypeIncome">Income</label>
              </div>
              
              <div class="mobile-form-group">
                <label>Amount</label>
                <div class="mobile-input-with-icon">
                  <span class="mobile-currency-symbol"></span>
                  <input type="number" name="amount" placeholder="0.00" step="0.01" min="0" required>
                </div>
              </div>
              
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
              
              <div class="mobile-form-group">
                <label>Category</label>
                <select name="category" required class="mobile-select" id="mobileCategorySelect">
                  <option value="">Select category</option>
                  ${TRANSACTION_CATEGORIES.expense.map(cat => `
                    <option value="${cat}">${cat}</option>
                  `).join('')}
                </select>
              </div>
              
              <div class="mobile-form-group">
                <label>Payment Mode</label>
                <select name="paymentMode" required class="mobile-select" id="mobilePaymentModeSelect">
                  <option value="">Select payment mode</option>
                </select>
              </div>
              
              <div class="mobile-form-group">
                <label>Description (Optional)</label>
                <input type="text" name="description" placeholder="What's this for?">
              </div>
              
              <div class="mobile-modal-actions">
                <button type="button" class="mobile-btn-secondary" onclick="closeMobileModal('mobileAddTransactionModal')">Cancel</button>
                <button type="submit" class="mobile-btn-primary">Add Transaction</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  
    // Remove existing modal if any
    closeMobileModal('mobileAddTransactionModal');
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  
    // Set up transaction type toggle
    const form = document.getElementById('mobileAddTransactionForm');
    if (form) {
      const typeRadios = form.querySelectorAll('input[name="type"]');
      typeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          updateMobileCategoryOptions(radio.value);
        });
      });
      
      // Handle account selection for payment modes
      const accountSelect = form.querySelector('[name="account"]');
      if (accountSelect) {
        accountSelect.addEventListener('change', () => {
          const accountId = accountSelect.value;
          updateMobilePaymentModes(accountId);
        });
        
        // Initialize payment modes if account is pre-selected
        if (preSelectedAccountId) {
          updateMobilePaymentModes(preSelectedAccountId);
        }
      }
      
      // Set up form submission
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        
        try {
          const transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            accountId: formData.get('account'),
            category: formData.get('category'),
            paymentMode: formData.get('paymentMode'),
            notes: formData.get('description') || ''
          };
          
          toggleLoading(true);
          await saveTransaction(transaction);
          closeMobileModal('mobileAddTransactionModal');
          
          // Also refresh account details if it's open
          if (preSelectedAccountId) {
            const detailsModal = document.getElementById('mobileAccountDetailsModal');
            if (detailsModal) {
              closeMobileModal('mobileAccountDetailsModal');
              setTimeout(() => showMobileAccountDetails(preSelectedAccountId), 300);
            }
          }
          
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
  
    // Handle outside click
    const overlay = document.getElementById('mobileAddTransactionModal');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeMobileModal('mobileAddTransactionModal');
        }
      });
    }
  }
  
  // Update category options based on transaction type for mobile
  function updateMobileCategoryOptions(transactionType) {
    const categorySelect = document.getElementById('mobileCategorySelect');
    if (!categorySelect) return;
  
    const categories = TRANSACTION_CATEGORIES[transactionType] || [];
    
    categorySelect.innerHTML = `
      <option value="">Select a category</option>
      ${categories.map(category => `
        <option value="${category}">${category}</option>
      `).join('')}
    `;
  }


  function setupMobileSignOut() {
    const signOutBtn = document.getElementById('mobileSignOutBtn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', function() {
        // Call your existing signOut function
        if (typeof window.signOut === 'function') {
          window.signOut();
        }
      });
    }
  }
  
  // Update payment modes based on account type for mobile
  function updateMobilePaymentModes(accountId) {
    const paymentModeSelect = document.getElementById('mobilePaymentModeSelect');
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
    
    // Update currency symbol
    const form = paymentModeSelect.closest('form');
    if (form) {
      const currencySymbol = form.querySelector('.mobile-currency-symbol');
      if (currencySymbol) {
        currencySymbol.textContent = account.currency === 'USD' ? '$' : '₹';
      }
    }
  }
  
  // Edit Account Modal
  function showMobileEditAccountModal(accountId) {
    console.log("Showing mobile Edit Account modal for:", accountId);
    
    const account = state.accounts.find(acc => acc.id === accountId);
    if (!account) {
      showToast('Account not found', 'error');
      return;
    }
    
    // Create modal HTML
    const modalHTML = `
      <div class="mobile-modal-overlay" id="mobileEditAccountModal">
        <div class="mobile-modal">
          <div class="mobile-modal-header">
            <h2>Edit Account</h2>
            <button class="mobile-modal-close" onclick="closeMobileModal('mobileEditAccountModal')">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="mobile-modal-body">
            <form id="mobileEditAccountForm">
              <div class="mobile-form-group">
                <label>Account Name</label>
                <input type="text" name="name" value="${escapeHtml(account.name)}" required>
              </div>
              
              <div class="mobile-form-group">
                <label>Account Type</label>
                <div class="mobile-segmented-control">
                  <input type="radio" id="mobileEditTypeBank" name="type" value="bank" ${account.type === 'bank' ? 'checked' : ''}>
                  <label for="mobileEditTypeBank">Bank Account</label>
                  
                  <input type="radio" id="mobileEditTypeCrypto" name="type" value="crypto" ${account.type === 'crypto' ? 'checked' : ''}>
                  <label for="mobileEditTypeCrypto">Crypto Wallet</label>
                </div>
              </div>
              
              <div class="mobile-form-group">
                <label>Currency</label>
                <div class="mobile-segmented-control">
                  <input type="radio" id="mobileEditCurrencyINR" name="currency" value="INR" ${account.currency === 'INR' ? 'checked' : ''}>
                  <label for="mobileEditCurrencyINR">INR</label>
                  
                  <input type="radio" id="mobileEditCurrencyUSD" name="currency" value="USD" ${account.currency === 'USD' ? 'checked' : ''}>
                  <label for="mobileEditCurrencyUSD">USD</label>
                </div>
              </div>
              
              <div class="mobile-form-group">
                <label>Balance</label>
                <div class="mobile-input-with-icon">
                  <span class="mobile-currency-symbol">${account.currency === 'USD' ? '$' : '₹'}</span>
                  <input type="number" name="balance" value="${account.balance}" step="0.01" min="0" required>
                </div>
              </div>
              
              <div class="mobile-modal-actions">
                <button type="button" class="mobile-btn-secondary" onclick="closeMobileModal('mobileEditAccountModal')">Cancel</button>
                <button type="submit" class="mobile-btn-primary">Update Account</button>
              </div>
            </form>
          </div>
        </div

        </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  closeMobileModal('mobileEditAccountModal');
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Set up form submission
  const form = document.getElementById('mobileEditAccountForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      
      try {
        const updatedAccount = {
          ...account,
          name: formData.get('name'),
          type: formData.get('type'),
          currency: formData.get('currency'),
          balance: parseFloat(formData.get('balance')) || 0,
          updatedAt: new Date().toISOString()
        };
        
        toggleLoading(true);
        await saveAccount(updatedAccount);
        closeMobileModal('mobileEditAccountModal');
        
        // Also refresh account details if it's open
        const detailsModal = document.getElementById('mobileAccountDetailsModal');
        if (detailsModal) {
          closeMobileModal('mobileAccountDetailsModal');
          setTimeout(() => showMobileAccountDetails(accountId), 300);
        }
        
        showToast('Account updated successfully');
        await loadUserData(true);
      } catch (error) {
        console.error('Error updating account:', error);
        showToast(error.message || 'Error updating account', 'error');
      } finally {
        toggleLoading(false);
      }
    });
  }

  // Handle outside click
  const overlay = document.getElementById('mobileEditAccountModal');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeMobileModal('mobileEditAccountModal');
      }
    });
  }
}

// Delete Account Modal
function showMobileDeleteAccountModal(accountId) {
  console.log("Showing mobile Delete Account modal for:", accountId);
  
  const account = state.accounts.find(acc => acc.id === accountId);
  if (!account) {
    showToast('Account not found', 'error');
    return;
  }
  
  const transactions = state.transactions.filter(tx => tx.accountId === accountId);
  
  // Create modal HTML
  const modalHTML = `
    <div class="mobile-modal-overlay" id="mobileDeleteAccountModal">
      <div class="mobile-modal">
        <div class="mobile-modal-header">
          <h2>Delete Account</h2>
          <button class="mobile-modal-close" onclick="closeMobileModal('mobileDeleteAccountModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="mobile-modal-body">
          <div class="mobile-delete-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Are you sure you want to delete <strong>${escapeHtml(account.name)}</strong>?</p>
            <p>This account has ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}.</p>
          </div>
          
          <div class="mobile-form-group">
            <label>What to do with transactions?</label>
            <div class="mobile-radio-group">
              <div class="mobile-radio-item">
                <input type="radio" id="mobileKeepTransactions" name="deletionType" value="keep" checked>
                <label for="mobileKeepTransactions">
                  <span class="mobile-radio-title">Keep Transaction History</span>
                  <span class="mobile-radio-description">Account will be deleted but all transactions will be preserved</span>
                </label>
              </div>
              
              <div class="mobile-radio-item">
                <input type="radio" id="mobileDeleteTransactions" name="deletionType" value="delete">
                <label for="mobileDeleteTransactions">
                  <span class="mobile-radio-title">Delete Everything</span>
                  <span class="mobile-radio-description">Delete account and all its transactions permanently</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="mobile-modal-actions">
            <button type="button" class="mobile-btn-secondary" onclick="closeMobileModal('mobileDeleteAccountModal')">Cancel</button>
            <button type="button" class="mobile-btn-danger" onclick="handleMobileAccountDeletion('${accountId}')">Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  closeMobileModal('mobileDeleteAccountModal');
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Handle outside click
  const overlay = document.getElementById('mobileDeleteAccountModal');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeMobileModal('mobileDeleteAccountModal');
      }
    });
  }
}

// Handle account deletion
async function handleMobileAccountDeletion(accountId) {
  console.log("Handling mobile account deletion for:", accountId);
  
  const account = state.accounts.find(acc => acc.id === accountId);
  if (!account) {
    showToast('Account not found', 'error');
    return;
  }
  
  const deletionType = document.querySelector('input[name="deletionType"]:checked').value;
  
  toggleLoading(true);
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('Please sign in to continue');

    const batch = db.batch();

    if (deletionType === 'delete') {
      // Delete all transactions
      const transactionsSnapshot = await db.collection('users')
        .doc(user.uid)
        .collection('transactions')
        .where('accountId', '==', accountId)
        .get();

      transactionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete the account
      batch.delete(db.collection('users')
        .doc(user.uid)
        .collection('accounts')
        .doc(accountId));

      // Update local state
      state.transactions = state.transactions.filter(tx => tx.accountId !== accountId);
    } else {
      // Keep transactions but mark them as from deleted account
      const transactionsSnapshot = await db.collection('users')
        .doc(user.uid)
        .collection('transactions')
        .where('accountId', '==', accountId)
        .get();

      transactionsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          accountDeleted: true,
          accountName: account.name, // Preserve the account name
          accountDeletedAt: new Date().toISOString()
        });
      });

      // Delete the account
      batch.delete(db.collection('users')
        .doc(user.uid)
        .collection('accounts')
        .doc(accountId));
    }

    await batch.commit();

    // Update local state
    state.accounts = state.accounts.filter(acc => acc.id !== accountId);

    // Close modals and show success message
    closeMobileModal('mobileDeleteAccountModal');
    closeMobileModal('mobileAccountDetailsModal');
    showToast('Account deleted successfully');

    // Refresh data
    await loadUserData(true);
  } catch (error) {
    console.error('Error deleting account:', error);
    showToast(error.message || 'Error deleting account', 'error');
  } finally {
    toggleLoading(false);
  }
}

// Generic function to close mobile modals
function closeMobileModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    // Add a fadeout animation class
    modal.classList.add('modal-closing');
    // Remove after animation finishes
    setTimeout(() => {
      if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }
}

function setupMobileQuickActions() {
  console.log("Setting up mobile quick actions");
  
  // Add transaction button
  const addTransactionBtn = document.querySelector('.mobile-quick-actions .quick-action-btn.primary');
  if (addTransactionBtn) {
    addTransactionBtn.onclick = (e) => {
      e.preventDefault();
      showMobileAddTransactionModal();
    };
  }
  
  // Transfer button
  const transferBtn = document.querySelector('.mobile-quick-actions .quick-action-btn.secondary');
  if (transferBtn) {
    transferBtn.onclick = (e) => {
      e.preventDefault();
      showMobileTransferModal();
    };
  }
  
  // Add account button
  const addAccountBtn = document.querySelector('.add-account-btn');
  if (addAccountBtn) {
    addAccountBtn.onclick = (e) => {
      e.preventDefault();
      showMobileAddAccountModal();
    };
  }
}

// Update account cards to use mobile modal
// Function to update all account cards to use mobile modal
function updateMobileAccountCards() {
    const accountCards = document.querySelectorAll('.mobile-accounts-grid .account-card:not(.add-account)');
    accountCards.forEach(card => {
      const accountId = card.dataset.accountId;
      if (accountId) {
        card.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          showMobileAccountDetails(accountId);
        };
      }
    });
    
    // Add account card
    const addAccountCard = document.querySelector('.mobile-accounts-grid .add-account');
    if (addAccountCard) {
      addAccountCard.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showMobileAddAccountModal();
      };
    }
  }

// Make sure these functions are globally available
function exposeMobileFunctions() {
    window.showMobileAddAccountModal = showMobileAddAccountModal;
    window.showMobileTransferModal = showMobileTransferModal;
    window.showMobileAccountDetails = showMobileAccountDetails;
    window.showMobileAccountTransactions = showMobileAccountTransactions;
    window.showMobileEditAccountModal = showMobileEditAccountModal;
    window.showMobileDeleteAccountModal = showMobileDeleteAccountModal;
    window.showMobileAddTransactionModal = showMobileAddTransactionModal;
    window.handleMobileAccountDeletion = handleMobileAccountDeletion;
    window.updateMobileCategoryOptions = updateMobileCategoryOptions;
    window.updateMobilePaymentModes = updateMobilePaymentModes;
    window.closeMobileModal = closeMobileModal;
    window.setupMobileQuickActions = setupMobileQuickActions;
    window.updateMobileAccountCards = updateMobileAccountCards;
}

exposeMobileFunctions();

document.addEventListener('DOMContentLoaded', function() {

    setupMobileSignOut();
    
    // Setup account cards click handlers
    setTimeout(updateMobileAccountCards, 500);
    
    // Re-hook event listeners after rendering
    const originalRenderMobileAccounts = window.renderMobileAccounts;
    window.renderMobileAccounts = function() {
      originalRenderMobileAccounts();
      setTimeout(updateMobileAccountCards, 100);
    };
  });


// Override renderMobileAccounts to hook up click events
const originalRenderMobileAccounts = renderMobileAccounts;
window.renderMobileAccounts = function() {
  originalRenderMobileAccounts();
  setTimeout(updateMobileAccountCards, 100);
};

// Call function to expose to global scope
setTimeout(exposeMobileFunctions, 300);

// Initialize mobile quick actions after DOM fully loaded
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(setupMobileQuickActions, 500);
  
  // Re-hook event listeners after rendering
  const originalRenderAll = window.renderAll;
  window.renderAll = function(...args) {
    const result = originalRenderAll.apply(this, args);
    if (window.innerWidth <= 768) {
      setTimeout(setupMobileQuickActions, 100);
    }
    return result;
  };
});

// In mobile-dashboard.js
function renderMobileRecentTransactions() {
    console.log("Rendering mobile recent transactions");
    
    const container = document.getElementById('mobile-recent-transactions');
    if (!container) {
      console.error("Mobile recent transactions container not found");
      return;
    }
    
    if (!state.transactions || !state.transactions.length) {
      container.innerHTML = '<div class="no-data">No transactions found</div>';
      return;
    }
    
    // Get 5 most recent transactions
    const recentTransactions = [...state.transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    
    // Render transactions with contained styling
    container.innerHTML = recentTransactions.map(tx => {
      const account = state.accounts.find(a => a.id === tx.accountId);
      const typeClass = tx.type === 'income' ? 'income' : tx.type === 'expense' ? 'expense' : 'transfer';
      const amountPrefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : 
                            (tx.notes?.toLowerCase().includes('transfer to') ? '-' : '+');
      const icon = tx.type === 'income' ? 'arrow-down' : tx.type === 'expense' ? 'arrow-up' : 'exchange-alt';
      
      return `
        <div class="mobile-transaction-item">
          <div class="transaction-icon ${typeClass}">
            <i class="fas fa-${icon}"></i>
          </div>
          <div class="transaction-details">
            <div class="transaction-header">
              <div class="transaction-title">${escapeHtml(tx.category)}</div>
              <div class="transaction-amount ${typeClass}">
                ${amountPrefix}${formatCurrency(Math.abs(tx.amount), account?.currency)}
              </div>
            </div>
            <div class="transaction-subtext">
              <span>${formatDate(tx.date)}</span>
              ${account ? `<span class="transaction-dot">•</span><span>${escapeHtml(account.name)}</span>` : ''}
              ${tx.paymentMode ? `<span class="transaction-dot">•</span><span>${escapeHtml(tx.paymentMode)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Setup "View All" link
    const viewAllLink = document.querySelector('.view-all-link');
    if (viewAllLink) {
      viewAllLink.onclick = () => switchView('transactions');
    }
  }


    // Setup mobile navigation
    function setupMobileNavigation() {
      console.log("Setting up mobile navigation");
      
      const navItems = document.querySelectorAll('.mobile-nav-item');
      navItems.forEach(item => {
        item.addEventListener('click', function(e) {
          e.preventDefault();
          
          const view = this.getAttribute('data-view');
          if (view) {
            console.log("Mobile navigation clicked for view:", view);
            
            // Update active tab
            navItems.forEach(tab => tab.classList.remove('active'));
            this.classList.add('active');
            
            // Switch view
            switchView(view);
          }
        });
      });
    }
    
    // Hook into the original switchView function
    const originalSwitchView = window.switchView;
    
    window.switchView = function(view) {
      console.log("Switch view called for:", view);
      
      // Call original function
      originalSwitchView(view);
      
      // Run mobile-specific actions
      if (isMobile()) {
        if (view === 'dashboard') {
          document.getElementById('mobile-dashboard').style.display = 'block';
          document.getElementById('mainContent').style.display = 'none';
          document.body.classList.add('mobile-view');
          
          // Update mobile dashboard
          updateMobileUserInfo();
          ensurePortfolioSummaryExists();
          updateMobilePortfolio();
          renderMobileAccounts();
          renderMobileRecentTransactions();
        } else {
          document.getElementById('mobile-dashboard').style.display = 'none';
          document.getElementById('mainContent').style.display = 'block';
          document.body.classList.remove('mobile-view');
        }
        
        // Update active navigation
        const navItems = document.querySelectorAll('.mobile-nav-item');
        navItems.forEach(item => {
          const itemView = item.getAttribute('data-view');
          item.classList.toggle('active', itemView === view);
        });
      }
    };
    
    // Initialize on page load and resize
    document.addEventListener('DOMContentLoaded', function() {
      console.log("DOMContentLoaded event fired");
      
      // Set initial state
      setTimeout(initMobileDashboard, 100); // Add a slight delay
      
      // Add resize listener
      window.addEventListener('resize', function() {
        console.log("Window resize detected");
        initMobileDashboard();
      });

      setupMobileSignOut();
      
      // Hook into data loading
      const originalLoadUserData = window.loadUserData;
      window.loadUserData = async function(...args) {
        console.log("loadUserData called");
        const result = await originalLoadUserData.apply(this, args);
        
        if (isMobile()) {
          console.log("Refreshing mobile dashboard after data load");
          setTimeout(initMobileDashboard, 100); // Add a slight delay
        }
        
        return result;
      };
      
      // Hook into rendering
      const originalRenderAll = window.renderAll;
      window.renderAll = function(...args) {
        console.log("renderAll called");
        const result = originalRenderAll.apply(this, args);
        
        if (isMobile() && state.currentView === 'dashboard') {
          console.log("Updating mobile dashboard after renderAll");
          setTimeout(() => {
            ensurePortfolioSummaryExists();
            updateMobilePortfolio();
            renderMobileAccounts();
            renderMobileRecentTransactions();
          }, 100); // Add a slight delay
        }
        
        return result;
      };
    });
    
    // Make mobile-specific functions globally available
    window.mobileTogglePortfolioVisibility = mobileTogglePortfolioVisibility;
    window.updateMobilePortfolio = updateMobilePortfolio;
    
    // Run after a short delay to ensure DOM is ready
    setTimeout(initMobileDashboard, 500);
  })();