import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Overview } from './pages/Overview';
import { Trades } from './pages/Trades';
import { Analytics } from './pages/Analytics';
import { Status } from './pages/Status';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTheme } from './store/useTheme';
// Force rebuild - debug panel removed

function App() {
  const theme = useTheme((state) => state.theme);

  return (
    <ErrorBoundary>
      <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
        <div className={
          theme === 'dark' 
            ? "bg-dark-bg/90 min-h-screen" 
            : "bg-light-bg min-h-screen"
        }>
          <Router>
            <Sidebar />
            <TopBar />
            
            {/* Main Content */}
            <main className="ml-64 pt-20 min-h-screen">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Navigate to="/overview" replace />} />
                  <Route path="/overview" element={<Overview />} />
                  <Route path="/trades" element={<Trades />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/status" element={<Status />} />
                </Routes>
              </ErrorBoundary>
            </main>
          </Router>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;