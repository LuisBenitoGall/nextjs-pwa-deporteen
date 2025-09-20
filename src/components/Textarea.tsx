import * as React from 'react';

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
};

const TextareaComponent = React.forwardRef<HTMLTextAreaElement, Props>(
    ({ className = '', error, name, ...props }, ref) => (
        <div>
            <textarea
                ref={ref}
                name={name}
                className={
                'w-full bg-white rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ' +
                (error ? 'border-red-500 focus:ring-red-500 ' : '') +
                (className ? className : '')
                }
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    )
);

TextareaComponent.displayName = 'Textarea';
export default TextareaComponent;