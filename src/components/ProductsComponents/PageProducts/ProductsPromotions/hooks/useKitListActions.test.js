import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("../services/productKitsService", () => ({
  fetchKits: vi.fn(),
  toggleKitStatus: vi.fn(),
  softDeleteKitTransaction: vi.fn(),
  renewKitValidity: vi.fn(),
}));

import {
  fetchKits,
  renewKitValidity,
  softDeleteKitTransaction,
} from "../services/productKitsService";
import { useKitListActions } from "./useKitListActions";

const kit = { id: 7, is_active: true, products: { name: "KIT PRUEBA" } };

const setup = () => {
  const showAppAlert = vi.fn();
  const showAppConfirm = vi.fn();
  const hook = renderHook(() =>
    useKitListActions({
      editingKit: null,
      setEditingKit: vi.fn(),
      resetForm: vi.fn(),
      showAppAlert,
      showAppConfirm,
    })
  );
  return { ...hook, showAppAlert, showAppConfirm };
};

describe("useKitListActions.handleRenewKitValidity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchKits.mockResolvedValue([]);
    renewKitValidity.mockResolvedValue(true);
  });

  it("pide confirmacion y no llama al servicio antes de confirmar", async () => {
    const { result, showAppConfirm } = setup();
    await waitFor(() => expect(fetchKits).toHaveBeenCalled());

    act(() => {
      result.current.handleRenewKitValidity(kit, {
        starts_on: null,
        ends_on: "2026-12-31",
      });
    });

    expect(showAppConfirm).toHaveBeenCalledTimes(1);
    expect(renewKitValidity).not.toHaveBeenCalled();
  });

  it("al confirmar renueva solo las fechas, recarga y avisa", async () => {
    const { result, showAppConfirm, showAppAlert } = setup();
    await waitFor(() => expect(fetchKits).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.handleRenewKitValidity(kit, {
        starts_on: "2026-11-01",
        ends_on: "2026-12-31",
      });
    });
    await act(async () => {
      await showAppConfirm.mock.calls[0][0].onConfirm();
    });

    expect(renewKitValidity).toHaveBeenCalledWith(7, {
      starts_on: "2026-11-01",
      ends_on: "2026-12-31",
    });
    expect(fetchKits).toHaveBeenCalledTimes(2);
    expect(showAppAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" })
    );
  });

  it("rango invalido avisa y no pide confirmacion ni llama al servicio", async () => {
    const { result, showAppConfirm, showAppAlert } = setup();
    await waitFor(() => expect(fetchKits).toHaveBeenCalled());

    act(() => {
      result.current.handleRenewKitValidity(kit, {
        starts_on: "2026-12-31",
        ends_on: "2026-11-01",
      });
    });

    expect(showAppAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "danger" })
    );
    expect(showAppConfirm).not.toHaveBeenCalled();
    expect(renewKitValidity).not.toHaveBeenCalled();
  });

  it("si el servicio falla muestra error y registra console.error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renewKitValidity.mockRejectedValueOnce(new Error("boom"));
    const { result, showAppConfirm, showAppAlert } = setup();
    await waitFor(() => expect(fetchKits).toHaveBeenCalled());

    act(() => {
      result.current.handleRenewKitValidity(kit, {
        starts_on: null,
        ends_on: "2026-12-31",
      });
    });
    await act(async () => {
      await showAppConfirm.mock.calls[0][0].onConfirm();
    });

    expect(errorSpy).toHaveBeenCalled();
    expect(showAppAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "danger" })
    );
    errorSpy.mockRestore();
  });
});

describe("useKitListActions borrado con confirmacion escrita", () => {
  const deletable = { ...kit, kit_product_id: 70 };

  beforeEach(() => {
    vi.clearAllMocks();
    fetchKits.mockResolvedValue([]);
    softDeleteKitTransaction.mockResolvedValue(true);
  });

  it("handleSoftDeleteKit abre el modal propio sin showAppConfirm", async () => {
    const { result, showAppConfirm } = setup();
    await waitFor(() => expect(fetchKits).toHaveBeenCalled());

    act(() => result.current.handleSoftDeleteKit(deletable));

    expect(result.current.deletingKit).toBe(deletable);
    expect(showAppConfirm).not.toHaveBeenCalled();
    expect(softDeleteKitTransaction).not.toHaveBeenCalled();
  });

  it("confirmar borra, cierra el modal y recarga", async () => {
    const { result } = setup();
    await waitFor(() => expect(fetchKits).toHaveBeenCalledTimes(1));

    act(() => result.current.handleSoftDeleteKit(deletable));
    await act(async () => {
      await result.current.confirmSoftDeleteKit(deletable);
    });

    expect(softDeleteKitTransaction).toHaveBeenCalledWith(7, 70);
    expect(result.current.deletingKit).toBeNull();
    expect(fetchKits).toHaveBeenCalledTimes(2);
  });

  it("cancelar cierra el modal sin borrar", async () => {
    const { result } = setup();
    await waitFor(() => expect(fetchKits).toHaveBeenCalled());

    act(() => result.current.handleSoftDeleteKit(deletable));
    act(() => result.current.cancelSoftDeleteKit());

    expect(result.current.deletingKit).toBeNull();
    expect(softDeleteKitTransaction).not.toHaveBeenCalled();
  });
});
