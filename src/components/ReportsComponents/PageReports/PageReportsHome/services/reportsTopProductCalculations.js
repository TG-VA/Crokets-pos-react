import { toNumber } from "./reportsDashboardUtils";

export const buildTopProduct = ({
  detailRows = [],
  validSaleIds,
  returnedQuantityByProduct = {},
  returnedAmountByProduct = {},
  productRows = [],
}) => {
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

  const product = productRows.find(
    (row) => row.id === topProductId
  );

  return {
    id: topProductId,
    name:
      product?.name ||
      product?.barcode ||
      "Producto",
    barcode: product?.barcode || "",
    quantity: toNumber(
      quantityByProduct[topProductId]
    ),
    amount: toNumber(
      amountByProduct[topProductId]
    ),
  };
};
