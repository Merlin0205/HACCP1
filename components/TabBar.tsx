import React from 'react';
import { Tab } from '../types';
import { XIcon, ChecklistIcon, ReportIcon } from './icons';
import { TAB_THEMES } from '../constants/designSystem';

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
          const tabTheme = TAB_THEMES[tab.type] || TAB_THEMES.audit;
          
          return (
            <div
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className={`
                flex items-center gap-2 px-3 sm:px-4 py-2 rounded-t-lg cursor-pointer transition-all
                whitespace-nowrap flex-shrink-0
                ${isActive 
                  ? `bg-gradient-to-r ${tabTheme.colors.gradient} text-white border-b-2 shadow-sm` 
                  : `${tabTheme.colors.bgLight} text-gray-700 hover:bg-gray-100 border-b-2 border-transparent`
                }
              `}
              style={isActive ? {
                borderBottomColor: tabTheme.colors.primary
              } : undefined}
            >
              {/* Icon */}
              {tab.type === 'audit' || tab.type === 'audit_list' ? (
                <ChecklistIcon className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ReportIcon className="w-4 h-4 flex-shrink-0" />
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

