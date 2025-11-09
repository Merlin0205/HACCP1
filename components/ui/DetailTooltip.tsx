import React from 'react';

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
  className = ''
}) => {
  return (
    <div className={`relative group ${className}`}>
      {children}
      <div 
        className={`
          absolute left-0 
          ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} 
          px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl 
          opacity-0 group-hover:opacity-100 transition-opacity 
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

