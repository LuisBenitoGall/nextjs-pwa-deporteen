## Context

La vista en vivo (`LiveMatchView`) guarda fotos y vídeos con `MatchMediaCaptureInputs`: dos inputs con `capture="environment"`. La barra inferior es una rejilla de seis celdas: pantalla activa, Foto, Vídeo, Galería, Editar, Guardar. Editar está en esa barra; la cabecera tiene «Partidos de la competición» y, a la derecha, la papelera.

`onFilesSelected` recorre el `FileList` de uno en uno. Con proveedor efectivo `local` llama a `uploadMatchMedia` (`provider: 'local'`), que copia el blob a IndexedDB (`device_uri`) e inserta `match_media`. Con `drive` hace `POST /api/google/drive/upload`. Si Drive responde 503, `DRIVE_NOT_CONFIGURED` o `reconnect-required`, ese archivo se guarda en local con `uploadMatchMedia`, se aplica `applyDriveReconnectFallback` en `reconnect-required`, y el bucle sigue. Otro error de Drive lanza, corta el resto del lote y deja guardado lo ya procesado. El input se vacía en el `finally`. Con `r2` usa `uploadMatchMediaToR2` y las reglas de cuota de `openspec/specs/media/spec.md`. Drive y local quedan fuera de esa cuota.

La galería resuelve el blob local con `device_uri` y el medio de Drive con `google_drive_file_id`. No distingue si el archivo salió de la cámara o del selector.

`useStorageProvider` separa `storedProvider` (opción configurada) de `provider` (efectivo).

## Goals / Non-Goals

**Goals:**

- Un solo selector de archivos ya existentes en el hueco de Editar, varios archivos, imagen y vídeo, sin `capture`.
- Editar en la cabecera, a la derecha de «Partidos de la competición», con el mismo verde de ese enlace.
- Preguntar destino del lote (local o Drive) antes de guardar.
- Reutilizar la tubería local y la tubería Drive de la captura, incluida la reconexión ya existente.
- Ocultar el selector si la opción configurada es R2 o el dispositivo es iOS, sin celda vacía.

**Non-Goals:**

- Subir este flujo a R2 ni aplicar límites de cuota o duración de R2.
- Mostrar el selector en iOS.
- Cambiar la galería como interfaz, ni Foto/Vídeo de la cámara.
- Guardar solo el nombre del archivo, o añadir una columna de nombre original.
- Fijar las claves i18n en este diseño.

## Decisions

1. **El selector es otro input en la barra, no un modo del input de cámara.** Foto y Vídeo conservan `capture="environment"`. El nuevo input no lleva `capture`, acepta `image/*,video/*` y `multiple`. El estilo es el de Foto, Vídeo y Galería (borde, icono, texto corto), no el de Guardar. Alternativa descartada: quitar `capture` de Foto/Vídeo para que el sistema ofrezca carrete y cámara. El brief mantiene la cámara en esos botones.

2. **La visibilidad usa `storedProvider`, no el proveedor efectivo.** El selector se muestra solo si la opción configurada es `local` o `drive` y el dispositivo no es iOS. Si es `r2`, no se muestra. Mientras la preferencia aún carga, el selector no se muestra, para no enseñarlo un instante a quien tiene R2. Alternativa descartada: usar `provider` efectivo, que puede ser `local` aunque la opción guardada sea Drive o R2.

3. **El destino del lote se pregunta después de elegir archivos y antes de cualquier escritura.** Opciones: local o Drive. Cerrar sin elegir no crea filas y vacía el input. Un usuario con opción local puede mandar ese lote a Drive, y uno con opción Drive puede dejarlo en local. R2 no sale en la pregunta. Alternativa descartada: guardar siempre con `storedProvider` y no preguntar.

4. **Local reutiliza `uploadMatchMedia` con `provider: 'local'`.** Eso copia el archivo a IndexedDB y crea la fila. El `kind` lo clasifica el helper por MIME (`image/` o `video/`), igual que hoy. No se llama a `uploadMatchMediaToR2`. Alternativa descartada: guardar el nombre del archivo del carrete sin copia. Ese nombre no reabre el archivo.

5. **Drive reutiliza el `POST /api/google/drive/upload` y el tratamiento de fallo ya escrito en `onFilesSelected`.** Mismo cuerpo (`file`, `matchId`, `playerId`). Si Drive no está disponible (503, `DRIVE_NOT_CONFIGURED`, `reconnect-required`), ese archivo se guarda en local, no se envía a R2, y el aviso de reconexión es el que ya existe. El resto de errores cortan el lote como hoy. Alternativa descartada: una política nueva de lote atómico o de reintento distinto.

6. **Si el selector no está, la barra pasa a cinco columnas iguales.** Pantalla activa, Foto, Vídeo, Galería y Guardar ocupan el ancho. No queda una sexta celda vacía. Con el selector visible, la rejilla sigue en seis: el selector ocupa el puesto de Editar.

7. **No hay cambio de esquema.** `match_media` no gana columna de nombre original. La galería sigue resolviendo por `device_uri` o `google_drive_file_id`.

8. **iOS es un criterio de producto, no una cadena de user-agent contratada.** El spec exige ocultar el selector cuando el dispositivo es iOS. La detección es frágil (iPad en modo escritorio) y no forma parte del contrato. La implementación usa un helper propio, comentado como best-effort, sin presentar esa heurística como requisito.

9. **Textos nuevos en el i18n que ya carga la vista** (`src/i18n/messages/{es,en,ca}/core.json`, junto a claves como `foto`). El brief limita esos tres idiomas.

## Risks / Trade-offs

- [Detección de iOS incompleta en iPad modo escritorio] → El selector puede mostrarse. El spec no exige una heurística concreta; el helper debe dejar esa limitación escrita en código.
- [Fallo de Drive guarda ese archivo en local] → Es el tratamiento vigente de la captura. Reutilizarlo evita inventar otra política. El archivo no va a R2. El usuario ve el aviso de reconexión ya existente.
- [Un error no recuperable corta el resto del lote] → Los archivos anteriores quedan guardados, igual que en Foto/Vídeo. No hay transacción de lote.
- [Preferencia aún cargando] → El selector permanece oculto hasta conocer `storedProvider`, para no ofrecerlo a R2 por un estado inicial `local`.

## Migration Plan

No hay migración de datos ni de variables de entorno. El despliegue es el de la PWA. Rollback: revertir la vista en vivo y los textos. Los medios ya copiados a IndexedDB o subidos a Drive se quedan; se leen con la galería actual.

## Open Questions

- Qué comprobación concreta marca un dispositivo como iOS. El contrato solo dice que, si es iOS, el selector no se muestra. No se da por buena ninguna heurística sin comprobar, incluido el iPad en modo escritorio.
