# Progressive Web App (PWA)

## Descripción

Funcionalidades de Progressive Web App que permiten instalación, funcionamiento offline, notificaciones y experiencia de aplicación nativa.

## Requisitos Funcionales

### RF-1: Instalación de PWA

**Descripción**: Usuario puede instalar la aplicación en su dispositivo.

**Criterios de Aceptación**:
- Banner de instalación aparece cuando es posible instalar
- Manifest válido (`/manifest.webmanifest`)
- Iconos en múltiples tamaños
- Instalación desde navegador (Add to Home Screen)
- Tras instalación, se abre como app independiente
- Service Worker registrado correctamente

**Flujo**:
1. Usuario visita la app
2. Sistema detecta que es instalable
3. Banner de instalación aparece
4. Usuario hace clic en instalar
5. App se instala
6. Se abre como app independiente

### RF-2: Service Worker y Funcionamiento Offline

**Descripción**: La aplicación funciona parcialmente sin conexión a internet.

**Criterios de Aceptación**:
- Service Worker registrado automáticamente
- Cache de recursos estáticos
- Páginas principales accesibles offline
- Mensaje informativo cuando no hay conexión
- Sincronización automática cuando se recupera conexión
- Estrategia de cache: Network First con fallback a Cache

**Flujo**:
1. Usuario visita la app
2. Service Worker se registra
3. Recursos se cachean
4. Si se pierde conexión:
   - Páginas cacheadas se muestran
   - Mensaje de offline aparece
5. Cuando se recupera conexión:
   - Sincronización automática
   - Actualización de cache

### RF-3: Almacenamiento Local

**Descripción**: Datos y medios se almacenan localmente para acceso offline.

**Criterios de Aceptación**:
- IndexedDB para almacenamiento de medios
- LocalStorage para preferencias
- Cache API para recursos estáticos
- Sincronización con servidor cuando hay conexión
- Gestión de espacio de almacenamiento

**Flujo**:
1. Usuario sube medio
2. Se guarda en IndexedDB
3. Se crea registro en BD (si hay conexión)
4. Opcionalmente se sube a cloud
5. Acceso offline disponible

### RF-4: Notificaciones Push (Futuro)

**Descripción**: Sistema de notificaciones push para eventos importantes.

**Criterios de Aceptación**:
- Solicitud de permiso para notificaciones
- Registro de subscription en servidor
- Envío de notificaciones desde servidor
- Recepción y visualización de notificaciones
- Acción al hacer clic en notificación

**Estado**: Especificación para implementación futura

### RF-5: Wake Lock

**Descripción**: Mantener pantalla encendida durante seguimiento en vivo de partidos.

**Criterios de Aceptación**:
- Activación de Wake Lock en vista de partido en vivo
- Botón para activar/desactivar
- Indicador visual de estado
- Liberación automática al salir de la vista
- Fallback graceful si no está disponible

**Flujo**:
1. Usuario accede a partido en vivo
2. Sistema solicita Wake Lock (opcional)
3. Usuario puede activar/desactivar manualmente
4. Pantalla se mantiene encendida
5. Al salir, Wake Lock se libera

## Requisitos No Funcionales

- **Performance**: Carga rápida de recursos cacheados
- **Compatibilidad**: Soporte en navegadores modernos
- **Storage**: Gestión eficiente de espacio de almacenamiento
- **Batería**: Uso eficiente de recursos (Wake Lock solo cuando necesario)

## Modelo de Datos

### Service Worker
- **Cache**: Recursos estáticos, páginas principales
- **IndexedDB**: Medios, datos temporales
- **LocalStorage**: Preferencias, estado de UI

### Manifest (`/manifest.webmanifest`)
```json
{
  "name": "DeporTeen",
  "short_name": "DeporTeen",
  "description": "Resultados y estadísticas para familias y clubs.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0EA5E9",
  "icons": [...]
}
```

## Integraciones

- **Service Worker API**: Funcionamiento offline
- **IndexedDB API**: Almacenamiento local
- **Cache API**: Cache de recursos
- **Wake Lock API**: Mantener pantalla encendida
- **Web App Manifest**: Metadatos de instalación

## Estados y Flujos

### Estado de Conexión
- **Online**: Funcionamiento normal, sincronización activa
- **Offline**: Modo offline, cache y almacenamiento local

### Flujo de Instalación
```
Visita app → Detecta instalable → Banner → Usuario instala → App instalada
```

### Flujo de Sincronización
```
Datos locales → Verificar conexión → Subir a servidor → Actualizar cache
```

## Casos de Uso

1. **Usuario instala PWA**: RF-1
2. **Usuario usa app offline**: RF-2
3. **Usuario sube medio sin conexión**: RF-3
4. **Usuario sigue partido en vivo con Wake Lock**: RF-5
5. **App sincroniza datos al recuperar conexión**: RF-2, RF-3
6. **Usuario recibe notificación push**: RF-4 (futuro)

## Límites y Restricciones

- Service Worker requiere HTTPS (excepto localhost)
- IndexedDB tiene límites de espacio por dominio
- Wake Lock requiere interacción del usuario
- Notificaciones requieren permiso explícito
- Algunas funcionalidades no disponibles en todos los navegadores

## Iconos y Assets

- **Iconos**: Múltiples tamaños (16x16, 32x32, 192x192, 512x512)
- **Maskable icons**: Para Android
- **Apple touch icon**: Para iOS
- **Favicon**: Para navegadores

## Estrategias de Cache

- **Network First**: Para datos dinámicos
- **Cache First**: Para recursos estáticos
- **Stale While Revalidate**: Para contenido que cambia ocasionalmente
