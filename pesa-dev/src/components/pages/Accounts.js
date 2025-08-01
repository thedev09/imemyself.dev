import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, MoreVertical, Eye, EyeOff, Edit, Trash2, 
  Wallet, CreditCard, Building, Bitcoin, PiggyBank, 
  Landmark, AlertTriangle, ArrowUpRight, ArrowDownRight,
  GripVertical, X, Calendar, Clock, Info, Receipt,
  Send, DollarSign
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { 
  collection, addDoc, updateDoc, doc, serverTimestamp,
  query, where, orderBy, getDocs, writeBatch 
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


// Constants based on your project structure
const ACCOUNT_TYPES = {
  bank: {
    label: 'Bank Account',
    description: 'Savings, Current, Credit Card accounts',
    currencies: ['INR', 'USD']
  },
  crypto: {
    label: 'USD Account', 
    description: 'Cryptocurrency, Investment accounts',
    currencies: ['USD', 'INR']
  }
};

const ACCOUNT_SUBTYPES = {
  bank: ['Savings', 'Current', 'Prepaid Wallet', 'Investments', 'Fixed Deposit'],
  crypto: ['Crypto Wallet', 'Crypto Exchange', 'Crypto Card', 'Staking']
};

function Accounts({ accounts, transactions }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showBalances, setShowBalances] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [draggedAccount, setDraggedAccount] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    subtype: '',
    currency: 'INR',
    balance: '',
    description: ''
  });

  const [deleteOptions, setDeleteOptions] = useState({
    deleteTransactions: false
  });

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

  const [transactionFormData, setTransactionFormData] = useState({
    type: 'expense',
    amount: '',
    currency: 'INR',
    accountId: '',
    toAccountId: '',
    category: '',
    paymentMode: '',
    notes: '',
    date: getCurrentDateTime(),
    isIncrease: true
  });


  const formatCurrency = (amount, currency = 'INR') => {
    if (!showBalances) return '••••••';
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

  const getAccountIcon = (type, subtype) => {
    if (type === 'crypto') return Bitcoin;
    if (subtype === 'Credit Card') return CreditCard;
    if (subtype === 'Fixed Deposit') return PiggyBank;
    return Landmark;
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'income': return ArrowDownRight;
      case 'expense': return ArrowUpRight;
      case 'transfer': return Send;
      case 'adjustment': return DollarSign;
      default: return Receipt;
    }
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'income': return 'text-green-600 dark:text-green-400';
      case 'expense': return 'text-red-600 dark:text-red-400';
      case 'transfer': return 'text-blue-600 dark:text-blue-400';
      case 'adjustment': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const openDetailsModal = (account) => {
    setSelectedAccount(account);
    setShowDetailsModal(true);
    setActiveDropdown(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'bank',
      subtype: '',
      currency: 'INR',
      balance: '',
      description: ''
    });
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!currentUser || loading || !formData.name || !formData.subtype) return;

    try {
      setLoading(true);
      
      const accountData = {
        name: formData.name,
        type: formData.type,
        subtype: formData.subtype,
        currency: formData.currency,
        balance: parseFloat(formData.balance) || 0,
        description: formData.description,
        isDeleted: false,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        displayOrder: accounts.length
      };

      await addDoc(collection(db, 'users', currentUser.uid, 'accounts'), accountData);
      
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding account:', error);
      alert('Error adding account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = async (e) => {
    e.preventDefault();
    if (!currentUser || !selectedAccount || loading || !formData.name || !formData.subtype) return;

    try {
      setLoading(true);
      
      const newBalance = parseFloat(formData.balance) || 0;
      const oldBalance = selectedAccount.balance;
      const balanceChange = newBalance - oldBalance;
      
      const accountRef = doc(db, 'users', currentUser.uid, 'accounts', selectedAccount.id);
      await updateDoc(accountRef, {
        name: formData.name,
        type: formData.type,
        subtype: formData.subtype,
        currency: formData.currency,
        balance: newBalance,
        description: formData.description,
        updatedAt: new Date().toISOString()
      });
      
      // Create adjustment transaction if balance changed
      if (Math.abs(balanceChange) > 0.01) { // Avoid floating point precision issues
        const currentTime = new Date().toISOString();
        const adjustmentData = {
          type: 'adjustment',
          amount: Math.abs(balanceChange),
          currency: formData.currency,
          accountId: selectedAccount.id,
          accountName: selectedAccount.name,
          toAccountId: null,
          category: 'Balance Reconciliation',
          paymentMode: 'Manual Adjustment',
          notes: `Balance adjusted from ${oldBalance.toFixed(2)} to ${newBalance.toFixed(2)} (${balanceChange > 0 ? '+' : ''}${balanceChange.toFixed(2)})`,
          date: currentTime,
          isIncrease: balanceChange > 0,
          userId: currentUser.uid,
          createdAt: currentTime,
          updatedAt: currentTime
        };
        
        await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), adjustmentData);
      }
      
      setShowEditModal(false);
      if (!showDetailsModal) {
        setSelectedAccount(null);
      }
      resetForm();
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Error updating account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || !selectedAccount || loading) return;

    try {
      setLoading(true);
      const batch = writeBatch(db);

      if (deleteOptions.deleteTransactions) {
        // Get and delete all transactions for this account
        const transactionsQuery = query(
          collection(db, 'users', currentUser.uid, 'transactions'),
          where('accountId', '==', selectedAccount.id)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        
        transactionsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      } else {
        // Mark transactions as having deleted account
        const transactionsQuery = query(
          collection(db, 'users', currentUser.uid, 'transactions'),
          where('accountId', '==', selectedAccount.id)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        
        transactionsSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            accountDeleted: true,
            accountDeletedAt: new Date().toISOString()
          });
        });
      }

      // Soft delete the account
      const accountRef = doc(db, 'users', currentUser.uid, 'accounts', selectedAccount.id);
      batch.update(accountRef, {
        isDeleted: true,
        deletedAt: new Date().toISOString()
      });

      await batch.commit();
      
      setShowDeleteModal(false);
      setSelectedAccount(null);
      setDeleteOptions({ deleteTransactions: false });
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error deleting account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, account) => {
    setDraggedAccount(account);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, account) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(account.id);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = async (e, targetAccount) => {
    e.preventDefault();
    setDragOver(null);
    
    if (!draggedAccount || !targetAccount || draggedAccount.id === targetAccount.id) {
      setDraggedAccount(null);
      return;
    }

    if (!currentUser || loading) return;

    try {
      setLoading(true);
      const batch = writeBatch(db);
      
      const draggedRef = doc(db, 'users', currentUser.uid, 'accounts', draggedAccount.id);
      const targetRef = doc(db, 'users', currentUser.uid, 'accounts', targetAccount.id);
      
      // Swap display orders
      batch.update(draggedRef, { 
        displayOrder: targetAccount.displayOrder || 0,
        updatedAt: new Date().toISOString()
      });
      batch.update(targetRef, { 
        displayOrder: draggedAccount.displayOrder || 0,
        updatedAt: new Date().toISOString()
      });

      await batch.commit();
    } catch (error) {
      console.error('Error reordering accounts:', error);
      alert('Error reordering accounts. Please try again.');
    } finally {
      setLoading(false);
      setDraggedAccount(null);
    }
  };

  const openEditModal = (account) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      subtype: account.subtype || '',
      currency: account.currency,
      balance: account.balance.toString(),
      description: account.description || ''
    });
    setShowEditModal(true);
    setActiveDropdown(null);
  };

  const openEditFromDetails = (account) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      subtype: account.subtype || '',
      currency: account.currency,
      balance: account.balance.toString(),
      description: account.description || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (account) => {
    setSelectedAccount(account);
    setShowDeleteModal(true);
    setActiveDropdown(null);
  };

  const openTransactionModal = (account) => {
    setTransactionFormData({
      type: 'expense',
      amount: '',
      currency: account.currency,
      accountId: account.id,
      toAccountId: '',
      category: '',
      paymentMode: '',
      notes: '',
      date: getCurrentDateTime(),
      isIncrease: true
    });
    setShowTransactionModal(true);
  };

  const resetTransactionForm = () => {
    setTransactionFormData({
      type: 'expense',
      amount: '',
      currency: 'INR',
      accountId: '',
      toAccountId: '',
      category: '',
      paymentMode: '',
      notes: '',
      date: getCurrentDateTime(),
      isIncrease: true
    });
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!currentUser || loading || !transactionFormData.amount || !transactionFormData.accountId || !transactionFormData.category) return;

    try {
      setLoading(true);
      
      const transactionData = {
        type: transactionFormData.type,
        amount: parseFloat(transactionFormData.amount),
        currency: transactionFormData.currency,
        accountId: transactionFormData.accountId,
        accountName: selectedAccount.name,
        toAccountId: transactionFormData.toAccountId || null,
        category: transactionFormData.category,
        paymentMode: transactionFormData.paymentMode,
        notes: transactionFormData.notes,
        date: new Date(transactionFormData.date).toISOString(),
        isIncrease: transactionFormData.isIncrease,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), transactionData);
      
      setShowTransactionModal(false);
      resetTransactionForm();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Error adding transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showDetailsModal || showAddModal || showEditModal || showDeleteModal || showTransactionModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showDetailsModal, showAddModal, showEditModal, showDeleteModal, showTransactionModal]);

  // Sort accounts by displayOrder for consistent ordering
  const sortedAccounts = [...accounts].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const bankAccounts = accounts.filter(acc => acc.type === 'bank');
  const cryptoAccounts = accounts.filter(acc => acc.type === 'crypto');
  
  const bankTotalINR = bankAccounts.reduce((total, account) => {
    return total + convertToINR(account.balance, account.currency);
  }, 0);
  
  const cryptoTotalINR = cryptoAccounts.reduce((total, account) => {
    return total + convertToINR(account.balance, account.currency);
  }, 0);

  const totalINR = bankTotalINR + cryptoTotalINR;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in relative min-h-screen transition-all duration-500">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            Accounts
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">
            Manage your bank and crypto accounts
          </p>
        </div>
        
        <div className="flex items-center ml-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md dark:shadow-lg text-sm sm:text-base whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Account</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {/* Mobile Layout: Total Balance at top, INR/USD side by side below */}
      <div className="md:hidden space-y-4">
        {/* Total Balance Card - Mobile Only */}
        <div className="bg-white dark:bg-white/5 rounded-2xl p-4 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 hover:shadow-xl dark:hover:shadow-3xl hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">Total Balance</h3>
            <Wallet className="w-5 h-5 text-orange-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            {formatCurrency(totalINR, 'INR')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-1">
            ${(totalINR / USD_TO_INR).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-2">
            Across {accounts.length} accounts
          </p>
        </div>

        {/* INR and USD Accounts - Side by Side on Mobile */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 backdrop-blur-sm h-full shadow-lg dark:shadow-2xl transition-all duration-300 hover:shadow-xl dark:hover:shadow-3xl hover:transform hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">INR Accounts</h3>
              <Building className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
              {formatCurrency(bankTotalINR, 'INR')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-1">
              ${(bankTotalINR / USD_TO_INR).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-2">
              {bankAccounts.length} accounts
            </p>
          </div>

          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 backdrop-blur-sm h-full shadow-lg dark:shadow-2xl transition-all duration-300 hover:shadow-xl dark:hover:shadow-3xl hover:transform hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">USD Accounts</h3>
              <Bitcoin className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
              ${(cryptoTotalINR / USD_TO_INR).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-1">
              {formatCurrency(cryptoTotalINR, 'INR')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-2">
              {cryptoAccounts.length} accounts
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Layout: Original 3-column layout */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-sm h-full shadow-lg dark:shadow-2xl transition-all duration-300 hover:shadow-xl dark:hover:shadow-3xl hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">Total Balance</h3>
            <Wallet className="w-5 h-5 text-orange-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            {formatCurrency(totalINR, 'INR')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-1">
            ${(totalINR / USD_TO_INR).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-2">
            Across {accounts.length} accounts
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-sm h-full shadow-lg dark:shadow-2xl transition-all duration-300 hover:shadow-xl dark:hover:shadow-3xl hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">INR Accounts</h3>
            <Building className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            {formatCurrency(bankTotalINR, 'INR')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-1">
            ${(bankTotalINR / USD_TO_INR).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-2">
            {bankAccounts.length} accounts
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-sm h-full shadow-lg dark:shadow-2xl transition-all duration-300 hover:shadow-xl dark:hover:shadow-3xl hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">USD Accounts</h3>
            <Bitcoin className="w-5 h-5 text-orange-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            ${(cryptoTotalINR / USD_TO_INR).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-1">
            {formatCurrency(cryptoTotalINR, 'INR')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300 mt-2">
            {cryptoAccounts.length} accounts
          </p>
        </div>
      </div>

      {/* Accounts Grid - Optimized for 15 accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedAccounts.length > 0 ? (
          sortedAccounts.map((account, index) => {
            const IconComponent = getAccountIcon(account.type, account.subtype);
            const isNegative = account.balance < 0;
            
            return (
              <div
                key={account.id}
                draggable
                onDragStart={(e) => handleDragStart(e, account)}
                onDragOver={(e) => handleDragOver(e, account)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, account)}
                onClick={() => openDetailsModal(account)}
                className={`bg-white dark:bg-white/5 rounded-xl p-4 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-3xl relative cursor-pointer ${
                  dragOver === account.id ? 'ring-2 ring-orange-500 ring-opacity-50' : ''
                } ${draggedAccount?.id === account.id ? 'opacity-50' : ''}`}
              >
                {/* Drag Handle */}
                <div className="absolute top-2 left-2 opacity-30 hover:opacity-70 transition-opacity duration-300">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </div>

                <div className="flex items-start justify-between mb-3 ml-6">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                      account.type === 'bank' ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-orange-100 dark:bg-orange-500/20'
                    }`}>
                      <IconComponent className={`w-5 h-5 ${
                        account.type === 'bank' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-300 truncate">
                        {account.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 truncate">
                        {account.subtype || (account.type === 'crypto' ? 'USD Account' : ACCOUNT_TYPES[account.type].label)} • {account.currency}
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === account.id ? null : account.id);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    
                    {activeDropdown === account.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 backdrop-blur-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(account);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit Account</span>
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(account);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Account</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <div className={`text-lg font-bold mb-1 transition-colors duration-300 ${
                    isNegative ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {formatCurrency(account.balance, account.currency)}
                  </div>
                  {account.currency === 'USD' && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                      ≈ {formatCurrency(convertToINR(account.balance, 'USD'), 'INR')}
                    </div>
                  )}
                  {isNegative && account.subtype === 'Credit Card' && (
                    <div className="flex items-center space-x-1 text-xs text-orange-600 dark:text-orange-400 mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Outstanding</span>
                    </div>
                  )}
                </div>

                {account.description && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-white/3 rounded-lg p-2 transition-colors duration-300 line-clamp-2">
                    {account.description}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                  <span>Last activity</span>
                  <span>{new Date(account.lastActivityAt || account.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full bg-white dark:bg-white/5 rounded-2xl p-12 text-center backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300">
            <Wallet className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
              No accounts yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 transition-colors duration-300">
              Add your first account to start tracking your finances
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto transition-all duration-300 transform hover:-translate-y-0.5 shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Add Your First Account</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              resetForm();
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300">Add New Account</h2>
            
            <form onSubmit={handleAddAccount} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., HDFC Savings"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Account Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value, subtype: '', currency: e.target.value === 'crypto' ? 'USD' : 'INR'})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  >
                    {Object.entries(ACCOUNT_TYPES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Subtype
                  </label>
                  <select
                    value={formData.subtype}
                    onChange={(e) => setFormData({...formData, subtype: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  >
                    <option value="">Select subtype</option>
                    {ACCOUNT_SUBTYPES[formData.type].map(subtype => (
                      <option key={subtype} value={subtype}>{subtype}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  >
                    {ACCOUNT_TYPES[formData.type].currencies.map(currency => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                  Initial Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({...formData, balance: e.target.value})}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Additional notes about this account"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.name || !formData.subtype}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditModal && selectedAccount && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
              if (!showDetailsModal) {
                setSelectedAccount(null);
              }
              resetForm();
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300">Edit Account</h2>
            
            <form onSubmit={handleEditAccount} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Account Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value, subtype: ''})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  >
                    {Object.entries(ACCOUNT_TYPES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Subtype
                  </label>
                  <select
                    value={formData.subtype}
                    onChange={(e) => setFormData({...formData, subtype: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  >
                    <option value="">Select subtype</option>
                    {ACCOUNT_SUBTYPES[formData.type].map(subtype => (
                      <option key={subtype} value={subtype}>{subtype}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  >
                    {ACCOUNT_TYPES[formData.type].currencies.map(currency => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                  Current Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({...formData, balance: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    if (!showDetailsModal) {
                      setSelectedAccount(null);
                    }
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.name || !formData.subtype}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && selectedAccount && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false);
              setSelectedAccount(null);
              setDeleteOptions({ deleteTransactions: false });
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Delete Account</h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6 transition-colors duration-300">
              Are you sure you want to delete <strong>"{selectedAccount.name}"</strong>? This action cannot be undone.
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                    What happens to transactions?
                  </h3>
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={deleteOptions.deleteTransactions}
                      onChange={(e) => setDeleteOptions({...deleteOptions, deleteTransactions: e.target.checked})}
                      className="mt-0.5 w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div>
                      <span className="text-sm text-yellow-700 dark:text-yellow-300 block">
                        Delete all transactions from this account
                      </span>
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 block mt-1">
                        {deleteOptions.deleteTransactions 
                          ? "All transaction history will be permanently lost" 
                          : "Transactions will be kept but marked as from deleted account"
                        }
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAccount(null);
                  setDeleteOptions({ deleteTransactions: false });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Details Modal */}
      {showDetailsModal && selectedAccount && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4 z-[60]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false);
              setSelectedAccount(null);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 w-full h-[calc(100vh-5rem)] md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl flex flex-col backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 md:border rounded-t-2xl md:rounded-t-2xl">
            {/* Mobile Header */}
            <div className="md:hidden flex-shrink-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 flex-shrink-0 ${
                    selectedAccount.type === 'bank' ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-orange-100 dark:bg-orange-500/20'
                  }`}>
                    {React.createElement(getAccountIcon(selectedAccount.type, selectedAccount.subtype), {
                      className: `w-6 h-6 ${
                        selectedAccount.type === 'bank' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                      }`
                    })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300 truncate">
                      {selectedAccount.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300 truncate">
                      {selectedAccount.subtype || (selectedAccount.type === 'crypto' ? 'USD Account' : 'Bank Account')} • {selectedAccount.currency}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedAccount(null);
                  }}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors duration-300 flex-shrink-0"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Mobile Balance Summary */}
              <div className="px-4 pb-4">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Balance</div>
                  <div className={`text-3xl font-bold mb-2 ${
                    selectedAccount.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
                  </div>
                  {selectedAccount.currency === 'USD' && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ≈ {formatCurrency(convertToINR(selectedAccount.balance, 'USD'), 'INR')}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 mt-4">
                    <button
                      onClick={() => openTransactionModal(selectedAccount)}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl flex items-center justify-center space-x-2 text-sm font-medium transition-colors duration-300"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Transaction</span>
                    </button>
                    <button
                      onClick={() => openEditFromDetails(selectedAccount)}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-xl flex items-center justify-center space-x-2 text-sm font-medium transition-colors duration-300"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit Account</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:block p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedAccount.type === 'bank' ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-orange-100 dark:bg-orange-500/20'
                  }`}>
                    {React.createElement(getAccountIcon(selectedAccount.type, selectedAccount.subtype), {
                      className: `w-6 h-6 ${
                        selectedAccount.type === 'bank' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                      }`
                    })}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedAccount.name}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedAccount.subtype || (selectedAccount.type === 'crypto' ? 'USD Account' : 'Bank Account')} • {selectedAccount.currency}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => openTransactionModal(selectedAccount)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-300"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Transaction</span>
                  </button>
                  <button
                    onClick={() => openEditFromDetails(selectedAccount)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-300"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedAccount(null);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto md:p-6 min-h-0">
              <div className="md:grid md:grid-cols-5 md:gap-6">
                {/* Account Information */}
                <div className="p-4 md:p-0 md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h3>
                  
                  {/* Mobile: 2-column grid */}
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                    <div className="md:hidden bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedAccount.type === 'bank' ? 'Bank Account' : 'USD Account'}
                      </div>
                    </div>
                    
                    <div className="md:hidden bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subtype</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedAccount.subtype || 'N/A'}
                      </div>
                    </div>
                    
                    <div className="md:hidden bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Currency</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedAccount.currency}
                      </div>
                    </div>
                    
                    <div className="md:hidden bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(selectedAccount.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Desktop: Original layout */}
                  <div className="hidden md:block space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Current Balance</span>
                      </div>
                      <div className={`text-2xl font-bold ${
                        selectedAccount.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
                      </div>
                      {selectedAccount.currency === 'USD' && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          ≈ {formatCurrency(convertToINR(selectedAccount.balance, 'USD'), 'INR')}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Type</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {selectedAccount.type === 'bank' ? 'Bank Account' : 'USD Account'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Subtype</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {selectedAccount.subtype || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Currency</span>
                        <span className="text-gray-900 dark:text-white font-medium">{selectedAccount.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Created</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {new Date(selectedAccount.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Last Activity</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {new Date(selectedAccount.lastActivityAt || selectedAccount.updatedAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {selectedAccount.description && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                        <p className="text-gray-600 dark:text-gray-400">{selectedAccount.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Mobile description */}
                  {selectedAccount.description && (
                    <div className="mt-4 md:hidden">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Description</div>
                      <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                        {selectedAccount.description}
                      </div>
                    </div>
                  )}
                </div>

                {/* Transactions */}
                <div className="p-4 md:p-0 border-t border-gray-200 dark:border-gray-700 md:border-t-0 md:col-span-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Receipt className="w-5 h-5 mr-2" />
                      Transactions ({(() => {
                        const accountTransactions = transactions
                          .filter(t => t.accountId === selectedAccount.id || t.toAccountId === selectedAccount.id);
                        return accountTransactions.length;
                      })()})
                    </h3>
                  </div>
                  
                  <div className="space-y-3 md:max-h-96 md:overflow-y-auto">
                    {(() => {
                      const accountTransactions = transactions
                        .filter(t => t.accountId === selectedAccount.id || t.toAccountId === selectedAccount.id)
                        .sort((a, b) => new Date(b.date) - new Date(a.date));

                      if (accountTransactions.length === 0) {
                        return (
                          <div className="text-center py-12">
                            <Receipt className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              No transactions yet
                            </h4>
                            <p className="text-gray-600 dark:text-gray-400">
                              Transactions for this account will appear here
                            </p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {accountTransactions.map((transaction) => {
                            const TransactionIcon = getTransactionIcon(transaction.type);
                            const isNegativeForAccount = (
                              (transaction.type === 'expense') ||
                              (transaction.type === 'transfer' && transaction.accountId === selectedAccount.id) ||
                              (transaction.type === 'adjustment' && !transaction.isIncrease)
                            );
                            
                            return (
                              <div key={transaction.id} className="bg-gray-50 dark:bg-gray-800 rounded-2xl md:rounded-lg p-4 md:p-3 border border-gray-200 dark:border-gray-700">
                                {/* Mobile layout */}
                                <div className="md:hidden">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                        transaction.type === 'income' ? 'bg-green-100 dark:bg-green-500/20' :
                                        transaction.type === 'expense' ? 'bg-red-100 dark:bg-red-500/20' :
                                        transaction.type === 'transfer' ? 'bg-blue-100 dark:bg-blue-500/20' :
                                        'bg-orange-100 dark:bg-orange-500/20'
                                      }`}>
                                        <TransactionIcon className={`w-5 h-5 ${getTransactionTypeColor(transaction.type)}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {transaction.category}
                                          </span>
                                          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                                            transaction.type === 'income' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' :
                                            transaction.type === 'expense' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300' :
                                            transaction.type === 'transfer' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                                            'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                                          }`}>
                                            {transaction.type}
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {transaction.paymentMode}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {new Date(transaction.date).toLocaleDateString('en-IN', { 
                                            day: 'numeric', 
                                            month: 'short',
                                            year: 'numeric'
                                          })} at {new Date(transaction.date).toLocaleTimeString('en-IN', { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className={`text-xl font-bold ${
                                      isNegativeForAccount ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                    }`}>
                                      {isNegativeForAccount ? '-' : '+'}{formatCurrency(transaction.amount, transaction.currency)}
                                    </div>
                                  </div>
                                  
                                  {transaction.notes && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 rounded-xl p-3 mt-3">
                                      {transaction.notes}
                                    </div>
                                  )}
                                </div>

                                {/* Desktop layout */}
                                <div className="hidden md:block">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        transaction.type === 'income' ? 'bg-green-100 dark:bg-green-500/20' :
                                        transaction.type === 'expense' ? 'bg-red-100 dark:bg-red-500/20' :
                                        transaction.type === 'transfer' ? 'bg-blue-100 dark:bg-blue-500/20' :
                                        'bg-orange-100 dark:bg-orange-500/20'
                                      }`}>
                                        <TransactionIcon className={`w-4 h-4 ${getTransactionTypeColor(transaction.type)}`} />
                                      </div>
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium text-gray-900 dark:text-white">
                                            {transaction.category}
                                          </span>
                                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                                            transaction.type === 'income' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' :
                                            transaction.type === 'expense' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300' :
                                            transaction.type === 'transfer' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                                            'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                                          }`}>
                                            {transaction.type}
                                          </span>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          {transaction.paymentMode} • {new Date(transaction.date).toLocaleDateString('en-IN', { 
                                            day: 'numeric', 
                                            month: 'short',
                                            year: 'numeric'
                                          })} • {new Date(transaction.date).toLocaleTimeString('en-IN', { 
                                            hour: '2-digit', 
                                            minute: '2-digit',
                                            hour12: true
                                          }).toLowerCase()}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`font-bold ${
                                        isNegativeForAccount ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                      }`}>
                                        {isNegativeForAccount ? '-' : '+'}{formatCurrency(transaction.amount, transaction.currency)}
                                      </div>
                                    </div>
                                  </div>
                                  {transaction.notes && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 pl-11">
                                      {transaction.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showTransactionModal && selectedAccount && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTransactionModal(false);
              resetTransactionForm();
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300">
              Add Transaction - {selectedAccount.name}
            </h2>
            
            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Transaction Type
                  </label>
                  <select
                    value={transactionFormData.type}
                    onChange={(e) => setTransactionFormData({...transactionFormData, type: e.target.value, category: '', toAccountId: ''})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionFormData.amount}
                    onChange={(e) => setTransactionFormData({...transactionFormData, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Category
                  </label>
                  <select
                    value={transactionFormData.category}
                    onChange={(e) => setTransactionFormData({...transactionFormData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  >
                    <option value="">Select category</option>
                    {TRANSACTION_CATEGORIES[transactionFormData.type]?.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Payment Mode
                  </label>
                  <select
                    value={transactionFormData.paymentMode}
                    onChange={(e) => setTransactionFormData({...transactionFormData, paymentMode: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  >
                    <option value="">Select payment mode</option>
                    {PAYMENT_MODES[selectedAccount.type]?.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>
              </div>

              {transactionFormData.type === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    To Account
                  </label>
                  <select
                    value={transactionFormData.toAccountId}
                    onChange={(e) => setTransactionFormData({...transactionFormData, toAccountId: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  >
                    <option value="">Select destination account</option>
                    {accounts.filter(acc => acc.id !== selectedAccount.id).map(account => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {transactionFormData.type === 'adjustment' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Adjustment Type
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="adjustmentType"
                        checked={transactionFormData.isIncrease}
                        onChange={() => setTransactionFormData({...transactionFormData, isIncrease: true})}
                        className="mr-2"
                      />
                      <span className="text-green-600 dark:text-green-400">Increase Balance</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="adjustmentType"
                        checked={!transactionFormData.isIncrease}
                        onChange={() => setTransactionFormData({...transactionFormData, isIncrease: false})}
                        className="mr-2"
                      />
                      <span className="text-red-600 dark:text-red-400">Decrease Balance</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={transactionFormData.date}
                  onChange={(e) => setTransactionFormData({...transactionFormData, date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                  Notes (Optional)
                </label>
                <textarea
                  value={transactionFormData.notes}
                  onChange={(e) => setTransactionFormData({...transactionFormData, notes: e.target.value})}
                  placeholder="Additional details about this transaction"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransactionModal(false);
                    resetTransactionForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !transactionFormData.amount || !transactionFormData.category}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Add Button for Mobile - Fixed hover issue */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg dark:shadow-2xl transition-all duration-300 flex items-center justify-center group transform hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-3xl"
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="absolute right-14 sm:right-16 top-1/2 transform -translate-y-1/2 bg-gray-900 dark:bg-black text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg dark:shadow-2xl pointer-events-none hidden sm:block">
          Add Account
        </span>
      </button>
    </div>
  );
}

export default Accounts;