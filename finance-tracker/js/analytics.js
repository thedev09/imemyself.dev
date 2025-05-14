    document.addEventListener('DOMContentLoaded', () => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                console.log("Analytics: Auth state changed - user logged in");
                console.log("Current state transactions:", state.transactions);
            }
        });
    });

    // At the top of analytics.js
    const chartInstances = {
        netWorth: null,
        incomeExpense: null,
        categories: null,
        paymentMethods: null
    };

    function cleanupCharts() {
        Object.keys(chartInstances).forEach(key => {
            if (chartInstances[key]) {
                chartInstances[key].destroy();
                chartInstances[key] = null;
            }
        });
    }

    // Make it globally available
    window.cleanupCharts = cleanupCharts;

    // In analytics.js
    async function initializeAnalytics() {
        console.log("Initializing Analytics");
        try {
            cleanupCharts();
            
            // Initialize all components
            await renderNetWorthChart('3M');
            renderIncomeExpenseChart();
            initializeSpendingAnalysis();
            renderMonthlyBreakdown();

            // Setup event listeners
            setupAnalyticsEventListeners();
        } catch (error) {
            console.error("Error in initializeAnalytics:", error);
            showToast("Error initializing analytics. Please try again.", 'error');
        }

        const breakdownYear = document.getElementById('breakdown-year');
    if (breakdownYear) {
        breakdownYear.addEventListener('change', () => {
            renderMonthlyBreakdown();
        });
    }
    }

    function setupAnalyticsEventListeners() {
        // Net worth period buttons
        document.querySelectorAll('.time-filters button').forEach(button => {
            button.addEventListener('click', async () => {
                await renderNetWorthChart(button.dataset.period);
            });
        });

        // Time period selector
        const periodSelect = document.getElementById('trend-period');
        const yearSelect = document.getElementById('trend-year');
        if (periodSelect) {
            periodSelect.addEventListener('change', renderIncomeExpenseChart);
        }
        if (yearSelect) {
            yearSelect.addEventListener('change', renderIncomeExpenseChart);
        }
    }

    function updateSpendingCategories(transactions) {
        const container = document.getElementById('spending-categories');
        if (!container) return;
    
        // Get spending by category
        const categorySpending = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((acc, tx) => {
                if (!acc[tx.category]) {
                    acc[tx.category] = 0;
                }
                acc[tx.category] += tx.amountInINR || tx.amount;
                return acc;
            }, {});
    
        // Calculate total spending
        const totalSpending = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);
    
        // Convert to array and sort
        const sortedCategories = Object.entries(categorySpending)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: ((amount / totalSpending) * 100).toFixed(1)
            }))
            .sort((a, b) => b.amount - a.amount);
    
        // Show top 3 in main view
        const topCategories = sortedCategories.slice(0, 3);
    
        container.innerHTML = `
        <div class="categories-list">
            ${topCategories.map(cat => `
                <div class="category-item">
                    <div class="category-info">
                        <div class="category-header">
                            <div class="category-name-group">
                                <span class="category-name">${escapeHtml(cat.category)}</span>
                                <span class="category-percentage">${cat.percentage}%</span>
                            </div>
                            <span class="category-amount">${formatCurrency(cat.amount)}</span>
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${cat.percentage}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
        // Setup view all button click handler
        const viewAllBtn = container.closest('.spending-section').querySelector('.view-all');
        if (viewAllBtn) {
            viewAllBtn.onclick = () => showCategoriesModal(sortedCategories);
        }
    }
    
    function updatePaymentMethods(transactions) {
        const container = document.getElementById('spending-payments');
        if (!container) return;
    
        // Get spending by payment method
        const paymentData = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((acc, tx) => {
                if (!acc[tx.paymentMode]) {
                    acc[tx.paymentMode] = 0;
                }
                acc[tx.paymentMode] += tx.amountInINR || tx.amount;
                return acc;
            }, {});
    
        // Calculate total
        const total = Object.values(paymentData).reduce((sum, amount) => sum + amount, 0);
    
        // Convert to array and sort
        const methods = Object.entries(paymentData)
            .map(([method, amount]) => ({
                method,
                amount,
                percentage: ((amount / total) * 100).toFixed(1)
            }))
            .sort((a, b) => b.amount - a.amount);
    
        // Show top 3 methods
        const topMethods = methods.slice(0, 3);
    
        container.innerHTML = `
        <div class="categories-list">
            ${topMethods.map(method => `
                <div class="category-item">
                    <div class="category-info">
                        <div class="category-header">
                            <div class="category-name-group">
                                <span class="category-name">${escapeHtml(method.method)}</span>
                                <span class="category-percentage">${method.percentage}%</span>
                            </div>
                            <span class="category-amount">${formatCurrency(method.amount)}</span>
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${method.percentage}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
        // Setup view all button click handler
        const viewAllBtn = container.closest('.spending-section').querySelector('.view-all');
        if (viewAllBtn) {
            viewAllBtn.onclick = () => showPaymentMethodsModal(methods);
        }
    }


    function renderMonthlyBreakdown() {
        const tbody = document.getElementById('monthly-breakdown');
        const yearSelect = document.getElementById('breakdown-year');
        if (!tbody) return;
    
        const currentYear = new Date().getFullYear();
        const years = Array.from({length: 5}, (_, i) => currentYear - i);
    
        // Initialize year selector if it exists
        if (yearSelect && !yearSelect.options.length) {
            yearSelect.innerHTML = years.map(year => `
                <option value="${year}" ${year === currentYear ? 'selected' : ''}>
                    ${year}
                </option>
            `).join('');
    
            yearSelect.addEventListener('change', () => {
                renderMonthlyBreakdown();
            });
        }
    
        const selectedYear = parseInt(yearSelect?.value || currentYear);
    
        // Group transactions by month for the selected year only
        const monthlyData = state.transactions
            .filter(tx => {
                const txDate = new Date(tx.date);
                return txDate.getFullYear() === selectedYear; // Filter by selected year
            })
            .reduce((acc, tx) => {
                const txDate = new Date(tx.date);
                const monthKey = txDate.toLocaleString('default', { month: 'long' });
                const monthIndex = txDate.getMonth();
                
                if (!acc[monthKey]) {
                    acc[monthKey] = {
                        income: 0,
                        expenses: 0,
                        monthIndex: monthIndex,
                        month: monthKey,
                        year: txDate.getFullYear()
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
    
        // Calculate savings and rates for each month
        Object.values(monthlyData).forEach(data => {
            data.savings = data.income - data.expenses;
            data.savingsRate = data.income > 0 ? ((data.savings / data.income) * 100).toFixed(1) : '0.0';
        });
    
        // Sort by month index (latest first)
        const sortedMonths = Object.values(monthlyData)
            .sort((a, b) => b.monthIndex - a.monthIndex);
    
        // Render the months
        tbody.innerHTML = sortedMonths.map(data => `
            <tr>
                <td>${data.month} ${selectedYear}</td>
                <td class="income">${formatCurrency(data.income)}</td>
                <td class="expense">${formatCurrency(data.expenses)}</td>
                <td class="savings" style="color: ${data.savings < 0 ? '#f87171' : '#4ade80'}">
                    ${data.savings < 0 ? '-' : ''}${formatCurrency(Math.abs(data.savings))}
                </td>
                <td>${data.savingsRate}%</td>
                <td style="color: ${data.savings < 0 ? '#f87171' : '#4ade80'}">
                    ${data.savings < 0 ? '-' : ''}${formatCurrency(Math.abs(data.savings))}
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="no-data">No data available for selected year</td></tr>';
    }

// Add this to analytics.js
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (chartInstances.incomeExpense) {
            chartInstances.incomeExpense.resize();
        }
        if (chartInstances.netWorth) {
            chartInstances.netWorth.resize();
        }
    }, 250);
});

    // Update renderIncomeExpenseChart function
    function renderIncomeExpenseChart() {
    const ctx = document.getElementById('incomeExpenseChart')?.getContext('2d');
    if (!ctx) return;

    const periodSelect = document.getElementById('trend-period');
    const yearSelect = document.getElementById('trend-year');
    
    // Initialize year select if not already done
    if (yearSelect && yearSelect.options.length === 0) {
        const currentYear = new Date().getFullYear();
        const years = Array.from({length: 5}, (_, i) => currentYear - i);
        yearSelect.innerHTML = years.map(year => `
            <option value="${year}">${year}</option>
        `).join('');
    }

    const viewType = periodSelect?.value || 'monthly';
    const selectedYear = parseInt(yearSelect?.value || new Date().getFullYear());

    // Process transactions
    const monthlyData = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize data structures based on viewType
    if (viewType === 'monthly') {
        // Initialize all months with zero values
        months.forEach(month => {
            monthlyData[month] = {
                income: 0,
                expense: 0,
                net: 0
            };
        });

        // Filter and aggregate transactions for monthly view
        state.transactions
            .filter(tx => {
                const txDate = new Date(tx.date);
                return txDate.getFullYear() === selectedYear && tx.type !== 'transfer';
            })
            .forEach(tx => {
                const month = months[new Date(tx.date).getMonth()];
                const amount = tx.amountInINR || tx.amount;
                
                if (tx.type === 'income') {
                    monthlyData[month].income += amount;
                    monthlyData[month].net += amount;
                } else if (tx.type === 'expense') {
                    monthlyData[month].expense += amount;
                    monthlyData[month].net -= amount;
                }
            });
    } else if (viewType === 'yearly') {
        // For yearly view, we need different data structure and labels
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 4; // Show 5 years including current
        
        // Initialize yearly data
        for (let year = startYear; year <= currentYear; year++) {
            const yearKey = year.toString();
            monthlyData[yearKey] = {
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
                    monthlyData[yearKey].income += amount;
                    monthlyData[yearKey].net += amount;
                } else if (tx.type === 'expense') {
                    monthlyData[yearKey].expense += amount;
                    monthlyData[yearKey].net -= amount;
                }
            });
    }

    // Calculate totals for display
    const totals = Object.values(monthlyData).reduce((acc, curr) => ({
        income: acc.income + curr.income,
        expense: acc.expense + curr.expense,
        net: acc.net + curr.net
    }), { income: 0, expense: 0, net: 0 });

    // Update summary stats
    document.getElementById('total-income').textContent = formatCurrency(totals.income);
    document.getElementById('total-expenses').textContent = formatCurrency(totals.expense);
    document.getElementById('net-savings').textContent = formatCurrency(Math.abs(totals.net));
    document.getElementById('net-savings').style.color = totals.net >= 0 ? '#4ade80' : '#f87171';
    if (totals.net < 0) {
        document.getElementById('net-savings').textContent = '-' + document.getElementById('net-savings').textContent;
    }

    // Prepare chart data based on view type
    let labels, incomeData, expenseData, netData;
    
    if (viewType === 'monthly') {
        labels = months;
        incomeData = months.map(m => monthlyData[m].income);
        expenseData = months.map(m => monthlyData[m].expense);
        netData = months.map(m => monthlyData[m].net);
    } else {
        // For yearly view
        const years = Object.keys(monthlyData).sort();
        labels = years;
        incomeData = years.map(y => monthlyData[y].income);
        expenseData = years.map(y => monthlyData[y].expense);
        netData = years.map(y => monthlyData[y].net);
    }

    // Create chart
    if (chartInstances.incomeExpense) {
        chartInstances.incomeExpense.destroy();
    }

    chartInstances.incomeExpense = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
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
                    label: 'Net Savings',
                    data: netData,
                    borderColor: '#60a5fa',
                    tension: 0.4,
                    fill: false,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        callback: value => formatCurrency(value),
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
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
            }
        }
    });
}

// Make sure this code exists in your analytics.js file
document.addEventListener('DOMContentLoaded', () => {
    const periodSelect = document.getElementById('trend-period');
    const yearSelect = document.getElementById('trend-year');

    if (periodSelect) {
        periodSelect.addEventListener('change', renderIncomeExpenseChart);
    }
    if (yearSelect) {
        yearSelect.addEventListener('change', renderIncomeExpenseChart);
    }

    // Add this code to your event listener for periodSelect
if (periodSelect) {
    periodSelect.addEventListener('change', () => {
        const yearSelect = document.getElementById('trend-year');
        if (yearSelect) {
            yearSelect.style.display = periodSelect.value === 'monthly' ? 'block' : 'none';
        }
        renderIncomeExpenseChart();
    });
}
});

    // Make sure these are globally available
    window.initializeAnalytics = initializeAnalytics;
    window.renderAnalytics = renderAnalytics;

    // Initialize spending analysis
    function initializeSpendingAnalysis() {
        const periodSelect = document.getElementById('spending-period');
        const customRange = document.getElementById('spending-custom-range');
        
        // Period change handler
        periodSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customRange.style.display = 'flex';
            } else {
                customRange.style.display = 'none';
                updateSpendingAnalysis(e.target.value);
            }
        });

        // Custom date range handlers
        const startDate = document.getElementById('spending-start-date');
        const endDate = document.getElementById('spending-end-date');
        
        [startDate, endDate].forEach(input => {
            input.addEventListener('change', () => {
                if (startDate.value && endDate.value) {
                    updateSpendingAnalysis('custom', {
                        start: startDate.value,
                        end: endDate.value
                    });
                }
            });
        });

        // Initial load with all time data
        updateSpendingAnalysis('all');
    }

    // Update spending analysis based on period
    async function updateSpendingAnalysis(period, customDates = null) {
        let transactions = [...state.transactions];
        
        // Filter transactions based on period
        transactions = filterTransactionsByPeriod(transactions, period, customDates);
        
        // Update stats
        updateSpendingStats(transactions);
        
        // Update categories
        updateSpendingCategories(transactions);
        
        // Update payment methods
        updatePaymentMethods(transactions);
    }

    // Filter transactions helper
    function filterTransactionsByPeriod(transactions, period, customDates) {
        const now = new Date();
        let startDate;
        
        switch(period) {
            case 'thisMonth':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'last3':
                startDate = new Date(now.setMonth(now.getMonth() - 3));
                break;
            case 'last6':
                startDate = new Date(now.setMonth(now.getMonth() - 6));
                break;
            case 'thisYear':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'custom':
                startDate = new Date(customDates.start);
                now = new Date(customDates.end);
                break;
            case 'all':
            default:
                return transactions;
        }
        
        return transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= startDate && txDate <= now;
        });
    }

    function updateSpendingStats(transactions) {
        // Calculate totals
        const totals = transactions.reduce((acc, tx) => {
            if (tx.type === 'income') acc.income += tx.amountInINR;
            else if (tx.type === 'expense') acc.expenses += tx.amountInINR;
            return acc;
        }, { income: 0, expenses: 0 });

        const savings = totals.income - totals.expenses;
        const savingsRate = totals.income > 0 ? (savings / totals.income * 100) : 0;

        // Update UI with proper coloring for negative values
        document.getElementById('spending-income').textContent = formatCurrency(totals.income);
        document.getElementById('spending-expenses').textContent = formatCurrency(totals.expenses);
        
        const savingsElement = document.getElementById('spending-savings');
        savingsElement.textContent = formatCurrency(Math.abs(savings));
        savingsElement.style.color = savings < 0 ? '#f87171' : '#4ade80'; // Red for negative, green for positive
        
        // Add negative sign for display if savings is negative
        if (savings < 0) {
            savingsElement.textContent = '-' + savingsElement.textContent;
        }

        document.getElementById('spending-rate').textContent = `${savingsRate.toFixed(1)}%`;
    }


    async function renderAnalytics(period = '3M') {
        console.log("Rendering Analytics with period:", period);
        try {
            await renderNetWorthChart(period);
            renderOverviewStats(period);
            renderTopCategories();
            renderPaymentMethods();
            renderMonthlyBreakdown();
            renderIncomeExpenseChart();
        } catch (error) {
            console.error("Error in renderAnalytics:", error);
            showToast("Error rendering analytics. Please try again.", 'error');
        }
    }

    async function renderNetWorthChart(period) {
        const ctx = document.getElementById('netWorthChart')?.getContext('2d');
        if (!ctx) return;

        try {
            // Update time period buttons
            document.querySelectorAll('.time-filters button').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.period === period) {
                    btn.classList.add('active');
                }
            });

            // Get snapshot data
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

            // Calculate YTD change
            const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
            const startOfYearIndex = dates.indexOf(startOfYear);
            const ytdChange = startOfYearIndex !== -1 ? 
                ((currentNetWorth - values[startOfYearIndex]) / values[startOfYearIndex] * 100).toFixed(1) : 
                ((currentNetWorth - previousNetWorth) / previousNetWorth * 100).toFixed(1);

            // Update display values
            document.getElementById('total-net-worth').textContent = formatCurrency(currentNetWorth);
            document.getElementById('monthly-change').textContent = `${monthlyChange}%`;
            document.getElementById('monthly-change-amount').textContent = formatCurrency(currentNetWorth - previousNetWorth);
            document.getElementById('ytd-growth').textContent = `${ytdChange}%`;

            // Create chart
            if (chartInstances.netWorth) {
                chartInstances.netWorth.destroy();
            }

            chartInstances.netWorth = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates.map(date => new Date(date).toLocaleDateString('default', { 
                        month: 'short', 
                        day: 'numeric' 
                    })),
                    datasets: [{
                        label: 'Net Worth',
                        data: values,
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
                    scales: {
                        y: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                callback: value => formatCurrency(value)
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return 'Net Worth: ' + formatCurrency(context.raw);
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering net worth chart:', error);
        }
    }

    // Overview Stats
    function renderOverviewStats(period) {
        const now = new Date();
        const startDate = new Date();
        
        // Set comparison period based on selected timeframe
        switch(period) {
            case '1M':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case '3M':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case '6M':
                startDate.setMonth(now.getMonth() - 6);
                break;
            case '1Y':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
        }

        // Filter transactions for selected period
        const periodTransactions = state.transactions.filter(tx => 
            new Date(tx.date) >= startDate && 
            new Date(tx.date) <= now &&
            tx.type !== 'transfer'
        );

        // Calculate totals
        const totals = periodTransactions.reduce((acc, tx) => {
            if (tx.type === 'income') acc.income += tx.amountInINR;
            else if (tx.type === 'expense') acc.expenses += tx.amountInINR;
            return acc;
        }, { income: 0, expenses: 0 });

        // Calculate savings
        const savings = totals.income - totals.expenses;
        const savingsRate = totals.income > 0 ? (savings / totals.income * 100) : 0;

        // Update UI
        document.getElementById('total-income').textContent = formatCurrency(totals.income);
        document.getElementById('total-expenses').textContent = formatCurrency(totals.expenses);
        document.getElementById('total-savings').textContent = formatCurrency(savings);
        document.getElementById('savings-rate').textContent = `${savingsRate.toFixed(1)}%`;
    }

    function renderTopCategories() {
        const container = document.getElementById('categories-content');
        if (!container) return;

        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

        // Get spending by category
        const categorySpending = state.transactions
            .filter(tx => 
                tx.type === 'expense' && 
                new Date(tx.date) >= lastMonthDate
            )
            .reduce((acc, tx) => {
                if (!acc[tx.category]) {
                    acc[tx.category] = 0;
                }
                acc[tx.category] += tx.amountInINR || tx.amount;
                return acc;
            }, {});

        // Calculate total spending
        const totalSpending = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);

        // Convert to array and sort
        const sortedCategories = Object.entries(categorySpending)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: ((amount / totalSpending) * 100).toFixed(1)
            }))
            .sort((a, b) => b.amount - a.amount);

        // Show only top 3 in main view
        const topCategories = sortedCategories.slice(0, 3);

        container.innerHTML = `
            <div class="categories-list">
                ${topCategories.map(cat => `
                    <div class="category-item">
                        <div class="category-info">
                            <span class="category-name">${escapeHtml(cat.category)}</span>
                            <span class="category-amount">${formatCurrency(cat.amount)}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${cat.percentage}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add click handler for View All button
        document.querySelector('.card .view-all').onclick = () => showCategoriesModal(sortedCategories);
    }

    


    function renderPaymentMethods() {
        const container = document.getElementById('payment-methods-content');
        if (!container) return;

        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

    // Get all payment methods button
    const viewAllButton = document.querySelector('.card:has(#payment-methods-content) .view-all');
    if (viewAllButton) {
        viewAllButton.onclick = () => showPaymentMethodsModal(methods); 
    }

        // Get spending by payment method
        const paymentData = state.transactions
            .filter(tx => 
                tx.type === 'expense' && 
                new Date(tx.date) >= lastMonthDate
            )
            .reduce((acc, tx) => {
                if (!acc[tx.paymentMode]) {
                    acc[tx.paymentMode] = 0;
                }
                acc[tx.paymentMode] += tx.amountInINR || tx.amount;
                return acc;
            }, {});

        // Calculate total
        const total = Object.values(paymentData).reduce((sum, amount) => sum + amount, 0);

        // Convert to array and sort
        const methods = Object.entries(paymentData)
            .map(([method, amount]) => ({
                method,
                amount,
                percentage: ((amount / total) * 100).toFixed(1)
            }))
            .sort((a, b) => b.amount - a.amount);

        // Show only top 3
        const topMethods = methods.slice(0, 3);

        container.innerHTML = `
            <div class="categories-list">
                ${topMethods.map(method => `
                    <div class="category-item">
                        <div class="category-info">
                            <span class="category-name">${escapeHtml(method.method)}</span>
                            <span class="category-amount">${formatCurrency(method.amount)}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${method.percentage}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add click handler for View All button

        if (viewAllButton) {
            viewAllButton.onclick = () => showPaymentMethodsModal(methods);
        }
    }

    // In analytics.js - Keep these versions and remove duplicates
    function showCategoriesModal(categories) {
        const modalHTML = `
            <div class="modal-overlay" id="categories-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">All Spending Categories</h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="categories-list">
                            ${categories.map(cat => `
                                <div class="category-item">
                                    <div class="category-header">
                                        <div class="name-with-percentage">
                                            <span class="category-name">${escapeHtml(cat.category)}</span>
                                            <span class="category-percentage">${cat.percentage}%</span>
                                        </div>
                                        <span class="category-amount">${formatCurrency(cat.amount)}</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${cat.percentage}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

    // Remove existing modal if any
    const existingModal = document.getElementById('categories-modal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('categories-modal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal) {
            modal.remove();
        }
    });
}

function showPaymentMethodsModal(methods) {
    const modalHTML = `
        <div class="modal-overlay" id="payment-methods-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">All Payment Methods</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="categories-list">
                        ${methods.map(method => `
                            <div class="category-item">
                                <div class="category-header">
                                    <div class="name-with-percentage">
                                        <span class="category-name">${escapeHtml(method.method)}</span>
                                        <span class="category-percentage">${method.percentage}%</span>
                                    </div>
                                    <span class="category-amount">${formatCurrency(method.amount)}</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${method.percentage}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('payment-methods-modal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('payment-methods-modal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal) {
            modal.remove();
        }
    });
}


    // Make functions globally available
    window.initializeAnalytics = initializeAnalytics;
    window.renderAnalytics = renderAnalytics;
    // At the bottom of analytics.js
    window.showCategoriesModal = showCategoriesModal;
    window.showPaymentMethodsModal = showPaymentMethodsModal;
    window.renderMonthlyBreakdown = renderMonthlyBreakdown;