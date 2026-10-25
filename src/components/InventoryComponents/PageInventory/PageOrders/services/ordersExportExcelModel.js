import { formatOrderDateTime } from "../utils/ordersFormatters";
import {
  getOrderTotals,
  getOrderDifferences,
} from "../utils/ordersCalculationService";

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const INVALID_FILENAME_CHARS_REGEX = /[\\/:*?"<>|]/g;

const normalizeOrderFilenameSegment = (value, fallback = "SIN-DATO") => {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const normalized = raw
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(INVALID_FILENAME_CHARS_REGEX, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  if (!normalized) return fallback;
  return normalized.slice(0, 40);
};

const formatDateForFilename = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const buildOrderExportFilename = (order) => {
  const dateSegment =
    formatDateForFilename(
      order?.sentAt || order?.createdAt || order?.acceptedAt
    ) || formatDateForFilename(new Date());

  const nameSegment = normalizeOrderFilenameSegment(
    order?.orderName || "",
    "SIN-NOMBRE"
  );
  const folioSegment = normalizeOrderFilenameSegment(
    order?.orderNumber || "",
    "SIN-FOLIO"
  );
  const datePart = dateSegment || "SIN-FECHA";

  return `Pedido_${nameSegment}_${folioSegment}_${datePart}.xlsx`;
};

const STATUS_STYLES = {
  pending: {
    label: "Pendiente",
    fill: "FFFFF4D6",
    fontColor: "FF8A5A00",
    borderColor: "FFF0D98C",
  },
  accepted: {
    label: "Aceptado",
    fill: "FFE3F6EA",
    fontColor: "FF1E6B3A",
    borderColor: "FFB7E3C2",
  },
  accepted_with_difference: {
    label: "Aceptado con diferencia",
    fill: "FFFFF0E0",
    fontColor: "FFA34D00",
    borderColor: "FFF3B77D",
  },
  cancelled: {
    label: "Cancelado",
    fill: "FFFDEAEA",
    fontColor: "FFA12626",
    borderColor: "FFF0B8B8",
  },
};

export const getOrderStatusStyle = (status) => {
  if (STATUS_STYLES[status]) {
    return STATUS_STYLES[status];
  }
  return {
    label: status ? String(status) : "Sin estatus",
    fill: "FFEEF3F6",
    fontColor: "FF25313C",
    borderColor: "FFCBD5DC",
  };
};

const toFiniteNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const buildOrderSummaryData = (order) => {
  const totals = getOrderTotals(order?.items || []);
  const statusStyle = getOrderStatusStyle(order?.status);
  const departments = Array.isArray(order?.departments)
    ? order.departments.filter(Boolean)
    : [];

  const sentAt = formatOrderDateTime(order?.sentAt);
  const acceptedAt = order?.acceptedAt
    ? formatOrderDateTime(order?.acceptedAt)
    : "Pendiente";

  const productCount = Array.isArray(order?.items) ? order.items.length : 0;
  const differenceNet = Number(toFiniteNumber(totals.difference, 0).toFixed(4));
  const differenceNetLabel =
    differenceNet > 0 ? `+${differenceNet}` : `${differenceNet}`;

  return {
    folio: order?.orderNumber || "",
    name: order?.orderName || "",
    fromBranch: order?.fromBranchName || "",
    toBranch: order?.toBranchName || "",
    sentAt,
    acceptedAt,
    createdBy: order?.createdByLabel || "",
    receivedBy: order?.receivedByLabel || "",
    departments: departments.length
      ? departments.join(", ")
      : "Sin departamento",
    productCount,
    expected: toFiniteNumber(totals.expected, 0),
    received: toFiniteNumber(totals.received, 0),
    differenceNet,
    differenceNetLabel,
    totalCost: toFiniteNumber(totals.totalCost, 0),
    statusLabel: statusStyle.label,
    statusStyle,
    notes: order?.notes || "",
    discrepancyNotes: order?.discrepancyNotes || "",
  };
};

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const buildOrderItemRows = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.map((item) => {
    const expectedQty = toFiniteNumberOrNull(item?.expectedQty) ?? 0;
    const receivedQty = toFiniteNumberOrNull(item?.receivedQty);
    const differenceQty = toFiniteNumberOrNull(item?.differenceQty);
    const costPrice = toFiniteNumberOrNull(item?.costPrice) ?? 0;
    const importe = costPrice * expectedQty;

    return {
      barcode: item?.barcode || "",
      productName: item?.productName || "",
      departmentName: item?.departmentName || "Sin departamento",
      expectedQty,
      receivedQty,
      differenceQty,
      costPrice,
      importe,
    };
  });
};

export const buildOrderDifferences = (order) =>
  getOrderDifferences(order?.items).map((item) => ({
    barcode: item?.barcode || "",
    productName: item?.productName || "",
    departmentName: item?.departmentName || "Sin departamento",
    differenceQty: item.differenceQty,
  }));

export const buildOrderTotals = (order) => {
  const totals = getOrderTotals(order?.items || []);
  return {
    expected: toFiniteNumber(totals.expected, 0),
    received: toFiniteNumber(totals.received, 0),
    difference: toFiniteNumber(totals.difference, 0),
    pending: toFiniteNumber(totals.pending, 0),
    totalCost: toFiniteNumber(totals.totalCost, 0),
  };
};

export const buildOrderExportModel = (order) => {
  if (!order) return null;
  return {
    fileName: buildOrderExportFilename(order),
    summary: buildOrderSummaryData(order),
    items: buildOrderItemRows(order),
    totals: buildOrderTotals(order),
    differences: buildOrderDifferences(order),
  };
};

export { normalizeOrderFilenameSegment, formatDateForFilename };
