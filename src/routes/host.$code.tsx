import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { loadRoom, playUrl, subscribeRoom, uploadSound, type Buzz, type Player, type Room } from "@/lib/game";

export const Route = createFileRoute("/host/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Host ${params.code} — Buzz!` },
      { name: "description", content: "Host control panel: buzz order, sounds and scoreboard." },
      { property: "og:title", content: `Hosting room ${params.code}` },
      { property: "og:description", content: "Run your quiz with live buzz order and scores." },
    ],
  }),
  component: HostPage,
});

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

function HostPage() {
  const { code } = Route.useParams();
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [players, setPlayers] = useState<Player[]>([]);
  const [buzzes, setBuzzes] = useState<Buzz[]>([]);
  const [link, setLink] = useState("");
  const chRef = useRef<RealtimeChannel | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const roomRef = useRef<Room | null>(null);

  const refresh = useCallback(async () => {
    const d = await loadRoom(code);
    // play buzzer on host for new buzzes
    const fresh = d.buzzes.filter((b) => !seen.current.has(b.id));
    if (seen.current.size && fresh.length) playUrl(d.room?.buzzer_url);
    d.buzzes.forEach((b) => seen.current.add(b.id));
    if (!seen.current.size) seen.current.add("init");
    roomRef.current = d.room;
    setRoom(d.room);
    setPlayers(d.players);
    setBuzzes(d.buzzes);
  }, [code]);

  useEffect(() => {
    setLink(`${window.location.origin}/room/${code}`);
    refresh();
    const ch = subscribeRoom(code, refresh);
    chRef.current = ch;
    return () => void supabase.removeChannel(ch);
  }, [code, refresh]);

  const round = room?.round ?? 0;
  const order = buzzes.filter((b) => b.round === round);
  const t0 = order[0] ? new Date(order[0].created_at).getTime() : 0;

  const reset = () => supabase.from("rooms").update({ round: round + 1 }).eq("code", code).then(refresh);
  const score = (p: Player, d: number) => supabase.from("players").update({ score: p.score + d }).eq("id", p.id).then(refresh);
  const kick = (p: Player) => supabase.from("players").delete().eq("id", p.id).then(refresh);
  const sfx = (kind: "correct" | "wrong") => {
    playUrl(kind === "correct" ? room?.correct_url : room?.wrong_url);
    chRef.current?.send({ type: "broadcast", event: "sfx", payload: { kind } });
  };

  if (room === undefined) return <p className="p-10 text-center">Loading…</p>;
  if (room === null) return <p className="p-10 text-center font-display text-3xl">Room not found</p>;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Room code</p>
          <h1 className="glow-text text-7xl text-primary">{code}</h1>
          <button onClick={() => navigator.clipboard?.writeText(link)} className="mt-1 break-all text-left text-sm text-muted-foreground underline">
            {link} (copy)
          </button>
          <a href={`/screen/${code}`} target="_blank" rel="noreferrer" className="mt-1 block text-sm font-bold text-primary underline">
            Open "who buzzed first" screen ↗
          </a>
          <label className="mt-2 flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={!!room.show_leaderboard}
              onChange={(e) => supabase.from("rooms").update({ show_leaderboard: e.target.checked }).eq("code", code).then(refresh)}
            />
            Show leaderboard on that screen
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => sfx("correct")} className="rounded-2xl bg-accent px-6 py-4 font-display text-xl text-accent-foreground">✓ CORRECT</button>
          <button onClick={() => sfx("wrong")} className="rounded-2xl bg-destructive px-6 py-4 font-display text-xl text-destructive-foreground">✗ WRONG</button>
          <button onClick={reset} className="rounded-2xl bg-primary px-6 py-4 font-display text-xl text-primary-foreground">RESET BUZZERS</button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="mb-4 text-2xl">ROUND {round} — BUZZ ORDER</h2>
          {order.length === 0 && <p className="py-8 text-center text-muted-foreground">Waiting for buzzes…</p>}
          <ol className="space-y-2">
            {order.map((b, i) => (
              <li key={b.id} className={`flex items-center gap-4 rounded-2xl px-4 py-3 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                <span className="font-display text-3xl">{i + 1}</span>
                <span className="flex-1 truncate text-2xl font-extrabold">{b.player_name}</span>
                <span className="text-right font-mono text-sm">
                  {fmtTime(b.created_at)}
                  <br />
                  {i > 0 && `+${new Date(b.created_at).getTime() - t0} ms`}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="mb-4 text-2xl">SCOREBOARD</h2>
          {players.length === 0 && <p className="py-8 text-center text-muted-foreground">No players yet — share the code!</p>}
          <ul className="space-y-2">
            {[...players].sort((a, b) => b.score - a.score).map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-2">
                <span className="flex-1 truncate text-xl font-bold">{p.name}</span>
                <button onClick={() => score(p, -1)} className="h-12 w-12 rounded-xl bg-muted font-display text-2xl">−</button>
                <span className="w-14 text-center font-display text-3xl text-primary">{p.score}</span>
                <button onClick={() => score(p, 1)} className="h-12 w-12 rounded-xl bg-accent font-display text-2xl text-accent-foreground">+</button>
                <button onClick={() => kick(p)} aria-label="Remove" className="px-2 text-muted-foreground">✕</button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-4 text-2xl">SOUNDS</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <SoundSlot code={code} kind="buzzer" label="Buzzer (all players)" url={room.buzzer_url} onDone={refresh} />
          <SoundSlot code={code} kind="correct" label="Correct" url={room.correct_url} onDone={refresh} />
          <SoundSlot code={code} kind="wrong" label="Wrong" url={room.wrong_url} onDone={refresh} />
        </div>
      </section>
    </main>
  );
}

function SoundSlot({ code, kind, label, url, onDone }: { code: string; kind: "buzzer" | "correct" | "wrong"; label: string; url: string | null; onDone: () => void }) {
  const [state, setState] = useState("");
  return (
    <div className="rounded-2xl bg-secondary p-4">
      <p className="font-bold">{label}</p>
      <p className="mb-3 text-sm text-muted-foreground">{url ? "Uploaded ✓" : "None yet"} {state}</p>
      <div className="flex gap-2">
        <label className="flex-1 cursor-pointer rounded-xl bg-primary px-3 py-3 text-center font-bold text-primary-foreground">
          Upload
          <input
            type="file"
            accept="audio/mpeg,audio/wav,audio/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setState("— uploading…");
              try {
                await uploadSound(code, kind, f);
                setState("");
                onDone();
              } catch {
                setState("— upload failed");
              }
            }}
          />
        </label>
        <button disabled={!url} onClick={() => playUrl(url)} className="rounded-xl bg-muted px-4 font-bold disabled:opacity-40">▶</button>
      </div>
    </div>
  );
}
