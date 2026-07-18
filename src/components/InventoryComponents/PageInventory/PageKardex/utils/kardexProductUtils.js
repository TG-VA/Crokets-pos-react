import {
  getKardexProductId,
} from "./kardexMovementUtils";

export const KARDEX_PRODUCT_SLOTS = [
  0,
  1,
];

export const createEmptyProductSlots =
  () => [
    null,
    null,
  ];

export const normalizeKardexBarcode = (
  value
) => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

export const getKardexProductBarcode = (
  product
) => {
  return normalizeKardexBarcode(
    product?.codigo ??
      product?.barcode ??
      product?.code
  );
};

/*
 * Un producto es consultable en Kardex cuando tiene
 * un registro real en branch_inventory de la sucursal.
 *
 * Puede estar activo o inactivo.
 */
export const isBranchKardexProduct = (
  product
) => {
  if (!product) {
    return false;
  }

  return Boolean(
    product.inventory_id &&
    product.branch_id
  );
};

export const filterBranchKardexProducts = (
  products
) => {
  const source =
    Array.isArray(products)
      ? products
      : [];

  return source.filter(
    isBranchKardexProduct
  );
};

export const findKardexProductByBarcode = (
  products,
  barcode
) => {
  const normalizedBarcode =
    normalizeKardexBarcode(
      barcode
    );

  if (!normalizedBarcode) {
    return null;
  }

  return (
    products.find(
      (product) =>
        getKardexProductBarcode(
          product
        ) ===
        normalizedBarcode
    ) ?? null
  );
};

export const getKardexTargetSlot = (
  slot
) => {
  return slot === 1 ? 1 : 0;
};

export const getNextKardexSlot = (
  selectedProducts
) => {
  if (!selectedProducts?.[0]) {
    return 0;
  }

  if (!selectedProducts?.[1]) {
    return 1;
  }

  return 1;
};

export const getKardexProductIds = (
  products
) => {
  const source =
    Array.isArray(products)
      ? products
      : [];

  return source.map(
    (product) =>
      getKardexProductId(
        product
      )
  );
};