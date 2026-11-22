import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("./useKardexMovementSlots", () => ({
  default: () => ({
    movementsState: [
      {
        movements: [
          {
            id: "m1",
            movement_type: "transfer_in",
            quantity: 3,
            previous_stock: 2,
            new_stock: 5,
            user_id: "u1",
            related_branch_id: "b2",
          },
          { id: "m2", movement_type: "sale", quantity: 1, user_id: "u404" },
        ],
        loading: false,
        error: "",
      },
      { movements: [], loading: false, error: "" },
    ],
    loadSlotMovements: vi.fn(),
    refreshSlotSilently: vi.fn(),
    clearMovementSlot: vi.fn(),
  }),
}));

vi.mock("./useKardexRealtime", () => ({ default: () => {} }));

vi.mock("./useKardexUserNames", () => ({
  default: () => new Map([["u1", "CAJERO"]]),
}));

vi.mock("./useKardexBranchNames", () => ({
  default: () => new Map([["b2", "CENTRO"]]),
}));

import useKardexMovements from "./useKardexMovements";

describe("useKardexMovements enriquecimiento de filas", () => {
  it("aplica userName y relatedBranchName a cada fila", () => {
    const product = { id: "p1", nombre: "ALIMENTO" };

    const { result } = renderHook(() =>
      useKardexMovements({
        selectedProducts: [product, null],
        selectedProductIds: ["p1"],
      })
    );

    const [firstRow, secondRow] = result.current.rowsBySlot[0];

    expect(firstRow.userName).toBe("CAJERO");
    expect(firstRow.relatedBranchName).toBe("CENTRO");

    expect(secondRow.userName).toBe("");
    expect(secondRow.relatedBranchName).toBe("");

    expect(result.current.rowsBySlot[1]).toEqual([]);
  });
});
