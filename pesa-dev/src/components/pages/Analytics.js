import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, BarChart, PieChart, DollarSign, Target, Zap, 
  ArrowUpRight, ArrowDownRight, Building, Bitcoin, Wallet, 
  Activity, Download, Settings, Info, ArrowUp, ArrowDown, Star
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart as RechartsBarChart, Bar,
  PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ComposedChart
} from 'recharts';
import { db } from '../../services/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

const USD_TO_INR = 84.0;

// Enhanced color palettes for better variety
const CHART_COLORS = {
  categoryColors: ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16', '#06b6d4', '#d946ef', '#f97316', '#10b981', '#f59e0b'],
  accountColors: {
    bank: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#6366f1', '#4f46e5', '#4338ca'],
    crypto: ['#f97316', '#ea580c', '#d97706', '#b45309', '#92400e', '#f59e0b', '#d97706', '#b45309']
  }
};

const TRANSACTION_CATEGORIES = {
  income: ['Salary', 'Gift', 'Payouts', 'Gambling', 'Investments', 'Business', 'Freelance', 'Rental Income', 'Interest', 'Dividends', 'Bonus', 'Commission', 'Refunds', 'Other Income'],
  expense: ['Food & Dining', 'Travel', 'Entertainment', 'Friends & Family', 'Shopping', 'Utilities', 'Healthcare', 'Personal Care', 'Gifts & Donations', 'Bills', 'Groceries', 'Vehicle', 'Subscriptions', 'Hobbies', 'Eval', 'Other Expenses']
};

