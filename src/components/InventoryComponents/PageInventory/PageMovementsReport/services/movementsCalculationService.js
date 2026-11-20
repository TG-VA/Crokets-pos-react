import {
  buildRedemptionReason,
  formatMovementType,
  formatReason,
  formatTicket,
  formatTransferReason,
  getRowMovementTypeKey,
  getSalesObject,
} from "../utils/movementFormatters";

import {
  formatDateTime,
  getDateKeyFromValue,
} from "../utils/movementDateUtils";

export const getRowTypeInfo = (row) => {
  const rawTypeKey = getRowMovementTypeKey(row);

  const hasRedemption =
    row?.has_sale_redemption === true &&
    (rawTypeKey === "sale" || rawTypeKey === "redemption");

  const saleTotal = Number(getSalesObject(row)?.total);

  // Ticket con canje y ademas cobro: es venta/canje. Si el total es 0 o menor
  // el ticket fue solo canje. Cuando el total no se puede leer se conserva el
  // comportamiento previo (venta/canje) para no cambiar el marcado existente.
  const isRedemptionOnly =
    hasRedemption && Number.isFinite(saleTotal) && saleTotal <= 0;

  if (isRedemptionOnly) {
    return {
      typeKey: "redemption",
      typeLabel: formatMovementType("redemption"),
      typeFilterKeys: ["redemption"],
      rawTypeKey,
    };
  }

  if (hasRedemption) {
    return {
      typeKey: "sale_redemption",
      typeLabel: formatMovementType("sale_redemption"),
      typeFilterKeys: ["sale_redemption", "sale", "redemption"],
      rawTypeKey,
    };
  }

  return {
    typeKey: rawTypeKey,
    typeLabel: formatMovementType(rawTypeKey || row?.movement_type),
    typeFilterKeys: rawTypeKey ? [rawTypeKey] : [],
    rawTypeKey,
  };
};

export const buildSaleProductKey = (saleId, productId) => {
  const saleKey = String(saleId ?? "").trim();

  const productKey = String(productId ?? "").trim();

  if (!saleKey || !productKey) {
    return null;
  }

  return `${saleKey}::${productKey}`;
};

export const buildRowView = (row) => {
  const product = row?.products ?? {};

  const sale = getSalesObject(row);

  const user = row?.users ?? {};

  const ticketRaw =
    String(sale?.ticket_number ?? "").trim() ||
    String(sale?.folio ?? "").trim() ||
    String(sale?.ticket ?? "").trim() ||
    String(sale?.receipt_number ?? "").trim() ||
    String(row?.sale_id ?? "").trim() ||
    String(row?.saleId ?? "").trim() ||
    "";

  const ticket = formatTicket(ticketRaw);

  const movementTypeKey = getRowMovementTypeKey(row);

  const useSystemTime = !sale?.sale_date;
  const assumeUtcNaive = ["transfer", "canceled", "return"].includes(
    movementTypeKey
  );

  const soldAtValue =
    movementTypeKey === "sale" || movementTypeKey === "redemption"
      ? (sale?.sale_date ??
        row?.report_sort_at ??
        row?.created_at ??
        sale?.created_at ??
        null)
      : (row?.report_sort_at ??
        row?.created_at ??
        sale?.sale_date ??
        sale?.created_at ??
        null);

  const soldAt = formatDateTime(soldAtValue, {
    useSystemTime,
    assumeUtcNaive,
  });

  const soldAtDateKey = getDateKeyFromValue(soldAtValue, {
    useSystemTime,
    assumeUtcNaive,
  });

  const productName = (
    String(row?.display_product_name ?? "").trim() ||
    String(product?.name ?? "").trim() ||
    String(row?.product_id ?? "").trim() ||
    "—"
  ).toUpperCase();

  const username = (
    String(user?.username ?? "").trim() ||
    String(row?.user_id ?? "").trim() ||
    "—"
  ).toUpperCase();

  const { rawTypeKey, typeKey, typeLabel, typeFilterKeys } =
    getRowTypeInfo(row);

  const reason = formatTransferReason(row?.reason) ?? formatReason(row?.reason);

  const shouldForceZeroQuantity =
    typeKey === "product_update" || typeKey === "product_delete";

  const quantity = shouldForceZeroQuantity ? 0 : (row?.quantity ?? 0);

  return {
    soldAtValue,
    soldAt,
    soldAtDateKey,

    productName,

    ticketRaw,
    ticket,

    rawTypeKey,
    typeKey,
    typeLabel,
    typeFilterKeys,

    qty: quantity,
    prev: row?.previous_stock ?? null,
    next: row?.new_stock ?? null,

    reason,
    username,
  };
};

export const isNoStockMovement = (rowView) => {
  return String(rowView?.reason ?? "").includes("(SIN STOCK)");
};

const getRewardLabel = (reward) => {
  return String(
    reward?.name ??
      reward?.title ??
      reward?.reward_name ??
      reward?.description ??
      ""
  ).trim();
};

