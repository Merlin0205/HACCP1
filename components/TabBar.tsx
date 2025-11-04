import React from 'react';
import { Tab } from '../types';
import { XIcon } from './icons';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string, e?: React.MouseEvent) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
}) => {
  if (tabs.length === 0) return null;

  return (
    <div className="bg-white border-b border-gray-200 overflow-x-auto">
      <div className="flex items-center gap-1 px-2 sm:px-4 min-w-max">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          
          return (
            <div
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className={`
                flex items-center gap-2 px-3 sm:px-4 py-2 rounded-t-lg cursor-pointer transition-all
                whitespace-nowrap flex-shrink-0
                ${isActive 
                  ? 'bg-primary text-white border-b-2 border-primary' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-b-2 border-transparent'
                }
              `}
            >
              {/* Icon */}
              {tab.type === 'audit' ? (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ) : tab.type === 'audit_list' ? (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              ) : (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              
              {/* Label */}
              <span className="text-sm font-medium">
                {tab.type === 'audit_list' 
                  ? `Audity pracoviště ${tab.premiseName ? `(${tab.premiseName})` : ''}`
                  : tab.type === 'audit' 
                    ? `Audit (${tab.operatorName})`
                    : `Report (${tab.operatorName})`}
              </span>
              
              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id, e);
                }}
                className={`
                  ml-1 p-0.5 rounded hover:bg-opacity-20 transition-colors
                  ${isActive ? 'hover:bg-white' : 'hover:bg-gray-300'}
                `}
                title="Zavřít"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

