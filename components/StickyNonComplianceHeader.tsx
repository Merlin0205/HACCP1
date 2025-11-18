import React, { useState, useEffect } from 'react';
import { WarningIcon, ChevronDownIcon } from './icons';
import { AuditItem } from '../types';

interface StickyNonComplianceHeaderProps {
  nonCompliantItems: Array<AuditItem & { sectionId: string; sectionTitle: string }>;
  onItemClick: (sectionId: string, itemId: string) => void;
}

const StickyNonComplianceHeader: React.FC<StickyNonComplianceHeaderProps> = ({ nonCompliantItems, onItemClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (nonCompliantItems.length === 0) {
    return null;
  }

  return (
    <div
      className={`sticky top-0 z-10 bg-gradient-to-r from-red-50 via-white to-red-50 border-b border-red-200 transition-shadow ${
        hasScrolled ? 'shadow-md' : 'shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-3 hover:bg-red-50/50 rounded-lg p-2 transition-colors"
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <WarningIcon className="h-5 w-5 sm:h-6 sm:w-6 text-accent-error flex-shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Přehled neshod</h3>
              <p className="text-xs sm:text-sm text-gray-600">
                {nonCompliantItems.length} {nonCompliantItems.length === 1 ? 'neshoda' : nonCompliantItems.length >= 2 && nonCompliantItems.length <= 4 ? 'neshody' : 'neshod'}
              </p>
            </div>
            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full flex-shrink-0">
              {nonCompliantItems.length}
            </span>
          </div>
          <ChevronDownIcon
            className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-600 flex-shrink-0 transform transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-red-200">
            <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto">
              {nonCompliantItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onItemClick(item.sectionId, item.id);
                      setIsExpanded(false);
                    }}
                    className="w-full text-left p-2 text-sm text-red-800 bg-red-50 hover:bg-red-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <span className="font-semibold block">{item.title}</span>
                    <span className="text-xs text-red-600 mt-0.5 block">{item.sectionTitle}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default StickyNonComplianceHeader;




