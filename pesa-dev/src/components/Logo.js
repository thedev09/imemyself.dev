import React from 'react';
import { DollarSign } from 'lucide-react';

const Logo = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
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