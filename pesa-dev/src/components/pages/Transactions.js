import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Plus, Filter, Search, MoreVertical, ArrowUpRight, ArrowDownRight, 
  Send, Edit, Trash2, DollarSign, Wallet, Building, Bitcoin, 
  AlertTriangle, X, Check, CreditCard
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc,
  writeBatch, increment
} from 'firebase/firestore';

const USD_TO_INR = 84.0;

const TRANSACTION_CATEGORIES = {
  income: ['Salary', 'Gift', 'Payouts', 'Gambling', 'Investments', 'Business', 'Freelance', 'Rental Income', 'Interest', 'Dividends', 'Bonus', 'Commission', 'Refunds', 'Other Income'],
  expense: ['Food & Dining', 'Travel', 'Entertainment', 'Friends & Family', 'Shopping', 'Utilities', 'Healthcare', 'Personal Care', 'Gifts & Donations', 'Bills', 'Groceries', 'Vehicle', 'Subscriptions', 'Hobbies', 'Eval', 'Other Expenses'],
  transfer: ['Self Transfer', 'Account Transfer', 'Wallet Transfer'],
  adjustment: ['Balance Reconciliation', 'Bank Interest', 'Bank Charges', 'Missed Transaction', 'Other Adjustment']
};

const PAYMENT_MODES = {
  bank: ['UPI', 'Bank Transfer', 'Debit Card', 'Credit Card', 'Cash', 'Net Banking'],
  crypto: ['Crypto Transfer', 'Crypto Card', 'Exchange Transfer', 'DeFi Transaction']
};

