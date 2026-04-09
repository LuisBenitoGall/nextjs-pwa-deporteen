'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function WhoAmI() {
  const [u, setU] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getSession().then(r => setU(r.data.session?.user ?? null));
  }, []);
  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Sesión (cliente)</h1>
      <pre className="text-sm bg-gray-100 p-3 rounded">{JSON.stringify(u, null, 2) || 'Sin sesión'}</pre>
    </main>
  );
}