const getRedemptionPoints = (redemption) => {
  return (
    redemption?.points_used ??
    redemption?.redeemed_points ??
    redemption?.points_redeemed ??
    redemption?.points ??
    null
  );
};

const getRedemptionQuantity = (redemption) => {
  const rawQuantity = Number(
    redemption?.quantity ??
      redemption?.qty ??
      redemption?.pieces ??
      redemption?.pieces_delivered ??
      1
  );

  if (Number.isFinite(rawQuantity) && rawQuantity !== 0) {
    return -Math.abs(rawQuantity);
  }

  return -1;
};

const createRewardRowsBySaleProduct = (rewardRows) => {
  const rewardRowsMap = new Map();

  rewardRows.forEach((row) => {
    const key = buildSaleProductKey(row?.sale_id, row?.product_id);

    if (!key || rewardRowsMap.has(key)) {
      return;
    }

    rewardRowsMap.set(key, row);
  });

  return rewardRowsMap;
};

const createRedemptionSaleIds = (rewardRows) => {
  return new Set(rewardRows.map((row) => row?.sale_id).filter(Boolean));
};

export const hydrateBaseMovements = ({
  baseRows,
  rewardRows,
  productsById,
  usersById,
  salesById,
  rewardsById,
}) => {
  const redemptionSaleIds = createRedemptionSaleIds(rewardRows);

  const rewardRowsBySaleProduct = createRewardRowsBySaleProduct(rewardRows);

  return baseRows.map((row) => {
    const sale = salesById.get(row?.sale_id) ?? null;

    const saleProductKey = buildSaleProductKey(row?.sale_id, row?.product_id);

    const rewardRow = rewardRowsBySaleProduct.get(saleProductKey) ?? null;

    const reward = rewardRow
      ? (rewardsById.get(rewardRow?.reward_id) ?? null)
      : null;

    const rewardLabel = getRewardLabel(reward);

    const pointsValue = rewardRow ? getRedemptionPoints(rewardRow) : null;

    const isSaleMovement = getRowMovementTypeKey(row) === "sale";

    return {
      ...row,

      row_key: `movement-${row?.id ?? `${row?.product_id}-${row?.created_at}`}`,

      has_sale_redemption: redemptionSaleIds.has(row?.sale_id),

      report_sort_at:
        getRowMovementTypeKey(row) === "sale"
          ? (sale?.sale_date ?? row?.created_at ?? sale?.created_at ?? null)
          : (row?.created_at ?? sale?.sale_date ?? sale?.created_at ?? null),

      reason:
        rewardRow && isSaleMovement
          ? buildRedemptionReason(rewardLabel, pointsValue)
          : row?.reason,

      products: productsById.get(row?.product_id) ?? null,

      users: usersById.get(row?.user_id) ?? null,

      sales: sale,
    };
  });
};

/**
 * Deriva filas virtuales para productos sin stock. Los RPCs no persisten
 * movimientos cuando `tracks_inventory` es falso, por lo que estas filas se
 * construyen a partir de sale_details (venta), canceled_sales (cancelacion) y
 * sale_returns + sale_return_items (devolucion). Stock inicial y actual quedan
 * nulos para que la tabla muestre guiones; la salida conserva la cantidad.
 */
