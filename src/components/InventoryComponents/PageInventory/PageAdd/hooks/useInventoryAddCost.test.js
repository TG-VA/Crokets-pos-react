import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { ENTRY_MODE } from "../services/inventoryAddProjectionService";
import useInventoryAddCost from "./useInventoryAddCost";

const product = {
  product_id: "prod-1",
  codigo: "7501",
  descripcion: "Alimento",
  existencia: 10,
  costo: 100,
  precio: 250,
};

const renderCostHook = ({ selectedProduct = product, quantity = 10 } = {}) =>
  renderHook((props) => useInventoryAddCost(props), {
    initialProps: { selectedProduct, quantity },
  });

const typeCost = (result, value) =>
  act(() => {
    result.current.handleIncomingCostChange({ target: { value } });
  });

const switchMode = (result, mode) =>
  act(() => {
    result.current.setEntryMode(mode);
  });

describe("useInventoryAddCost", () => {
  describe("modo predeterminado", () => {
    it("arranca en compra cuando se abastece inventario", () => {
      const { result } = renderCostHook();

      expect(result.current.entryMode).toBe(ENTRY_MODE.PURCHASE);
      expect(result.current.isPurchase).toBe(true);
    });

    it("precarga el costo vigente del producto", () => {
      const { result } = renderCostHook();

      expect(result.current.incomingCostInput).toBe("100.00");
      expect(result.current.currentCost).toBe(100);
      expect(result.current.costError).toBeNull();
    });

    it("precarga 0.00 cuando el producto no tiene costo", () => {
      const { result } = renderCostHook({
        selectedProduct: { ...product, costo: null, cost_price: null },
      });

      expect(result.current.incomingCostInput).toBe("0.00");
    });

    it("no precarga nada sin producto seleccionado", () => {
      const { result } = renderCostHook({ selectedProduct: null });

      expect(result.current.incomingCostInput).toBe("");
    });
  });

  describe("sanitizacion de la captura", () => {
    it("admite digitos con hasta dos decimales", () => {
      const { result } = renderCostHook();

      for (const value of ["0", "12", "12.3", "12.34", ".5"]) {
        typeCost(result, value);
        expect(result.current.incomingCostInput).toBe(value);
      }
    });

    it("normaliza la coma decimal", () => {
      const { result } = renderCostHook();

      typeCost(result, "399,50");

      expect(result.current.incomingCostInput).toBe("399.50");
    });

    it("descarta la captura invalida en vez de dejar texto a medias", () => {
      const { result } = renderCostHook();

      typeCost(result, "100.00");

      for (const invalid of ["-5", "12.345", "abc", "1e5", "1 000"]) {
        typeCost(result, invalid);
        expect(result.current.incomingCostInput).toBe("100.00");
      }
    });

    it("permite vaciar el campo", () => {
      const { result } = renderCostHook();

      typeCost(result, "");

      expect(result.current.incomingCostInput).toBe("");
      expect(result.current.costError).not.toBeNull();
    });
  });

  describe("validacion", () => {
    it("exige el costo de compra cuando el campo esta vacio", () => {
      const { result } = renderCostHook();

      typeCost(result, "");

      expect(result.current.costError).toBe(
        "Ingresa el costo unitario de compra para valorar el lote."
      );
    });

    it("bloquea el signo negativo en captura", () => {
      const { result } = renderCostHook();

      typeCost(result, "100.00");
      typeCost(result, "-50");

      // La primera defensa es el sanitizador: el signo nunca entra al borrador.
      expect(result.current.incomingCostInput).toBe("100.00");
      expect(result.current.costError).toBeNull();
      expect(result.current.resolveIncomingCostPriceForSubmit()).toBe(100);
    });

    it("no exige costo en modo entrada manual", () => {
      const { result } = renderCostHook();

      typeCost(result, "");
      switchMode(result, ENTRY_MODE.MANUAL);

      expect(result.current.costError).toBeNull();
    });

    it("acepta costo cero en compra porque es una operacion legitima", () => {
      const { result } = renderCostHook();

      typeCost(result, "0");

      expect(result.current.costError).toBeNull();
    });
  });

  describe("resolveIncomingCostPriceForSubmit", () => {
    it("envia el costo capturado en modo compra", () => {
      const { result } = renderCostHook();

      typeCost(result, "399.50");

      expect(result.current.resolveIncomingCostPriceForSubmit()).toBe(399.5);
    });

    it("no envia costo en modo entrada manual para dejar el CPP intacto", () => {
      const { result } = renderCostHook();

      typeCost(result, "399.50");
      switchMode(result, ENTRY_MODE.MANUAL);

      expect(
        result.current.resolveIncomingCostPriceForSubmit()
      ).toBeUndefined();
    });

    it("no envia costo cuando la compra no tiene costo valido", () => {
      const { result } = renderCostHook();

      typeCost(result, "");

      expect(
        result.current.resolveIncomingCostPriceForSubmit()
      ).toBeUndefined();
    });

    it("preserva el modo actual al cambiar de producto", () => {
      const { result, rerender } = renderCostHook();

      switchMode(result, ENTRY_MODE.MANUAL);

      rerender({
        selectedProduct: { ...product, codigo: "9999" },
        quantity: 10,
      });

      expect(result.current.entryMode).toBe(ENTRY_MODE.MANUAL);
    });

    it("descarta el borrador y precarga el costo al cambiar de producto", () => {
      const { result, rerender } = renderCostHook();

      typeCost(result, "399.50");
      expect(result.current.incomingCostInput).toBe("399.50");

      rerender({
        selectedProduct: {
          ...product,
          product_id: "prod-2",
          codigo: "9999",
          costo: 250,
        },
        quantity: 10,
      });

      expect(result.current.incomingCostInput).toBe("250.00");
      expect(result.current.currentCost).toBe(250);
    });

    it("conserva el borrador cuando el producto cambia de identidad sin cambiar de costo", () => {
      const { result, rerender } = renderCostHook();

      typeCost(result, "399.50");

      // `refreshProducts()` reconstruye el catalogo: llega un objeto nuevo con los
      // mismos valores. El texto capturado no debe perderse.
      rerender({ selectedProduct: { ...product }, quantity: 10 });

      expect(result.current.incomingCostInput).toBe("399.50");
    });
  });

  describe("proyeccion", () => {
    it("proyecta el CPP ponderado con la compra captura", () => {
      const { result } = renderCostHook({ quantity: 10 });

      typeCost(result, "400.00");

      expect(result.current.projection.projectedCost).toBe(250);
      expect(result.current.projection.costWillChange).toBe(true);
    });

    it("mantiene el CPP intacto al pasar a entrada manual", () => {
      const { result } = renderCostHook({ quantity: 10 });

      typeCost(result, "400.00");
      switchMode(result, ENTRY_MODE.MANUAL);

      expect(result.current.projection.projectedCost).toBe(100);
      expect(result.current.projection.costWillChange).toBe(false);
    });

    it("recalcula al cambiar la cantidad capturada", () => {
      const { result, rerender } = renderCostHook({ quantity: 10 });

      typeCost(result, "400.00");
      expect(result.current.projection.projectedCost).toBe(250);

      // ((10*100) + (30*400)) / 40 = 325
      rerender({ selectedProduct: product, quantity: 30 });
      expect(result.current.projection.projectedCost).toBe(325);
    });
  });
});
