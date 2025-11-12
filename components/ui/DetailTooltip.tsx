import React, { useState, useRef, useEffect } from 'react';

interface DetailTooltipProps {
  /** Obsah tooltipu - React node s detaily */
  content: React.ReactNode;
  /** Pozice tooltipu - 'top' pro poslední řádek, 'bottom' pro ostatní */
  position?: 'top' | 'bottom';
  /** Dětské elementy - hodnota, na kterou se najede myší */
  children: React.ReactNode;
  /** Minimální šířka tooltipu */
  minWidth?: string;
  /** Maximální šířka tooltipu */
  maxWidth?: string;
  /** CSS třídy pro wrapper */
  className?: string;
  /** Použít fixed positioning místo absolute (pro overflow kontejnery) */
  useFixed?: boolean;
}

/**
 * Detailní tooltip komponenta pro zobrazení komplexních informací
 * 
 * Použití:
 * ```tsx
 * <DetailTooltip 
 *   position={isLastRow ? 'top' : 'bottom'}
 *   content={
 *     <div className="space-y-1.5">
 *       <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">
 *         {operator.operator_name}
 *       </div>
 *       {/* další obsah *\/}
 *     </div>
 *   }
 * >
 *   <span className="cursor-help truncate block w-full">
 *     {operator.operator_name}
 *   </span>
 * </DetailTooltip>
 * ```
 */
export const DetailTooltip: React.FC<DetailTooltipProps> = ({
  content,
  position = 'bottom',
  children,
  minWidth = '250px',
  maxWidth = '350px',
  className = '',
  useFixed = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && useFixed && wrapperRef.current && tooltipRef.current) {
      const updatePosition = () => {
        const rect = wrapperRef.current!.getBoundingClientRect();
        const tooltipRect = tooltipRef.current!.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        let left = rect.left + scrollX;
        let top = position === 'top' 
          ? rect.top + scrollY - tooltipRect.height - 8
          : rect.bottom + scrollY + 8;

        // Zajistit, že tooltip není mimo obrazovku
        const padding = 10;
        if (left + tooltipRect.width > window.innerWidth + scrollX - padding) {
          left = window.innerWidth + scrollX - tooltipRect.width - padding;
        }
        if (left < scrollX + padding) {
          left = scrollX + padding;
        }

        setTooltipPosition({ top, left });
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible, useFixed, position]);

  if (useFixed) {
    return (
      <div 
        ref={wrapperRef}
        className={`relative ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        {isVisible && (
          <div 
            ref={tooltipRef}
            className={`
              fixed px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl 
              pointer-events-none z-[100]
            `}
            style={{
              minWidth,
              maxWidth,
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            }}
          >
            {content}
            {/* Šipka tooltipu */}
            <div 
              className={`
                absolute ${position === 'top' ? 'top-full' : 'bottom-full'} 
                left-4 w-0 h-0 border-l-4 border-r-4 
                ${position === 'top' 
                  ? 'border-t-4 border-transparent border-t-gray-900' 
                  : 'border-b-4 border-transparent border-b-gray-900'
                }
              `}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      {children}
      <div 
        className={`
          absolute left-0 
          ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} 
          px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl 
          opacity-0 group-hover:opacity-100 
          pointer-events-none z-[100]
        `}
        style={{
          minWidth,
          maxWidth
        }}
      >
        {content}
        {/* Šipka tooltipu */}
        <div 
          className={`
            absolute ${position === 'top' ? 'top-full' : 'bottom-full'} 
            left-4 w-0 h-0 border-l-4 border-r-4 
            ${position === 'top' 
              ? 'border-t-4 border-transparent border-t-gray-900' 
              : 'border-b-4 border-transparent border-b-gray-900'
            }
          `}
        />
      </div>
    </div>
  );
};

