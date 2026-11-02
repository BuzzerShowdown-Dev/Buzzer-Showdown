CREATE OR REPLACE FUNCTION public.end_room(_code text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.buzzes WHERE room_code = _code;
  DELETE FROM public.players WHERE room_code = _code;
  DELETE FROM public.rooms WHERE code = _code;
END $$;
GRANT EXECUTE ON FUNCTION public.end_room(text) TO anon, authenticated;