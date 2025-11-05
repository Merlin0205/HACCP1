import React from 'react';
import { Button as FlowbiteButton } from 'flowbite-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  // Mapování velikostí (Flowbite: xs, sm, md, lg, xl)
  const sizeMap: Record<string, 'xs' | 'sm' | 'md' | 'lg'> = {
    sm: 'xs',
    md: 'sm',
    lg: 'md',
  };

  const flowbiteSize = sizeMap[size];

  // Custom styling pro všechny varianty - zachování původních barev
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary hover:bg-primary-dark text-white focus:ring-primary shadow-md hover:shadow-lg';
      case 'secondary':
        return 'bg-primary-light hover:bg-primary text-white focus:ring-primary-light shadow-md hover:shadow-lg';
      case 'ghost':
        return 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-md hover:shadow-lg';
      default:
        return 'bg-primary hover:bg-primary-dark text-white';
    }
  };

  const variantClasses = getVariantClasses();

  return (
    <FlowbiteButton
      size={flowbiteSize}
      outline={variant === 'ghost'}
      pill={false}
      disabled={disabled || isLoading}
      className={`${variantClasses} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Načítání...
        </>
      ) : (
        <>
          {leftIcon && <span className="mr-2">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-2">{rightIcon}</span>}
        </>
      )}
    </FlowbiteButton>
  );
};
