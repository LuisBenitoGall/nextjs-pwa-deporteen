'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X, Shield } from 'lucide-react';
import AdminNav from './AdminNav';

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-800 lg:bg-slate-950">
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
          <Shield className="h-5 w-5 text-emerald-400" />
          <Link href="/admin" className="text-sm font-semibold text-slate-100">
            Admin Panel
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>
        <div className="border-t border-slate-800 px-6 py-4">
          <Link
            href="/dashboard"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Volver a la app
          </Link>
        </div>
      </aside>

      {/* Mobile header bar */}
      <div className="flex h-14 items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Shield className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-semibold text-slate-100">Admin Panel</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-200 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-slate-100">Admin Panel</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav onNavigate={() => setMobileOpen(false)} />
        </div>
        <div className="border-t border-slate-800 px-6 py-4">
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Volver a la app
          </Link>
        </div>
      </div>
    </>
  );
}
