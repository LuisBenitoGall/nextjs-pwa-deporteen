import Link from 'next/link';

type Props = {
  title: string;
  body: string;
  renewLabel: string;
  urgency: 'info' | 'warning' | 'critical';
};

const styles: Record<Props['urgency'], { border: string; bg: string; title: string; body: string }> = {
  info: {
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    title: 'text-blue-900',
    body: 'text-blue-800',
  },
  warning: {
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    title: 'text-amber-900',
    body: 'text-amber-800',
  },
  critical: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    title: 'text-red-900',
    body: 'text-red-800',
  },
};

export default function SubscriptionExpiryBanner({ title, body, renewLabel, urgency }: Props) {
  const s = styles[urgency];
  return (
    <div className={`mt-4 rounded-2xl border ${s.border} ${s.bg} p-4 sm:p-5 shadow-sm`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={`text-sm font-semibold ${s.title}`}>{title}</div>
          <div className={`text-sm ${s.body}`}>{body}</div>
        </div>
        <Link
          href="/billing/renew"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          {renewLabel}
        </Link>
      </div>
    </div>
  );
}
