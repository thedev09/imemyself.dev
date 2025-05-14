// mobile-analytics.js - Handle mobile analytics page logic
(function() {
    // Variables to store chart instances
    let mobileChartInstances = {
      netWorth: null,
      incomeExpense: null
    };
    
    // Check if we're on mobile
    function isMobile() {
      return window.innerWidth <= 768;
    }
    
    // Initialize mobile analytics
    function initMobileAnalytics() {
      if (!isMobile() || state.currentView !== 'analytics') {
        return;
      }
      
      console.log("Initializing mobile analytics view");
      
      // Check if mobile analytics container exists
      let mobileAnalyticsView = document.getElementById('mobile-analytics-view');
      if (!mobileAnalyticsView) {
        console.log("Creating mobile analytics view");
        createMobileAnalyticsView();
      } else {
        // View exists, ensure it's visible
        mobileAnalyticsView.style.display = 'block';
      }
      
      // Hide desktop view explicitly
      document.getElementById('analytics-view').style.display = 'none';
      
      // Add mobile view class to body
      document.body.classList.add('mobile-view');
      
      // Setup mobile navigation
      setupMobileAnalyticsNavigation();
      
      // Update active nav item
      updateMobileNavActive('analytics');
      
      // Render all analytics components
      renderMobileAnalytics('3M'); // Default to 3-month view
    }

    function closeMobileModal(modalId) {
      console.log("Closing modal:", modalId);
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.remove();
        return true;
      }
      return false;
    }
    
    // Create the mobile analytics view HTML
    function createMobileAnalyticsView() {
      console.log("Creating mobile analytics view HTML");
      
      const mainContent = document.getElementById('mainContent');
      
      const mobileAnalyticsHTML = `
        <div id="mobile-analytics-view" class="mobile-analytics-view">
          <div class="mobile-analytics-header">
            <h1 class="mobile-analytics-title">Analytics</h1>
          </div>
          
          <!-- Period filters -->
          <div class="mobile-time-filters">
            <button class="mobile-time-filter" data-period="1M">1 Month</button>
            <button class="mobile-time-filter active" data-period="3M">3 Months</button>
            <button class="mobile-time-filter" data-period="6M">6 Months</button>
            <button class="mobile-time-filter" data-period="1Y">1 Year</button>
          </div>
          
          <!-- Net Worth Card -->
          <div class="mobile-analytics-card">
            <div class="mobile-analytics-card-header">
              <h2 class="mobile-analytics-card-title">Net Worth</h2>
            </div>
            <div class="mobile-analytics-card-content">
              <div class="mobile-analytics-stats">
                <div class="mobile-stat-item">
                  <div class="mobile-stat-label">Total Net Worth</div>
                  <div id="mobile-total-net-worth" class="mobile-stat-value">₹0</div>
                </div>
                <div class="mobile-stat-item">
                  <div class="mobile-stat-label">Monthly Change</div>
                  <div id="mobile-monthly-change" class="mobile-stat-value">0%</div>
                </div>
              </div>
              <div class="mobile-chart-container">
                <canvas id="mobileNetWorthChart"></canvas>
              </div>
            </div>
          </div>
          
          <!-- Income & Expense Card -->
          <div class="mobile-analytics-card">
            <div class="mobile-analytics-card-header">
              <h2 class="mobile-analytics-card-title">Income & Expenses</h2>
              <div class="mobile-period-selector">
                <select id="mobileTrendPeriod" class="mobile-period-select">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div class="mobile-analytics-card-content">
              <div class="mobile-analytics-stats">
                <div class="mobile-stat-item">
                  <div class="mobile-stat-label">Total Income</div>
                  <div id="mobile-total-income" class="mobile-stat-value income">₹0</div>
                </div>
                <div class="mobile-stat-item">
                  <div class="mobile-stat-label">Total Expenses</div>
                  <div id="mobile-total-expenses" class="mobile-stat-value expense">₹0</div>
                </div>
                <div class="mobile-stat-item">
                  <div class="mobile-stat-label">Net Savings</div>
                  <div id="mobile-net-savings" class="mobile-stat-value">₹0</div>
                </div>
                <div class="mobile-stat-item">
                  <div class="mobile-stat-label">Savings Rate</div>
                  <div id="mobile-savings-rate" class="mobile-stat-value">0%</div>
                </div>
              </div>
              <div class="mobile-chart-container">
                <canvas id="mobileIncomeExpenseChart"></canvas>
              </div>
            </div>
          </div>
          
          <div class="mobile-analytics-card spending-analysis-card">
  <div class="mobile-analytics-card-header">
    <h2 class="mobile-analytics-card-title">Spending Analysis</h2>
    <div class="mobile-spending-period">
      <select id="mobileSpendingPeriod" class="mobile-spending-select">
        <option value="thisMonth">This Month</option>
        <option value="last3">Last 3 Months</option>
        <option value="last6">Last 6 Months</option>
        <option value="thisYear">This Year</option>
        <option value="all">All Time</option>
        <option value="custom">Custom Range</option>
      </select>
    </div>
  </div>
  
  <div id="mobileCustomDateRange" class="mobile-custom-date-range">
    <input type="date" id="mobileSpendingStartDate" class="mobile-date-input">
    <input type="date" id="mobileSpendingEndDate" class="mobile-date-input">
  </div>
  
  <div class="mobile-analytics-card-content">
    <div class="mobile-spending-details">
      <div class="mobile-spending-section">
        <h3 class="mobile-section-title">Top Categories</h3>
        <div id="mobileCategoriesList" class="mobile-category-list">
          <!-- Will be populated by JavaScript -->
        </div>
        <a href="#" class="mobile-view-more" id="viewAllCategories">View All Categories</a>
      </div>
      
      <div class="mobile-spending-section">
        <h3 class="mobile-section-title">Payment Methods</h3>
        <div id="mobilePaymentsList" class="mobile-category-list">
          <!-- Will be populated by JavaScript -->
        </div>
        <a href="#" class="mobile-view-more" id="viewAllPayments">View All Payment Methods</a>
      </div>
    </div>
  </div>
</div>
          
          <!-- Monthly Breakdown Card -->
          <div class="mobile-analytics-card">
            <div class="mobile-analytics-card-header">
              <h2 class="mobile-analytics-card-title">Monthly Breakdown</h2>
            </div>
            <div class="mobile-analytics-card-content">
              <div class="mobile-year-selector" id="mobileYearSelector">
                <!-- Year buttons will be added here -->
              </div>
              <div class="mobile-table-container">
                <table class="mobile-breakdown-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Income</th>
                      <th>Expenses</th>
                      <th>Savings</th>
                    </tr>
                  </thead>
                  <tbody id="mobileMonthlyBreakdown">
                    <!-- Will be populated by JavaScript -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <!-- Mobile navigation -->
          <div class="mobile-nav">
            <a href="#" class="mobile-nav-item" data-view="dashboard">
              <i class="fas fa-home mobile-nav-icon"></i>
              <span>Home</span>
            </a>
            <a href="#" class="mobile-nav-item" data-view="transactions">
              <i class="fas fa-list mobile-nav-icon"></i>
              <span>Transactions</span>
            </a>
            <a href="#" class="mobile-nav-item active" data-view="analytics">
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
      mainContent.insertAdjacentHTML('beforeend', mobileAnalyticsHTML);
    }
    
    // Setup navigation on the analytics view
    function setupMobileAnalyticsNavigation() {
      const navItems = document.querySelectorAll('#mobile-analytics-view .mobile-nav-item');
      navItems.forEach(item => {
        item.addEventListener('click', function(e) {
          e.preventDefault();
          
          const view = this.getAttribute('data-view');
          if (view) {
            console.log("Mobile analytics navigation clicked for view:", view);
            window.switchView(view);
          }
        });
      });
      
      // Setup time period filters
      const timeFilters = document.querySelectorAll('.mobile-time-filter');
      timeFilters.forEach(filter => {
        filter.addEventListener('click', function() {
          timeFilters.forEach(f => f.classList.remove('active'));
          this.classList.add('active');
          
          const period = this.getAttribute('data-period');
          renderMobileAnalytics(period);
        });
      });
      
      // Setup period select for income/expense chart
      const periodSelect = document.getElementById('mobileTrendPeriod');
      if (periodSelect) {
        periodSelect.addEventListener('change', function() {
          renderMobileIncomeExpenseChart();
        });
      }
      
      // Setup spending period selector
      const spendingPeriodSelect = document.getElementById('mobileSpendingPeriod');
      const customDateRange = document.getElementById('mobileCustomDateRange');
      if (spendingPeriodSelect) {
        spendingPeriodSelect.addEventListener('change', function() {
          // Show/hide custom date range
          if (this.value === 'custom') {
            customDateRange.classList.add('visible');
            
            // Set default date range (current month)
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            document.getElementById('mobileSpendingStartDate').value = firstDay.toISOString().split('T')[0];
            document.getElementById('mobileSpendingEndDate').value = lastDay.toISOString().split('T')[0];
          } else {
            customDateRange.classList.remove('visible');
          }
          
          // Update spending analysis data
          updateMobileSpendingAnalysis();
        });
        
        // Setup custom date range change handlers
        const startDateInput = document.getElementById('mobileSpendingStartDate');
        const endDateInput = document.getElementById('mobileSpendingEndDate');
        
        if (startDateInput && endDateInput) {
          [startDateInput, endDateInput].forEach(input => {
            input.addEventListener('change', function() {
              if (startDateInput.value && endDateInput.value) {
                updateMobileSpendingAnalysis();
              }
            });
          });
        }
      }
      
      // Setup view all categories
      const viewAllCategories = document.getElementById('viewAllCategories');
      if (viewAllCategories) {
        viewAllCategories.addEventListener('click', function(e) {
          e.preventDefault();
          showMobileCategoriesModal();
        });
      }
      
      // Setup view all payment methods
      const viewAllPayments = document.getElementById('viewAllPayments');
      if (viewAllPayments) {
        viewAllPayments.addEventListener('click', function(e) {
          e.preventDefault();
          showMobilePaymentMethodsModal();
        });
      }
    }
    
    // Update active nav item
    function updateMobileNavActive(view) {
      const navItems = document.querySelectorAll('.mobile-nav-item');
      navItems.forEach(item => {
        const itemView = item.getAttribute('data-view');
        item.classList.toggle('active', itemView === view);
      });
    }
    
    // Main function to render all mobile analytics components
    async function renderMobileAnalytics(period) {
      console.log("Rendering mobile analytics with period:", period);
      
      try {
        // Render net worth chart and stats
        await renderMobileNetWorthChart(period);
        
        // Render income/expense chart and stats
        renderMobileIncomeExpenseChart();
        
        // Update spending analysis with default period
        updateMobileSpendingAnalysis();
        
        // Render monthly breakdown
        renderMobileMonthlyBreakdown();
      } catch (error) {
        console.error("Error rendering mobile analytics:", error);
        showToast("Error rendering analytics data", "error");
      }
    }
    
    // Function to update spending analysis based on selected period
    function updateMobileSpendingAnalysis() {
      const periodSelect = document.getElementById('mobileSpendingPeriod');
      if (!periodSelect) return;
      
      const period = periodSelect.value;
      let startDate = null;
      let endDate = null;
      
      if (period === 'custom') {
        startDate = document.getElementById('mobileSpendingStartDate').value;
        endDate = document.getElementById('mobileSpendingEndDate').value;
        
        if (!startDate || !endDate) {
          console.log("Custom date range not fully specified");
          return;
        }
      }
      
      // Filter transactions based on period
      const filteredTransactions = filterTransactionsForAnalysis(period, startDate, endDate);
      
      // Render spending categories with filtered data
      renderMobileSpendingCategories(filteredTransactions);
      
      // Render payment methods with filtered data
      renderMobilePaymentMethods(filteredTransactions);
    }
    
    // Filter transactions based on selected period
    function filterTransactionsForAnalysis(period, customStartDate = null, customEndDate = null) {
      const now = new Date();
      let startDate;
      let endDate = now;
      
      switch(period) {
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last3':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'last6':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 6);
          break;
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999); // End of the day
          } else {
            // Default to this month if custom dates are not provided
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          }
          break;
        case 'all':
        default:
          // For 'all', don't filter by date
          return state.transactions;
      }
      
      return state.transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= startDate && txDate <= endDate;
      });
    }
    
    // Render net worth chart for mobile
    async function renderMobileNetWorthChart(period) {
      const ctx = document.getElementById('mobileNetWorthChart')?.getContext('2d');
      if (!ctx) return;
      
      try {
        // Get net worth data using the existing function
        const { dates, values } = await getNetWorthSnapshots(period);
        
        if (values.length === 0) {
          console.log('No net worth data available');
          return;
        }
        
        // Calculate changes
        const currentNetWorth = values[values.length - 1];
        const previousNetWorth = values[0];
        const monthlyChange = values.length >= 2 ? 
          ((currentNetWorth - previousNetWorth) / previousNetWorth * 100).toFixed(1) : 0;
        
        // Update display values
        document.getElementById('mobile-total-net-worth').textContent = formatCurrency(currentNetWorth);
        
        const monthlyChangeElement = document.getElementById('mobile-monthly-change');
        monthlyChangeElement.textContent = `${monthlyChange}%`;
        monthlyChangeElement.className = 'mobile-stat-value ' + 
          (parseFloat(monthlyChange) >= 0 ? 'positive' : 'negative');
        
        // Create/update chart
        if (mobileChartInstances.netWorth) {
          mobileChartInstances.netWorth.destroy();
        }
        
        // Get a reduced set of data points for the mobile view
        const reducedData = reduceDatePointsForMobile(dates, values);
        
        mobileChartInstances.netWorth = new Chart(ctx, {
          type: 'line',
          data: {
            labels: reducedData.dates.map(date => new Date(date).toLocaleDateString('default', { 
              month: 'short', 
              day: 'numeric' 
            })),
            datasets: [{
              label: 'Net Worth',
              data: reducedData.values,
              fill: true,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: '#3b82f6',
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return 'Net Worth: ' + formatCurrency(context.raw);
                  }
                }
              }
            },
            scales: {
              y: {
                grid: {
                  color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                  callback: value => formatCurrency(value),
                  color: '#94a3b8',
                  font: {
                    size: 10
                  }
                }
              },
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  color: '#94a3b8',
                  maxRotation: 0,
                  font: {
                    size: 10
                  }
                }
              }
            }
          }
        });
      } catch (error) {
        console.error('Error rendering mobile net worth chart:', error);
      }
    }
    
    // Helper function to reduce the number of data points for mobile
    function reduceDatePointsForMobile(dates, values) {
      // If we have fewer than 10 points, just use them all
      if (dates.length <= 10) {
        return { dates, values };
      }
      
      // Otherwise, pick evenly distributed points
      const step = Math.floor(dates.length / 10);
      const reducedDates = [];
      const reducedValues = [];
      
      for (let i = 0; i < dates.length; i += step) {
        reducedDates.push(dates[i]);
        reducedValues.push(values[i]);
      }
      
      // Always include the last point
      if (reducedDates[reducedDates.length - 1] !== dates[dates.length - 1]) {
        reducedDates.push(dates[dates.length - 1]);
        reducedValues.push(values[values.length - 1]);
      }
      
      return { dates: reducedDates, values: reducedValues };
    }
    
    // Render income/expense chart for mobile
    // Update this function in mobile-analytics.js
function renderMobileIncomeExpenseChart() {
  const ctx = document.getElementById('mobileIncomeExpenseChart')?.getContext('2d');
  if (!ctx) return;
  
  const periodSelect = document.getElementById('mobileTrendPeriod');
  const viewType = periodSelect?.value || 'monthly';
  const selectedYear = new Date().getFullYear();
  
  // Process transactions
  const chartData = {};
  
  if (viewType === 'monthly') {
    // Monthly view logic
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize all months with zero values
    months.forEach(month => {
      chartData[month] = {
        income: 0,
        expense: 0,
        net: 0
      };
    });
    
    // Filter and aggregate transactions
    state.transactions
      .filter(tx => {
        const txDate = new Date(tx.date);
        return txDate.getFullYear() === selectedYear && tx.type !== 'transfer';
      })
      .forEach(tx => {
        const month = months[new Date(tx.date).getMonth()];
        const amount = tx.amountInINR || tx.amount;
        
        if (tx.type === 'income') {
          chartData[month].income += amount;
          chartData[month].net += amount;
        } else if (tx.type === 'expense') {
          chartData[month].expense += amount;
          chartData[month].net -= amount;
        }
      });
      
    var labels = months;
    var incomeData = months.map(m => chartData[m].income);
    var expenseData = months.map(m => chartData[m].expense);
    var netData = months.map(m => chartData[m].net);
    
  } else {
    // Yearly view logic
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 4; // Show 5 years including current
    
    // Initialize yearly data
    const years = [];
    for (let year = startYear; year <= currentYear; year++) {
      const yearKey = year.toString();
      years.push(yearKey);
      chartData[yearKey] = {
        income: 0,
        expense: 0,
        net: 0
      };
    }
    
    // Filter and aggregate transactions for yearly view
    state.transactions
      .filter(tx => tx.type !== 'transfer')
      .forEach(tx => {
        const year = new Date(tx.date).getFullYear();
        const yearKey = year.toString();
        
        // Skip if outside our year range
        if (year < startYear || year > currentYear) return;
        
        const amount = tx.amountInINR || tx.amount;
        
        if (tx.type === 'income') {
          chartData[yearKey].income += amount;
          chartData[yearKey].net += amount;
        } else if (tx.type === 'expense') {
          chartData[yearKey].expense += amount;
          chartData[yearKey].net -= amount;
        }
      });
      
    var labels = years;
    var incomeData = years.map(y => chartData[y].income);
    var expenseData = years.map(y => chartData[y].expense);
    var netData = years.map(y => chartData[y].net);
  }
  
  // Calculate totals for display
  const totals = Object.values(chartData).reduce((acc, curr) => ({
    income: acc.income + curr.income,
    expense: acc.expense + curr.expense,
    net: acc.net + curr.net
  }), { income: 0, expense: 0, net: 0 });
  
  // Update summary stats
  document.getElementById('mobile-total-income').textContent = formatCurrency(totals.income);
  document.getElementById('mobile-total-expenses').textContent = formatCurrency(totals.expense);
  
  const netSavingsElement = document.getElementById('mobile-net-savings');
  netSavingsElement.textContent = formatCurrency(Math.abs(totals.net));
  netSavingsElement.style.color = totals.net >= 0 ? '#4ade80' : '#f87171';
  if (totals.net < 0) {
    netSavingsElement.textContent = '-' + netSavingsElement.textContent;
  }
  
  const savingsRate = totals.income > 0 ? (totals.net / totals.income * 100) : 0;
  document.getElementById('mobile-savings-rate').textContent = `${savingsRate.toFixed(1)}%`;
  
  // Prepare chart data for rendering
  const chartDatasets = [
    {
      type: 'bar',
      label: 'Income',
      data: incomeData,
      backgroundColor: 'rgba(74, 222, 128, 0.8)',
      order: 2
    },
    {
      type: 'bar',
      label: 'Expenses',
      data: expenseData,
      backgroundColor: 'rgba(248, 113, 113, 0.8)',
      order: 2
    },
    {
      type: 'line',
      label: 'Net',
      data: netData,
      borderColor: '#60a5fa',
      tension: 0.4,
      fill: false,
      order: 1
    }
  ];
  
  // Create/update chart
  if (mobileChartInstances.incomeExpense) {
    mobileChartInstances.incomeExpense.destroy();
  }
  
  mobileChartInstances.incomeExpense = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: chartDatasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            font: {
              size: 10
            },
            color: '#94a3b8'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + formatCurrency(context.raw);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            callback: value => formatCurrency(value),
            color: '#94a3b8',
            font: {
              size: 10
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#94a3b8',
            maxRotation: 0,
            font: {
              size: 10
            }
          }
        }
      }
    }
  });
}
    
    // Render spending categories for mobile
    function renderMobileSpendingCategories(filteredTransactions = null) {
      const container = document.getElementById('mobileCategoriesList');
      if (!container) return;
      
      // Use filtered transactions if provided, otherwise use default filter
      let transactions = filteredTransactions;
      if (!transactions) {
        // Default to last month
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        
        transactions = state.transactions.filter(tx => 
          tx.type === 'expense' && 
          new Date(tx.date) >= lastMonthDate
        );
      } else {
        // Filter for expenses only from the provided transactions
        transactions = filteredTransactions.filter(tx => tx.type === 'expense');
      }
      
      // Calculate spending by category
      const categorySpending = {};
      let totalSpending = 0;
      
      transactions.forEach(tx => {
        const amount = tx.amountInINR || tx.amount;
        if (!categorySpending[tx.category]) {
          categorySpending[tx.category] = 0;
        }
        categorySpending[tx.category] += amount;
        totalSpending += amount;
      });
      
      // Convert to array and sort
      const sortedCategories = Object.entries(categorySpending)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: ((amount / totalSpending) * 100).toFixed(1)
        }))
        .sort((a, b) => b.amount - a.amount);
      
      // Show top 3 categories in main view
      const topCategories = sortedCategories.slice(0, 3);
      
      if (topCategories.length === 0) {
        container.innerHTML = '<div class="mobile-empty-state">No spending data available</div>';
        return;
      }
      
      container.innerHTML = topCategories.map(cat => `
        <div class="mobile-category-item">
          <div class="mobile-category-header">
            <span class="mobile-category-name">${escapeHtml(cat.category)}</span>
            <span class="mobile-category-amount">${formatCurrency(cat.amount)}</span>
          </div>
          <div class="mobile-progress-bar">
            <div class="mobile-progress-fill" style="width: ${cat.percentage}%"></div>
          </div>
        </div>
      `).join('');
      
      // Update "View All Categories" link to pass the current filter period
      const viewAllLink = document.getElementById('viewAllCategories');
      if (viewAllLink) {
        viewAllLink.onclick = (e) => {
          e.preventDefault();
          showMobileCategoriesModal(transactions);
        };
      }
    }
    
    // Render payment methods for mobile
    function renderMobilePaymentMethods(filteredTransactions = null) {
      const container = document.getElementById('mobilePaymentsList');
      if (!container) return;
      
      // Use filtered transactions if provided, otherwise use default filter
      let transactions = filteredTransactions;
      if (!transactions) {
        // Default to last month
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        
        transactions = state.transactions.filter(tx => 
          tx.type === 'expense' && 
          new Date(tx.date) >= lastMonthDate
        );
      } else {
        // Filter for expenses only from the provided transactions
        transactions = filteredTransactions.filter(tx => tx.type === 'expense');
      }
      
      // Calculate spending by payment method
      const paymentData = {};
      let totalSpending = 0;
      
      transactions.forEach(tx => {
        if (!tx.paymentMode) return;
        
        const amount = tx.amountInINR || tx.amount;
        if (!paymentData[tx.paymentMode]) {
          paymentData[tx.paymentMode] = 0;
        }
        paymentData[tx.paymentMode] += amount;
        totalSpending += amount;
      });
      
      // Convert to array and sort
      const methods = Object.entries(paymentData)
        .map(([method, amount]) => ({
          method,
          amount,
          percentage: ((amount / totalSpending) * 100).toFixed(1)
        }))
        .sort((a, b) => b.amount - a.amount);
      
      // Show top 3 payment methods
      const topMethods = methods.slice(0, 3);
      
      if (topMethods.length === 0) {
        container.innerHTML = '<div class="mobile-empty-state">No payment method data available</div>';
        return;
      }
      
      container.innerHTML = topMethods.map(method => `
        <div class="mobile-category-item">
          <div class="mobile-category-header">
            <span class="mobile-category-name">${escapeHtml(method.method)}</span>
            <span class="mobile-category-amount">${formatCurrency(method.amount)}</span>
          </div>
          <div class="mobile-progress-bar">
            <div class="mobile-progress-fill" style="width: ${method.percentage}%"></div>
          </div>
        </div>
      `).join('');
      
      // Update "View All Payment Methods" link to pass the current filter period
      const viewAllLink = document.getElementById('viewAllPayments');
      if (viewAllLink) {
        viewAllLink.onclick = (e) => {
          e.preventDefault();
          showMobilePaymentMethodsModal(transactions);
        };
      }
    }
    
    // Render monthly breakdown for mobile
    function renderMobileMonthlyBreakdown() {
      const tbody = document.getElementById('mobileMonthlyBreakdown');
      const yearSelector = document.getElementById('mobileYearSelector');
      if (!tbody || !yearSelector) return;
      
      // Get current year and previous years
      const currentYear = new Date().getFullYear();
      const years = Array.from({length: 3}, (_, i) => currentYear - i);
      
      // Create year selector buttons
      yearSelector.innerHTML = years.map(year => `
        <button class="mobile-year-button${year === currentYear ? ' active' : ''}" 
                data-year="${year}">${year}</button>
      `).join('');
      
      // Add click event to year buttons
      yearSelector.querySelectorAll('.mobile-year-button').forEach(button => {
        button.addEventListener('click', function() {
          yearSelector.querySelectorAll('.mobile-year-button').forEach(btn => {
            btn.classList.remove('active');
          });
          this.classList.add('active');
          
          renderMonthsForYear(parseInt(this.dataset.year));
        });
      });
      
      // Initial render for current year
      renderMonthsForYear(currentYear);
      
      // Function to render months for a specific year
      function renderMonthsForYear(year) {
        // Group transactions by month for the selected year
        const monthlyData = state.transactions
          .filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getFullYear() === year;
          })
          .reduce((acc, tx) => {
            const txDate = new Date(tx.date);
            const monthKey = txDate.toLocaleString('default', { month: 'short' });
            const monthIndex = txDate.getMonth();
            
            if (!acc[monthKey]) {
              acc[monthKey] = {
                income: 0,
                expenses: 0,
                monthIndex: monthIndex,
                month: monthKey
              };
            }
            
            const amount = tx.amountInINR || tx.amount;
            if (tx.type === 'income') {
              acc[monthKey].income += amount;
            } else if (tx.type === 'expense') {
              acc[monthKey].expenses += amount;
            }
            
            return acc;
          }, {});
        
        // Calculate savings and sort by month index (latest first)
        const sortedMonths = Object.values(monthlyData)
          .map(data => {
            data.savings = data.income - data.expenses;
            return data;
          })
          .sort((a, b) => b.monthIndex - a.monthIndex);
        
        // Render the months (show the most recent 6 months)
        tbody.innerHTML = sortedMonths.slice(0, 6).map(data => `
          <tr>
            <td>${data.month}</td>
            <td class="income">${formatCurrency(data.income)}</td>
            <td class="expense">${formatCurrency(data.expenses)}</td>
            <td class="savings" style="color: ${data.savings < 0 ? '#f87171' : '#4ade80'}">
              ${data.savings < 0 ? '-' : ''}${formatCurrency(Math.abs(data.savings))}
            </td>
          </tr>
        `).join('') || '<tr><td colspan="4" class="mobile-empty-state">No data available</td></tr>';
      }
    }
    
    // Show categories modal for mobile
    // Replace the entire showMobileCategoriesModal function
function showMobileCategoriesModal() {
  console.log("Showing mobile categories modal");
  
  // Get last month's date
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  
  // Calculate spending by category
  const categorySpending = {};
  let totalSpending = 0;
  
  state.transactions
    .filter(tx => 
      tx.type === 'expense' && 
      new Date(tx.date) >= lastMonthDate
    )
    .forEach(tx => {
      const amount = tx.amountInINR || tx.amount;
      if (!categorySpending[tx.category]) {
        categorySpending[tx.category] = 0;
      }
      categorySpending[tx.category] += amount;
      totalSpending += amount;
    });
  
  // Convert to array and sort
  const sortedCategories = Object.entries(categorySpending)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: ((amount / totalSpending) * 100).toFixed(1)
    }))
    .sort((a, b) => b.amount - a.amount);
  
  // Create modal HTML
  const modalHTML = `
    <div class="mobile-modal-overlay" id="mobileCategoriesModal">
      <div class="mobile-modal">
        <div class="mobile-modal-header">
          <h2>Spending Categories</h2>
          <button class="mobile-modal-close" onclick="closeMobileModal('mobileCategoriesModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="mobile-modal-body">
          ${sortedCategories.length > 0 ? `
            <div class="mobile-category-list">
              ${sortedCategories.map(cat => `
                <div class="mobile-category-item">
                  <div class="mobile-category-header">
                    <span class="mobile-category-name">${escapeHtml(cat.category)}</span>
                    <span class="mobile-category-amount">${formatCurrency(cat.amount)} <small>(${cat.percentage}%)</small></span>
                  </div>
                  <div class="mobile-progress-bar">
                    <div class="mobile-progress-fill" style="width: ${cat.percentage}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<div class="mobile-empty-state">No spending data available</div>'}
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  closeMobileModal('mobileCategoriesModal');
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Handle click outside to close
  const modal = document.getElementById('mobileCategoriesModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeMobileModal('mobileCategoriesModal');
      }
    });
  }
  
  // Handle Escape key to close
  const escapeHandler = function(e) {
    if (e.key === 'Escape') {
      if (closeMobileModal('mobileCategoriesModal')) {
        document.removeEventListener('keydown', escapeHandler);
      }
    }
  };
  document.addEventListener('keydown', escapeHandler);
}
    
    // Replace the entire showMobilePaymentMethodsModal function
