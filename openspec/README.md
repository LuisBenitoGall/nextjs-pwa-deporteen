# OpenSpec - DeporTeen

Este directorio contiene la documentación de especificaciones del proyecto DeporTeen siguiendo la metodología OpenSpec.

## Estructura

```
openspec/
├── README.md              # Este archivo
├── project.md             # Contexto general del proyecto
├── AGENTS.md              # Instrucciones para herramientas de IA
├── specs/                  # Especificaciones actuales del sistema
│   ├── authentication/    # Autenticación y gestión de usuarios
│   ├── players/           # Gestión de jugadores/deportistas
│   ├── matches/           # Gestión de partidos
│   ├── subscriptions/     # Suscripciones y pagos
│   ├── admin/             # Panel de administración
│   ├── pwa/               # Funcionalidades PWA
│   ├── internationalization/  # Internacionalización
│   └── statistics/        # Estadísticas y visualización
└── changes/               # Propuestas de cambios futuros
    └── archive/           # Cambios completados
```

## Archivos Principales

### `project.md`
Descripción general del proyecto, tecnologías, arquitectura y funcionalidades principales.

### `AGENTS.md`
Instrucciones específicas para herramientas de IA que trabajan con el código, incluyendo convenciones, patrones y mejores prácticas.

### `specs/[capacidad]/spec.md`
Especificaciones detalladas de cada funcionalidad del sistema, incluyendo:
- Requisitos funcionales (RF)
- Criterios de aceptación
- Flujos de usuario
- Modelo de datos
- Integraciones
- Casos de uso

## Cómo Usar

### Para Desarrolladores

1. **Leer especificaciones**: Consulta `specs/` para entender cómo funciona cada funcionalidad
2. **Seguir especificaciones**: Implementa código siguiendo las especificaciones
3. **Actualizar specs**: Si cambias comportamiento, actualiza las specs correspondientes

### Para Agentes de IA

1. **Leer `AGENTS.md`**: Entiende las convenciones y patrones del proyecto
2. **Consultar `project.md`**: Obtén contexto general del proyecto
3. **Revisar specs relevantes**: Antes de implementar, consulta las specs de la funcionalidad

### Para Gestión de Cambios

1. **Crear propuesta**: Crea un directorio en `changes/` con el nombre del cambio
2. **Documentar**: Crea `proposal.md` con descripción y justificación
3. **Planificar**: Crea `tasks.md` con lista de tareas
4. **Implementar**: Sigue las tareas y actualiza specs si es necesario
5. **Archivar**: Mueve a `changes/archive/` cuando se complete

## Convenciones

- **Nomenclatura**: Usa nombres descriptivos y en español para directorios y archivos
- **Formato**: Markdown estándar
- **Estructura**: Sigue el formato establecido en las specs existentes
- **Actualización**: Mantén las specs actualizadas con el código

## Estado Actual

Este proyecto tiene especificaciones completas para:
- ✅ Autenticación y usuarios
- ✅ Gestión de jugadores
- ✅ Gestión de partidos
- ✅ Suscripciones y pagos
- ✅ Panel de administración
- ✅ Funcionalidades PWA
- ✅ Internacionalización
- ✅ Estadísticas

## Próximos Pasos

1. Revisar y validar las especificaciones con el código actual
2. Identificar discrepancias y actualizar specs
3. Crear propuestas de cambios en `changes/` según necesidades
4. Mantener documentación actualizada con el desarrollo

## Referencias

- [OpenSpec Documentation](https://openspec.dev)
- [Metodología OpenSpec](https://github.com/Fission-AI/OpenSpec)
