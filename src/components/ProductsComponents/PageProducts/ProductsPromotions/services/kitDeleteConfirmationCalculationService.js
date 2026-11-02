export const KIT_DELETE_CONFIRMATION_WORD = "ELIMINAR";

/**
 * Valida el texto que el usuario escribe para confirmar el borrado de un kit.
 * Solo la palabra exacta, sin espacios ni variaciones de mayusculas.
 */
export const isDeleteConfirmationValid = (text) =>
  typeof text === "string" && text === KIT_DELETE_CONFIRMATION_WORD;
