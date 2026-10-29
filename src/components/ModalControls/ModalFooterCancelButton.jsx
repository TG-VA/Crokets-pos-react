import styles from "./ModalControls.module.css";

export const MODAL_CANCEL_LABEL = "ESC - Cancelar";

/**
 * Boton de cancelacion de pie compartido. Centraliza la etiqueta estandar y el
 * tipo de boton; cada modal aporta la accion, su manejo de Escape y sus clases
 * visuales.
 */
const ModalFooterCancelButton = ({
  onClick,
  disabled = false,
  label = MODAL_CANCEL_LABEL,
  className = "",
}) => (
  <button
    type="button"
    className={[styles.cancelButton, className].filter(Boolean).join(" ")}
    onClick={onClick}
    disabled={disabled}
  >
    {label}
  </button>
);

export default ModalFooterCancelButton;
