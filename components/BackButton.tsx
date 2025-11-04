import React from 'react';
import { BackIcon } from './icons';
import { Button } from './ui/Button';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = 'Zpět',
  variant = 'ghost',
  className = '',
}) => {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      leftIcon={<BackIcon className="h-5 w-5" />}
      className={className}
    >
      {label}
    </Button>
  );
};


