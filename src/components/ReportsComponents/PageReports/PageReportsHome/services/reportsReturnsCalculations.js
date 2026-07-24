import { toNumber } from "./reportsDashboardUtils";

export const buildReturnedAmountBySale = (
  returnRows = []
) => {
  const result = {};

  for (const row of returnRows) {
    if (!row?.sale_id) continue;

    result[row.sale_id] =
      toNumber(result[row.sale_id]) +
      toNumber(row.total_refund);
  }

  return result;
};

export const buildReturnedQuantityByProduct = (
  returnItems = []
) => {
  const result = {};

  for (const item of returnItems) {
    if (!item?.product_id) continue;

    result[item.product_id] =
      toNumber(result[item.product_id]) +
      toNumber(item.quantity);
  }

  return result;
};

export const buildReturnedAmountByProduct = ({
  returnRows = [],
  returnItems = [],
  validSaleIds,
}) => {
  const result = {};

  if (!(validSaleIds instanceof Set)) {
    return result;
  }

  const validReturnIds = new Set(
    returnRows
      .filter(
        (row) =>
          row?.id &&
          validSaleIds.has(row.sale_id)
      )
      .map((row) => row.id)
  );

  for (const item of returnItems) {
    if (!item?.product_id) continue;

    if (
      !validReturnIds.has(item.return_id)
    ) {
      continue;
    }

    result[item.product_id] =
      toNumber(result[item.product_id]) +
      toNumber(item.total_price);
  }

  return result;
};
