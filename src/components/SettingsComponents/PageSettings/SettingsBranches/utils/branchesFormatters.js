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
];

const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  code: (form.code || "").trim().toUpperCase(),
  name: (form.name || "").trim(),
  city: (form.city || "").trim(),
  state: (form.state || "").trim(),
  phone: (form.phone || "").replace(/\D/g, "").slice(0, 10),
  email: (form.email || "").trim().toLowerCase(),
  address: (form.address || "").trim(),
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
    } else if (code.length > 20) {
      errors.code = "El código no puede exceder 20 caracteres.";
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

  return errors;
};

export const getBranchStatusLabel = (isActive) =>
  isActive ? "Activa" : "Inactiva";