function Transactions({ accounts, transactions }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const urlParams = new URLSearchParams(location.search);
  const initialMode = urlParams.get('mode');
  
  const [showAddModal, setShowAddModal] = useState(initialMode === 'add');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // Get current date/time in local timezone for datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [formData, setFormData] = useState({
    type: initialMode === 'transfer' ? 'transfer' : 'expense',
    amount: '', currency: 'INR', accountId: '', toAccountId: '',
    category: '', paymentMode: '', notes: '', newBalance: '',
    date: getCurrentDateTime(), isIncrease: true
  });
  
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [filters, setFilters] = useState({
    search: '', type: 'all', accountId: 'all', category: 'all', paymentMode: 'all',
    datePreset: 'thisMonth', dateFrom: firstDayOfMonth, dateTo: lastDayOfMonth,
    amountMin: '', amountMax: ''
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionsPerPage] = useState(20);

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialMode) navigate('/transactions', { replace: true });
  }, [initialMode, navigate]);

  // Reset date to current time when opening modal
  useEffect(() => {
    if (showAddModal) {
      setFormData(prev => ({
        ...prev,
        date: getCurrentDateTime()
      }));
    }
  }, [showAddModal]);

  // Add keyboard event listeners for modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddModal) {
          setShowAddModal(false);
          resetForm();
        }
        if (showEditModal) {
          setShowEditModal(false);
          setSelectedTransaction(null);
          resetForm();
        }
        if (showDeleteModal) {
          setShowDeleteModal(false);
          setSelectedTransaction(null);
        }
      }
    };

    if (showAddModal || showEditModal || showDeleteModal) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showAddModal, showEditModal, showDeleteModal]);

  const formatCurrency = (amount, currency = 'INR') => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: currency,
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
    });
    return formatter.format(amount);
  };

  const convertToINR = (amount, currency) => currency === 'USD' ? amount * USD_TO_INR : amount;
  
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });
  
  const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('en-IN', { 
    hour: '2-digit', minute: '2-digit' 
  });

  const getAccountById = (id) => accounts.find(acc => acc.id === id);

  const getTransactionIcon = (type) => {
    const icons = {
      income: <ArrowDownRight className="w-5 h-5 text-green-600 dark:text-green-400" />,
      expense: <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />,
      transfer: <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      adjustment: <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
    };
    return icons[type] || null;
  };

  const getTransactionColor = (type) => {
    const colors = {
      income: 'bg-green-100 dark:bg-green-500/10',
      expense: 'bg-red-100 dark:bg-red-500/10',
      transfer: 'bg-blue-100 dark:bg-blue-500/10',
      adjustment: 'bg-orange-100 dark:bg-orange-500/10'
    };
    return colors[type] || 'bg-gray-100 dark:bg-gray-800';
  };

  const getAccountIcon = (type, subtype) => {
    if (type === 'crypto') return Bitcoin;
    if (subtype === 'Credit Card') return CreditCard;
    return Building;
  };

  const handleDatePresetChange = (preset) => {
    const today = new Date();
    let dateFrom = '', dateTo = '';
    
    switch(preset) {
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        dateFrom = startOfWeek.toISOString().split('T')[0];
        dateTo = endOfWeek.toISOString().split('T')[0];
        break;
      case 'thisMonth':
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        dateTo = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'thisYear':
        dateFrom = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        dateTo = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
        break;
      case 'allTime':
        dateFrom = ''; dateTo = ''; break;
      case 'custom':
        break;
    }
    
    setFilters({ ...filters, datePreset: preset, dateFrom, dateTo });
  };

  const resetForm = () => {
    setFormData({
      type: 'expense', amount: '', currency: 'INR', accountId: '', toAccountId: '',
      category: '', paymentMode: '', notes: '', newBalance: '',
      date: getCurrentDateTime(), isIncrease: true
    });
  };

  // FIXED: Use the same filtering logic as dashboard/analytics for consistency
  const filteredTransactions = transactions.filter(transaction => {
    if (filters.search && !transaction.notes?.toLowerCase().includes(filters.search.toLowerCase()) && 
        !transaction.category?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.type !== 'all' && transaction.type !== filters.type) return false;
    if (filters.accountId !== 'all' && transaction.accountId !== filters.accountId) return false;
    if (filters.category !== 'all' && transaction.category !== filters.category) return false;
    if (filters.paymentMode !== 'all' && transaction.paymentMode !== filters.paymentMode) return false;
    
    // FIXED: Use the same approach as Overview.js and Analytics.js
    if (filters.datePreset === 'thisMonth') {
      const transactionDate = new Date(transaction.date);
      const currentDate = new Date();
      const transactionMonth = transactionDate.getMonth();
      const transactionYear = transactionDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      if (transactionMonth !== currentMonth || transactionYear !== currentYear) return false;
    } else if (filters.datePreset === 'thisWeek') {
      const transactionDate = new Date(transaction.date);
      const currentDate = new Date();
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      if (transactionDate < startOfWeek || transactionDate > endOfWeek) return false;
    } else if (filters.datePreset === 'thisYear') {
      const transactionDate = new Date(transaction.date);
      const currentDate = new Date();
      const transactionYear = transactionDate.getFullYear();
      const currentYear = currentDate.getFullYear();
      
      if (transactionYear !== currentYear) return false;
    } else if (filters.datePreset === 'custom' && (filters.dateFrom || filters.dateTo)) {
      const transactionDate = new Date(transaction.date);
      
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom + 'T00:00:00');
        if (transactionDate < fromDate) return false;
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo + 'T23:59:59.999');
        if (transactionDate > toDate) return false;
      }
    }
    // For 'allTime', no date filtering needed
    
    if (filters.amountMin && transaction.amount < parseFloat(filters.amountMin)) return false;
    if (filters.amountMax && transaction.amount > parseFloat(filters.amountMax)) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date)); // FIXED: Ensure descending order by date

  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

  const totalIncome = filteredTransactions.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + convertToINR(t.amount, t.currency), 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + convertToINR(t.amount, t.currency), 0);
  const netAmount = totalIncome - totalExpense;

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    
    // Enhanced validation based on transaction type
    if (!currentUser || loading || !formData.accountId) return;
    
    if (formData.type === 'transfer' && (!formData.amount || !formData.toAccountId)) return;
    if (formData.type === 'adjustment' && !formData.newBalance) return;
    if (['income', 'expense'].includes(formData.type) && (!formData.amount || !formData.category)) return;

    // No date validation - users can set any date/time

    try {
      setLoading(true);
      const batch = writeBatch(db);
      const account = getAccountById(formData.accountId);
      if (!account) throw new Error('Account not found');
      
      let amount;
      let transactionData = {
        userId: currentUser.uid,
        accountId: formData.accountId,
        accountName: account.name,
        currency: account.currency,
        date: new Date(formData.date).toISOString(),
        notes: formData.notes,
        createdAt: new Date().toISOString()
      };

      if (formData.type === 'adjustment') {
        // For adjustments, calculate the difference
        const newBalance = parseFloat(formData.newBalance);
        const currentBalance = account.balance;
        amount = newBalance - currentBalance;
        
        transactionData = {
          ...transactionData,
          type: 'adjustment',
          amount: Math.abs(amount),
          amountInINR: convertToINR(Math.abs(amount), account.currency),
          exchangeRate: account.currency === 'USD' ? USD_TO_INR : 1,
          isIncrease: amount >= 0,
          category: 'Balance Reconciliation',
          paymentMode: 'Account Adjustment',
          newBalance: newBalance,
          previousBalance: currentBalance
        };

        const accountRef = doc(db, 'users', currentUser.uid, 'accounts', formData.accountId);
        batch.update(accountRef, {
          balance: newBalance,
          lastActivityAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        amount = parseFloat(formData.amount);
        const amountInINR = convertToINR(amount, account.currency);
        
        transactionData = {
          ...transactionData,
          type: formData.type,
          amount: amount,
          amountInINR: amountInINR,
          exchangeRate: account.currency === 'USD' ? USD_TO_INR : 1
        };

        if (formData.type === 'transfer') {
          const toAccount = getAccountById(formData.toAccountId);
          if (!toAccount) throw new Error('Destination account not found');
          if (formData.accountId === formData.toAccountId) throw new Error('Cannot transfer to same account');
          
          transactionData.toAccountId = formData.toAccountId;
          transactionData.toAccountName = toAccount.name;
          transactionData.fromAccountId = formData.accountId;
          transactionData.category = 'Self Transfer';
          transactionData.paymentMode = 'Account Transfer';
          
          const fromAccountRef = doc(db, 'users', currentUser.uid, 'accounts', formData.accountId);
          const toAccountRef = doc(db, 'users', currentUser.uid, 'accounts', formData.toAccountId);
          
          batch.update(fromAccountRef, {
            balance: increment(-amount),
            lastActivityAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          
          const convertedAmount = account.currency !== toAccount.currency 
            ? (account.currency === 'USD' ? amount * USD_TO_INR : amount / USD_TO_INR) : amount;
            
          batch.update(toAccountRef, {
            balance: increment(convertedAmount),
            lastActivityAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          // Add converted amount info to transaction
          if (account.currency !== toAccount.currency) {
            transactionData.convertedAmount = convertedAmount;
            transactionData.toCurrency = toAccount.currency;
          }
        } else {
          // Income or Expense - require category and payment mode
          transactionData.category = formData.category;
          transactionData.paymentMode = formData.paymentMode;
          
          const accountRef = doc(db, 'users', currentUser.uid, 'accounts', formData.accountId);
          const balanceChange = formData.type === 'income' ? amount : -amount;
          
          batch.update(accountRef, {
            balance: increment(balanceChange),
            lastActivityAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      const transactionRef = doc(collection(db, 'users', currentUser.uid, 'transactions'));
      batch.set(transactionRef, transactionData);
      await batch.commit();
      
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Error adding transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = async (e) => {
    e.preventDefault();
    if (!currentUser || !selectedTransaction || loading) return;

    try {
      setLoading(true);
      const transactionRef = doc(db, 'users', currentUser.uid, 'transactions', selectedTransaction.id);
      await updateDoc(transactionRef, {
        category: formData.category, paymentMode: formData.paymentMode,
        notes: formData.notes, updatedAt: new Date().toISOString()
      });
      
      setShowEditModal(false);
      setSelectedTransaction(null);
      resetForm();
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Error updating transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!currentUser || !selectedTransaction || loading) return;

    try {
      setLoading(true);
      const batch = writeBatch(db);
      const account = getAccountById(selectedTransaction.accountId);
      
      if (account) {
        const accountRef = doc(db, 'users', currentUser.uid, 'accounts', selectedTransaction.accountId);
        let balanceChange = 0;
        
        switch (selectedTransaction.type) {
          case 'income': balanceChange = -selectedTransaction.amount; break;
          case 'expense': balanceChange = selectedTransaction.amount; break;
          case 'adjustment': 
            balanceChange = selectedTransaction.isIncrease ? -selectedTransaction.amount : selectedTransaction.amount; 
            break;
          case 'transfer':
            balanceChange = selectedTransaction.amount;
            if (selectedTransaction.toAccountId) {
              const toAccountRef = doc(db, 'users', currentUser.uid, 'accounts', selectedTransaction.toAccountId);
              const toAccount = getAccountById(selectedTransaction.toAccountId);
              if (toAccount) {
                const convertedAmount = selectedTransaction.convertedAmount || selectedTransaction.amount;
                batch.update(toAccountRef, {
                  balance: increment(-convertedAmount), updatedAt: new Date().toISOString()
                });
              }
            }
            break;
        }
        
        if (balanceChange !== 0) {
          batch.update(accountRef, {
            balance: increment(balanceChange), updatedAt: new Date().toISOString()
          });
        }
      }
      
      const transactionRef = doc(db, 'users', currentUser.uid, 'transactions', selectedTransaction.id);
      batch.delete(transactionRef);
      await batch.commit();
      
      setShowDeleteModal(false);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      type: transaction.type, amount: transaction.amount.toString(),
      currency: transaction.currency, accountId: transaction.accountId,
      toAccountId: transaction.toAccountId || '', category: transaction.category,
      paymentMode: transaction.paymentMode || '', notes: transaction.notes || '',
      date: transaction.date, isIncrease: transaction.isIncrease ?? true
    });
    setShowEditModal(true);
    setActiveDropdown(null);
  };

  const openDeleteModal = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDeleteModal(true);
    setActiveDropdown(null);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in relative min-h-screen transition-all duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            Transactions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
            Track and manage your financial transactions
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg shadow-sm dark:shadow-lg hover:shadow-md dark:hover:shadow-xl transition-all duration-300 backdrop-blur-sm ${
              showFilters ? 'bg-orange-500 text-white' : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md dark:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-white/5 rounded-xl p-4 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</h3>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {filteredTransactions.length.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-xl p-4 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600 dark:text-gray-400">Total Income</h3>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalIncome, 'INR')}
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-xl p-4 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600 dark:text-gray-400">Total Expense</h3>
            <div className="w-8 h-8 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalExpense, 'INR')}
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-xl p-4 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600 dark:text-gray-400">Net Amount</h3>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              netAmount >= 0 ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-orange-100 dark:bg-orange-500/20'
            }`}>
              <Wallet className={`w-4 h-4 ${
                netAmount >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
              }`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${
            netAmount >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
          }`}>
            {netAmount >= 0 ? '' : '-'}{formatCurrency(Math.abs(netAmount), 'INR')}
          </p>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
            <button
              onClick={() => {
                setFilters({
                  search: '', type: 'all', accountId: 'all', category: 'all', paymentMode: 'all',
                  datePreset: 'thisMonth', amountMin: '', amountMax: '',
                  dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                  dateTo: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
                });
              }}
              className="text-sm text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-300"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  placeholder="Search transactions..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Period</label>
              <select
                value={filters.datePreset}
                onChange={(e) => handleDatePresetChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
              >
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="thisYear">This Year</option>
                <option value="allTime">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {filters.datePreset === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
                  <input type="date" value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
                  <input type="date" value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
              <select value={filters.accountId} onChange={(e) => setFilters({...filters, accountId: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
              >
                <option value="all">All Accounts</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white dark:bg-white/5 rounded-2xl backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Mode</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {currentTransactions.length > 0 ? (
                currentTransactions.map((transaction) => {
                  const account = getAccountById(transaction.accountId);
                  const toAccount = transaction.toAccountId ? getAccountById(transaction.toAccountId) : null;
                  const AccountIcon = account ? getAccountIcon(account.type, account.subtype) : Building;
                  
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-300">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatDate(transaction.date)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(transaction.date)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                              {transaction.type}
                            </span>
                            {transaction.type === 'adjustment' && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {transaction.isIncrease ? '+' : '-'} Balance
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 
                          transaction.type === 'expense' ? 'text-red-600 dark:text-red-400' : 
                          transaction.type === 'adjustment' ? (transaction.isIncrease ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') :
                          'text-gray-900 dark:text-white'
                        }`}>
                          {transaction.type === 'expense' ? '-' : 
                           transaction.type === 'income' ? '+' : 
                           transaction.type === 'adjustment' ? (transaction.isIncrease ? '+' : '-') : ''}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </span>
                        {/* Only show conversion for non-INR transactions that are NOT transfers with converted amounts */}
                        {transaction.currency !== 'INR' && transaction.type !== 'transfer' && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ≈ {formatCurrency(convertToINR(transaction.amount, transaction.currency), 'INR')}
                          </p>
                        )}
                        {/* Show conversion info only for transfers between different currencies */}
                        {transaction.type === 'transfer' && transaction.convertedAmount && transaction.currency !== transaction.toCurrency && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            → {formatCurrency(transaction.convertedAmount, transaction.toCurrency)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                            account?.type === 'crypto' ? 'bg-orange-100 dark:bg-orange-500/20' : 'bg-blue-100 dark:bg-blue-500/20'
                          }`}>
                            <AccountIcon className={`w-4 h-4 ${
                              account?.type === 'crypto' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {transaction.accountName || account?.name || 'Unknown'}
                            </p>
                            {transaction.type === 'transfer' && transaction.toAccountName && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                → {transaction.toAccountName}
                              </p>
                            )}
                            {transaction.accountDeleted && (
                              <p className="text-xs text-red-500 dark:text-red-400">Deleted Account</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {transaction.category || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {transaction.paymentMode || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 max-w-[150px] break-words">
                          {transaction.notes ? (
                            <span title={transaction.notes}>
                              {transaction.notes}
                            </span>
                          ) : (
                            '-'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === transaction.id ? null : transaction.id);
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-300"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          
                          {activeDropdown === transaction.id && (
                            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                              <button
                                onClick={() => openEditModal(transaction)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                              >
                                <Edit className="w-4 h-4" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => openDeleteModal(transaction)}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No transactions found</p>
                      <p className="text-sm">Add your first transaction or adjust your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing {indexOfFirstTransaction + 1} to {Math.min(indexOfLastTransaction, filteredTransactions.length)} of {filteredTransactions.length} transactions
            </p>
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-md transition-colors duration-300 ${
                      currentPage === pageNum
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Modal - Optimized for no scroll */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              resetForm();
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Transaction</h2>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transaction Type</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: 'income', label: 'Income', icon: ArrowDownRight, color: 'green' },
                    { value: 'expense', label: 'Expense', icon: ArrowUpRight, color: 'red' },
                    { value: 'transfer', label: 'Transfer', icon: Send, color: 'blue' },
                    { value: 'adjustment', label: 'Adjustment', icon: Wallet, color: 'orange' }
                  ].map(type => {
                    const IconComponent = type.icon;
                    const isSelected = formData.type === type.value;
                    return (
                      <button
                        key={type.value} type="button"
                        onClick={() => setFormData({...formData, type: type.value, category: '', paymentMode: ''})}
                        className={`p-2 rounded-lg border-2 transition-all duration-300 flex flex-col items-center space-y-1 ${
                          isSelected ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-500/10` : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 ${isSelected ? `text-${type.color}-600 dark:text-${type.color}-400` : 'text-gray-600 dark:text-gray-400'}`} />
                        <span className={`text-xs font-medium ${isSelected ? `text-${type.color}-700 dark:text-${type.color}-300` : 'text-gray-700 dark:text-gray-300'}`}>
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account First, then Amount/Balance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {formData.type === 'transfer' ? 'From Account' : 'Account'}
                  </label>
                  <select value={formData.accountId} onChange={(e) => setFormData({...formData, accountId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300 text-sm" required>
                    <option value="">Select account</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.currency}) - {formatCurrency(account.balance, account.currency)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount Field - Hide for Adjustment */}
                {formData.type !== 'adjustment' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                    <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300 text-sm" required />
                  </div>
                )}

                {/* New Balance Field - Only for Adjustment */}
                {formData.type === 'adjustment' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Balance</label>
                    <input type="number" step="0.01" value={formData.newBalance} onChange={(e) => setFormData({...formData, newBalance: e.target.value})} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300 text-sm" required />
                  </div>
                )}
              </div>

              {/* To Account - Only for Transfer */}
              {formData.type === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To Account</label>
                  <select value={formData.toAccountId} onChange={(e) => setFormData({...formData, toAccountId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300 text-sm" required>
                    <option value="">Select destination account</option>
                    {accounts.filter(acc => acc.id !== formData.accountId).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.currency}) - {formatCurrency(account.balance, account.currency)}
                      </option>
                    ))}
                  </select>
                  {formData.accountId && formData.toAccountId && (() => {
                    const fromAccount = getAccountById(formData.accountId);
                    const toAccount = getAccountById(formData.toAccountId);
                    if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency && formData.amount) {
                      const convertedAmount = fromAccount.currency === 'USD' ? parseFloat(formData.amount) * USD_TO_INR : parseFloat(formData.amount) / USD_TO_INR;
                      return (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Will receive: {formatCurrency(convertedAmount, toAccount.currency)}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Category and Payment Mode - Only for Income/Expense */}
              {['income', 'expense'].includes(formData.type) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300 text-sm" required>
                      <option value="">Select category</option>
                      {TRANSACTION_CATEGORIES[formData.type]?.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Mode</label>
                    <select value={formData.paymentMode} onChange={(e) => setFormData({...formData, paymentMode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300 text-sm">
                      <option value="">Select payment mode</option>
                      {formData.accountId && (() => {
                        const account = getAccountById(formData.accountId);
                        return account ? PAYMENT_MODES[account.type]?.map(mode => (
                          <option key={mode} value={mode}>{mode}</option>
                        )) : null;
                      })()}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={formData.date} 
                  onChange={(e) => setFormData({...formData, date: e.target.value})} 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300 text-sm" 
                  required 
                />
              </div>

              {/* Notes - Smaller */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes (Optional)</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Add any additional notes..." rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300 text-sm" />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300 text-sm">Cancel</button>
                <button 
                  type="submit" 
                  disabled={loading || !formData.accountId || 
                    (formData.type === 'transfer' && (!formData.amount || !formData.toAccountId)) ||
                    (formData.type === 'adjustment' && !formData.newBalance) ||
                    (['income', 'expense'].includes(formData.type) && (!formData.amount || !formData.category))
                  } 
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Add Transaction</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && selectedTransaction && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
              setSelectedTransaction(null);
              resetForm();
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Transaction</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedTransaction(null); resetForm(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleEditTransaction} className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Limited Edit Mode</h3>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">You can only edit category, payment mode, and notes. Amount and account changes affect balances and require deletion + re-creation.</p>
                  </div>
                </div>
              </div>

              {/* Only show category and payment mode for income/expense transactions */}
              {['income', 'expense'].includes(selectedTransaction.type) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300" required>
                      <option value="">Select category</option>
                      {TRANSACTION_CATEGORIES[formData.type]?.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Mode</label>
                    <select value={formData.paymentMode} onChange={(e) => setFormData({...formData, paymentMode: e.target.value})} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300">
                      <option value="">Select payment mode</option>
                      {(() => {
                        const account = getAccountById(formData.accountId);
                        return account ? PAYMENT_MODES[account.type]?.map(mode => (
                          <option key={mode} value={mode}>{mode}</option>
                        )) : null;
                      })()}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Add any additional notes..." rows={2} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300" />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedTransaction(null); resetForm(); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300">Cancel</button>
                <button type="submit" disabled={loading || (['income', 'expense'].includes(selectedTransaction.type) && !formData.category)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Update Transaction</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Transaction Modal */}
      {showDeleteModal && selectedTransaction && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false);
              setSelectedTransaction(null);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Transaction</h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">Are you sure you want to delete this transaction? This action will also reverse any balance changes.</p>
            
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTransactionColor(selectedTransaction.type)}`}>
                  {getTransactionIcon(selectedTransaction.type)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedTransaction.type === 'adjustment' && (selectedTransaction.isIncrease ? '+' : '-')}
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedTransaction.category} • {formatDate(selectedTransaction.date)}
                  </p>
                </div>
              </div>
              {selectedTransaction.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  "{selectedTransaction.notes}"
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <button type="button" onClick={() => { setShowDeleteModal(false); setSelectedTransaction(null); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300">Cancel</button>
              <button onClick={handleDeleteTransaction} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Transaction</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Transaction Button */}
      <button onClick={() => setShowAddModal(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg dark:shadow-2xl transition-all duration-300 flex items-center justify-center group transform hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-3xl">
        <Plus className="w-6 h-6" />
        <span className="absolute right-16 bg-gray-900 dark:bg-black text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg dark:shadow-2xl pointer-events-none">
          Add Transaction
        </span>
      </button>
    </div>
  );
}

export default Transactions;