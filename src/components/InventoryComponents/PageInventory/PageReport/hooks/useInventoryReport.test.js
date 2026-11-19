import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const branchState = vi.hoisted(() => ({ current: null }));

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: branchState.current }),
}));

vi.mock("../../../../../lib/supabaseClient", () => {
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
  };
  return {
    supabase: {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock("../services/inventoryReportService", () => ({
  fetchBranchOptions: vi.fn(),
  fetchInventoryReportRows: vi.fn(),
  getBranchOptionsFallback: vi.fn(() => []),
}));

import useInventoryReport from "./useInventoryReport";
import { supabase } from "../../../../../lib/supabaseClient";
import {
  fetchBranchOptions,
  fetchInventoryReportRows,
} from "../services/inventoryReportService";

const emitRealtimeChange = (
  table,
  payload = { eventType: "UPDATE", new: {}, old: {} }
) => {
  const channel = supabase.channel();
  const binding = channel.on.mock.calls.find(
    ([, config]) => config?.table === table
  );
  act(() => binding[2](payload));
};

describe("useInventoryReport sucursal inicial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchBranchOptions.mockResolvedValue([{ id: "b1", name: "Centro" }]);
    fetchInventoryReportRows.mockResolvedValue([{ id: "r1" }]);
  });

  it("una terminal admin no preselecciona sucursal ni consulta inventario", async () => {
    branchState.current = { id: "adm", branch_type: "admin" };

    const { result } = renderHook(() => useInventoryReport());

    await waitFor(() => expect(fetchBranchOptions).toHaveBeenCalled());
    expect(result.current.selectedBranchId).toBe("");
    expect(result.current.rows).toEqual([]);
    expect(fetchInventoryReportRows).not.toHaveBeenCalled();

    act(() => result.current.handleBranchChange("b1"));

    expect(result.current.selectedBranchId).toBe("b1");
    await waitFor(() =>
      expect(fetchInventoryReportRows).toHaveBeenCalledWith("b1")
    );
  });

  it("una terminal operativa preselecciona su sucursal", async () => {
    branchState.current = { id: "b1", branch_type: "operational" };

    const { result } = renderHook(() => useInventoryReport());

    expect(result.current.selectedBranchId).toBe("b1");
    await waitFor(() =>
      expect(fetchInventoryReportRows).toHaveBeenCalledWith("b1")
    );
    await waitFor(() => expect(result.current.rows).toEqual([{ id: "r1" }]));
  });
});

describe("useInventoryReport ruta unica de carga", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    branchState.current = { id: "b1", branch_type: "operational" };
    fetchBranchOptions.mockResolvedValue([{ id: "b1", name: "Centro" }]);
  });

  it("un cambio en tiempo real recarga el inventario por la misma consulta", async () => {
    fetchInventoryReportRows
      .mockResolvedValueOnce([{ id: "r1" }])
      .mockResolvedValueOnce([{ id: "r2" }]);

    const { result } = renderHook(() => useInventoryReport());
    await waitFor(() => expect(result.current.rows).toEqual([{ id: "r1" }]));

    emitRealtimeChange("branch_inventory");

    await waitFor(() => expect(result.current.rows).toEqual([{ id: "r2" }]));
    expect(fetchInventoryReportRows).toHaveBeenCalledTimes(2);
    expect(fetchInventoryReportRows).toHaveBeenLastCalledWith("b1");
  });

  it("un cambio de precio de un producto mostrado no recarga el reporte", async () => {
    const row = {
      productId: "p1",
      codigo: "7501",
      nombre: "CROQUETA",
      depto: "ALIMENTO",
      departmentId: "d1",
      tracksInventory: true,
    };
    fetchInventoryReportRows.mockResolvedValue([row]);

    const { result } = renderHook(() => useInventoryReport());
    await waitFor(() => expect(result.current.rows).toEqual([row]));

    emitRealtimeChange("products", {
      eventType: "UPDATE",
      new: {
        id: "p1",
        barcode: "7501",
        name: "CROQUETA",
        department_id: "d1",
        status: true,
        tracks_inventory: true,
        sale_price: 120,
      },
      old: { id: "p1" },
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(fetchInventoryReportRows).toHaveBeenCalledTimes(1);
  });

  it("un cambio de sucursales recarga las opciones", async () => {
    fetchInventoryReportRows.mockResolvedValue([]);
    fetchBranchOptions
      .mockResolvedValueOnce([{ id: "b1", name: "Centro" }])
      .mockResolvedValueOnce([
        { id: "b1", name: "Centro" },
        { id: "b2", name: "Norte" },
      ]);

    const { result } = renderHook(() => useInventoryReport());
    await waitFor(() => expect(result.current.branchOptions).toHaveLength(1));

    emitRealtimeChange("branches");

    await waitFor(() => expect(result.current.branchOptions).toHaveLength(2));
  });

  it("descarta la respuesta de una sucursal ya reemplazada", async () => {
    let resolveFirst;
    fetchInventoryReportRows
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveFirst = resolve))
      )
      .mockResolvedValueOnce([{ id: "b2-row" }]);

    const { result } = renderHook(() => useInventoryReport());
    act(() => result.current.handleBranchChange("b2"));

    await waitFor(() =>
      expect(result.current.rows).toEqual([{ id: "b2-row" }])
    );

    await act(async () => resolveFirst([{ id: "b1-row" }]));
    expect(result.current.rows).toEqual([{ id: "b2-row" }]);
  });
});

describe("useInventoryReport ante error de carga", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    branchState.current = { id: "b1", branch_type: "operational" };
    fetchBranchOptions.mockResolvedValue([{ id: "b1", name: "Centro" }]);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("conserva las ultimas filas validas y muestra el error", async () => {
    fetchInventoryReportRows
      .mockResolvedValueOnce([{ id: "r1" }])
      .mockRejectedValueOnce(new Error("red caida"));

    const { result } = renderHook(() => useInventoryReport());
    await waitFor(() => expect(result.current.rows).toEqual([{ id: "r1" }]));

    emitRealtimeChange("branch_inventory");

    await waitFor(() =>
      expect(result.current.error).toBe(
        "No se pudo cargar el reporte de inventario."
      )
    );
    expect(result.current.rows).toEqual([{ id: "r1" }]);
  });

  it("no muestra filas de otra sucursal si falla la carga de la nueva", async () => {
    fetchInventoryReportRows
      .mockResolvedValueOnce([{ id: "r1" }])
      .mockRejectedValueOnce(new Error("red caida"));

    const { result } = renderHook(() => useInventoryReport());
    await waitFor(() => expect(result.current.rows).toEqual([{ id: "r1" }]));

    act(() => result.current.handleBranchChange("b2"));

    await waitFor(() => expect(result.current.error).not.toBe(""));
    expect(result.current.rows).toEqual([]);
  });
});
