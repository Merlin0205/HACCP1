import React from 'react';
import { Badge as FlowbiteBadge } from 'flowbite-react';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'success' | 'failure' | 'warning' | 'info' | 'gray' | 'indigo' | 'purple' | 'pink' | 'blue';
  size?: 'xs' | 'sm';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  color = 'gray',
  size = 'xs',
  className = '' 
}) => {
  return (
    <FlowbiteBadge color={color} size={size} className={className}>
      {children}
    </FlowbiteBadge>
  );
};

