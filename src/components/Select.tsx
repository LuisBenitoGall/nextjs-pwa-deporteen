import React from 'react';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string;
  id?: string;
  label?: string;
  options: Option[];
  value: string | string[];
  multiple?: boolean;
  required?: boolean;
  error?: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  uiSize?: 'sm' | 'md' | 'lg';
  fontSize?: 'sm' | 'base' | 'lg';
}

export default function Select({
  name,
  id,
  label,
  options,
  value,
  multiple = false,
  required = false,
  error,
  placeholder = 'Selecciona una opción',
  onChange,
  uiSize = 'md',
  fontSize,
  className,
  style,
  ...props
}: SelectProps) {
  const isEmpty = Array.isArray(value) ? value.length === 0 : value === '';
  const isPlaceholderShown = isEmpty;
  const sizeHeightClasses =
    uiSize === 'sm'
      ? 'px-3 py-1.5 h-9'
      : uiSize === 'lg'
      ? 'px-4 py-2 h-11'
      : 'px-4 py-2 h-[42px]';
  const fontSizeClass = fontSize
    ? fontSize === 'sm'
      ? 'text-sm'
      : fontSize === 'lg'
      ? 'text-lg'
      : 'text-base'
    : uiSize === 'sm'
    ? 'text-sm'
    : 'text-base';

  const finalClassName = [
    'w-full border border-gray-300 bg-white rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-50',
    fontSizeClass,
    sizeHeightClasses,
  isPlaceholderShown ? 'text-sm' : '',
    className || ''
  ]
    .join(' ')
    .trim();

  const finalStyle = { ...(style || {}) } as React.CSSProperties;

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id || name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        name={name}
        id={id || name}
        value={value}
        multiple={multiple}
        required={required}
        onChange={onChange}
        className={finalClassName}
        style={finalStyle}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}