function Analytics({ accounts, transactions }) {
  const { currentUser } = useAuth();
  const [timeRange, setTimeRange] = useState('thisYear');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [chartType, setChartType] = useState('overview');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  // Add state for year filter
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Load actual net worth snapshots from Firestore
  const [netWorthSnapshots, setNetWorthSnapshots] = useState([]);
  
  useEffect(() => {
    const loadNetWorthSnapshots = async () => {
      if (!currentUser) return;
      
      try {
        const snapshotsRef = collection(db, 'users', currentUser.uid, 'netWorthSnapshots');
        const q = query(snapshotsRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const snapshots = {};
        querySnapshot.docs.forEach(doc => {
          snapshots[doc.id] = doc.data();
        });
        
        setNetWorthSnapshots(snapshots);
      } catch (error) {
        console.error('Error loading net worth snapshots:', error);
      }
    };
    
    loadNetWorthSnapshots();
  }, [currentUser]);

  // Get available years from transaction data
  const getAvailableYears = () => {
    const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))];
    return years.sort((a, b) => b - a); // Most recent first
  };

  // Find the earliest transaction date to determine data start
  const getDataStartDate = () => {
    if (transactions.length === 0) return new Date();
    const earliestDate = new Date(Math.min(...transactions.map(t => new Date(t.date))));
    return earliestDate;
  };

  // Utility functions
  const formatCurrency = (amount, currency = 'INR') => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
    });
    return formatter.format(amount);
  };

  const formatIndianNumber = (num) => {
    const absNum = Math.abs(num);
    if (absNum >= 10000000) {
      return (num / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
    } else if (absNum >= 100000) {
      return (num / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    } else if (absNum >= 1000) {
      return (num / 1000).toFixed(0) + 'k';
    }
    return num.toString();
  };

  const convertToINR = (amount, currency) => {
    return currency === 'USD' ? amount * USD_TO_INR : amount;
  };

  const getDateRange = (range) => {
    const now = new Date();
    const dataStart = getDataStartDate();
    let start = new Date();
    
    switch (range) {
      case 'thisWeek':
        start.setDate(now.getDate() - now.getDay()); // Start of current week
        start.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'allTime':
        start = dataStart;
        break;
      default:
        start = new Date(now.getFullYear(), 0, 1);
    }
    
    // Ensure we don't go before data start date
    if (start < dataStart) {
      start = dataStart;
    }
    
    return { start, end: now };
  };

  // Filter transactions based on current filters
  const filteredTransactions = useMemo(() => {
    const { start, end } = getDateRange(timeRange);
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const dateInRange = transactionDate >= start && transactionDate <= end;
      const accountMatch = selectedAccount === 'all' || transaction.accountId === selectedAccount;
      const categoryMatch = selectedCategory === 'all' || transaction.category === selectedCategory;
      
      return dateInRange && accountMatch && categoryMatch;
    });
  }, [transactions, timeRange, selectedAccount, selectedCategory]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + convertToINR(t.amount, t.currency), 0);
    
    const totalExpense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + convertToINR(t.amount, t.currency), 0);
    
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    
    const currentNetWorth = accounts.reduce((total, account) => {
      return total + convertToINR(account.balance, account.currency);
    }, 0);

    // Previous period comparison
    const { start: prevStart, end: prevEnd } = getDateRange(timeRange);
    const prevPeriodEnd = new Date(prevStart);
    const prevPeriodStart = new Date(prevStart);
    prevPeriodStart.setTime(prevPeriodStart.getTime() - (prevEnd.getTime() - prevStart.getTime()));

    const prevTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= prevPeriodStart && date <= prevPeriodEnd;
    });

    const prevIncome = prevTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + convertToINR(t.amount, t.currency), 0);
    
    const prevExpense = prevTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + convertToINR(t.amount, t.currency), 0);

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      currentNetWorth,
      transactionCount: filteredTransactions.length,
      avgTransactionAmount: filteredTransactions.length > 0 
        ? filteredTransactions.reduce((sum, t) => sum + convertToINR(t.amount, t.currency), 0) / filteredTransactions.length 
        : 0,
      incomeGrowth: prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0,
      expenseGrowth: prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : 0
    };
  }, [filteredTransactions, accounts, transactions, timeRange]);

  // Prepare chart data
  const chartData = useMemo(() => {
    // Monthly trend data
    const monthlyData = {};
    const { start, end } = getDateRange(timeRange);
    
    // For thisMonth, we need daily data instead of monthly aggregates
    if (timeRange === 'thisMonth') {
      // Initialize days for current month
      const currentMonth = new Date();
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        if (date <= new Date()) { // Only show up to today
          const key = date.toISOString().slice(0, 10); // YYYY-MM-DD
          monthlyData[key] = {
            month: date.toLocaleDateString('en-IN', { day: 'numeric' }),
            income: 0,
            expense: 0,
            transactions: 0
          };
        }
      }
    } else {
      // Initialize months for other time ranges
      for (let d = new Date(start); d <= new Date(); d.setMonth(d.getMonth() + 1)) {
        const key = d.toISOString().slice(0, 7); // YYYY-MM
        monthlyData[key] = {
          month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          income: 0,
          expense: 0,
          transactions: 0
        };
      }
    }
    
    // Populate with transaction data
    filteredTransactions.forEach(transaction => {
      const key = timeRange === 'thisMonth' 
        ? transaction.date.slice(0, 10) // YYYY-MM-DD for daily
        : transaction.date.slice(0, 7);  // YYYY-MM for monthly
      
      if (monthlyData[key]) {
        const amountINR = convertToINR(transaction.amount, transaction.currency);
        if (transaction.type === 'income') {
          monthlyData[key].income += amountINR;
        } else if (transaction.type === 'expense') {
          monthlyData[key].expense += amountINR;
        }
        monthlyData[key].transactions += 1;
      }
    });

    // Calculate net worth for each month using actual snapshots
    const monthlyArray = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        let netWorth = null;
        
        // Find the last day snapshot for this month
        const lastDayOfMonth = new Date(parseInt(year), parseInt(month) - 1 + 1, 0).getDate();
        
        // Try to find snapshot from last day of month backwards
        for (let day = lastDayOfMonth; day >= 1; day--) {
          const dateKey = `${year}-${month}-${String(day).padStart(2, '0')}`;
          if (netWorthSnapshots[dateKey]) {
            netWorth = netWorthSnapshots[dateKey].totalNetWorth;
            break;
          }
        }
        
        // For January 2025, use estimated value if no snapshot exists
        if (year === '2025' && month === '01' && netWorth === null) {
          netWorth = 950000; // Using 9.5L as a middle estimate
        }
        
        // If still no snapshot, use current net worth as fallback for current month
        if (netWorth === null && key === new Date().toISOString().slice(0, 7)) {
          netWorth = metrics.currentNetWorth;
        }
        
        return {
          ...data,
          netWorth: netWorth || 0,
          savings: data.income - data.expense
        };
      });

    // Category breakdown
    const categoryData = {};
    TRANSACTION_CATEGORIES.expense.forEach(cat => {
      categoryData[cat] = 0;
    });
    
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const category = transaction.category || 'Other Expenses';
        if (categoryData[category] !== undefined) {
          categoryData[category] += convertToINR(transaction.amount, transaction.currency);
        } else {
          categoryData['Other Expenses'] += convertToINR(transaction.amount, transaction.currency);
        }
      });

    const categoryArray = Object.entries(categoryData)
      .filter(([_, value]) => value > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 8)
      .map(([name, value], index) => ({
        name,
        value,
        percentage: metrics.totalExpense > 0 ? (value / metrics.totalExpense) * 100 : 0,
        color: CHART_COLORS.categoryColors[index % CHART_COLORS.categoryColors.length]
      }));

    // Account distribution with better colors
    const accountColors = ['#3b82f6', '#f97316', '#22c55e', '#8b5cf6', '#ef4444', '#14b8a6', '#f59e0b', '#6366f1', '#84cc16', '#f43f5e'];
    const accountData = accounts
      .filter(acc => !acc.isDeleted)
      .map((account, index) => ({
        name: account.name,
        value: convertToINR(account.balance, account.currency),
        currency: account.currency,
        type: account.type,
        percentage: metrics.currentNetWorth > 0 ? (convertToINR(account.balance, account.currency) / metrics.currentNetWorth) * 100 : 0,
        color: accountColors[index % accountColors.length]
      }))
      .sort((a, b) => b.value - a.value);

    return {
      monthly: monthlyArray,
      categories: categoryArray,
      accounts: accountData
    };
  }, [filteredTransactions, accounts, timeRange, metrics, netWorthSnapshots]);

  const timeRangeOptions = [
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'allTime', label: 'All Time' }
  ];

  const chartTypes = [
    { value: 'overview', label: 'Overview', icon: BarChart },
    { value: 'trends', label: 'Trends', icon: TrendingUp },
    { value: 'categories', label: 'Categories', icon: PieChart },
    { value: 'accounts', label: 'Accounts', icon: Wallet }
  ];

  const MetricCard = ({ title, value, change, icon: Icon, color = 'blue', trend = null }) => (
    <div className="metric-card card-shadow bg-white dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.02] border border-gray-100 dark:border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
        <div className={`icon-container w-10 h-10 rounded-xl bg-${color}-100 dark:bg-${color}-500/20 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? formatCurrency(value) : value}
        </h2>
        {change !== undefined && (
          <div className={`change-indicator flex items-center space-x-1 text-sm ${
            change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {change >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            <span>{Math.abs(change).toFixed(1)}% vs last period</span>
          </div>
        )}
        {trend && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full bg-${color}-500 transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.abs(trend))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg backdrop-blur-sm">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 dark:text-gray-400">{entry.dataKey}:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (chartType) {
      case 'trends':
        return (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData.monthly}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="month" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} tickFormatter={formatIndianNumber} domain={[0, 'dataMax + 500000']} ticks={[0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000, 3500000, 4000000, 4500000, 5000000]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stackId="1"
                  stroke="#22c55e" 
                  fill="url(#incomeGradient)"
                  name="Income"
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  stackId="2"
                  stroke="#ef4444" 
                  fill="url(#expenseGradient)"
                  name="Expenses"
                />
                <Line 
                  type="monotone" 
                  dataKey="netWorth" 
                  stroke="#f97316" 
                  strokeWidth={3}
                  name="Net Worth"
                  dot={{ fill: '#f97316', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        );

      case 'categories':
        return (
          <div className="chart-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="chart-pie-container h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={chartData.categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Amount']}
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-elevated)', 
                      border: '1px solid var(--border-primary)', 
                      borderRadius: '8px' 
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Category Breakdown</h4>
              <div className="chart-legend space-y-2 max-h-64 overflow-y-auto">
                {chartData.categories.map((category, index) => (
                  <div key={category.name} className="chart-legend-item flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(category.value)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {category.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'accounts':
        return (
          <div className="chart-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="chart-pie-container h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={chartData.accounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.accounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Balance']}
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-elevated)', 
                      border: '1px solid var(--border-primary)', 
                      borderRadius: '8px' 
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Account Distribution</h4>
              <div className="chart-legend space-y-2 max-h-64 overflow-y-auto">
                {chartData.accounts.map((account, index) => (
                  <div key={account.name} className="chart-legend-item flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: account.color }}
                      />
                      <div className="flex items-center space-x-2">
                        {account.type === 'crypto' ? 
                          <Bitcoin className="w-4 h-4 text-orange-500" /> : 
                          <Building className="w-4 h-4 text-blue-500" />
                        }
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {account.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(account.value)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {account.percentage.toFixed(1)}% • {account.currency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default: // overview
        return (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%" minHeight={280}>
              <RechartsBarChart data={chartData.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="month" stroke="currentColor" fontSize={12} />
                <YAxis 
                  stroke="currentColor" 
                  fontSize={12} 
                  tickFormatter={formatIndianNumber}
                  domain={[0, 'dataMax + 500000']}
                  ticks={[0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000, 3500000, 4000000, 4500000, 5000000]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" fill="#f97316" name="Savings" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        );
    }
  };

  return (
    <div className="analytics-container p-6 space-y-6 animate-fade-in relative min-h-screen transition-all duration-500">
      {/* Header */}
      <div className="analytics-header flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="header-content">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
            Insights into your financial patterns and trends
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`comparison-mode-button p-2 rounded-lg shadow-sm dark:shadow-lg hover:shadow-md dark:hover:shadow-xl transition-all duration-300 backdrop-blur-sm border ${
              comparisonMode 
                ? 'bg-orange-500 text-white border-orange-500' 
                : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10'
            }`}
            title="Comparison mode"
          >
            <Activity className="w-5 h-5" />
          </button>
          
          <div className="time-range-controls horizontal-scroll flex bg-white dark:bg-white/5 rounded-lg p-1 shadow-sm dark:shadow-lg backdrop-blur-sm border border-gray-200 dark:border-white/10">
            {timeRangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={`px-3 py-1 text-sm rounded-md transition-all duration-300 whitespace-nowrap ${
                  timeRange === option.value
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Income"
          value={metrics.totalIncome}
          change={comparisonMode ? metrics.incomeGrowth : undefined}
          icon={ArrowDownRight}
          color="green"
        />
        <MetricCard
          title="Total Expenses"
          value={metrics.totalExpense}
          change={comparisonMode ? metrics.expenseGrowth : undefined}
          icon={ArrowUpRight}
          color="red"
        />
        <MetricCard
          title="Net Savings"
          value={metrics.netSavings}
          icon={Target}
          color={metrics.netSavings >= 0 ? 'blue' : 'orange'}
          trend={metrics.savingsRate}
        />
        <MetricCard
          title="Net Worth"
          value={metrics.currentNetWorth}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Chart Section */}
      <div className="chart-container content-section card-shadow bg-white dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-white/10">
        {/* Chart Controls */}
        <div className="chart-controls flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="chart-controls-header flex items-center justify-between w-full lg:w-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Insights</h3>
            <div className="chart-type-buttons flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {chartTypes.map(type => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setChartType(type.value)}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-all duration-300 ${
                      chartType === type.value
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:inline">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="filter-controls flex items-center space-x-3">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
            >
              <option value="all">All Accounts</option>
              {accounts.filter(acc => !acc.isDeleted).map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            
            {chartType === 'categories' && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
              >
                <option value="all">All Categories</option>
                {[...TRANSACTION_CATEGORIES.income, ...TRANSACTION_CATEGORIES.expense].map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Chart Content */}
        <div className={`${chartType === 'categories' || chartType === 'accounts' ? 'chart-content-pie' : 'chart-content'} w-full`}>
          {renderChart()}
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="insights-grid content-section grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="insight-card card-shadow bg-white dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-white/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Key Insights</h3>
          </div>
          
          <div className="space-y-3">
            {metrics.savingsRate > 20 && (
              <div className="insight-item flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
                <Star className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Excellent Savings Rate!</p>
                  <p className="text-xs text-green-700 dark:text-green-400">You're saving {metrics.savingsRate.toFixed(1)}% of your income. Keep it up!</p>
                </div>
              </div>
            )}
            
            {metrics.expenseGrowth > 20 && (
              <div className="insight-item flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg border border-yellow-200 dark:border-yellow-500/20">
                <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Rising Expenses</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">Your expenses increased by {metrics.expenseGrowth.toFixed(1)}% this period.</p>
                </div>
              </div>
            )}
            
            {chartData.categories.length > 0 && (
              <div className="insight-item flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
                <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Top Expense Category</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    {chartData.categories[0]?.name} accounts for {chartData.categories[0]?.percentage.toFixed(1)}% of expenses
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="insight-card card-shadow bg-white dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-white/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Health</h3>
          </div>
          
          <div className="space-y-4">
            <div className="health-metric bg-gray-50 dark:bg-white/5 rounded-lg p-4">
              <div className="health-metric-header flex items-center justify-between mb-2">
                <span className="health-metric-text text-sm text-gray-600 dark:text-gray-400">Savings Rate</span>
                <span className={`text-sm font-medium ${
                  metrics.savingsRate >= 20 ? 'text-green-600 dark:text-green-400' : 
                  metrics.savingsRate >= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {metrics.savingsRate.toFixed(1)}%
                </span>
              </div>
              <div className="progress-bar w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    metrics.savingsRate >= 20 ? 'bg-green-500' : 
                    metrics.savingsRate >= 10 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, metrics.savingsRate))}%` }}
                />
              </div>
            </div>
            
            <div className="health-metric bg-gray-50 dark:bg-white/5 rounded-lg p-4">
              <div className="health-metric-header flex items-center justify-between mb-2">
                <span className="health-metric-text text-sm text-gray-600 dark:text-gray-400">Account Diversity</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {accounts.filter(acc => !acc.isDeleted).length} accounts
                </span>
              </div>
              <div className="health-metric-text text-xs text-gray-500 dark:text-gray-400">
                {accounts.filter(acc => !acc.isDeleted && acc.type === 'bank').length} Bank • {accounts.filter(acc => !acc.isDeleted && acc.type === 'crypto').length} Crypto
              </div>
            </div>
            
            <div className="health-metric bg-gray-50 dark:bg-white/5 rounded-lg p-4">
              <div className="health-metric-header flex items-center justify-between mb-2">
                <span className="health-metric-text text-sm text-gray-600 dark:text-gray-400">Transaction Volume</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {metrics.transactionCount}
                </span>
              </div>
              <div className="health-metric-text text-xs text-gray-500 dark:text-gray-400">
                Avg {formatCurrency(metrics.avgTransactionAmount)} per transaction
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="content-section card-shadow bg-white dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-white/10">
        <div className="monthly-breakdown-header flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Breakdown</h3>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="year-filter px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
          >
            {getAvailableYears().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div className="monthly-table-container overflow-x-auto">
          <table className="monthly-table w-full">
            <thead className="sticky-header bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Income</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expenses</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Savings</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Worth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {(() => {
                // Get the months for the selected year
                const months = [];
                const currentDate = new Date();
                const isCurrentYear = selectedYear === currentDate.getFullYear();
                
                // For current year, show only up to current month
                // For past years, show all 12 months
                const maxMonth = isCurrentYear ? currentDate.getMonth() : 11;
                
                for (let month = 0; month <= maxMonth; month++) {
                  const monthDate = new Date(selectedYear, month, 1);
                  const monthKey = monthDate.toLocaleDateString('en-IN', { 
                    month: 'long', 
                    year: 'numeric' 
                  });
                  const monthMobile = monthDate.toLocaleDateString('en-IN', { 
                    month: 'long'
                  });
                  
                  // Get month data from filtered transactions
                  const monthlyIncome = filteredTransactions
                    .filter(t => {
                      const tDate = new Date(t.date);
                      return tDate.getMonth() === month && 
                             tDate.getFullYear() === selectedYear && 
                             t.type === 'income';
                    })
                    .reduce((sum, t) => sum + convertToINR(t.amount, t.currency), 0);
                  
                  const monthlyExpense = filteredTransactions
                    .filter(t => {
                      const tDate = new Date(t.date);
                      return tDate.getMonth() === month && 
                             tDate.getFullYear() === selectedYear && 
                             t.type === 'expense';
                    })
                    .reduce((sum, t) => sum + convertToINR(t.amount, t.currency), 0);
                  
                  const savings = monthlyIncome - monthlyExpense;
                  const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;
                  
                  // Find the last day snapshot for this month
                  let netWorth = null;
                  const year = selectedYear;
                  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
                  
                  // Try to find snapshot from last day of month backwards
                  for (let day = lastDayOfMonth; day >= 1; day--) {
                    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    if (netWorthSnapshots[dateKey]) {
                      netWorth = netWorthSnapshots[dateKey].totalNetWorth;
                      break;
                    }
                  }
                  
                  // For January 2025, use estimated value if no snapshot exists
                  if (selectedYear === 2025 && month === 0 && netWorth === null) {
                    // You mentioned you had between 8-11L on Jan 31st
                    netWorth = 950000; // Using 9.5L as a middle estimate
                  }
                  
                  months.push({
                    key: monthKey,
                    keyMobile: monthMobile,
                    month: month,
                    year: selectedYear,
                    income: monthlyIncome,
                    expense: monthlyExpense,
                    savings: savings,
                    savingsRate: savingsRate,
                    netWorth: netWorth
                  });
                }
                
                // Show in reverse chronological order (most recent first)
                return months.reverse().map((monthData, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-300">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        <span className="hidden sm:inline">{monthData.key}</span>
                        <span className="sm:hidden">{monthData.keyMobile}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(monthData.income)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        {formatCurrency(monthData.expense)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        monthData.savings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {monthData.savings >= 0 ? '' : '-'}{formatCurrency(Math.abs(monthData.savings))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`savings-rate-mobile text-sm font-medium ${
                          monthData.savingsRate >= 20 ? 'text-green-600 dark:text-green-400' :
                          monthData.savingsRate >= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {monthData.savingsRate.toFixed(1)}%
                        </span>
                        <div className="progress-bar-mini w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              monthData.savingsRate >= 20 ? 'bg-green-500' :
                              monthData.savingsRate >= 10 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, monthData.savingsRate))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {monthData.netWorth !== null ? formatCurrency(monthData.netWorth) : '-'}
                      </span>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Analytics;