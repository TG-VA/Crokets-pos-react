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

const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  code: branch?.code || "",
  name: branch?.name || "",
  city: branch?.city || "",
  state: branch?.state || "",
  phone: branch?.phone || "",
  email: branch?.email || "",
  address: branch?.address || "",
  timezone: branch?.timezone || DEFAULT_TIMEZONE,
});

export const sanitizeBranchFormValues = (form = {}) => ({
  code: sanitizeBranchCodeInput(form.code || ""),
  name: (form.name || "").trim(),
  city: (form.city || "").trim(),
  state: (form.state || "").trim(),
  phone: (form.phone || "").replace(/\D/g, "").slice(0, 10),
  email: (form.email || "").trim().toLowerCase(),
  address: (form.address || "").trim().slice(0, 255),
  timezone: form.timezone || DEFAULT_TIMEZONE,
});

export const validateBranchFormValues = (
  form = {},
  { isEdit = false } = {}
) => {
  const errors = {};

  const code = (form.code || "").trim();
  if (!isEdit) {
    if (!code) {
      errors.code = "El código de la sucursal es obligatorio.";
    } else if (!/^[A-Z0-9_-]{1,20}$/.test(code)) {
      errors.code =
        "El código solo admite letras, números, guiones y guiones bajos.";
    }
  }

  const name = (form.name || "").trim();
  if (name.length < 3 || name.length > 100) {
    errors.name = "El nombre debe tener entre 3 y 100 caracteres.";
  }

  const city = (form.city || "").trim();
  if (city.length < 2 || city.length > 50) {
    errors.city = "La ciudad debe tener entre 2 y 50 caracteres.";
  }

  const state = (form.state || "").trim();
  if (state.length < 2 || state.length > 50) {
    errors.state = "El estado debe tener entre 2 y 50 caracteres.";
  }

  if (!form.timezone) {
    errors.timezone = "Selecciona una zona horaria.";
  }

  const phone = (form.phone || "").trim();
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.phone = "El teléfono debe contener exactamente 10 dígitos.";
  }

  const email = (form.email || "").trim();
  if (email && !EMAIL_REGEX.test(email)) {
    errors.email = "El correo no tiene un formato válido.";
  }

  const address = (form.address || "").trim();
  if (address.length > 255) {
    errors.address = "La dirección no puede exceder 255 caracteres.";
  }

  return errors;
};

export const getBranchStatusLabel = (isActive) =>
  isActive ? "Activa" : "Inactiva";
