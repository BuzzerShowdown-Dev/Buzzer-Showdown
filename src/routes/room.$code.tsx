import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadRoom, playUrl, subscribeRoom, type Buzz, type Player, type Room } from "@/lib/game";

export const Route = createFileRoute("/room/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Room ${params.code} — Buzz!` },
      { name: "description", content: `Join quiz room ${params.code} and hit the buzzer.` },
      { property: "og:title", content: `Join room ${params.code} on Buzz!` },
      { property: "og:description", content: "Enter your name and get ready to buzz." },
    ],
  }),
  component: PlayerPage,
});

function PlayerPage() {
  const { code } = Route.useParams();
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [players, setPlayers] = useState<Player[]>([]);
  const [buzzes, setBuzzes] = useState<Buzz[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    const d = await loadRoom(code);
    setRoom(d.room);
    setPlayers(d.players);
    setBuzzes(d.buzzes);
  }, [code]);

  useEffect(() => {
    setPlayerId(localStorage.getItem(`player-${code}`));
    refresh();
  }, [code, refresh]);

  useEffect(() => {
    const ch = subscribeRoom(code, refresh, (kind) => {
      setRoom((r) => {
        playUrl(kind === "correct" ? r?.correct_url : r?.wrong_url);
        return r;
      });
    });
    return () => void supabase.removeChannel(ch);
  }, [code, refresh]);

  const me = players.find((p) => p.id === playerId);
  const round = room?.round ?? 0;
  const roundBuzzes = buzzes.filter((b) => b.round === round);
  const myPos = roundBuzzes.findIndex((b) => b.player_id === playerId);
  const locked = myPos >= 0 || pending;

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const { data, error } = await supabase.from("players").insert({ room_code: code, name: n.slice(0, 30) }).select().single();
    if (error || !data) return;
    localStorage.setItem(`player-${code}`, data.id);
    setPlayerId(data.id);
    refresh();
  }

  async function buzz() {
    if (locked || !me) return;
    setPending(true);
    playUrl(room?.buzzer_url);
    navigator.vibrate?.(80);
    await supabase.from("buzzes").insert({ room_code: code, player_id: me.id, player_name: me.name, round });
    await refresh();
    setPending(false);
  }

  if (room === undefined) return <Center>Loading…</Center>;
  if (room === null)
    return (
      <Center>
        <h1 className="text-4xl text-primary">NO ROOM {code}</h1>
        <Link to="/" className="mt-6 inline-block underline">Back</Link>
      </Center>
    );

  if (!me)
    return (
      <Center>
        <p className="font-display text-xl text-muted-foreground">ROOM {code}</p>
        <form onSubmit={join} className="mt-6 w-full max-w-sm space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={30}
            className="w-full rounded-2xl border-2 border-input bg-card px-4 py-5 text-center text-3xl font-extrabold outline-none focus:border-ring"
          />
          <button className="w-full rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">LET'S PLAY</button>
        </form>
      </Center>
    );

  return (
    <main className="flex h-[100dvh] flex-col items-center justify-between overflow-hidden px-4 py-6 select-none">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Room {code} · Round {round} · {me.score} pts</p>
        <h1 className="glow-text mt-1 break-all text-5xl text-primary">{me.name}</h1>
      </div>
      <button
        onPointerDown={buzz}
        disabled={locked}
        aria-label="Buzz"
        className="buzzer aspect-square w-[min(80vw,60vh)] rounded-full font-display text-5xl text-destructive-foreground sm:text-7xl"
      >
        {myPos >= 0 ? `#${myPos + 1}` : "BUZZ"}
      </button>
      <p className="h-8 font-display text-xl text-muted-foreground">
        {myPos === 0 ? "YOU'RE FIRST!" : myPos > 0 ? "LOCKED — WAIT FOR RESET" : roundBuzzes.length ? `${roundBuzzes[0].player_name} buzzed first` : "GET READY…"}
      </p>
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">{children}</main>;
}
