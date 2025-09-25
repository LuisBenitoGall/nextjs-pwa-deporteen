import React from 'react';

interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  error?: string;
}

export default function Radio({ label, error, ...props }: RadioProps) {
  return (
    <div className="mb-2">
      <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
        <input
          type="radio"
          className={`h-6 w-6 md:h-5 md:w-5 cursor-pointer accent-green-600 ${error ? 'outline outline-1 outline-red-400' : ''}`}
          aria-invalid={!!error}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
