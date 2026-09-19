import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { buildCashCutText } from "./cashCutBuilder";

const WIDTH = 32;
const FIXED_NOW = new Date("2026-09-17T18:30:00.000Z");

const baseData = () => ({
  branchName: "sucursal centro",
  username: "juan perez",
  sessionId: "S-123",
  openedAt: "2026-09-17T14:00:00.000Z",
  closedAt: "2026-09-17T18:00:00.000Z",
  cutCreatedAt: "2026-09-17T18:05:00.000Z",
  expectedAmount: 1500,
  countedAmount: 1480,
  difference: -20,
  notes: "Sin novedades en el turno de la manana",
  isHistorical: false,
  ventasTotales: 1000,
  dineroCaja: 900,
  ventasTerminal: 300,
  ventasTransferencia: 200,
  openingAmount: 500,
  totalEntradas: 100,
  ventasEfectivo: 800,
  ventasDolaresUsd: 20,
  ventasDolaresMxn: 340,
  totalSalidas: 50,
  devolucionesCaja: 10,
  devolucionesParcialesCaja: 5,
  ventasPorMetodo: [
    { name: "EFECTIVO", total: 800 },
    { name: "TERMINAL", total: 300 },
    { name: "TRANSFERENCIA", total: 200 },
    { name: "DOLARES USD", total: 20 },
  ],
  entradas: [
    { description: "Fondo adicional", amount: 100 },
    { created_at: "2026-09-17T15:00:00.000Z", amount: 50 },
  ],
  salidas: [{ description: "Compra insumos", amount: 50 }],
  subtotal: 900,
  discount: 30,
  tax: 100,
  cancelaciones: [
    {
      sale_id: "abcdef1234567890",
      refund_method_name: "EFECTIVO",
      refund_amount: 40,
      canceled_at: "2026-09-17T16:00:00.000Z",
      cancel_reason: "Error de captura",
    },
  ],
  devolucionesParciales: [
    {
      sale_id: "zzzzzzzz9999",
      refund_method_name: "TERMINAL",
      total_refund: 15,
      created_at: "2026-09-17T17:00:00.000Z",
      return_reason: "",
    },
  ],
  rewardCanjesAplicados: 2,
  rewardPuntosUsados: 120,
  rewardCanjesRevertidos: 1,
  rewardPuntosDevueltos: 50,
});

const render = (overrides = {}) =>
  buildCashCutText({ ...baseData(), ...overrides });

const linesOf = (text) => text.split("\n");
const trimmedLines = (text) => linesOf(text).map((row) => row.trimEnd());
const contentLines = (text) => linesOf(text).map((row) => row.trim());
const linesStartingWith = (text, label) =>
  trimmedLines(text).filter((row) => row.startsWith(label));
const valueFor = (text, label) => {
  const row = linesStartingWith(text, label)[0];
  return row === undefined ? undefined : row.slice(label.length).trim();
};

