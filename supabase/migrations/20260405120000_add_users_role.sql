-- Rol de aplicación en public.users (p. ej. Superadmin para /admin).
-- Nullable: sin rol explícito hasta asignación operativa.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text;

COMMENT ON COLUMN public.users.role IS
  'Rol de aplicación. Valor Superadmin concede acceso al panel /admin (comprobado en servidor y middleware).';
