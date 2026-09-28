/**
 * pointsAdjustmentCalculationService.js
 * Reglas puras del ajuste manual de puntos: motivos admitidos, normalizacion del
 * motivo, saldo con signo, habilitacion del formulario y construccion del
 * movimiento. Sin I/O, sin React y sin Supabase.
 */

import { normalizeText } from "../../utils/customerFormatters";

export const ADMIN_AUTH_STORAGE_KEY =
  "customers_points_adjustment_admin_authorized";

export const ADJUSTMENT_REASON_OPTIONS = [
  {
    value: "migration",
    label: "MIGRACIÓN DE PUNTOS DESDE SISTEMA ANTERIOR",
  },
  {
    value: "administrative_correction",
    label: "CORRECCIÓN ADMINISTRATIVA",
  },
  {
    value: "authorized_compensation",
    label: "COMPENSACIÓN AUTORIZADA",
  },
  {
    value: "operational_error",
    label: "CORRECCIÓN POR ERROR OPERATIVO",
  },
  {
    value: "customer_clarification",
    label: "ACLARACIÓN DE PUNTOS DEL CLIENTE",
  },
  {
    value: "other",
    label: "OTRO",
  },
];

/**
 * Motivos sin valor de auditoria. Se rechazan porque el detalle acaba en el
 * historial de puntos y "PRUEBA" o "OK" no explican nada.
 */
export const BLOCKED_GENERIC_NOTES = [
  "PRUEBA",
  "TEST",
  "OK",
  "AJUSTE",
  "PUNTOS",
  "MANUAL",
  "OTRO",
  "N/A",
  "NA",
  ".",
  "-",
];

export const MINIMUM_NOTES_LENGTH = 5;

/**
 * Opcion de motivo seleccionada, si existe.
 */
export const findAdjustmentReason = (adjustmentReason) => {
  return ADJUSTMENT_REASON_OPTIONS.find(
    (reason) => reason.value === adjustmentReason
  );
};

/**
 * Motivo final que se guardara: el texto libre cuando el motivo es "OTRO" y la
 * etiqueta de la opcion en cualquier otro caso.
 */
export const buildFinalNotes = ({ adjustmentReason, notes }) => {
  if (!adjustmentReason) return "";

  if (adjustmentReason === "other") {
    return String(notes || "").trim();
  }

  return findAdjustmentReason(adjustmentReason)?.label || "";
};

/**
 * Motivo listo para persistir y comparar: sin espacios redundantes y en
 * mayusculas, que es como se muestra en el historial.
 */
