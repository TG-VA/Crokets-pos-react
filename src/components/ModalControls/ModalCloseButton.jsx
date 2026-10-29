import XmarkIcon from "../../assets/icons/xmark-solid-full.svg";
import styles from "./ModalControls.module.css";

/**
 * Boton de cierre (X) compartido por los modales de Ventas. Centraliza el icono,
 * el `aria-label` y el tipo de boton; cada modal aporta sus clases visuales para
 * conservar su identidad sin duplicar el marcado.
 */
const ModalCloseButton = ({
  onClick,
  ariaLabel = "Cerrar modal",
  className = "",
  iconClassName = "",
  disabled = false,
}) => (
  <button
    type="button"
    className={[styles.closeButton, className].filter(Boolean).join(" ")}
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
  >
    <img
      src={XmarkIcon}
      alt=""
      className={[styles.closeIcon, iconClassName].filter(Boolean).join(" ")}
      aria-hidden="true"
    />
  </button>
);

export default ModalCloseButton;
