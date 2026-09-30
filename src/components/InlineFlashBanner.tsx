'use client';

type Props = {
  variant: 'success' | 'error';
  message: string;
  onDismiss?: () => void;
};

export default function InlineFlashBanner({ variant, message, onDismiss }: Props) {
  const styles =
    variant === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-green-200 bg-green-50 text-green-800';

  return (
    <div className={`mb-4 flex items-start justify-between gap-3 rounded-xl border p-3 text-sm ${styles}`} role="status">
      <span>{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-medium underline opacity-80 hover:opacity-100"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
