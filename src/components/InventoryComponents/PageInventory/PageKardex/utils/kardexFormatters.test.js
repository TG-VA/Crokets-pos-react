import { describe, it, expect } from "vitest";

import {
  formatKardexCurrency,
  formatKardexOptionalCurrency,
  getKardexMovementDescription,
  sanitizeKardexReason,
} from "./kardexFormatters";

describe("formatKardexOptionalCurrency", () => {
  it("formatea un importe positivo con el formato de moneda del kardex", () => {
    expect(formatKardexOptionalCurrency(120.5)).toBe(
      formatKardexCurrency(120.5)
    );
    expect(formatKardexOptionalCurrency(120.5)).toContain("$");
  });

  it("acepta importes numericos enviados como texto", () => {
    expect(formatKardexOptionalCurrency("240")).toBe(formatKardexCurrency(240));
  });

  it("devuelve guion cuando el importe no aplica", () => {
    expect(formatKardexOptionalCurrency(null)).toBe("—");
    expect(formatKardexOptionalCurrency(undefined)).toBe("—");
    expect(formatKardexOptionalCurrency("")).toBe("—");
  });

  it("devuelve guion cuando el importe es cero, negativo o no numerico", () => {
    expect(formatKardexOptionalCurrency(0)).toBe("—");
    expect(formatKardexOptionalCurrency("0")).toBe("—");
    expect(formatKardexOptionalCurrency(-15)).toBe("—");
    expect(formatKardexOptionalCurrency("sin-dato")).toBe("—");
    expect(formatKardexOptionalCurrency(NaN)).toBe("—");
    expect(formatKardexOptionalCurrency(Infinity)).toBe("—");
  });
});

describe("sanitizeKardexReason", () => {
  it("quita el prefijo tecnico inventory_add y conserva el motivo humano", () => {
    expect(
      sanitizeKardexReason("inventory_add: Alta a inventario (manual)")
    ).toEqual({
      reason: "Alta a inventario (manual)",
      strippedTechnicalType: "inventory_add",
    });
  });

  it("quita prefijos tecnicos anidados", () => {
    expect(
      sanitizeKardexReason("inventory_add: transfer_out: Merma de traslado")
    ).toEqual({
      reason: "Merma de traslado",
      strippedTechnicalType: "inventory_add",
    });
  });

  it("reporta el slug cuando el motivo era solo el identificador tecnico", () => {
    expect(sanitizeKardexReason("inventory_add")).toEqual({
      reason: "",
      strippedTechnicalType: "inventory_add",
    });
  });

  it("tolera el prefijo tecnico sin detalle detrás", () => {
    expect(sanitizeKardexReason("inventory_add:")).toEqual({
      reason: "",
      strippedTechnicalType: "inventory_add",
    });
  });

  it("respeta motivos humanos que contienen dos puntos", () => {
    expect(sanitizeKardexReason("Ajuste por merma: revisar en cierre")).toEqual(
      {
        reason: "Ajuste por merma: revisar en cierre",
        strippedTechnicalType: null,
      }
    );
  });

  it("no inventa motivo cuando el registro viene vacio", () => {
    expect(sanitizeKardexReason(null)).toEqual({
      reason: "",
      strippedTechnicalType: null,
    });
    expect(sanitizeKardexReason("   ")).toEqual({
      reason: "",
      strippedTechnicalType: null,
    });
  });
});

describe("getKardexMovementDescription - prefijos tecnicos residuales", () => {
  it("limpia registros historicos que guardaron el slug inventory_add", () => {
    const description = getKardexMovementDescription({
      movement_type: "adjustment",
      reason: "inventory_add: Alta a inventario (manual)",
    });

    expect(description).toBe("AJUSTE — Alta a inventario (manual)");
    expect(description).not.toContain("inventory_add");
  });

  it("mantiene la etiqueta ALTA A INVENTARIO cuando el slug era el unico motivo", () => {
    const description = getKardexMovementDescription({
      movement_type: "adjustment",
      reason: "inventory_add",
    });

    expect(description).toBe("ALTA A INVENTARIO");
  });

  it("limpia el slug cuando el tipo persistido si es inventory_add", () => {
    const description = getKardexMovementDescription({
      movement_type: "inventory_add",
      reason: "inventory_add: Alta a inventario (manual)",
    });

    expect(description).toBe("ALTA A INVENTARIO — Alta a inventario (manual)");
    expect(description).not.toContain("inventory_add");
  });

  it("no toca los ajustes que no son altas de inventario", () => {
    const description = getKardexMovementDescription({
      movement_type: "adjustment",
      reason: "Ajuste por merma",
    });

    expect(description).toBe("AJUSTE — Ajuste por merma");
  });

  it("limpia el prefijo tecnico en los tipos que no son ajuste", () => {
    expect(
      getKardexMovementDescription({
        movement_type: "transfer_out",
        reason: "transfer_out: Salida a sucursal norte",
      })
    ).toBe("TRASPASO SALIDA — Salida a sucursal norte");

    expect(
      getKardexMovementDescription({
        movement_type: "sale",
        sale_id: "0d1c2b3a-4e5f-6789-abcd-ef0123456789",
        reason: "Venta mostrador",
      })
    ).toBe("VENTA 0D1C2B3A — Venta mostrador");
  });

  it("cae a la etiqueta del tipo cuando el motivo era solo el slug tecnico", () => {
    expect(
      getKardexMovementDescription({
        movement_type: "redemption",
        reason: "redemption",
      })
    ).toBe("CANJE");

    expect(
      getKardexMovementDescription({
        movement_type: "adjustment",
        reason: null,
      })
    ).toBe("AJUSTE");
  });
});
