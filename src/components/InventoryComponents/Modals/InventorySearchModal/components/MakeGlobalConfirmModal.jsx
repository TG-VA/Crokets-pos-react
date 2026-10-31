import { useId, useState } from "react";

import { useEscapeKey } from "../../../../../hooks/useEscapeKey";
import styles from "./MakeGlobalConfirmModal.module.css";

const CONFIRM_WORD = "CONFIRMAR";

const CONSEQUENCES = [
  "El producto aparecera en el catalogo de todas las sucursales, con stock 0 donde no tenga inventario.",
  "Entrara a los reportes de inventario y de productos.",
  "Podra pedirse a cualquier sucursal desde Crear pedido.",
  "Las demas sucursales usaran el precio del catalogo hasta fijar el suyo.",
  "No se pierde nada: inventario, stock, ventas y movimientos conservan su historial.",
  "Revertirlo despues no es limpio si otras sucursales ya crearon inventario.",
];

const MakeGlobalConfirmModal = ({
  product,
  saving = false,
  error = null,
  onClose,
  onConfirm,
}) => {
  const [typed, setTyped] = useState("");
  const titleId = useId();
  const inputId = useId();

  useEscapeKey(onClose, Boolean(product) && !saving);

  if (!product) return null;

  const canConfirm = typed === CONFIRM_WORD && !saving;

  return (
    <div className={styles.overlay}>
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
            <p>{product.nombre ?? product.name}</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
          >
            ×
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

export default MakeGlobalConfirmModal;
