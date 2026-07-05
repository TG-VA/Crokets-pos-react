import React, { useEffect } from "react";
import styles from "./DeleteItem.module.css";

import DeleteIcon from "../../../../assets/icons/deleteIcon.svg";
import WarningIcon from "../../../../assets/icons/triangle-exclamation-solid-full.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const DeleteItemModal = ({
  isOpen,
  onClose,
  onConfirmDelete,
  selectedProduct,
}) => {
  const handleConfirm = () => {
    onConfirmDelete();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        if (event.nativeEvent?.stopImmediatePropagation) {
          event.nativeEvent.stopImmediatePropagation();
        }

        if (event.stopImmediatePropagation) {
          event.stopImmediatePropagation();
        }

        onClose();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();

        if (event.nativeEvent?.stopImmediatePropagation) {
          event.nativeEvent.stopImmediatePropagation();
        }

        if (event.stopImmediatePropagation) {
          event.stopImmediatePropagation();
        }

        handleConfirm();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, selectedProduct]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>
            <span className={styles.titleContent}>
              <img
                src={DeleteIcon}
                alt=""
                className={styles.titleIcon}
                aria-hidden="true"
              />
              Eliminar artículo
            </span>
          </h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <img
              src={XmarkIcon}
              alt=""
              className={styles.closeIcon}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.warningIconBox}>
            <img
              src={WarningIcon}
              alt=""
              className={styles.warningIcon}
              aria-hidden="true"
            />
          </div>

          <h3 className={styles.confirmTitle}>¿Estás seguro?</h3>

          <p className={styles.confirmText}>
            ¿Deseas eliminar este producto de la venta?
          </p>

          {selectedProduct && (
            <div className={styles.productInfo}>
              <p>
                <strong>Producto:</strong>{" "}
                {selectedProduct.nombre ||
                  selectedProduct.name ||
                  selectedProduct.codigo ||
                  "Producto"}
              </p>

              <p>
                <strong>Código:</strong>{" "}
                {selectedProduct.codigo || selectedProduct.barcode || "Sin código"}
              </p>

              <p>
                <strong>Precio:</strong> $
                {Number(selectedProduct.precio || 0).toFixed(2)}
              </p>

              <p>
                <strong>Cantidad:</strong>{" "}
                {Number(selectedProduct.cantidad || 0)}
              </p>

              <p>
                <strong>Importe:</strong> $
                {Number(selectedProduct.importe || 0).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            ESC - Cancelar
          </button>

          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
          >
            ENTER - Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteItemModal;