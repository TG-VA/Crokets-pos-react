import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProductsPromotions } from "./useProductsPromotions";
import { checkKitDuplicates } from "../services/productKitsService";

const showAppAlert = vi.fn();

vi.mock("../../../../../hooks/useAppModal", () => ({
  useAppModal: () => ({
    appModal: { isOpen: false },
    closeAppModal: vi.fn(),
    showAppAlert,
    showAppConfirm: vi.fn(),
  }),
}));

vi.mock("./useKitListActions", () => ({
  useKitListActions: () => ({ kits: [], loadKits: vi.fn() }),
}));

vi.mock("../services/productKitsService", () => ({
  checkKitDuplicates: vi.fn(),
  createNewKitTransaction: vi.fn(),
  updateKitTransaction: vi.fn(),
  fetchKitItems: vi.fn(),
}));

describe("useProductsPromotions handleSaveKit", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-10T18:00:00Z"));
    showAppAlert.mockClear();
    checkKitDuplicates.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rechaza un kit nuevo con fecha de fin vencida sin guardar", async () => {
    const { result } = renderHook(() => useProductsPromotions());
    act(() => {
      result.current.updateField("barcode", "K1");
      result.current.updateField("description", "Kit");
      result.current.updateField("price", "80");
      result.current.updateField("no_starts_on", true);
      result.current.updateField("ends_on", "2026-11-01");
    });

    await act(() => result.current.handleSaveKit());

    expect(showAppAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Vigencia vencida" })
    );
    expect(checkKitDuplicates).not.toHaveBeenCalled();
  });
});
