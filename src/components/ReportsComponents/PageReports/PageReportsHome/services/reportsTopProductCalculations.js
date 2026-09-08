import { toNumber } from "./reportsDashboardUtils";

export const getTopProductStats = ({
  detailRows = [],
  validSaleIds,
  returnedQuantityByProduct = {},
  returnedAmountByProduct = {},
}) => {
  if (!(validSaleIds instanceof Set)) {
    return null;
  }

  const quantityByProduct = {};
  const amountByProduct = {};

  for (const detail of detailRows) {
    if (!validSaleIds.has(detail.sale_id)) {
      continue;
    }

    if (!detail.product_id) continue;

    quantityByProduct[detail.product_id] =
      toNumber(
        quantityByProduct[detail.product_id]
      ) + toNumber(detail.quantity);

    amountByProduct[detail.product_id] =
      toNumber(
        amountByProduct[detail.product_id]
      ) + toNumber(detail.total_price);
  }

  for (const productId of Object.keys(
    quantityByProduct
  )) {
    quantityByProduct[productId] = Math.max(
      toNumber(quantityByProduct[productId]) -
        toNumber(
          returnedQuantityByProduct[productId]
        ),
      0
    );

    amountByProduct[productId] = Math.max(
      toNumber(amountByProduct[productId]) -
        toNumber(
          returnedAmountByProduct[productId]
        ),
      0
    );
  }

  const topProductId = Object.keys(
    quantityByProduct
  ).sort((firstId, secondId) => {
    const quantityDifference =
      quantityByProduct[secondId] -
      quantityByProduct[firstId];

    if (quantityDifference !== 0) {
      return quantityDifference;
    }

    return (
      toNumber(amountByProduct[secondId]) -
      toNumber(amountByProduct[firstId])
    );
  })[0];

  if (
    !topProductId ||
    quantityByProduct[topProductId] <= 0
  ) {
    return null;
  }

  return {
    productId: topProductId,
    quantity: toNumber(
      quantityByProduct[topProductId]
    ),
    amount: toNumber(
      amountByProduct[topProductId]
    ),
  };
};

export const formatTopProduct = (stats, product = null) => {
  if (!stats?.productId) return null;

  return {
    id: stats.productId,
    name:
      product?.name ||
      product?.barcode ||
      "Producto",
    barcode: product?.barcode || "",
    quantity: stats.quantity,
    amount: stats.amount,
  };
};

export const buildTopProduct = ({
  detailRows = [],
  validSaleIds,
  returnedQuantityByProduct = {},
  returnedAmountByProduct = {},
  productRows = [],
  product = null,
}) => {
  const stats = getTopProductStats({
    detailRows,
    validSaleIds,
    returnedQuantityByProduct,
    returnedAmountByProduct,
  });

  if (!stats) return null;

  const matchedProduct =
    product ||
    productRows.find(
      (row) => row.id === stats.productId
    );

  return formatTopProduct(stats, matchedProduct);
};

