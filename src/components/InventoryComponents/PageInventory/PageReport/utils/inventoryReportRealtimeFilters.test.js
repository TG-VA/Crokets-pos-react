import { describe, expect, it } from "vitest";

import {
  isRelevantDepartmentChange,
  isRelevantProductChange,
} from "./inventoryReportRealtimeFilters";

const rows = [
  {
    productId: "p1",
    codigo: "7501",
    nombre: "CROQUETA",
    depto: "ALIMENTO",
    departmentId: "d1",
    tracksInventory: true,
  },
];

const productRecord = (overrides = {}) => ({
  id: "p1",
  barcode: "7501",
  name: "CROQUETA",
  department_id: "d1",
  status: true,
  tracks_inventory: true,
  ...overrides,
});

describe("isRelevantProductChange", () => {
  it("ignora un cambio de precio o costo de un producto mostrado", () => {
    const payload = {
      eventType: "UPDATE",
      new: productRecord({ sale_price: 99, cost_price: 50 }),
      old: { id: "p1" },
    };
    expect(isRelevantProductChange(payload, rows)).toBe(false);
  });

  it.each([
    ["nombre", { name: "CROQUETA 2KG" }],
    ["codigo", { barcode: "7502" }],
    ["departamento", { department_id: "d2" }],
    ["baja", { status: false }],
    ["control de inventario", { tracks_inventory: false }],
  ])("recarga si cambia %s", (_, overrides) => {
    const payload = { eventType: "UPDATE", new: productRecord(overrides) };
    expect(isRelevantProductChange(payload, rows)).toBe(true);
  });

  it("recarga si se activa o crea un producto que no esta en pantalla", () => {
    const record = productRecord({ id: "p9" });
    expect(
      isRelevantProductChange({ eventType: "INSERT", new: record }, rows)
    ).toBe(true);
    expect(
      isRelevantProductChange({ eventType: "UPDATE", new: record }, rows)
    ).toBe(true);
  });

  it("ignora un producto inactivo que no esta en pantalla", () => {
    const record = productRecord({ id: "p9", status: false });
    expect(
      isRelevantProductChange({ eventType: "UPDATE", new: record }, rows)
    ).toBe(false);
  });

  it("recarga solo si se borra un producto mostrado", () => {
    expect(
      isRelevantProductChange({ eventType: "DELETE", old: { id: "p1" } }, rows)
    ).toBe(true);
    expect(
      isRelevantProductChange({ eventType: "DELETE", old: { id: "p9" } }, rows)
    ).toBe(false);
  });
});

describe("isRelevantDepartmentChange", () => {
  it("ignora departamentos nuevos", () => {
    expect(
      isRelevantDepartmentChange(
        { eventType: "INSERT", new: { id: "d9", name: "X" } },
        rows
      )
    ).toBe(false);
  });

  it("recarga si se renombra un departamento mostrado", () => {
    expect(
      isRelevantDepartmentChange(
        { eventType: "UPDATE", new: { id: "d1", name: "ALIMENTOS" } },
        rows
      )
    ).toBe(true);
  });

  it("ignora un cambio sin efecto en el nombre o de otro departamento", () => {
    expect(
      isRelevantDepartmentChange(
        {
          eventType: "UPDATE",
          new: { id: "d1", name: "ALIMENTO", commission_value: 3 },
        },
        rows
      )
    ).toBe(false);
    expect(
      isRelevantDepartmentChange(
        { eventType: "UPDATE", new: { id: "d2", name: "OTRO" } },
        rows
      )
    ).toBe(false);
  });

  it("recarga si se borra un departamento mostrado", () => {
    expect(
      isRelevantDepartmentChange(
        { eventType: "DELETE", old: { id: "d1" } },
        rows
      )
    ).toBe(true);
  });
});
