# Delta — Internacionalización (29/09/2026)

## ADDED Requirements

### Requirement: Diccionario disponible en el primer render

`I18nProvider` MUST inicializar su diccionario con los mensajes de `DEFAULT_LOCALE` importados de forma estática, de modo que el render de servidor y el primer render de cliente ya contengan texto.

Nota: la inicialización estática llegó con #57 (`c2026-09-29-legaldoc-ssr-sanitize`); aquí se formaliza como contrato y se añaden el fallback de clave y el comportamiento ante fallo de carga.

Ninguna vista MUST renderizarse con cadenas vacías mientras se resuelve el diccionario del locale del usuario.

#### Scenario: Visitante con navegador en castellano

- **WHEN** se solicita `/`
- **THEN** el HTML servido contiene los nombres de los deportes y los títulos y descripciones de las características
- **AND** la hidratación no cambia esos textos

#### Scenario: Visitante con navegador en otro idioma soportado

- **WHEN** el locale resuelto no es `es`
- **THEN** el primer pintado muestra los textos del locale por defecto
- **AND** se sustituyen por el locale del usuario al resolver el import del diccionario
- **AND** en ningún momento se muestra una tarjeta, título o descripción vacíos

#### Scenario: Fallo al cargar el diccionario del locale

- **WHEN** el import del diccionario del locale falla
- **THEN** se conservan los mensajes del locale por defecto
- **AND** la UI no queda sin texto

### Requirement: Fallback de clave al locale por defecto

`t(key)` MUST devolver el valor del locale activo y, si ese locale no tiene la clave, el valor del locale por defecto antes de devolver cadena vacía.

#### Scenario: Clave presente solo en el locale base

- **WHEN** un componente pide una clave que falta en el locale activo
- **THEN** se renderiza el texto del locale por defecto en lugar de una cadena vacía

### Requirement: Claves de React independientes del texto traducido

Las `key` de React MUST derivarse de identificadores estables (slug, id, uuid) y nunca de valores devueltos por `t()`.

Motivo: si el diccionario cambia entre renders, dos elementos pueden compartir `key`; React solo elimina una fibra por clave duplicada y deja los nodos restantes huérfanos en el DOM, duplicando visualmente la lista.

#### Scenario: El diccionario cambia después del primer render

- **WHEN** una lista traducida se vuelve a renderizar con un diccionario distinto (carga inicial o cambio de idioma)
- **THEN** el número de elementos en el DOM es exactamente el de la colección de origen
- **AND** no quedan elementos del render anterior
