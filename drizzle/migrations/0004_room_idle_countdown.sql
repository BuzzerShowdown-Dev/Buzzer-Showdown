ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS last_activity timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.rooms_mark_activity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.round IS DISTINCT FROM OLD.round OR NEW.auto_reset IS DISTINCT FROM OLD.auto_reset
     OR NEW.freeze_mode IS DISTINCT FROM OLD.freeze_mode OR NEW.show_leaderboard IS DISTINCT FROM OLD.show_leaderboard
     OR NEW.buzzer_url IS DISTINCT FROM OLD.buzzer_url OR NEW.correct_url IS DISTINCT FROM OLD.correct_url OR NEW.wrong_url IS DISTINCT FROM OLD.wrong_url THEN
    NEW.last_activity := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rooms_mark_activity BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.rooms_mark_activity();

CREATE OR REPLACE FUNCTION public.child_mark_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.rooms SET last_activity = now() WHERE code = NEW.room_code AND last_activity < now() - interval '30 seconds';
  RETURN NEW;
END $$;
CREATE TRIGGER buzzes_mark_activity AFTER INSERT ON public.buzzes FOR EACH ROW EXECUTE FUNCTION public.child_mark_activity();
CREATE TRIGGER players_mark_activity AFTER INSERT OR UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.child_mark_activity();

CREATE OR REPLACE FUNCTION public.keep_room(_code text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.rooms SET last_activity = now() WHERE code = _code;
$$;

CREATE OR REPLACE FUNCTION public.delete_room_if_idle(_code text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE code = _code AND last_activity < now() - interval '30 minutes') THEN RETURN false; END IF;
  DELETE FROM public.buzzes WHERE room_code = _code;
  DELETE FROM public.players WHERE room_code = _code;
  DELETE FROM public.rooms WHERE code = _code;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.keep_room(text), public.delete_room_if_idle(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_idle_rooms() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _dead ON COMMIT DROP AS SELECT code FROM public.rooms WHERE last_seen < now() - interval '10 minutes' OR last_activity < now() - interval '30 minutes';
  DELETE FROM public.buzzes WHERE room_code IN (SELECT code FROM _dead);
  DELETE FROM public.players WHERE room_code IN (SELECT code FROM _dead);
  DELETE FROM public.rooms WHERE code IN (SELECT code FROM _dead);
END $$;