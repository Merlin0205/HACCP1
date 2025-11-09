import React from 'react';

interface TooltipCellProps {
  /** Dětské elementy */
  children: React.ReactNode;
  /** CSS třídy pro td element */
  className?: string;
  /** Colspan pro sloučení buněk */
  colSpan?: number;
}

/**
 * Wrapper komponenta pro `<td>` element s tooltipem
 * 
 * Automaticky přidává `overflow-hidden` a `has-[.group:hover]:overflow-visible`
 * pro správné zobrazení tooltipů mimo řádek.
 * 
 * Použití:
 * ```tsx
 * <TooltipCell className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4">
 *   <DetailTooltip content={...}>
 *     <span>Hodnota</span>
 *   </DetailTooltip>
 * </TooltipCell>
 * ```
 */
export const TooltipCell: React.FC<TooltipCellProps> = ({ 
  children, 
  className = '',
  colSpan
}) => {
  return (
    <td 
      className={`${className} overflow-hidden has-[.group:hover]:overflow-visible`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
};

