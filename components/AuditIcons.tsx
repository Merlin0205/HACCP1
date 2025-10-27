import React from 'react';
import {
    HomeIcon,
    PlusIcon,
    TrashIcon
} from './icons';

export const QuestionMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4 0 .863-.293 1.66-.789 2.288l-1.07 1.072a2 2 0 01-2.828 0l-.707-.707a2 2 0 00-2.828 0l-1.07 1.072A4.5 4.5 0 006 18h12" />
    </svg>
);

export const iconMap: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
    'default-1.1': HomeIcon,
    'default-1.2': PlusIcon,
    'default-1.3': TrashIcon,
    // Add other icons here as needed
};
