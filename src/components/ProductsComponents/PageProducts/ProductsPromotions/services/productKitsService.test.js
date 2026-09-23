import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import {
  fetchKits,
  checkKitDuplicates,
  createNewKitTransaction,
  updateKitTransaction,
  fetchKitItems,
  toggleKitStatus,
  softDeleteKitTransaction,
  fetchActiveNonKitProducts,
} from "./productKitsService";

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    order: vi.fn(),
  };

  q.select.mockReturnValue(q);
  q.insert.mockReturnValue(q);
  q.update.mockReturnValue(q);
  q.delete.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  q.neq.mockReturnValue(q);
  q.in.mockReturnValue(q);
  q.order.mockReturnValue(q);
  q.maybeSingle.mockResolvedValue({ data: null, error: null });
  q.single.mockResolvedValue({ data: null, error: null });
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

describe("productKitsService", () => {
  let productsQ;
  let kitsQ;
  let itemsQ;

  beforeEach(() => {
    supabase.from.mockReset();
    supabase.rpc.mockReset();
    productsQ = thenableQuery();
    kitsQ = thenableQuery();
    itemsQ = thenableQuery();

    supabase.from.mockImplementation((table) => {
      if (table === "products") return productsQ;
      if (table === "product_kits") return kitsQ;
      if (table === "product_kit_items") return itemsQ;
      throw new Error(`Tabla inesperada: ${table}`);
    });
  });

  describe("fetchKits", () => {
    it("filtra kits cuyo producto asociado no está activo", async () => {
      kitsQ.then = (ok) =>
        Promise.resolve({
          data: [
            { id: "k1", products: { status: true } },
            { id: "k2", products: { status: false } },
            { id: "k3", products: null },
          ],
          error: null,
        }).then(ok);

      const result = await fetchKits();

      expect(result.map((kit) => kit.id)).toEqual(["k1"]);
      expect(kitsQ.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });
  });

  describe("checkKitDuplicates", () => {
    it("detecta barcode duplicado", async () => {
      productsQ.maybeSingle.mockResolvedValue({ data: { id: "otro" }, error: null });

      await expect(checkKitDuplicates("BC", "Desc")).resolves.toEqual({
        isDuplicate: true,
        reason: "barcode",
      });
    });

    it("ignora el barcode del propio producto en edición y continúa con el nombre", async () => {
      productsQ.maybeSingle
        .mockResolvedValueOnce({ data: { id: "self" }, error: null })
        .mockResolvedValueOnce({ data: { id: "self" }, error: null });

      await expect(checkKitDuplicates("BC", "Desc", "self")).resolves.toEqual({
        isDuplicate: false,
      });
    });

    it("detecta nombre duplicado en otro kit", async () => {
      productsQ.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: "otro" }, error: null });

      await expect(checkKitDuplicates("BC", "Desc")).resolves.toEqual({
        isDuplicate: true,
        reason: "name",
      });
    });

    it("retorna no duplicado sin coincidencias", async () => {
      productsQ.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      await expect(checkKitDuplicates("BC", "Desc")).resolves.toEqual({
        isDuplicate: false,
      });
    });
  });

  describe("createNewKitTransaction", () => {
    it("invoca la RPC create_kit_transaction con el payload del kit", async () => {
      supabase.rpc.mockResolvedValue({ data: "kit1", error: null });

      const kitData = { barcode: "KIT1", description: "Pack", price: 100, max_kits_per_sale: 3 };
      const result = await createNewKitTransaction(kitData, [
        { id: "c1", quantity: 2 },
        { id: "c2", quantity: 1 },
      ]);

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith("create_kit_transaction", {
        p_kit_product: {
          barcode: "KIT1",
          name: "Pack",
          sale_price: 100,
          max_kits_per_sale: 3,
        },
        p_kit_items: [
          { component_product_id: "c1", quantity: 2 },
          { component_product_id: "c2", quantity: 1 },
        ],
      });
    });

    it("usa max_kits_per_sale por defecto 1 si no se envía", async () => {
      supabase.rpc.mockResolvedValue({ data: "kit1", error: null });

      await createNewKitTransaction({ barcode: "KIT1", description: "Pack", price: 100 }, [
        { id: "c1", quantity: 1 },
      ]);

      expect(supabase.rpc.mock.calls[0][1].p_kit_product.max_kits_per_sale).toBe(1);
    });

    it("propaga el error de la RPC sin intentar rollback", async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: { message: "rpc fail" } });

      await expect(
        createNewKitTransaction({ barcode: "KIT1", description: "Pack", price: 100 }, [
          { id: "c1", quantity: 1 },
        ])
      ).rejects.toThrow("rpc fail");
      expect(supabase.from).not.toHaveBeenCalledWith("product_kits");
    });
  });

  describe("updateKitTransaction", () => {
    it("invoca la RPC update_kit_transaction con el kit e items", async () => {
      supabase.rpc.mockResolvedValue({ data: true, error: null });

      const editingKit = { id: "kit1", kit_product_id: "prod1" };
      const result = await updateKitTransaction(editingKit, {
        barcode: "KIT1",
        description: "Pack",
        price: 120,
        max_kits_per_sale: 4,
      }, [{ id: "c1", quantity: 2 }]);

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith("update_kit_transaction", {
        p_kit_id: "kit1",
        p_kit_product_id: "prod1",
        p_kit_product: {
          barcode: "KIT1",
          name: "Pack",
          sale_price: 120,
          max_kits_per_sale: 4,
        },
        p_kit_items: [{ component_product_id: "c1", quantity: 2 }],
      });
    });

    it("propaga el error de la RPC", async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: { message: "rpc fail" } });

      const editingKit = { id: "kit1", kit_product_id: "prod1" };
      await expect(
        updateKitTransaction(editingKit, { barcode: "KIT1", description: "Pack", price: 120, max_kits_per_sale: 1 }, [
          { id: "c1", quantity: 2 },
        ])
      ).rejects.toThrow("rpc fail");
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe("fetchKitItems", () => {
    it("trae los items del kit ordenados", async () => {
      itemsQ.then = (ok) =>
        Promise.resolve({ data: [{ id: "i1", quantity: 2 }], error: null }).then(ok);

      const result = await fetchKitItems("kit1");

      expect(result).toEqual([{ id: "i1", quantity: 2 }]);
      expect(itemsQ.order).toHaveBeenCalledWith("created_at", { ascending: true });
    });
  });

  describe("toggleKitStatus", () => {
    it("alterna el estado del kit", async () => {
      const result = await toggleKitStatus("kit1", false);

      expect(result).toBe(true);
      expect(kitsQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false })
      );
    });

    it("propaga errores del update", async () => {
      kitsQ.update.mockReturnValue(
        thenableQuery({ data: null, error: { message: "toggle fail" } })
      );

      await expect(toggleKitStatus("kit1", true)).rejects.toThrow("toggle fail");
    });
  });

  describe("softDeleteKitTransaction", () => {
    it("invoca la RPC delete_kit_transaction con kit y producto", async () => {
      supabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = await softDeleteKitTransaction("kit1", "prod1");

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith("delete_kit_transaction", {
        p_kit_id: "kit1",
        p_kit_product_id: "prod1",
      });
    });

    it("propaga el error de la RPC sin reverir estados", async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: { message: "rpc fail" } });

      await expect(softDeleteKitTransaction("kit1", "prod1")).rejects.toThrow(
        "rpc fail"
      );
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe("fetchActiveNonKitProducts", () => {
    it("trae productos activos que no son kits", async () => {
      productsQ.then = (ok) =>
        Promise.resolve({ data: [{ id: "p1" }], error: null }).then(ok);

      const result = await fetchActiveNonKitProducts();

      expect(result).toEqual([{ id: "p1" }]);
      expect(productsQ.eq).toHaveBeenCalledWith("status", true);
      expect(productsQ.eq).toHaveBeenCalledWith("is_kit", false);
      expect(productsQ.order).toHaveBeenCalledWith("name", { ascending: true });
    });
  });
});
