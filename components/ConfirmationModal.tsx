import React, { useEffect, useState, useRef } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: 'primary' | 'danger'; // Nová prop pro variantu tlačítka
  anchorRef?: React.RefObject<HTMLElement>; // Ref na element, u kterého se má modal zobrazit
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmButtonText = 'Potvrdit',
  cancelButtonText = 'Zrušit',
  confirmButtonVariant = 'primary',
  anchorRef,
}) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (anchorRef?.current) {
      const updatePosition = () => {
        const rect = anchorRef.current!.getBoundingClientRect();
        
        // Modal width
        const modalWidth = 448; // max-w-md je 448px
        const modalHeight = 200; // odhad
        const spacing = 10; // mezera od razítka
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Horizontálně - VŽDY uprostřed obrazovky
        const left = (viewportWidth - modalWidth) / 2;
        
        // Vertikálně - u razítka (pod nebo nad podle dostupného místa)
        let top = rect.bottom + spacing;
        
        // Pokud by modal šel mimo viewport dole, zobrazit ho nad razítkem
        if (top + modalHeight > viewportHeight - 20) {
          top = rect.top - modalHeight - spacing;
          // Pokud by šel mimo viewport nahoru, zobrazit ho pod razítkem co nejníž
          if (top < 20) {
            top = Math.max(20, viewportHeight - modalHeight - 20);
          }
        }
        
        setPosition({ top, left });
      };
      
      updatePosition();
      
      // Aktualizovat pozici při scrollování nebo změně velikosti okna
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      // Pokud není anchor, použít střed obrazovky (původní chování)
      setPosition(null);
    }
  }, [isOpen, anchorRef]);

  if (!isOpen) return null;

  const confirmButtonClass = confirmButtonVariant === 'danger'
    ? 'px-4 py-2 bg-red-600 text-sm font-medium text-white border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
    : 'px-4 py-2 bg-blue-600 text-sm font-medium text-white border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';

  // Pokud máme pozici z anchor elementu, použít absolutní pozicování
  if (position) {
    return (
      <>
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 z-[9999] animate-fade-in"
          onClick={onCancel}
        />
        {/* Modal positioned relative to anchor */}
        <div
          ref={modalRef}
          className="fixed bg-white rounded-lg shadow-xl max-w-md z-[10000] animate-fade-in"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: '448px', // Pevná šířka pro správný výpočet pozice
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {cancelButtonText}
            </button>
            <button
              onClick={onConfirm}
              className={confirmButtonClass}
            >
              {confirmButtonText}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Původní chování - střed obrazovky
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex justify-center items-center p-4 animate-fade-in">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {cancelButtonText}
          </button>
          <button
            onClick={onConfirm}
            className={confirmButtonClass}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
