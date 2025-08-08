import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, BarChart3, Settings, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../store/useTheme';
import { useVPSStatus } from '../hooks/useVPSStatus';
import { cn } from '../utils/cn';

export function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { vpsStatus, isLoading } = useVPSStatus();

  const navItems = [
    {
      path: '/overview',
      icon: Home,
      label: 'Overview',
      gradient: 'bg-premium-pink'
    },
    {
      path: '/trades',
      icon: TrendingUp,
      label: 'Trades',
      gradient: 'bg-premium-purple'
    },
    {
      path: '/analytics',
      icon: BarChart3,
      label: 'Analytics',
      gradient: 'bg-premium-blue'
    },
    {
      path: '/status',
      icon: Settings,
      label: 'Status',
      gradient: 'bg-premium-cyan'
    }
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 z-50">
      <div className={cn(
        "h-full backdrop-blur-xl border-r transition-all duration-300",
        theme === 'dark' 
          ? "bg-dark-surface/90 border-dark-border" 
          : "bg-light-surface/90 border-light-border"
      )}>
        <div className="p-6">
          {/* Logo/Brand */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className={cn(
              "text-2xl font-bold bg-premium-pink bg-clip-text text-transparent"
            )}>
              Printur
            </h1>
            <p className={cn(
              "text-sm mt-1",
              theme === 'dark' ? "text-dark-text-muted" : "text-light-text-muted"
            )}>
              Trading Dashboard
            </p>
          </motion.div>

          {/* Navigation */}
          <nav className="space-y-2">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={item.path}
                    className={cn(
                      "relative flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                      isActive
                        ? theme === 'dark'
                          ? "bg-card-dark text-dark-text-primary"
                          : "bg-card-light text-light-text-primary"
                        : theme === 'dark'
                          ? "text-dark-text-secondary hover:text-dark-text-primary hover:bg-card-dark"
                          : "text-light-text-secondary hover:text-light-text-primary hover:bg-card-light"
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className={cn("absolute left-0 w-1 h-8 rounded-r-full", item.gradient)}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    {/* Icon container */}
                    <div className={cn(
                      "relative p-2 rounded-lg transition-all duration-300",
                      isActive 
                        ? `${item.gradient} shadow-glow-pink` 
                        : theme === 'dark'
                          ? "group-hover:bg-white/5"
                          : "group-hover:bg-black/5"
                    )}>
                      <Icon 
                        className={cn(
                          "w-5 h-5 transition-colors duration-300",
                          isActive 
                            ? "text-white" 
                            : theme === 'dark'
                              ? "text-dark-text-secondary group-hover:text-dark-text-primary"
                              : "text-light-text-secondary group-hover:text-light-text-primary"
                        )} 
                      />
                    </div>

                    {/* Label */}
                    <span className={cn(
                      "font-medium transition-colors duration-300",
                      isActive 
                        ? theme === 'dark' ? "text-dark-text-primary" : "text-light-text-primary"
                        : theme === 'dark'
                          ? "text-dark-text-secondary group-hover:text-dark-text-primary"
                          : "text-light-text-secondary group-hover:text-light-text-primary"
                    )}>
                      {item.label}
                    </span>

                    {/* Active glow effect */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute -right-1 w-2 h-2 rounded-full bg-white shadow-glow-pink"
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Theme Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 pt-6 border-t border-opacity-20"
            style={{
              borderColor: theme === 'dark' ? '#333334' : '#e4e4e7'
            }}
          >
            <button
              onClick={toggleTheme}
              className={cn(
                "flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all duration-300 group",
                theme === 'dark'
                  ? "text-dark-text-secondary hover:text-dark-text-primary hover:bg-card-dark"
                  : "text-light-text-secondary hover:text-light-text-primary hover:bg-card-light"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg transition-all duration-300",
                theme === 'dark'
                  ? "group-hover:bg-white/5"
                  : "group-hover:bg-black/5"
              )}>
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </div>
              <span className="font-medium">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-6 left-6 right-6"
          >
            <div className={cn(
              "text-xs space-y-1",
              theme === 'dark' ? "text-dark-text-muted" : "text-light-text-muted"
            )}>
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isLoading 
                    ? "bg-gray-400 animate-pulse" 
                    : vpsStatus.status === 'online' 
                      ? "bg-green-400 animate-pulse" 
                      : "bg-red-400"
                )}></div>
                <span>
                  {isLoading 
                    ? 'VPS Loading...' 
                    : vpsStatus.status === 'online' 
                      ? 'VPS Online' 
                      : 'VPS Offline'}
                </span>
              </div>
              <div>Triple-engine analysis</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}