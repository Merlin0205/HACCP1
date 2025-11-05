import React from 'react';
import { TextInput, Textarea, Select as FlowbiteSelect, Label } from 'flowbite-react';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
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
  helperText?: string;
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
      <FlowbiteSelect
        id={props.id}
        color={color}
        {...(flowbiteHelperText && { helperText: flowbiteHelperText })}
        className={className}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </FlowbiteSelect>
    </div>
  );
};
