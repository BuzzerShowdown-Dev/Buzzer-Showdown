import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { isFrozen } from "@/lib/game";
const room = { freeze_mode: true, freeze_since_round: 1 };
describe("freeze mode", () => {
  it("freezes a player after 2 buzzes", () => {
    expect(isFrozen(room, [{ player_id: "a", round: 1 }, { player_id: "a", round: 2 }], "a")).toBe(true);
  });
  it("does not freeze after 1 buzz", () => {
    expect(isFrozen(room, [{ player_id: "a", round: 1 }], "a")).toBe(false);
  });
  it("ignores buzzes before the last manual reset", () => {
    expect(isFrozen(room, [{ player_id: "a", round: 0 }, { player_id: "a", round: 1 }], "a")).toBe(false);
  });
});
