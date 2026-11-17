## 1. Textos

- [x] 1.1 Añadir en `src/i18n/messages/es/core.json`, `en/core.json` y `ca/core.json` los textos del selector, de la pregunta de destino (local, Drive, cancelar) y del aviso asociado, junto a las claves que ya usa la vista en vivo (`foto`, `video`, `galeria`)
  - Nota: el contrato limita los textos a es, en y ca. `locale-parity.test.ts` ya fallaba por otras claves; it, pt, eu y gl tampoco tienen estas cinco claves nuevas. No se han copiado. Cancelar reutiliza la clave existente `cancelar`.

## 2. Barra y cabecera

- [x] 2.1 Mover Editar de la barra inferior a la cabecera de `LiveMatchView`, inmediatamente a la derecha de «Partidos de la competición», con el mismo verde de ese enlace, y dejar la papelera a la derecha
- [x] 2.2 Añadir un único input de archivos existentes, sin `capture`, `accept="image/*,video/*"` y `multiple`, con el estilo de Foto, Vídeo y Galería, en el puesto que ocupaba Editar
- [x] 2.3 Mostrar ese input solo si `storedProvider` es `local` o `drive` y el helper de iOS no marca el dispositivo como iOS; mantenerlo oculto mientras la preferencia de almacenamiento carga
- [x] 2.4 Si el selector no se muestra, usar cinco columnas iguales (pantalla activa, Foto, Vídeo, Galería, Guardar) sin celda vacía; si se muestra, mantener seis columnas
- [x] 2.5 Dejar Foto y Vídeo con `capture="environment"`

## 3. Destino y guardado del lote

- [x] 3.1 Tras elegir al menos un archivo, preguntar destino local o Drive antes de escribir; si el usuario cierra sin elegir, no crear filas y vaciar el input
- [x] 3.2 Destino local: por cada archivo, `uploadMatchMedia` con `provider: 'local'` (copia en IndexedDB y fila `match_media`), sin `uploadMatchMediaToR2` y sin límites de cuota R2
- [x] 3.3 Destino Drive: por cada archivo, el mismo `POST /api/google/drive/upload` que la captura; si Drive no está disponible (503, `DRIVE_NOT_CONFIGURED`, `reconnect-required`), guardar ese archivo en local, no enviarlo a R2, reutilizar el aviso de reconexión y seguir con el siguiente
- [x] 3.4 Si Drive falla por otro motivo, mostrar el error como la captura, no procesar los archivos siguientes y conservar los ya guardados

## 4. iOS

- [x] 4.1 Añadir un helper best-effort que oculte el selector en iOS, con un comentario que deje claro que no cubre de forma fiable el iPad en modo escritorio y que esa heurística no es el contrato

## 5. Verificación

- [ ] 5.1 Comprobar en la vista en vivo: selector visible con opción local o Drive fuera de iOS; oculto con R2; Foto y Vídeo siguen abriendo la cámara; Editar está en la cabecera
- [ ] 5.2 Comprobar un lote local (copia y fila, visible en la galería de este navegador) y un lote Drive (mismo alta que una captura, galería por id de Drive)
- [ ] 5.3 Comprobar cancelar el destino (ninguna fila) y un fallo de Drive no disponible (local, sin R2, aviso vigente)
