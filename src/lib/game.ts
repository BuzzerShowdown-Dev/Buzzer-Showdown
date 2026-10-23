import { supabase } from "@/integrations/supabase/client";

export type Room = { code: string; round: number; buzzer_url: string | null; correct_url: string | null; wrong_url: string | null; show_leaderboard?: boolean; auto_reset?: boolean; freeze_mode?: boolean; freeze_since_round?: number };

/** Buzzes allowed per player in freeze mode before they're frozen out. */
export const FREEZE_LIMIT = 2;
/** Delay before an automatic reset after the first buzz of a round. */
export const AUTO_RESET_MS = 3000;

export function isFrozen(room: Pick<Room, "freeze_mode" | "freeze_since_round"> | null | undefined, buzzes: Pick<Buzz, "player_id" | "round">[], playerId: string | null) {
  if (!room?.freeze_mode || !playerId) return false;
  const since = room.freeze_since_round ?? 0;
  return buzzes.filter((b) => b.player_id === playerId && b.round >= since).length >= FREEZE_LIMIT;
}
export type Player = { id: string; room_code: string; name: string; score: number };
export type Buzz = { id: string; player_id: string; player_name: string; round: number; created_at: string };

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");

const audioCache = new Map<string, HTMLAudioElement>();
/** Preload sounds so the first play has no download delay. */
export function preloadSounds(...urls: (string | null | undefined)[]) {
  if (typeof Audio === "undefined") return;
  for (const u of urls) {
    if (u && !audioCache.has(u)) {
      const a = new Audio(u);
      a.preload = "auto";
      a.load();
      audioCache.set(u, a);
    }
  }
}

export function playUrl(url: string | null | undefined) {
  if (!url) return;
  preloadSounds(url);
  const a = audioCache.get(url)!;
  a.currentTime = 0;
  a.play().catch(() => {});
}

/** Merge a buzz into a list (dedupe by id, keep server-time order). */
export function addBuzz(list: Buzz[], b: Buzz) {
  if (list.some((x) => x.id === b.id)) return list;
  return [...list, b].sort((x, y) => x.created_at.localeCompare(y.created_at));
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

/**
 * Subscribe to a room's data. New buzzes arrive via onBuzz instantly (no refetch);
 * other changes call onChange.
 */
export function subscribeRoom(code: string, onChange: () => void, onSfx?: (kind: "correct" | "wrong") => void, onBuzz?: (b: Buzz) => void) {
  const ch = supabase
    .channel(`room-${code}-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "buzzes", filter: `room_code=eq.${code}` }, (p) => {
      if (p.eventType === "INSERT" && onBuzz) onBuzz(p.new as Buzz);
      else onChange();
    })
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
