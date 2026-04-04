-- Fix Security Advisor: RLS disabled on public.player_images
-- Metadata for player photos (paths, mime, match_id, etc.). anon/authenticated had
-- full privileges without RLS — any client could read/write all rows.
-- Align with public.players: only the owning user may access rows (user_id).

ALTER TABLE public.player_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_images_own"
ON public.player_images
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
