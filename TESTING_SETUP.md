# Sistema de Testing - Guía de Inicio

## ✅ Lo que se ha configurado

He implementado un sistema completo de testing dinámico que se ejecutará automáticamente con cada nueva implementación. Aquí está lo que se ha creado:

### 1. Configuración de Vitest
- ✅ `vitest.config.ts` - Configuración principal con soporte para Next.js y React
- ✅ Entorno jsdom para testing de componentes
- ✅ Aliases de paths configurados (`@/*`)
- ✅ Coverage configurado con umbrales mínimos

### 2. Setup y Mocks
- ✅ `src/test/setup.ts` - Configuración global (mocks de Next.js, window APIs, etc.)
- ✅ `src/test/mocks/supabase.ts` - Mock reutilizable de Supabase Client
- ✅ Variables de entorno mockeadas para tests

### 3. Tests de Ejemplo
- ✅ `src/lib/utils.test.ts` - Tests completos de funciones utilitarias
- ✅ `src/lib/auth/roles.test.ts` - Tests de autenticación y roles
- ✅ `src/lib/contact/send.test.ts` - Tests de validación de formularios
- ✅ `src/components/__tests__/TitleH1.test.tsx` - Ejemplo de test de componente

### 4. CI/CD Automático
- ✅ `.github/workflows/test.yml` - GitHub Actions que ejecuta tests en:
  - Push a `main` o `develop`
  - Pull requests a `main` o `develop`
  - Incluye: type check, lint, tests y coverage

### 5. Scripts NPM
- ✅ `pnpm test` - Ejecutar tests en modo watch
- ✅ `pnpm test:run` - Ejecutar tests una vez
- ✅ `pnpm test:ui` - Interfaz visual de tests
- ✅ `pnpm test:coverage` - Generar reporte de coverage
- ✅ `pnpm test:watch` - Modo watch

### 6. Documentación
- ✅ `src/test/README.md` - Guía completa de testing

## 🚀 Cómo empezar

### Paso 1: Instalar dependencias adicionales

```bash
pnpm install
```

Esto instalará las dependencias que ya están en `package.json`:
- `@vitejs/plugin-react` - Plugin de React para Vitest
- `@vitest/ui` - Interfaz visual para tests

### Paso 2: Verificar que todo funciona

```bash
# Ejecutar tests una vez para verificar configuración
pnpm test:run
```

Deberías ver algo como:
```
✓ src/lib/utils.test.ts (XX tests)
✓ src/lib/auth/roles.test.ts (XX tests)
✓ src/lib/contact/send.test.ts (XX tests)
✓ src/components/__tests__/TitleH1.test.tsx (XX tests)

Test Files  4 passed (4)
     Tests  XX passed (XX)
```

### Paso 3: Ver coverage

```bash
pnpm test:coverage
```

Esto generará un reporte en `coverage/` que puedes abrir en el navegador.

### Paso 4: Usar la UI de tests (opcional)

```bash
pnpm test:ui
```

Esto abrirá una interfaz web donde puedes ver y ejecutar tests interactivamente.

## 📝 Escribir nuevos tests

### Para funciones utilitarias

Crea un archivo `*.test.ts` junto al archivo que quieres testear:

```typescript
// src/lib/myFunction.ts
export function myFunction(input: string): string {
  return input.toUpperCase();
}

// src/lib/myFunction.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('should uppercase input', () => {
    expect(myFunction('hello')).toBe('HELLO');
  });
});
```

### Para componentes React

Crea un archivo `*.test.tsx` en el mismo directorio o en `__tests__/`:

```typescript
// src/components/MyComponent.tsx
export function MyComponent({ name }: { name: string }) {
  return <div>Hello {name}</div>;
}

// src/components/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render name', () => {
    render(<MyComponent name="World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

### Para API Routes

```typescript
// src/app/api/users/route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import { createMockSupabaseClient } from '@/test/mocks/supabase';

describe('POST /api/users', () => {
  it('should create user', async () => {
    // Mock Supabase
    const mockSupabase = createMockSupabaseClient();
    // ... implementación del test
  });
});
```

## 🔄 Ejecución Automática

### En CI/CD (GitHub Actions)

Los tests se ejecutan automáticamente cuando:
- Haces push a `main` o `develop`
- Abres un Pull Request a `main` o `develop`

El workflow ejecuta:
1. Type check (`pnpm types`)
2. Linter (`pnpm lint`)
3. Tests (`pnpm test:run`)
4. Coverage (`pnpm test:coverage`)

### En desarrollo local

Puedes ejecutar tests en modo watch mientras desarrollas:

```bash
pnpm test
```

Esto ejecutará tests automáticamente cuando cambies archivos.

## 📊 Coverage

El proyecto tiene umbrales mínimos de coverage configurados:

- **Lines**: 60%
- **Functions**: 60%
- **Branches**: 50%
- **Statements**: 60%

Si el coverage cae por debajo de estos umbrales, los tests fallarán.

Puedes ajustar estos umbrales en `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    lines: 70,      // Aumentar a 70%
    functions: 70,
    branches: 60,
    statements: 70,
  },
}
```

## 🎯 Próximos pasos recomendados

1. **Testear funciones críticas primero**:
   - `src/lib/seats.ts` - Lógica de asientos
   - `src/lib/subscriptions.ts` - Estado de suscripciones
   - `src/lib/seasons.ts` - Cálculo de temporadas

2. **Testear componentes principales**:
   - Formularios (NewPlayerForm, NewMatchEmbedded)
   - Componentes de UI reutilizables
   - Páginas críticas

3. **Testear API Routes**:
   - Endpoints de Stripe
   - Endpoints de autenticación
   - Endpoints de datos

4. **Testear integraciones**:
   - Flujos completos de usuario
   - Integración con Supabase
   - Validaciones de formularios

## 🐛 Solución de problemas

### Error: "Cannot find module '@vitejs/plugin-react'"

```bash
pnpm install @vitejs/plugin-react @vitest/ui
```

### Error: "Cannot find module '@/test/setup'"

Verifica que `vitest.config.ts` tenga el alias `@` configurado correctamente.

### Tests muy lentos

- Asegúrate de mockear dependencias externas (Supabase, APIs)
- Usa `vi.mock()` para mockear módulos pesados
- Considera usar `test.concurrent` para tests independientes

### Coverage no se genera

Verifica que tengas `coverage` en el directorio `.gitignore` pero no en el workspace.

## 📚 Recursos

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)
- [Guía de testing del proyecto](./src/test/README.md)

## ✅ Checklist de verificación

- [ ] Instalar dependencias: `pnpm install`
- [ ] Ejecutar tests: `pnpm test:run`
- [ ] Verificar coverage: `pnpm test:coverage`
- [ ] Configurar GitHub Actions (si usas GitHub)
- [ ] Escribir primeros tests para tu código nuevo
- [ ] Configurar pre-commit hooks (opcional, ver abajo)

## 🔧 Pre-commit hooks (Opcional pero recomendado)

Para ejecutar tests antes de cada commit, puedes instalar Husky:

```bash
pnpm add -D husky lint-staged
npx husky init
```

Luego crear `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm test:run
pnpm lint
```

Esto asegurará que no puedas hacer commit si los tests fallan.

---

¡Listo! Tu sistema de testing está configurado y funcionando. Cada vez que hagas push o abras un PR, los tests se ejecutarán automáticamente. 🎉
