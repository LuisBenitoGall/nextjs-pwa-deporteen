'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFormStatus } from 'react-dom';
import { useT } from '@/i18n/I18nProvider';

type Props = {
  onConfirm: ((formData: FormData) => Promise<void>) | (() => Promise<void>);
  label?: string;         // si lo pasas, se muestra texto; si no, se muestra el icono papelera
  ariaLabel?: string;     // accesible cuando usas solo icono
  className?: string;

  // Overrides del modal
  confirmTitle?: string;
  confirmMessage?: string;
  confirmCta?: string;
  cancelCta?: string;
};

export default function ConfirmDeleteButton({
  onConfirm,
  label,               // sin default → detectamos "undefined" para icono
  ariaLabel,
  className,
  confirmTitle,
  confirmMessage,
  confirmCta,
  cancelCta,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const title = confirmTitle ?? t('cancelacion_confirmar');
  const message = confirmMessage ?? t('cuenta_cancelar_texto_modal');
  const okText = confirmCta ?? t('cancelacion_confirmar');
  const cancelText = cancelCta ?? t('volver_atras');

  // Trigger content: texto si hay label, icono si no
  const triggerContent = label ? (
    <span>{label}</span>
  ) : (
    <span className="inline-flex items-center">
      {/* Papelera roja, stroke hereda currentColor */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-red-500"
        aria-hidden="true"
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
      <span className="sr-only">{ariaLabel || t('eliminar') || 'Eliminar'}</span>
    </span>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel || label}
        className={
          className ??
          'inline-flex items-center rounded-xl bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200'
        }
      >
        {triggerContent}
      </button>

      {open && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden="true" />
            <div className="relative z-[1001] w-full max-w-md rounded-2xl bg-white shadow-xl">
              <div className="px-6 pt-5">
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
              </div>
              <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {cancelText}
                </button>
                <form action={onConfirm as any}>
                  <SubmitDanger label={okText} />
                </form>
              </div>
            </div>
          </div>,
          document.body
        )
      }
    </>
  );
}

function SubmitDanger({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-white ${
        pending ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
      }`}
    >
      {pending ? '...' : label}
    </button>
  );
}
