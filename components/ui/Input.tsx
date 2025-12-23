import React, { useState, useEffect, useRef } from 'react';
import { TextInput, Textarea, Select as FlowbiteSelect, Label } from 'flowbite-react';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  // Flowbite TextInput má color prop pro error state
  const color = error ? 'failure' : undefined;

  // Odstranit helperText a error z props, aby se nedostaly do DOM
  const { helperText: _, error: __, ...inputProps } = props as any;

  // Příprava helperText pro Flowbite - pouze pokud existuje
  const flowbiteHelperText = error
    ? <span className="text-red-600">{error}</span>
    : helperText
      ? helperText
      : undefined;

  // Flowbite icon prop přijímá funkci, která vrací ReactNode
  const iconComponent = leftIcon ? () => <>{leftIcon}</> : undefined;
  const rightIconComponent = rightIcon ? () => <>{rightIcon}</> : undefined;

  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={props.id} className="mb-1.5">
          {label}
        </Label>
      )}
      <TextInput
        id={props.id}
        color={color}
        icon={iconComponent}
        rightIcon={rightIconComponent}
        {...(flowbiteHelperText && { helperText: flowbiteHelperText })}
        className={className}
        {...inputProps}
      />
    </div>
  );
};

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: React.ReactNode;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  const color = error ? 'failure' : undefined;

  // Odstranit helperText a error z props, aby se nedostaly do DOM
  const { helperText: _, error: __, ...textareaProps } = props as any;

  // Příprava helperText pro Flowbite - pouze pokud existuje
  const flowbiteHelperText = error
    ? <span className="text-red-600">{error}</span>
    : helperText
      ? helperText
      : undefined;

  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={props.id} className="mb-1.5">
          {label}
        </Label>
      )}
      <Textarea
        id={props.id}
        color={color}
        {...(flowbiteHelperText && { helperText: flowbiteHelperText })}
        className={className}
        {...textareaProps}
      />
    </div>
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  className = '',
  ...props
}) => {
  const color = error ? 'failure' : undefined;

  // Odstranit helperText a error z props, aby se nedostaly do DOM
  const { helperText: _, error: __, ...selectProps } = props as any;

  // Příprava helperText pro zobrazení pod selectem
  const displayHelperText = error
    ? <span className="mt-1.5 text-sm text-red-600">{error}</span>
    : helperText
      ? <span className="mt-1.5 text-sm text-gray-500">{helperText}</span>
      : null;

  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={props.id} className="mb-1.5">
          {label}
        </Label>
      )}
      <FlowbiteSelect
        id={props.id}
        color={color}
        className={className}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </FlowbiteSelect>
      {displayHelperText}
    </div>
  );
};

export interface SearchableSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Vyhledat...',
  error,
  helperText,
  className = '',
  disabled = false,
  id,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Najít aktuálně vybranou možnost
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  // Filtrovat možnosti podle vyhledávacího textu
  const filteredOptions = searchText
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchText.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchText.toLowerCase())
      )
    : options;

  // Informovat rodiče o změně stavu dropdownu
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

  // Zavřít dropdown při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchText('');
        setHasStartedTyping(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Když se otevře dropdown, nastavit focus na input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchText('');
    setHasStartedTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchText(newValue);
    setHasStartedTyping(true); // Uživatel začal psát
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // Při prvním focusu nastavit searchText na prázdný string, aby uživatel mohl začít psát
    if (!hasStartedTyping) {
      setSearchText('');
    }
  };

  const handleInputClick = () => {
    setIsOpen(true);
    // Při kliknutí nastavit searchText na prázdný string, aby uživatel mohl začít psát
    if (!hasStartedTyping) {
      setSearchText('');
    }
  };

  const color = error ? 'failure' : undefined;

  // Příprava helperText pro zobrazení pod selectem
  const displayHelperText = error
    ? <span className="mt-1.5 text-sm text-red-600">{error}</span>
    : helperText
      ? <span className="mt-1.5 text-sm text-gray-500">{helperText}</span>
      : null;

  return (
    <div className="w-full" ref={wrapperRef}>
      {label && (
        <Label htmlFor={id} className="mb-1.5">
          {label}
        </Label>
      )}
      <div className="relative">
        <TextInput
          ref={inputRef}
          id={id}
          type="text"
          value={isOpen && hasStartedTyping ? searchText : displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          placeholder={!displayValue ? placeholder : undefined}
          color={color}
          disabled={disabled}
          className={className}
          rightIcon={() => (
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        />
        {isOpen && !disabled && (
          <div
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
            onMouseDown={(e) => {
              // Zabránit onBlur na inputu
              e.preventDefault();
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`px-3 py-2 hover:bg-gray-100 cursor-pointer ${
                    value === option.value ? 'bg-blue-50 font-semibold text-blue-600' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(option.value);
                  }}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-sm">
                Žádné výsledky
              </div>
            )}
          </div>
        )}
      </div>
      {displayHelperText}
    </div>
  );
};