export const normalizeNotes = (notes) => {
  return String(notes || "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
};

/**
 * `true` si el motivo es demasiado generico. Solo aplica al motivo libre: las
 * etiquetas del catalogo son especificas por construccion.
 */
export const isGenericNote = ({ adjustmentReason, normalizedNotes }) => {
  if (adjustmentReason !== "other") return false;

  return BLOCKED_GENERIC_NOTES.includes(normalizedNotes);
};

/**
 * Puntos con signo segun el tipo de ajuste. Cero si no hay cantidad.
 */
export const calculateSignedPoints = ({ numericPoints, adjustmentType }) => {
  if (!numericPoints) return 0;

  return adjustmentType === "add" ? numericPoints : numericPoints * -1;
};

/**
 * Saldo resultante tras aplicar el ajuste.
 */
export const calculateNewBalance = ({ currentPoints, signedPoints }) => {
  return Number(currentPoints || 0) + signedPoints;
};

/**
 * Reglas de habilitacion del boton de guardado.
 *
 * Un descuento nunca puede dejar el saldo en negativo.
 */
export const canSubmitPointsAdjustment = ({
  adminAccessStatus,
  selectedCustomer,
  numericPoints,
  adjustmentReason,
  normalizedNotes,
  isGenericNote: genericNote,
  saving,
  newBalance,
  adjustmentType,
}) => {
  return (
    adminAccessStatus === "allowed" &&
    !!selectedCustomer?.id &&
    selectedCustomer.status !== false &&
    numericPoints > 0 &&
    !!adjustmentReason &&
    normalizedNotes.length >= MINIMUM_NOTES_LENGTH &&
    !genericNote &&
    !saving &&
    !(adjustmentType === "subtract" && newBalance < 0)
  );
};

/**
 * Validacion de contexto para la confirmacion del ajuste.
 *
 * El formulario y la confirmacion repiten las tres primeras reglas, pero con
 * textos distintos: al revisar se habla de "continuar" y al guardar de "guardar".
 */
export const ADJUSTMENT_VALIDATION_CONTEXTS = {
  review: {
    missingCustomerMessage: "Selecciona un cliente antes de continuar.",
    inactiveCustomerMessage:
      "No se pueden realizar ajustes de puntos a clientes inactivos. Activa el cliente antes de continuar.",
  },
  confirm: {
    missingCustomerMessage: "Selecciona un cliente antes de guardar el ajuste.",
    inactiveCustomerMessage:
      "No se pueden guardar ajustes de puntos para clientes inactivos.",
  },
};

const RESTRICTED_ACCESS_MESSAGE = {
  title: "Acceso restringido",
  message: "Solo un administrador puede realizar ajustes manuales.",
};

/**
 * Primeras tres reglas, compartidas por el formulario y la confirmacion.
 */
const getAccessValidationMessage = ({
  adminAccessStatus,
  selectedCustomer,
  context = "review",
}) => {
  const messages =
    ADJUSTMENT_VALIDATION_CONTEXTS[context] ||
    ADJUSTMENT_VALIDATION_CONTEXTS.review;

  if (adminAccessStatus !== "allowed") {
    return RESTRICTED_ACCESS_MESSAGE;
  }

  if (!selectedCustomer?.id) {
    return {
      title: "Selecciona un cliente",
      message: messages.missingCustomerMessage,
    };
  }

  if (selectedCustomer.status === false) {
    return {
      title: "Cliente inactivo",
      message: messages.inactiveCustomerMessage,
    };
  }

  return null;
};

/**
 * Validacion de acceso para el momento de confirmar y guardar. Cubre las reglas
 * que deben seguir cumpliendose despues de que el usuario reviso el modal.
 */
export const getSaveGuardMessage = ({
  adminAccessStatus,
  selectedCustomer,
  context = "confirm",
}) => {
  return getAccessValidationMessage({
    adminAccessStatus,
    selectedCustomer,
    context,
  });
};

/**
 * Mensaje de validacion previo a abrir la confirmacion, o `null` si el ajuste
 * es valido. Devuelve el primer bloqueo encontrado en el mismo orden que
 * valida la pantalla.
 */
export const getAdjustmentValidationMessage = ({
  adminAccessStatus,
  selectedCustomer,
  numericPoints,
  adjustmentType,
  newBalance,
  adjustmentReason,
  normalizedNotes,
  isGenericNote: genericNote,
}) => {
  const accessMessage = getAccessValidationMessage({
    adminAccessStatus,
    selectedCustomer,
    context: "review",
  });

  if (accessMessage) {
    return accessMessage;
  }

  if (numericPoints <= 0) {
    return {
      title: "Puntos inválidos",
      message: "Ingresa una cantidad de puntos mayor a 0.",
    };
  }

  if (adjustmentType === "subtract" && newBalance < 0) {
    return {
      title: "Saldo insuficiente",
      message: "No puedes descontar más puntos de los que tiene el cliente.",
    };
  }

  if (!adjustmentReason) {
    return {
      title: "Motivo requerido",
      message: "Selecciona el motivo del ajuste.",
    };
  }

  if (normalizedNotes.length < MINIMUM_NOTES_LENGTH) {
    return {
      title: "Motivo incompleto",
      message: "Ingresa un motivo del ajuste de al menos 5 caracteres.",
    };
  }

  if (genericNote) {
    return {
      title: "Motivo demasiado genérico",
      message:
        "El motivo es demasiado genérico. Escribe un motivo más específico para auditoría.",
    };
  }

  return null;
};

/**
 * Valida el acceso administrativo a partir del perfil con rol.
 */
export const isAdminProfile = (profile) => {
  const roleName = String(getProfileRoleName(profile) || "").toLowerCase();

  return profile?.status !== false && roleName === "admin";
};

/**
 * Nombre del rol, que llega como objeto o como arreglo de objetos segun como
 * lo resuelva la relacion de PostgREST.
 */
export const getProfileRoleName = (profile) => {
  if (Array.isArray(profile?.roles)) {
    return profile.roles[0]?.name || "";
  }

  return profile?.roles?.name || "";
};

/**
 * Construye la fila de `customer_points` para el ajuste.
 *
 * El CHECK de la tabla solo admite `earn` y `redeem`, y guarda el descuento con
 * `points` negativo.
 */
export const buildPointsMovementPayload = ({
  customerId,
  signedPoints,
  adjustmentType,
  userId,
  branchId,
  notes,
}) => {
  return {
    id: crypto.randomUUID(),
    customer_id: customerId,
    points: signedPoints,
    movement_type: adjustmentType === "add" ? "earn" : "redeem",
    source: "manual",
    related_sale_id: null,
    reward_id: null,
    user_id: userId || null,
    branch_id: branchId || null,
    notes,
    created_at: new Date().toISOString(),
  };
};

/**
 * Texto de exito del ajuste, para el modal de confirmacion.
 */
export const buildAdjustmentSuccessMessage = ({
  customerName,
  signedPoints,
}) => {
  const absolutePoints = Math.abs(signedPoints);

  return `Ajuste realizado correctamente. ${
    customerName || "EL CLIENTE"
  } ${signedPoints > 0 ? "recibió" : "usó"} ${absolutePoints} punto${
    absolutePoints !== 1 ? "s" : ""
  }.`;
};

/**
 * El input de puntos solo admite digitos y un maximo de 6 caracteres.
 */
export const sanitizePointsAmountInput = (value) => {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 6);
};

/**
 * Motivo ya normalizado para mostrar en la vista previa.
 */
export const getPreviewNotes = ({ finalNotes }) => normalizeText(finalNotes);
