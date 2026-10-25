export const ORDER_STATUS_META = {
  pending: {
    label: "Pendiente",
    tone: "pending",
    description: "Pedido enviado, pendiente de recepcion.",
  },
  accepted: {
    label: "Aceptado",
    tone: "success",
    description: "Pedido recibido sin diferencias.",
  },
  accepted_with_difference: {
    label: "Aceptado con diferencia",
    tone: "warning",
    description: "Pedido recibido con faltantes o sobrantes.",
  },
  cancelled: {
    label: "Cancelado",
    tone: "danger",
    description: "Pedido cancelado.",
  },
};

const isNil = (value) => value === null || value === undefined;

export const normalizeText = (value) =>
  (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const parseOrderDate = (value) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatOrderDate = (value) => {
  const date = parseOrderDate(value);

  if (!date) return "Sin fecha";

  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatOrderDateTime = (value) => {
  const date = parseOrderDate(value);

  if (!date) return "Sin fecha";

  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatQuantity = (value, fallback = "—") => {
  if (isNil(value) || value === "") return fallback;

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return fallback;

  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 4,
  }).format(numeric);
};

export const formatCurrency = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(0);
  }

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(numeric);
};

export const getOrderStatusMeta = (status) =>
  ORDER_STATUS_META[status] || {
    label: status || "Sin estado",
    tone: "neutral",
    description: "",
  };

export const getOrderDifferenceLabel = (order) => {
  if (!order) return "";

  if (order.status === "pending") return "Pendiente de recepcion";

  const notes = order.discrepancyNotes ?? order.discrepancy_notes ?? "";

  if (notes) return notes;

  return order.status === "accepted_with_difference"
    ? "Con diferencia"
    : "Sin diferencia";
};

/**
 * Texto en mayusculas para nombres de pedido y responsables. Retorna cadena
 * vacia ante valores nulos o no textuales para no lanzar excepciones.
 */
export const toUpperLabel = (value) => {
  if (value === null || value === undefined) return "";

  return String(value).trim().toLocaleUpperCase("es-MX");
};

export const getOrderNumber = (order) =>
  order?.orderNumber ?? order?.order_number ?? "";

export const getOrderName = (order) =>
  toUpperLabel(order?.orderName ?? order?.order_name);

export const getOrderDepartments = (order) => {
  const summary = order?.departmentsSummary ?? order?.departments_summary;

  if (Array.isArray(summary) && summary.length > 0) {
    return summary.filter((department) => Boolean(department));
  }

  const items = order?.items ?? order?.store_order_items ?? [];

  return Array.from(
    new Set(
      items
        .map((item) => item?.departmentName ?? item?.department_name)
        .filter((department) => Boolean(department))
    )
  );
};

export const normalizeOrderItem = (item) => ({
  id: item?.id ?? "",
  orderId: item?.orderId ?? item?.order_id ?? "",
  productId: item?.productId ?? item?.product_id ?? "",
  barcode: item?.barcode ?? item?.codigo ?? "",
  productName: item?.productName ?? item?.product_name ?? item?.name ?? "",
  departmentId: item?.departmentId ?? item?.department_id ?? "",
  departmentName:
    item?.departmentName ?? item?.department_name ?? item?.departamento ?? "",
  expectedQty: Number(item?.expectedQty ?? item?.expected_qty ?? 0),
  receivedQty: isNil(item?.receivedQty ?? item?.received_qty)
    ? null
    : Number(item?.receivedQty ?? item?.received_qty),
  differenceQty: isNil(item?.differenceQty ?? item?.difference_qty)
    ? null
    : Number(item?.differenceQty ?? item?.difference_qty),
  costPrice: Number(item?.costPrice ?? item?.cost_price ?? 0),
});

export const normalizeStoreOrder = (order) => {
  if (!order) return null;

  const items = order.items ?? order.store_order_items ?? [];

  return {
    id: order.id ?? "",
    orderNumber: getOrderNumber(order),
    orderName: getOrderName(order),
    status: order.status ?? "pending",
    notes: order.notes ?? "",
    discrepancyNotes: order.discrepancyNotes ?? order.discrepancy_notes ?? "",
    fromBranchId: order.fromBranchId ?? order.from_branch_id ?? "",
    toBranchId: order.toBranchId ?? order.to_branch_id ?? "",
    fromBranchName:
      order.fromBranch?.name ??
      order.from_branch?.name ??
      order.fromBranchName ??
      "Sucursal origen",
    toBranchName:
      order.toBranch?.name ??
      order.to_branch?.name ??
      order.toBranchName ??
      "Sucursal destino",
    createdByUserId: order.createdByUserId ?? order.created_by_user_id ?? "",
    receivedByUserId: order.receivedByUserId ?? order.received_by_user_id ?? "",
    createdByLabel:
      order.createdBy?.username ??
      order.created_by?.username ??
      order.createdByLabel ??
      "",
    receivedByLabel:
      order.receivedBy?.username ??
      order.received_by?.username ??
      order.receivedByLabel ??
      "",
    departments: getOrderDepartments({ ...order, items }),
    sentAt: order.sentAt ?? order.sent_at ?? order.createdAt ?? "",
    acceptedAt: order.acceptedAt ?? order.accepted_at ?? "",
    createdAt: order.createdAt ?? order.created_at ?? "",
    updatedAt: order.updatedAt ?? order.updated_at ?? "",
    items: items.map(normalizeOrderItem),
  };
};
