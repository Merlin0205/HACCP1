import React from 'react';
import { Card as FlowbiteCard } from 'flowbite-react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hover = false,
  onClick 
}) => {
  const hoverClasses = hover ? 'hover:shadow-lg transition-shadow duration-200 cursor-pointer' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';
  
  return (
    <FlowbiteCard
      className={`w-full ${hoverClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </FlowbiteCard>
  );
};

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      className={`px-6 py-4 border-b border-gray-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => {
  // Pokud je className="p-0", odstranit defaultní padding úplně
  const hasNoPadding = className.includes('p-0');
  const paddingClasses = hasNoPadding ? '' : 'px-6 py-4';
  
  return (
    <div className={`w-full ${paddingClasses} ${className}`}>
      {children}
    </div>
  );
};

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl ${className}`}>
      {children}
    </div>
  );
};
