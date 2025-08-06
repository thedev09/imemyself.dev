import React from 'react';
import { DollarSign } from 'lucide-react';

const Logo = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
    xxl: 'w-16 h-16'
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
    xxl: 'w-10 h-10'
  };

  // Use process.env.PUBLIC_URL for Create React App
  const logoSrc = `${process.env.PUBLIC_URL}/logo.png`;

  return (
    <img 
      src={logoSrc}
      alt="Pesa Logo"
      className={`${sizeClasses[size]} ${className}`}
      style={{ objectFit: 'contain' }}
      onError={(e) => {
        console.error('Logo failed to load from:', logoSrc);
        // Hide the broken image and fall back to DollarSign
        e.target.style.display = 'none';
      }}
    />
  );
};

export default Logo;