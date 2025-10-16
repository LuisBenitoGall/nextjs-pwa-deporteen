'use client';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  title?: string;
  subtitle?: string;
};

export default function BlockingLoader({ open, title, subtitle }: Props) {
  if (!open) return null;

  const body = typeof document !== 'undefined' ? document.body : null;
  const content = (
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm grid place-items-center"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-busy="true"
      aria-label={title || 'Procesando'}
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white/95 shadow-2xl p-6 text-center">
        {/* Spinner */}
        <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        {/* Mensajes */}
        <h2 className="text-base font-semibold text-gray-900">
          {title || 'Guardando archivo…'}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
        )}
        {/* Barra "indeterminada" */}
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="h-full w-1/3 animate-[loader_1.2s_ease-in-out_infinite] bg-emerald-500" />
        </div>

        {/* SR-only para lectores */}
        <span className="sr-only">La interfaz está bloqueada mientras se completa la operación.</span>
      </div>

      <style jsx global>{`
        @keyframes loader {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(110%); }
          100% { transform: translateX(110%); }
        }
      `}</style>
    </div>
  );

  return body ? createPortal(content, body) : content;
}
