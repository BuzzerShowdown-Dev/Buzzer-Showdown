import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadRoom, type Buzz, type Room } from "@/lib/game";

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

  const refresh = useCallback(async () => {
    const d = await loadRoom(code);
    setRoom(d.room);
    setBuzzes(d.buzzes);
  }, [code]);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`screen-${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "buzzes", filter: `room_code=eq.${code}` }, refresh)
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [code, refresh]);

  if (room === undefined) return <p className="p-10 text-center">Loading…</p>;
  if (room === null) return <p className="p-10 text-center font-display text-3xl">Room not found</p>;

  const first = buzzes.find((b) => b.round === room.round);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-lg uppercase tracking-widest text-muted-foreground">Room {code} · Round {room.round}</p>
      {first ? (
        <>
          <p className="font-display text-3xl text-muted-foreground">FIRST TO BUZZ</p>
          <h1 className="glow-text break-all text-7xl text-primary sm:text-9xl">{first.player_name}</h1>
        </>
      ) : (
        <h1 className="font-display text-5xl text-muted-foreground sm:text-7xl">Waiting for a buzz…</h1>
      )}
    </main>
  );
}
