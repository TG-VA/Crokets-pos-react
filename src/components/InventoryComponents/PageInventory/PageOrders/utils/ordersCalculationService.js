import {
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
  const fromBranchId = normalizeHistoryFilterValue(filters.fromBranchId);
  const toBranchId = normalizeHistoryFilterValue(filters.toBranchId);
  const dateFrom = getDayBoundary(filters.dateFrom);
  const dateTo = getDayBoundary(filters.dateTo, true);

  return orders.filter((order) => {
    if (status && order.status !== status) return false;
    if (fromBranchId && order.fromBranchId !== fromBranchId) return false;
    if (toBranchId && order.toBranchId !== toBranchId) return false;

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
