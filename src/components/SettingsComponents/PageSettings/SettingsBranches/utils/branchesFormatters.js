import { BRANCH_TYPES } from "../../../../../services/branchScopeCalculationService";
import { isBranchFieldVisible } from "./branchTypeFormConfig";

export const DEFAULT_TIMEZONE = "America/Cancun";

export const BRANCH_TIMEZONE_OPTIONS = [
  {
    value: "America/Cancun",
    label: "America/Cancun (Quintana Roo / Sureste - UTC-5)",
  },
  {
    value: "America/Mexico_City",
    label: "America/Mexico_City (Zona Centro / CDMX - UTC-6)",
  },
  {
    value: "America/Tijuana",
    label: "America/Tijuana (Zona Noroeste - Baja California)",
  },
  {
    value: "America/Hermosillo",
    label: "America/Hermosillo (Zona Pacífico - Sonora)",
  },
  {
    value: "America/Monterrey",
    label: "America/Monterrey (Zona Centro-Norte - Nuevo León)",
  },
];

const CODE_ALLOWED_REGEX = /[^A-Z0-9_-]/g;
const SEARCH_SANITIZE_REGEX = /[^\p{L}\p{N}\s_-]/gu;

export const sanitizeBranchCodeInput = (value = "") =>
  String(value)
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(CODE_ALLOWED_REGEX, "")
    .slice(0, 20);

export const sanitizeSearchTerm = (value = "") =>
  String(value).replace(SEARCH_SANITIZE_REGEX, "").trim().slice(0, 50);

export const buildBranchFormValues = (branch = null) => ({
  branchType: branch?.branchType || BRANCH_TYPES.OPERATIONAL,
  code: branch?.code || "",
  name: branch?.name || "",
  city: branch?.city || "",
  state: branch?.state || "",
  phone: branch?.phone || "",
  email: branch?.email || "",
  address: branch?.address || "",
  timezone: branch?.timezone || DEFAULT_TIMEZONE,
});

const sanitizeContactField = (form, field, sanitize) =>
  isBranchFieldVisible(form.branchType, field)
    ? sanitize(form[field] || "")
    : "";

export const sanitizeBranchFormValues = (form = {}) => ({
  branchType: form.branchType || BRANCH_TYPES.OPERATIONAL,
  code: sanitizeBranchCodeInput(form.code || ""),
  name: (form.name || "").trim(),
  city: (form.city || "").trim(),
  state: (form.state || "").trim(),
  phone: sanitizeContactField(form, "phone", (value) =>
    value.replace(/\D/g, "").slice(0, 10)
  ),
  email: sanitizeContactField(form, "email", (value) =>
    value.trim().toLowerCase()
  ),
  address: sanitizeContactField(form, "address", (value) =>
    value.trim().slice(0, 255)
  ),
  timezone: form.timezone || DEFAULT_TIMEZONE,
});

export const getBranchStatusLabel = (isActive) =>
  isActive ? "Activa" : "Inactiva";
