'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  CreditCard,
  Trophy,
  User,
  Medal,
  BarChart3,
  FileText,
  Settings,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Tag,
  Receipt,
  Package,
  Link2,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/suscripciones', label: 'Suscripciones', icon: CreditCard },
  { href: '/admin/partidos', label: 'Partidos', icon: Trophy },
  { href: '/admin/jugadores', label: 'Jugadores', icon: User },
  { href: '/admin/competiciones', label: 'Competiciones', icon: Medal },
  { href: '/admin/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { href: '/admin/reportes', label: 'Reportes', icon: FileText },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
];

const stripeItems = [
  { href: '/admin/stripe/products', label: 'Productos', icon: Package },
  { href: '/admin/stripe/prices', label: 'Precios', icon: Tag },
  { href: '/admin/stripe/coupons', label: 'Cupones', icon: Tag },
  { href: '/admin/stripe/subscriptions', label: 'Subs. Stripe', icon: CreditCard },
  { href: '/admin/stripe/invoices', label: 'Facturas', icon: Receipt },
  { href: '/admin/stripe/payment-links', label: 'Payment Links', icon: Link2 },
];

interface AdminNavProps {
  onNavigate?: () => void;
}

export default function AdminNav({ onNavigate }: AdminNavProps) {
  const pathname = usePathname();
  const [stripeOpen, setStripeOpen] = useState(
    pathname.startsWith('/admin/stripe')
  );

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-emerald-600/20 text-emerald-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-2">
        <button
          onClick={() => setStripeOpen((prev) => !prev)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          <CreditCard className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Stripe</span>
          {stripeOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        {stripeOpen && (
          <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-slate-700 pl-3">
            {stripeItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'text-emerald-400'
                      : 'text-slate-500 hover:text-slate-200'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
