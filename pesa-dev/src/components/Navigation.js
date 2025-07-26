import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, CreditCard, TrendingUp, Wallet, Activity, RefreshCw,
  Settings, Sun, Moon, ChevronDown, LogOut, BarChart, Menu, X
} from 'lucide-react';
import Logo from './Logo'; // Import your custom logo component
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Avatar generation utilities (shared with Settings)
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

function Navigation({ theme, toggleTheme }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const [preferences, setPreferences] = React.useState({
    avatarType: 'initials',
    avatarData: { colorIndex: 0, emojiId: 'cat' },
    displayName: '',
    email: ''
  });
  const [profilePictureFallback, setProfilePictureFallback] = React.useState(false);

  const navItems = [
    { id: 'overview', path: '/', label: 'Overview', icon: Home },
    { id: 'accounts', path: '/accounts', label: 'Accounts', icon: Wallet },
    { id: 'transactions', path: '/transactions', label: 'Transactions', icon: CreditCard },
    { id: 'analytics', path: '/analytics', label: 'Analytics', icon: BarChart },
    { id: 'subscriptions', path: '/subscriptions', label: 'Subscriptions', icon: RefreshCw },
    { id: 'settings', path: '/settings', label: 'Settings', icon: Settings }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getUserDisplayName = () => {
    if (!currentUser?.displayName) return 'User';
    return currentUser.displayName;
  };

  // Load user preferences for avatar
  const loadPreferences = React.useCallback(async () => {
    if (!currentUser) return;
    
    try {
      // Try to load from Firestore first
      const prefsDoc = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
      const prefsSnapshot = await getDoc(prefsDoc);
      
      if (prefsSnapshot.exists()) {
        const firestorePrefs = prefsSnapshot.data();
        setPreferences(prev => ({ 
          ...prev, 
          ...firestorePrefs,
          displayName: currentUser.displayName || '',
          email: currentUser.email || ''
        }));
      } else {
        // Fallback to localStorage for compatibility
        const saved = localStorage.getItem(`pesa_preferences_${currentUser.uid}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setPreferences(prev => ({ 
              ...prev, 
              ...parsed,
              displayName: currentUser.displayName || '',
              email: currentUser.email || ''
            }));
          } catch (error) {
            console.error('Error loading preferences from localStorage:', error);
          }
        } else {
          // Set default values
          setPreferences(prev => ({
            ...prev,
            displayName: currentUser.displayName || '',
            email: currentUser.email || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error loading preferences from Firestore:', error);
      
      // Fallback to localStorage if Firestore fails
      const saved = localStorage.getItem(`pesa_preferences_${currentUser.uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPreferences(prev => ({ 
            ...prev, 
            ...parsed,
            displayName: currentUser.displayName || '',
            email: currentUser.email || ''
          }));
        } catch (parseError) {
          console.error('Error parsing localStorage preferences:', parseError);
        }
      } else {
        // Set default values
        setPreferences(prev => ({
          ...prev,
          displayName: currentUser.displayName || '',
          email: currentUser.email || ''
        }));
      }
    }
  }, [currentUser]);

  React.useEffect(() => {
    loadPreferences();
    // Reset profile picture fallback when user changes
    setProfilePictureFallback(false);
  }, [loadPreferences]);

  // Reset fallback when avatar type changes
  React.useEffect(() => {
    setProfilePictureFallback(false);
  }, [preferences.avatarType]);

  // Listen for avatar updates from Settings
  React.useEffect(() => {
    const handleAvatarUpdate = () => {
      loadPreferences();
    };

    window.addEventListener('avatarUpdate', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdate', handleAvatarUpdate);
  }, [loadPreferences]);

  const renderAvatar = (size = 'w-8 h-8', textSize = 'text-sm') => {
    const { avatarType, avatarData } = preferences;
    
    switch (avatarType) {
      case 'profile':
        const profileUrl = getProfilePictureUrl(currentUser);
        if (profileUrl && !profilePictureFallback) {
          return (
            <img
              src={profileUrl}
              alt="Profile"
              className={`${size} rounded-full object-cover`}
              onError={() => setProfilePictureFallback(true)}
            />
          );
        } else {
          // Fallback to initials for failed profile pictures or email/password users
          const { initials, color } = generateInitialsAvatar(preferences.displayName || getUserDisplayName(), avatarData.colorIndex);
          return (
            <div className={`${size} rounded-full bg-gradient-to-br ${color.bg} flex items-center justify-center ${color.text} font-medium ${textSize}`}>
              {initials}
            </div>
          );
        }
      
      case 'predefined':
        const selectedEmoji = predefinedAvatars.find(a => a.id === avatarData.emojiId) || predefinedAvatars[0];
        // Make emojis bigger in navigation - use text-lg for better visibility in w-8 h-8 container
        const navEmojiSize = size.includes('w-8') ? 'text-lg' : textSize;
        return (
          <div className={`${size} rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center ${navEmojiSize}`}>
            <span className="leading-none">{selectedEmoji.emoji}</span>
          </div>
        );
      
      case 'initials':
      default:
        const { initials, color } = generateInitialsAvatar(preferences.displayName || getUserDisplayName(), avatarData.colorIndex);
        return (
          <div className={`${size} rounded-full bg-gradient-to-br ${color.bg} flex items-center justify-center ${color.text} font-medium ${textSize}`}>
            {initials}
          </div>
        );
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  // Close mobile menu when clicking outside
  React.useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showMobileMenu]);

  console.log('Navigation render - showMobileMenu:', showMobileMenu);

  return (
    <>
      <nav className="bg-white dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800 sticky top-0 z-[55]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                <Logo size="sm" className="" />
              </div>
              <span className="text-xl font-semibold dark:text-white">Pesa</span>
            </div>

            {/* Center Menu - Desktop Only */}
            <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
              <div className="flex space-x-1">
                {navItems.map(item => {
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      className={({ isActive }) =>
                        `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
            
            {/* Right Side */}
            <div className="flex items-center space-x-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Mobile menu button clicked, current state:', showMobileMenu);
                  setShowMobileMenu(!showMobileMenu);
                }}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {showMobileMenu ? (
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>

              {/* User Menu - Desktop */}
              <div className="relative hidden md:block">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {renderAvatar()}
                  <span className="text-sm font-medium text-gray-900 dark:text-white hidden sm:block">
                    {getUserDisplayName()}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-2xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {currentUser?.email}
                      </p>
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[60] md:hidden"
          onClick={() => setShowMobileMenu(false)}
        >
          <div 
            className="mobile-menu-container fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  {renderAvatar('w-10 h-10', 'text-base')}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto py-6">
                <div className="space-y-1 px-6">
                  {navItems.map(item => (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                          isActive
                            ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-base font-medium">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navigation;