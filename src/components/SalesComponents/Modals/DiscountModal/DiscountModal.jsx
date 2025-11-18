import React, { useState, useEffect } from "react";
import styles from "./DiscountModal.module.css";

const DiscountModal = ({ isOpen, onClose, onApplyDiscount, selectedProduct }) => {
  // Usar el precio del producto seleccionado o un valor por defecto
  const [price, setPrice] = useState(selectedProduct ? selectedProduct.precio : 100);
  const [newPrice, setNewPrice] = useState("");
  const [discount, setDiscount] = useState("");
  //Obtener el costo del producto seleccionado
  const costPrice = selectedProduct ? selectedProduct.costo : 0;
  const [showWarning, setShowWarning] = useState(false);

  // Actualizar el precio cuando cambia el producto seleccionado
  useEffect(() => {
    if (selectedProduct) {
      setPrice(selectedProduct.precio);
      setNewPrice("");
      setDiscount("");
    }
  }, [selectedProduct]);

  // Efecto para manejar la tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    // Verifica si el nuevo precio es menor al costo
    if (newPrice && parseFloat(newPrice) < costPrice) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [newPrice,costPrice]);

  const handlePriceChange = (e) => {
    const value = e.target.value;
    setNewPrice(value);
    
    if (value && !isNaN(parseFloat(value))) {
      const numericValue = parseFloat(value);
      const calculatedDiscount = ((price - numericValue) / price) * 100;
      setDiscount(calculatedDiscount.toFixed(2));
    } else {
      setDiscount("");
    }
  };

  const handleDiscountChange = (e) => {
    const value = e.target.value;
    setDiscount(value);
    
    if (value && !isNaN(parseFloat(value))) {
      const numericValue = parseFloat(value);
      const calculatedPrice = price - (price * numericValue) / 100;
      setNewPrice(calculatedPrice.toFixed(2));
    } else {
      setNewPrice("");
    }
  };

  const handleConfirm = () => {
    if (newPrice && !isNaN(parseFloat(newPrice))) {
      const discountData = {
        originalPrice: price,
        newPrice: parseFloat(newPrice),
        discount: discount ? parseFloat(discount) : 0,
        costPrice: costPrice
      };
      
      if (onApplyDiscount) {
        onApplyDiscount(discountData);
      }
      
      console.log(`Nuevo precio confirmado: $${parseFloat(newPrice).toFixed(2)}`);
    }
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2>Cambiar Precio</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {selectedProduct && (
            <div className={styles.productInfo}>
              <div className={styles.productName}>{selectedProduct.codigo}</div>
            </div>
          )}
          
          <div className={styles.inputGroup}>
            <label>Precio Actual</label>
            <div className={styles.currentPriceDisplay}>${price.toFixed(2)}</div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="newPrice">Nuevo Precio</label>
            <input
              id="newPrice"
              type="number"
              value={newPrice}
              onChange={handlePriceChange}
              placeholder="0.00"
              min="0"
              step="0.01"
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="discount">Descuento (%)</label>
            <input
              id="discount"
              type="number"
              value={discount}
              onChange={handleDiscountChange}
              placeholder="0.00"
              min="0"
              max="100"
              step="0.01"
            />
          </div>

          {showWarning && (
            <div className={styles.warning}>
              ⚠️ El nuevo precio está por debajo del costo (${costPrice.toFixed(2)})
            </div>
          )}

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Descuento aplicado:</span>
              <span className={styles.discountAmount}>
                {discount ? `${parseFloat(discount).toFixed(2)}%` : "0%"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span>Precio final:</span>
              <span className={styles.finalPrice}>
                ${newPrice ? parseFloat(newPrice).toFixed(2) : "0.00"}
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.confirmBtn} onClick={handleConfirm}>
              Cambiar Precio
            </button>
            <button className={styles.cancelBtn} onClick={onClose}>
              Esc - Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountModal;