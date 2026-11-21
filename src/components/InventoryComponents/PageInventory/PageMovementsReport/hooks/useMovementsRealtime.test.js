import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { subscribeToMovements, unsubscribe } = vi.hoisted(() => ({
  subscribeToMovements: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("../services/movementsRealtimeService", () => ({
  FAILED_REALTIME_STATUSES: new Set(["CHANNEL_ERROR", "TIMED_OUT"]),
  subscribeToMovements,
}));

import useMovementsRealtime from "./useMovementsRealtime";

const lastSubscription = () => subscribeToMovements.mock.calls.at(-1)[0];

describe("useMovementsRealtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    subscribeToMovements.mockReturnValue(unsubscribe);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no sondea mientras el canal esta sano", () => {
    const reloadMovements = vi.fn();
    renderHook(() =>
      useMovementsRealtime({ selectedBranchId: "b1", reloadMovements })
    );

    lastSubscription().onStatusChange("SUBSCRIBED");
    vi.advanceTimersByTime(90000);

    expect(reloadMovements).not.toHaveBeenCalled();
  });

  it("sondea cada 30 s solo tras un fallo y para al reconectar", () => {
    const reloadMovements = vi.fn();
    renderHook(() =>
      useMovementsRealtime({ selectedBranchId: "b1", reloadMovements })
    );

    lastSubscription().onStatusChange("CHANNEL_ERROR");
    lastSubscription().onStatusChange("TIMED_OUT");
    vi.advanceTimersByTime(60000);
    expect(reloadMovements).toHaveBeenCalledTimes(2);

    lastSubscription().onStatusChange("SUBSCRIBED");
    vi.advanceTimersByTime(60000);
    expect(reloadMovements).toHaveBeenCalledTimes(2);
  });

  it("agrupa cambios seguidos en una sola recarga", () => {
    const reloadMovements = vi.fn();
    renderHook(() =>
      useMovementsRealtime({ selectedBranchId: "b1", reloadMovements })
    );

    lastSubscription().onChange();
    lastSubscription().onChange();
    vi.advanceTimersByTime(500);

    expect(reloadMovements).toHaveBeenCalledTimes(1);
  });

  it("cierra canal y timers al desmontar o cambiar de sucursal", () => {
    const reloadMovements = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ branchId }) =>
        useMovementsRealtime({ selectedBranchId: branchId, reloadMovements }),
      { initialProps: { branchId: "b1" } }
    );

    lastSubscription().onStatusChange("CHANNEL_ERROR");
    lastSubscription().onChange();
    rerender({ branchId: "b2" });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(lastSubscription().branchId).toBe("b2");

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(60000);
    expect(reloadMovements).not.toHaveBeenCalled();
  });

  it("no se suscribe sin sucursal", () => {
    renderHook(() =>
      useMovementsRealtime({ selectedBranchId: "", reloadMovements: vi.fn() })
    );

    expect(subscribeToMovements).not.toHaveBeenCalled();
  });
});
