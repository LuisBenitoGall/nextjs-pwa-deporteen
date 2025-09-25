import Link from 'next/link';
import { APP, ROUTES } from '@/config/constants';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-green-100 bg-green-50 text-sm text-gray-700">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Menú común */}
          <div>
            <h3 className="mb-2 font-semibold text-gray-900">Menú</h3>
            <ul className="space-y-1">
              <li><Link className="hover:underline" href={ROUTES.HOME}>Inicio</Link></li>
              <li><Link className="hover:underline" href={ROUTES.SUBSCRIPTION}>Suscripción</Link></li>
              <li><Link className="hover:underline" href={ROUTES.PLAYERS_NEW}>Crear deportista</Link></li>
              <li><Link className="hover:underline" href="/contacto">Contacto</Link></li>
            </ul>
          </div>

          {/* Legales */}
          <div>
            <h3 className="mb-2 font-semibold text-gray-900">Legal</h3>
            <ul className="space-y-1">
              <li><Link className="hover:underline" href="/legal/terms">Términos y condiciones</Link></li>
              <li><Link className="hover:underline" href="/legal/privacy">Política de privacidad</Link></li>
              <li><Link className="hover:underline" href="/legal/cookies">Política de cookies</Link></li>
              <li><Link className="hover:underline" href="/legal/notice">Aviso legal</Link></li>
            </ul>
          </div>

          {/* Marca */}
          <div>
            <h3 className="mb-2 font-semibold text-gray-900">{APP.NAME}</h3>
            <p className="text-gray-600">Powered by XXXX</p>
            <p className="mt-2 text-gray-600">© {year} {APP.NAME}. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
