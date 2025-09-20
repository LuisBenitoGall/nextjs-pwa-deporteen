// src/app/dashboard/media-test/page.tsx
'use client';

import { useState } from 'react';
import { uploadToMatchMediaBucket, createMatchMediaRecord } from '@/lib/storage/media';

export default function MediaTestPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    setPreview(null);
    try {
  const { path, signedUrl } = await uploadToMatchMediaBucket(file);

      await createMatchMediaRecord({
        matchId: 'UUID-del-partido',
        path,                  // la ruta devuelta por upload
        mimeType: file.type,
        sizeBytes: file.size,
      });



      setPreview(signedUrl);
      setMsg('Subida OK. URL firmada generada.');
    } catch (err: any) {
      setMsg(err.message ?? 'Error subiendo archivo');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Prueba de subida a match-media</h1>

      <input
        type="file"
        accept="image/*,video/*"
        onChange={handleUpload}
        disabled={busy}
        className="block w-full"
      />

      {msg && <div className="text-sm text-gray-700">{msg}</div>}

      {preview && (
        <div className="mt-4">
          {/* Si es imagen, mostrar <img>; si es vídeo, <video> */}
          {preview.includes('content-type=image') || preview.match(/(?:jpg|jpeg|png|gif|webp)/i) ? (
            <img src={preview} alt="preview" className="rounded-md border" />
          ) : (
            <video src={preview} controls className="rounded-md border max-w-full" />
          )}
        </div>
      )}
    </main>
  );
}
