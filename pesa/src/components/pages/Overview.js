import React from 'react';
import { 
  Sun, DollarSign, ArrowUpRight, ArrowDownRight, 
  Send, Download, MoreVertical, Filter, Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const USD_TO_INR = 84.0;

function Overview({ accounts, transactions }) {
  const formatCurrency = (amount, currency = 'INR') => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
    });
    return formatter.format(amount);
  };

  const convertToINR = (amount, currency) => {
    return currency === 'USD' ? amount * USD_TO_INR : amount;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  // Calculate totals
  const totalBalanceINR = accounts.reduce((total, account) => {
    return total + convertToINR(account.balance, account.currency);
  }, 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + convertToINR(t.amount, t.currency), 0);

  const monthlyExpense = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + convertToINR(t.amount, t.currency), 0);

  const recentTransactions = [...transactions].slice(0, 5);

  // Sample chart data
  const chartData = [
    { month: 'Jan', profit: 15000, loss: 12000 },
    { month: 'Feb', profit: 18000, loss: 14000 },
    { month: 'Mar', profit: 22000, loss: 16000 },
    { month: 'Apr', profit: 20000, loss: 18000 },
    { month: 'May', profit: 25000, loss: 15000 },
    { month: 'Jun', profit: 28000, loss: 17000 },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const userName = 'User'; // You can get this from currentUser

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Sun className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white">{greeting}, {userName}</h1>
            <p className="text-gray-600 dark:text-gray-400">Stay on top of your tasks, monitor progress, and track status.</p>
          </div>
        </div>
      </div>

      {/* Balance and Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Balance Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-600 dark:text-gray-400">Total Balance</h3>
            <select className="text-sm border-0 bg-transparent focus:outline-none dark:text-gray-400">
              <option>INR</option>
            </select>
          </div>
          <div className="mb-4">
            <h2 className="text-3xl font-bold dark:text-white">{formatCurrency(totalBalanceINR)}</h2>
            <p className="text-sm text-green-500 flex items-center mt-1">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              5% than last month
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="flex-1 bg-gray-900 dark:bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-800 transition-colors">
              <Send className="w-4 h-4" />
              <span>Transfer</span>
            </button>
            <button className="flex-1 border border-gray-300 dark:border-gray-700 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white">
              <Download className="w-4 h-4" />
              <span>Request</span>
            </button>
          </div>
          
          {/* Wallets */}
          <div className="mt-6">
            <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-3">Wallets | Total {accounts.length} wallets</h4>
            <div className="grid grid-cols-3 gap-3">
              {accounts.slice(0, 3).map((account) => (
                <div key={account.id} className="text-center">
                  <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                    account.currency === 'USD' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    <DollarSign className={`w-6 h-6 ${
                      account.currency === 'USD' ? 'text-red-500' : 'text-blue-500'
                    }`} />
                  </div>
                  <p className="text-xs font-medium dark:text-white">
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {account.currency === 'USD' && `₹${formatCurrency(convertToINR(account.balance, 'USD'), 'INR').replace('₹', '')}`}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{account.type}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Earnings and Spending Cards */}
        <div className="space-y-4">
          <div className="bg-orange-500 text-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm opacity-90">Total Earnings</h3>
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-1">{formatCurrency(monthlyIncome)}</h2>
            <p className="text-sm opacity-90">↑ 7% This month</p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-gray-600 dark:text-gray-400">Total Spending</h3>
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold dark:text-white mb-1">{formatCurrency(monthlyExpense)}</h2>
            <p className="text-sm text-red-500">↑ 5% This month</p>
          </div>
        </div>

        {/* Income Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium dark:text-white">Total Income</h3>
            <div className="flex items-center space-x-4 text-xs">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-gray-900 dark:bg-gray-700 rounded mr-1"></span>
                <span className="text-gray-600 dark:text-gray-400">Profit</span>
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 bg-orange-500 rounded mr-1"></span>
                <span className="text-gray-600 dark:text-gray-400">Loss</span>
              </span>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Bar dataKey="profit" fill="#111827" />
                <Bar dataKey="loss" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold dark:text-white">Recent Activities</h3>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Filter</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="pb-3 font-medium">Order ID</th>
                <th className="pb-3 font-medium">Activity</th>
                <th className="pb-3 font-medium">Price</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-4">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600" />
                      <span className="text-sm font-medium dark:text-white">INV_{transaction.id.slice(0, 6).toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {transaction.type === 'income' ? 
                          <ArrowDownRight className="w-5 h-5 text-green-600" /> :
                          <ArrowUpRight className="w-5 h-5 text-red-600" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium dark:text-white">{transaction.category}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{transaction.accountName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="text-sm font-medium dark:text-white">
                      {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount, transaction.currency)}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      transaction.type === 'income' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {transaction.type === 'income' ? 'Completed' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="py-4">
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                      <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Overview;
