import { describe, it, expect } from "vitest";

import { getHistoryDestinationLock } from "./ordersHistoryDestinationLock";

describe("getHistoryDestinationLock", () => {
  it("no bloquea el destino para un administrador", () => {
    expect(
      getHistoryDestinationLock({ isAdmin: true, activeBranchId: "b1" })
    ).toEqual({ isLocked: false, lockedDestinationId: null });
  });

  it("fija el destino a la sucursal activa para un no administrador", () => {
    expect(
      getHistoryDestinationLock({ isAdmin: false, activeBranchId: "b1" })
    ).toEqual({ isLocked: true, lockedDestinationId: "b1" });
  });

  it("trata un usuario sin rol o nulo como no administrador", () => {
    expect(
      getHistoryDestinationLock({ isAdmin: undefined, activeBranchId: "b1" })
        .isLocked
    ).toBe(true);
    expect(
      getHistoryDestinationLock({ isAdmin: null, activeBranchId: "b1" })
        .lockedDestinationId
    ).toBe("b1");
  });

  it("no bloquea con valor vacio si no hay sucursal activa", () => {
    expect(
      getHistoryDestinationLock({ isAdmin: false, activeBranchId: "" })
    ).toEqual({ isLocked: false, lockedDestinationId: null });
    expect(getHistoryDestinationLock()).toEqual({
      isLocked: false,
      lockedDestinationId: null,
    });
  });
});
