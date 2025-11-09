import React from 'react';

interface ActionIconTooltipProps {
  /** Text tooltipu */
  text: string;
  /** Je to poslední řádek? Pokud ano, tooltip se zobrazí nad ikonou */
  isLastRow?: boolean;
  /** CSS třídy pro wrapper */
  className?: string;
}

/**
 * Tooltip komponenta pro ikony akcí v tabulkách
 * 
 * Zobrazuje tooltip pod ikonou (nebo nad, pokud je poslední řádek).
 * Používá se pro všechny ikony akcí (Edit, Delete, Add, atd.)
 * 
 * Použití:
 * ```tsx
 * <div className="relative group/button">
 *   <button className="...">
 *     <Icon />
 *   </button>
 *   <ActionIconTooltip text="Upravit" isLastRow={isLastRow} />
 * </div>
 * ```
 */
export const ActionIconTooltip: React.FC<ActionIconTooltipProps> = ({
  text,
  isLastRow = false,
  className = ''
}) => {
  const positionClasses = isLastRow 
    ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' 
    : 'top-full mt-1 left-1/2 -translate-x-1/2';
  
  const arrowPositionClasses = isLastRow
    ? 'top-full left-1/2 -translate-x-1/2 border-t-4 border-transparent border-t-gray-900'
    : 'bottom-full left-1/2 -translate-x-1/2 border-b-4 border-transparent border-b-gray-900';

  return (
    <div className={`absolute ${positionClasses} px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/button:opacity-100 pointer-events-none z-[101] ${className}`}>
      {text}
      {/* Šipka tooltipu */}
      <div className={`absolute ${arrowPositionClasses} w-0 h-0 border-l-4 border-r-4`} />
    </div>
  );
};

