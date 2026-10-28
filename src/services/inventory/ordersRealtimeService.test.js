import { describe, it, expect, beforeEach, vi } from "vitest";

const bindings = [];
let removedChannels = [];

vi.mock("../../lib/supabaseClient", () => {
  const channel = (name) => {
    const api = {
      name,
      on: (type, filter, callback) => {
        bindings.push({ name, type, filter: { ...filter }, callback });
        return api;
      },
      subscribe: () => {
        bindings.push({ name, type: "subscribe" });
        return api;
      },
    };

    return api;
  };

  return {
    supabase: {
      channel,
      removeChannel: (channel) => {
        removedChannels.push(channel.name);
      },
    },
  };
});

import { subscribeToStoreOrderChanges } from "./ordersRealtimeService";

describe("ordersRealtimeService", () => {
  beforeEach(() => {
    bindings.length = 0;
    removedChannels = [];
  });

  it("observa store_orders y avisa en cada cambio", () => {
    const onChange = vi.fn();

    subscribeToStoreOrderChanges({ channelName: "orders-test", onChange });

    const binding = bindings.find((b) => b.type === "postgres_changes");

    expect(binding.filter).toEqual({
      event: "*",
      schema: "public",
      table: "store_orders",
    });
    expect(bindings.some((b) => b.type === "subscribe")).toBe(true);

    binding.callback();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("cierra el canal al limpiar", () => {
    const unsubscribe = subscribeToStoreOrderChanges({
      channelName: "orders-cleanup",
      onChange: vi.fn(),
    });

    unsubscribe();

    expect(removedChannels).toEqual(["orders-cleanup"]);
  });
});
