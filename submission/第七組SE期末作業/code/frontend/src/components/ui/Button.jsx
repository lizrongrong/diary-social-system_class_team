// Button Component
import React, { useState } from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  style = {},
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Variant styles using CSS variables
  const variantStyles = {
    primary: {
      background: isHovered && !disabled ? 'var(--dark-purple)' : 'var(--primary-purple)',
      color: '#FFFFFF',
      border: 'none'
    },
    secondary: {
      background: isHovered && !disabled ? 'var(--gray-100)' : '#FFFFFF',
      color: 'var(--primary-purple)',
      border: '1.5px solid var(--primary-purple)'
    },
    outline: {
      background: isHovered && !disabled ? 'rgba(205, 121, 213, 0.1)' : 'transparent',
      color: 'var(--primary-purple)',
      border: '1.5px solid var(--primary-purple)'
    },
    ghost: {
      background: isHovered && !disabled ? 'var(--gray-100)' : 'transparent',
      color: 'var(--gray-700)',
      border: 'none'
    },
    danger: {
      background: isHovered && !disabled ? '#c82333' : 'var(--error)',
      color: '#FFFFFF',
      border: 'none'
    }
  };

  // Size styles using CSS variables
  const sizeStyles = {
    small: {
      padding: 'var(--spacing-xs) var(--spacing-md)',
      fontSize: '0.875rem'
    },
    medium: {
      padding: 'var(--spacing-sm) var(--spacing-lg)',
      fontSize: '1rem'
    },
    large: {
      padding: 'var(--spacing-md) var(--spacing-xl)',
      fontSize: '1.0625rem'
    }
  };

  const baseStyles = {
    borderRadius: 'var(--radius-full)',
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all var(--transition-base)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)',
    whiteSpace: 'nowrap',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
      style={baseStyles}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
