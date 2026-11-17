import {
  ORDER_ITEM_STATUS_META,
  parseOrderDate,
  normalizeText,
  normalizeStoreOrder,
} from "./ordersFormatters";

const asFiniteNumber = (value) => {
  if (value === null || value === undefined) return null;

  if (typeof value === "string" && value.trim() === "") return null;

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : null;
};

export const parseReceiptQuantity = (value) => {
  const numeric = asFiniteNumber(value);

  if (numeric === null || numeric < 0) return null;

  return numeric;
};

export const calculateDifference = (expectedQty, receivedQty) => {
  const expected = asFiniteNumber(expectedQty);
  const received = parseReceiptQuantity(receivedQty);

  if (expected === null || received === null) return null;

  return received - expected;
};

export const hasValidReceiptQuantity = (value) =>
  parseReceiptQuantity(value) !== null;

export const isReceiptComplete = (items = [], quantities = {}) => {
  if (!Array.isArray(items) || items.length === 0) return false;

  return items.every((item) =>
    hasValidReceiptQuantity(quantities?.[item.productId])
  );
};

export const getMissingReceiptItems = (items = [], quantities = {}) =>
  items.filter(
    (item) => !hasValidReceiptQuantity(quantities?.[item.productId])
  );

export const getNonIntegerReceiptItems = (items = [], quantities = {}) =>
  items.filter((item) => {
    const received = parseReceiptQuantity(quantities?.[item.productId]);

    return received !== null && !Number.isInteger(received);
  });

export const getReceivedQuantitiesPayload = (items = [], quantities = {}) => {
  const payload = {};

  items.forEach((item) => {
    const received = parseReceiptQuantity(quantities?.[item.productId]);

    if (received !== null) {
      payload[item.productId] = received;
    }
  });

  return payload;
};

export const parseReceiptCost = (value) => {
  const numeric = asFiniteNumber(value);

  if (numeric === null || numeric < 0) return null;

  return Math.round(numeric * 100) / 100;
};

/**
 * Costo inicial de cada partida al abrir la recepcion: el costo del producto
 * congelado al crear el pedido. El usuario lo corrige si la mercancia llego a
 * otro costo; ese valor es el que pondera el CPP de la sucursal destino.
 * Un costo de 0 se precarga vacio: el snapshot guarda 0 cuando el producto no
 * tenia costo, y precargarlo dejaria pasar la validacion de costo obligatorio.
 */
export const getInitialReceiptCosts = (items = []) => {
  const costs = {};

  items.forEach((item) => {
    const cost = parseReceiptCost(item?.costPrice);

    costs[item.productId] = cost > 0 ? cost.toFixed(2) : "";
  });

  return costs;
};

export const buildMissingReceiptCostError = (count) =>
  `Captura el costo de los productos recibidos (${count} pendiente(s)).`;

const isCostRequired = (item, quantities) =>
  (parseReceiptQuantity(quantities?.[item.productId]) ?? 0) > 0;

/** Partidas con cantidad recibida mayor a 0 y sin costo valido. */
export const getMissingReceiptCostItems = (
  items = [],
  quantities = {},
  costs = {}
) =>
  items.filter(
    (item) =>
      isCostRequired(item, quantities) &&
      parseReceiptCost(costs?.[item.productId]) === null
  );

/** Costos de las partidas que suman stock; una partida en 0 no pondera. */
export const getReceivedCostsPayload = (
  items = [],
  quantities = {},
  costs = {}
) => {
  const payload = {};

  items.forEach((item) => {
    const cost = parseReceiptCost(costs?.[item.productId]);

    if (isCostRequired(item, quantities) && cost !== null) {
      payload[item.productId] = cost;
    }
  });

  return payload;
};

const formatSignedFraction = (value) => {
  const absolute = Math.abs(value);
  const fraction = Number(absolute.toFixed(4)).toString();
  const sign = value < 0 ? "-" : "+";

  return `${sign}${fraction}`;
};

