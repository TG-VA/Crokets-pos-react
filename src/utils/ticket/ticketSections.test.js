import { describe, it, expect } from "vitest";

import { centerText, strongSeparator, separator, formatItemLine, formatTotalLine } from "./ticketLayoutFormatters";
import {
  buildHeaderSection,
  buildSaleInfoSection,
  buildItemsSection,
  buildTotalsSection,
  buildPaymentsSection,
  buildCustomerPointsSection,
  buildRewardsSection,
  buildCancellationSection,
  buildPartialReturnsSection,
  buildReprintSection,
  buildNotesSection,
  buildFooterSection,
} from "./ticketSections";

describe("ticketSections", () => {
  describe("buildHeaderSection", () => {
    it("arma encabezado con nombre, direccion y telefono", () => {
      const lines = buildHeaderSection({
        name: "CROCKETS PLAZA",
        address: "Av. Principal 123",
        city: "Cancún",
        phone: "9981234567",
      });

      expect(lines[0]).toBe(strongSeparator());
      expect(lines[1]).toBe(centerText("CROKETS"));
      expect(lines).toContain(centerText("CROCKETS PLAZA"));
      expect(lines).toContain(centerText("Tel. 9981234567"));
    });

    it("usa SUCURSAL por defecto", () => {
      expect(buildHeaderSection({})).toContain(centerText("SUCURSAL"));
    });
  });

  describe("buildSaleInfoSection", () => {
    it("imprime fecha, hora, cajero, folio y cliente", () => {
      const lines = buildSaleInfoSection({
        sale: { folio: "F-1", cashier_name: "ana" },
        saleDate: "2026-09-16T18:00:00.000Z",
        cashierName: "luis",
        customerName: "LUZ",
        customerPhone: "9981112233",
      });

      expect(lines[0]).toBe(strongSeparator());
      expect(lines).toContain("Fecha: 16/9/2026");
      expect(lines).toContain("Hora : 01:00 p.m.");
      expect(lines).toContain("Cajero: LUIS");
      expect(lines).toContain("Folio : F-1");
      expect(lines).toContain("Cliente: LUZ");
      expect(lines).toContain("Tel. cliente: 9981112233");
    });

    it("usa publico general sin cliente y senala canje de recompensa", () => {
      const lines = buildSaleInfoSection({
        sale: { folio: "F-2" },
        saleDate: "2026-09-16T18:00:00.000Z",
        isRewardOnlySale: true,
      });

      expect(lines).toContain("Cliente: PÚBLICO EN GENERAL");
      expect(lines).toContain("Operación: CANJE DE RECOMPENSA");
    });

    it("senala canje cancelado cuando la venta solo-canje esta cancelada", () => {
      const lines = buildSaleInfoSection({
        sale: { folio: "F-2" },
        saleDate: "2026-09-16T18:00:00.000Z",
        isRewardOnlySale: true,
        isCancelled: true,
      });

      expect(lines).toContain("Operación: CANJE CANCELADO");
    });
  });

  describe("buildItemsSection", () => {
    it("imprime renglones y detalle de descuento recompensa", () => {
      const lines = buildItemsSection(
        [
          {
            description: "A",
            quantity: 2,
            total: 120,
            original_unit_price: 80,
            reward_discount_amount: 20,
            reward_id: "rw-1",
            reward_name: "10% OFF",
          },
        ],
        { rewardRedemptions: [] }
      );

      expect(lines[0]).toBe(formatItemLine("Cant", "Descripción", "Importe"));
      expect(lines.join("\n")).toContain("A (DESC. RECOMP.)");
      expect(lines).toContain("     Descuento recompensa");
      expect(lines).toContain("");
    });
  });

  describe("buildTotalsSection", () => {
    it("suma artículos y totaliza", () => {
      const lines = buildTotalsSection(
        [{ quantity: 2 }, { quantity: 3 }],
        { subtotal: 200, tax: 32, total: 232 }
      );

      expect(lines).toContain("Artículos: 5");
      expect(lines).toContain(formatTotalLine("Subtotal:", "$200.00"));
      expect(lines).toContain(formatTotalLine("IVA 16%:", "$32.00"));
      expect(lines).toContain(formatTotalLine("TOTAL:", "$232.00"));
    });

    it("omite el descuento cuando es cero", () => {
      const lines = buildTotalsSection([], { subtotal: 0, total: 0 });
      expect(lines.some((line) => line.includes("Descuento:"))).toBe(false);
    });
  });

  describe("buildPaymentsSection", () => {
    it("imprime el método y cada pago", () => {
      const lines = buildPaymentsSection(
        [{ payment_method_name: "efectivo", amount: 200 }],
        {
          sale: { change_amount: 12 },
          paymentLabel: "EFECTIVO",
          totalPaidInMxn: 200,
          showReceivedAndChange: true,
        }
      );

      expect(lines).toContain("Método de pago: EFECTIVO");
      expect(lines).toContain(formatTotalLine("EFECTIVO:", "$200.00"));
      expect(lines).toContain(formatTotalLine("Pago con:", "$200.00"));
      expect(lines).toContain(formatTotalLine("Cambio:", "$12.00"));
    });
  });

  describe("buildCustomerPointsSection", () => {
    it("imprime el bloque solo cuando aplica", () => {
      const lines = buildCustomerPointsSection({
        customerName: "LUZ",
        earnedPoints: 120,
        returnedPoints: 0,
        rewardPointsUsed: 0,
        customerPointsBalance: 800,
      });

      expect(lines).toContain(centerText("PUNTOS DEL CLIENTE"));
      expect(lines).toContain(formatTotalLine("Puntos ganados:", "+120"));
      expect(lines).toContain(formatTotalLine("Saldo puntos:", "800 pts"));

      expect(buildCustomerPointsSection({})).toEqual([]);
    });

    it("imprime devolucion, canje y neto en venta activa", () => {
      const lines = buildCustomerPointsSection({
        customerName: "LUZ",
        earnedPoints: 50,
        returnedPoints: 20,
        rewardPointsUsed: 120,
        hasPartialReturns: true,
        netPoints: 30,
        customerPointsBalance: 800,
      });

      expect(lines).toContain(formatTotalLine("Puntos devolución:", "-20"));
      expect(lines).toContain(formatTotalLine("Puntos canjeados:", "-120"));
      expect(lines).toContain(formatTotalLine("Puntos netos:", "+30"));
    });

    it("invierte etiquetas cuando la venta esta cancelada", () => {
      const lines = buildCustomerPointsSection({
        customerName: "LUZ",
        earnedPoints: 50,
        returnedPoints: 20,
        rewardPointsUsed: 120,
        hasPartialReturns: true,
        netPoints: 30,
        customerPointsBalance: 800,
        isCancelled: true,
      });

      expect(lines).toContain(formatTotalLine("Puntos descontados:", "-50"));
      expect(lines).toContain(formatTotalLine("Puntos devueltos:", "+120"));
      expect(lines).toContain(formatTotalLine("Puntos netos:", "+30"));
    });
  });

  describe("buildRewardsSection", () => {
    it("lista los canjes aplicados", () => {
      const lines = buildRewardsSection(
        [
          {
            rewardName: "10% OFF",
            rewardType: "product_discount",
            discountAmount: 20,
            unitPrice: 80,
            productName: "SNACK",
            quantity: 1,
            totalPoints: 50,
          },
        ],
        { rewardCount: 1, rewardPointsUsed: 50 }
      );

      expect(lines).toContain(centerText("RECOMPENSAS CANJEADAS"));
      expect(lines).toContain(formatTotalLine("Canjes aplicados:", 1));
      expect(lines).toContain("Canje #1");
      expect(lines).toContain("Tipo: DESCUENTO EN PRODUCTO");
      expect(lines).toContain(formatTotalLine("Puntos usados:", "-50"));
    });

    it("no imprime nada sin canjes", () => {
      expect(buildRewardsSection([])).toEqual([]);
    });
  });

  describe("buildCancellationSection", () => {
    it("incluye el separador siempre y el bloque solo si es cancelada", () => {
      expect(buildCancellationSection({}, { isCancelled: false })).toEqual([
        separator(),
      ]);

      const lines = buildCancellationSection(
        { cancellation_reason: "CLIENTE NO LO RECOGE" },
        { isCancelled: true, cancelledAt: "2026-09-16T18:00:00.000Z" }
      );

      expect(lines).toContain(centerText("*** VENTA CANCELADA ***"));
      expect(lines).toContain("Fecha cancelación: 16/9/2026");
      expect(lines).toContain("Motivo:");
    });

    it("omite fecha/hora de cancelación cuando falta cancelledAt", () => {
      const lines = buildCancellationSection(
        { cancellation_reason: "ERROR DE CAJA" },
        { isCancelled: true, cancelledAt: null }
      );

      expect(lines).toContain(centerText("*** VENTA CANCELADA ***"));
      expect(lines).toContain("Motivo:");
      expect(lines).toContain("Método reembolso: N/A");
      expect(lines.some((line) => line.includes("Fecha cancelación"))).toBe(
        false
      );
    });
  });

  describe("buildPartialReturnsSection", () => {
    it("imprime devoluciones parciales con su detalle", () => {
      const lines = buildPartialReturnsSection(
        [
          {
            created_at: "2026-09-16T18:00:00.000Z",
            refund_method: "efectivo",
            total_refund: 40,
            points_returned: 10,
            return_reason: "TALLA EQUIVOCADA",
          },
        ],
        { sale: { total: 160 }, returnedPoints: 10 }
      );

      expect(lines).toContain(centerText("*** DEVOLUCIONES PARCIALES ***"));
      expect(lines).toContain("Devolución #1");
      expect(lines).toContain(formatTotalLine("Puntos devolución:", "-10"));
      expect(lines).toContain(formatTotalLine("Puntos desc.:", "-10"));
      expect(lines).toContain(formatTotalLine("Monto devuelto:", "$40.00"));
    });

    it("omite fecha, items y puntos cuando no existen", () => {
      const lines = buildPartialReturnsSection(
        [{ refund_method: "tarjeta", total_refund: 40, return_reason: "DAÑO" }],
        { sale: { total: 160 }, returnedPoints: 0 }
      );

      expect(lines).toContain("Devolución #1");
      expect(lines).toContain("Método: TARJETA");
      expect(lines.some((line) => line.startsWith("Fecha:"))).toBe(false);
      expect(lines.some((line) => line.includes("Puntos"))).toBe(false);
      expect(lines).not.toContain(
        formatItemLine("Cant", "Devuelto", "Importe")
      );
    });
  });

  describe("buildReprintSection", () => {
    it("marca la copia solo con reimpresión", () => {
      expect(buildReprintSection(false)).toEqual([]);
      expect(buildReprintSection(true, "2026-09-16T18:00:00.000Z")).toContain(
        "Reimpreso: 16/9/2026 01:00 p.m."
      );
    });
  });

  describe("buildNotesSection", () => {
    it("imprime notas solo si existen", () => {
      expect(buildNotesSection({})).toEqual([]);
      expect(buildNotesSection({ notes: "ENTREGAR EN MOSTRADOR" })).toContain(
        "ENTREGAR EN MOSTRADOR"
      );
    });
  });

  describe("buildFooterSection", () => {
    it("imprime el pie por defecto y cierra con el separador fuerte", () => {
      const lines = buildFooterSection({});

      expect(lines).toContain("Gracias por su compra");
      expect(lines).toContain("Agenda tu cita de baño");
    });

    it("cierra siempre con strongSeparator", () => {
      const lines = buildFooterSection({ line1: "HOLA" });
      expect(lines[lines.length - 1]).toBe(strongSeparator());
    });
  });
});
