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
import {
  subscribeToBranchListChanges,
  subscribeToInventoryReportChanges,
} from "./inventoryReportRealtimeService";

const handlerFor = (table) =>
  channel.on.mock.calls.find(([, config]) => config.table === table)[2];

describe("inventoryReportRealtimeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filtra branch_inventory por sucursal y avisa cualquier cambio", () => {
    const onChange = vi.fn();
    subscribeToInventoryReportChanges({
      branchId: "b1",
      onChange,
      isRelevantProductChange: () => false,
      isRelevantDepartmentChange: () => false,
    });

    expect(supabase.channel).toHaveBeenCalledWith(
      "inventory-report-realtime-b1"
    );
    const [, config] = channel.on.mock.calls.find(
      ([, item]) => item.table === "branch_inventory"
    );
    expect(config.filter).toBe("branch_id=eq.b1");

    handlerFor("branch_inventory")({ eventType: "UPDATE" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("solo avisa cambios de productos y departamentos relevantes", () => {
    const onChange = vi.fn();
    const isRelevantProductChange = vi.fn((payload) => payload.relevant);
    subscribeToInventoryReportChanges({
      branchId: "b1",
      onChange,
      isRelevantProductChange,
      isRelevantDepartmentChange: () => false,
    });

    handlerFor("products")({ relevant: false });
    handlerFor("departments")({});
    expect(onChange).not.toHaveBeenCalled();

    handlerFor("products")({ relevant: true });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("cierra el canal al cancelar y reporta fallos de conexion", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const unsubscribe = subscribeToBranchListChanges({ onChange: vi.fn() });

    channel.subscribe.mock.calls[0][0]("CHANNEL_ERROR");
    expect(errorSpy).toHaveBeenCalled();

    unsubscribe();
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
    errorSpy.mockRestore();
  });
});
