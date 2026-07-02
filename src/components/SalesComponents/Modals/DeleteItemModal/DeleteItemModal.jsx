import React, { useEffect } from "react";
import styles from "./DeleteItem.module.css";

const DeleteItemModal = ({ isOpen, onClose, onConfirmDelete, selectedProduct }) => {
  const handleConfirm = () => {
    onConfirmDelete();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Eliminar Artículo</h2>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.confirmText}>
            ¿Estás seguro de que deseas eliminar este producto?
          </p>

          {selectedProduct && (
            <div className={styles.productInfo}>
              <p><strong>Producto:</strong> {selectedProduct.codigo}</p>
              <p><strong>Precio:</strong> ${selectedProduct.precio.toFixed(2)}</p>
              <p><strong>Cantidad:</strong> {selectedProduct.cantidad}</p>
              <p><strong>Importe:</strong> ${selectedProduct.importe.toFixed(2)}</p>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Esc - Cancelar
          </button>
          <button className={styles.confirmButton} onClick={handleConfirm}>
            Enter - Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteItemModal;