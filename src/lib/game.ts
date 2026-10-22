import { supabase } from "@/integrations/supabase/client";

export type Room = { code: string; round: number; buzzer_url: string | null; correct_url: string | null; wrong_url: string | null; show_leaderboard?: boolean };
export type Player = { id: string; room_code: string; name: string; score: number };
export type Buzz = { id: string; player_id: string; player_name: string; round: number; created_at: string };

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");

export function playUrl(url: string | null | undefined) {
  if (!url) return;
  const a = new Audio(url);
  a.play().catch(() => {});
}

export async function uploadSound(code: string, kind: "buzzer" | "correct" | "wrong", file: File) {
  const path = `${code}/${kind}-${Date.now()}-${file.name.replace(/[^\w.]/g, "_")}`;
  const { error } = await supabase.storage.from("sounds").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("sounds").createSignedUrl(path, 60 * 60 * 24 * 365);
  if (e2 || !data) throw e2;
  const { error: e3 } = await supabase.from("rooms").update(kind === "buzzer" ? { buzzer_url: data.signedUrl } : kind === "correct" ? { correct_url: data.signedUrl } : { wrong_url: data.signedUrl }).eq("code", code);
  if (e3) throw e3;
}

/** Subscribe to a room's data; returns cleanup. */
export function subscribeRoom(code: string, onChange: () => void, onSfx?: (kind: "correct" | "wrong") => void) {
  const ch = supabase
    .channel(`room-${code}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "buzzes", filter: `room_code=eq.${code}` }, onChange)
    .on("broadcast", { event: "sfx" }, (m) => onSfx?.(m["payload"].kind))
    .subscribe();
  return ch;
}

export async function loadRoom(code: string) {
  const [r, p, b] = await Promise.all([
    supabase.from("rooms").select("*").eq("code", code).maybeSingle(),
    supabase.from("players").select("*").eq("room_code", code).order("created_at"),
    supabase.from("buzzes").select("*").eq("room_code", code).order("created_at"),
  ]);
  return { room: r.data as Room | null, players: (p.data ?? []) as Player[], buzzes: (b.data ?? []) as Buzz[] };
}
