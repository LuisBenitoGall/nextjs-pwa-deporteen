# Testing Guide

Este directorio contiene la configuración y utilidades para testing del proyecto DeporTeen.

## Estructura

```
src/test/
├── setup.ts          # Configuración global de tests
├── mocks/            # Mocks reutilizables
│   └── supabase.ts   # Mock de Supabase Client
└── README.md         # Este archivo
```

## Configuración

Los tests están configurados con:
- **Vitest**: Framework de testing
- **@testing-library/react**: Testing de componentes React
- **@testing-library/jest-dom**: Matchers adicionales para DOM
- **jsdom**: Entorno de DOM para tests

## Ejecutar Tests

```bash
# Ejecutar tests en modo watch
pnpm test

# Ejecutar tests una vez
pnpm test:run

# Ejecutar tests con UI
pnpm test:ui

# Ejecutar tests con coverage
pnpm test:coverage

# Ejecutar tests en modo watch
pnpm test:watch
```

## Escribir Tests

### Tests de Utilidades

Los tests de funciones utilitarias deben estar junto al archivo que testean:

```typescript
// src/lib/utils.ts
export function formatDate(input: string | number): string { ... }

// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    expect(formatDate('2024-01-15')).toContain('enero');
  });
});
```

### Tests de Componentes

Los tests de componentes deben estar en el mismo directorio:

```typescript
// src/components/Button.tsx
export function Button({ children }: { children: React.ReactNode }) { ... }

// src/components/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Tests de API Routes

Los tests de API routes deben mockear Supabase:

```typescript
// src/app/api/users/route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createMockSupabaseClient } from '@/test/mocks/supabase';

describe('POST /api/users', () => {
  it('should create user', async () => {
    const mockSupabase = createMockSupabaseClient();
    // ... test implementation
  });
});
```

## Mocks Disponibles

### Supabase Client

```typescript
import { createMockSupabaseClient } from '@/test/mocks/supabase';

const mockSupabase = createMockSupabaseClient();
mockSupabase.from('users').select().mockResolvedValue({ 
  data: [{ id: '1', name: 'Test' }], 
  error: null 
});
```

## Coverage

El proyecto tiene umbrales mínimos de coverage:
- **Lines**: 60%
- **Functions**: 60%
- **Branches**: 50%
- **Statements**: 60%

Estos umbrales se pueden ajustar en `vitest.config.ts`.

## CI/CD

Los tests se ejecutan automáticamente en:
- Push a `main` o `develop`
- Pull requests a `main` o `develop`

El workflow está en `.github/workflows/test.yml`.

## Mejores Prácticas

1. **Testear comportamiento, no implementación**: Enfócate en qué hace la función, no en cómo lo hace.

2. **Usar nombres descriptivos**: Los nombres de tests deben describir claramente qué están testando.

3. **Un test, una aserción**: Idealmente, cada test debe verificar una cosa.

4. **Mockear dependencias externas**: Mockea Supabase, APIs externas, etc.

5. **Tests rápidos**: Los tests deben ejecutarse rápidamente. Si un test es lento, considera si realmente necesita serlo.

6. **Tests determinísticos**: Los tests deben dar el mismo resultado cada vez que se ejecutan.

## Recursos

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Next.js Testing Guide](https://nextjs.org/docs/app/building-your-application/testing)
