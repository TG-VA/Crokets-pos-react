import { useId, useState } from "react";

import { useEscapeKey } from "../../../../../hooks/useEscapeKey";
import styles from "./MakeGlobalConfirmModal.module.css";
import XmarkIcon from "../../../../../assets/icons/xmark-solid-full.svg";

const CONFIRM_WORD = "CONFIRMAR";

const CONSEQUENCES = [
  "El producto aparecera en el catalogo de todas las sucursales, con stock 0 donde no tenga inventario.",
  "Entrara a los reportes de inventario y de productos.",
  "Podra pedirse a cualquier sucursal desde Crear pedido.",
  "Las demas sucursales usaran el precio del catalogo hasta fijar el suyo.",
  "No se pierde nada: inventario, stock, ventas y movimientos conservan su historial.",
  "Revertirlo despues no es limpio si otras sucursales ya crearon inventario.",
];

// El contenido vive en un componente interno que se desmonta cuando no hay
// producto, para que la palabra escrita no sobreviva al cerrar y reabrir.
const MakeGlobalConfirmContent = ({
  product,
  saving,
  error,
  onClose,
  onConfirm,
}) => {
  const [typed, setTyped] = useState("");
  const titleId = useId();
  const inputId = useId();

  useEscapeKey(onClose, !saving);

  const canConfirm = typed === CONFIRM_WORD && !saving;

  // Se renderiza dentro del overlay del buscador: el clic en el fondo no debe
  // propagarse, o cerraria todo el buscador.
  const handleOverlayClick = (event) => {
    event.stopPropagation();
    if (!saving) onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 id={titleId}>Volver global este producto</h2>
            <p>{product.descripcion ?? product.nombre ?? product.name}</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
          >
            <img
              src={XmarkIcon}
              alt=""
              className={styles.closeIcon}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.notice}>
            Hoy es un producto local: solo existe en las sucursales donde tiene
            inventario.
          </div>
          <ul className={styles.consequences}>
            {CONSEQUENCES.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>

          <label htmlFor={inputId} className={styles.label}>
            Escribe {CONFIRM_WORD} para continuar
          </label>
          <input
            id={inputId}
            className={styles.input}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={saving}
            autoComplete="off"
            autoFocus
          />

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {saving ? "Guardando..." : "Volver global"}
          </button>
        </div>
      </div>
    </div>
  );
};

const MakeGlobalConfirmModal = ({
  product,
  saving = false,
  error = null,
  onClose,
  onConfirm,
}) => {
  if (!product) return null;

  return (
    <MakeGlobalConfirmContent
      key={product.product_id ?? product.id ?? product.codigo}
      product={product}
      saving={saving}
      error={error}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
};

export default MakeGlobalConfirmModal;
