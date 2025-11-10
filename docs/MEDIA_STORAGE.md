# Cómo Usar el Sistema de Medios

## 1. Tabla Necesaria

Asegúrate de que la tabla `match_media` tenga estos campos:

```sql
-- Ejecutar en Supabase SQL Editor
ALTER TABLE match_media ADD COLUMN IF NOT EXISTS local_id text;
CREATE INDEX IF NOT EXISTS idx_match_media_local_id ON match_media(local_id);
```

## 2. Cómo Usar el Componente

### En tu formulario:

```tsx
// 1. Importa el componente
import { MediaCaptureButton } from '@/components/MediaCaptureButton';

// 2. Úsalo en tu formulario
<MediaCaptureButton
  name="fotoPartido"
  label="Añadir foto"
  maxSizeMB={10}
  enableRecording={true}
  enableDrive={true} // Activar Google Drive en Android
/>
```

### Al guardar el formulario:

```typescript
// 1. Subir el archivo a Supabase
const { path } = await uploadToMatchMediaBucket(formData.fotoPartido);

// 2. Guardar en la base de datos
await createMatchMediaRecord({
  matchId: 'ID_DEL_PARTIDO',  // Obligatorio
  path: path,                 // Ruta en Supabase Storage
  mimeType: formData.fotoPartido.type,
  sizeBytes: formData.fotoPartido.size,
  localId: formData.fotoPartido_localId, // Se llena automáticamente
});
```

## 3. Mostrar una Imagen/Video

```typescript
// Para mostrar un medio (usa la URL local si está disponible)
const url = await getMediaUrl({
  local_id: media.local_id,
  storage_path: media.storage_path
});

// Ejemplo en JSX:
{media.mime_type.startsWith('image/') ? (
  <Image src={url} alt="Foto del partido" width={300} height={200} />
) : (
  <video src={url} controls width="100%" />
)}
```

## 4. ¿Qué Hace el Sistema?

1. **Al subir un archivo**:
   - Guarda una copia local en el navegador (IndexedDB)
   - Genera un ID único (`local_id`)
   - Sube el archivo a Supabase Storage
   - Guarda la referencia en `match_media`

2. **Al ver un archivo**:
   - Primero busca en el almacenamiento local
   - Si no está, lo descarga de Supabase

## 5. Ejemplo Práctico

### Para un formulario de incidencia:

```tsx
// En tu formulario
<MediaCaptureButton
  name="fotoIncidencia"
  label="Añadir foto de la incidencia"
  maxSizeMB={5}
/>

// Al guardar
const { path } = await uploadToMatchMediaBucket(formData.fotoIncidencia);
await createMatchMediaRecord({
  matchId: partidoId,
  path,
  mimeType: formData.fotoIncidencia.type,
  localId: formData.fotoIncidencia_localId,
  // ...otros campos de la incidencia
});
```

## 6. Integración con Google Drive

Para habilitar la selección de archivos desde Google Drive en dispositivos Android, sigue estos pasos:

1.  **Crea un proyecto en Google Cloud Console**.
2.  **Habilita las APIs "Google Picker API" y "Google Drive API"**.
3.  **Crea credenciales**: Necesitarás una **API Key** y un **OAuth 2.0 Client ID**.
    -   En la configuración del Client ID, añade `http://localhost:3000` (para desarrollo) y la URL de tu sitio en producción a las "Authorized JavaScript origins".
4.  **Añade las credenciales a tu proyecto**:
    Crea un archivo `.env.local` en la raíz y añade:
    ```
    NEXT_PUBLIC_GOOGLE_API_KEY=TU_API_KEY
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=TU_CLIENT_ID
    ```

El botón de Google Drive aparecerá automáticamente en Android si la prop `enableDrive` está a `true` y las variables de entorno están configuradas.

## 7. Solución de Problemas

- **No se ve la previsualización**: Revisa la consola del navegador (F12)
- **Error al subir**: Verifica la conexión a internet
- **El archivo es muy grande**: Aumenta `maxSizeMB` o comprime el archivo
