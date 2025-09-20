'use client';

import * as React from 'react';

type SubmitProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    text: string; // Text when idle
    loadingText?: string; // Text when loading
    loading?: boolean; // Loading state
    onClick?: React.MouseEventHandler<HTMLButtonElement>; // Optional click handler
};

export default function Submit({
    text,
    loadingText = 'Procesando…',
    loading = false,
    className,
    disabled,
    type = 'submit',
    onClick,
    ...rest
}: SubmitProps) {
    const base =
    'w-full bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-60';

    return (
        <button
        type={type}
        disabled={loading || disabled}
        className={`${base}${className ? ` ${className}` : ''}`}
        onClick={onClick}
        {...rest}
        >
            {loading ? loadingText : text}
        </button>
    );
}
