# Medios y almacenamiento remoto (Deporteen)

## Descripción

Reglas de negocio para medios de partido en **almacenamiento remoto facturable** (infraestructura DeporTeen: R2 / Supabase legacy), **cuota por usuario**, **guardrails de vídeo** y **umbrales de uso** en UI. Google Drive del usuario y almacenamiento local quedan fuera de esta cuota.

**Implementación de referencia:** `src/lib/cloud/*`, `src/lib/cloud/guardrails.ts`, `POST /api/remote-media/upload` (alias `POST /api/r2/upload`), `GET /api/cloud/usage`, `POST /api/storage/provider`, `POST /api/player-avatar/upload`.

**Histórico:** requisitos RF-REM-* consolidados aquí desde el change `c2026-09-26-remote-storage-access-guards` y desde código introducido en `6e6da67` (guardrails R2/vídeo), sin duplicar deltas en `changes/`.

## Pendiente de confirmación de producto (Luis)

Los valores numéricos siguientes reflejan **el código en `master` hoy**. No consta aprobación explícita en OpenSpec previo. Cualquier cambio de producto MUST editar esta spec (y, si aplica, `guardrails.ts` + tests) en bloque.

| Parámetro | Valor en código |
|---|---|
| Tamaño máximo por fichero de vídeo (remoto) | 250 MiB (`MAX_VIDEO_FILE_BYTES`) |
| Duración máxima de vídeo si `plan_gb` &lt; 50 | 60 s |
| Duración máxima si `plan_gb` ≥ 50 y &lt; 200 | 180 s |
| Duración máxima si `plan_gb` ≥ 200 | 600 s |
| Umbrales de aviso en UI (% de cuota usada) | 70, 85, 95, 100 |

Planes comerciales locales (`src/lib/storage-plans.ts`): **10, 50 y 200 GB** — alineados con los escalones de duración anteriores.

---

## Requisitos funcionales

### RF-REM-1 Suscripción de almacenamiento obligatoria

El sistema MUST rechazar subidas a almacenamiento remoto **facturable** si el usuario no tiene suscripción de almacenamiento activa.

**Definición operativa (código):** existe fila en `storage_subscriptions` con `status = 'active'`, `current_period_end` ≥ ahora, y `gb_amount` &gt; 0 (`getActiveCloudPlanGb`).

**HTTP / códigos:**

| Código | HTTP | Cuándo |
|---|---|---|
| `UNAUTHORIZED` | 401 | Sin sesión |
| `NO_ACTIVE_STORAGE_SUBSCRIPTION` | 403 | Sin plan activo o `gb_amount` ≤ 0 |
| `QUOTA_EXCEEDED` | 409 | `bytes_used + file.size` &gt; `bytes_quota` |

Mensajes usuario (servidor): ver `userMessageForRemoteAccess` en `remote-access.ts`.

**También aplica a:** elegir proveedor `r2` o `supabase` en `POST /api/storage/provider` (403 `NO_ACTIVE_STORAGE_SUBSCRIPTION`). Avatares remotos: `POST /api/player-avatar/upload`.

**No aplica a:** Google Drive (`drive`), almacenamiento `local`, ni medios que no pasen por las rutas API facturables.

`NEXT_PUBLIC_CLOUD_MEDIA=1` **no** omite la suscripción en el flujo actual (`uploadMatchMedia.ts`: flag legacy solo influye en proveedor por defecto, no en validación API).

### RF-REM-2 Cuota por usuario

La cuota MUST ser **por usuario** (`match_media.user_id`), sumando `size_bytes` de **todos** sus jugadores.

**Filas que cuentan:** `deleted_at IS NULL` y proveedor facturable según `isBillableRemoteMediaRow`:

- `storage_provider` ∈ `r2`, `supabase`
- O `storage_path` con prefijo `r2:` (legacy)
- O filas con `storage_path` no vacío y sin prefijo `drive:` (legacy Supabase bucket)

**Excluidos:** `drive`, `local`, rutas `drive:*`.

**Cálculo:** `bytes_quota = plan_gb × 1024³` (`BYTES_PER_GB`). `bytes_remaining = max(0, bytes_quota - bytes_used)`. `percentage_used = min(100, bytes_used / bytes_quota × 100)` con dos decimales.

**Bloqueo de subida por cuota:** solo cuando `bytes_used + file.size > bytes_quota` (`hasQuotaForUpload`). **No** hay bloqueo adicional al 95 % de uso: ver RF-REM-6 e incoherencias.

### RF-REM-3 Solo servidor para remoto facturable

Las subidas que consumen cuota DeporTeen MUST hacerse por API:

- `POST /api/remote-media/upload`
- `POST /api/r2/upload` (misma lógica: `processRemoteMatchMediaUpload`)

El cliente MUST NOT escribir directamente en Supabase Storage para medios de partido facturables (`uploadToMatchMediaBucket` deshabilitado con error explícito).

El cliente puede guardar copia local en IndexedDB (`device_uri`) antes o en paralelo; la fila `match_media` y el objeto remoto los crea/actualiza el servidor tras validar.

### RF-REM-4 Proveedor físico intercambiable

