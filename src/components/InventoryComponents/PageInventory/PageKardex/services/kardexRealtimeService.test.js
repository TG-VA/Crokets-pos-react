import { describe, expect, it, vi } from "vitest";

const { builder, channel, removeChannel } = vi.hoisted(() => {
  const builder = {};
  builder.on = vi.fn(() => builder);
  builder.subscribe = vi.fn(() => builder);

  return { builder, channel: vi.fn(() => builder), removeChannel: vi.fn() };
});

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { channel, removeChannel },
}));

import { subscribeToKardexMovements } from "./kardexRealtimeService";

describe("subscribeToKardexMovements", () => {
  it("abre el canal filtrado por sucursal y lo cierra al desuscribir", () => {
    const onChange = vi.fn();
    const onStatus = vi.fn();

    const unsubscribe = subscribeToKardexMovements({
      branchId: "b1",
      onChange,
      onStatus,
    });

    expect(channel).toHaveBeenCalledWith("kardex-realtime-b1");
    expect(builder.on).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "inventory_movements",
        filter: "branch_id=eq.b1",
      },
      onChange
    );
    expect(builder.subscribe).toHaveBeenCalledWith(onStatus);

    unsubscribe();

    expect(removeChannel).toHaveBeenCalledWith(builder);
  });
});
