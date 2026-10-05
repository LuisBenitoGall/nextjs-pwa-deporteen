import Link from 'next/link';

type Props = {
  message: string;
  renewLabel: string;
};

/** Banner global (suscripción inactiva/vencida). Se muestra encima del Navbar. */
export default function SubscriptionExpiredBanner({ message, renewLabel }: Props) {
  return (
    <div
      role="alert"
      className="fixed left-0 right-0 top-0 z-[60] min-h-10 border-b border-red-300 bg-red-50 px-4 py-2 text-sm text-red-900 shadow-sm"
    >
      <div className="mx-auto flex h-full max-w-7xl flex-wrap items-center justify-center gap-2 sm:flex-nowrap sm:justify-between sm:gap-3">
        <p className="text-center font-medium sm:text-left">{message}</p>
        <Link
          href="/billing/renew"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 sm:text-sm"
        >
          {renewLabel}
        </Link>
      </div>
    </div>
  );
}
