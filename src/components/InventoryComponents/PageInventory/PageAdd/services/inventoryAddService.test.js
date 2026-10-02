import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

vi.mock("../../../../../utils/inventoryMovements", () => ({
  getSystemLocalTimestamp: vi.fn(() => "2026-10-02T12:00:00"),
  logInventoryMovement: vi.fn(),
}));

import { supabase } from "../../../../../lib/supabaseClient";
import { logInventoryMovement } from "../../../../../utils/inventoryMovements";
import { addInventoryToProduct } from "./inventoryAddService";

const BRANCH_ID = "branch-1";
const PRODUCT_ID = "product-1";

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };

  q.select.mockReturnValue(q);
  q.insert.mockReturnValue(q);
  q.update.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  q.maybeSingle.mockResolvedValue(resolve);
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

const baseProduct = {
  product_id: PRODUCT_ID,
  descripcion: "Alimento para perro adulto 15 kg",
  costo: 100,
  precio: 250,
};

describe("inventoryAddService", () => {
  let selectQ;

  const setupRow = (row) => {
    selectQ.maybeSingle.mockResolvedValue({ data: row, error: null });
  };

  beforeEach(() => {
    supabase.from.mockReset();
    logInventoryMovement.mockReset();
    logInventoryMovement.mockResolvedValue({
      success: true,
      skipped: false,
      error: null,
    });

    selectQ = thenableQuery();

    supabase.from.mockImplementation((table) => {
      if (table === "branch_inventory") return selectQ;
      throw new Error(`Tabla inesperada: ${table}`);
    });
  });

  describe("costo promedio ponderado sobre fila existente", () => {
    it("actualiza cost_price con el CPP exacto de 10 @ 100 mas 10 @ 400", async () => {
      setupRow({
        id: "inv-1",
        stock: 10,
        has_been_stocked: true,
        cost_price: 100,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);

      const result = await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 10,
        incomingCostPrice: 400,
      });

      expect(selectQ.select).toHaveBeenCalledWith(
        "id, stock, has_been_stocked, cost_price"
      );
      expect(selectQ.update).toHaveBeenCalledWith(
        expect.objectContaining({
          stock: 20,
          cost_price: 250,
          has_been_stocked: true,
        })
      );
      expect(result.costPrice).toBe(250);
    });

    it("encadena el CPP sobre una segunda entrada con el costo ya calculado", async () => {
      setupRow({
        id: "inv-1",
        stock: 20,
        has_been_stocked: true,
        cost_price: 250,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);

      const result = await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 10,
        incomingCostPrice: 200,
      });

      expect(selectQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ stock: 30, cost_price: 233.33 })
      );
      expect(result.costPrice).toBe(233.33);
    });

    it("respeta un cost_price ya calculado en 0 en vez de heredar el catalogo", async () => {
      setupRow({
        id: "inv-1",
        stock: 10,
        has_been_stocked: true,
        cost_price: 0,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);

      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 10,
        incomingCostPrice: 400,
      });

      expect(selectQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ cost_price: 200 })
      );
    });

    it("filtra la fila por branch_id y product_id", async () => {
      setupRow({
        id: "inv-1",
        stock: 5,
        has_been_stocked: true,
        cost_price: 10,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);

      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 5,
        incomingCostPrice: 20,
      });

      expect(selectQ.eq).toHaveBeenNthCalledWith(1, "branch_id", BRANCH_ID);
      expect(selectQ.eq).toHaveBeenNthCalledWith(2, "product_id", PRODUCT_ID);
      expect(selectQ.eq).toHaveBeenNthCalledWith(3, "id", "inv-1");
    });
  });

  describe("alta de costo en el movimiento", () => {
    it("envia unitCost y totalCost del lote entrante a logInventoryMovement", async () => {
      setupRow({
        id: "inv-1",
        stock: 10,
        has_been_stocked: true,
        cost_price: 100,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);

      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 10,
        incomingCostPrice: 400,
        userId: "user-1",
      });

      expect(logInventoryMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: BRANCH_ID,
          productId: PRODUCT_ID,
          movementType: "inventory_add",
          quantity: 10,
          previousStock: 10,
          newStock: 20,
          unitCost: 400,
          totalCost: 4000,
          userId: "user-1",
        })
      );
    });

    it("envia totalCost fraccionado con la cantidad", async () => {
      setupRow({
        id: "inv-1",
        stock: 2.5,
        has_been_stocked: true,
        cost_price: 10,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);

      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 1.5,
        incomingCostPrice: 20,
      });

      expect(logInventoryMovement).toHaveBeenCalledWith(
        expect.objectContaining({ unitCost: 20, totalCost: 30 })
      );
    });

    it("no altera el CPP cuando la entrada no es compra y el CPP difiere del catalogo", async () => {
      setupRow({
        id: "inv-1",
        stock: 10,
        has_been_stocked: true,
        cost_price: 250,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);

      // baseProduct.costo es 100: sin costo explicito el CPP debe quedarse en
      // 250, porque ((10*250)+(10*250))/20 === 250.
      const result = await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 10,
      });

      expect(selectQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ cost_price: 250 })
      );
      expect(result.costPrice).toBe(250);
      expect(logInventoryMovement).toHaveBeenCalledWith(
        expect.objectContaining({ unitCost: 250, totalCost: 2500 })
      );
    });

    it("cae al costo vigente sin re-ponderar cuando incomingCostPrice no es numerico", async () => {
      setupRow({
        id: "inv-1",
        stock: 10,
        has_been_stocked: true,
        cost_price: 250,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);

      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 10,
        incomingCostPrice: "cuatrocientos",
      });

      expect(selectQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ cost_price: 250 })
      );
    });

    it("redondea el costo de adquisicion y su importe a 2 decimales", async () => {
      setupRow({
        id: "inv-1",
        stock: 10,
        has_been_stocked: true,
        cost_price: 100,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);

      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 3,
        incomingCostPrice: 33.333,
      });

      // El costo de adquisicion se congela en 33.33 y el importe se deriva de
      // ese valor canonico: 33.33 * 3 = 99.99, no 99.999.
      expect(logInventoryMovement).toHaveBeenCalledWith(
        expect.objectContaining({ unitCost: 33.33, totalCost: 99.99 })
      );
      // El CPP usa el mismo costo redondeado: (1000 + 99.99) / 13 = 84.61.
      expect(selectQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ cost_price: 84.61 })
      );
    });

    it("cae al costo vigente cuando incomingCostPrice es null explicito", async () => {
      setupRow({
        id: "inv-1",
        stock: 10,
        has_been_stocked: true,
        cost_price: 250,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);

      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 10,
        incomingCostPrice: null,
      });

      expect(selectQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ cost_price: 250 })
      );
    });

    it("cae al costo del catalogo solo cuando el producto no expone costo", async () => {
      setupRow({
        id: "inv-1",
        stock: 4,
        has_been_stocked: true,
        cost_price: null,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);

      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: { product_id: PRODUCT_ID, cost_price: 60, precio: 150 },
        quantity: 4,
      });

      expect(logInventoryMovement).toHaveBeenCalledWith(
        expect.objectContaining({ unitCost: 60, totalCost: 240 })
      );
    });

    it("envia costo cero en vez de null cuando no hay costo en ninguna parte", async () => {
      setupRow({
        id: "inv-1",
        stock: 3,
        has_been_stocked: true,
        cost_price: null,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);

      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: { product_id: PRODUCT_ID, precio: 150 },
        quantity: 3,
      });

      expect(logInventoryMovement).toHaveBeenCalledWith(
        expect.objectContaining({ unitCost: 0, totalCost: 0 })
      );
    });
  });

  describe("alta sobre fila inexistente", () => {
    it("inserta con el costo entrante cuando no hay fila de inventario", async () => {
      setupRow(null);

      const result = await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 10,
        incomingCostPrice: 400,
      });

      expect(selectQ.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          branch_id: BRANCH_ID,
          product_id: PRODUCT_ID,
          stock: 10,
          cost_price: 400,
          sale_price: 250,
          has_been_stocked: true,
        })
      );
      expect(selectQ.update).not.toHaveBeenCalled();
      expect(result.previousStock).toBe(0);
      expect(result.newStock).toBe(10);
      expect(result.costPrice).toBe(400);
    });

    it("inserta la primera fila valorada al catalogo por no existir promedio previo", async () => {
      setupRow(null);

      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 7,
      });

      expect(selectQ.insert).toHaveBeenCalledWith(
        expect.objectContaining({ stock: 7, cost_price: 100 })
      );
      expect(logInventoryMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          previousStock: 0,
          newStock: 7,
          unitCost: 100,
          totalCost: 700,
        })
      );
    });
  });

  describe("validaciones", () => {
    it("rechaza ausencia de sucursal activa", async () => {
      await expect(
        addInventoryToProduct({
          branchId: null,
          product: baseProduct,
          quantity: 10,
        })
      ).rejects.toThrow(
        "No hay una sucursal activa para registrar el inventario."
      );
    });

    it("rechaza producto sin identificador", async () => {
      await expect(
        addInventoryToProduct({
          branchId: BRANCH_ID,
          product: { descripcion: "Sin id" },
          quantity: 10,
        })
      ).rejects.toThrow("No se detectó el identificador del producto.");
    });

    it("rechaza cantidad cero, negativa o no numerica", async () => {
      await expect(
        addInventoryToProduct({
          branchId: BRANCH_ID,
          product: baseProduct,
          quantity: 0,
        })
      ).rejects.toThrow("La cantidad debe ser mayor a 0.");

      await expect(
        addInventoryToProduct({
          branchId: BRANCH_ID,
          product: baseProduct,
          quantity: -5,
        })
      ).rejects.toThrow("La cantidad debe ser mayor a 0.");

      await expect(
        addInventoryToProduct({
          branchId: BRANCH_ID,
          product: baseProduct,
          quantity: "diez",
        })
      ).rejects.toThrow("La cantidad debe ser mayor a 0.");
    });

    it("acepta el id del producto caido en product.id", async () => {
      setupRow(null);

      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: { id: PRODUCT_ID, costo: 100, precio: 250 },
        quantity: 2,
        incomingCostPrice: 100,
      });

      expect(selectQ.insert).toHaveBeenCalledWith(
        expect.objectContaining({ product_id: PRODUCT_ID, stock: 2 })
      );
    });
  });

  describe("propagacion de errores", () => {
    it("propaga el error de la consulta de branch_inventory", async () => {
      selectQ.maybeSingle.mockResolvedValue({
        data: null,
        error: new Error("fallo la consulta"),
      });

      await expect(
        addInventoryToProduct({
          branchId: BRANCH_ID,
          product: baseProduct,
          quantity: 10,
        })
      ).rejects.toThrow("fallo la consulta");
    });

    it("propaga el error de la escritura sin registrar el movimiento", async () => {
      setupRow({
        id: "inv-1",
        stock: 10,
        has_been_stocked: true,
        cost_price: 100,
      });
      supabase.from.mockImplementation(() => selectQ);
      selectQ.update.mockReturnValue(selectQ);
      selectQ.maybeSingle.mockResolvedValueOnce({
        data: {
          id: "inv-1",
          stock: 10,
          has_been_stocked: true,
          cost_price: 100,
        },
        error: null,
      });

      const failingWrite = thenableQuery({
        data: null,
        error: new Error("fallo la escritura"),
      });
      failingWrite.update.mockReturnValue(failingWrite);

      let call = 0;
      supabase.from.mockImplementation(() => {
        call += 1;
        return call === 1 ? selectQ : failingWrite;
      });

      await expect(
        addInventoryToProduct({
          branchId: BRANCH_ID,
          product: baseProduct,
          quantity: 10,
          incomingCostPrice: 400,
        })
      ).rejects.toThrow("fallo la escritura");

      expect(logInventoryMovement).not.toHaveBeenCalled();
    });
  });
});
