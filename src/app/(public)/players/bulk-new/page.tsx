import { redirect } from 'next/navigation';

/** Ruta legacy post-checkout: redirige al alta estándar de deportista. */
export default function PlayersBulkNewRedirectPage() {
  redirect('/players/new');
}
