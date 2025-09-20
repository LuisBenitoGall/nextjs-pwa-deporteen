import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  noSpinner?: boolean;
}

export default function Input({ label, error, containerClassName, className, type, id, name, noSpinner, ...props }: InputProps) {
  const baseClasses = 'w-full bg-white px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-50';
  const errorClasses = error ? 'border-red-400' : 'border-gray-300';
  const numberAlign = type === 'number' ? 'text-right' : '';
  const spinnerClass = type === 'number' && noSpinner ? 'no-spinner' : '';
  const inputClassName = [baseClasses, errorClasses, numberAlign, spinnerClass, className || ''].join(' ').trim();
  const controlId = id || name;
  return (
    <div className={["mb-4", containerClassName || ''].join(' ').trim()}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={controlId}>
          {label}
        </label>
      )}
      <input
        id={controlId}
        name={name}
        type={type}
        className={inputClassName}
        aria-invalid={!!error}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}