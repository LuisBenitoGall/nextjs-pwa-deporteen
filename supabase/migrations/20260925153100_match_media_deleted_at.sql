-- Decisión Luis 5-A: cuota en nube excluye medios borrados lógicamente.
ALTER TABLE public.match_media
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_match_media_user_r2_active
  ON public.match_media (user_id)
  WHERE storage_path LIKE 'r2:%' AND deleted_at IS NULL;
