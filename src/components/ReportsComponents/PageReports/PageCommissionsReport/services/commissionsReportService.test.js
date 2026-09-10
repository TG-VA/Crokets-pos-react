import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import {
  getBranchesList,
  getCashiersList,
  getDepartmentsList,
  fetchCommissionsData,
} from "./commissionsReportService";

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
  };

  Object.values(q).forEach((fn) => fn.mockReturnValue(q));
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

describe("commissionsReportService", () => {
  const startDateIso = "2026-09-01T00:00:00.000Z";
  const endDateIso = "2026-09-10T23:59:59.999Z";

  beforeEach(() => {
    supabase.from.mockReset();
    supabase.rpc.mockReset();
  });

  describe("fetchCommissionsData", () => {
    it("invoca la RPC con filtros ALL a null y sin parametros de paginacion", async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });

      await fetchCommissionsData({ startDateIso, endDateIso });

      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(supabase.rpc).toHaveBeenCalledWith("get_commissions_report_data", {
        p_start_date: startDateIso,
        p_end_date: endDateIso,
        p_branch_id: null,
        p_cashier_id: null,
        p_department_id: null,
      });
      const params = supabase.rpc.mock.calls[0][1];
      expect(params).not.toHaveProperty("p_page");
      expect(params).not.toHaveProperty("p_page_size");
    });

    it("envia los ids de filtro cuando no son ALL", async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });

      await fetchCommissionsData({
        startDateIso,
        endDateIso,
        branchId: "br-1",
        cashierId: "cs-1",
        departmentId: "dp-1",
      });

      expect(supabase.rpc.mock.calls[0][1]).toMatchObject({
        p_branch_id: "br-1",
        p_cashier_id: "cs-1",
        p_department_id: "dp-1",
      });
    });

    it("mapea las filas de la RPC al shape contract detallado", async () => {
      const row = {
        detail_id: "d1",
        sale_id: "s1",
        ticket_number: "ABC12345",
        created_at: "2026-09-05T10:00:00.000Z",
        branch_id: "b1",
        branch_name: "Sucursal Norte",
        cashier_id: "c1",
        cashier_name: "juan perez",
        product_id: "p1",
        barcode: "750123",
        product_name: "CROQUETA PREMIUM",
        department_id: "dp1",
        department_name: "Alimentos",
        quantity: 2,
        unit_price: "50",
        catalog_price: "55",
        discount_amount: "5",
        discount_type: "amount",
        has_discount: true,
        total_price: "95",
        has_commission: true,
        commission_amount: "10",
        commission_type: "percent",
        commission_value: "10",
        rule_label: "percent: 10%",
      };
      supabase.rpc.mockResolvedValue({ data: [row], error: null });

      const { detailedRows } = await fetchCommissionsData({
        startDateIso,
        endDateIso,
      });

      expect(detailedRows).toEqual([
        {
          detailId: "d1",
          saleId: "s1",
          ticketNumber: "ABC12345",
          createdAt: "2026-09-05T10:00:00.000Z",
          branchId: "b1",
          branchName: "Sucursal Norte",
          cashierId: "c1",
          cashierName: "JUAN PEREZ",
          productId: "p1",
          barcode: "750123",
          productName: "CROQUETA PREMIUM",
          departmentId: "dp1",
          departmentName: "Alimentos",
          quantity: 2,
          unitPrice: 50,
          catalogPrice: 55,
          discountAmount: 5,
          discountType: "amount",
          hasDiscount: true,
          totalPrice: 95,
          hasCommission: true,
          commissionAmount: 10,
          commissionType: "percent",
          commissionValue: 10,
          ruleLabel: "percent: 10%",
        },
      ]);
    });

    it("aplica defaults para campos ausentes y sin comision", async () => {
      const row = {
        detail_id: "d1",
        sale_id: "s1",
        created_at: "2026-09-05T10:00:00.000Z",
        quantity: "0",
        unit_price: null,
        total_price: null,
      };
      supabase.rpc.mockResolvedValue({ data: [row], error: null });

      const { detailedRows } = await fetchCommissionsData({
        startDateIso,
        endDateIso,
      });

      expect(detailedRows[0]).toMatchObject({
        ticketNumber: "S/N",
        branchName: "General",
        cashierName: "SISTEMA",
        barcode: "---",
        productName: "Producto sin nombre",
        departmentName: "Sin Departamento",
        quantity: 0,
        unitPrice: 0,
        catalogPrice: 0,
        discountAmount: 0,
        discountType: null,
        hasDiscount: false,
        totalPrice: 0,
        hasCommission: false,
        commissionAmount: 0,
        commissionType: null,
        commissionValue: 0,
        ruleLabel: "Sin comision",
      });
    });

    it("retorna unicamente { detailedRows } sin total_count", async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await fetchCommissionsData({ startDateIso, endDateIso });

      expect(result).toEqual({ detailedRows: [] });
      expect(result).not.toHaveProperty("totalCount");
    });

    it("lanza error con mensaje de usuario si la RPC falla", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      supabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });

      await expect(
        fetchCommissionsData({ startDateIso, endDateIso })
      ).rejects.toThrow("Error al consultar las ventas en el periodo.");
      spy.mockRestore();
    });
  });

  describe("getBranchesList", () => {
    it("consulta y mapea el catalogo de sucursales", async () => {
      const q = thenableQuery({
        data: [
          { id: "b1", name: "Norte" },
          { id: "b2", name: "Sur" },
        ],
        error: null,
      });
      supabase.from.mockReturnValue(q);

      const result = await getBranchesList();

      expect(supabase.from).toHaveBeenCalledWith("branches");
      expect(q.select).toHaveBeenCalledWith("id, name");
      expect(result).toEqual([
        { id: "b1", name: "Norte" },
        { id: "b2", name: "Sur" },
      ]);
    });

    it("lanza error si la consulta falla", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: { message: "boom" } })
      );

      await expect(getBranchesList()).rejects.toThrow(
        "No se pudo cargar el catálogo de sucursales."
      );
      spy.mockRestore();
    });
  });

  describe("getCashiersList", () => {
    it("consulta solo usuarios activos y mapea username en mayusculas", async () => {
      const q = thenableQuery({
        data: [
          { id: "c1", username: "" },
          { id: "c2", username: "maria" },
        ],
        error: null,
      });
      supabase.from.mockReturnValue(q);

      const result = await getCashiersList();

      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(q.eq).toHaveBeenCalledWith("status", true);
      expect(result).toEqual([
        { id: "c1", name: "SIN NOMBRE" },
        { id: "c2", name: "MARIA" },
      ]);
    });
  });

  describe("getDepartmentsList", () => {
    it("consulta solo departamentos activos y mapea el catalogo", async () => {
      const q = thenableQuery({
        data: [{ id: "dp1", name: "Alimentos" }],
        error: null,
      });
      supabase.from.mockReturnValue(q);

      const result = await getDepartmentsList();

      expect(supabase.from).toHaveBeenCalledWith("departments");
      expect(q.eq).toHaveBeenCalledWith("status", true);
      expect(result).toEqual([{ id: "dp1", name: "Alimentos" }]);
    });
  });
});