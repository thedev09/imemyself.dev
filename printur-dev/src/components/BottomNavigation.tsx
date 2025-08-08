import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, BarChart3, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

export function BottomNavigation() {
  const location = useLocation();

  const navItems = [
    {
      path: '/overview',
      icon: Home,
      label: 'Overview',
      gradient: 'from-blue-500 to-purple-500'
    },
    {
      path: '/trades',
      icon: TrendingUp,
      label: 'Trades',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      path: '/analytics',
      icon: BarChart3,
      label: 'Analytics',
      gradient: 'from-cyan-500 to-blue-500'
    },
    {
      path: '/status',
      icon: Settings,
      label: 'Status',
      gradient: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-4 mb-4">
        <div className="bg-dark-card/90 backdrop-blur-xl border border-dark-border rounded-3xl shadow-premium-lg">
          <div className="px-4 py-3">
            <div className="flex items-center justify-around">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="relative flex flex-col items-center group"
                  >
                    {/* Background glow for active item */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 -inset-2 rounded-2xl bg-gradient-to-r opacity-20"
                        style={{
                          backgroundImage: `linear-gradient(to right, ${item.gradient.split(' ')[1]}, ${item.gradient.split(' ')[3]})`
                        }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    {/* Icon container */}
                    <div className={cn(
                      "relative p-3 rounded-2xl transition-all duration-300",
                      isActive
                        ? "bg-gradient-to-r shadow-glow-md"
                        : "group-hover:bg-white/5"
                    )}
                    style={isActive ? {
                      backgroundImage: `linear-gradient(to right, ${item.gradient.split(' ')[1]}, ${item.gradient.split(' ')[3]})`
                    } : {}}
                    >
                      <Icon 
                        className={cn(
                          "w-6 h-6 transition-colors duration-300",
                          isActive 
                            ? "text-white" 
                            : "text-dark-text-secondary group-hover:text-dark-text-primary"
                        )} 
                      />
                    </div>

                    {/* Label */}
                    <span className={cn(
                      "text-xs font-medium mt-1 transition-colors duration-300",
                      isActive 
                        ? "text-white" 
                        : "text-dark-text-muted group-hover:text-dark-text-secondary"
                    )}>
                      {item.label}
                    </span>

                    {/* Active indicator dot */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-white shadow-glow-sm"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}