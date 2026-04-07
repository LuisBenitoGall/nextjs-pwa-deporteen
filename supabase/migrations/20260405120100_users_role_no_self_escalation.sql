-- Evita que un usuario con JWT "authenticated" se asigne o cambie su propio public.users.role.
-- Asignación de Superadmin: SQL/dashboard con service role o rutas servidor con getSupabaseAdmin().

CREATE OR REPLACE FUNCTION public.users_enforce_role_change_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce((auth.jwt() ->> 'role'), '');
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF jwt_role = 'authenticated' AND auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
    RAISE EXCEPTION 'No está permitido modificar el propio rol de aplicación';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_enforce_role_change ON public.users;
CREATE TRIGGER users_enforce_role_change
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_enforce_role_change_policy();
