import { describe, it, expect } from "vitest";

import {
  calculateSalesTotals,
  calculateCancellations,
  calculatePartialReturns,
  calculateRewardSummary,
  groupPaymentsByMethod,
  calculateDollarTotals,
  groupSalesByDepartment,
  calculateDepartmentsTotal,
  splitCashMovements,
  buildNetPaymentMethodDetails,
  calculateMethodTotals,
  calculateRefundsByMethod,
  calculateMethodNetTotals,
  calculateDiscountTotal,
  calculateNetSales,
  calculateCashInRegister,
  resolveCutDisplay,
} from "./cashCutCalculationService";

describe("cashCutCalculationService", () => {
  describe("calculateSalesTotals", () => {
    it("devuelve ceros con lista vacia", () => {
      expect(calculateSalesTotals([])).toEqual({
        ventasTotales: 0,
        subtotal: 0,
        tax: 0,
      });
    });

    it("suma total, subtotal e impuestos coercitando strings", () => {
      const sales = [
        { subtotal: "100", tax: "16", total: "116" },
        { subtotal: "50", tax: "8", total: "58" },
      ];

      expect(calculateSalesTotals(sales)).toEqual({
        ventasTotales: 174,
        subtotal: 150,
        tax: 24,
      });
    });

    it("trata campos nulos como cero", () => {
      const sales = [{ subtotal: null, tax: undefined, total: "20" }];

      expect(calculateSalesTotals(sales)).toEqual({
        ventasTotales: 20,
        subtotal: 0,
        tax: 0,
      });
    });
  });

  describe("calculateCancellations", () => {
    it("devuelve ceros y arreglo vacio sin filas", () => {
      expect(calculateCancellations([])).toEqual({
        devolucionesTotales: 0,
        devolucionesAfectanCaja: 0,
        cancelaciones: [],
      });
    });

    it("totaliza y normaliza las cancelaciones respetando affects_cash", () => {
      const rows = [
        {
          id: "c1",
          sale_id: "s1",
          cancel_reason: "Producto dañado",
          refund_amount: "100",
          canceled_at: "2026-09-01T10:00:00.000Z",
          refund_method_id: "pm1",
          payment_methods: { id: "pm1", name: "Efectivo", affects_cash: true },
        },
        {
          id: "c2",
          sale_id: "s2",
          cancel_reason: null,
          refund_amount: "50",
          canceled_at: "2026-09-01T11:00:00.000Z",
          refund_method_id: "pm2",
          payment_methods: { id: "pm2", name: "Tarjeta", affects_cash: false },
        },
        {
          id: "c3",
          sale_id: "s3",
          cancel_reason: "Sin método",
          refund_amount: "25",
          canceled_at: "2026-09-01T12:00:00.000Z",
          refund_method_id: null,
          payment_methods: null,
        },
      ];

      const result = calculateCancellations(rows);

      expect(result.devolucionesTotales).toBe(175);
      expect(result.devolucionesAfectanCaja).toBe(100);
      expect(result.cancelaciones).toEqual([
        {
          id: "c1",
          sale_id: "s1",
          cancel_reason: "Producto dañado",
          refund_amount: 100,
          canceled_at: "2026-09-01T10:00:00.000Z",
          refund_method_id: "pm1",
          refund_method_name: "Efectivo",
          affects_cash: true,
        },
        {
          id: "c2",
          sale_id: "s2",
          cancel_reason: null,
          refund_amount: 50,
          canceled_at: "2026-09-01T11:00:00.000Z",
          refund_method_id: "pm2",
          refund_method_name: "Tarjeta",
          affects_cash: false,
        },
        {
          id: "c3",
          sale_id: "s3",
          cancel_reason: "Sin método",
          refund_amount: 25,
          canceled_at: "2026-09-01T12:00:00.000Z",
          refund_method_id: null,
          refund_method_name: "Sin método",
          affects_cash: false,
        },
      ]);
    });
  });

  describe("calculatePartialReturns", () => {
    it("devuelve ceros y arreglo vacio sin filas", () => {
      expect(calculatePartialReturns([])).toEqual({
        devolucionesParcialesTotales: 0,
        devolucionesParcialesAfectanCaja: 0,
        devolucionesParciales: [],
      });
    });

    it("totaliza y normaliza las devoluciones parciales", () => {
      const rows = [
        {
          id: "r1",
          sale_id: "s1",
          return_reason: "Cambio de talla",
          total_refund: "80",
          created_at: "2026-09-01T10:00:00.000Z",
          refund_method_id: "pm1",
          payment_methods: { id: "pm1", name: "Efectivo", affects_cash: true },
        },
        {
          id: "r2",
          sale_id: "s2",
          return_reason: null,
          total_refund: "20",
          created_at: "2026-09-01T11:00:00.000Z",
          refund_method_id: "pm2",
          payment_methods: { id: "pm2", name: "Transferencia", affects_cash: false },
        },
      ];

      const result = calculatePartialReturns(rows);

      expect(result.devolucionesParcialesTotales).toBe(100);
      expect(result.devolucionesParcialesAfectanCaja).toBe(80);
      expect(result.devolucionesParciales[0]).toEqual({
        id: "r1",
        sale_id: "s1",
        return_reason: "Cambio de talla",
        total_refund: 80,
        created_at: "2026-09-01T10:00:00.000Z",
        refund_method_id: "pm1",
        refund_method_name: "Efectivo",
        affects_cash: true,
      });
      expect(result.devolucionesParciales[1].refund_method_name).toBe(
        "Transferencia"
      );
      expect(result.devolucionesParciales[1].affects_cash).toBe(false);
    });
  });

  describe("calculateRewardSummary", () => {
    it("devuelve ceros sin canjes", () => {
      expect(calculateRewardSummary([])).toEqual({
        canjesAplicados: 0,
        puntosUsados: 0,
        canjesRevertidos: 0,
        puntosDevueltos: 0,
      });
    });

    it("separa canjes aplicados de revertidos", () => {
      const rows = [
        { quantity: 2, total_points: 100, reversed_at: null },
        { quantity: 1, total_points: 50, reversed_at: "2026-09-01T10:00:00.000Z" },
        { total_points: -30, reversed_at: null },
      ];

      expect(calculateRewardSummary(rows)).toEqual({
        canjesAplicados: 3,
        puntosUsados: 130,
        canjesRevertidos: 1,
        puntosDevueltos: 50,
      });
    });

    it("usa cantidad 1 por defecto cuando falta quantity", () => {
      const rows = [{ total_points: 10, reversed_at: null }];

      expect(calculateRewardSummary(rows).canjesAplicados).toBe(1);
    });
  });

  describe("groupPaymentsByMethod", () => {
    it("devuelve arreglo vacio sin pagos", () => {
      expect(groupPaymentsByMethod([])).toEqual([]);
    });

    it("agrupa por nombre de metodo conservando su id y affects_cash", () => {
      const rows = [
        { amount: "100", payment_methods: { id: "pm1", name: "Efectivo", affects_cash: true } },
        { amount: "50", payment_methods: { id: "pm1", name: "Efectivo", affects_cash: true } },
        { amount: "30", payment_methods: { id: "pm2", name: "Tarjeta", affects_cash: false } },
        { amount: "10", payment_methods: null },
      ];

      expect(groupPaymentsByMethod(rows)).toEqual([
        { id: "pm1", name: "Efectivo", total: 150, affects_cash: true },
        { id: "pm2", name: "Tarjeta", total: 30, affects_cash: false },
        { id: null, name: "Otro", total: 10, affects_cash: false },
      ]);
    });
  });

  describe("calculateDollarTotals", () => {
    it("devuelve ceros sin pagos en dolares", () => {
      expect(calculateDollarTotals([])).toEqual({
        ventasDolaresUsd: 0,
        ventasDolaresMxn: 0,
      });
    });

    it("suma USD y su equivalente en MXN con tipo de cambio", () => {
      const rows = [
        { amount: "10", exchange_rate: "17" },
        { amount: 5, exchange_rate: 18 },
      ];

      expect(calculateDollarTotals(rows)).toEqual({
        ventasDolaresUsd: 15,
        ventasDolaresMxn: 260,
      });
    });
  });

  describe("groupSalesByDepartment", () => {
    it("devuelve arreglo vacio sin detalles", () => {
      expect(groupSalesByDepartment([])).toEqual([]);
    });

    it("agrupa por departamento y ordena de mayor a menor", () => {
      const rows = [
        { total_price: "100", products: { departments: { name: "Perros" } } },
        { total_price: "50", products: { departments: { name: "Gatos" } } },
        { total_price: "25", products: { departments: { name: "Perros" } } },
        { total_price: "10", products: null },
      ];

      expect(groupSalesByDepartment(rows)).toEqual([
        { name: "Perros", total: 125 },
        { name: "Gatos", total: 50 },
        { name: "Sin departamento", total: 10 },
      ]);
    });
  });

  describe("calculateDepartmentsTotal", () => {
    it("suma los totales por departamento", () => {
      expect(
        calculateDepartmentsTotal([
          { name: "Perros", total: 125 },
          { name: "Gatos", total: 50 },
        ])
      ).toBe(175);
    });

    it("devuelve cero sin departamentos", () => {
      expect(calculateDepartmentsTotal([])).toBe(0);
    });
  });

  describe("splitCashMovements", () => {
    it("devuelve ceros y arreglos vacios sin movimientos", () => {
      expect(splitCashMovements([])).toEqual({
        entradas: [],
        salidas: [],
        totalEntradas: 0,
        totalSalidas: 0,
      });
    });

    it("separa entradas y salidas y totaliza cada una", () => {
      const rows = [
        { id: "m1", movement_type: "entrada", amount: "100" },
        { id: "m2", movement_type: "salida", amount: "40" },
        { id: "m3", movement_type: "entrada", amount: 60 },
        { id: "m4", movement_type: "otro", amount: 999 },
      ];

      const result = splitCashMovements(rows);

      expect(result.entradas.map((m) => m.id)).toEqual(["m1", "m3"]);
      expect(result.salidas.map((m) => m.id)).toEqual(["m2"]);
      expect(result.totalEntradas).toBe(160);
      expect(result.totalSalidas).toBe(40);
    });
  });

  describe("buildNetPaymentMethodDetails", () => {
    it("ignora metodos sin id", () => {
      const details = buildNetPaymentMethodDetails({
        ventasPorMetodo: [
          { id: null, name: "Otro", total: 20 },
          { id: "pm1", name: "Efectivo", total: 100 },
        ],
        cancelaciones: [],
        devolucionesParciales: [],
      });

      expect(details).toHaveLength(1);
      expect(details[0].payment_method_id).toBe("pm1");
    });

    it("descuenta cancelaciones y devoluciones del esperado por metodo", () => {
      const details = buildNetPaymentMethodDetails({
        ventasPorMetodo: [
          { id: "pm1", name: "Efectivo", total: 100 },
          { id: "pm2", name: "Tarjeta", total: 50 },
        ],
        cancelaciones: [{ refund_method_id: "pm1", refund_amount: 30 }],
        devolucionesParciales: [
          { refund_method_id: "pm1", total_refund: 80 },
          { refund_method_id: "pm2", total_refund: 10 },
        ],
      });

      expect(details).toEqual([
        {
          payment_method_id: "pm1",
          expected_amount: 0,
          counted_amount: 0,
          difference: 0,
        },
        {
          payment_method_id: "pm2",
          expected_amount: 40,
          counted_amount: 40,
          difference: 0,
        },
      ]);
    });
  });

  describe("calculateMethodTotals", () => {
    it("devuelve ceros sin metodos", () => {
      expect(calculateMethodTotals([])).toEqual({
        ventasEfectivo: 0,
        ventasTerminal: 0,
        ventasTransferencia: 0,
      });
    });

    it("clasifica por nombre ignorando mayusculas y acentos de terminal", () => {
      const methods = [
        { name: "Efectivo", total: "100" },
        { name: "EFECTIVO", total: 50 },
        { name: "Terminal BBVA", total: 200 },
        { name: "Tarjeta", total: 20 },
        { name: "Transferencia", total: 80 },
        { name: "SPEI", total: 999 },
      ];

      expect(calculateMethodTotals(methods)).toEqual({
        ventasEfectivo: 150,
        ventasTerminal: 220,
        ventasTransferencia: 80,
      });
    });
  });

  describe("calculateRefundsByMethod", () => {
    it("devuelve ceros sin devoluciones", () => {
      expect(calculateRefundsByMethod([], [])).toEqual({
        devolucionesEfectivoMetodo: 0,
        devolucionesTerminalMetodo: 0,
        devolucionesTransferenciaMetodo: 0,
      });
    });

    it("suma cancelaciones y devoluciones parciales por tipo de metodo", () => {
      const cancelaciones = [
        { refund_method_name: "Efectivo", refund_amount: "100" },
        { refund_method_name: "Tarjeta", refund_amount: 50 },
      ];
      const devolucionesParciales = [
        { refund_method_name: "Transferencia", total_refund: "30" },
        { refund_method_name: "Efectivo", total_refund: 20 },
      ];

      expect(calculateRefundsByMethod(cancelaciones, devolucionesParciales)).toEqual({
        devolucionesEfectivoMetodo: 120,
        devolucionesTerminalMetodo: 50,
        devolucionesTransferenciaMetodo: 30,
      });
    });
  });

  describe("calculateMethodNetTotals", () => {
    it("devuelve ceros sin datos", () => {
      expect(calculateMethodNetTotals()).toEqual({
        ventasEfectivoNeto: 0,
        ventasTerminalNeto: 0,
        ventasTransferenciaNeto: 0,
      });
    });

    it("resta devoluciones y nunca baja de cero", () => {
      expect(
        calculateMethodNetTotals({
          ventasEfectivo: 100,
          ventasTerminal: 50,
          ventasTransferencia: 30,
          devolucionesEfectivoMetodo: 150,
          devolucionesTerminalMetodo: 10,
          devolucionesTransferenciaMetodo: 5,
        })
      ).toEqual({
        ventasEfectivoNeto: 0,
        ventasTerminalNeto: 40,
        ventasTransferenciaNeto: 25,
      });
    });
  });

  describe("calculateDiscountTotal", () => {
    it("calcula subtotal + impuestos - total", () => {
      expect(
        calculateDiscountTotal({ subtotal: 150, tax: 24, ventasTotales: 174 })
      ).toBe(0);

      expect(
        calculateDiscountTotal({ subtotal: 150, tax: 24, ventasTotales: 100 })
      ).toBe(74);
    });
  });

  describe("calculateNetSales", () => {
    it("resta devoluciones totales y parciales", () => {
      expect(
        calculateNetSales({
          ventasTotales: 174,
          devolucionesTotales: 50,
          devolucionesParcialesTotales: 20,
        })
      ).toBe(104);
    });

    it("trata valores nulos como cero", () => {
      expect(
        calculateNetSales({
          ventasTotales: 100,
          devolucionesTotales: null,
          devolucionesParcialesTotales: undefined,
        })
      ).toBe(100);
    });
  });

  describe("calculateCashInRegister", () => {
    it("suma entradas y ventas y resta salidas y devoluciones", () => {
      expect(
        calculateCashInRegister({
          openingAmount: 100,
          totalEntradas: 50,
          ventasEfectivo: 200,
          ventasDolaresMxn: 170,
          totalSalidas: 30,
          devolucionesAfectanCaja: 40,
          devolucionesParcialesAfectanCaja: 10,
        })
      ).toBe(440);
    });
  });

  describe("resolveCutDisplay", () => {
    it("en vista actual sin corte usa el dinero en caja y contado nulo", () => {
      expect(
        resolveCutDisplay({
          isHistoricalView: false,
          historicalCut: null,
          currentShiftCut: null,
          dineroCaja: 440,
        })
      ).toEqual({
        expectedDisplay: 440,
        countedDisplay: null,
        differenceDisplay: null,
      });
    });

    it("en vista actual con corte usa los montos del corte vigente", () => {
      expect(
        resolveCutDisplay({
          isHistoricalView: false,
          historicalCut: null,
          currentShiftCut: { counted_amount: "450", difference: 10 },
          dineroCaja: 440,
        })
      ).toEqual({
        expectedDisplay: 440,
        countedDisplay: 450,
        differenceDisplay: 10,
      });
    });

    it("en vista historica ignora el corte vigente y usa el historico", () => {
      expect(
        resolveCutDisplay({
          isHistoricalView: true,
          historicalCut: { expected_amount: "300", counted_amount: "290", difference: -10 },
          currentShiftCut: { counted_amount: "450", difference: 10 },
          dineroCaja: 440,
        })
      ).toEqual({
        expectedDisplay: 300,
        countedDisplay: 290,
        differenceDisplay: -10,
      });
    });

    it("en vista historica sin corte historico devuelve ceros", () => {
      expect(
        resolveCutDisplay({
          isHistoricalView: true,
          historicalCut: null,
          currentShiftCut: null,
          dineroCaja: 440,
        })
      ).toEqual({
        expectedDisplay: 0,
        countedDisplay: 0,
        differenceDisplay: 0,
      });
    });
  });
});
