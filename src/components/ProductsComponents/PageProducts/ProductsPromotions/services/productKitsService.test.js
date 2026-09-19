import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
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
    it("crea producto kit, kit e items", async () => {
      productsQ.single.mockResolvedValue({ data: { id: "prod1" }, error: null });
      kitsQ.single.mockResolvedValue({ data: { id: "kit1" }, error: null });
      itemsQ.then = (ok) => Promise.resolve({ data: null, error: null }).then(ok);

      const kitData = { barcode: "KIT1", description: "Pack", price: 100, max_kits_per_sale: 3 };
      const result = await createNewKitTransaction(kitData, [
        { id: "c1", quantity: 2 },
        { id: "c2", quantity: 1 },
      ]);

      expect(result).toBe(true);
      expect(productsQ.insert).toHaveBeenCalledWith(
        expect.objectContaining({ barcode: "KIT1", is_kit: true, max_kits_per_sale: 3 })
      );
      expect(kitsQ.insert).toHaveBeenCalledWith(
        expect.objectContaining({ kit_product_id: "prod1" })
      );
      expect(itemsQ.insert).toHaveBeenCalledWith([
        expect.objectContaining({ kit_id: "kit1", component_product_id: "c1", quantity: 2 }),
        expect.objectContaining({ kit_id: "kit1", component_product_id: "c2", quantity: 1 }),
      ]);
    });

    it("hace rollback del kit y del producto si fallan los items", async () => {
      productsQ.single.mockResolvedValue({ data: { id: "prod1" }, error: null });
      kitsQ.single.mockResolvedValue({ data: { id: "kit1" }, error: null });
      itemsQ.then = (ok) =>
        Promise.resolve({ data: null, error: { message: "items fail" } }).then(ok);

      await expect(
        createNewKitTransaction({ barcode: "KIT1", description: "Pack", price: 100 }, [
          { id: "c1", quantity: 1 },
        ])
      ).rejects.toThrow("items fail");
      expect(kitsQ.delete).toHaveBeenCalled();
      expect(productsQ.delete).toHaveBeenCalled();
    });
  });

  describe("updateKitTransaction", () => {
    it("actualiza producto, kit e items", async () => {
      itemsQ.then = (ok) =>
        Promise.resolve({ data: [{ id: "old1", quantity: 1 }], error: null }).then(ok);

      const editingKit = { id: "kit1", kit_product_id: "prod1" };
      const result = await updateKitTransaction(editingKit, {
        barcode: "KIT1",
        description: "Pack",
        price: 120,
        max_kits_per_sale: 4,
      }, [{ id: "c1", quantity: 2 }]);

      expect(result).toBe(true);
      expect(productsQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ barcode: "KIT1", sale_price: 120, max_kits_per_sale: 4 })
      );
      expect(kitsQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ updated_at: expect.any(String) })
      );
      expect(itemsQ.delete).toHaveBeenCalled();
      expect(itemsQ.insert).toHaveBeenCalledWith([
        expect.objectContaining({ kit_id: "kit1", component_product_id: "c1", quantity: 2 }),
      ]);
    });

    it("restaura los items previos si falla la inserción y relanza", async () => {
      itemsQ.then = (ok) =>
        Promise.resolve({ data: [{ id: "old1", quantity: 1 }], error: null }).then(ok);
      itemsQ.insert.mockReturnValue(
        thenableQuery({ data: null, error: { message: "insert fail" } })
      );

      const editingKit = { id: "kit1", kit_product_id: "prod1" };
      await expect(
        updateKitTransaction(editingKit, { barcode: "KIT1", description: "Pack", price: 120, max_kits_per_sale: 1 }, [
          { id: "c1", quantity: 2 },
        ])
      ).rejects.toThrow("insert fail");
      expect(itemsQ.insert.mock.calls).toHaveLength(2);
      expect(itemsQ.insert.mock.calls[1][0]).toEqual([
        expect.objectContaining({ id: "old1", quantity: 1 }),
      ]);
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
    it("desactiva el producto y el kit", async () => {
      const result = await softDeleteKitTransaction("kit1", "prod1");

      expect(result).toBe(true);
      expect(productsQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: false })
      );
      expect(kitsQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false })
      );
    });

    it("reversa la desactivación del producto si falla el kit", async () => {
      kitsQ.update.mockReturnValue(
        thenableQuery({ data: null, error: { message: "kit fail" } })
      );

      await expect(softDeleteKitTransaction("kit1", "prod1")).rejects.toThrow(
        "kit fail"
      );
      expect(productsQ.update.mock.calls[1][0]).toEqual(
        expect.objectContaining({ status: true })
      );
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
