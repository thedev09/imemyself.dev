import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Plus, MoreVertical, Calendar, CreditCard, 
  AlertTriangle, Clock, Check, X, Edit, Trash2, Pause, 
  Play, DollarSign, TrendingUp, Bell, Filter, Search,
  Zap, Shield, Music, Video, Cloud, Code, Book, Heart,
  ShoppingBag, Gamepad, Home, Car, Phone, Globe, Briefcase,
  Coffee, Dumbbell, Camera, Tv, Wifi, Users, Package, Info,
  ChevronDown, ChevronUp, Grid, List
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  query, where, orderBy, onSnapshot, serverTimestamp,
  writeBatch, getDocs, increment
} from 'firebase/firestore';

const USD_TO_INR = 84.0;

// Updated categories based on your actual subscriptions
const SUBSCRIPTION_CATEGORIES = {
  'Entertainment': { 
    icon: Video, 
    color: 'red',
    services: ['Netflix', 'Disney+', 'Prime Video', 'YouTube Premium', 'Hotstar', 'Apple TV+', 'HBO Max', 'Spotify', 'Apple Music', 'Other Entertainment']
  },
  'AI Tools': { 
    icon: Zap, 
    color: 'green',
    services: ['ChatGPT', 'Claude', 'Midjourney', 'GitHub Copilot', 'Notion AI', 'Grammarly', 'Other AI Tools']
  },
  'Cloud Storage': { 
    icon: Cloud, 
    color: 'blue',
    services: ['iCloud', 'Google One', 'Dropbox', 'OneDrive', 'Box', 'Other Storage']
  },
  'Communication': { 
    icon: Phone, 
    color: 'purple',
    services: ['Telegram Premium', 'WhatsApp Business', 'Slack', 'Discord Nitro', 'Zoom Pro', 'Other Communication']
  },
  'Shopping': { 
    icon: ShoppingBag, 
    color: 'pink',
    services: ['Amazon Prime', 'Flipkart Plus', 'Other Shopping']
  },
  'Utilities': { 
    icon: Wifi, 
    color: 'indigo',
    services: ['Airtel', 'Jio', 'Vi', 'Internet', 'Other Utilities']
  },
  'Productivity': { 
    icon: Briefcase, 
    color: 'yellow',
    services: ['Microsoft 365', 'Adobe Creative', 'Canva Pro', 'Figma', 'Other Productivity']
  },
  'News & Reading': { 
    icon: Book, 
    color: 'gray',
    services: ['Kindle Unlimited', 'Medium', 'The Hindu', 'Times Prime', 'Other News']
  },
  'Finance': { 
    icon: DollarSign, 
    color: 'emerald',
    services: ['Truecaller Premium', 'Banking Apps', 'Investment Apps', 'Other Finance']
  },
  'Other': { 
    icon: Package, 
    color: 'slate',
    services: ['Other Services']
  }
};

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly', months: 1 },
  { value: 'quarterly', label: 'Quarterly', months: 3 },
  { value: 'half-yearly', label: 'Half Yearly', months: 6 },
  { value: 'yearly', label: 'Yearly', months: 12 }
];

