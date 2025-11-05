import React from 'react';
import { Spinner as FlowbiteSpinner } from 'flowbite-react';

interface SpinnerProps {
    small?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({ small }) => {
  const size = small ? 'sm' : 'md';
  return <FlowbiteSpinner size={size} />;
};

export default Spinner;
