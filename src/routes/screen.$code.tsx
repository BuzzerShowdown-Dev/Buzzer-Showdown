import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadRoom, type Buzz, type Player, type Room } from "@/lib/game";

export const Route = createFileRoute("/screen/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `First Buzz — Room ${params.code}` },
      { name: "description", content: "Big screen display showing who buzzed in first." },
      { property: "og:title", content: `First Buzz — Room ${params.code}` },
      { property: "og:description", content: "See who buzzed first, live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScreenPage,
});

function ScreenPage() {
  const { code } = Route.useParams();
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [buzzes, setBuzzes] = useState<Buzz[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const refresh = useCallback(async () => {
    const d = await loadRoom(code);
    setRoom(d.room);
    setBuzzes(d.buzzes);
    setPlayers(d.players);
  }, [code]);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`screen-${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "buzzes", filter: `room_code=eq.${code}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` }, refresh)
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [code, refresh]);

  if (room === undefined) return <p className="p-10 text-center">Loading…</p>;
  if (room === null) return <p className="p-10 text-center font-display text-3xl">Room not found</p>;

  const first = buzzes.find((b) => b.round === room.round);
  const ranked = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex min-h-screen flex-row">
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground sm:text-lg">Room {code} · Round {room.round}</p>
        {first ? (
          <>
            <p className="font-display text-lg text-muted-foreground sm:text-3xl">FIRST TO BUZZ</p>
            <h1 className="glow-text break-words text-3xl text-primary sm:text-7xl lg:text-9xl">{first.player_name}</h1>
          </>
        ) : (
          <h1 className="font-display text-xl text-muted-foreground sm:text-5xl lg:text-7xl">Waiting for a buzz…</h1>
        )}
      </main>
      {room.show_leaderboard && (
        <aside className="flex w-52 shrink-0 flex-col border-l border-border bg-card p-4 sm:w-80 sm:p-6">
          <h2 className="mb-4 font-display text-xl text-primary sm:text-3xl">LEADERBOARD</h2>
          <ol className="flex-1 space-y-2 overflow-y-auto">
            {ranked.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-lg font-bold sm:px-4 sm:py-3 sm:text-2xl">
                <span className="truncate">{i + 1}. {p.name}</span>
                <span className="font-display text-primary">{p.score}</span>
              </li>
            ))}
            {ranked.length === 0 && <li className="text-muted-foreground">No players yet</li>}
          </ol>
        </aside>
      )}
    </div>
  );
}
