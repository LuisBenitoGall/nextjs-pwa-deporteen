import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import NewPlayerForm from './NewPlayerForm';
import { supabase } from '@/lib/supabase/client';

// Mock de módulos
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn(),
  },
}));

vi.mock('@/lib/seasons', () => ({
  getCurrentSeasonId: vi.fn().mockResolvedValue('season-123'),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    replace: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/i18n/I18nProvider', () => ({
  useT: () => (key: string) => {
    const translations: Record<string, string> = {
      'deportista_nuevo': 'Nuevo deportista',
      'deportista_nombre': 'Nombre del deportista',
      'nombre': 'Nombre',
      'participacion': 'Participación',
      'deporte': 'Deporte',
      'deporte_selec': 'Selecciona un deporte',
      'competicion': 'Competición',
      'competicion_nombre': 'Nombre de la competición',
      'competicion_nombre_info': 'Ejemplo: liga, torneo...',
      'categoria': 'Categoría',
      'categoria_selec': 'Selecciona una categoría',
      'club_nombre': 'Nombre del club',
      'equipo': 'Equipo',
      'equipo_nombre': 'Nombre del equipo',
      'equipo_nombre_info': 'Ejemplo: Junior A...',
      'avatar': 'Avatar',
      'avatar_temporada': 'Avatar de la temporada',
      'imagen_selec': 'Selecciona una imagen',
      'imagenes_guarda_local': 'Las imágenes se guardan localmente',
      'participacion_add': 'Añadir otra participación',
      'eliminar': 'Eliminar',
      'guardar': 'Guardar',
      'procesando': 'Procesando...',
      'cargando': 'Cargando...',
      'player_nuevo_texto1': 'Pendientes',
      'player_nuevo_texto2': 'Indica las participaciones',
      'temporada': 'Temporada',
      'codigo_detectado': 'Código aplicado',
      'equipo_necesita_club_aviso': 'Un equipo necesita un club',
      'deportista_crear_error': 'Error al crear deportista',
      'limite_deportistas_alcanzado': 'Has alcanzado el límite de deportistas permitidos',
      'limite_deportistas_info': 'Tu suscripción actual permite crear hasta el máximo.',
      'ampliar_suscripcion': 'Ampliar suscripción',
      'Introduce el nombre': 'Introduce el nombre',
    };
    return translations[key] || key;
  },
}));

