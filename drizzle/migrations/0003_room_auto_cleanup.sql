ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS last_seen timestamptz NOT NULL DEFAULT now();
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE OR REPLACE FUNCTION public.cleanup_idle_rooms() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.buzzes WHERE room_code IN (SELECT code FROM public.rooms WHERE last_seen < now() - interval '10 minutes');
  DELETE FROM public.players WHERE room_code IN (SELECT code FROM public.rooms WHERE last_seen < now() - interval '10 minutes');
  DELETE FROM public.rooms WHERE last_seen < now() - interval '10 minutes';
END $$;
REVOKE EXECUTE ON FUNCTION public.cleanup_idle_rooms() FROM PUBLIC, anon, authenticated;
SELECT cron.schedule('cleanup-idle-rooms', '0 * * * *', 'SELECT public.cleanup_idle_rooms()');