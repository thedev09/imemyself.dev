import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sun, Moon, DollarSign, ArrowUpRight, ArrowDownRight, 
  Send, Plus, MoreVertical, ChevronRight,
  TrendingUp, TrendingDown, Wallet, Edit, Trash2, X, Check,
  AlertTriangle, Building, Bitcoin, CreditCard
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { 
  collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc,
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

function Overview({ accounts, transactions }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [netWorthData, setNetWorthData] = useState([]);
  const [loadingNetWorth, setLoadingNetWorth] = useState(true);
  const [netWorthFilter, setNetWorthFilter] = useState('yearly');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
    type: 'expense',
    amount: '', currency: 'INR', accountId: '', toAccountId: '',
    category: '', paymentMode: '', notes: '', newBalance: '',
    date: getCurrentDateTime(), isIncrease: true
  });

  useEffect(() => {
    if (currentUser) {
      loadNetWorthData();
    }
  }, [currentUser, netWorthFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  const loadNetWorthData = async () => {
    if (!currentUser) return;
    
    try {
      const snapshotsRef = collection(db, 'users', currentUser.uid, 'netWorthSnapshots');
      const q = query(snapshotsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map(doc => ({
        date: doc.id,
        value: doc.data().totalNetWorth
      }));
      
      let formattedData = [];
      const now = new Date();
      
      switch(netWorthFilter) {
        case 'weekly':
          formattedData = data.slice(0, 7).reverse().map(item => ({
            label: new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            netWorth: item.value
          }));
          break;
          
        case 'monthly':
          formattedData = data.slice(0, 30).reverse().map(item => ({
            label: new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            netWorth: item.value
          }));
          break;
          
        case 'yearly':
          const monthlyData = {};
          data.forEach(item => {
            const date = new Date(item.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                date: date,
                value: item.value,
                month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
              };
            }
          });
          
          formattedData = Object.values(monthlyData)
            .slice(0, 12)
            .reverse()
            .map(item => ({
              label: item.month,
              netWorth: item.value
            }));
          break;
          
        case 'all':
          const yearlyData = {};
          data.forEach(item => {
            const date = new Date(item.date);
            const year = date.getFullYear();
            if (!yearlyData[year]) {
              yearlyData[year] = {
                year: year,
                value: item.value
              };
            }
          });
          
          formattedData = Object.values(yearlyData)
            .reverse()
            .map(item => ({
              label: item.year.toString(),
              netWorth: item.value
            }));
          break;
          
        default:
          break;
      }
      
      setNetWorthData(formattedData);
      setLoadingNetWorth(false);
    } catch (error) {
      console.error('Error loading net worth data:', error);
      setLoadingNetWorth(false);
    }
  };

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

  const convertFromINR = (amount) => {
    return amount / USD_TO_INR;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getUserFirstName = () => {
    if (!currentUser?.displayName) return 'User';
    const name = currentUser.displayName;
    const nameMatch = name.match(/(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)?\s*(.+)/i);
    if (nameMatch) {
      const fullName = nameMatch[1].trim();
      return fullName.split(' ')[0];
    }
    return name.split(' ')[0];
  };

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

  const resetForm = () => {
    setFormData({
      type: 'expense', amount: '', currency: 'INR', accountId: '', toAccountId: '',
      category: '', paymentMode: '', notes: '', newBalance: '',
      date: getCurrentDateTime(), isIncrease: true
    });
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    
    if (!currentUser || loading || !formData.accountId) return;
    
    if (formData.type === 'transfer' && (!formData.amount || !formData.toAccountId)) return;
    if (formData.type === 'adjustment' && !formData.newBalance) return;
    if (['income', 'expense'].includes(formData.type) && (!formData.amount || !formData.category)) return;

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
        date: formData.date,
        notes: formData.notes,
        createdAt: new Date().toISOString()
      };

      if (formData.type === 'adjustment') {
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

          if (account.currency !== toAccount.currency) {
            transactionData.convertedAmount = convertedAmount;
            transactionData.toCurrency = toAccount.currency;
          }
        } else {
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
      // Refresh the page data
      window.location.reload();
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
        category: formData.category, 
        paymentMode: formData.paymentMode,
        notes: formData.notes, 
        updatedAt: new Date().toISOString()
      });
      
      setShowEditModal(false);
      setSelectedTransaction(null);
      resetForm();
      // Refresh the page data
      window.location.reload();
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
                  balance: increment(-convertedAmount), 
                  updatedAt: new Date().toISOString()
                });
              }
            }
            break;
        }
        
        if (balanceChange !== 0) {
          batch.update(accountRef, {
            balance: increment(balanceChange), 
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      const transactionRef = doc(db, 'users', currentUser.uid, 'transactions', selectedTransaction.id);
      batch.delete(transactionRef);
      await batch.commit();
      
      setShowDeleteModal(false);
      setSelectedTransaction(null);
      // Refresh the page data
      window.location.reload();
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
      type: transaction.type, 
      amount: transaction.amount.toString(),
      currency: transaction.currency, 
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId || '', 
      category: transaction.category,
      paymentMode: transaction.paymentMode || '', 
      notes: transaction.notes || '',
      date: transaction.date, 
      isIncrease: transaction.isIncrease ?? true
    });
    setShowEditModal(true);
    setActiveDropdown(null);
  };

  const openDeleteModal = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDeleteModal(true);
    setActiveDropdown(null);
  };

  const totalBalanceINR = accounts.reduce((total, account) => {
    return total + convertToINR(account.balance, account.currency);
  }, 0);

  const bankAccounts = accounts.filter(acc => acc.type === 'bank');
  const cryptoAccounts = accounts.filter(acc => acc.type === 'crypto');
  
  const bankTotalINR = bankAccounts.reduce((total, account) => {
    return total + convertToINR(account.balance, account.currency);
  }, 0);
  
  const cryptoTotalINR = cryptoAccounts.reduce((total, account) => {
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
    .reduce((sum, t) => sum + (t.amountInINR || convertToINR(t.amount, t.currency)), 0);

  const monthlyExpense = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amountInINR || convertToINR(t.amount, t.currency)), 0);

  const monthlySavings = monthlyIncome - monthlyExpense;

  // Calculate previous month data
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  const previousMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === previousMonth && date.getFullYear() === previousYear;
  });

  const previousMonthIncome = previousMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amountInINR || convertToINR(t.amount, t.currency)), 0);

  const previousMonthExpense = previousMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amountInINR || convertToINR(t.amount, t.currency)), 0);

  // Calculate percentage changes
  const incomePercentageChange = previousMonthIncome > 0 
    ? ((monthlyIncome - previousMonthIncome) / previousMonthIncome) * 100 
    : 0;
  
  const expensePercentageChange = previousMonthExpense > 0 
    ? ((monthlyExpense - previousMonthExpense) / previousMonthExpense) * 100 
    : 0;

  const recentTransactions = [...transactions].slice(0, 5);

  const hour = new Date().getHours();
  let greeting = 'Good morning';
  let GreetingIcon = Sun;
  
  if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
    GreetingIcon = Sun;
  } else if (hour >= 17) {
    greeting = 'Good evening';
    GreetingIcon = Moon;
  } else if (hour < 5) {
    greeting = 'Good night';
    GreetingIcon = Moon;
  }

  const userName = getUserFirstName();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in relative min-h-screen transition-all duration-500">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="p-2 sm:p-3 bg-white dark:bg-white/5 rounded-full shadow-sm dark:shadow-lg transition-all duration-300 backdrop-blur-sm">
            <GreetingIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
              {greeting}, {userName}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">
              Here's your financial overview
            </p>
          </div>
        </div>
      </div>

      {/* Balance and Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Total Balance Card - 4 columns */}
        <div className="lg:col-span-4 bg-white dark:bg-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-sm h-full shadow-lg dark:shadow-2xl transition-all duration-300 hover:shadow-xl dark:hover:shadow-3xl hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">Total Balance</h3>
            <select 
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="text-sm border-0 bg-transparent focus:outline-none text-gray-600 dark:text-gray-400 cursor-pointer transition-colors duration-300"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="mb-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
              {selectedCurrency === 'INR' 
                ? formatCurrency(totalBalanceINR, 'INR')
                : formatCurrency(convertFromINR(totalBalanceINR), 'USD')
              }
            </h2>
            <p className="text-sm text-green-500 dark:text-green-400 flex items-center mt-1 transition-colors duration-300">
              <TrendingUp className="w-4 h-4 mr-1" />
              {monthlySavings >= 0 ? 'Positive' : 'Negative'} savings this month
            </p>
          </div>
          <div className="flex space-x-3 mb-6">
            <button 
              onClick={() => {
                setFormData(prev => ({ ...prev, type: 'transfer' }));
                setShowAddModal(true);
              }}
              className="flex-1 bg-gray-900 dark:bg-gray-800 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-800 dark:hover:bg-gray-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md dark:shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>Transfer</span>
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md dark:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
          
          {/* Accounts Summary */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                Accounts | Total {accounts.length}
              </h4>
              <button 
                onClick={() => navigate('/accounts')}
                className="text-xs text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 flex items-center transition-colors duration-300"
              >
                View all
                <ChevronRight className="w-3 h-3 ml-1" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/3 rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-gray-100 dark:hover:bg-white/5">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-300">
                    Bank (INR) ({bankAccounts.length})
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">Total Balance</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                  {formatCurrency(bankTotalINR, 'INR')}
                </p>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/3 rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-gray-100 dark:hover:bg-white/5">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-300">
                    Crypto/USD ({cryptoAccounts.length})
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">Total Balance</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                  {formatCurrency(cryptoTotalINR, 'INR')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Stats - 3 columns */}
        <div className="lg:col-span-3 bg-white dark:bg-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-sm h-full shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.02]">
          <div className="h-full flex flex-col justify-between space-y-3">
            <div className="bg-white dark:bg-white/5 rounded-xl p-3 flex-1 border border-gray-200 dark:border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-gray-50 dark:hover:bg-white/8">
              <div className="flex items-center justify-between h-full">
                <div>
                  <h3 className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">Monthly Income</h3>
                  <h2 className="text-lg font-bold mt-1 text-gray-900 dark:text-white transition-colors duration-300">
                    {formatCurrency(monthlyIncome)}
                  </h2>
                  <p className={`text-xs mt-1 transition-colors duration-300 ${
                    incomePercentageChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {incomePercentageChange >= 0 ? '↑' : '↓'} {Math.abs(incomePercentageChange).toFixed(1)}% than last month
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm transition-colors duration-300">
                  <ArrowDownRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-white/5 rounded-xl p-3 flex-1 border border-gray-200 dark:border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-gray-50 dark:hover:bg-white/8">
              <div className="flex items-center justify-between h-full">
                <div>
                  <h3 className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">Monthly Expense</h3>
                  <h2 className="text-lg font-bold mt-1 text-gray-900 dark:text-white transition-colors duration-300">
                    {formatCurrency(monthlyExpense)}
                  </h2>
                  <p className={`text-xs mt-1 transition-colors duration-300 ${
                    expensePercentageChange >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                  }`}>
                    {expensePercentageChange >= 0 ? '↑' : '↓'} {Math.abs(expensePercentageChange).toFixed(1)}% than last month
                  </p>
                </div>
                <div className="w-8 h-8 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm transition-colors duration-300">
                  <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-white/5 rounded-xl p-3 flex-1 border border-gray-200 dark:border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-gray-50 dark:hover:bg-white/8">
              <div className="flex items-center justify-between h-full">
                <div>
                  <h3 className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">Monthly Savings</h3>
                  <h2 className="text-lg font-bold mt-1 text-gray-900 dark:text-white transition-colors duration-300">
                    {monthlySavings >= 0 ? '' : '-'}{formatCurrency(Math.abs(monthlySavings))}
                  </h2>
                  <p className={`text-xs mt-1 transition-colors duration-300 ${monthlySavings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {monthlySavings >= 0 ? 'Saved' : 'Overspent'} this month
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm transition-colors duration-300 ${monthlySavings >= 0 ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-orange-100 dark:bg-orange-500/20'}`}>
                  {monthlySavings >= 0 ? 
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : 
                    <TrendingDown className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Net Worth Chart - 5 columns */}
        <div className="lg:col-span-5 bg-white dark:bg-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-sm h-full flex flex-col shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white transition-colors duration-300">
              Net Worth Overview
            </h3>
            <select 
              value={netWorthFilter}
              onChange={(e) => setNetWorthFilter(e.target.value)}
              className="text-sm bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-1 text-gray-900 dark:text-gray-100 backdrop-blur-sm transition-colors duration-300"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="flex-1 min-h-[250px]">
            {loadingNetWorth ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : netWorthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netWorthData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} className="text-gray-300 dark:text-gray-600" />
                  <XAxis 
                    dataKey="label" 
                    stroke="currentColor"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <YAxis 
                    stroke="currentColor"
                    fontSize={10} 
                    tickFormatter={(value) => `₹${formatIndianNumber(value)}`}
                    width={50}
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value, 'INR')}
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-elevated)', 
                      border: '1px solid var(--border-primary)', 
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                    labelStyle={{ color: 'var(--text-tertiary)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="netWorth" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={{ fill: '#f97316', r: 3 }}
                    activeDot={{ r: 5 }}
                    fill="url(#colorNetWorth)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm transition-colors duration-300">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.01]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300">
            Recent Transactions
          </h3>
          <button 
            onClick={() => navigate('/transactions')}
            className="text-xs sm:text-sm text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 flex items-center transition-colors duration-300"
          >
            View all
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
          </button>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-white/10 transition-colors duration-300">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Payment Mode</th>
                <th className="pb-3 font-medium">Account</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Notes</th>
                <th className="pb-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-300">
                    <td className="py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-300">
                          {formatDate(transaction.date)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                          {formatTime(transaction.date)}
                        </p>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${getTransactionColor(transaction.type)}`}>
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize transition-colors duration-300">
                          {transaction.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`text-sm font-medium transition-colors duration-300 ${
                        transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 
                        transaction.type === 'expense' ? 'text-red-600 dark:text-red-400' : 
                        'text-gray-900 dark:text-white'
                      }`}>
                        {transaction.type === 'expense' ? '-' : transaction.type === 'income' ? '+' : ''}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                      {transaction.paymentMode || '-'}
                    </td>
                    <td className="py-4 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                      {transaction.accountName || '-'}
                    </td>
                    <td className="py-4 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                      {transaction.category || '-'}
                    </td>
                    <td className="py-4 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                      <span className="truncate block max-w-[150px]" title={transaction.notes}>
                        {transaction.notes || '-'}
                      </span>
                    </td>
                    <td className="py-4 text-center">
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
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-gray-500 dark:text-gray-400 transition-colors duration-300">
                    No transactions yet. Add your first transaction to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <div key={transaction.id} className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/8 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${getTransactionColor(transaction.type)}`}>
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                        {transaction.type}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(transaction.date)} • {formatTime(transaction.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-bold ${
                      transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 
                      transaction.type === 'expense' ? 'text-red-600 dark:text-red-400' : 
                      'text-gray-900 dark:text-white'
                    }`}>
                      {transaction.type === 'expense' ? '-' : transaction.type === 'income' ? '+' : ''}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </span>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === transaction.id ? null : transaction.id);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors duration-300"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      
                      {activeDropdown === transaction.id && (
                        <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                          <button
                            onClick={() => openEditModal(transaction)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => openDeleteModal(transaction)}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Account:</span>
                    <p className="text-gray-900 dark:text-white font-medium truncate">
                      {transaction.accountName || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Category:</span>
                    <p className="text-gray-900 dark:text-white font-medium truncate">
                      {transaction.category || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Payment:</span>
                    <p className="text-gray-900 dark:text-white font-medium truncate">
                      {transaction.paymentMode || '-'}
                    </p>
                  </div>
                  {transaction.notes && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Notes:</span>
                      <p className="text-gray-900 dark:text-white font-medium truncate">
                        {transaction.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400 transition-colors duration-300">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8" />
              </div>
              <p className="text-sm">No transactions yet</p>
              <p className="text-xs mt-1">Add your first transaction to get started!</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Transaction Modal */}
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Add Transaction</h2>
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

                {formData.type !== 'adjustment' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                    <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300 text-sm" required />
                  </div>
                )}

                {formData.type === 'adjustment' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Balance</label>
                    <input type="number" step="0.01" value={formData.newBalance} onChange={(e) => setFormData({...formData, newBalance: e.target.value})} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300 text-sm" required />
                  </div>
                )}
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes (Optional)</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Add any additional notes..." rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300 text-sm" />
              </div>

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

      {/* Floating Add Transaction Button - Fixed hover area */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 group">
        <button
          onClick={() => setShowAddModal(true)}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg dark:shadow-2xl transition-all duration-300 flex items-center justify-center transform hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-3xl"
        >
          <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <span className="absolute right-14 sm:right-16 top-1/2 transform -translate-y-1/2 bg-gray-900 dark:bg-black text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg dark:shadow-2xl pointer-events-none hidden sm:block">
          Add Transaction
        </span>
      </div>
    </div>
  );
}

export default Overview;