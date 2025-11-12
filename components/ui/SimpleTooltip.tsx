import React, { useRef, useState, useEffect } from 'react';

interface SimpleTooltipProps {
  /** Celý text, který se zobrazí v tooltipu */
  text: string;
  /** Je to poslední řádek? Pokud ano, tooltip se zobrazí nad textem */
  isLastRow?: boolean;
  /** Dětské elementy - textový element, který může být zkrácený */
  children: React.ReactNode;
  /** CSS třídy pro wrapper */
  className?: string;
}

/**
 * Jednoduchá tooltip komponenta pro zobrazení zkrácených textů v tabulkách
 * 
 * Zobrazuje tooltip okamžitě (bez delay) pouze pokud je text zkrácený.
 * Používá se pro jednoduché textové hodnoty v tabulkách (datumy, telefony, emaily, atd.)
 * 
 * Použití:
 * ```tsx
 * <SimpleTooltip text={operator.operator_phone} isLastRow={isLastRow}>
 *   <span className="truncate w-full">{operator.operator_phone}</span>
 * </SimpleTooltip>
 * ```
 */
export const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  text,
  isLastRow = false,
  children,
  className = ''
}) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      if (wrapperRef.current) {
        // Najít první element s textem uvnitř wrapperu
        const textElement = wrapperRef.current.querySelector('span, div');
        if (textElement) {
          setIsTruncated(textElement.scrollWidth > textElement.clientWidth);
        } else {
          // Pokud není žádný vnořený element, zkontrolovat wrapper samotný
          setIsTruncated(wrapperRef.current.scrollWidth > wrapperRef.current.clientWidth);
        }
      }
    };
    
    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    
    // Zkontrolovat po malém zpoždění, aby se zajistilo, že DOM je renderován
    const timeoutId = setTimeout(checkTruncation, 0);
    
    return () => {
      window.removeEventListener('resize', checkTruncation);
      clearTimeout(timeoutId);
    };
  }, [children, text]);

  const positionClasses = isLastRow 
    ? 'bottom-full mb-2 left-0' 
    : 'top-full mt-1 left-0';
  
  const arrowPositionClasses = isLastRow
    ? 'top-full left-4 border-t-4 border-transparent border-t-gray-900'
    : 'bottom-full left-4 border-b-4 border-transparent border-b-gray-900';

  // Pokud text není zkrácený, zobrazit pouze children bez tooltipu
  if (!isTruncated) {
    return (
      <span ref={wrapperRef} className={className}>
        {children}
      </span>
    );
  }

  return (
    <span ref={wrapperRef} className={`relative group ${className}`}>
      {children}
      <div 
        className={`absolute ${positionClasses} px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-[101]`}
        style={{ transition: 'opacity 0s' }}
      >
        {text}
        {/* Šipka tooltipu */}
        <div className={`absolute ${arrowPositionClasses} w-0 h-0 border-l-4 border-r-4`} />
      </div>
    </span>
  );
};

