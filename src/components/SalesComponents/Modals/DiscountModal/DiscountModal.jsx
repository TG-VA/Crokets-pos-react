import React, { useState, useEffect, useRef } from "react";
import styles from "./DiscountModal.module.css";

const DiscountModal = ({ isOpen, onClose, onApplyDiscount, selectedProduct }) => {
  const [price, setPrice] = useState(selectedProduct ? selectedProduct.precio : 100);
  const [newPrice, setNewPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const costPrice = selectedProduct ? selectedProduct.costo : 0;
  const [showWarning, setShowWarning] = useState(false);
  const editingField = useRef(null);

  useEffect(() => {
    if (selectedProduct) {
      setPrice(selectedProduct.precio);
      setNewPrice("");
      setDiscount("");
      setShowWarning(false);
      editingField.current = null;
    }
  }, [selectedProduct?.id]); // ← ÚNICO CAMBIO: solo el ID, no el objeto completo

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (newPrice !== "" && parseFloat(newPrice) < costPrice) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [newPrice, costPrice]);

  const sanitize = (value) =>
    value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

  const handlePriceChange = (e) => {
    const value = sanitize(e.target.value);
    editingField.current = "price";
    setNewPrice(value);

    const num = parseFloat(value);
    if (value !== "" && !isNaN(num)) {
      const calculatedDiscount = ((price - num) / price) * 100;
      setDiscount(calculatedDiscount.toFixed(2));
    } else {
      setDiscount("");
    }
  };

  const handleDiscountChange = (e) => {
    const value = sanitize(e.target.value);
    editingField.current = "discount";
    setDiscount(value);

    const num = parseFloat(value);
    if (value !== "" && !isNaN(num)) {
      const calculatedPrice = price - (price * num) / 100;
      setNewPrice(calculatedPrice.toFixed(2));
    } else {
      setNewPrice("");
    }
  };

  const handlePriceBlur = () => {
    editingField.current = null;
    const num = parseFloat(newPrice);
    if (!isNaN(num)) setNewPrice(num.toFixed(2));
  };

  const handleDiscountBlur = () => {
    editingField.current = null;
    const num = parseFloat(discount);
    if (!isNaN(num)) setDiscount(num.toFixed(2));
  };

  const handleConfirm = () => {
    if (newPrice && !isNaN(parseFloat(newPrice))) {
      const discountData = {
        originalPrice: price,
        newPrice: parseFloat(newPrice),
        discount: parseFloat(discount) || 0,
        costPrice: costPrice,
      };
      if (onApplyDiscount) onApplyDiscount(discountData);
    }
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
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
              type="text"
              inputMode="decimal"
              value={newPrice}
              onChange={handlePriceChange}
              onBlur={handlePriceBlur}
              placeholder="0.00"
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="discount">Descuento (%)</label>
            <input
              id="discount"
              type="text"
              inputMode="decimal"
              value={discount}
              onChange={handleDiscountChange}
              onBlur={handleDiscountBlur}
              placeholder="0.00"
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