const formatAbsoluteFraction = (value) =>
  Number(Math.abs(value).toFixed(4)).toString();

export const buildDiscrepancyNotes = (items = [], quantities = {}) => {
  const shortages = [];
  const overages = [];

  items.forEach((item) => {
    const difference = calculateDifference(
      item.expectedQty,
      quantities?.[item.productId]
    );

    if (difference === null || difference === 0) return;

    const label = formatAbsoluteFraction(difference);
    const signed = formatSignedFraction(difference);
    const entry = `${label}x ${item.productName} (${signed})`;

    if (difference < 0) {
      shortages.push(entry);
    } else {
      overages.push(entry);
    }
  });

  const sections = [];

  if (shortages.length > 0) {
    sections.push(`Faltantes: ${shortages.join("; ")}`);
  }

  if (overages.length > 0) {
    sections.push(`Sobrantes: ${overages.join("; ")}`);
  }

  return sections.join("; ");
};

export const getOrderTotals = (items = []) =>
  items.reduce(
    (totals, item) => {
      const expected = asFiniteNumber(item.expectedQty) ?? 0;
      const received = asFiniteNumber(item.receivedQty);
      const difference = asFiniteNumber(item.differenceQty);
      const cost = asFiniteNumber(item.costPrice);

      return {
        expected: totals.expected + expected,
        received: totals.received + (received ?? 0),
        difference: totals.difference + (difference ?? 0),
        pending: totals.pending + (received === null ? 1 : 0),
        totalCost: totals.totalCost + (cost ?? 0) * expected,
      };
    },
    { expected: 0, received: 0, difference: 0, pending: 0, totalCost: 0 }
  );

export const getOrderDifferences = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const differenceQty = asFiniteNumber(item?.differenceQty);
      if (differenceQty === null || differenceQty === 0) return null;
      return {
        ...item,
        differenceQty,
      };
    })
    .filter(Boolean);
};

/**
 * Un pedido pendiente o cancelado aun no tiene recepcion registrada.
 */
export const isOrderReceived = (order) =>
  Boolean(order) && order.status !== "pending" && order.status !== "cancelled";

/**
 * Numero de productos con diferencia (faltante o sobrante). Retorna null
 * mientras el pedido no se ha recibido, para distinguirlo de "0 diferencias".
 */
export const getOrderDifferenceCount = (order) =>
  isOrderReceived(order) ? getOrderDifferences(order.items).length : null;

/**
 * Productos con faltante y con sobrante de un pedido recibido. Retorna null
 * mientras no hay recepcion (misma regla que `getOrderDifferenceCount`).
 */
export const getOrderDifferenceSummary = (order) => {
  if (!isOrderReceived(order)) {
    return null;
  }

  const differences = getOrderDifferences(order.items);

  return {
    shortages: differences.filter((item) => item.differenceQty < 0).length,
    overages: differences.filter((item) => item.differenceQty > 0).length,
  };
};

export const getPendingOrdersCount = ({
  orders = [],
  currentBranchId,
} = {}) => {
  if (!currentBranchId) return 0;

  return orders.filter(
    (order) =>
      order?.status === "pending" && order?.toBranchId === currentBranchId
  ).length;
};

export const getPendingOrders = ({ orders = [], currentBranchId } = {}) => {
  if (!currentBranchId) return [];

  return orders.filter(
    (order) =>
      order?.status === "pending" && order?.toBranchId === currentBranchId
  );
};

/**
 * Estado derivado de una partida. El pedido cancelado o pendiente manda sobre
 * la linea; en un pedido recibido se usa `differenceQty` y, si no viene
 * persistida, se calcula con las cantidades.
 */
export const getOrderItemStatus = (item, orderStatus = "pending") => {
  if (!item) return null;

  if (orderStatus === "cancelled") return "cancelled";
  if (orderStatus === "pending") return "pending";

  const difference =
    asFiniteNumber(item.differenceQty) ??
    calculateDifference(item.expectedQty, item.receivedQty);

  if (difference === null) return "pending";
  if (difference < 0) return "shortage";
  if (difference > 0) return "overage";

  return "accepted";
};

