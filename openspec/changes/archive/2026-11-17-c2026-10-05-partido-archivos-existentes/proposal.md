## Why

En la vista en vivo del partido solo se pueden añadir fotos y vídeos abriendo la cámara. Quien ya los tiene en el dispositivo no puede adjuntarlos al partido y verlos en la galería como el resto de medios.

## What Changes

- Selector único en la barra inferior de la vista en vivo para adjuntar fotos y vídeos ya existentes (varios a la vez, sin abrir la cámara). Ocupa el hueco que deja Editar.
- Editar pasa a la cabecera, a la derecha de «Partidos de la competición», con el mismo verde de ese enlace. La papelera permanece a la derecha.
- Tras elegir el lote, el usuario elige destino: local o Drive. R2 no es destino de este flujo.
- Destino local: copiar cada archivo al almacenamiento de la app y crear la fila del partido, visible y reproducible en la galería de este navegador como cualquier medio local.
- Destino Drive: subir cada archivo con el mismo proceso que una captura nueva del partido cuando el destino es Drive, incluida la reconexión ya existente si Drive no está disponible.
- El selector solo se muestra si la opción de almacenamiento configurada es local o Drive y el dispositivo no es iOS. Si no se muestra, la barra no reserva una celda vacía.
- Foto y Vídeo siguen abriendo la cámara trasera. La galería no cambia como interfaz de visualización.

## Capabilities

### New Capabilities

Ninguna. El comportamiento nuevo se añade al spec de partidos.

### Modified Capabilities

- `matches`: RF-5 admite, además de la cámara, archivos ya existentes en el dispositivo, con destino local o Drive y la disposición de barra y cabecera de este change. La galería sigue siendo solo visualización.

## Impact

- Vista en vivo: `src/app/(public)/matches/[id]/live/LiveMatchView.tsx`, `src/components/MatchMediaCaptureInputs.tsx`.
- Alta de medios: `src/lib/uploadMatchMedia.ts` y el flujo Drive de la captura del partido.
- Galería (sin cambio de interfaz): `src/lib/matchMedia/resolveSources.ts`, `src/app/(public)/matches/[id]/gallery/page.tsx`.
- Opción de almacenamiento: `src/hooks/useStorageProvider.ts`.
- Textos nuevos en el i18n propio (es, en, ca).
- Spec vigente de medios (`openspec/specs/media/spec.md`): Drive y local siguen fuera de la cuota R2. Este flujo no añade límites de cuota ni de duración.
