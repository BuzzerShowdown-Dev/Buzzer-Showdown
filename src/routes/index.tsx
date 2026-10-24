import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeCode } from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Buzzer Showdown — Quiz Buzzer for Game Night" },
      { name: "description", content: "Host a quiz room or join with a 4-letter code and hit the big red buzzer." },
      { property: "og:title", content: "Buzzer Showdown — Quiz Buzzer" },
      { property: "og:description", content: "Host a quiz room or join with a 4-letter code." },
    ],
  }),
  component: Index,
});

function Index() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function host() {
    setBusy(true);
    setErr("");
    for (let i = 0; i < 5; i++) {
      const c = makeCode();
      const { error } = await supabase.from("rooms").insert({ code: c });
      if (!error) {
        localStorage.setItem(`host-${c}`, "1");
        return nav({ to: "/host/$code", params: { code: c } });
      }
    }
    setErr("Couldn't create a room, try again.");
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-10 px-6 py-12">
      <div className="text-center">
        <h1 className="glow-text text-7xl text-primary">BUZZER SHOWDOWN</h1>
        <p className="mt-3 text-lg text-muted-foreground">The quiz show buzzer</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === 4) nav({ to: "/room/$code", params: { code } });
        }}
      >
        <label className="block text-sm font-semibold uppercase tracking-widest text-muted-foreground">Join a room</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
          placeholder="ABCD"
          className="w-full rounded-2xl border-2 border-input bg-card px-4 py-5 text-center font-display text-5xl tracking-[0.3em] outline-none focus:border-ring"
        />
        <button disabled={code.length !== 4} className="w-full rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground disabled:opacity-40">
          JOIN
        </button>
      </form>
      <div className="text-center">
        <button onClick={host} disabled={busy} className="rounded-2xl border-2 border-primary px-8 py-4 font-display text-xl text-primary">
          {busy ? "CREATING…" : "HOST A GAME"}
        </button>
        {err && <p className="mt-3 text-destructive">{err}</p>}
      </div>
    </main>
  );
}