export const getOrderItemsByStatus = (order, status) => {
  if (!status || status === "all") return [];

  return (order?.items ?? []).filter(
    (item) => getOrderItemStatus(item, order?.status) === status
  );
};

/**
 * Partidas de un pedido que coinciden con el filtro, con la etiqueta visible
 * para que el historial muestre cual linea provoco la coincidencia.
 */
export const getOrderItemStatusMatch = (order, status) => {
  const items = getOrderItemsByStatus(order, status);

  if (items.length === 0) return null;

  return {
    status,
    label: ORDER_ITEM_STATUS_META[status]?.label ?? status,
    count: items.length,
    names: items.map((item) => item.productName).filter(Boolean),
  };
};

const normalizeHistoryFilterValue = (value) => {
  if (!value || value === "all") return "";
  return value;
};

const getDayBoundary = (dateValue, endOfDay = false) => {
  const parsedDate = parseOrderDate(dateValue);

  if (!parsedDate) return null;

  const boundary = new Date(parsedDate);

  if (endOfDay) {
    boundary.setHours(23, 59, 59, 999);
  } else {
    boundary.setHours(0, 0, 0, 0);
  }

  return boundary;
};

export const filterOrderHistory = (orders = [], filters = {}) => {
  const status = normalizeHistoryFilterValue(filters.status);
  const itemStatus = normalizeHistoryFilterValue(filters.itemStatus);
  const fromBranchId = normalizeHistoryFilterValue(filters.fromBranchId);
  const toBranchId = normalizeHistoryFilterValue(filters.toBranchId);
  const involvedBranchId = normalizeHistoryFilterValue(
    filters.involvedBranchId
  );
  const dateFrom = getDayBoundary(filters.dateFrom);
  const dateTo = getDayBoundary(filters.dateTo, true);

  return orders.filter((order) => {
    if (status && order.status !== status) return false;

    if (itemStatus && getOrderItemsByStatus(order, itemStatus).length === 0) {
      return false;
    }

    if (fromBranchId && order.fromBranchId !== fromBranchId) return false;
    if (toBranchId && order.toBranchId !== toBranchId) return false;

    if (
      involvedBranchId &&
      order.fromBranchId !== involvedBranchId &&
      order.toBranchId !== involvedBranchId
    ) {
      return false;
    }

    const sentAt = parseOrderDate(order.sentAt);

    if (dateFrom && (!sentAt || sentAt < dateFrom)) return false;
    if (dateTo && (!sentAt || sentAt > dateTo)) return false;

    return true;
  });
};

export const filterOrderProducts = (products = [], searchTerm = "") => {
  const term = normalizeText(searchTerm);

  const normalized = products
    .filter((product) => product?.status !== false)
    .map((product) => ({
      id: product.id,
      product_id: product.id,
      codigo: product.codigo ?? product.barcode ?? "",
      descripcion: product.descripcion ?? product.name ?? "",
      departamento: product.departamento ?? "Sin departamento",
      precio: Number(product.precio ?? product.sale_price ?? 0),
      existencia: Number(product.existencia ?? product.stock ?? 0),
    }));

  if (!term) return normalized.slice(0, 60);

  return normalized
    .filter((product) => {
      const haystack = normalizeText(
        `${product.codigo} ${product.descripcion} ${product.departamento}`
      );

      return haystack.includes(term);
    })
    .slice(0, 60);
};

export const sortOrdersByDate = (orders = []) =>
  [...orders].sort((a, b) => {
    const dateA = parseOrderDate(a.sentAt)?.getTime() ?? 0;
    const dateB = parseOrderDate(b.sentAt)?.getTime() ?? 0;

    return dateB - dateA;
  });

export const normalizeOrders = (orders = []) =>
  sortOrdersByDate(
    orders.map((order) => normalizeStoreOrder(order)).filter(Boolean)
  );
