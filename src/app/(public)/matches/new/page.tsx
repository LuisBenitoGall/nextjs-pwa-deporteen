import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';
import TitleH1 from '@/components/TitleH1';

export default async function MatchesNewShortcutPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/matches/new');

  const { data: me } = await supabase.from('users').select('locale').eq('id', user.id).maybeSingle();
  const { t } = await tServer(me?.locale || undefined);

  const { data: players } = await supabase
    .from('players')
    .select('id, full_name')
    .eq('user_id', user.id)
    .eq('status', true)
    .order('created_at', { ascending: false });

  if (players?.length === 1) {
    redirect(`/players/${players[0].id}/matches/new`);
  }

  return (
    <div className="max-w-xl mx-auto">
      <TitleH1>{t('partido_nuevo') || 'Nuevo partido'}</TitleH1>
      <p className="text-sm text-gray-600 mb-4">
        {t('partido_nuevo_selecciona_deportista') || 'Selecciona el deportista para el que quieres registrar un partido.'}
      </p>

      {!players?.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="text-sm">{t('sin_deportistas')}</p>
          <Link href="/players/new" className="mt-3 inline-block text-sm font-semibold text-green-700 underline">
            {t('deportista_agregar') || 'Añadir deportista'}
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {players.map((p) => (
            <li key={p.id}>
              <Link
                href={`/players/${p.id}/matches/new`}
                className="block rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
              >
                {p.full_name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
