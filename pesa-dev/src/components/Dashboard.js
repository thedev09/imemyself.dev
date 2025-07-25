import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './Navigation';
import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Accounts from './pages/Accounts';
import Activity from './pages/Activity';
import Subscriptions from './pages/Subscriptions';
import Settings from './pages/Settings';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

function Dashboard() {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to accounts
    const accountsQuery = query(
      collection(db, 'users', currentUser.uid, 'accounts'),
      where('isDeleted', '==', false)
    );

    const unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
      const accountsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAccounts(accountsData);
    });

    // Subscribe to transactions
    const transactionsQuery = query(
      collection(db, 'users', currentUser.uid, 'transactions'),
      orderBy('date', 'desc')
    );

    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(transactionsData);
      setLoading(false);
    });

    return () => {
      unsubscribeAccounts();
      unsubscribeTransactions();
    };
  }, [currentUser]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navigation theme={theme} toggleTheme={toggleTheme} />
      
      <main className="max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<Overview accounts={accounts} transactions={transactions} />} />
          <Route path="/transactions" element={<Transactions accounts={accounts} transactions={transactions} />} />
          <Route path="/analytics" element={<Analytics accounts={accounts} transactions={transactions} />} />
          <Route path="/accounts" element={<Accounts accounts={accounts} />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/subscriptions" element={<Subscriptions accounts={accounts} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default Dashboard;