function Subscriptions({ accounts }) {
  const { currentUser } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // New UI states - Set default view based on screen size
  const [viewMode, setViewMode] = useState(window.innerWidth < 640 ? 'list' : 'category'); // 'category' or 'list'
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Entertainment', 'AI Tools']));
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Entertainment',
    serviceName: '',
    amount: '',
    currency: 'INR',
    accountId: '',
    billingCycle: 'monthly',
    nextBillingDate: new Date().toISOString().split('T')[0],
    description: '',
    isActive: true,
    notifyBeforeDays: 2,
    autoRenew: true
  });

  const [deleteOptions, setDeleteOptions] = useState({
    deleteTransactions: false
  });

  // Load subscriptions from Firebase
  useEffect(() => {
    if (!currentUser) return;

    let unsubscribe;
    
    const loadSubscriptions = async () => {
      try {
        const subscriptionsQuery = query(
          collection(db, 'users', currentUser.uid, 'subscriptions'),
          orderBy('nextBillingDate', 'asc')
        );

        unsubscribe = onSnapshot(subscriptionsQuery, 
          (snapshot) => {
            const subscriptionsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setSubscriptions(subscriptionsData);
          },
          (error) => {
            console.error('Error loading subscriptions:', error);
          }
        );
      } catch (error) {
        console.error('Error setting up subscription listener:', error);
      }
    };

    loadSubscriptions();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  // Check and process due subscriptions
  useEffect(() => {
    if (!currentUser || subscriptions.length === 0) return;
    
    let mounted = true;
    
    const checkDueSubscriptions = async () => {
      if (!mounted) return;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dueSubscriptions = subscriptions.filter(sub => {
        if (!sub.isActive || !sub.autoRenew) return false;
        const billingDate = new Date(sub.nextBillingDate);
        billingDate.setHours(0, 0, 0, 0);
        return billingDate <= today && (!sub.lastProcessedDate || 
               new Date(sub.lastProcessedDate).toDateString() !== today.toDateString());
      });

      if (dueSubscriptions.length > 0 && mounted) {
        console.log(`Found ${dueSubscriptions.length} due subscriptions`);
        // Auto-process due subscriptions
        for (const sub of dueSubscriptions) {
          if (!mounted) break;
          await processSubscription(sub);
        }
      }
    };

    checkDueSubscriptions();
    
    return () => {
      mounted = false;
    };
  }, [subscriptions, currentUser]);

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

  const getNextBillingDate = (currentDate, billingCycle) => {
    const date = new Date(currentDate);
    const cycleData = BILLING_CYCLES.find(c => c.value === billingCycle);
    date.setMonth(date.getMonth() + (cycleData?.months || 1));
    return date.toISOString().split('T')[0];
  };

  const getDaysUntilBilling = (nextBillingDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const billingDate = new Date(nextBillingDate);
    billingDate.setHours(0, 0, 0, 0);
    const diffTime = billingDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateMonthlySpend = () => {
    return subscriptions
      .filter(sub => sub.isActive)
      .reduce((total, sub) => {
        const monthlyAmount = sub.billingCycle === 'yearly' ? sub.amount / 12 :
                            sub.billingCycle === 'quarterly' ? sub.amount / 3 :
                            sub.billingCycle === 'half-yearly' ? sub.amount / 6 :
                            sub.amount;
        return total + convertToINR(monthlyAmount, sub.currency);
      }, 0);
  };

  const calculateYearlySpend = () => {
    return subscriptions
      .filter(sub => sub.isActive)
      .reduce((total, sub) => {
        const yearlyAmount = sub.billingCycle === 'monthly' ? sub.amount * 12 :
                           sub.billingCycle === 'quarterly' ? sub.amount * 4 :
                           sub.billingCycle === 'half-yearly' ? sub.amount * 2 :
                           sub.amount;
        return total + convertToINR(yearlyAmount, sub.currency);
      }, 0);
  };

  const getUpcomingBillings = () => {
    return subscriptions
      .filter(sub => sub.isActive)
      .map(sub => ({
        ...sub,
        daysUntil: getDaysUntilBilling(sub.nextBillingDate)
      }))
      .filter(sub => sub.daysUntil >= 0 && sub.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const getCategorySpending = () => {
    const categoryTotals = {};
    subscriptions
      .filter(sub => sub.isActive)
      .forEach(sub => {
        const category = sub.category || 'Other';
        const monthlyAmount = sub.billingCycle === 'yearly' ? sub.amount / 12 :
                            sub.billingCycle === 'quarterly' ? sub.amount / 3 :
                            sub.billingCycle === 'half-yearly' ? sub.amount / 6 :
                            sub.amount;
        const amountINR = convertToINR(monthlyAmount, sub.currency);
        categoryTotals[category] = (categoryTotals[category] || 0) + amountINR;
      });
    return Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount]) => ({ category, amount }));
  };

  const handleAddSubscription = async () => {
    if (!currentUser || loading || !formData.name || !formData.amount || !formData.accountId) return;

    try {
      setLoading(true);
      
      const account = accounts.find(acc => acc.id === formData.accountId);
      if (!account) throw new Error('Account not found');

      const subscriptionData = {
        name: formData.name,
        category: formData.category,
        serviceName: formData.serviceName || '',
        amount: parseFloat(formData.amount),
        currency: account.currency, // Use account's currency
        accountId: formData.accountId,
        accountName: account.name,
        billingCycle: formData.billingCycle,
        nextBillingDate: formData.nextBillingDate,
        lastBillingDate: null,
        lastProcessedDate: null,
        description: formData.description,
        isActive: formData.isActive,
        notifyBeforeDays: formData.notifyBeforeDays,
        autoRenew: formData.autoRenew,
        totalSpent: 0,
        transactionCount: 0,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'users', currentUser.uid, 'subscriptions'), subscriptionData);
      
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding subscription:', error);
      alert('Error adding subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubscription = async () => {
    if (!currentUser || !selectedSubscription || loading) return;

    try {
      setLoading(true);
      
      const subscriptionRef = doc(db, 'users', currentUser.uid, 'subscriptions', selectedSubscription.id);
      const account = accounts.find(acc => acc.id === formData.accountId);
      
      // Allow editing of ALL fields now
      await updateDoc(subscriptionRef, {
        name: formData.name,
        category: formData.category,
        serviceName: formData.serviceName,
        amount: parseFloat(formData.amount),
        currency: account?.currency || formData.currency,
        accountId: formData.accountId,
        accountName: account?.name || formData.accountName,
        billingCycle: formData.billingCycle,
        nextBillingDate: formData.nextBillingDate,
        description: formData.description,
        isActive: formData.isActive,
        notifyBeforeDays: formData.notifyBeforeDays,
        autoRenew: formData.autoRenew,
        updatedAt: new Date().toISOString()
      });
      
      setShowEditModal(false);
      setSelectedSubscription(null);
      resetForm();
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Error updating subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubscription = async () => {
    if (!currentUser || !selectedSubscription || loading) return;

    try {
      setLoading(true);
      
      const subscriptionRef = doc(db, 'users', currentUser.uid, 'subscriptions', selectedSubscription.id);
      await deleteDoc(subscriptionRef);
      
      setShowDeleteModal(false);
      setSelectedSubscription(null);
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Error deleting subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processSubscription = async (subscription) => {
    if (!currentUser || !subscription) return;

    try {
      const batch = writeBatch(db);
      
      // Create transaction
      const transactionData = {
        type: 'expense',
        amount: subscription.amount,
        amountInINR: convertToINR(subscription.amount, subscription.currency),
        currency: subscription.currency,
        exchangeRate: subscription.currency === 'USD' ? USD_TO_INR : 1,
        accountId: subscription.accountId,
        accountName: subscription.accountName,
        category: 'Subscriptions',
        paymentMode: 'Auto Debit',
        notes: `Subscription: ${subscription.name}`,
        date: new Date().toISOString(),
        userId: currentUser.uid,
        subscriptionId: subscription.id,
        createdAt: new Date().toISOString()
      };

      const transactionRef = doc(collection(db, 'users', currentUser.uid, 'transactions'));
      batch.set(transactionRef, transactionData);

      // Update account balance
      const accountRef = doc(db, 'users', currentUser.uid, 'accounts', subscription.accountId);
      batch.update(accountRef, {
        balance: increment(-subscription.amount),
        lastActivityAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Update subscription
      const subscriptionRef = doc(db, 'users', currentUser.uid, 'subscriptions', subscription.id);
      batch.update(subscriptionRef, {
        lastBillingDate: new Date().toISOString(),
        lastProcessedDate: new Date().toISOString(),
        nextBillingDate: getNextBillingDate(subscription.nextBillingDate, subscription.billingCycle),
        totalSpent: increment(subscription.amount),
        transactionCount: increment(1),
        updatedAt: new Date().toISOString()
      });

      await batch.commit();
      console.log(`Processed subscription: ${subscription.name}`);
    } catch (error) {
      console.error('Error processing subscription:', error);
    }
  };

  const toggleSubscriptionStatus = async (subscription) => {
    if (!currentUser) return;

    try {
      const subscriptionRef = doc(db, 'users', currentUser.uid, 'subscriptions', subscription.id);
      await updateDoc(subscriptionRef, {
        isActive: !subscription.isActive,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error toggling subscription:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Entertainment',
      serviceName: '',
      amount: '',
      currency: 'INR',
      accountId: '',
      billingCycle: 'monthly',
      nextBillingDate: new Date().toISOString().split('T')[0],
      description: '',
      isActive: true,
      notifyBeforeDays: 2,
      autoRenew: true
    });
  };

  const openEditModal = (subscription) => {
    setSelectedSubscription(subscription);
    setFormData({
      name: subscription.name,
      category: subscription.category || 'Other', // Handle legacy data
      serviceName: subscription.serviceName || '',
      amount: subscription.amount.toString(),
      currency: subscription.currency,
      accountId: subscription.accountId,
      billingCycle: subscription.billingCycle,
      nextBillingDate: subscription.nextBillingDate,
      description: subscription.description || '',
      isActive: subscription.isActive,
      notifyBeforeDays: subscription.notifyBeforeDays,
      autoRenew: subscription.autoRenew
    });
    setShowEditModal(true);
    setActiveDropdown(null);
  };

  const openDeleteModal = (subscription) => {
    setSelectedSubscription(subscription);
    setShowDeleteModal(true);
    setActiveDropdown(null);
  };

  const openProcessModal = (subscription) => {
    setSelectedSubscription(subscription);
    setShowProcessModal(true);
    setActiveDropdown(null);
  };

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Group subscriptions by category
  const groupedSubscriptions = subscriptions.reduce((groups, sub) => {
    const category = sub.category || 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(sub);
    return groups;
  }, {});

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesCategory = filterCategory === 'all' || sub.category === filterCategory;
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (sub.serviceName && sub.serviceName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const calculateCategorySpend = (categoryName) => {
    const categorySubs = groupedSubscriptions[categoryName] || [];
    return categorySubs
      .filter(sub => sub.isActive)
      .reduce((total, sub) => {
        const monthlyAmount = sub.billingCycle === 'yearly' ? sub.amount / 12 :
                            sub.billingCycle === 'quarterly' ? sub.amount / 3 :
                            sub.billingCycle === 'half-yearly' ? sub.amount / 6 :
                            sub.amount;
        return total + convertToINR(monthlyAmount, sub.currency);
      }, 0);
  };

  const renderSubscriptionCard = (subscription) => {
    const categoryInfo = SUBSCRIPTION_CATEGORIES[subscription.category] || SUBSCRIPTION_CATEGORIES['Other'];
    const ServiceIcon = categoryInfo.icon;
    const serviceColor = categoryInfo.color;
    const daysUntilBilling = getDaysUntilBilling(subscription.nextBillingDate);
    const account = accounts.find(acc => acc.id === subscription.accountId);
    const isDue = daysUntilBilling <= 0;
    
    return (
      <>
        {/* Desktop View */}
        <div
          key={subscription.id}
          className={`hidden sm:block border border-gray-200 dark:border-white/10 rounded-xl p-4 transition-all duration-300 hover:shadow-md dark:hover:shadow-xl ${
            !subscription.isActive ? 'opacity-60' : ''
          } ${isDue ? 'ring-2 ring-orange-500 ring-opacity-50' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1 min-w-0">
              <div className={`w-12 h-12 rounded-xl bg-${serviceColor}-100 dark:bg-${serviceColor}-500/20 flex items-center justify-center flex-shrink-0`}>
                <ServiceIcon className={`w-6 h-6 text-${serviceColor}-600 dark:text-${serviceColor}-400`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                    {subscription.name}
                  </h4>
                  {!subscription.isActive && (
                    <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full whitespace-nowrap">
                      Paused
                    </span>
                  )}
                  {isDue && subscription.isActive && (
                    <span className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full whitespace-nowrap">
                      Due
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <span className="truncate">{subscription.serviceName || subscription.category}</span>
                  <span>•</span>
                  <span className="capitalize whitespace-nowrap">{subscription.billingCycle}</span>
                  {subscription.isActive && (
                    <>
                      <span>•</span>
                      <span className={`whitespace-nowrap ${daysUntilBilling <= 3 ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}`}>
                        {daysUntilBilling === 0 ? 'Due today' : 
                         daysUntilBilling < 0 ? `Overdue by ${Math.abs(daysUntilBilling)} days` :
                         daysUntilBilling === 1 ? 'Due tomorrow' :
                         `Due in ${daysUntilBilling} days`}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {account?.name || subscription.accountName || 'Unknown Account'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 flex-shrink-0">
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(subscription.amount, subscription.currency)}
                </p>
                {subscription.currency !== 'INR' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ≈ {formatCurrency(convertToINR(subscription.amount, subscription.currency))}
                  </p>
                )}
              </div>
              
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === subscription.id ? null : subscription.id);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                
                {activeDropdown === subscription.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                    {isDue && subscription.isActive && (
                      <>
                        <button
                          onClick={() => openProcessModal(subscription)}
                          className="w-full text-left px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Process Now</span>
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                      </>
                    )}
                    <button
                      onClick={() => toggleSubscriptionStatus(subscription)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                    >
                      {subscription.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{subscription.isActive ? 'Pause' : 'Resume'}</span>
                    </button>
                    <button
                      onClick={() => openEditModal(subscription)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    <button
                      onClick={() => openDeleteModal(subscription)}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {subscription.description && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-lg p-2">
              {subscription.description}
            </p>
          )}
          
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {subscription.totalSpent > 0 
                ? `Total spent: ${formatCurrency(subscription.totalSpent, subscription.currency)}`
                : 'No transactions yet'
              }
            </span>
            <span>Next billing: {new Date(subscription.nextBillingDate).toLocaleDateString('en-IN')}</span>
          </div>
        </div>
        
        {/* Mobile View */}
        <div
          key={`mobile-${subscription.id}`}
          className={`sm:hidden bg-white dark:bg-white/5 rounded-xl p-3 border border-gray-200 dark:border-white/10 hover:shadow-md dark:hover:shadow-xl transition-all duration-300 ${
            !subscription.isActive ? 'opacity-60' : ''
          } ${isDue ? 'ring-2 ring-orange-500 ring-opacity-50' : ''}`}
        >
          <div className="flex items-start mb-3">
            <div className="flex items-start space-x-3 flex-1 min-w-0 pr-2">
              <div className={`w-10 h-10 rounded-lg bg-${serviceColor}-100 dark:bg-${serviceColor}-500/20 flex items-center justify-center flex-shrink-0`}>
                <ServiceIcon className={`w-5 h-5 text-${serviceColor}-600 dark:text-${serviceColor}-400`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {subscription.name}
                  </h4>
                  {!subscription.isActive && (
                    <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full whitespace-nowrap">
                      Paused
                    </span>
                  )}
                  {isDue && subscription.isActive && (
                    <span className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full whitespace-nowrap">
                      Due
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {subscription.serviceName || subscription.category}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                  {subscription.billingCycle}
                </p>
              </div>
            </div>
            
            <div className="flex items-start flex-shrink-0">
              <div className="text-right mr-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatCurrency(subscription.amount, subscription.currency)}
                </p>
                {subscription.currency !== 'INR' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ≈ {formatCurrency(convertToINR(subscription.amount, subscription.currency))}
                  </p>
                )}
                <p className={`text-xs font-medium ${
                  daysUntilBilling <= 3 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {subscription.isActive ? (
                    daysUntilBilling === 0 ? 'Due today' : 
                    daysUntilBilling < 0 ? `Overdue ${Math.abs(daysUntilBilling)}d` :
                    daysUntilBilling === 1 ? 'Due tomorrow' :
                    `Due in ${daysUntilBilling}d`
                  ) : 'Paused'}
                </p>
              </div>
              
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === subscription.id ? null : subscription.id);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-300"
                >
                  <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                
                {activeDropdown === subscription.id && (
                  <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                    {isDue && subscription.isActive && (
                      <>
                        <button
                          onClick={() => openProcessModal(subscription)}
                          className="w-full text-left px-3 py-2 text-xs text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Process</span>
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                      </>
                    )}
                    <button
                      onClick={() => toggleSubscriptionStatus(subscription)}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                    >
                      {subscription.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{subscription.isActive ? 'Pause' : 'Resume'}</span>
                    </button>
                    <button
                      onClick={() => openEditModal(subscription)}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    <button
                      onClick={() => openDeleteModal(subscription)}
                      className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-300"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 dark:border-white/10 pt-3 mt-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400 block mb-1">Account</span>
                <p className="text-gray-900 dark:text-white font-medium truncate">
                  {account?.name || subscription.accountName || 'Unknown Account'}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block mb-1">Next billing</span>
                <p className="text-gray-900 dark:text-white font-medium">
                  {new Date(subscription.nextBillingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                </p>
              </div>
              {subscription.totalSpent > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Total spent</span>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatCurrency(subscription.totalSpent, subscription.currency)}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {subscription.description && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {subscription.description}
              </p>
            </div>
          )}
        </div>
      </>
    );
  };

  const upcomingBillings = getUpcomingBillings();

  return (
    <div className="p-6 space-y-6 animate-fade-in relative min-h-screen transition-all duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            Subscriptions
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">
            Manage your recurring payments
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg shadow-sm dark:shadow-lg hover:shadow-md dark:hover:shadow-xl transition-all duration-300 backdrop-blur-sm border flex items-center justify-center ${
              showFilters ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
          
          {/* Add Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md dark:shadow-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Subscription</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-white/5 rounded-xl p-3 sm:p-4 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Active Subscriptions</h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            {subscriptions.filter(sub => sub.isActive).length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
            {subscriptions.filter(sub => !sub.isActive).length} paused
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-xl p-3 sm:p-4 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Due this week</h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            {upcomingBillings.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 truncate">
            {upcomingBillings.length > 0 ? `Next: ${upcomingBillings[0].name}` : 'No upcoming'}
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-xl p-3 sm:p-4 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Monthly Spend</h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(calculateMonthlySpend())}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
            Estimated total
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-xl p-3 sm:p-4 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 hover:transform hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Yearly Projection</h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(calculateYearlySpend())}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
            Based on current
          </p>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-white/5 rounded-2xl p-4 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subscriptions..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
              >
                <option value="all">All Categories</option>
                {Object.keys(SUBSCRIPTION_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Billings Alert - Mobile Only */}
      {upcomingBillings.length > 0 && (
        <div className="sm:hidden bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Bell className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                Upcoming Bills
              </h3>
              <div className="space-y-1">
                {upcomingBillings.slice(0, 2).map(sub => (
                  <div key={sub.id} className="flex items-center justify-between text-xs">
                    <span className="text-yellow-700 dark:text-yellow-400 truncate mr-2">
                      {sub.name} - {sub.daysUntil === 0 ? 'Due today' : sub.daysUntil === 1 ? 'Due tomorrow' : `in ${sub.daysUntil} days`}
                    </span>
                    <span className="font-medium text-yellow-800 dark:text-yellow-300 whitespace-nowrap">
                      {formatCurrency(sub.amount, sub.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Upcoming Billings Alert - Desktop Only */}
      {upcomingBillings.length > 0 && (
        <div className="hidden sm:block bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                Upcoming Billings This Week
              </h3>
              <div className="space-y-1">
                {upcomingBillings.slice(0, 3).map(sub => (
                  <div key={sub.id} className="flex items-center justify-between text-sm">
                    <span className="text-yellow-700 dark:text-yellow-400">
                      {sub.name} - {sub.daysUntil === 0 ? 'Due today' : `in ${sub.daysUntil} days`}
                    </span>
                    <span className="font-medium text-yellow-800 dark:text-yellow-300">
                      {formatCurrency(sub.amount, sub.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Subscriptions List */}
          <div className="bg-white dark:bg-white/5 rounded-2xl backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Your Subscriptions
                </h3>
                
                {/* View Switcher */}
                <div className="flex bg-white dark:bg-white/5 rounded-lg p-1 shadow-sm dark:shadow-lg backdrop-blur-sm border border-gray-200 dark:border-white/10">
                  <button
                    onClick={() => setViewMode('category')}
                    className={`p-1.5 rounded-md transition-all duration-300 flex items-center justify-center ${
                      viewMode === 'category' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all duration-300 flex items-center justify-center ${
                      viewMode === 'list' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {filteredSubscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No subscriptions yet
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Add your first subscription to start tracking recurring payments
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Your First Subscription</span>
                  </button>
                </div>
              ) : (
                <>
                  {viewMode === 'category' ? (
                    // Category View
                    <div className="space-y-4">
                      {Object.entries(SUBSCRIPTION_CATEGORIES).map(([categoryName, categoryInfo]) => {
                        const categorySubs = groupedSubscriptions[categoryName] || [];
                        const filteredCategorySubs = categorySubs.filter(sub => {
                          const matchesSearch = searchQuery === '' || sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                              (sub.serviceName && sub.serviceName.toLowerCase().includes(searchQuery.toLowerCase()));
                          return matchesSearch;
                        });
                        
                        if (filteredCategorySubs.length === 0 && searchQuery) return null;
                        
                        const categorySpend = calculateCategorySpend(categoryName);
                        const IconComponent = categoryInfo.icon;
                        const isExpanded = expandedCategories.has(categoryName);
                        
                        return (
                          <div key={categoryName} className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                            <button
                              onClick={() => toggleCategory(categoryName)}
                              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-300"
                            >
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className={`w-10 h-10 rounded-xl bg-${categoryInfo.color}-100 dark:bg-${categoryInfo.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                                  <IconComponent className={`w-5 h-5 text-${categoryInfo.color}-600 dark:text-${categoryInfo.color}-400`} />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{categoryName}</h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                    {categorySubs.length} subscriptions • {formatCurrency(categorySpend)}/month
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(categorySpend)}
                                </span>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                              </div>
                            </button>
                            
                            {isExpanded && (
                              <div className="border-t border-gray-200 dark:border-white/10 p-4 space-y-3">
                                {filteredCategorySubs.length > 0 ? (
                                  filteredCategorySubs.map(renderSubscriptionCard)
                                ) : (
                                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                                    No subscriptions in this category
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // List View
                    <div className="space-y-3">
                      {filteredSubscriptions.map(renderSubscriptionCard)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                  How Subscriptions Work
                </h4>
                <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• Subscriptions automatically create expense transactions on their billing date</li>
                  <li>• Account balances are updated when subscriptions are processed</li>
                  <li>• You'll be notified before each billing based on your preferences</li>
                  <li>• Pause subscriptions temporarily without losing your settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Category Spending */}
          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Spending by Category
            </h3>
            {getCategorySpending().length > 0 ? (
              <div className="space-y-3">
                {getCategorySpending().map(({ category, amount }) => {
                  const percentage = (amount / calculateMonthlySpend()) * 100;
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {category}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No active subscriptions
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Average per subscription</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(
                    subscriptions.filter(s => s.isActive).length > 0
                      ? calculateMonthlySpend() / subscriptions.filter(s => s.isActive).length
                      : 0
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Most expensive</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {subscriptions.length > 0
                    ? subscriptions.reduce((max, sub) => 
                        convertToINR(sub.amount, sub.currency) > convertToINR(max.amount, max.currency) ? sub : max
                      ).name
                    : '-'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Yearly subscriptions</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {subscriptions.filter(s => s.billingCycle === 'yearly').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total subscriptions</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {subscriptions.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Subscription Modal */}
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Add Subscription</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subscription Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Netflix Premium, ChatGPT Plus"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value, serviceName: ''})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  >
                    {Object.keys(SUBSCRIPTION_CATEGORIES).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Service (Optional)
                  </label>
                  <select
                    value={formData.serviceName}
                    onChange={(e) => setFormData({...formData, serviceName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  >
                    <option value="">Select service (optional)</option>
                    {SUBSCRIPTION_CATEGORIES[formData.category]?.services.map(service => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Debit Account
                  </label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => {
                      const account = accounts.find(acc => acc.id === e.target.value);
                      setFormData({
                        ...formData, 
                        accountId: e.target.value,
                        currency: account?.currency || 'INR'
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  >
                    <option value="">Select account</option>
                    {accounts.filter(acc => !acc.isDeleted).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </option>
                    ))}
                  </select>
                  {formData.accountId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Currency: {accounts.find(acc => acc.id === formData.accountId)?.currency}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Billing Cycle
                  </label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) => setFormData({...formData, billingCycle: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  >
                    {BILLING_CYCLES.map(cycle => (
                      <option key={cycle.value} value={cycle.value}>{cycle.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Next Billing Date
                </label>
                <input
                  type="date"
                  value={formData.nextBillingDate}
                  onChange={(e) => setFormData({...formData, nextBillingDate: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Add any notes about this subscription..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.autoRenew}
                      onChange={(e) => setFormData({...formData, autoRenew: e.target.checked})}
                      className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Auto-process on billing date</span>
                  </label>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300">
                      Notify before
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={formData.notifyBeforeDays}
                      onChange={(e) => setFormData({...formData, notifyBeforeDays: parseInt(e.target.value) || 0})}
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">days</span>
                  </div>
                </div>
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
                  onClick={handleAddSubscription}
                  disabled={loading || !formData.name || !formData.amount || !formData.accountId}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Add Subscription</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedSubscription && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
              setSelectedSubscription(null);
              resetForm();
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Edit Subscription</h2>
            
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Full Edit Mode</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    You can now edit all fields including amount, billing cycle, and account. 
                    This will not affect past transactions.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subscription Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Netflix Premium, ChatGPT Plus"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value, serviceName: ''})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  >
                    {Object.keys(SUBSCRIPTION_CATEGORIES).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Service (Optional)
                  </label>
                  <select
                    value={formData.serviceName}
                    onChange={(e) => setFormData({...formData, serviceName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  >
                    <option value="">Select service (optional)</option>
                    {SUBSCRIPTION_CATEGORIES[formData.category]?.services.map(service => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Debit Account
                  </label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => {
                      const account = accounts.find(acc => acc.id === e.target.value);
                      setFormData({
                        ...formData, 
                        accountId: e.target.value,
                        currency: account?.currency || formData.currency
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    required
                  >
                    <option value="">Select account</option>
                    {accounts.filter(acc => !acc.isDeleted).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Billing Cycle
                  </label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) => setFormData({...formData, billingCycle: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  >
                    {BILLING_CYCLES.map(cycle => (
                      <option key={cycle.value} value={cycle.value}>{cycle.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Next Billing Date
                </label>
                <input
                  type="date"
                  value={formData.nextBillingDate}
                  onChange={(e) => setFormData({...formData, nextBillingDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Add any notes about this subscription..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.autoRenew}
                      onChange={(e) => setFormData({...formData, autoRenew: e.target.checked})}
                      className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Auto-process on billing date</span>
                  </label>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300">
                      Notify before
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={formData.notifyBeforeDays}
                      onChange={(e) => setFormData({...formData, notifyBeforeDays: parseInt(e.target.value) || 0})}
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">days</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSubscription(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubscription}
                  disabled={loading || !formData.name || !formData.amount || !formData.accountId}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Update Subscription</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedSubscription && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false);
              setSelectedSubscription(null);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Subscription</h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong>"{selectedSubscription.name}"</strong>? This action cannot be undone.
            </p>
            
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This will stop tracking this subscription but won't affect any existing transactions.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSubscription(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubscription}
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
                    <span>Delete Subscription</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Subscription Modal */}
      {showProcessModal && selectedSubscription && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowProcessModal(false);
              setSelectedSubscription(null);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Process Subscription</h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Process <strong>"{selectedSubscription.name}"</strong> now? This will create an expense transaction and update your account balance.
            </p>
            
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(selectedSubscription.amount, selectedSubscription.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Account:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedSubscription.accountName}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Next billing:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {getNextBillingDate(selectedSubscription.nextBillingDate, selectedSubscription.billingCycle)}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowProcessModal(false);
                  setSelectedSubscription(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await processSubscription(selectedSubscription);
                  setShowProcessModal(false);
                  setSelectedSubscription(null);
                }}
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Process Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Button - Mobile Only */}
      <button
        onClick={() => setShowAddModal(true)}
        className="sm:hidden fixed bottom-6 right-6 w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg dark:shadow-2xl transition-all duration-300 flex items-center justify-center transform hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-3xl"
      >
        <Plus className="w-5 h-5" />
      </button>
      
      {/* Floating Add Button - Desktop Only */}
      <button
        onClick={() => setShowAddModal(true)}
        className="hidden sm:flex fixed bottom-6 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg dark:shadow-2xl transition-all duration-300 items-center justify-center group transform hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-3xl"
      >
        <Plus className="w-6 h-6" />
        <span className="absolute right-16 bg-gray-900 dark:bg-black text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg dark:shadow-2xl">
          Add Subscription
        </span>
      </button>
    </div>
  );
}

export default Subscriptions;