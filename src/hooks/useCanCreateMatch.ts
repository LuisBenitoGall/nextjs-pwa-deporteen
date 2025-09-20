// hooks/useCanCreateMatch.ts
import { useEffect, useState } from 'react';

type Result = { loading: boolean; allowed: boolean; error?: string };

export function useCanCreateMatch(playerId?: string) : Result {
  const [state, setState] = useState<Result>({ loading: true, allowed: false });

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!playerId) { setState({ loading: false, allowed: false, error: 'no_player' }); return; }

      try {
        const res = await fetch('/api/guards/can-create-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId }),
        });
        const data = await res.json();
        if (!alive) return;

        if (!res.ok) {
          // Fallback offline: si no hay red, intenta leer de cache (localStorage)
          const cached = localStorage.getItem(`paa:${playerId}`);
          const allowed = cached ? JSON.parse(cached)?.is_active === true : false;
          setState({ loading: false, allowed, error: data?.reason || 'network' });
          return;
        }

        // cachea último estado para offline
        try { localStorage.setItem(`paa:${playerId}`, JSON.stringify({ is_active: data.ok })); } catch {}
        setState({ loading: false, allowed: !!data.ok });
      } catch {
        const cached = localStorage.getItem(`paa:${playerId}`);
        const allowed = cached ? JSON.parse(cached)?.is_active === true : false;
        setState({ loading: false, allowed, error: 'network' });
      }
    })();
    return () => { alive = false; };
  }, [playerId]);

  return state;
}