Backend seleccionado por `REMOTE_STORAGE_BACKEND` (`r2` por defecto, o `supabase`). Registro en `getRemoteStorageBackend`. Añadir un proveedor MUST implicar nueva implementación de `RemoteStorageBackend` sin relajar RF-REM-1…3.

### RF-REM-5 Google Drive del usuario

Subidas a Drive del usuario MUST seguir disponibles **sin** suscripción de almacenamiento DeporTeen y MUST NOT consumir cuota remota DeporTeen (`drive` excluido del cómputo).

### RF-REM-6 Umbrales de uso (solo UI y mensajes)

Constantes: `CLOUD_USAGE_THRESHOLDS` — 70, 85, 95, 100. Función `getCloudUsageLevel(percentage_used)` devuelve:

| % usado (≥) | Nivel | Comportamiento en código |
|---|---|---|
| &lt; 70 | `ok` | Barra verde; sin banner de aviso |
| 70 | `info70` | Banner + `cloud_usage_info_70` |
| 85 | `warn85` | Banner + `cloud_usage_warn_85` |
| 95 | `warn95` | Banner + `cloud_usage_warn_95` (constante interna `block95` — **nombre engañoso**, ver abajo) |
| 100 | `full100` | Banner + `cloud_usage_full_100`; barra roja |

**Componente:** `CloudUsageStatus` (cuando `enabled`). CTAs a `/subscription/storage` y `/gallery`.

**Importante:** estos umbrales **no** impiden subir archivos. La página en vivo y la API **no** consultan `getCloudUsageLevel` para bloquear; solo comprueban cuota en bytes (RF-REM-2) y reglas de vídeo (RF-REM-7).

### RF-REM-7 Límites de vídeo en remoto facturable

Solo si `file.type` empieza por `video/`:

1. **Tamaño:** `file.size ≤ MAX_VIDEO_FILE_BYTES` (250 MiB). Si no: HTTP 413, código `VIDEO_FILE_TOO_LARGE`.
2. **Duración:** el cliente MUST enviar `duration_seconds` &gt; 0 (metadata leída en cliente en live/upload). Si falta o no es válida: HTTP 400, `VIDEO_METADATA_UNREADABLE`.
3. **Duración vs plan:** `duration_seconds ≤ getMaxVideoDurationSeconds(plan_gb)` (tabla pendiente de confirmación arriba). Si no: HTTP 400, `VIDEO_DURATION_EXCEEDED`.

**Imágenes:** no hay tope de tamaño por archivo distinto de la cuota total (solo RF-REM-2).

**Cliente (partido en vivo):** valida tamaño, duración y cuota antes de llamar a `/api/r2/upload` (mensajes i18n `cloud_usage_block_*`); el servidor vuelve a validar (no confiar solo en cliente).

### RF-REM-8 API de uso

`GET /api/cloud/usage` (autenticado) devuelve snapshot `bytes_used`, `bytes_quota`, `bytes_remaining`, `percentage_used`, `plan_gb`. Cache-Control privado ~15 s.

### RF-REM-9 Concurrencia de subida

`processRemoteMatchMediaUpload` ejecuta bajo `runWithKeyLock(userId)` — una subida remota por usuario a la vez en el mismo proceso (cola en memoria).

### RF-REM-10 Reintentos cliente (cola)

Si `uploadMatchMedia` recibe error **no** permanente (distinto de 403/409 y códigos de suscripción/cuota), encola reintento vía `mediaSync` (`enqueue`). Errores permanentes de denegación no se reencolan.

---

## Incoherencias y notas (no maquillar)

1. **`block95` no bloquea subidas.** La constante se llama `block95` y el nivel `warn95`, pero **solo** cambian copy y color en `CloudUsageStatus`. Hasta el 100 % de bytes usados el usuario puede seguir subiendo si `bytes_used + file.size ≤ bytes_quota`. Si el producto quisiera bloquear al 95 %, hoy **no** está implementado — solo aviso.
2. **Delta antiguo `c2026-09-26-remote-storage-access-guards`** no mencionaba vídeo ni umbrales 70/85/95; eso vivía solo en código.
3. **Escalones de duración vs planes intermedios:** si en BD hubiera `gb_amount` entre 50 y 199 (p. ej. 100), el código aplicaría 180 s (rama `≥ 50`), no 60 s. Solo hay 10/50/200 en catálogo local.
4. **Doble validación:** live valida en cliente y API en servidor; pueden divergir si manipulan peticiones, pero la API es autoritativa.

---

## Otros comportamientos relacionados (fuera de este documento)

- Sincronización offline / cola `mediaSync`: ver `openspec/specs/pwa/spec.md` y código `src/lib/mediaSync.ts`.
- Planes y precios de almacenamiento: `openspec/specs/subscriptions/spec.md` y `storage-plans.ts`.

## Casos de verificación (suite / manual)

- `src/lib/cloud/guardrails.test.ts` — umbrales, cuota, vídeo.
- `src/lib/cloud/remote-access.test.ts` — códigos de denegación.
- Con suscripción inactiva: 403 en upload remoto y al fijar proveedor `r2`.
- Con cuota llena en bytes: 409 `QUOTA_EXCEEDED` aunque `percentage_used` muestre 100 en UI.
