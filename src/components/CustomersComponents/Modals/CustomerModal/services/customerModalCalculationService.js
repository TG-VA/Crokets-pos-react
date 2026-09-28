/**
 * customerModalCalculationService.js
 * Calculos puros del modal de cliente: normalizacion de campos, validacion,
 * habilitacion del guardado y decision de persistencia. Sin I/O, sin React.
 */

export const EMPTY_CUSTOMER_FORM = {
  name: "",
  phone: "",
  phoneConfirm: "",
  email: "",
  status: true,
};

export const CUSTOMER_TOUCHED_FIELDS = {
  name: true,
  phone: true,
  phoneConfirm: true,
  email: true,
};

export const MINIMUM_NAME_LENGTH = 3;
export const PHONE_LENGTH = 10;

/**
 * Nombre sin espacios redundantes y en mayusculas, como se guarda.
 */
export const normalizeCustomerName = (value) => {
  return String(value || "")
    .replace(/\s+/g, " ")
    .toUpperCase();
};

/**
 * Solo digitos, recortado a 10.
 */
export const normalizeCustomerPhone = (value) => {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, PHONE_LENGTH);
};

/**
 * Correo recortado y en minusculas.
 */
export const normalizeCustomerEmail = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Errores por campo del formulario.
 *
 * El correo es opcional: solo se valida el formato cuando se informo algo.
 */
export const validateCustomerValues = (values) => {
  const errors = {};

  const cleanName = String(values.name || "").trim();
  const cleanPhone = String(values.phone || "").trim();
  const cleanPhoneConfirm = String(values.phoneConfirm || "").trim();
  const cleanEmail = String(values.email || "").trim();

  if (!cleanName) {
    errors.name = "Ingresa el nombre del cliente.";
  } else if (cleanName.length < MINIMUM_NAME_LENGTH) {
    errors.name = "El nombre debe tener al menos 3 caracteres.";
  }

  if (!cleanPhone) {
    errors.phone = "Ingresa el teléfono del cliente.";
  } else if (cleanPhone.length !== PHONE_LENGTH) {
    errors.phone = "El teléfono debe tener 10 dígitos.";
  }

  if (!cleanPhoneConfirm) {
    errors.phoneConfirm = "Confirma el teléfono del cliente.";
  } else if (cleanPhoneConfirm.length !== PHONE_LENGTH) {
    errors.phoneConfirm = "La confirmación debe tener 10 dígitos.";
  } else if (cleanPhone && cleanPhoneConfirm !== cleanPhone) {
    errors.phoneConfirm = "Los teléfonos no coinciden.";
  }

  if (cleanEmail && !EMAIL_PATTERN.test(cleanEmail)) {
    errors.email = "Ingresa un correo válido.";
  }

  return errors;
};

/**
 * Normaliza cada campo del formulario antes de validarlo y persistirlo.
 */
export const buildNormalizedCustomerData = (formData) => {
  return {
    name: normalizeCustomerName(formData?.name).trim(),
    phone: normalizeCustomerPhone(formData?.phone).trim(),
    phoneConfirm: normalizeCustomerPhone(formData?.phoneConfirm).trim(),
    email: normalizeCustomerEmail(formData?.email),
    status: formData?.status,
  };
};

/**
 * Normaliza el campo editado segun su tipo, antes de guardarlo en el estado.
 */
export const normalizeCustomerFieldValue = (field, value) => {
  if (field === "name") return normalizeCustomerName(value);
  if (field === "phone" || field === "phoneConfirm") {
    return normalizeCustomerPhone(value);
  }
  if (field === "email") return normalizeCustomerEmail(value);

  return value;
};

/**
 * Valores iniciales del formulario a partir del cliente a editar.
 */
export const buildCustomerFormValues = (customerToEdit) => {
  if (!customerToEdit) {
    return { ...EMPTY_CUSTOMER_FORM };
  }

  const currentPhone = normalizeCustomerPhone(customerToEdit.phone || "");

  return {
    name: customerToEdit.name || "",
    phone: currentPhone,
    phoneConfirm: currentPhone,
    email: customerToEdit.email || "",
    status: customerToEdit.status !== false,
  };
};

/**
 * Reglas de habilitacion del boton de guardado. Exige, ademas de no haber
 * errores, que el telefono y su confirmacion coincidan.
 */
export const canSubmitCustomerForm = ({ formData, errors, saving }) => {
  return (
    String(formData?.name || "").trim().length >= MINIMUM_NAME_LENGTH &&
    String(formData?.phone || "").trim().length === PHONE_LENGTH &&
    String(formData?.phoneConfirm || "").trim().length === PHONE_LENGTH &&
    formData.phone === formData.phoneConfirm &&
    Object.keys(errors || {}).length === 0 &&
    !saving
  );
};

/**
 * `true` cuando el cliente ya existe y se esta editando.
 */
export const isEditingCustomer = (customerToEdit) => !!customerToEdit?.id;

/**
 * `true` si el telefono enviado difiere del que ya tenia el cliente.
 */
export const hasPhoneChanged = ({ customerToEdit, isEditing, newPhone }) => {
  if (!isEditing) return false;

  const originalPhone = normalizeCustomerPhone(customerToEdit?.phone || "");

  return originalPhone !== newPhone;
};

/**
 * Aviso de telefono duplicado al editar.
 */
export const buildDuplicatePhoneMessage = (existingCustomer) => {
  return `Ya existe otro cliente registrado con ese teléfono: ${
    existingCustomer?.name || existingCustomer?.razon_social || "SIN NOMBRE"
  }.`;
};

/**
 * Aviso de cliente de puntos duplicado al dar de alta.
 */
export const buildDuplicatePointsCustomerMessage = (existingCustomer) => {
  return `Ya existe un cliente de puntos registrado con ese teléfono: ${
    existingCustomer?.name || "SIN NOMBRE"
  }.`;
};

/**
 * Confirmacion del cambio de telefono.
 *
 * El telefono es la llave que enlaza el cliente de puntos con sus datos
 * fiscales, por lo que avisamos cuando tambien tiene informacion fiscal.
 */
export const buildPhoneChangeConfirmation = ({
  originalPhone,
  newPhone,
  hasFiscalData,
}) => {
  const fiscalWarning = hasFiscalData
    ? " Este cliente también tiene datos fiscales, por lo que el teléfono fiscal asociado también se actualizará."
    : "";

  return {
    type: "warning",
    title: "Confirmar cambio de teléfono",
    message: `El teléfono cambiará de ${
      originalPhone || "SIN TELÉFONO"
    } a ${newPhone}. Este dato se usa para vincular clientes de puntos con datos fiscales.${fiscalWarning} ¿Deseas continuar?`,
    confirmText: "Continuar",
    cancelText: "Cancelar",
  };
};

/**
 * Titulo del modal segun el modo.
 */
export const getCustomerModalTitle = (isEditing) =>
  isEditing ? "Editar cliente" : "Nuevo cliente";

/**
 * Mensaje de exito segun el modo.
 */
export const getCustomerSaveSuccessMessage = (isEditing) =>
  isEditing
    ? "Los datos del cliente fueron actualizados correctamente."
    : "El cliente fue registrado correctamente.";

/**
 * Titulo del mensaje de exito segun el modo.
 */
export const getCustomerSaveSuccessTitle = (isEditing) =>
  isEditing ? "Cliente actualizado" : "Cliente creado";
