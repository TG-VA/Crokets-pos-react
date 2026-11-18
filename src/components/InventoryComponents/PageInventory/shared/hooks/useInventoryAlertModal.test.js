import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import useInventoryAlertModal, {
  INITIAL_APP_MODAL,
} from "./useInventoryAlertModal";

describe("useInventoryAlertModal", () => {
  it("inicia cerrado", () => {
    const { result } = renderHook(() => useInventoryAlertModal());

    expect(result.current.appModal).toEqual(INITIAL_APP_MODAL);
  });

  it("abre un aviso con valores por defecto y lo cierra desde confirmar", () => {
    const { result } = renderHook(() => useInventoryAlertModal());

    act(() => {
      result.current.showAppAlert({ message: "Hola" });
    });

    expect(result.current.appModal).toMatchObject({
      isOpen: true,
      type: "info",
      title: "Aviso",
      message: "Hola",
      confirmText: "Entendido",
      showCancel: false,
    });

    act(() => {
      result.current.appModal.onConfirm();
    });

    expect(result.current.appModal.isOpen).toBe(false);
    expect(result.current.appModal.onConfirm).toBeNull();
    expect(result.current.appModal.message).toBe("Hola");
  });
});
