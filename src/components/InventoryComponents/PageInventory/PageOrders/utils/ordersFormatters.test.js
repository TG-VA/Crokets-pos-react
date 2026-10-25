import { describe, it, expect } from "vitest";

import {
  formatOrderDate,
  formatOrderDateTime,
  formatQuantity,
  getOrderDepartments,
  getOrderDifferenceLabel,
  getOrderNumber,
  getOrderStatusMeta,
  normalizeStoreOrder,
  normalizeText,
  toUpperLabel,
  parseOrderDate,
} from "./ordersFormatters";

describe("ordersFormatters", () => {
  it("normaliza texto para busquedas sin acentos", () => {
    expect(normalizeText("  Croqueta NUTRÍCION  ")).toBe("croqueta nutricion");
    expect(normalizeText(null)).toBe("");
  });

  it("parsea fechas validas y descarta invalidas", () => {
    expect(parseOrderDate("2026-10-22T15:00:00.000Z")).toBeInstanceOf(Date);
    expect(parseOrderDate("no-es-fecha")).toBeNull();
    expect(parseOrderDate(null)).toBeNull();
  });

  it("formatea fecha, fecha-hora y cantidades con fallback", () => {
    expect(formatOrderDate("2026-10-22T15:00:00.000Z")).toContain("2026");
    expect(formatOrderDateTime("2026-10-22T15:00:00.000Z")).toContain("2026");
    expect(formatQuantity(12.5)).toBe("12.5");
    expect(formatQuantity(null)).toBe("—");
    expect(formatQuantity("")).toBe("—");
    expect(formatQuantity("abc")).toBe("—");
  });

  it("resuelve metadatos de estado con fallback", () => {
    expect(getOrderStatusMeta("pending").label).toBe("Pendiente");
    expect(getOrderStatusMeta("accepted_with_difference").label).toBe(
      "Aceptado con diferencia"
    );
    expect(getOrderStatusMeta("desconocido").label).toBe("desconocido");
  });

  it("etiqueta la diferencia segun el estado y las notas de recepcion", () => {
    expect(getOrderDifferenceLabel({ status: "pending" })).toBe(
      "Pendiente de recepcion"
    );
    expect(
      getOrderDifferenceLabel({
        status: "accepted",
        discrepancyNotes: "",
      })
    ).toBe("Sin diferencia");
    expect(
      getOrderDifferenceLabel({
        status: "accepted_with_difference",
        discrepancyNotes: "Faltantes: 1x Croqueta (-1)",
      })
    ).toBe("Faltantes: 1x Croqueta (-1)");
    expect(
      getOrderDifferenceLabel({
        status: "accepted_with_difference",
        discrepancy_notes: "Sobrantes: 1x Croqueta (+1)",
      })
    ).toBe("Sobrantes: 1x Croqueta (+1)");
    expect(
      getOrderDifferenceLabel({
        status: "accepted_with_difference",
        discrepancyNotes: "",
      })
    ).toBe("Con diferencia");
    expect(getOrderDifferenceLabel(null)).toBe("");
  });

  it("lee folio y nombre desde formatos camel y snake", () => {
    expect(getOrderNumber({ order_number: "PED-1" })).toBe("PED-1");
    expect(getOrderNumber({ orderNumber: "PED-2" })).toBe("PED-2");
  });

  it("obtiene departamentos desde resumen o partidas", () => {
    expect(
      getOrderDepartments({ departments_summary: ["Alimento", "Higiene"] })
    ).toEqual(["Alimento", "Higiene"]);

    expect(
      getOrderDepartments({
        store_order_items: [
          { department_name: "Alimento" },
          { department_name: "Alimento" },
          { department_name: "Higiene" },
        ],
      })
    ).toEqual(["Alimento", "Higiene"]);
  });

  it("normaliza un pedido con relaciones y partidas", () => {
    const result = normalizeStoreOrder({
      id: "o1",
      order_number: "PED-20261022-0001",
      order_name: "Pedido semanal",
      status: "pending",
      from_branch_id: "b1",
      to_branch_id: "b2",
      from_branch: { name: "Matriz" },
      to_branch: { name: "Sucursal Norte" },
      created_by: { username: "admin" },
      departments_summary: ["Alimento"],
      sent_at: "2026-10-22T15:00:00.000Z",
      store_order_items: [
        {
          id: "i1",
          product_id: "p1",
          product_name: "Croqueta",
          department_name: "Alimento",
          expected_qty: "5.0000",
          received_qty: null,
          cost_price: "100.00",
        },
      ],
    });

    expect(result).toMatchObject({
      orderNumber: "PED-20261022-0001",
      orderName: "PEDIDO SEMANAL",
      fromBranchName: "Matriz",
      toBranchName: "Sucursal Norte",
      createdByLabel: "admin",
      departments: ["Alimento"],
    });
    expect(result.items[0]).toMatchObject({
      productId: "p1",
      expectedQty: 5,
      receivedQty: null,
      costPrice: 100,
    });
  });

  it("regresa null al normalizar un pedido inexistente", () => {
    expect(normalizeStoreOrder(null)).toBeNull();
  });
});

describe("toUpperLabel", () => {
  it("convierte a mayusculas conservando acentos", () => {
    expect(toUpperLabel("  reposición semanal ")).toBe("REPOSICIÓN SEMANAL");
  });

  it("retorna cadena vacia ante nulos", () => {
    expect(toUpperLabel(null)).toBe("");
    expect(toUpperLabel(undefined)).toBe("");
  });

  it("normalizeStoreOrder expone el nombre en mayusculas", () => {
    expect(
      normalizeStoreOrder({ order_name: "pedido norte", items: [] }).orderName
    ).toBe("PEDIDO NORTE");
  });
});
