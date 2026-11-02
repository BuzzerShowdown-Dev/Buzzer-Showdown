import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IDLE_MS, IDLE_WARN_MS } from "@/lib/game";

/** Banner counting down to auto-deletion of an inactive room. */
export function IdleWarning({ code, lastActivity, onDeleted }: { code: string; lastActivity?: string | null; onDeleted: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = lastActivity ? new Date(lastActivity).getTime() + IDLE_MS - now : Infinity;
  const expired = left <= 0;

  useEffect(() => {
    if (!expired) return;
    supabase.rpc("delete_room_if_idle", { _code: code }).then(() => onDeleted());
  }, [expired, code, onDeleted]);

  if (left > IDLE_WARN_MS) return null;
  const s = Math.max(0, Math.ceil(left / 1000));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");

  return (
    <div role="alert" className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-destructive px-4 py-3 text-center text-destructive-foreground">
      <span className="font-bold">No activity — this room will be deleted in</span>
      <span className="font-display text-2xl tabular-nums">{mm}:{ss}</span>
      <button
        onClick={() => supabase.rpc("keep_room", { _code: code }).then(() => onDeleted())}
        className="rounded-xl bg-background px-4 py-2 font-display text-foreground"
      >
        KEEP ROOM
      </button>
    </div>
  );
}
