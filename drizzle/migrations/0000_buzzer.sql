CREATE TABLE public.rooms (
  code text PRIMARY KEY,
  round int NOT NULL DEFAULT 1,
  buzzer_url text, correct_url text, wrong_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30),
  score int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.buzzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  round int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (player_id, round)
);
GRANT SELECT, INSERT, UPDATE ON public.rooms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO anon, authenticated;
GRANT SELECT, INSERT ON public.buzzes TO anon, authenticated;
GRANT ALL ON public.rooms, public.players, public.buzzes TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buzzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms read" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms create" ON public.rooms FOR INSERT WITH CHECK (char_length(code) = 4);
CREATE POLICY "rooms update" ON public.rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "players read" ON public.players FOR SELECT USING (true);
CREATE POLICY "players join" ON public.players FOR INSERT WITH CHECK (score = 0);
CREATE POLICY "players update" ON public.players FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "players delete" ON public.players FOR DELETE USING (true);
CREATE POLICY "buzzes read" ON public.buzzes FOR SELECT USING (true);
CREATE POLICY "buzzes insert" ON public.buzzes FOR INSERT WITH CHECK (
  round = (SELECT r.round FROM public.rooms r WHERE r.code = room_code)
  AND EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.room_code = buzzes.room_code)
);
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms, public.players, public.buzzes;
CREATE POLICY "sounds read" ON storage.objects FOR SELECT USING (bucket_id = 'sounds');
CREATE POLICY "sounds upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sounds');