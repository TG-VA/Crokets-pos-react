import styles from "./ModalControls.module.css";

export const MODAL_CANCEL_LABEL = "ESC - Cancelar";

/**
 * Boton de cancelacion de pie compartido. Mantiene en un solo lugar la etiqueta
 * y el comportamiento de cancelar con Escape; los modales solo pasan la accion
 * y sus clases visuales.
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
