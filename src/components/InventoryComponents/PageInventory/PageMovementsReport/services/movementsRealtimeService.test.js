import { beforeEach, describe, expect, it, vi } from "vitest";

const channel = vi.hoisted(() => ({ on: null, subscribe: null }));

vi.mock("../../../../../lib/supabaseClient", () => {
  channel.on = vi.fn(() => channel);
  channel.subscribe = vi.fn(() => channel);
  return {
    supabase: { channel: vi.fn(() => channel), removeChannel: vi.fn() },
  };
});

import { supabase } from "../../../../../lib/supabaseClient";
import { subscribeToMovements } from "./movementsRealtimeService";

describe("movementsRealtimeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("escucha movimientos y canjes de la sucursal", () => {
    const onChange = vi.fn();
    subscribeToMovements({ branchId: "b1", onChange });

    expect(supabase.channel).toHaveBeenCalledWith(
      "movements-report-realtime-b1"
    );
    const tables = channel.on.mock.calls.map(([, config]) => config.table);
    expect(tables).toEqual(["inventory_movements", "sale_reward_redemptions"]);
    channel.on.mock.calls.forEach(([, config]) =>
      expect(config.filter).toBe("branch_id=eq.b1")
    );

    channel.on.mock.calls[1][2]({ eventType: "INSERT" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("reporta el estado del canal y cierra al cancelar", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onStatusChange = vi.fn();
    const unsubscribe = subscribeToMovements({
      branchId: "b1",
      onChange: vi.fn(),
      onStatusChange,
    });

    channel.subscribe.mock.calls[0][0]("TIMED_OUT");
    expect(onStatusChange).toHaveBeenCalledWith("TIMED_OUT");
    expect(errorSpy).toHaveBeenCalled();

    unsubscribe();
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
    errorSpy.mockRestore();
  });
});
