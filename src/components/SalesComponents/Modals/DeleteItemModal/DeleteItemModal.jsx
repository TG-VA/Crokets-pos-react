import React, { useEffect } from "react";
import styles from "./DeleteItem.module.css";

const DeleteItemModal = ({ isOpen, onClose, onConfirmDelete, selectedProduct }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirmDelete();
    onClose();
  };

  // Manejar tecla Enter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
          >
            Cancelar (ESC)
          </button>
          <button 
            className={styles.confirmButton} 
            onClick={handleConfirm}
          >
            Eliminar (ENTER)
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteItemModal;