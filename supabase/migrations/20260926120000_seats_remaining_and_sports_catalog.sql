-- Luis 26/09/2026: versionar RPC seats_remaining y catálogo cerrado de deportes (seed reproducible).

-- ---------------------------------------------------------------------------
-- seats_remaining(p_user_id): asientos comprados en suscripciones activas menos
-- jugadores que ocupan asiento: players.status = true (borrado blando por status; sin deleted_at).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seats_remaining(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT GREATEST(
    COALESCE((
      SELECT SUM(s.seats)::integer
      FROM public.subscriptions s
      WHERE s.user_id = p_user_id
        AND lower(coalesce(s.status::text, '')) IN ('active', 'trialing')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
    ), 0)
    - COALESCE((
      SELECT COUNT(*)::integer
      FROM public.players p
      WHERE p.user_id = p_user_id
        AND COALESCE(p.status, true) = true
    ), 0),
    0
  );
$$;

COMMENT ON FUNCTION public.seats_remaining(uuid) IS
  'Asientos disponibles = SUM(seats) en subscriptions activas − jugadores con status activo (COALESCE(status,true)).';

GRANT EXECUTE ON FUNCTION public.seats_remaining(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seats_remaining(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Catálogo cerrado v1 (9 deportes de equipo). IDs fijos para seeds reproducibles.
-- stats.fields: esquema consumido por matches live (key, label, type).
-- ---------------------------------------------------------------------------
INSERT INTO public.sports (id, name, slug, active, stats)
VALUES
  (
    'a1000001-0001-4001-8001-000000000001',
    'Baloncesto',
    'baloncesto',
    true,
    '{"fields":[
      {"key":"points","label":"Puntos","type":"number"},
      {"key":"rebounds","label":"Rebotes","type":"number"},
      {"key":"assists","label":"Asistencias","type":"number"},
      {"key":"steals","label":"Robos","type":"number"},
      {"key":"blocks","label":"Tapones","type":"number"},
      {"key":"minutes_played","label":"Minutos","type":"number"}
    ]}'::jsonb
  ),
  (
    'a1000001-0001-4001-8001-000000000002',
    'Fútbol',
    'futbol',
    true,
    '{"fields":[
      {"key":"goals","label":"Goles","type":"number"},
      {"key":"assists","label":"Asistencias","type":"number"},
      {"key":"yellow_cards","label":"Tarjetas amarillas","type":"number"},
      {"key":"red_cards","label":"Tarjetas rojas","type":"number"},
      {"key":"minutes_played","label":"Minutos","type":"number"}
    ]}'::jsonb
  ),
  (
    'a1000001-0001-4001-8001-000000000003',
    'Fútbol Sala',
    'futbol-sala',
    true,
    '{"fields":[
      {"key":"goals","label":"Goles","type":"number"},
      {"key":"assists","label":"Asistencias","type":"number"},
      {"key":"yellow_cards","label":"Tarjetas amarillas","type":"number"},
      {"key":"red_cards","label":"Tarjetas rojas","type":"number"},
      {"key":"minutes_played","label":"Minutos","type":"number"}
    ]}'::jsonb
  ),
  (
    'a1000001-0001-4001-8001-000000000004',
    'Balonmano',
    'balonmano',
    true,
    '{"fields":[
      {"key":"goals","label":"Goles","type":"number"},
      {"key":"assists","label":"Asistencias","type":"number"},
      {"key":"saves","label":"Paradas","type":"number"},
      {"key":"minutes_played","label":"Minutos","type":"number"}
    ]}'::jsonb
  ),
  (
    'a1000001-0001-4001-8001-000000000005',
    'Rugby',
    'rugby',
    true,
    '{"fields":[
      {"key":"tries","label":"Ensayos","type":"number"},
      {"key":"conversions","label":"Transformaciones","type":"number"},
      {"key":"tackles","label":"Placajes","type":"number"},
      {"key":"minutes_played","label":"Minutos","type":"number"}
    ]}'::jsonb
  ),
  (
    'a1000001-0001-4001-8001-000000000006',
    'Voleibol',
    'voleibol',
    true,
    '{"fields":[
      {"key":"points","label":"Puntos","type":"number"},
      {"key":"aces","label":"Aces","type":"number"},
      {"key":"blocks","label":"Bloqueos","type":"number"},
      {"key":"digs","label":"Defensas","type":"number"}
    ]}'::jsonb
  ),
  (
    'a1000001-0001-4001-8001-000000000007',
    'Waterpolo',
    'waterpolo',
    true,
    '{"fields":[
      {"key":"goals","label":"Goles","type":"number"},
      {"key":"assists","label":"Asistencias","type":"number"},
      {"key":"exclusions","label":"Exclusiones","type":"number"},
      {"key":"minutes_played","label":"Minutos","type":"number"}
    ]}'::jsonb
  ),
  (
    'a1000001-0001-4001-8001-000000000008',
    'Hockey Hierba',
    'hockey-hierba',
    true,
    '{"fields":[
      {"key":"goals","label":"Goles","type":"number"},
      {"key":"assists","label":"Asistencias","type":"number"},
      {"key":"green_cards","label":"Tarjetas verdes","type":"number"},
      {"key":"yellow_cards","label":"Tarjetas amarillas","type":"number"},
      {"key":"minutes_played","label":"Minutos","type":"number"}
    ]}'::jsonb
  ),
  (
    'a1000001-0001-4001-8001-000000000009',
    'Hockey Patines',
    'hockey-patines',
    true,
    '{"fields":[
      {"key":"goals","label":"Goles","type":"number"},
      {"key":"assists","label":"Asistencias","type":"number"},
      {"key":"penalties","label":"Penaltis","type":"number"},
      {"key":"minutes_played","label":"Minutos","type":"number"}
    ]}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  active = EXCLUDED.active,
  stats = EXCLUDED.stats;
