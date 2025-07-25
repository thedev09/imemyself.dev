import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Bell, Palette, Database, Download, Upload, 
  Trash2, AlertTriangle, Settings as SettingsIcon, Moon, Sun,
  Globe, Currency, Calculator, Eye, EyeOff, Lock, Smartphone,
  Mail, Calendar, BarChart, PieChart, TrendingUp, Clock,
  RefreshCw, Save, X, Check, ChevronRight, Info, HelpCircle,
  LogOut, CreditCard, Building, Bitcoin, Target, Zap,
  Filter, Search, Archive, Star, Bookmark, Tag, FileText,
  Cloud, Wifi, WifiOff, Monitor, Tablet, Phone, Edit2, Camera
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { 
  doc, updateDoc, collection, getDocs, writeBatch,
  query, orderBy, deleteDoc, addDoc
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

const USD_TO_INR = 84.0;

// Avatar generation utilities
const generateGravatarUrl = (email) => {
  const hash = btoa(email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=200`;
};

const generateInitialsAvatar = (name, colorIndex = 0) => {
  const colors = [
    { bg: 'from-orange-500 to-red-500', text: 'text-white' },
    { bg: 'from-blue-500 to-purple-500', text: 'text-white' },
    { bg: 'from-green-500 to-teal-500', text: 'text-white' },
    { bg: 'from-purple-500 to-pink-500', text: 'text-white' },
    { bg: 'from-yellow-500 to-orange-500', text: 'text-white' },
    { bg: 'from-indigo-500 to-blue-500', text: 'text-white' },
    { bg: 'from-pink-500 to-rose-500', text: 'text-white' },
    { bg: 'from-teal-500 to-cyan-500', text: 'text-white' }
  ];
  
  const initials = name?.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase() || 'U';
  const color = colors[colorIndex % colors.length];
  
  return { initials, color };
};

const predefinedAvatars = [
  { id: 'cat', emoji: '🐱', name: 'Cat' },
  { id: 'dog', emoji: '🐶', name: 'Dog' },
  { id: 'fox', emoji: '🦊', name: 'Fox' },
  { id: 'panda', emoji: '🐼', name: 'Panda' },
  { id: 'koala', emoji: '🐨', name: 'Koala' },
  { id: 'lion', emoji: '🦁', name: 'Lion' },
  { id: 'tiger', emoji: '🐯', name: 'Tiger' },
  { id: 'monkey', emoji: '🐵', name: 'Monkey' },
  { id: 'rabbit', emoji: '🐰', name: 'Rabbit' },
  { id: 'bear', emoji: '🐻', name: 'Bear' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn' },
  { id: 'dragon', emoji: '🐲', name: 'Dragon' },
  { id: 'robot', emoji: '🤖', name: 'Robot' },
  { id: 'alien', emoji: '👽', name: 'Alien' },
  { id: 'ghost', emoji: '👻', name: 'Ghost' },
  { id: 'wizard', emoji: '🧙‍♂️', name: 'Wizard' },
  { id: 'ninja', emoji: '🥷', name: 'Ninja' },
  { id: 'detective', emoji: '🕵️', name: 'Detective' },
  { id: 'astronaut', emoji: '👨‍🚀', name: 'Astronaut' },
  { id: 'artist', emoji: '🎨', name: 'Artist' },
  { id: 'musician', emoji: '🎵', name: 'Musician' },
  { id: 'chef', emoji: '👨‍🍳', name: 'Chef' },
  { id: 'scientist', emoji: '🧪', name: 'Scientist' },
  { id: 'developer', emoji: '💻', name: 'Developer' }
];

function Settings() {
  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');

  // User preferences state
  const [preferences, setPreferences] = useState({
    // Profile & Display
    displayName: '',
    email: '',
    avatarType: 'initials', // 'initials', 'gravatar', 'predefined'
    avatarData: { colorIndex: 0, emojiId: 'cat' }, // Store avatar customization
    
    // Privacy & Security
    hideBalances: false,
    requireAuthForView: false,
    sessionTimeout: 30, // minutes
    
    // Theme & Display
    theme: 'light',
    currency: 'INR',
    numberFormat: 'indian', // indian, international
    dateFormat: 'DD/MM/YYYY', // DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
    timeFormat: '12', // 12, 24
    
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    transactionAlerts: true,
    monthlyReports: true,
    budgetAlerts: true,
    
    // Financial Settings
    defaultAccount: '',
    defaultPaymentMode: '',
    autoCategories: true,
    roundTransactions: false,
    
    // Analytics
    analyticsTimeframe: 'monthly',
    favoriteCharts: ['netWorth', 'categories', 'trends'],
    showComparisons: true,
    
    // Data & Backup
    autoBackup: true,
    backupFrequency: 'weekly',
    dataRetention: '2years',
    
    // Advanced
    developerMode: false,
    betaFeatures: false,
    analytics: true
  });

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAccounts: 0,
    oldestTransaction: null,
    dataSize: '0 KB'
  });

  useEffect(() => {
    loadUserData();
    loadUserPreferences();
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser) return;
    
    try {
      // Load accounts
      const accountsQuery = query(
        collection(db, 'users', currentUser.uid, 'accounts'),
        orderBy('createdAt', 'desc')
      );
      const accountsSnapshot = await getDocs(accountsQuery);
      const accountsData = accountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAccounts(accountsData);

      // Load transactions for stats
      const transactionsQuery = query(
        collection(db, 'users', currentUser.uid, 'transactions'),
        orderBy('date', 'desc')
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(transactionsData);

      // Calculate stats
      const oldestTransaction = transactionsData.length > 0 
        ? new Date(transactionsData[transactionsData.length - 1].date)
        : null;
      
      const dataSize = Math.round((JSON.stringify(accountsData) + JSON.stringify(transactionsData)).length / 1024);
      
      setStats({
        totalTransactions: transactionsData.length,
        totalAccounts: accountsData.filter(acc => !acc.isDeleted).length,
        oldestTransaction,
        dataSize: dataSize > 1024 ? `${(dataSize/1024).toFixed(1)} MB` : `${dataSize} KB`
      });

    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadUserPreferences = () => {
    const saved = localStorage.getItem(`pesa_preferences_${currentUser?.uid}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
    
    // Set initial values from Firebase Auth
    if (currentUser) {
      setPreferences(prev => ({
        ...prev,
        displayName: currentUser.displayName || '',
        email: currentUser.email || ''
      }));
      setNewDisplayName(currentUser.displayName || '');
    }
  };

  const savePreferences = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setSaveStatus('saving');
      
      // Save to localStorage
      localStorage.setItem(`pesa_preferences_${currentUser.uid}`, JSON.stringify(preferences));
      
      // Apply theme immediately
      if (preferences.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', preferences.theme);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 2000);
    } finally {
      setLoading(false);
    }
  };

  const updateDisplayName = async () => {
    if (!currentUser || !newDisplayName.trim()) return;
    
    try {
      setLoading(true);
      setSaveStatus('saving');
      
      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: newDisplayName.trim()
      });
      
      // Update local preferences
      setPreferences(prev => ({
        ...prev,
        displayName: newDisplayName.trim()
      }));
      
      setEditingName(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error updating display name:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 2000);
    } finally {
      setLoading(false);
    }
  };

  const renderAvatar = (size = 'w-20 h-20', textSize = 'text-2xl') => {
    const { avatarType, avatarData } = preferences;
    
    switch (avatarType) {
      case 'gravatar':
        return (
          <img
            src={generateGravatarUrl(preferences.email)}
            alt="Profile"
            className={`${size} rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-lg`}
            onError={(e) => {
              // Fallback to initials if Gravatar fails
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        );
      
      case 'predefined':
        const selectedEmoji = predefinedAvatars.find(a => a.id === avatarData.emojiId) || predefinedAvatars[0];
        return (
          <div className={`${size} rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-lg ${textSize}`}>
            {selectedEmoji.emoji}
          </div>
        );
      
      case 'initials':
      default:
        const { initials, color } = generateInitialsAvatar(preferences.displayName, avatarData.colorIndex);
        return (
          <div className={`${size} rounded-full bg-gradient-to-br ${color.bg} flex items-center justify-center ${color.text} font-bold ${textSize} border-2 border-white dark:border-gray-700 shadow-lg`}>
            {initials}
          </div>
        );
    }
  };

  const exportData = async (format) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          userId: currentUser.uid,
          version: '2.0',
          format: format
        },
        accounts: accounts.filter(acc => !acc.isDeleted),
        transactions: transactions,
        preferences: preferences
      };

      const dataStr = format === 'json' 
        ? JSON.stringify(exportData, null, 2)
        : convertToCSV(exportData);
      
      const dataBlob = new Blob([dataStr], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pesa_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const convertToCSV = (data) => {
    const csvData = [];
    
    // Add accounts
    csvData.push('ACCOUNTS');
    csvData.push('Name,Type,Currency,Balance,Created');
    data.accounts.forEach(account => {
      csvData.push(`"${account.name}","${account.type}","${account.currency}",${account.balance},"${account.createdAt}"`);
    });
    
    csvData.push('');
    
    // Add transactions
    csvData.push('TRANSACTIONS');
    csvData.push('Date,Type,Amount,Currency,Account,Category,Payment Mode,Notes');
    data.transactions.forEach(transaction => {
      csvData.push(`"${transaction.date}","${transaction.type}",${transaction.amount},"${transaction.currency}","${transaction.accountName}","${transaction.category || ''}","${transaction.paymentMode || ''}","${transaction.notes || ''}"`);
    });
    
    return csvData.join('\n');
  };

  const deleteAllData = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const batch = writeBatch(db);
      
      // Delete all transactions
      transactions.forEach(transaction => {
        const docRef = doc(db, 'users', currentUser.uid, 'transactions', transaction.id);
        batch.delete(docRef);
      });
      
      // Delete all accounts
      accounts.forEach(account => {
        const docRef = doc(db, 'users', currentUser.uid, 'accounts', account.id);
        batch.delete(docRef);
      });
      
      await batch.commit();
      
      // Clear local preferences
      localStorage.removeItem(`pesa_preferences_${currentUser.uid}`);
      
      // Reload data
      await loadUserData();
      setShowDeleteConfirm(false);
      
      alert('All data deleted successfully.');
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Error deleting data. Please try again.');
    } finally {
      setLoading(false);
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'display', label: 'Display & Theme', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'financial', label: 'Financial', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { id: 'data', label: 'Data & Backup', icon: Database },
    { id: 'advanced', label: 'Advanced', icon: SettingsIcon }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                {renderAvatar()}
                <button
                  onClick={() => setShowAvatarModal(true)}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-300"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1">
                {editingName ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="text-xl font-semibold bg-transparent border-b-2 border-orange-500 focus:outline-none text-gray-900 dark:text-white"
                      placeholder="Enter your name"
                      autoFocus
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={updateDisplayName}
                        disabled={loading || !newDisplayName.trim()}
                        className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingName(false);
                          setNewDisplayName(preferences.displayName);
                        }}
                        className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {preferences.displayName || 'User'}
                      </h3>
                      <button
                        onClick={() => setEditingName(true)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-300"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{currentUser?.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Member since {new Date(currentUser?.metadata.creationTime).toLocaleDateString()}
                    </p>
                  </div>
                )}

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Choose Your Avatar</h2>
              <button 
                onClick={() => setShowAvatarModal(false)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Current Avatar Preview */}
              <div className="text-center">
                <div className="inline-block">
                  {renderAvatar('w-24 h-24', 'text-3xl')}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Current Avatar</p>
              </div>

              {/* Avatar Type Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Avatar Type</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setPreferences(prev => ({ ...prev, avatarType: 'initials' }))}
                    className={`p-4 border-2 rounded-lg transition-all duration-300 ${
                      preferences.avatarType === 'initials' 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">
                      {generateInitialsAvatar(preferences.displayName).initials}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Initials</span>
                  </button>

                  <button
                    onClick={() => setPreferences(prev => ({ ...prev, avatarType: 'gravatar' }))}
                    className={`p-4 border-2 rounded-lg transition-all duration-300 ${
                      preferences.avatarType === 'gravatar' 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <img
                      src={generateGravatarUrl(preferences.email)}
                      alt="Gravatar"
                      className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Gravatar</span>
                  </button>

                  <button
                    onClick={() => setPreferences(prev => ({ ...prev, avatarType: 'predefined' }))}
                    className={`p-4 border-2 rounded-lg transition-all duration-300 ${
                      preferences.avatarType === 'predefined' 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-2xl mx-auto mb-2">
                      {predefinedAvatars.find(a => a.id === preferences.avatarData.emojiId)?.emoji || '🐱'}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Characters</span>
                  </button>
                </div>
              </div>

              {/* Initials Color Picker */}
              {preferences.avatarType === 'initials' && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Color Theme</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 8 }, (_, i) => {
                      const { color } = generateInitialsAvatar(preferences.displayName, i);
                      return (
                        <button
                          key={i}
                          onClick={() => setPreferences(prev => ({
                            ...prev,
                            avatarData: { ...prev.avatarData, colorIndex: i }
                          }))}
                          className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${color.bg} flex items-center justify-center text-white font-bold text-lg border-4 transition-all duration-300 ${
                            preferences.avatarData.colorIndex === i 
                              ? 'border-orange-500 scale-110' 
                              : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                          }`}
                        >
                          {generateInitialsAvatar(preferences.displayName).initials}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Predefined Avatar Picker */}
              {preferences.avatarType === 'predefined' && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Choose Character</h4>
                  <div className="grid grid-cols-6 gap-3 max-h-60 overflow-y-auto">
                    {predefinedAvatars.map(avatar => (
                      <button
                        key={avatar.id}
                        onClick={() => setPreferences(prev => ({
                          ...prev,
                          avatarData: { ...prev.avatarData, emojiId: avatar.id }
                        }))}
                        className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-2xl border-4 transition-all duration-300 hover:scale-105 ${
                          preferences.avatarData.emojiId === avatar.id 
                            ? 'border-orange-500 scale-110' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        title={avatar.name}
                      >
                        {avatar.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Gravatar Info */}
              {preferences.avatarType === 'gravatar' && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">About Gravatar</h4>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        Gravatar uses your email to fetch your globally recognized avatar. If you don't have a Gravatar account, a default pattern will be shown.
                      </p>
                      <a 
                        href="https://gravatar.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                      >
                        Set up your Gravatar →
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    savePreferences();
                    setShowAvatarModal(false);
                  }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Avatar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Account Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Accounts</span>
                    <span className="font-medium text-gray-900 dark:text-white">{stats.totalAccounts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Transactions</span>
                    <span className="font-medium text-gray-900 dark:text-white">{stats.totalTransactions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Data Size</span>
                    <span className="font-medium text-gray-900 dark:text-white">{stats.dataSize}</span>
                  </div>
                  {stats.oldestTransaction && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Using since</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {stats.oldestTransaction.toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="w-full text-left px-3 py-2 text-sm bg-white dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-300 flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Export Data</span>
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="w-full text-left px-3 py-2 text-sm bg-white dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-300 flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span>Import Data</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm bg-white dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-300 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Your Privacy Matters</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-400">All your financial data is encrypted and stored securely. We never share your data with third parties.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Hide Balance Amounts</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Show ••••••• instead of actual amounts</p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, hideBalances: !prev.hideBalances }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                    preferences.hideBalances ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    preferences.hideBalances ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Require Authentication for View</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Require login confirmation before showing data</p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, requireAuthForView: !prev.requireAuthForView }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                    preferences.requireAuthForView ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    preferences.requireAuthForView ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Session Timeout</label>
                <select
                  value={preferences.sessionTimeout}
                  onChange={(e) => setPreferences(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={240}>4 hours</option>
                  <option value={480}>8 hours</option>
                  <option value={1440}>24 hours</option>
                </select>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Automatically log out after inactivity</p>
              </div>
            </div>
          </div>
        );

      case 'display':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">Theme</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'light', label: 'Light', icon: Sun, desc: 'Clean and bright interface' },
                  { value: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes, perfect for night use' }
                ].map(theme => (
                  <button
                    key={theme.value}
                    onClick={() => setPreferences(prev => ({ ...prev, theme: theme.value }))}
                    className={`p-4 border-2 rounded-lg transition-all duration-300 ${
                      preferences.theme === theme.value 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <theme.icon className={`w-5 h-5 ${
                        preferences.theme === theme.value ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'
                      }`} />
                      <span className={`font-medium ${
                        preferences.theme === theme.value ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-white'
                      }`}>
                        {theme.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-left">{theme.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Default Currency</label>
                <select
                  value={preferences.currency}
                  onChange={(e) => setPreferences(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                >
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Number Format</label>
                <select
                  value={preferences.numberFormat}
                  onChange={(e) => setPreferences(prev => ({ ...prev, numberFormat: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                >
                  <option value="indian">Indian (1,23,456)</option>
                  <option value="international">International (123,456)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Date Format</label>
                <select
                  value={preferences.dateFormat}
                  onChange={(e) => setPreferences(prev => ({ ...prev, dateFormat: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Time Format</label>
                <select
                  value={preferences.timeFormat}
                  onChange={(e) => setPreferences(prev => ({ ...prev, timeFormat: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                >
                  <option value="12">12 Hour (3:30 PM)</option>
                  <option value="24">24 Hour (15:30)</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Bell className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">Stay Informed</h3>
                  <p className="text-xs text-green-700 dark:text-green-400">Get notified about important financial events and updates.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser notifications for important updates' },
                { key: 'transactionAlerts', label: 'Transaction Alerts', desc: 'Notify when transactions are added' },
                { key: 'monthlyReports', label: 'Monthly Reports', desc: 'Monthly summary of your finances' },
                { key: 'budgetAlerts', label: 'Budget Alerts', desc: 'Alerts when approaching spending limits' }
              ].map(notification => (
                <div key={notification.key} className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{notification.label}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{notification.desc}</p>
                  </div>
                  <button
                    onClick={() => setPreferences(prev => ({ 
                      ...prev, 
                      [notification.key]: !prev[notification.key] 
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                      preferences[notification.key] ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                      preferences[notification.key] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'financial':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Default Account</label>
                <select
                  value={preferences.defaultAccount}
                  onChange={(e) => setPreferences(prev => ({ ...prev, defaultAccount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                >
                  <option value="">Select default account</option>
                  {accounts.filter(acc => !acc.isDeleted).map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Pre-selected when adding transactions</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Default Payment Mode</label>
                <select
                  value={preferences.defaultPaymentMode}
                  onChange={(e) => setPreferences(prev => ({ ...prev, defaultPaymentMode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                >
                  <option value="">Select default payment mode</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Auto-categorize Transactions</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Automatically suggest categories based on transaction patterns</p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, autoCategories: !prev.autoCategories }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                    preferences.autoCategories ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    preferences.autoCategories ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Round Transaction Amounts</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Round amounts to nearest whole number for cleaner display</p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, roundTransactions: !prev.roundTransactions }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                    preferences.roundTransactions ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    preferences.roundTransactions ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Exchange Rate Info</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Current USD to INR Rate</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹{USD_TO_INR}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Fixed rate used for conversions. All USD amounts are converted at this rate.</p>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">Default Analytics Timeframe</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'yearly', label: 'Yearly' }
                ].map(timeframe => (
                  <button
                    key={timeframe.value}
                    onClick={() => setPreferences(prev => ({ ...prev, analyticsTimeframe: timeframe.value }))}
                    className={`p-3 border-2 rounded-lg transition-all duration-300 ${
                      preferences.analyticsTimeframe === timeframe.value 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-white'
                    }`}
                  >
                    <span className="font-medium">{timeframe.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">Favorite Charts</label>
              <div className="space-y-2">
                {[
                  { value: 'netWorth', label: 'Net Worth Trend', icon: TrendingUp },
                  { value: 'categories', label: 'Category Breakdown', icon: PieChart },
                  { value: 'trends', label: 'Income vs Expense', icon: BarChart },
                  { value: 'accounts', label: 'Account Distribution', icon: Building }
                ].map(chart => (
                  <label key={chart.value} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors duration-300">
                    <input
                      type="checkbox"
                      checked={preferences.favoriteCharts.includes(chart.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPreferences(prev => ({ 
                            ...prev, 
                            favoriteCharts: [...prev.favoriteCharts, chart.value] 
                          }));
                        } else {
                          setPreferences(prev => ({ 
                            ...prev, 
                            favoriteCharts: prev.favoriteCharts.filter(c => c !== chart.value) 
                          }));
                        }
                      }}
                      className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <chart.icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm text-gray-900 dark:text-white">{chart.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Show Comparisons</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Compare current period with previous periods</p>
              </div>
              <button
                onClick={() => setPreferences(prev => ({ ...prev, showComparisons: !prev.showComparisons }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                  preferences.showComparisons ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                  preferences.showComparisons ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Database className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Data Management</h3>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">Backup your data regularly to prevent loss. Export data to keep local copies.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Auto Backup</label>
                <select
                  value={preferences.backupFrequency}
                  onChange={(e) => setPreferences(prev => ({ ...prev, backupFrequency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                >
                  <option value="disabled">Disabled</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Data Retention</label>
                <select
                  value={preferences.dataRetention}
                  onChange={(e) => setPreferences(prev => ({ ...prev, dataRetention: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                >
                  <option value="1year">1 Year</option>
                  <option value="2years">2 Years</option>
                  <option value="5years">5 Years</option>
                  <option value="forever">Forever</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowExportModal(true)}
                className="w-full p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors duration-300 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div className="text-left">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Export Data</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Download all your data as JSON or CSV</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="w-full p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors duration-300 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="text-left">
                    <h4 className="text-sm font-medium text-green-900 dark:text-green-100">Import Data</h4>
                    <p className="text-xs text-green-700 dark:text-green-300">Import transactions from bank statements</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-green-600 dark:text-green-400" />
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors duration-300 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div className="text-left">
                    <h4 className="text-sm font-medium text-red-900 dark:text-red-100">Delete All Data</h4>
                    <p className="text-xs text-red-700 dark:text-red-300">Permanently delete all accounts and transactions</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
            </div>
          </div>
        );

      case 'advanced':
        return (
          <div className="space-y-6">
            <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <SettingsIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">Advanced Settings</h3>
                  <p className="text-xs text-purple-700 dark:text-purple-400">These settings are for advanced users and developers. Change only if you know what you're doing.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Developer Mode</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Enable debug console and additional developer tools</p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, developerMode: !prev.developerMode }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                    preferences.developerMode ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    preferences.developerMode ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Beta Features</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Access experimental features (may be unstable)</p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, betaFeatures: !prev.betaFeatures }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                    preferences.betaFeatures ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    preferences.betaFeatures ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Usage Analytics</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Help improve Pesa by sharing anonymous usage data</p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, analytics: !prev.analytics }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                    preferences.analytics ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    preferences.analytics ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Application Info</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Version</span>
                  <span className="font-medium text-gray-900 dark:text-white">2.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Build</span>
                  <span className="font-medium text-gray-900 dark:text-white">#{new Date().getTime().toString().slice(-6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Environment</span>
                  <span className="font-medium text-gray-900 dark:text-white">Production</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in relative min-h-screen transition-all duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
            Customize your Pesa experience
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {saveStatus && (
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${
              saveStatus === 'saving' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
              saveStatus === 'saved' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' :
              'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
            }`}>
              {saveStatus === 'saving' && <RefreshCw className="w-4 h-4 animate-spin" />}
              {saveStatus === 'saved' && <Check className="w-4 h-4" />}
              {saveStatus === 'error' && <X className="w-4 h-4" />}
              <span>
                {saveStatus === 'saving' ? 'Saving...' :
                 saveStatus === 'saved' ? 'Saved!' :
                 'Error saving'}
              </span>
            </div>
          )}
          
          <button
            onClick={savePreferences}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md dark:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-white/5 rounded-2xl p-4 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300 sticky top-6">
            <nav className="space-y-1">
              {tabs.map(tab => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg flex items-center space-x-3 transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-lg dark:shadow-2xl transition-all duration-300">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Export Data</h2>
              <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Export your financial data for backup or analysis purposes.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => exportData('json')}
                disabled={loading}
                className="w-full p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors duration-300 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div className="text-left">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">JSON Format</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Complete data with all metadata</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </button>

              <button
                onClick={() => exportData('csv')}
                disabled={loading}
                className="w-full p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors duration-300 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3">
                  <BarChart className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="text-left">
                    <h4 className="text-sm font-medium text-green-900 dark:text-green-100">CSV Format</h4>
                    <p className="text-xs text-green-700 dark:text-green-300">For spreadsheet applications</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Data</h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Coming Soon</h3>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">Import functionality will be available in the next update. You'll be able to import bank statements and CSV files.</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowImportModal(false)}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete All Data</h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This action will permanently delete all your accounts, transactions, and preferences. This cannot be undone.
            </p>
            
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">What will be deleted:</h4>
              <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                <li>• {stats.totalAccounts} accounts</li>
                <li>• {stats.totalTransactions.toLocaleString()} transactions</li>
                <li>• All preferences and settings</li>
                <li>• All analytics data</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
              >
                Cancel
              </button>
              <button
                onClick={deleteAllData}
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
                    <span>Delete All Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;