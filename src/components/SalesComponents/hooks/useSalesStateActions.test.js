import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import useSalesStateActions from "./useSalesStateActions";
import { SALE_CLIENT_EXPIRY_MS } from "../services/salesClientExpiryService";

const buildSetters = () => ({
  setProductos: vi.fn(),
  productosRef: { current: [] },
  setSelectedProduct: vi.fn(),
  setCurrentSaleClient: vi.fn(),
  setCurrentSaleReward: vi.fn(),
  setTicketNumber: vi.fn(),
  setSaleToken: vi.fn(),
  setSaleNotes: vi.fn(),
  setBarcode: vi.fn(),
  setPendingTickets: vi.fn(),
});

const buildDraft = (overrides = {}) => ({
  productos: [{ id: "p1", cantidad: 1 }],
  currentSaleClient: { id: "c1", name: "Ana" },
  currentSaleReward: { id: "r1" },
  ...overrides,
});

const restore = (draft) => {
  const setters = buildSetters();
  const { result } = renderHook(() => useSalesStateActions(setters));
  result.current.restoreSalesDraft(draft);
  return setters;
};

describe("useSalesStateActions: restoreSalesDraft", () => {
  it("restaura el cliente y la recompensa cuando la asignacion sigue vigente", () => {
    const setters = restore(buildDraft({ clientAssignedAt: Date.now() }));

    expect(setters.setCurrentSaleClient).toHaveBeenCalledWith({
      id: "c1",
      name: "Ana",
    });
    expect(setters.setCurrentSaleReward).toHaveBeenCalledWith({ id: "r1" });
  });

  it("descarta el cliente y la recompensa si la asignacion ya expiro", () => {
    const setters = restore(
      buildDraft({ clientAssignedAt: Date.now() - SALE_CLIENT_EXPIRY_MS - 1 })
    );

    expect(setters.setCurrentSaleClient).toHaveBeenCalledWith(null);
    expect(setters.setCurrentSaleReward).toHaveBeenCalledWith(null);
    expect(setters.setProductos).toHaveBeenCalledWith([
      { id: "p1", cantidad: 1 },
    ]);
  });

  it("conserva el cliente de borradores anteriores sin marca de asignacion", () => {
    const setters = restore(buildDraft());

    expect(setters.setCurrentSaleClient).toHaveBeenCalledWith({
      id: "c1",
      name: "Ana",
    });
  });
});
