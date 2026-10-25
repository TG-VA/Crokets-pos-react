const STATUS_CLASS_KEYS = {
  pending: "statusPending",
  success: "statusSuccess",
  warning: "statusWarning",
  danger: "statusDanger",
  neutral: "statusPending",
};

/**
 * Resuelve la clase del badge de estatus desde el tono de
 * `getOrderStatusMeta`, sin repetir el mapa en cada componente.
 */
export const getStatusToneClass = (styles, tone) =>
  styles[STATUS_CLASS_KEYS[tone] ?? STATUS_CLASS_KEYS.neutral];