export const buildNoStockRows = ({
  saleDetails,
  canceledSales,
  saleReturns,
  returnItems,
  productsById,
  usersById,
  salesById,
  existingSaleProductKeys,
}) => {
  const normalizedDetails = Array.isArray(saleDetails) ? saleDetails : [];
  const normalizedCanceled = Array.isArray(canceledSales) ? canceledSales : [];
  const normalizedReturns = Array.isArray(saleReturns) ? saleReturns : [];
  const normalizedReturnItems = Array.isArray(returnItems) ? returnItems : [];

  const usedKeys =
    existingSaleProductKeys instanceof Set
      ? new Set(existingSaleProductKeys)
      : new Set();

  const canceledBySale = new Map(
    normalizedCanceled
      .filter((row) => row?.sale_id)
      .map((row) => [row.sale_id, row])
  );

  const returnById = new Map(
    normalizedReturns.filter((row) => row?.id).map((row) => [row.id, row])
  );

  const returnEventsBySaleProduct = new Map();

  normalizedReturnItems.forEach((item) => {
    const returnRow = returnById.get(item?.return_id);
    const saleId = returnRow?.sale_id;

    if (!saleId || !item?.product_id || !returnRow?.id) {
      return;
    }

    const key = buildSaleProductKey(saleId, item.product_id);
    const eventKey = `${returnRow.id}::${item.product_id}`;
    const currentEvents = returnEventsBySaleProduct.get(key) ?? new Map();
    const currentEvent = currentEvents.get(eventKey) ?? {
      returnRow,
      quantity: 0,
    };

    currentEvent.quantity += Math.abs(Number(item.quantity) || 0);
    currentEvents.set(eventKey, currentEvent);
    returnEventsBySaleProduct.set(key, currentEvents);
  });

  const derivedRows = [];

  normalizedDetails.forEach((detail) => {
    const product = productsById.get(detail?.product_id) ?? null;

    if (!product || product.tracks_inventory !== false) {
      return;
    }

    // El kit padre se omite: sus componentes ya reportan su propio movimiento
    // y el kit solo se desglosa por producto.
    if (product.is_kit === true) {
      return;
    }

    const key = buildSaleProductKey(detail?.sale_id, detail?.product_id);

    if (!key || usedKeys.has(key)) {
      return;
    }

    usedKeys.add(key);

    const sale = salesById.get(detail?.sale_id) ?? null;

    const quantity = Math.abs(Number(detail?.quantity) || 0);

    const soldAt =
      sale?.sale_date ?? detail?.created_at ?? sale?.created_at ?? null;

    derivedRows.push({
      row_key: `nostock-sale-${detail?.id ?? key}`,
      movement_type: "sale",
      quantity: -quantity,
      previous_stock: null,
      new_stock: null,
      reason: "Venta registrada",
      product_id: detail?.product_id,
      user_id: sale?.user_id ?? null,
      sale_id: detail?.sale_id ?? null,
      branch_id: detail?.branch_id ?? null,
      created_at: soldAt,
      report_sort_at: soldAt,
      products: product,
      users: usersById.get(sale?.user_id) ?? null,
      sales: sale,
    });

    const canceledRow = canceledBySale.get(detail?.sale_id);

    if (canceledRow) {
      const canceledAt =
        canceledRow?.canceled_at ?? canceledRow?.created_at ?? soldAt;

      derivedRows.push({
        row_key: `nostock-cancel-${canceledRow.id ?? key}`,
        movement_type: "canceled",
        quantity,
        previous_stock: null,
        new_stock: null,
        reason: canceledRow?.cancel_reason ?? "Cancelación de venta",
        product_id: detail?.product_id,
        user_id: canceledRow?.user_id ?? null,
        sale_id: detail?.sale_id ?? null,
        branch_id: canceledRow?.branch_id ?? detail?.branch_id ?? null,
        created_at: canceledAt,
        report_sort_at: canceledAt,
        products: product,
        users: usersById.get(canceledRow?.user_id) ?? null,
        sales: sale,
      });
    }

    const returnEvents = Array.from(
      (returnEventsBySaleProduct.get(key) ?? new Map()).values()
    );

    returnEvents.forEach(({ returnRow, quantity: returnedQuantity }) => {
      if (returnedQuantity <= 0) {
        return;
      }

      const returnedAt = returnRow?.created_at ?? soldAt;

      derivedRows.push({
        row_key: `nostock-return-${returnRow?.id ?? key}`,
        movement_type: "return",
        quantity: returnedQuantity,
        previous_stock: null,
        new_stock: null,
        reason: returnRow?.return_reason ?? "Devolución",
        product_id: detail?.product_id,
        user_id: returnRow?.user_id ?? null,
        sale_id: detail?.sale_id ?? null,
        branch_id: returnRow?.branch_id ?? detail?.branch_id ?? null,
        created_at: returnedAt,
        report_sort_at: returnedAt,
        products: product,
        users: usersById.get(returnRow?.user_id) ?? null,
        sales: sale,
      });
    });
  });

  return derivedRows;
};

export const hydrateMissingRedemptions = ({
  baseRows,
  rewardRows,
  productsById,
  usersById,
  salesById,
  rewardsById,
}) => {
  const baseSaleProductKeys = new Set(
    baseRows
      .filter((row) => getRowMovementTypeKey(row) === "sale")
      .map((row) => buildSaleProductKey(row?.sale_id, row?.product_id))
      .filter(Boolean)
  );

  const redemptionSaleIds = createRedemptionSaleIds(rewardRows);

  return rewardRows
    .filter((row) => {
      const key = buildSaleProductKey(row?.sale_id, row?.product_id);

      if (!key) {
        return true;
      }

      return !baseSaleProductKeys.has(key);
    })
    .map((row) => {
      const sale = salesById.get(row?.sale_id) ?? null;

      const product = productsById.get(row?.product_id) ?? null;

      const reward = rewardsById.get(row?.reward_id) ?? null;

      const rewardLabel = getRewardLabel(reward);

      const pointsValue = getRedemptionPoints(row);

      return {
        ...row,

        row_key: `redemption-${
          row?.id ?? `${row?.sale_id}-${row?.product_id}-${row?.created_at}`
        }`,

        has_sale_redemption: redemptionSaleIds.has(row?.sale_id),

        report_sort_at:
          sale?.sale_date ?? row?.created_at ?? sale?.created_at ?? null,

        movement_type: "redemption",

        quantity: getRedemptionQuantity(row),

        previous_stock: null,
        new_stock: null,

        reason: buildRedemptionReason(rewardLabel, pointsValue),

        products: product,

        display_product_name: product?.name ? null : rewardLabel || null,

        users: usersById.get(row?.user_id) ?? null,

        sales: sale,
      };
    });
};
