import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/pages/Auth';
import Dashboard from './components/Dashboard';
import './App.css';

function AppContent() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 bg-transparent rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <img 
                src={`${process.env.PUBLIC_URL}/logo.png`} 
                alt="Pesa Logo" 
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }}
              />
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#f97316" style={{display: 'none'}}>
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9H21ZM19 21H5V3H13V9H19V21Z"/>
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Pesa</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Authenticating...</p>
          <div className="w-32 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={!currentUser ? <Auth /> : <Navigate to="/" />} />
      <Route path="/*" element={currentUser ? <Dashboard /> : <Navigate to="/auth" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;