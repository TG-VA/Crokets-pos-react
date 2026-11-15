import {
  isBranchFieldVisible,
  isValidBranchType,
} from "./branchTypeFormConfig";

const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_REGEX = /^[A-Z0-9_-]{1,20}$/;

const trimmed = (value) => (value || "").trim();

const validateCode = (form, { isEdit }) => {
  if (isEdit) return undefined;
  const code = trimmed(form.code);
  if (!code) return "El código de la sucursal es obligatorio.";
  if (!CODE_REGEX.test(code)) {
    return "El código solo admite letras, números, guiones y guiones bajos.";
  }
  return undefined;
};

const validateLength = (value, min, max, message) => {
  const length = trimmed(value).length;
  return length < min || length > max ? message : undefined;
};

// Reglas por campo. Cada una devuelve el mensaje de error o undefined.
const FIELD_RULES = {
  code: validateCode,
  name: (form) =>
    validateLength(
      form.name,
      3,
      100,
      "El nombre debe tener entre 3 y 100 caracteres."
    ),
  city: (form) =>
    validateLength(
      form.city,
      2,
      50,
      "La ciudad debe tener entre 2 y 50 caracteres."
    ),
  state: (form) =>
    validateLength(
      form.state,
      2,
      50,
      "El estado debe tener entre 2 y 50 caracteres."
    ),
  timezone: (form) =>
    form.timezone ? undefined : "Selecciona una zona horaria.",
  branchType: (form) =>
    isValidBranchType(form.branchType)
      ? undefined
      : "Selecciona un tipo de sucursal válido.",
  phone: (form) => {
    const phone = trimmed(form.phone);
    return phone && !PHONE_REGEX.test(phone)
      ? "El teléfono debe contener exactamente 10 dígitos."
      : undefined;
  },
  email: (form) => {
    const email = trimmed(form.email);
    return email && !EMAIL_REGEX.test(email)
      ? "El correo no tiene un formato válido."
      : undefined;
  },
  address: (form) =>
    trimmed(form.address).length > 255
      ? "La dirección no puede exceder 255 caracteres."
      : undefined,
};

export const validateBranchFormValues = (form = {}, { isEdit = false } = {}) =>
  Object.entries(FIELD_RULES).reduce((errors, [field, rule]) => {
    if (!isBranchFieldVisible(form.branchType, field)) return errors;
    const message = rule(form, { isEdit });
    return message ? { ...errors, [field]: message } : errors;
  }, {});
