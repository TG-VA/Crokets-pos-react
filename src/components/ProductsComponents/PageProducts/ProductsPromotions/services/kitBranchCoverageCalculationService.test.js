import { describe, expect, it } from "vitest";
import {
  buildMissingBranchesMessage,
  computeMissingBranches,
} from "./kitBranchCoverageCalculationService";

const branches = [
  { id: "b1", name: "Centro" },
  { id: "b2", name: "Norte" },
  { id: "b3", name: "Sur" },
];

describe("computeMissingBranches", () => {
  it("devuelve las sucursales sin fila de inventario", () => {
    const rows = [{ branch_id: "b1", is_active: true }];
    expect(computeMissingBranches(branches, rows).map((b) => b.id)).toEqual([
      "b2",
      "b3",
    ]);
  });

  it("trata is_active=false como sucursal que no lo tiene", () => {
    const rows = [
      { branch_id: "b1", is_active: true },
      { branch_id: "b2", is_active: false },
      { branch_id: "b3", is_active: true },
    ];
    expect(computeMissingBranches(branches, rows).map((b) => b.id)).toEqual([
      "b2",
    ]);
  });

  it("devuelve vacio si todas las sucursales lo tienen", () => {
    const rows = branches.map((b) => ({ branch_id: b.id, is_active: true }));
    expect(computeMissingBranches(branches, rows)).toEqual([]);
  });

  it("tolera entradas nulas", () => {
    expect(computeMissingBranches(null, null)).toEqual([]);
    expect(computeMissingBranches(branches, null)).toHaveLength(3);
  });
});

describe("buildMissingBranchesMessage", () => {
  it("nombra el producto sin listar sucursales", () => {
    const message = buildMissingBranchesMessage("Croqueta");
    expect(message).toContain("Croqueta");
    expect(message).toContain("es local");
  });
});
