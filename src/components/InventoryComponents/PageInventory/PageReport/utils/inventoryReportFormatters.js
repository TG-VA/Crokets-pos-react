import {
  QUANTITY_FILTER_PREFIX,
  STOCK_FILTER_OPTIONS,
} from "../services/inventoryReportCalculationService";

export const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
};

export const toUpperSafe = (value, fallback = "—") => {
  const normalized = String(value ?? "").trim();

  return (normalized || fallback).toUpperCase();
};

export const formatInventoryValue = (value) => {
  return value === null || value === undefined ? "—" : String(value);
};

export const formatDateForFilename = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "00-00-00";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}-${month}-${year}`;
};

export const normalizeFilenameSegment = (value, fallback = "SUCURSAL") => {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^\w\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return normalized || fallback;
};

export const getExistenceFilterLabel = (filterValue) => {
  if (String(filterValue).startsWith(QUANTITY_FILTER_PREFIX)) {
    return `Cantidad: ${String(filterValue).replace(
      QUANTITY_FILTER_PREFIX,
      ""
    )}`;
  }

  const statusOption = STOCK_FILTER_OPTIONS.find(
    (option) => option.value === filterValue
  );

  return statusOption?.label || filterValue;
};

export const getSelectedBranchLabel = ({
  branchOptions = [],
  selectedBranchId = "",
}) => {
  const selectedBranch = branchOptions.find(
    (item) => item.id === selectedBranchId
  );

  if (!selectedBranch) {
    return selectedBranchId || "—";
  }

  if (selectedBranch.code) {
    return `${selectedBranch.name} (${selectedBranch.code})`;
  }

  return selectedBranch.name;
};
