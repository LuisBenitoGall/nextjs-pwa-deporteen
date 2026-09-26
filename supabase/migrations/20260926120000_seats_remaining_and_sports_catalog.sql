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
-- Catálogo cerrado v1 (9 deportes). Sincroniza por slug (preserva UUID en prod).
-- Cada sentencia es autónoma (sin tablas temporales ni estado entre statements).
-- ---------------------------------------------------------------------------

UPDATE public.sports s
SET name = v.name, stats = v.stats, active = true
FROM (
  VALUES
    ('a1000001-0001-4001-8001-000000000001'::uuid, 'Baloncesto', 'baloncesto', '{"fields":[{"key":"points","label":"Puntos","type":"number"},{"key":"rebounds","label":"Rebotes","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"steals","label":"Robos","type":"number"},{"key":"blocks","label":"Tapones","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000002'::uuid, 'Fútbol', 'futbol', '{"fields":[{"key":"goals","label":"Goles","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"yellow_cards","label":"Tarjetas amarillas","type":"number"},{"key":"red_cards","label":"Tarjetas rojas","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000003'::uuid, 'Fútbol Sala', 'futbol-sala', '{"fields":[{"key":"goals","label":"Goles","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"yellow_cards","label":"Tarjetas amarillas","type":"number"},{"key":"red_cards","label":"Tarjetas rojas","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000004'::uuid, 'Balonmano', 'balonmano', '{"fields":[{"key":"goals","label":"Goles","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"saves","label":"Paradas","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000005'::uuid, 'Rugby', 'rugby', '{"fields":[{"key":"tries","label":"Ensayos","type":"number"},{"key":"conversions","label":"Transformaciones","type":"number"},{"key":"tackles","label":"Placajes","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000006'::uuid, 'Voleibol', 'voleibol', '{"fields":[{"key":"points","label":"Puntos","type":"number"},{"key":"aces","label":"Aces","type":"number"},{"key":"blocks","label":"Bloqueos","type":"number"},{"key":"digs","label":"Defensas","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000007'::uuid, 'Waterpolo', 'waterpolo', '{"fields":[{"key":"goals","label":"Goles","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"exclusions","label":"Exclusiones","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000008'::uuid, 'Hockey Hierba', 'hockey-hierba', '{"fields":[{"key":"goals","label":"Goles","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"green_cards","label":"Tarjetas verdes","type":"number"},{"key":"yellow_cards","label":"Tarjetas amarillas","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000009'::uuid, 'Hockey Patines', 'hockey-patines', '{"fields":[{"key":"goals","label":"Goles","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"penalties","label":"Penaltis","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb)
) AS v(seed_id, name, slug, stats)
WHERE lower(trim(s.slug)) = v.slug;

INSERT INTO public.sports (id, name, slug, active, stats)
SELECT v.seed_id, v.name, v.slug, true, v.stats
FROM (
  VALUES
    ('a1000001-0001-4001-8001-000000000001'::uuid, 'Baloncesto', 'baloncesto', '{"fields":[{"key":"points","label":"Puntos","type":"number"},{"key":"rebounds","label":"Rebotes","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"steals","label":"Robos","type":"number"},{"key":"blocks","label":"Tapones","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000002'::uuid, 'Fútbol', 'futbol', '{"fields":[{"key":"goals","label":"Goles","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"yellow_cards","label":"Tarjetas amarillas","type":"number"},{"key":"red_cards","label":"Tarjetas rojas","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000003'::uuid, 'Fútbol Sala', 'futbol-sala', '{"fields":[{"key":"goals","label":"Goles","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"yellow_cards","label":"Tarjetas amarillas","type":"number"},{"key":"red_cards","label":"Tarjetas rojas","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000004'::uuid, 'Balonmano', 'balonmano', '{"fields":[{"key":"goals","label":"Goles","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"saves","label":"Paradas","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000005'::uuid, 'Rugby', 'rugby', '{"fields":[{"key":"tries","label":"Ensayos","type":"number"},{"key":"conversions","label":"Transformaciones","type":"number"},{"key":"tackles","label":"Placajes","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000006'::uuid, 'Voleibol', 'voleibol', '{"fields":[{"key":"points","label":"Puntos","type":"number"},{"key":"aces","label":"Aces","type":"number"},{"key":"blocks","label":"Bloqueos","type":"number"},{"key":"digs","label":"Defensas","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000007'::uuid, 'Waterpolo', 'waterpolo', '{"fields":[{"key":"goals","label":"Goles","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"exclusions","label":"Exclusiones","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000008'::uuid, 'Hockey Hierba', 'hockey-hierba', '{"fields":[{"key":"goals","label":"Goles","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"green_cards","label":"Tarjetas verdes","type":"number"},{"key":"yellow_cards","label":"Tarjetas amarillas","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb),
    ('a1000001-0001-4001-8001-000000000009'::uuid, 'Hockey Patines', 'hockey-patines', '{"fields":[{"key":"goals","label":"Goles","type":"number"},{"key":"assists","label":"Asistencias","type":"number"},{"key":"penalties","label":"Penaltis","type":"number"},{"key":"minutes_played","label":"Minutos","type":"number"}]}'::jsonb)
) AS v(seed_id, name, slug, stats)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sports s WHERE lower(trim(s.slug)) = v.slug
)
AND NOT EXISTS (
  SELECT 1 FROM public.sports s WHERE s.id = v.seed_id
);
