import React, { useEffect, useMemo, useState, memo, useCallback } from "react";
import styles from "./DiscountModal.module.css";

import PercentIcon from "../../../../assets/icons/percent-solid-full.svg";
import WarningIcon from "../../../../assets/icons/triangle-exclamation-solid-full.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const DiscountModal = memo(({ isOpen, onClose, onApplyDiscount, selectedProduct }) => {
  const originalPrice = useMemo(() => Number(selectedProduct?.precioOriginal ?? selectedProduct?.originalPrice ?? selectedProduct?.original_unit_price ?? selectedProduct?.sale_price ?? selectedProduct?.precio ?? 0), [selectedProduct]);
  const appliedFinalPrice = useMemo(() => Number(selectedProduct?.precio ?? selectedProduct?.precioFinal ?? selectedProduct?.finalPrice ?? selectedProduct?.final_unit_price ?? originalPrice), [selectedProduct, originalPrice]);
  const costPrice = Number(selectedProduct?.costo ?? selectedProduct?.cost_price ?? 0);

  const appliedDiscountPercent = useMemo(() => {
    if (originalPrice <= 0) return 0;
    const manualPercent = Number(selectedProduct?.discountPercent ?? selectedProduct?.discount_percent ?? 0);
    if (manualPercent > 0) return manualPercent;
    const calculatedDiscount = ((originalPrice - appliedFinalPrice) / originalPrice) * 100;
    return Math.max(calculatedDiscount, 0);
  }, [selectedProduct, originalPrice, appliedFinalPrice]);

  const [price, setPrice] = useState(0);
  const [newPrice, setNewPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!isOpen || !selectedProduct) return;
    const hasAppliedDiscount = originalPrice > 0 && appliedFinalPrice >= 0 && appliedFinalPrice < originalPrice;
    setPrice(originalPrice);
    setNewPrice(hasAppliedDiscount ? appliedFinalPrice.toFixed(2) : "");
    setDiscount(hasAppliedDiscount ? appliedDiscountPercent.toFixed(2) : "");
    setShowWarning(false);
  }, [isOpen, selectedProduct, originalPrice, appliedFinalPrice, appliedDiscountPercent]);

  useEffect(() => setShowWarning(newPrice !== "" && parseFloat(newPrice) < costPrice), [newPrice, costPrice]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); e.stopImmediatePropagation?.(); handleClose(); }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, handleClose]);

  const sanitize = (value) => String(value || "").replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

  const handlePriceChange = (e) => {
    const value = sanitize(e.target.value);
    setNewPrice(value);
    const num = parseFloat(value);
    setDiscount((value !== "" && !isNaN(num) && price > 0) ? Math.max(((price - num) / price) * 100, 0).toFixed(2) : "");
  };

  const handleDiscountChange = (e) => {
    const value = sanitize(e.target.value);
    setDiscount(value);
    const num = parseFloat(value);
    setNewPrice((value !== "" && !isNaN(num)) ? Math.max(price - (price * Math.min(Math.max(num, 0), 100)) / 100, 0).toFixed(2) : "");
  };

  const handlePriceBlur = () => { const num = parseFloat(newPrice); if (!isNaN(num)) setNewPrice(num.toFixed(2)); };
  const handleDiscountBlur = () => { const num = parseFloat(discount); if (!isNaN(num)) setDiscount(Math.min(Math.max(num, 0), 100).toFixed(2)); };

  const handleConfirm = useCallback(() => {
    const cleanNewPrice = Number.parseFloat(newPrice);
    if (!Number.isNaN(cleanNewPrice)) onApplyDiscount?.({ originalPrice: price, newPrice: cleanNewPrice, discount: Number.parseFloat(discount) || 0, costPrice });
    handleClose();
  }, [newPrice, price, discount, costPrice, onApplyDiscount, handleClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2><span className={styles.titleContent}><img src={PercentIcon} alt="" className={styles.titleIcon} aria-hidden="true" /> Cambiar precio</span></h2>
          <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="Cerrar modal"><img src={XmarkIcon} alt="" className={styles.closeIcon} aria-hidden="true" /></button>
        </div>

        <div className={styles.modalBody}>
          {selectedProduct && <div className={styles.productInfo}><div className={styles.productName}>{selectedProduct.codigo}</div></div>}

          <div className={styles.inputGroup}>
            <label>Precio original</label>
            <div className={styles.currentPriceDisplay}>${Number(price || 0).toFixed(2)}</div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="newPrice">Nuevo precio</label>
            <input id="newPrice" type="text" inputMode="decimal" value={newPrice} onChange={handlePriceChange} onBlur={handlePriceBlur} placeholder="0.00" autoFocus />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="discount">Descuento (%)</label>
            <input id="discount" type="text" inputMode="decimal" value={discount} onChange={handleDiscountChange} onBlur={handleDiscountBlur} placeholder="0.00" />
          </div>

          {showWarning && (
            <div className={styles.warning}>
              <img src={WarningIcon} alt="" className={styles.warningIcon} aria-hidden="true" />
              <span>El nuevo precio está por debajo del costo (${Number(costPrice || 0).toFixed(2)})</span>
            </div>
          )}

          <div className={styles.summary}>
            <div className={styles.summaryRow}><span>Descuento aplicado:</span><span className={styles.discountAmount}>{discount ? `${parseFloat(discount).toFixed(2)}%` : "0%"}</span></div>
            <div className={styles.summaryRow}><span>Precio final:</span><span className={styles.finalPrice}>${newPrice ? parseFloat(newPrice).toFixed(2) : "0.00"}</span></div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.confirmBtn} onClick={handleConfirm}>Cambiar precio</button>
            <button type="button" className={styles.cancelBtn} onClick={handleClose}>ESC - Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DiscountModal;