import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

vi.mock("../../../../../services/branchScopeService", () => ({
  fetchOperationalBranches: vi.fn(),
  isOperationalBranch: (branch) => branch?.branch_type === "operational",
}));

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchOperationalBranches } from "../../../../../services/branchScopeService";
import {
  fetchBranchOptions,
  fetchInventoryReportRows,
  getBranchOptionsFallback,
} from "./inventoryReportService";

const mockReport = (data, error = null) =>
  supabase.rpc.mockResolvedValue({ data, error });

const reportRow = (kind, id, overrides = {}) => ({
  row_kind: kind,
  inventory_row_id: kind === "inventory" ? `inv-${id}` : null,
  product_id: id,
  barcode: `C-${id}`,
  name: `PRODUCTO ${id}`,
  department_id: "d1",
  department_name: "ALIMENTO",
  tracks_inventory: kind !== "no_stock",
  stock: kind === "inventory" ? 5 : null,
  min_stock: kind === "inventory" ? 1 : null,
  max_stock: kind === "inventory" ? 10 : null,
  ...overrides,
});

describe("fetchInventoryReportRows: RPC sin tope de filas", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  it("llama una sola vez al RPC con la sucursal", async () => {
    mockReport([]);

    await fetchInventoryReportRows("b1");

    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith("get_branch_inventory_report", {
      p_branch_id: "b1",
    });
  });

  it("devuelve todas las filas aunque superen el antiguo tope de 10000", async () => {
    mockReport(
      Array.from({ length: 12000 }, (_, index) =>
        reportRow("inventory", `p-${index}`)
      )
    );

    const rows = await fetchInventoryReportRows("b1");

    expect(rows).toHaveLength(12000);
  });

  it("no consulta sin sucursal", async () => {
    await expect(fetchInventoryReportRows(null)).resolves.toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("propaga el error del RPC tal cual", async () => {
    const rpcError = new Error("permission denied");
    mockReport(null, rpcError);

    await expect(fetchInventoryReportRows("b1")).rejects.toBe(rpcError);
  });

  it("ignora filas sin producto o con row_kind desconocido", async () => {
    mockReport([
      reportRow("inventory", null),
      reportRow("otro", "p2"),
      reportRow("inventory", "p3"),
    ]);

    const rows = await fetchInventoryReportRows("b1");

    expect(rows.map((row) => row.productId)).toEqual(["p3"]);
  });
});

describe("fetchInventoryReportRows: mapeo por tipo de fila", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  it("mapea la fila de inventario con existencia, minimo y maximo", async () => {
    mockReport([reportRow("inventory", "p1")]);

    const [row] = await fetchInventoryReportRows("b1");

    expect(row).toEqual({
      inventoryRowId: "inv-p1",
      productId: "p1",
      codigo: "C-p1",
      nombre: "PRODUCTO p1",
      depto: "ALIMENTO",
      departmentId: "d1",
      existencia: 5,
      min: 1,
      max: 10,
      tracksInventory: true,
      noStockProduct: false,
      noBranchRecord: false,
    });
  });

  it("una fila de inventario con valores nulos muestra 0", async () => {
    mockReport([
      reportRow("inventory", "p1", {
        stock: null,
        min_stock: null,
        max_stock: null,
        tracks_inventory: null,
      }),
    ]);

    const [row] = await fetchInventoryReportRows("b1");

    expect(row).toMatchObject({
      existencia: 0,
      min: 0,
      max: 0,
      tracksInventory: true,
    });
  });

  it("mapea con flag explicito y valores nulos al producto sin fila", async () => {
    mockReport([reportRow("no_branch_record", "p1")]);

    const [row] = await fetchInventoryReportRows("b1");

    expect(row).toMatchObject({
      productId: "p1",
      inventoryRowId: null,
      existencia: null,
      min: null,
      max: null,
      departmentId: "d1",
      tracksInventory: true,
      noStockProduct: false,
      noBranchRecord: true,
    });
  });

  it("los productos sin control de inventario no se marcan sin registro", async () => {
    mockReport([reportRow("no_stock", "s1")]);

    const [row] = await fetchInventoryReportRows("b1");

    expect(row).toMatchObject({
      productId: "s1",
      departmentId: "d1",
      existencia: null,
      tracksInventory: false,
      noStockProduct: true,
      noBranchRecord: false,
    });
  });

  it("ordena registrados, luego sin registro, luego sin control", async () => {
    mockReport([
      reportRow("no_stock", "s1"),
      reportRow("no_branch_record", "p2"),
      reportRow("inventory", "p1"),
    ]);

    const rows = await fetchInventoryReportRows("b1");

    expect(rows.map((row) => row.productId)).toEqual(["p1", "p2", "s1"]);
  });
});

describe("fetchBranchOptions: solo sucursales operativas", () => {
  beforeEach(() => {
    fetchOperationalBranches.mockReset();
  });

  it("devuelve tal cual las sucursales operativas, sin inyectar otras", async () => {
    const branches = [
      { id: "b1", name: "Centro", code: "" },
      { id: "b2", name: "Torres", code: "T" },
    ];
    fetchOperationalBranches.mockResolvedValue({ data: branches, error: null });

    await expect(fetchBranchOptions({ id: "b1" })).resolves.toEqual(branches);
  });

  it("ante error el fallback ofrece solo la sucursal actual operativa", async () => {
    fetchOperationalBranches.mockResolvedValue({
      data: [],
      error: new Error("boom"),
    });
    const current = {
      id: "b1",
      name: "Centro",
      code: "C",
      branch_type: "operational",
    };

    const error = await fetchBranchOptions(current).catch((err) => err);

    expect(error.branchFallback).toEqual([
      { id: "b1", name: "Centro", code: "C" },
    ]);
    expect(getBranchOptionsFallback(current)).toEqual([
      { id: "b1", name: "Centro", code: "C" },
    ]);
  });

  it("el fallback queda vacio si la sucursal actual no es operativa", () => {
    expect(
      getBranchOptionsFallback({ id: "adm", branch_type: "admin" })
    ).toEqual([]);
    expect(getBranchOptionsFallback(null)).toEqual([]);
  });
});