function showMobilePaymentMethodsModal() {
  console.log("Showing mobile payment methods modal");
  
  // Get last month's date
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  
  // Calculate spending by payment method
  const paymentData = {};
  let totalSpending = 0;
  
  state.transactions
    .filter(tx => 
      tx.type === 'expense' && 
      new Date(tx.date) >= lastMonthDate
    )
    .forEach(tx => {
      if (!tx.paymentMode) return;
      
      const amount = tx.amountInINR || tx.amount;
      if (!paymentData[tx.paymentMode]) {
        paymentData[tx.paymentMode] = 0;
      }
      paymentData[tx.paymentMode] += amount;
      totalSpending += amount;
    });
  
  // Convert to array and sort
  const methods = Object.entries(paymentData)
    .map(([method, amount]) => ({
      method,
      amount,
      percentage: ((amount / totalSpending) * 100).toFixed(1)
    }))
    .sort((a, b) => b.amount - a.amount);
  
  // Create modal HTML
  const modalHTML = `
    <div class="mobile-modal-overlay" id="mobilePaymentMethodsModal">
      <div class="mobile-modal">
        <div class="mobile-modal-header">
          <h2>Payment Methods</h2>
          <button class="mobile-modal-close" onclick="closeMobileModal('mobilePaymentMethodsModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="mobile-modal-body">
          ${methods.length > 0 ? `
            <div class="mobile-category-list">
              ${methods.map(method => `
                <div class="mobile-category-item">
                  <div class="mobile-category-header">
                    <span class="mobile-category-name">${escapeHtml(method.method)}</span>
                    <span class="mobile-category-amount">${formatCurrency(method.amount)} <small>(${method.percentage}%)</small></span>
                  </div>
                  <div class="mobile-progress-bar">
                    <div class="mobile-progress-fill" style="width: ${method.percentage}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<div class="mobile-empty-state">No payment method data available</div>'}
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  closeMobileModal('mobilePaymentMethodsModal');
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Handle click outside to close
  const modal = document.getElementById('mobilePaymentMethodsModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeMobileModal('mobilePaymentMethodsModal');
      }
    });
  }
  
  // Handle Escape key to close
  const escapeHandler = function(e) {
    if (e.key === 'Escape') {
      if (closeMobileModal('mobilePaymentMethodsModal')) {
        document.removeEventListener('keydown', escapeHandler);
      }
    }
  };
  document.addEventListener('keydown', escapeHandler);
}
    
    // Close mobile modal
    function closeMobileModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.remove();
      }
    }
    
    // Update view manager hook to use this view
    function updateViewManagerHook() {
      // Check if mobile view manager exists
      if (window.mobileViewManager) {
        // Register analytics initialization function with the view manager
        const initFunctions = window.mobileViewManager.initFunctions || {};
        initFunctions.analytics = initMobileAnalytics;
        window.mobileViewManager.initFunctions = initFunctions;
      }
      
      // Hook into the existing switchView function if it hasn't been modified yet
      const originalSwitchView = window.switchView;
      if (originalSwitchView && typeof originalSwitchView === 'function') {
        window.switchView = function(view) {
          // Call original function
          originalSwitchView(view);
          
          // Apply our mobile analytics specific logic
          if (isMobile() && view === 'analytics') {
            initMobileAnalytics();
          }
        };
      }
    }
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
      console.log("Mobile analytics script loaded");
      
      // Update view manager hooks
      updateViewManagerHook();
      
      // Initialize if we're on mobile and the current view is analytics
      if (isMobile() && state.currentView === 'analytics') {
        initMobileAnalytics();
      }
      
      // Add resize listener
      window.addEventListener('resize', function() {
        if (isMobile() && state.currentView === 'analytics') {
          initMobileAnalytics();
        }
      });
    });
    
    // Make functions globally available
    window.initMobileAnalytics = initMobileAnalytics;
    window.renderMobileAnalytics = renderMobileAnalytics;
    window.showMobileCategoriesModal = showMobileCategoriesModal;
    window.showMobilePaymentMethodsModal = showMobilePaymentMethodsModal;
    window.closeMobileModal = closeMobileModal;
  
  })();