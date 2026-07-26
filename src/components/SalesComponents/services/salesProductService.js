import { supabase } from "../../../lib/supabaseClient";

import {
  getProductWithDiscount,
} from "./salesInventoryService";

const PRODUCT_SELECT = `
  id,
  barcode,
  name,
  cost_price,
  sale_price,
  is_kit,
  status,
  is_global,
  tracks_inventory
`;

const BRANCH_INVENTORY_SELECT = `
  stock,
  is_active,
  has_been_stocked,
  cost_price,
  sale_price
`;

const createProductError = (
  message,
  code,
) => {
  const error = new Error(message);
  error.code = code;

  return error;
};

export const getActiveProductByBarcode =
  async (barcode) => {
    const cleanBarcode = String(
      barcode || "",
    ).trim();

    if (!cleanBarcode) {
      throw createProductError(
        "Ingresa un código de barras.",
        "EMPTY_BARCODE",
      );
    }

    const {
      data: product,
      error,
    } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("barcode", cleanBarcode)
      .eq("status", true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!product) {
      throw createProductError(
        "Producto no encontrado.",
        "PRODUCT_NOT_FOUND",
      );
    }

    return product;
  };

export const getProductBranchInventory =
  async ({
    branchId,
    productId,
  }) => {
    if (!branchId) {
      throw createProductError(
        "La sucursal aún no está cargada.",
        "BRANCH_NOT_LOADED",
      );
    }

    if (!productId) {
      throw createProductError(
        "No se detectó el producto.",
        "PRODUCT_NOT_PROVIDED",
      );
    }

    const {
      data: inventoryRow,
      error,
    } = await supabase
      .from("branch_inventory")
      .select(BRANCH_INVENTORY_SELECT)
      .eq("branch_id", branchId)
      .eq("product_id", productId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return inventoryRow;
  };

const validateProductWithoutInventory = (
  product,
) => {
  if (!product?.is_global) {
    throw createProductError(
      "Este producto no está disponible para esta sucursal.",
      "PRODUCT_NOT_GLOBAL",
    );
  }
};

const validateInventoryRow = (
  inventoryRow,
) => {
  if (!inventoryRow) {
    throw createProductError(
      "Este producto no existe en el inventario de esta sucursal.",
      "INVENTORY_NOT_FOUND",
    );
  }

  if (inventoryRow.is_active === false) {
    throw createProductError(
      "Este producto está inactivo en esta sucursal.",
      "INVENTORY_INACTIVE",
    );
  }

  const stock = Number(
    inventoryRow.stock || 0,
  );

  const hasBeenStocked =
    inventoryRow.has_been_stocked === true;

  if (!hasBeenStocked && stock <= 0) {
    throw createProductError(
      "Este producto aún no tiene inventario inicial registrado en esta sucursal.",
      "INITIAL_STOCK_MISSING",
    );
  }

  if (stock <= 0) {
    throw createProductError(
      "No hay existencia disponible en esta sucursal.",
      "OUT_OF_STOCK",
    );
  }
};

const mergeProductWithInventory = ({
  product,
  inventoryRow,
}) => {
  if (!inventoryRow) {
    return product;
  }

  return {
    ...product,
    cost_price:
      inventoryRow.cost_price ??
      product.cost_price,
    sale_price:
      inventoryRow.sale_price ??
      product.sale_price,
    branch_inventory:
      inventoryRow,
  };
};

export const getSellableProductByBarcode =
  async ({
    barcode,
    branchId,
  }) => {
    const product =
      await getActiveProductByBarcode(
        barcode,
      );

    /*
     * Los kits validan su disponibilidad
     * mediante sus componentes al agregarse
     * al carrito.
     */
    if (product.is_kit) {
      return getProductWithDiscount(
        product,
      );
    }

    /*
     * Los productos que no controlan
     * inventario deben ser globales.
     */
    if (!product.tracks_inventory) {
      validateProductWithoutInventory(
        product,
      );

      return getProductWithDiscount(
        product,
      );
    }

    const inventoryRow =
      await getProductBranchInventory({
        branchId,
        productId: product.id,
      });

    validateInventoryRow(
      inventoryRow,
    );

    const productWithInventory =
      mergeProductWithInventory({
        product,
        inventoryRow,
      });

    return getProductWithDiscount(
      productWithInventory,
    );
  };