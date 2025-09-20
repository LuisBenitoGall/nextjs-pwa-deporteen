// components/MatchNewButton.tsx
'use client';
import { useCanCreateMatch } from '@/hooks/useCanCreateMatch';
import { useRouter } from 'next/navigation';

export default function MatchNewButton({ playerId }: { playerId: string }) {
  const router = useRouter();
  const { loading, allowed } = useCanCreateMatch(playerId);

  const onClick = () => {
    if (!allowed) return;
    router.push(`/players/${playerId}/matches/new`);
  };

  const label = loading ? 'Comprobando…' : allowed ? 'Nuevo partido' : 'Renueva acceso para crear';

  return (
    <button
      onClick={onClick}
      disabled={loading || !allowed}
      className={`px-4 py-2 rounded text-white ${allowed ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
      title={allowed ? 'Crear nuevo partido' : 'Tu acceso está caducado para este jugador'}
    >
      {label}
    </button>
  );
}
