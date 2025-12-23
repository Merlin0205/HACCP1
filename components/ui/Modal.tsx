import React, { useState, useEffect } from 'react';
import {
  Modal as FlowbiteModal,
  ModalHeader as FlowbiteModalHeader,
  ModalBody as FlowbiteModalBody,
  ModalFooter as FlowbiteModalFooter
} from 'flowbite-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  closeOnBackdropClick?: boolean;
  responsiveSize?: { mobile?: string; desktop?: string }; // Nová prop pro responzivní velikosti
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'lg', // Změněno z 'md' na 'lg' - větší výchozí velikost
  closeOnBackdropClick = true,
  responsiveSize,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mapování velikostí na Flowbite sizes
  const sizeMap: Record<string, 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'> = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
    '2xl': '2xl',
    '3xl': '3xl',
    '4xl': '4xl',
    full: '7xl', // Použijeme největší velikost pro full
  };

  // Určit finální velikost podle responzivního nastavení
  let finalSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';

  if (responsiveSize) {
    // Použij mobilní velikost na mobilu, desktop velikost na desktopu
    if (isMobile) {
      finalSize = sizeMap[responsiveSize.mobile || 'md'] || 'md';
    } else {
      finalSize = sizeMap[responsiveSize.desktop || size || 'lg'] || 'lg';
    }
  } else {
    finalSize = sizeMap[size] || 'lg';
  }

  return (
    <FlowbiteModal
      show={isOpen}
      onClose={onClose}
      size={finalSize}
      dismissible={closeOnBackdropClick}
    >
      {title && (
        <FlowbiteModalHeader>
          {title}
        </FlowbiteModalHeader>
      )}
      <FlowbiteModalBody className="max-h-[calc(100vh-200px)] overflow-y-auto">
        {children}
      </FlowbiteModalBody>
      {footer && (
        <FlowbiteModalFooter className="flex justify-end gap-3 flex-wrap">
          {footer}
        </FlowbiteModalFooter>
      )}
    </FlowbiteModal>
  );
};
