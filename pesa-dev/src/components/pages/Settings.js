import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Moon, Sun, Save, X, Check, LogOut, Edit2, Camera,
  RefreshCw, Download, Upload, Trash2, AlertTriangle, Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { 
  doc, updateDoc, collection, getDocs, writeBatch,
  query, orderBy, deleteDoc, addDoc, getDoc, setDoc
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

// Avatar generation utilities
const getProfilePictureUrl = (user) => {
  // Check if user signed in with Google (has photoURL)
  if (user?.photoURL) {
    return user.photoURL;
  }
  
  // For email/password users, return null to use initials by default
  return null;
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
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [profilePictureFallback, setProfilePictureFallback] = useState(false);

  // User preferences state
  const [preferences, setPreferences] = useState({
    // Profile & Display
    displayName: '',
    email: '',
    avatarType: 'initials', // 'initials', 'profile', 'predefined'
    avatarData: { colorIndex: 0, emojiId: 'cat' }, // Store avatar customization
    
    // Theme & Display
    theme: 'light',
    currency: 'INR'
  });

  // Original preferences to track changes
  const [originalPreferences, setOriginalPreferences] = useState({
    // Profile & Display
    displayName: '',
    email: '',
    avatarType: 'initials', // 'initials', 'profile', 'predefined'
    avatarData: { colorIndex: 0, emojiId: 'cat' }, // Store avatar customization
    
    // Theme & Display
    theme: 'light',
    currency: 'INR'
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
    // Reset profile picture fallback when user changes
    setProfilePictureFallback(false);
  }, [currentUser]);

  // Reset fallback when avatar type changes
  useEffect(() => {
    setProfilePictureFallback(false);
  }, [preferences.avatarType]);

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

  const loadUserPreferences = async () => {
    if (!currentUser) return;
    
    try {
      // Try to load from Firestore first
      const prefsDoc = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
      const prefsSnapshot = await getDoc(prefsDoc);
      
      if (prefsSnapshot.exists()) {
        const firestorePrefs = prefsSnapshot.data();
        const updatedPrefs = { 
          displayName: currentUser.displayName || '',
          email: currentUser.email || '',
          avatarType: firestorePrefs.avatarType || 'initials',
          avatarData: firestorePrefs.avatarData || { colorIndex: 0, emojiId: 'cat' },
          theme: firestorePrefs.theme || 'light',
          currency: firestorePrefs.currency || 'INR'
        };
        setPreferences(updatedPrefs);
        setOriginalPreferences(updatedPrefs);
      } else {
        // Set initial values from Firebase Auth
        const initialPrefs = {
          displayName: currentUser.displayName || '',
          email: currentUser.email || '',
          avatarType: 'initials',
          avatarData: { colorIndex: 0, emojiId: 'cat' },
          theme: 'light',
          currency: 'INR'
        };
        setPreferences(initialPrefs);
        setOriginalPreferences(initialPrefs);
      }
      
      setNewDisplayName(currentUser.displayName || '');
    } catch (error) {
      console.error('Error loading preferences:', error);
      
      // Set initial values from Firebase Auth
      if (currentUser) {
        const initialPrefs = {
          displayName: currentUser.displayName || '',
          email: currentUser.email || '',
          avatarType: 'initials',
          avatarData: { colorIndex: 0, emojiId: 'cat' },
          theme: 'light',
          currency: 'INR'
        };
        setPreferences(initialPrefs);
        setOriginalPreferences(initialPrefs);
        setNewDisplayName(currentUser.displayName || '');
      }
    }
  };

  const savePreferences = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setSaveStatus('saving');
      
      // Save to Firestore
      const prefsDoc = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
      await setDoc(prefsDoc, {
        ...preferences,
        updatedAt: new Date().toISOString()
      });
      
      // Keep theme in localStorage for immediate application
      localStorage.setItem('theme', preferences.theme);
      
      // Apply theme immediately
      if (preferences.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Update original preferences after successful save
      setOriginalPreferences(preferences);
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
      case 'profile':
        const profileUrl = getProfilePictureUrl(currentUser);
        if (profileUrl && !profilePictureFallback) {
          return (
            <img
              src={profileUrl}
              alt="Profile"
              className={`${size} rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-lg`}
              onError={() => setProfilePictureFallback(true)}
            />
          );
        } else {
          // Fallback to initials for failed profile pictures or email/password users
          const { initials, color } = generateInitialsAvatar(preferences.displayName, avatarData.colorIndex);
          return (
            <div className={`${size} rounded-full bg-gradient-to-br ${color.bg} flex items-center justify-center ${color.text} font-bold ${textSize} border-2 border-white dark:border-gray-700 shadow-lg`}>
              {initials}
            </div>
          );
        }
      
      case 'predefined':
        const selectedEmoji = predefinedAvatars.find(a => a.id === avatarData.emojiId) || predefinedAvatars[0];
        // Calculate larger emoji size based on container size
        const emojiSize = size.includes('w-8') ? 'text-xl' : 
                         size.includes('w-12') ? 'text-2xl' : 
                         size.includes('w-16') ? 'text-3xl' : 
                         size.includes('w-20') ? 'text-4xl' : 
                         size.includes('w-24') ? 'text-5xl' : 'text-4xl';
        return (
          <div className={`${size} rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-lg ${emojiSize}`}>
            <span className="leading-none">{selectedEmoji.emoji}</span>
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
      
      // Clear preferences from Firestore
      const prefsDoc = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
      try {
        await deleteDoc(prefsDoc);
      } catch (prefError) {
        console.error('Error deleting preferences:', prefError);
      }
      
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

  // Check if there are unsaved changes
  const hasChanges = () => {
    // Deep comparison of preferences
    if (!originalPreferences || !preferences) return false;
    
    return (
      preferences.avatarType !== originalPreferences.avatarType ||
      preferences.theme !== originalPreferences.theme ||
      preferences.currency !== originalPreferences.currency ||
      preferences.avatarData.colorIndex !== originalPreferences.avatarData.colorIndex ||
      preferences.avatarData.emojiId !== originalPreferences.avatarData.emojiId
    );
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
    { id: 'display', label: 'Display & Theme', icon: Shield },
    { id: 'data', label: 'Data Management', icon: Download }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Profile Header - More Compact */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-500/10 dark:to-red-500/10 rounded-xl p-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  {renderAvatar('w-16 h-16', 'text-xl')}
                  <button
                    onClick={() => setShowAvatarModal(true)}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-300"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1">
                  {editingName ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        className="text-lg font-semibold bg-transparent border-b-2 border-orange-500 focus:outline-none text-gray-900 dark:text-white"
                        placeholder="Enter your name"
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={updateDisplayName}
                          disabled={loading || !newDisplayName.trim()}
                          className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingName(false);
                            setNewDisplayName(preferences.displayName);
                          }}
                          className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {preferences.displayName || 'User'}
                        </h3>
                        <button
                          onClick={() => setEditingName(true)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-300"
                        >
                          <Edit2 className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{currentUser?.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Member since {new Date(currentUser?.metadata.creationTime).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats and Actions - Horizontal Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Account Statistics */}
              <div className="lg:col-span-2 bg-gray-50 dark:bg-white/5 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-sm">Account Overview</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.totalAccounts}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Accounts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalTransactions.toLocaleString()}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Transactions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">{stats.dataSize}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Data Size</div>
                  </div>
                  {stats.oldestTransaction && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                        {Math.floor((new Date() - stats.oldestTransaction) / (1000 * 60 * 60 * 24))}d
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs">Days Active</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-sm">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="w-full px-3 py-2 text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors duration-300 flex items-center space-x-2"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export Data</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-xs bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-500/30 transition-colors duration-300 flex items-center space-x-2"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'display':
        return (
          <div className="space-y-6">
            {/* Theme Selection */}
            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { value: 'light', label: 'Light', icon: Sun, desc: 'Clean and bright interface' },
                  { value: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes, perfect for night use' }
                ].map(theme => (
                  <button
                    key={theme.value}
                    onClick={() => setPreferences(prev => ({ ...prev, theme: theme.value }))}
                    className={`p-4 border-2 rounded-xl transition-all duration-300 ${
                      preferences.theme === theme.value 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 shadow-md' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-400 bg-white dark:bg-white/5'
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

            {/* Currency Settings */}
            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Currency</h3>
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Currency</label>
                <select
                  value={preferences.currency}
                  onChange={(e) => setPreferences(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-300"
                >
                  <option value="INR">🇮🇳 Indian Rupee (₹)</option>
                  <option value="USD">🇺🇸 US Dollar ($)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used for displaying amounts throughout the app</p>
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Data Management</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-400">Export your data for backup or permanently delete all data. Handle your financial information securely.</p>
                </div>
              </div>
            </div>

            {/* Data Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setShowExportModal(true)}
                className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-xl hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-500/20 dark:hover:to-blue-500/30 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 dark:bg-blue-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Export Data</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Backup your financial data</p>
                  </div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 text-left">Download all your accounts, transactions, and settings as JSON or CSV files for backup or migration purposes.</p>
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-500/10 dark:to-red-500/20 border border-red-200 dark:border-red-500/20 rounded-xl hover:from-red-100 hover:to-red-200 dark:hover:from-red-500/20 dark:hover:to-red-500/30 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-red-500 dark:bg-red-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Trash2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-semibold text-red-900 dark:text-red-100">Delete All Data</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">Permanently remove everything</p>
                  </div>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 text-left">Permanently delete all accounts, transactions, and settings. This action cannot be undone.</p>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Compact Header with Inline Actions */}
      <div className="bg-white dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-lg dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
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
            
            {hasChanges() && (
              <button
                onClick={savePreferences}
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content - More Compact */}
      <div className="bg-white dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-lg dark:shadow-2xl">
        {renderTabContent()}
      </div>

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
                    onClick={() => setPreferences(prev => ({ ...prev, avatarType: 'profile' }))}
                    className={`p-4 border-2 rounded-lg transition-all duration-300 ${
                      preferences.avatarType === 'profile' 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    } ${!getProfilePictureUrl(currentUser) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!getProfilePictureUrl(currentUser)}
                  >
                    {getProfilePictureUrl(currentUser) ? (
                      <img
                        src={getProfilePictureUrl(currentUser)}
                        alt="Profile Picture"
                        className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-gray-600 text-lg font-bold mx-auto mb-2">
                        ?
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {getProfilePictureUrl(currentUser) ? 'Profile Picture' : 'Profile Picture (Google Only)'}
                    </span>
                  </button>

                  <button
                    onClick={() => setPreferences(prev => ({ ...prev, avatarType: 'predefined' }))}
                    className={`p-4 border-2 rounded-lg transition-all duration-300 ${
                      preferences.avatarType === 'predefined' 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-3xl mx-auto mb-2">
                      <span className="leading-none">{predefinedAvatars.find(a => a.id === preferences.avatarData.emojiId)?.emoji || '🐱'}</span>
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
                        className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-3xl border-4 transition-all duration-300 hover:scale-105 ${
                          preferences.avatarData.emojiId === avatar.id 
                            ? 'border-orange-500 scale-110' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        title={avatar.name}
                      >
                        <span className="leading-none">{avatar.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Profile Picture Info */}
              {preferences.avatarType === 'profile' && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">About Profile Pictures</h4>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        {getProfilePictureUrl(currentUser) 
                          ? 'Using your Google account profile picture. If it fails to load, your initials will be shown as fallback.'
                          : 'Profile pictures are only available when signed in with Google. For email/password accounts, initials will be used instead.'}
                      </p>
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
                  onClick={async () => {
                    await savePreferences();
                    setShowAvatarModal(false);
                    // Trigger navigation bar update
                    window.dispatchEvent(new CustomEvent('avatarUpdate'));
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
                  <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div className="text-left">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">JSON Format</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Complete data with all metadata</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => exportData('csv')}
                disabled={loading}
                className="w-full p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors duration-300 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3">
                  <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="text-left">
                    <h4 className="text-sm font-medium text-green-900 dark:text-green-100">CSV Format</h4>
                    <p className="text-xs text-green-700 dark:text-green-300">For spreadsheet applications</p>
                  </div>
                </div>
              </button>
            </div>
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