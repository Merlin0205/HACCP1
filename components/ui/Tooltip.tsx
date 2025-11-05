import React, { useState, useRef, useEffect } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  className = '',
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(position);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-adjust position based on viewport
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const rect = tooltip.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();

      let newPosition = position;

      // Check if tooltip would overflow viewport
      if (position === 'top' && rect.top < 0) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && rect.bottom > window.innerHeight) {
        newPosition = 'top';
      } else if (position === 'left' && rect.left < 0) {
        newPosition = 'right';
      } else if (position === 'right' && rect.right > window.innerWidth) {
        newPosition = 'left';
      }

      setTooltipPosition(newPosition);
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-t-4 border-x-4 border-x-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-b-4 border-x-4 border-x-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-l-4 border-y-4 border-y-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-r-4 border-y-4 border-y-transparent',
  };

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && !disabled && (
        <div
          ref={tooltipRef}
          className={`
            absolute z-[9999] px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-xl
            whitespace-normal max-w-xs pointer-events-none
            ${positionClasses[tooltipPosition]}
            transition-opacity duration-200
          `}
          role="tooltip"
        >
          <div className="relative">
            {content}
            {/* Arrow */}
            <div
              className={`absolute ${arrowClasses[tooltipPosition]}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
