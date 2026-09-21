import { describe, it, expect } from "vitest";

import {
  aggregateCashierCommissions,
  aggregateProductCommissions,
  calculateGlobalKpis,
  calculateItemCommission,
} from "./commissionsCalculationService";

const buildItem = ({
  product = {},
  department = {},
  quantity = 2,
  totalPrice = 100,
} = {}) => ({
  quantity,
  total_price: totalPrice,
  products: {
    departments: department,
    ...product,
  },
});

describe("commissionsCalculationService", () => {
  describe("calculateItemCommission", () => {
    it("exime al producto con commission_enabled=false aunque el departamento comisione", () => {
      const result = calculateItemCommission(
        buildItem({
          product: { commission_enabled: false, commission_value: 5 },
          department: {
            commission_enabled: true,
            commission_type: "percent",
            commission_value: 5,
          },
        })
      );

      expect(result).toEqual({
        hasCommission: false,
        commissionAmount: 0,
        commissionType: null,
        commissionValue: 0,
        ruleLabel: "Sin comisión",
      });
    });

    it("usa la comision propia del producto si commission_enabled=true", () => {
      const result = calculateItemCommission(
        buildItem({
          product: {
            commission_enabled: true,
            commission_type: "percent",
            commission_value: 10,
          },
          department: {
            commission_enabled: true,
            commission_type: "percent",
            commission_value: 2,
          },
        })
      );

      expect(result).toEqual({
        hasCommission: true,
        commissionAmount: 10,
        commissionType: "percent",
        commissionValue: 10,
        ruleLabel: "10.00%",
      });
    });

    it("hereda la comision del departamento si commission_enabled es null", () => {
      const result = calculateItemCommission(
        buildItem({
          product: {
            commission_enabled: null,
            commission_type: "percent",
            commission_value: 9,
          },
          department: {
            commission_enabled: true,
            commission_type: "percent",
            commission_value: 5,
          },
        })
      );

      expect(result).toEqual({
        hasCommission: true,
        commissionAmount: 5,
        commissionType: "percent",
        commissionValue: 5,
        ruleLabel: "5.00%",
      });
    });

    it("hereda la comision del departamento si commission_enabled esta ausente", () => {
      const result = calculateItemCommission(
        buildItem({
          product: { commission_value: 9 },
          department: {
            commission_enabled: true,
            commission_type: "flat",
            commission_value: 3,
          },
        })
      );

      expect(result).toEqual({
        hasCommission: true,
        commissionAmount: 6,
        commissionType: "flat",
        commissionValue: 3,
        ruleLabel: "$3.00 / pz",
      });
    });

    it("no hereda del departamento si el producto esta exento y el depto sin configurar", () => {
      const result = calculateItemCommission(
        buildItem({
          product: { commission_enabled: false },
          department: { commission_enabled: false },
        })
      );

      expect(result.hasCommission).toBe(false);
      expect(result.commissionAmount).toBe(0);
      expect(result.ruleLabel).toBe("Sin comisión");
    });

    it("no comisiona producto sin departamento y sin comision", () => {
      const result = calculateItemCommission(
        buildItem({ product: { commission_enabled: null } })
      );

      expect(result).toEqual({
        hasCommission: false,
        commissionAmount: 0,
        commissionType: null,
        commissionValue: 0,
        ruleLabel: "Sin comisión",
      });
    });

    it("soporta el sinonimo 'percentage' como porcentaje", () => {
      const result = calculateItemCommission(
        buildItem({
          product: {
            commission_enabled: true,
            commission_type: "percentage",
            commission_value: 20,
          },
          quantity: 1,
          totalPrice: 50,
        })
      );

      expect(result.hasCommission).toBe(true);
      expect(result.commissionAmount).toBe(10);
      expect(result.ruleLabel).toBe("20.00%");
    });

    it("calcula monto fijo por pieza usando la cantidad", () => {
      const result = calculateItemCommission(
        buildItem({
          product: {
            commission_enabled: true,
            commission_type: "flat",
            commission_value: 5,
          },
          quantity: 4,
          totalPrice: 200,
        })
      );

      expect(result.hasCommission).toBe(true);
      expect(result.commissionAmount).toBe(20);
      expect(result.ruleLabel).toBe("$5.00 / pz");
    });

    it("no comisiona si el valor de comision es cero o negativo", () => {
      const zero = calculateItemCommission(
        buildItem({
          product: {
            commission_enabled: true,
            commission_type: "percent",
            commission_value: 0,
          },
        })
      );
      const negative = calculateItemCommission(
        buildItem({
          product: {
            commission_enabled: true,
            commission_type: "percent",
            commission_value: -3,
          },
        })
      );

      expect(zero.hasCommission).toBe(false);
      expect(negative.hasCommission).toBe(false);
    });

    it("respeta la exencion por encima del departamento incluso con monto cero", () => {
      const result = calculateItemCommission(
        buildItem({
          product: {
            commission_enabled: false,
            commission_type: "flat",
            commission_value: 0,
          },
          department: {
            commission_enabled: true,
            commission_type: "percent",
            commission_value: 10,
          },
        })
      );

      expect(result.hasCommission).toBe(false);
    });
  });

  describe("aggregateCashierCommissions", () => {
    it("agrupa por cajero solo partidas comisionables y ordena por total", () => {
      const rows = [
        {
          cashierId: "c1",
          cashierName: "JUAN",
          branchName: "Norte",
          saleId: "s1",
          quantity: 2,
          totalPrice: 100,
          commissionAmount: 10,
          hasCommission: true,
        },
        {
          cashierId: "c1",
          cashierName: "JUAN",
          branchName: "Norte",
          saleId: "s2",
          quantity: 1,
          totalPrice: 50,
          commissionAmount: 5,
          hasCommission: true,
        },
        {
          cashierId: "c2",
          cashierName: "MARIA",
          branchName: "Sur",
          saleId: "s3",
          quantity: 3,
          totalPrice: 200,
          commissionAmount: 40,
          hasCommission: true,
        },
        {
          cashierId: "c1",
          cashierName: "JUAN",
          branchName: "Norte",
          saleId: "s4",
          quantity: 1,
          totalPrice: 10,
          commissionAmount: 0,
          hasCommission: false,
        },
      ];

      const result = aggregateCashierCommissions(rows);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        cashierId: "c2",
        totalCommission: 40,
        rank: 1,
      });
      expect(result[1]).toMatchObject({
        cashierId: "c1",
        totalCommission: 15,
        rank: 2,
        ticketsCount: 2,
      });
    });
  });

  describe("aggregateProductCommissions", () => {
    it("agrupa por producto solo partidas comisionables", () => {
      const rows = [
        {
          productId: "p1",
          barcode: "7501",
          productName: "CROQUETA",
          departmentName: "Alimentos",
          commissionType: "percent",
          commissionValue: 10,
          ruleLabel: "percent: 10%",
          quantity: 2,
          totalPrice: 100,
          commissionAmount: 10,
          hasCommission: true,
          saleId: "s1",
        },
        {
          productId: "p1",
          barcode: "7501",
          productName: "CROQUETA",
          departmentName: "Alimentos",
          commissionType: "percent",
          commissionValue: 10,
          ruleLabel: "percent: 10%",
          quantity: 1,
          totalPrice: 50,
          commissionAmount: 5,
          hasCommission: true,
          saleId: "s2",
        },
        {
          productId: "p2",
          barcode: "7502",
          productName: "ARENERO",
          departmentName: "Nupec",
          commissionType: null,
          commissionValue: 0,
          ruleLabel: "Sin comision",
          quantity: 1,
          totalPrice: 20,
          commissionAmount: 0,
          hasCommission: false,
          saleId: "s3",
        },
      ];

      const result = aggregateProductCommissions(rows);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        productId: "p1",
        totalCommission: 15,
        totalCommissionPaid: 15,
        unitsSold: 3,
        ticketsCount: 2,
      });
    });
  });

  describe("calculateGlobalKpis", () => {
    it("acumula montos, ventas y unidades solo de filas comisionables", () => {
      const summaries = [{ cashierName: "JUAN", totalCommission: 15 }];
      const rows = [
        {
          hasCommission: true,
          commissionAmount: 10,
          totalPrice: 100,
          quantity: 2,
        },
        {
          hasCommission: true,
          commissionAmount: 5,
          totalPrice: 50,
          quantity: 1,
        },
        {
          hasCommission: false,
          commissionAmount: 0,
          totalPrice: 999,
          quantity: 9,
        },
      ];

      const kpis = calculateGlobalKpis(summaries, rows);

      expect(kpis).toMatchObject({
        totalCommissions: 15,
        totalCommissionableSales: 150,
        totalCommissionableUnits: 3,
        totalCashiersWithCommissions: 1,
        topCashierName: "JUAN",
        topCashierAmount: 15,
      });
    });
  });
});
