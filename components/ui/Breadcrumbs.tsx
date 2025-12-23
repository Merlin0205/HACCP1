import React from 'react';
import { ChevronRightIcon, HomeIcon } from '../icons';

export interface BreadcrumbItem {
    label: string;
    onClick?: () => void;
    href?: string;
    isActive?: boolean;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
    if (!items || items.length === 0) return null;

    return (
        <nav className={`flex items-center text-sm text-gray-500 mb-4 ${className}`} aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    const isFirst = index === 0;

                    return (
                        <li key={`breadcrumb-${index}`} className="flex items-center">
                            {/* Separator - don't show for first item */}
                            {!isFirst && (
                                <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />
                            )}

                            {/* Item Content */}
                            <div className={`flex items-center ${isLast ? 'font-medium text-gray-900' : 'hover:text-gray-700'}`}>
                                {isFirst && item.label === 'Domů' ? (
                                    <button
                                        onClick={item.onClick}
                                        className="flex items-center hover:text-primary transition-colors duration-200"
                                        title="Domů"
                                    >
                                        <HomeIcon className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <>
                                        {item.onClick && !isLast ? (
                                            <button
                                                onClick={item.onClick}
                                                className="hover:text-primary hover:underline transition-all duration-200"
                                            >
                                                {item.label}
                                            </button>
                                        ) : (
                                            <span className={isLast ? 'text-gray-900 font-semibold' : ''}>
                                                {item.label}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};
