import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { channel, removeChannel, channels } = vi.hoisted(() => {
  const channels = [];

  const channel = vi.fn((name) => {
    const entry = { name, onChange: null, onStatus: null };
    const builder = {
      on: vi.fn((_event, _filter, handler) => {
        entry.onChange = handler;
        return builder;
      }),
      subscribe: vi.fn((handler) => {
        entry.onStatus = handler;
        return builder;
      }),
    };
    entry.builder = builder;
    channels.push(entry);
    return builder;
  });

  return { channel, removeChannel: vi.fn(), channels };
});

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { channel, removeChannel },
}));

import useKardexRealtime from "./useKardexRealtime";

const lastChannel = () => channels.at(-1);

const renderRealtime = (overrides = {}) => {
  const refreshSlotSilently = vi.fn().mockResolvedValue(undefined);
  const view = renderHook((props) => useKardexRealtime(props), {
    initialProps: {
      branchId: "b1",
      selectedProductIds: ["p1", null],
      refreshSlotSilently,
      ...overrides,
    },
  });

  return { ...view, refreshSlotSilently };
};

describe("useKardexRealtime", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    channels.length = 0;
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
  });

  it("no sondea mientras el canal esta sano", () => {
    const { refreshSlotSilently } = renderRealtime();

    lastChannel().onStatus("SUBSCRIBED");
    vi.advanceTimersByTime(90000);

    expect(refreshSlotSilently).not.toHaveBeenCalled();
  });

  it("sondea cada 30 s solo tras un fallo y para al reconectar", () => {
    const { refreshSlotSilently } = renderRealtime();

    lastChannel().onStatus("CHANNEL_ERROR");
    lastChannel().onStatus("TIMED_OUT");
    vi.advanceTimersByTime(60000);
    expect(refreshSlotSilently).toHaveBeenCalledTimes(2);
    expect(refreshSlotSilently).toHaveBeenCalledWith(0);

    lastChannel().onStatus("SUBSCRIBED");
    vi.advanceTimersByTime(60000);
    expect(refreshSlotSilently).toHaveBeenCalledTimes(2);
  });

  it("agrupa cambios seguidos del producto seleccionado en una recarga", () => {
    const { refreshSlotSilently } = renderRealtime();

    lastChannel().onChange({ new: { product_id: "p1" } });
    lastChannel().onChange({ new: { product_id: "p1" } });
    lastChannel().onChange({ new: { product_id: "otro" } });
    vi.advanceTimersByTime(500);

    expect(refreshSlotSilently).toHaveBeenCalledTimes(1);
    expect(refreshSlotSilently).toHaveBeenCalledWith(0);
  });

  it("cierra canal y timers al desmontar o cambiar de sucursal", () => {
    const { rerender, unmount, refreshSlotSilently } = renderRealtime();

    lastChannel().onStatus("CHANNEL_ERROR");
    lastChannel().onChange({ new: { product_id: "p1" } });
    rerender({
      branchId: "b2",
      selectedProductIds: ["p1", null],
      refreshSlotSilently,
    });
    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(lastChannel().name).toBe("kardex-realtime-b2");

    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(60000);
    expect(refreshSlotSilently).not.toHaveBeenCalled();
  });

  it("no se suscribe sin sucursal", () => {
    renderRealtime({ branchId: null });

    expect(channel).not.toHaveBeenCalled();
  });
});
