import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  error?: string;
}

export default function Checkbox({ label, error, ...props }: CheckboxProps) {
  return (
    <div className="mb-2">
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          className={`mt-1 ${error ? 'outline outline-1 outline-red-400' : ''}`}
          aria-invalid={!!error}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}