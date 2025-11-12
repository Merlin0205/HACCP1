import React, { useState, useRef, useEffect } from 'react';
import { Tab } from '../types';
import { XIcon, ChecklistIcon, ReportIcon, ChevronDownIcon } from './icons';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (tabs.length === 0) return null;

  // Kontrola scroll pozice
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, [tabs]);

  // Scrollovat aktivní tab do viditelné oblasti
  useEffect(() => {
    if (activeTabId && scrollContainerRef.current) {
      const activeTabElement = scrollContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement;
      if (activeTabElement) {
        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const tabRect = activeTabElement.getBoundingClientRect();
        
        if (tabRect.left < containerRect.left) {
          container.scrollTo({ left: container.scrollLeft + (tabRect.left - containerRect.left) - 10, behavior: 'smooth' });
        } else if (tabRect.right > containerRect.right) {
          container.scrollTo({ left: container.scrollLeft + (tabRect.right - containerRect.right) + 10, behavior: 'smooth' });
        }
      }
    }
  }, [activeTabId]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = direction === 'left' 
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const handleTabSelect = (tabId: string) => {
    onTabClick(tabId);
    setShowDropdown(false);
  };

  return (
    <div className="bg-white border-b border-gray-200 relative">
      {/* Tabs container */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-center gap-1 px-2 sm:px-4 min-w-max" style={{ paddingRight: '48px', paddingLeft: canScrollLeft ? '40px' : '8px' }}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const tabTheme = TAB_THEMES[tab.type] || TAB_THEMES.audit;
            
            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                onClick={() => onTabClick(tab.id)}
                className={`
                  flex items-center gap-2 px-3 sm:px-4 py-2 rounded-t-lg cursor-pointer transition-all
                  whitespace-nowrap flex-shrink-0
                  ${isActive 
                    ? 'text-white border-b-2 shadow-sm' 
                    : `${tabTheme.colors.bgLight} text-gray-700 hover:bg-gray-100 border-b-2 border-transparent`
                  }
                `}
                style={isActive ? {
                  background: `linear-gradient(to right, ${tabTheme.colors.primary}, ${tabTheme.colors.light || tabTheme.colors.primary})`,
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
                    ? `Audity ${tab.premiseName ? `(${tab.premiseName})` : ''}`
                    : tab.type === 'audit' 
                      ? `Audit (${tab.premiseName || tab.operatorName})`
                      : `Report (${tab.premiseName || tab.operatorName})`}
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

      {/* Scroll buttons */}
      {tabs.length > 1 && (
        <>
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-0 bottom-0 z-10 px-2 bg-white hover:bg-gray-50 border-r border-gray-200 flex items-center transition-colors shadow-sm"
              aria-label="Posunout doleva"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-12 top-0 bottom-0 z-10 px-2 bg-white hover:bg-gray-50 border-l border-gray-200 flex items-center transition-colors shadow-sm"
              aria-label="Posunout doprava"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </>
      )}

      {/* Dropdown button */}
      <div className="absolute right-0 top-0 bottom-0 z-10">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="h-full px-3 bg-white hover:bg-gray-50 border-l border-gray-200 flex items-center transition-colors shadow-sm"
          aria-label="Zobrazit seznam záložek"
        >
          <ChevronDownIcon className={`h-5 w-5 text-gray-600 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Dropdown menu */}
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-20" 
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 min-w-[250px] max-w-[350px] max-h-[400px] overflow-y-auto">
              <div className="py-1">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTabId;
                  const tabTheme = TAB_THEMES[tab.type] || TAB_THEMES.audit;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabSelect(tab.id)}
                      className={`
                        w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors
                        ${isActive ? 'bg-blue-50 border-l-4' : ''}
                      `}
                      style={isActive ? {
                        borderLeftColor: tabTheme.colors.primary
                      } : undefined}
                    >
                      <div className="flex items-center gap-2">
                        {tab.type === 'audit' || tab.type === 'audit_list' ? (
                          <ChecklistIcon className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <ReportIcon className="w-4 h-4 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {tab.type === 'audit_list' 
                              ? `Audity ${tab.premiseName ? `(${tab.premiseName})` : ''}`
                              : tab.type === 'audit' 
                                ? `Audit (${tab.premiseName || tab.operatorName})`
                                : `Report (${tab.premiseName || tab.operatorName})`}
                          </div>
                          {tab.premiseName && (
                            <div className="text-xs text-gray-500 truncate">
                              {tab.operatorName} - {tab.premiseName}
                            </div>
                          )}
                          {!tab.premiseName && (
                            <div className="text-xs text-gray-500 truncate">
                              {tab.operatorName}
                            </div>
                          )}
                          {(tab.auditDate || tab.status) && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {tab.auditDate} {tab.status ? `- ${tab.status}` : ''}
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tabTheme.colors.primary }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

