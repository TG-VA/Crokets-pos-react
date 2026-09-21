import { describe, it, expect, vi } from "vitest";

import {
  loadProductDiscountData,
  saveProductModifications,
} from "./productModifyDataService";

describe("productModifyDataService", () => {
  describe("loadProductDiscountData", () => {
    it("normaliza un descuento habilitado", async () => {
      const salePrice = 200;
      const getProductDiscountByProductId = vi.fn().mockResolvedValue({
        success: true,
        data: {
          enabled: true,
          discount_percent: 10,
          discount_concept: "PROMO",
        },
        error: null,
      });

      const result = await loadProductDiscountData(
        "p1",
        salePrice,
        getProductDiscountByProductId
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(result.discount.enabled).toBe(true);
      expect(result.discount.discount_percent).toBe(10);
      expect(result.discount.discount_concept).toBe("PROMO");
      expect(result.discount.discount_price).toBe("180.00");
    });

    it("normaliza un descuento deshabilitado con precio vacio", async () => {
      const getProductDiscountByProductId = vi.fn().mockResolvedValue({
        success: true,
        data: {
          enabled: false,
          discount_percent: 0,
          discount_concept: "",
        },
        error: null,
      });

      const result = await loadProductDiscountData(
        "p1",
        100,
        getProductDiscountByProductId
      );

      expect(result.success).toBe(true);
      expect(result.discount.enabled).toBe(false);
      expect(result.discount.discount_price).toBe("");
    });

    it("propaga el error del callback", async () => {
      const getProductDiscountByProductId = vi.fn().mockResolvedValue({
        success: false,
        data: null,
        error: "No se pudo cargar el descuento.",
      });

      const result = await loadProductDiscountData(
        "p1",
        100,
        getProductDiscountByProductId
      );

      expect(result.success).toBe(false);
      expect(result.discount).toBeNull();
      expect(result.error).toBe("No se pudo cargar el descuento.");
    });

    it("devuelve error sin id de producto", async () => {
      const result = await loadProductDiscountData(null, 100, vi.fn());

      expect(result.success).toBe(false);
      expect(result.error).toBe("No se recibió el producto.");
    });

    it("captura excepciones del callback", async () => {
      const getProductDiscountByProductId = vi
        .fn()
        .mockRejectedValue(new Error("boom"));
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await loadProductDiscountData(
        "p1",
        100,
        getProductDiscountByProductId
      );

      expect(result.success).toBe(false);
      expect(result.discount).toBeNull();
      expect(result.error).toBe("boom");

      consoleError.mockRestore();
    });
  });

  describe("saveProductModifications", () => {
    const selectedProduct = { id: "p1", codigo: "7501001234567" };
    const payload = { codigo: "7501001234567" };
    const discountPayload = { enabled: false };

    it("actualiza producto y descuento cuando todo es exitoso", async () => {
      const updateProductByCodigo = vi.fn().mockResolvedValue({
        success: true,
        error: null,
      });
      const upsertProductDiscount = vi.fn().mockResolvedValue({
        success: true,
        error: null,
      });

      const result = await saveProductModifications({
        updateProductByCodigo,
        upsertProductDiscount,
        selectedProduct,
        payload,
        discountPayload,
      });

      expect(result).toEqual({ success: true, error: null, partial: false });
      expect(updateProductByCodigo).toHaveBeenCalledWith(
        selectedProduct.codigo,
        payload
      );
      expect(upsertProductDiscount).toHaveBeenCalledWith(
        selectedProduct.id,
        discountPayload
      );
    });

    it("no intenta el descuento si falla el producto", async () => {
      const updateProductByCodigo = vi.fn().mockResolvedValue({
        success: false,
        error: "No se pudo actualizar.",
      });
      const upsertProductDiscount = vi.fn();

      const result = await saveProductModifications({
        updateProductByCodigo,
        upsertProductDiscount,
        selectedProduct,
        payload,
        discountPayload,
      });

      expect(result).toEqual({
        success: false,
        error: "No se pudo actualizar.",
        partial: false,
      });
      expect(upsertProductDiscount).not.toHaveBeenCalled();
    });

    it("marca parcial cuando el producto se guarda pero el descuento falla", async () => {
      const updateProductByCodigo = vi.fn().mockResolvedValue({
        success: true,
        error: null,
      });
      const upsertProductDiscount = vi.fn().mockResolvedValue({
        success: false,
        error: "Fallo en descuento.",
      });

      const result = await saveProductModifications({
        updateProductByCodigo,
        upsertProductDiscount,
        selectedProduct,
        payload,
        discountPayload,
      });

      expect(result.success).toBe(false);
      expect(result.partial).toBe(true);
      expect(result.error).toBe("Fallo en descuento.");
    });

    it("captura excepciones inesperadas", async () => {
      const updateProductByCodigo = vi
        .fn()
        .mockRejectedValue(new Error("network"));
      const upsertProductDiscount = vi.fn();
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await saveProductModifications({
        updateProductByCodigo,
        upsertProductDiscount,
        selectedProduct,
        payload,
        discountPayload,
      });

      expect(result.success).toBe(false);
      expect(result.partial).toBe(false);
      expect(result.error).toBe("network");

      consoleError.mockRestore();
    });
  });
});
