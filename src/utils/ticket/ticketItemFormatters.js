import { normalizeUpper } from "./ticketLayoutFormatters";

export const toNumber = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

export const getItemDescription = (item = {}) => {
  return normalizeUpper(
    item.description ||
      item.product_name ||
      item.productName ||
      item.name ||
      item.nombre ||
      "PRODUCTO"
  );
};

export const getItemQuantity = (item = {}) => {
  const quantity = toNumber(item.quantity ?? item.qty ?? item.cantidad ?? 0);
  return quantity > 0 ? quantity : 1;
};

export const getItemLineTotal = (item = {}) => {
  return toNumber(
    item.total ?? item.line_total ?? item.total_price ?? item.importe ?? 0
  );
};

export const getItemOriginalUnitPrice = (item = {}) => {
  const fallbackPrice = toNumber(
    item.unit_price ?? item.price ?? item.precio ?? 0
  );

  return toNumber(
    item.original_unit_price ??
      item.originalUnitPrice ??
      item.precioOriginal ??
      fallbackPrice
  );
};

export const getItemFinalUnitPrice = (item = {}) => {
  return toNumber(
    item.final_unit_price ??
      item.finalUnitPrice ??
      item.unit_price ??
      item.price ??
      item.precio ??
      0
  );
};

export const getItemPaidUnitPrice = (item = {}) => {
  const quantity = getItemQuantity(item);
  const lineTotal = getItemLineTotal(item);

  if (quantity > 0 && lineTotal > 0) {
    return lineTotal / quantity;
  }

  return getItemFinalUnitPrice(item);
};

export const getItemDiscountAmount = (item = {}) => {
  return toNumber(
    item.reward_discount_amount ??
      item.rewardDiscountAmount ??
      item.discount_amount ??
      item.discountAmount ??
      item.descuentoMonto ??
      0
  );
};
