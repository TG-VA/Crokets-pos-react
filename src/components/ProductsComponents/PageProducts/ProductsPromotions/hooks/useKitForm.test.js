import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKitForm } from "./useKitForm";
import { validateKitForm } from "../services/kitFormValidationService";

const setup = () => {
  const showAppAlert = vi.fn();
  const showAppConfirm = vi.fn();
  const hook = renderHook(() => useKitForm({ showAppAlert, showAppConfirm }));
  return { ...hook, showAppAlert, showAppConfirm };
};

const product = { id: 1, name: "Croqueta", sale_price: 100, cost_price: 60 };

describe("useKitForm", () => {
  it("arranca vacio e incompleto", () => {
    const { result } = setup();
    expect(result.current.form.max_kits_per_sale).toBe("1");
    expect(result.current.selectedProducts).toEqual([]);
    expect(result.current.isFormComplete).toBe(false);
  });

  it("agrega un producto y calcula total y descuento", () => {
    const { result } = setup();
    act(() => result.current.addProductToKit(product));
    act(() => result.current.updateField("price", "80"));
    expect(result.current.selectedProductsTotal).toBe(100);
    expect(result.current.kitDiscount).toBe(20);
    expect(result.current.kitDiscountPercent).toBe(20);
  });

  it("rechaza un producto repetido con alerta", () => {
    const { result, showAppAlert } = setup();
    act(() => result.current.addProductToKit(product));
    act(() => result.current.addProductToKit(product));
    expect(result.current.selectedProducts).toHaveLength(1);
    expect(showAppAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Producto repetido" })
    );
  });

  it("limpia sin confirmar cuando no hay datos", () => {
    const { result, showAppConfirm } = setup();
    act(() => result.current.handleClearForm());
    expect(showAppConfirm).not.toHaveBeenCalled();
  });

  it("pide confirmacion al limpiar con datos y resetea al confirmar", () => {
    const { result, showAppConfirm } = setup();
    act(() => result.current.updateField("barcode", "123"));
    act(() => result.current.handleClearForm());
    expect(showAppConfirm).toHaveBeenCalledTimes(1);
    act(() => showAppConfirm.mock.calls[0][0].onConfirm());
    expect(result.current.form.barcode).toBe("");
  });

  it("al editar un kit sin fechas marca Sin fecha limite y valida", () => {
    const { result } = setup();
    const kit = {
      starts_on: null,
      ends_on: null,
      products: { barcode: "K1", name: "KIT", sale_price: 80 },
    };
    act(() =>
      result.current.loadKitIntoForm(kit, [{ products: product, quantity: 1 }])
    );
    expect(result.current.form.no_starts_on).toBe(true);
    expect(result.current.form.no_ends_on).toBe(true);
    expect(
      validateKitForm(result.current.form, result.current.selectedProducts, {
        today: "2026-11-10",
      })
    ).toBeNull();
  });
});
