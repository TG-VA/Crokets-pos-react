import { describe, it, expect } from "vitest";

import {
  parseTransferDate,
  buildTransferNotesPayload,
  createTransferFolio,
  normalizeTransferOrder,
  formatTransferDateTime,
  getTransferStatusMeta,
  getTransferStatusMetaForBranch,
  buildTransferTotals,
  filterTransferProducts,
  getTransferMetaSeparator,
} from "./transfersUtils";

const snapshotFields = [
  "origin_stock_before",
  "origin_stock_after",
  "destination_stock_before",
  "destination_stock_after",
];

const hasAnyStockSnapshot = (item) => {
  return snapshotFields.some(
    (key) => item[key] !== null && item[key] !== undefined
  );
};

describe("transfersUtils", () => {
  describe("getTransferMetaSeparator", () => {
    it("devuelve el separador ##TRANSFER_META## con newlines", () => {
      expect(getTransferMetaSeparator()).toBe("\n\n##TRANSFER_META##");
    });
  });

  describe("parseTransferDate", () => {
    it("devuelve null para inputs nulos", () => {
      expect(parseTransferDate(null)).toBeNull();
      expect(parseTransferDate(undefined)).toBeNull();
      expect(parseTransferDate("")).toBeNull();
      expect(parseTransferDate("   ")).toBeNull();
    });

    it("devuelve la misma instancia Date válida", () => {
      const date = new Date("2026-09-28T12:00:00Z");
      expect(parseTransferDate(date)).toBe(date);
    });

    it("devuelve null si la instancia Date es Invalid Date", () => {
      const invalid = new Date("not a date");
      expect(parseTransferDate(invalid)).toBeNull();
    });

    it("parsea timestamps epoch numéricos", () => {
      const epoch = 1759060800000;
      const parsed = parseTransferDate(String(epoch));
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getTime()).toBe(epoch);
    });

    it("parsea fechas UTC con Z (tz explícita)", () => {
      const parsed = parseTransferDate("2026-09-21T12:30:00Z");
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.toISOString()).toBe("2026-09-21T12:30:00.000Z");
    });

    it("parsea fechas con offset explícito +/-HH:MM", () => {
      const parsed = parseTransferDate("2026-09-21T12:30:00-05:00");
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.toISOString()).toBe("2026-09-21T17:30:00.000Z");
    });

    it("parsea fechas con offset compacto +/-HHMM", () => {
      const parsed = parseTransferDate("2026-09-21T12:30:00+0200");
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.toISOString()).toBe("2026-09-21T10:30:00.000Z");
    });

    it("MINOR FIX: no confunde YYYY-MM-DD date-only con offset tz", () => {
      // Antes del fix: la regex /[+\-]\d{2}:?\d{2}$/ daba match
      // con el -21 final y parseaba como UTC midnight → dia anterior en MX.
      const parsed = parseTransferDate("2026-09-21");
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.toISOString()).toBe("2026-09-21T00:00:00.000Z");
    });

    it("fecha naive con hora YYYY-MM-DD HH:MM:SS se trata como UTC", () => {
      const parsed = parseTransferDate("2026-09-21 12:30:00");
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.toISOString()).toBe("2026-09-21T12:30:00.000Z");
    });

    it("devuelve null para strings inválidos", () => {
      expect(parseTransferDate("esto-no-es-fecha")).toBeNull();
    });
  });

  describe("createTransferFolio", () => {
    it("produce el formato TR-DDMMYY-hhmmss (3 partes con guion)", () => {
      const date = new Date("2026-09-21T12:30:45.123Z");
      const folio = createTransferFolio(date);
      expect(folio).toMatch(/^TR-\d{6}-\d{6}$/);
      const [, datePart, timePart] = folio.split("-");
      expect(datePart).toBe("210926");
      expect(timePart).toBe("073045");
    });

    it("folio en el mismo segundo debería ser estable (no random)", () => {
      const date = new Date("2026-09-21T12:30:45.123Z");
      expect(createTransferFolio(date)).toBe(createTransferFolio(date));
    });
  });

  describe("buildTransferTotals", () => {
    it("acumula requested / received / returned y cuenta líneas (lineCount)", () => {
      const items = [
        {
          requestedQty: 3,
          receivedQty: 2,
          returnedQty: 1,
        },
        {
          requestedQty: 5,
          receivedQty: 5,
          returnedQty: 0,
        },
      ];
      const totals = buildTransferTotals(items);
      expect(totals.requestedUnits).toBe(8);
      expect(totals.receivedUnits).toBe(7);
      expect(totals.returnedUnits).toBe(1);
      expect(totals.lineCount).toBe(2);
    });

    it("items vacíos devuelve ceros y 0 lineCount", () => {
      const totals = buildTransferTotals([]);
      expect(totals.requestedUnits).toBe(0);
      expect(totals.receivedUnits).toBe(0);
      expect(totals.returnedUnits).toBe(0);
      expect(totals.lineCount).toBe(0);
    });
  });

  describe("buildTransferNotesPayload", () => {
    it("concatena nota libre + separador + JSON de metadatos cuando metadata tiene keys", () => {
      const result = buildTransferNotesPayload({
        noteText: "Pedido urgente para fin de semana",
        metadata: { folio: "TR2609211234ABCD" },
      });

      expect(result.startsWith("Pedido urgente para fin de semana")).toBe(true);
      expect(result.includes("##TRANSFER_META##")).toBe(true);
      const metaPart = result.split("##TRANSFER_META##")[1];
      const parsed = JSON.parse(metaPart);
      expect(parsed.folio).toBe("TR2609211234ABCD");
    });

    it("metadata vacío NO agrega separador (menos ruido en storage)", () => {
      const result = buildTransferNotesPayload({
        noteText: "solo nota",
        metadata: {},
      });
      expect(result.includes("##TRANSFER_META##")).toBe(false);
      expect(result).toBe("solo nota");
    });
  });

  describe("normalizeTransferOrder", () => {
    it("preserva los 8 keys originales (backwards compat)", () => {
      const order = {
        id: "ord-1",
        folio: "TR2609211234ABCD",
        status: "pending_receipt",
        items: [
          {
            productId: "p1",
            barcode: "bar",
            name: "Producto Uno",
            requestedQty: 3,
            receivedQty: 2,
            returnedQty: 1,
            costPrice: "10.0000",
            salePrice: "20.0000",
          },
        ],
      };

      const normalized = normalizeTransferOrder(order);
      expect(normalized.id).toBe(order.id);
      expect(normalized.folio).toBe(order.folio);
      expect(Array.isArray(normalized.items)).toBe(true);
      expect(normalized.items).toHaveLength(1);

      const item = normalized.items[0];
      expect(item.productId).toBe("p1");
      expect(item.barcode).toBe("bar");
      expect(item.name).toBe("Producto Uno");
      expect(item.requestedQty).toBe(3);
      expect(item.receivedQty).toBe(2);
      expect(item.returnedQty).toBe(1);
      expect(item.costPrice).toBe(10);
      expect(item.salePrice).toBe(20);
    });

    it("F3 MAJOR: mapea los 4 campos de snapshots (antes no existían)", () => {
      const order = {
        id: "ord-1",
        folio: "TR2609211234ABCD",
        status: "received_complete",
        items: [
          {
            productId: "p1",
            name: "Producto Uno",
            requestedQty: 3,
            receivedQty: 3,
            returnedQty: 0,
            costPrice: 10,
            salePrice: 20,
            origin_stock_before: 10,
            origin_stock_after: 7,
            destination_stock_before: 20,
            destination_stock_after: 23,
          },
        ],
      };

      const { items } = normalizeTransferOrder(order);
      const item = items[0];

      snapshotFields.forEach((key) => {
        expect(Object.prototype.hasOwnProperty.call(item, key)).toBe(
          true,
          `Falta la key ${key} en el item normalizado (feature snapshots muerta)`
        );
      });

      expect(item.origin_stock_before).toBe(10);
      expect(item.origin_stock_after).toBe(7);
      expect(item.destination_stock_before).toBe(20);
      expect(item.destination_stock_after).toBe(23);
    });

    it("distingue NULL (traspaso pre-migración) de 0 (stock real cero)", () => {
      const order = {
        id: "ord-old",
        items: [
          {
            productId: "p-old",
            name: "Old",
            requestedQty: 1,
            receivedQty: 0,
            returnedQty: 0,
            costPrice: 1,
            salePrice: 2,
          },
          {
            productId: "p-zero",
            name: "Zero Stock",
            requestedQty: 1,
            receivedQty: 0,
            returnedQty: 0,
            costPrice: 1,
            salePrice: 2,
            origin_stock_before: 0,
            origin_stock_after: 0,
            destination_stock_before: 0,
            destination_stock_after: 0,
          },
        ],
      };

      const { items } = normalizeTransferOrder(order);
      const oldItem = items[0];
      const zeroItem = items[1];

      expect(hasAnyStockSnapshot(oldItem)).toBe(
        false,
        "Traspaso pre-migracion: las 4 keys deben ser NULL, hasAny false"
      );
      expect(hasAnyStockSnapshot(zeroItem)).toBe(
        true,
        "Stock 0 real: hasAnySnapshot debe ser TRUE, no tratar 0 como null"
      );
    });

    it("acepta nombres camelCase (fallback robustez)", () => {
      const order = {
        id: "ord-camel",
        items: [
          {
            productId: "p-camel",
            name: "Camel",
            requestedQty: 1,
            receivedQty: 0,
            returnedQty: 0,
            costPrice: 1,
            salePrice: 2,
            originStockBefore: 5,
            originStockAfter: 4,
            destinationStockBefore: 3,
            destinationStockAfter: 4,
          },
        ],
      };
      const { items } = normalizeTransferOrder(order);
      expect(items[0].origin_stock_before).toBe(5);
      expect(items[0].origin_stock_after).toBe(4);
      expect(items[0].destination_stock_before).toBe(3);
      expect(items[0].destination_stock_after).toBe(4);
    });

    it("NUMERIC string de Postgres se convierte a Number", () => {
      const order = {
        id: "ord-num",
        items: [
          {
            productId: "p-n",
            name: "Numeric",
            requestedQty: 1,
            receivedQty: 0,
            returnedQty: 0,
            costPrice: 0,
            salePrice: 0,
            origin_stock_before: "123.0000",
            origin_stock_after: "122.0000",
            destination_stock_before: "0.0000",
            destination_stock_after: "1.0000",
          },
        ],
      };
      const { items } = normalizeTransferOrder(order);
      const item = items[0];
      expect(typeof item.origin_stock_before).toBe("number");
      expect(item.origin_stock_before).toBe(123);
      expect(item.destination_stock_after).toBe(1);
    });
  });

  describe("getTransferStatusMeta", () => {
    it("devuelve label + tone para los 4 status conocidos", () => {
      const pending = getTransferStatusMeta("pending_receipt");
      expect(pending.tone).toBe("pending");
      expect(typeof pending.label).toBe("string");
      expect(pending.label.length).toBeGreaterThan(0);

      expect(getTransferStatusMeta("received_complete").tone).toBe("success");
      expect(getTransferStatusMeta("received_with_difference").tone).toBe(
        "warning"
      );
      expect(getTransferStatusMeta("cancelled").tone).toBe("cancelled");
    });

    it("status desconocido devuelve el fallback Pendiente de recepción", () => {
      const meta = getTransferStatusMeta("algo-raro");
      expect(meta.tone).toBe("pending");
      expect(typeof meta.label).toBe("string");
      expect(meta.label.length).toBeGreaterThan(0);
    });
  });

  describe("getTransferStatusMetaForBranch", () => {
    it("received_complete: label distinto para origen vs destino", () => {
      const order = {
        status: "received_complete",
        originBranchId: "brA",
        destinationBranchId: "brB",
      };
      const asOrigin = getTransferStatusMetaForBranch(order, "brA");
      const asDestination = getTransferStatusMetaForBranch(order, "brB");
      expect(asOrigin.label).toBe("Enviado completo");
      expect(asDestination.label).toBe("Recibido completo");
    });

    it("currentBranchId vacío devuelve el baseMeta sin branch-contextual", () => {
      const order = {
        status: "received_complete",
        originBranchId: "brA",
        destinationBranchId: "brB",
      };
      const meta = getTransferStatusMetaForBranch(order, "");
      expect(meta.label).toBe("Recibido completo");
    });
  });

  describe("formatTransferDateTime", () => {
    it("devuelve guion para nulos", () => {
      expect(formatTransferDateTime(null)).toBe("—");
      expect(formatTransferDateTime(undefined)).toBe("—");
    });

    it("formatea fecha válida a string localizado", () => {
      const d = new Date("2026-09-21T12:30:00Z");
      const formatted = formatTransferDateTime(d);
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(5);
    });
  });

  describe("filterTransferProducts", () => {
    it("solo considera productos tracks_inventory=true Y existencia>0 (filtros por defecto)", () => {
      const products = [
        {
          id: "1",
          descripcion: "Croquetas",
          codigo: "CROC-01",
          tracks_inventory: true,
          existencia: 10,
        },
        {
          id: "2",
          descripcion: "Shampoo",
          codigo: "SHA-10",
          tracks_inventory: true,
          existencia: 0,
        },
        {
          id: "3",
          descripcion: "Giftcard",
          codigo: "GIFT-1",
          tracks_inventory: false,
          existencia: 5,
        },
      ];
      const matches = filterTransferProducts({ products, searchTerm: "" });
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe("1");
    });

    it("filtra por código/descripcion (case-insensitive)", () => {
      const products = [
        {
          id: "1",
          descripcion: "Croquetas Cachorro",
          codigo: "CROC-01",
          tracks_inventory: true,
          existencia: 10,
        },
        {
          id: "2",
          descripcion: "Shampoo Canino",
          codigo: "SHA-10",
          tracks_inventory: true,
          existencia: 5,
        },
      ];
      const byCode = filterTransferProducts({
        products,
        searchTerm: "croc-01",
      });
      expect(byCode).toHaveLength(1);
      expect(byCode[0].id).toBe("1");

      const byDesc = filterTransferProducts({
        products,
        searchTerm: "cachorro",
      });
      expect(byDesc).toHaveLength(1);
      expect(byDesc[0].id).toBe("1");
    });
  });
});
