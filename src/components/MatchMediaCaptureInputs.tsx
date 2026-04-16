'use client';

import { useId } from 'react';
import { useT } from '@/i18n/I18nProvider';

export type MatchMediaCaptureInputsProps = {
  busyMedia: boolean;
  onFilesSelected: (
    fileList: FileList | null,
    kind: 'image' | 'video',
    inputEl?: HTMLInputElement | null
  ) => void | Promise<void>;
};

/**
 * Entradas nativas de foto y vídeo para la vista LIVE del partido.
 * Misma UX en todos los deportes: `capture="environment"` en ambos para que
 * móviles usen la cámara trasera de forma coherente (antes el vídeo usaba
 * `capture` booleano, con comportamiento distinto según navegador).
 */
export function MatchMediaCaptureInputs({ busyMedia, onFilesSelected }: MatchMediaCaptureInputsProps) {
  const t = useT();
  const uid = useId();
  const photoId = `${uid}-match-photo`;
  const videoId = `${uid}-match-video`;

  return (
    <>
      <label htmlFor={photoId} className="block responsive-button cursor-pointer">
        <input
          id={photoId}
          name="match_media_photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={busyMedia}
          onChange={(e) => onFilesSelected(e.currentTarget.files, 'image', e.currentTarget)}
        />
        <span
          className={`grid place-content-center gap-1 border rounded-lg text-xs ${
            busyMedia ? 'opacity-60 pointer-events-none' : ''
          } border-gray-300`}
        >
          <span className="text-base text-center" aria-hidden>
            {busyMedia ? '⏳' : '📷'}
          </span>
          <span className="font-medium">{t('foto') || 'Foto'}</span>
        </span>
      </label>

      <label htmlFor={videoId} className="block responsive-button cursor-pointer">
        <input
          id={videoId}
          name="match_media_video"
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          disabled={busyMedia}
          onChange={(e) => onFilesSelected(e.currentTarget.files, 'video', e.currentTarget)}
        />
        <span
          className={`grid place-content-center gap-1 border rounded-lg text-xs ${
            busyMedia ? 'opacity-60 pointer-events-none' : ''
          } border-gray-300`}
        >
          <span className="text-base text-center" aria-hidden>
            {busyMedia ? '⏳' : '🎥'}
          </span>
          <span className="font-medium">{t('video') || 'Vídeo'}</span>
        </span>
      </label>
    </>
  );
}