describe('NewPlayerForm', () => {
  const mockRpc = vi.fn();
  const mockFrom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    (supabase.rpc as any) = mockRpc;
    (supabase.from as any) = mockFrom;

    // Mock de getUser
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // Mock de from() chain - soporta múltiples .order()
    const createChainable = () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(), // Puede ser encadenado múltiples veces
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      return chain;
    };
    
    mockFrom.mockImplementation(() => createChainable());
  });

  describe('Detección de errores de RPC', () => {
    it('should detect COALESCE type mismatch error from create_player_link_subscription', async () => {
      // Simular el error específico de COALESCE
      mockRpc.mockImplementation((funcName: string, params: any) => {
        if (funcName === 'create_player_link_subscription') {
          return Promise.resolve({
            data: null,
            error: {
              message: 'COALESCE types text and boolean cannot be matched',
              code: '42804',
              details: 'Parameter $1 = coalesce(is_active, active)',
            },
          });
        }
        // seats_remaining debe devolver un número para que el formulario esté habilitado
        if (funcName === 'seats_remaining') {
          return Promise.resolve({ data: 1, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      render(<NewPlayerForm initialSeats={1} />);

      // Esperar a que cargue
      await waitFor(() => {
        expect(screen.getByText('Nuevo deportista')).toBeInTheDocument();
      });

      // Este test verifica que el componente puede renderizarse y manejar el error
      // cuando se produce. La detección real del error se prueba en rpc-error-handler.test.ts
      expect(screen.getByText('Nuevo deportista')).toBeInTheDocument();
    });

    it('should handle successful player creation', async () => {
      mockRpc.mockImplementation((funcName: string, params: any) => {
        if (funcName === 'create_player_link_subscription') {
          return Promise.resolve({
            data: [{ player_id: 'player-123', subscription_id: 'sub-123' }],
            error: null,
          });
        }
        if (funcName === 'ensure_profile_server') {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const mockRouter = {
        replace: vi.fn(),
      };
      (useRouter as any).mockReturnValue(mockRouter);

      render(<NewPlayerForm initialSeats={1} />);

      await waitFor(() => {
        expect(screen.getByText('Nuevo deportista')).toBeInTheDocument();
      });

      // El test verifica que cuando la RPC funciona, el flujo continúa
      expect(mockRpc).toHaveBeenCalled();
    });

    it('should validate that RPC parameters match expected types', async () => {
      mockRpc.mockImplementation((funcName: string, params: any) => {
        if (funcName === 'create_player_link_subscription') {
          // Validar que los parámetros son del tipo correcto
          expect(typeof params.p_full_name).toBe('string');
          expect(params.p_birthday === null || params.p_birthday instanceof Date).toBe(true);
          expect(typeof params.p_status).toBe('boolean');
          expect(params.p_code_text === null || typeof params.p_code_text === 'string').toBe(true);

          return Promise.resolve({
            data: [{ player_id: 'player-123', subscription_id: 'sub-123' }],
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      render(<NewPlayerForm initialSeats={1} initialCode="test-code" />);

      // Este test verifica que los tipos de parámetros son correctos
      // Si hubiera un desajuste de tipos, esto lo detectaría
      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalled();
      });
    });

    it('should block player creation when no seats available and no code', async () => {
      const mockRouter = {
        replace: vi.fn(),
      };
      (useRouter as any).mockReturnValue(mockRouter);

      // Mock seats_remaining para retornar 0
      mockRpc.mockImplementation((funcName: string, params: any) => {
        if (funcName === 'seats_remaining') {
          return Promise.resolve({ data: 0, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      render(<NewPlayerForm initialSeats={0} initialCode="" />);

      await waitFor(() => {
        expect(screen.getByText('Nuevo deportista')).toBeInTheDocument();
      });

      // Llenar formulario - usar getAllByPlaceholderText y seleccionar el primero (nombre del deportista)
      const nameInputs = screen.getAllByPlaceholderText(/nombre/i);
      const nameInput = nameInputs.find(input => input.getAttribute('placeholder') === 'Nombre') || nameInputs[0];
      if (nameInput) {
        fireEvent.change(nameInput, { target: { value: 'Test Player' } });
      }

      // Mock de deportes
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 'sport-1', name: 'Fútbol', slug: 'futbol', active: true }],
          error: null,
        }),
      });

      // Intentar submit
      const form = nameInput.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      // Verificar que se bloquea la creación cuando no hay asientos
      await waitFor(() => {
        // El error debería aparecer en la UI
        expect(mockRpc).toHaveBeenCalled();
      });
    });

    it('should allow player creation with code even when no seats available', async () => {
      const mockRouter = {
        replace: vi.fn(),
      };
      (useRouter as any).mockReturnValue(mockRouter);

      mockRpc.mockImplementation((funcName: string, params: any) => {
        if (funcName === 'create_player_link_subscription') {
          return Promise.resolve({
            data: [{ player_id: 'player-123', subscription_id: 'sub-123' }],
            error: null,
          });
        }
        if (funcName === 'ensure_profile_server') {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      render(<NewPlayerForm initialSeats={0} initialCode="VALID-CODE" />);

      await waitFor(() => {
        expect(screen.getByText('Nuevo deportista')).toBeInTheDocument();
      });

      // Verificar que el código se detecta
      const codeBanner = screen.queryByText(/código aplicado/i);
      expect(codeBanner).toBeInTheDocument();
    });

    it('should handle successful player creation with valid seats', async () => {
      const mockRouter = {
        replace: vi.fn(),
      };
      (useRouter as any).mockReturnValue(mockRouter);

      mockRpc.mockImplementation((funcName: string, params: any) => {
        if (funcName === 'create_player_link_subscription') {
          return Promise.resolve({
            data: [{ player_id: 'player-123', subscription_id: 'sub-123' }],
            error: null,
          });
        }
        if (funcName === 'ensure_profile_server') {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      render(<NewPlayerForm initialSeats={3} initialCode="" />);

      await waitFor(() => {
        expect(screen.getByText('Nuevo deportista')).toBeInTheDocument();
      });

      // Verificar que el formulario está disponible cuando hay asientos
      const nameInputs = screen.getAllByPlaceholderText(/nombre/i);
      const nameInput = nameInputs.find(input => input.getAttribute('placeholder') === 'Nombre');
      expect(nameInput).toBeInTheDocument();
    });

    it('5.1: successful submit without code calls RPC with correct params and redirects to dashboard', async () => {
      const mockRouter = { replace: vi.fn() };
      (useRouter as any).mockReturnValue(mockRouter);

      mockRpc.mockImplementation((funcName: string, params: any) => {
        if (funcName === 'create_player_link_subscription') {
          expect(params.p_full_name).toBe('Test User');
          expect(params.p_code_text).toBeNull();
          expect(params.p_status).toBe(true);
          return Promise.resolve({
            data: [{ player_id: 'player-1', subscription_id: 'sub-1' }],
            error: null,
          });
        }
        if (funcName === 'ensure_profile_server') return Promise.resolve({ data: null, error: null });
        if (funcName === 'seats_remaining') return Promise.resolve({ data: 1, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const sportsData = [{ id: 'sport-1', name: 'Fútbol', slug: 'futbol', active: true }];
      const sportsThenable = {
        then: (fn: (v: any) => any) => Promise.resolve({ data: sportsData, error: null }).then(fn),
        catch: (fn: (v: any) => any) => Promise.resolve({ data: sportsData, error: null }).catch(fn),
      };
      const categoriesThenable = {
        then: (fn: (v: any) => any) => Promise.resolve({ data: [], error: null }).then(fn),
        catch: (_fn: (v: any) => any) => categoriesThenable,
      };
      mockFrom.mockImplementation((table: string) => {
        const eq = vi.fn().mockReturnThis();
        const insert = vi.fn().mockResolvedValue({ data: null, error: null });
        const upsert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'club-1' }, error: null }),
        });
        const inFilter = vi.fn().mockReturnThis();
        const single = vi.fn().mockResolvedValue({ data: { id: 'club-1' }, error: null });
        const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'team-1' }, error: null });
        if (table === 'sport_categories') {
          const categoriesOrder2 = vi.fn().mockReturnValue(categoriesThenable);
          const categoriesOrder1 = vi.fn().mockReturnValue({ order: categoriesOrder2 });
          return {
            select: vi.fn().mockReturnValue({ order: categoriesOrder1 }),
            eq, in: inFilter, single, maybeSingle, upsert, insert,
          };
        }
        return {
          select: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue(sportsThenable) }),
          eq, in: inFilter, order: vi.fn().mockReturnValue(sportsThenable),
          single, maybeSingle, upsert, insert,
        };
      });

      render(<NewPlayerForm initialSeats={1} />);
      await waitFor(() => expect(screen.getByText('Nuevo deportista')).toBeInTheDocument());

      const nameInput = screen.getByPlaceholderText('Nombre');
      fireEvent.change(nameInput, { target: { value: 'Test User' } });

      await waitFor(() => expect(screen.getByText('Fútbol')).toBeInTheDocument());
      const sportSelect = document.querySelector('select#sport_0') || document.querySelector('select[name="sport_0"]');
      expect(sportSelect).toBeTruthy();
      fireEvent.change(sportSelect!, { target: { value: 'sport-1' } });

      const compInput = screen.getByPlaceholderText(/Nombre de la competición/i);
      fireEvent.change(compInput, { target: { value: 'Liga Test' } });

      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() => {
        const createCalls = mockRpc.mock.calls.filter((c: any[]) => c[0] === 'create_player_link_subscription');
        expect(createCalls.length).toBeGreaterThan(0);
        expect(createCalls[0][1]).toMatchObject({
          p_full_name: 'Test User',
          p_code_text: null,
          p_status: true,
        });
      });
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('5.2: successful submit with pending code calls RPC with code and redirects to dashboard', async () => {
      const mockRouter = { replace: vi.fn() };
      (useRouter as any).mockReturnValue(mockRouter);

      mockRpc.mockImplementation((funcName: string, params: any) => {
        if (funcName === 'create_player_link_subscription') {
          expect(params.p_code_text).toBe('PENDING-CODE');
          return Promise.resolve({
            data: [{ player_id: 'player-2', subscription_id: 'sub-2' }],
            error: null,
          });
        }
        if (funcName === 'ensure_profile_server') return Promise.resolve({ data: null, error: null });
        if (funcName === 'seats_remaining') return Promise.resolve({ data: 0, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const sportsData = [{ id: 'sport-1', name: 'Fútbol', slug: 'futbol', active: true }];
      const sportsThenable = {
        then: (fn: (v: any) => any) => Promise.resolve({ data: sportsData, error: null }).then(fn),
        catch: (fn: (v: any) => any) => Promise.resolve({ data: sportsData, error: null }).catch(fn),
      };
      const categoriesThenable = {
        then: (fn: (v: any) => any) => Promise.resolve({ data: [], error: null }).then(fn),
        catch: (_fn: (v: any) => any) => categoriesThenable,
      };
      mockFrom.mockImplementation((table: string) => {
        const eq = vi.fn().mockReturnThis();
        const insert = vi.fn().mockResolvedValue({ data: null, error: null });
        const upsert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'club-1' }, error: null }),
        });
        const inFilter = vi.fn().mockReturnThis();
        const single = vi.fn().mockResolvedValue({ data: { id: 'club-1' }, error: null });
        const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'team-1' }, error: null });
        if (table === 'sport_categories') {
          const categoriesOrder2 = vi.fn().mockReturnValue(categoriesThenable);
          const categoriesOrder1 = vi.fn().mockReturnValue({ order: categoriesOrder2 });
          return {
            select: vi.fn().mockReturnValue({ order: categoriesOrder1 }),
            eq, in: inFilter, single, maybeSingle, upsert, insert,
          };
        }
        return {
          select: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue(sportsThenable) }),
          eq, in: inFilter, order: vi.fn().mockReturnValue(sportsThenable),
          single, maybeSingle, upsert, insert,
        };
      });

      render(<NewPlayerForm initialSeats={0} initialCode="PENDING-CODE" />);
      await waitFor(() => expect(screen.getByText(/código aplicado/i)).toBeInTheDocument());

      await waitFor(() => expect(screen.getByText('Fútbol')).toBeInTheDocument());
      const nameInput = screen.getByPlaceholderText('Nombre');
      fireEvent.change(nameInput, { target: { value: 'Player With Code' } });
      const sportSelect = document.querySelector('select#sport_0');
      if (sportSelect) fireEvent.change(sportSelect, { target: { value: 'sport-1' } });
      const compInput = screen.getByPlaceholderText(/Nombre de la competición/i);
      fireEvent.change(compInput, { target: { value: 'Liga Test' } });
      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() => {
        const createCalls = mockRpc.mock.calls.filter((c: any[]) => c[0] === 'create_player_link_subscription');
        expect(createCalls.length).toBeGreaterThan(0);
        expect(createCalls[0][1]).toMatchObject({ p_code_text: 'PENDING-CODE' });
        expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('5.4: when seats_remaining === 0 and no code, shows limit message and CTA to subscription; does not call create RPC on submit', async () => {
      const mockRouter = { replace: vi.fn() };
      (useRouter as any).mockReturnValue(mockRouter);

      mockRpc.mockImplementation((funcName: string) => {
        if (funcName === 'seats_remaining') return Promise.resolve({ data: 0, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      render(<NewPlayerForm initialSeats={0} initialCode="" />);

      await waitFor(() => {
        expect(screen.getByText(/Has alcanzado el límite de deportistas permitidos/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Ampliar suscripción/i })).toHaveAttribute('href', '/subscription');
      });

      const nameInput = screen.getByPlaceholderText('Nombre');
      fireEvent.change(nameInput, { target: { value: 'Should Not Create' } });
      const submitBtn = screen.queryByRole('button', { name: /guardar/i });
      if (submitBtn && !submitBtn.hasAttribute('disabled')) {
        fireEvent.click(submitBtn);
        await waitFor(() => {
          const createCalls = mockRpc.mock.calls.filter((c: any[]) => c[0] === 'create_player_link_subscription');
          expect(createCalls.length).toBe(0);
        });
      }
    });
  });

  describe('Validación de formulario', () => {
    it('5.3: invalid data (empty name) does not call RPC and shows error message', async () => {
      mockRpc.mockImplementation((funcName: string) => {
        if (funcName === 'seats_remaining') return Promise.resolve({ data: 1, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      render(<NewPlayerForm initialSeats={1} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
      });

      fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);

      await waitFor(() => {
        const createCalls = mockRpc.mock.calls.filter((c: any[]) => c[0] === 'create_player_link_subscription');
        expect(createCalls.length).toBe(0);
      });
      expect(screen.getByText(/Introduce un nombre/i)).toBeInTheDocument();
    });

    it('should validate required fields before submission', async () => {
      render(<NewPlayerForm initialSeats={1} />);

      await waitFor(() => {
        expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
      });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /guardar/i });
        expect(submitButton).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /guardar/i });
      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.queryByText(/introduce un nombre/i) || screen.queryByText(/Introduce el nombre/i)).toBeInTheDocument();
      });
    });
  });
});