describe("buildCashCutText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("encabezado", () => {
    it("abre con una linea de ancho fijo y el nombre del negocio centrado", () => {
      const text = render();
      const rows = trimmedLines(text);

      expect(rows[0]).toBe("=".repeat(WIDTH));
      expect(rows[1].trim()).toBe("CROKETS");
      expect(rows[2].trim()).toBe("CORTE DE CAJA");
      expect(rows[3].trim()).toBe("CORTE REALIZADO");
      expect(rows[4]).toBe("=".repeat(WIDTH));
    });

    it("marca reimpresion cuando el corte es historico", () => {
      expect(trimmedLines(render({ isHistorical: true }))[3].trim()).toBe(
        "REIMPRESION"
      );
    });

    it("mayusculiza sucursal y cajero y usa valores por defecto", () => {
      expect(valueFor(render(), "Sucursal:")).toBe("SUCURSAL CENTRO");
      expect(valueFor(render(), "Cajero:")).toBe("JUAN PEREZ");

      const empty = render({ branchName: "", username: null });
      expect(valueFor(empty, "Sucursal:")).toBe("SUCURSAL");
      expect(valueFor(empty, "Cajero:")).toBe("USUARIO");
    });

    it("usa guion largo cuando no hay sesion", () => {
      expect(valueFor(render({ sessionId: null }), "Turno:")).toBe("—");
    });

    it("formatea fechas en la zona America/Cancun", () => {
      const text = render();

      expect(valueFor(text, "Apertura:")).toBe("17/9/2026 09:00 a.m.");
      expect(valueFor(text, "Corte:")).toBe("17/9/2026 01:05 p.m.");
      expect(valueFor(text, "Cierre:")).toBe("17/9/2026 01:00 p.m.");
      expect(valueFor(text, "Generado:")).toBe("17/9/2026 01:30 p.m.");
    });

    it("omite la linea de cierre cuando no hay closedAt", () => {
      expect(
        linesStartingWith(render({ closedAt: null }), "Cierre:")
      ).toHaveLength(0);
    });

    it("representa fechas invalidas con guiones", () => {
      expect(valueFor(render({ openedAt: "no-es-fecha" }), "Apertura:")).toBe(
        "--/--/---- --:--"
      );
    });
  });

  describe("resultado del corte", () => {
    it("usa expectedAmount y countedAmount cuando se proveen", () => {
      const text = render({ expectedAmount: 1500, countedAmount: 1480 });

      expect(valueFor(text, "Esperado:")).toBe("$1500.00");
      expect(valueFor(text, "Contado:")).toBe("$1480.00");
    });

    it("cae a dineroCaja como esperado cuando expectedAmount es null", () => {
      expect(
        valueFor(render({ expectedAmount: null, dineroCaja: 900 }), "Esperado:")
      ).toBe("$900.00");
    });

    it("etiqueta la diferencia segun el signo", () => {
      expect(valueFor(render({ difference: 20 }), "Sobrante:")).toBe("$20.00");
      expect(valueFor(render({ difference: -20 }), "Faltante:")).toBe(
        "-$20.00"
      );
      expect(valueFor(render({ difference: 0 }), "Diferencia:")).toBe("$0.00");
    });

    it("calcula la diferencia contado menos esperado si no se pasa", () => {
      const text = render({
        difference: undefined,
        expectedAmount: 100,
        countedAmount: 130,
      });

      expect(valueFor(text, "Sobrante:")).toBe("$30.00");
    });

    it("omite contado y diferencia cuando no hay conteo", () => {
      const text = render({ countedAmount: null, difference: undefined });

      expect(linesStartingWith(text, "Contado:")).toHaveLength(0);
      expect(linesStartingWith(text, "Diferencia:")).toHaveLength(0);
      expect(linesStartingWith(text, "Sobrante:")).toHaveLength(0);
      expect(linesStartingWith(text, "Faltante:")).toHaveLength(0);
    });

    it("envuelve las notas y las coloca bajo el titulo Notas", () => {
      const text = render({ notes: "Sin novedades en el turno de la manana" });
      const rows = trimmedLines(text);

      expect(rows).toContain("Notas:");
      expect(rows).toContain("Sin novedades en el turno de la");
      expect(rows).toContain("manana");
    });
  });

  describe("resumen neto", () => {
    it("descuenta cancelaciones y devoluciones parciales de las ventas brutas", () => {
      const text = render({
        ventasTotales: 1000,
        cancelaciones: [{ refund_amount: 40 }],
        devolucionesParciales: [{ total_refund: 15 }],
      });

      expect(valueFor(text, "Ventas brutas:")).toBe("$1000.00");
      expect(valueFor(text, "Cancelaciones:")).toBe("-$40.00");
      expect(valueFor(text, "Dev. parciales:")).toBe("-$15.00");
      expect(valueFor(text, "Ventas netas:")).toBe("$945.00");
    });

    it("usa cero cuando no hay cancelaciones ni devoluciones", () => {
      const text = render({ cancelaciones: [], devolucionesParciales: [] });

      expect(valueFor(text, "Ventas netas:")).toBe("$1000.00");
    });
  });

  describe("dinero en caja", () => {
    it("incluye las lineas de dolares solo cuando hay monto", () => {
      const withUsd = render();
      expect(valueFor(withUsd, "Vtas USD:")).toBe("+USD 20.00");
      expect(valueFor(withUsd, "USD a MXN:")).toBe("+$340.00");

      const withoutUsd = render({ ventasDolaresUsd: 0, ventasDolaresMxn: 0 });
      expect(linesStartingWith(withoutUsd, "Vtas USD:")).toHaveLength(0);
      expect(linesStartingWith(withoutUsd, "USD a MXN:")).toHaveLength(0);
    });

    it("cierra el bloque con la caja esperada", () => {
      expect(valueFor(render({ expectedAmount: 1234 }), "TOTAL CAJA:")).toBe(
        "$1234.00"
      );
    });
  });

  describe("metodos de pago", () => {
    it("muestra Sin registros cuando no hay metodos", () => {
      const text = render({ ventasPorMetodo: [] });

      expect(contentLines(text)).toContain("Sin registros");
      expect(linesStartingWith(text, "TOTAL REEMB:")).toHaveLength(0);
      expect(linesStartingWith(text, "TOTAL BRUTO:")).toHaveLength(1);
    });

    it("agrupa por nombre de metodo y suma el total bruto", () => {
      const text = render();

      expect(valueFor(text, "Efectivo bruto:")).toBe("$800.00");
      expect(valueFor(text, "Terminal bruto:")).toBe("$300.00");
      expect(valueFor(text, "Transfer. bruto:")).toBe("$200.00");
      expect(valueFor(text, "Dolares bruto:")).toBe("USD 20.00");
      expect(valueFor(text, "Eq. MXN:")).toBe("$340.00");
      expect(valueFor(text, "TOTAL BRUTO:")).toBe("$1320.00");
    });

    it("lista reembolsos agrupados solo cuando existen montos", () => {
      const text = render();
      const rows = trimmedLines(text);

      expect(rows).toContain("Reembolsos:");
      expect(valueFor(text, "Efectivo:")).toBe("-$40.00");
      expect(valueFor(text, "Terminal:")).toBe("-$15.00");
      expect(valueFor(text, "TOTAL REEMB:")).toBe("-$55.00");

      const noRefunds = render({
        cancelaciones: [],
        devolucionesParciales: [],
      });
      expect(trimmedLines(noRefunds)).not.toContain("Reembolsos:");
    });
  });

  describe("entradas y salidas", () => {
    it("muestra Sin registros cuando los arreglos estan vacios", () => {
      const text = render({ entradas: [], salidas: [] });
      const rows = trimmedLines(text);

      expect(rows).toContain("Sin registros");
      expect(linesStartingWith(text, "TOTAL ENTR:")).toHaveLength(0);
      expect(linesStartingWith(text, "TOTAL SAL:")).toHaveLength(0);
    });

    it("recorta la descripcion a 17 caracteres y usa la hora si falta", () => {
      const text = render({
        entradas: [
          { description: "Descripcion demasiado larga", amount: 10 },
          { created_at: "2026-09-17T15:00:00.000Z", amount: 5 },
        ],
      });

      expect(valueFor(text, "Descripcion demas")).toBe("+$10.00");
      expect(valueFor(text, "10:00 a.m.")).toBe("+$5.00");
    });

    it("usa los totales provistos para entradas y salidas", () => {
      const text = render({ totalEntradas: 150, totalSalidas: 75 });

      expect(valueFor(text, "TOTAL ENTR:")).toBe("+$150.00");
      expect(valueFor(text, "TOTAL SAL:")).toBe("-$75.00");
    });
  });

  describe("ventas", () => {
    it("resta el descuento cuando es mayor a cero", () => {
      expect(valueFor(render({ discount: 30 }), "Descuento:")).toBe("-$30.00");
    });

    it("muestra descuento en cero sin signo", () => {
      expect(valueFor(render({ discount: 0 }), "Descuento:")).toBe("$0.00");
    });

    it("reporta subtotal, IVA y totales", () => {
      const text = render({ subtotal: 900, tax: 100, ventasTotales: 1000 });

      expect(valueFor(text, "Subtotal:")).toBe("$900.00");
      expect(valueFor(text, "IVA:")).toBe("$100.00");
      expect(linesStartingWith(text, "TOTAL BRUTO:")).toHaveLength(2);
      expect(linesStartingWith(text, "TOTAL NETO:")).toHaveLength(2);
    });
  });

  describe("recompensas", () => {
    it("muestra Sin registros sin actividad", () => {
      const text = render({
        rewardCanjesAplicados: 0,
        rewardPuntosUsados: 0,
        rewardCanjesRevertidos: 0,
        rewardPuntosDevueltos: 0,
      });

      expect(trimmedLines(text)).toContain("Sin registros");
    });

    it("reporta canjes y puntos aplicados", () => {
      const text = render({ rewardCanjesAplicados: 3, rewardPuntosUsados: 90 });

      expect(valueFor(text, "Canjes aplic:")).toBe("3");
      expect(valueFor(text, "Pts usados:")).toBe("-90 pts");
    });

    it("reporta canjes revertidos y puntos devueltos", () => {
      const text = render({
        rewardCanjesRevertidos: 2,
        rewardPuntosDevueltos: 40,
      });

      expect(valueFor(text, "Canjes rev:")).toBe("2");
      expect(valueFor(text, "Pts devueltos:")).toBe("+40 pts");
    });
  });

  describe("cancelaciones", () => {
    it("muestra Sin registros cuando no hay cancelaciones", () => {
      const text = render({ cancelaciones: [] });

      expect(linesStartingWith(text, "TOTAL CANC:")).toHaveLength(0);
      expect(linesStartingWith(text, "Sin registros").length).toBeGreaterThan(
        0
      );
    });

    it("usa folio corto, metodo abreviado, hora y motivo", () => {
      const text = render({
        cancelaciones: [
          {
            sale_id: "abcdef1234567890",
            refund_method_name: "EFECTIVO",
            refund_amount: 40,
            canceled_at: "2026-09-17T16:00:00.000Z",
            cancel_reason: "Error de captura",
          },
        ],
      });

      expect(valueFor(text, "ABCDEF12 EFE")).toBe("-$40.00");
      expect(valueFor(text, "Hora:")).toBe("11:00 a.m.");
      expect(trimmedLines(text)).toContain("Motivo: Error de captura");
      expect(valueFor(text, "TOTAL CANC:")).toBe("-$40.00");
    });

    it("abrevia los metodos de reembolso", () => {
      const methodCases = [
        ["EFECTIVO", "EFE"],
        ["PAGO CON TARJETA", "TER"],
        ["TRANSFERENCIA", "TRA"],
        ["DOLARES USD", "USD"],
        ["PAGO MIXTO", "MIX"],
        ["OTRO METODO", "OTR"],
        ["", "N/A"],
      ];

      methodCases.forEach(([methodName, expected]) => {
        const text = render({
          cancelaciones: [
            {
              sale_id: "11112222",
              refund_method_name: methodName,
              refund_amount: 1,
            },
          ],
        });

        expect(valueFor(text, "11112222 " + expected)).toBe("-$1.00");
      });
    });

    it("usa Sin motivo registrado cuando el motivo esta vacio", () => {
      const text = render({
        cancelaciones: [
          {
            sale_id: "11112222",
            refund_method_name: "EFECTIVO",
            refund_amount: 1,
          },
        ],
      });

      expect(trimmedLines(text)).toContain("Motivo: Sin motivo registrado");
    });
  });

  describe("devoluciones parciales", () => {
    it("muestra Sin registros cuando no hay devoluciones", () => {
      const text = render({ devolucionesParciales: [] });

      expect(linesStartingWith(text, "TOTAL DEV:")).toHaveLength(0);
    });

    it("usa folio corto, metodo abreviado y total", () => {
      const text = render({
        cancelaciones: [],
        devolucionesParciales: [
          {
            sale_id: "zzzzzzzz9999",
            refund_method_name: "TERMINAL",
            total_refund: 15,
            created_at: "2026-09-17T17:00:00.000Z",
            return_reason: "",
          },
        ],
      });

      expect(valueFor(text, "ZZZZZZZZ TER")).toBe("-$15.00");
      expect(valueFor(text, "Hora:")).toBe("12:00 p.m.");
      expect(trimmedLines(text)).toContain("Motivo: Sin motivo registrado");
      expect(valueFor(text, "TOTAL DEV:")).toBe("-$15.00");
    });
  });

  describe("pie de firmas", () => {
    it("cierra con las firmas y la linea final", () => {
      const text = render();
      const rows = trimmedLines(text);

      expect(contentLines(text)).toContain("Firma cajero");
      expect(contentLines(text)).toContain("Firma supervisor");
      expect(rows[rows.length - 1]).toBe("=".repeat(WIDTH));
    });
  });

  describe("invariante de ancho", () => {
    it("ninguna linea excede el ancho de la impresora", () => {
      const text = render();

      linesOf(text).forEach((row) => {
        expect(row.length).toBeLessThanOrEqual(WIDTH);
      });
    });

    it("soporta data vacia sin romper el ancho", () => {
      const text = buildCashCutText();

      linesOf(text).forEach((row) => {
        expect(row.length).toBeLessThanOrEqual(WIDTH);
      });
      expect(contentLines(text)).toContain("CROKETS");
    });
  });
});
