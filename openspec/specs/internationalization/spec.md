# Internacionalización (i18n)

## Descripción

Sistema de internacionalización que soporta múltiples idiomas (español, catalán, inglés) para toda la interfaz de usuario.

## Requisitos Funcionales

### RF-1: Selección de Idioma

**Descripción**: Usuario puede seleccionar y cambiar su idioma preferido.

**Criterios de Aceptación**:
- Idioma se guarda en perfil de usuario (`users.locale`)
- Idiomas disponibles: es-ES, ca-ES, en-US
- Cambio de idioma actualiza toda la interfaz
- Preferencia persiste entre sesiones
- Idioma por defecto: es-ES

**Flujo**:
1. Usuario cambia idioma en configuración
2. Se actualiza `users.locale`
3. Toda la UI se actualiza
4. Preferencia se guarda

### RF-2: Traducción de Contenido

**Descripción**: Todo el contenido visible está traducido.

**Criterios de Aceptación**:
- Archivos de traducción en `src/i18n/messages/{locale}.json`
- Uso de `t('clave')` en componentes cliente
- Uso de `tServer()` en componentes servidor
- Valores por defecto cuando falta traducción
- Formato de fechas y números según locale

**Flujo**:
1. Componente necesita texto
2. Llama a `t('clave')` o `tServer('clave')`
3. Sistema busca traducción en locale del usuario
4. Retorna traducción o valor por defecto

### RF-3: Formato de Fechas y Números

**Descripción**: Fechas y números se formatean según locale del usuario.

**Criterios de Aceptación**:
- Fechas en formato local (DD/MM/YYYY para es, MM/DD/YYYY para en)
- Números con separadores locales
- Monedas en formato local
- Uso de `Intl.DateTimeFormat` y `Intl.NumberFormat`

## Requisitos No Funcionales

- **Performance**: Carga eficiente de archivos de traducción
- **Mantenibilidad**: Claves de traducción organizadas y descriptivas
- **Completitud**: Todas las cadenas traducidas en todos los idiomas

## Modelo de Datos

### Archivos de Traducción
- `src/i18n/messages/es.json`: Español
- `src/i18n/messages/ca.json`: Catalán
- `src/i18n/messages/en.json`: Inglés

### Estructura de Claves
```json
{
  "clave_nivel1": {
    "clave_nivel2": "Traducción"
  },
  "clave_simple": "Traducción"
}
```

## Integraciones

- **next-intl**: Framework de internacionalización
- **Intl API**: Formateo de fechas y números

## Estados y Flujos

### Flujo de Cambio de Idioma
```
Usuario cambia idioma → Actualizar users.locale → Recargar traducciones → Actualizar UI
```

## Casos de Uso

1. **Usuario selecciona español**: RF-1
2. **Usuario selecciona catalán**: RF-1
3. **Usuario selecciona inglés**: RF-1
4. **Sistema muestra fecha en formato local**: RF-3
5. **Sistema muestra número en formato local**: RF-3

## Claves de Traducción Principales

- Navegación: `mi_panel`, `cuenta`, `cerrar_sesion`
- Jugadores: `deportista`, `deportista_nuevo`, `deportista_agregar`
- Partidos: `partido`, `partido_nuevo`, `partidos`
- Competiciones: `competicion`, `competicion_nueva`
- Suscripciones: `suscribete`, `suscripcion`
- Errores: `error_*`, `cargando`, `guardando`
