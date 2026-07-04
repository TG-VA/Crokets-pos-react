import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./DiscountModal.module.css";

import PercentIcon from "../../../../assets/icons/percent-solid-full.svg";
import WarningIcon from "../../../../assets/icons/triangle-exclamation-solid-full.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const DiscountModal = ({
  isOpen,
  onClose,
  onApplyDiscount,
  selectedProduct,
}) => {
  const editingField = useRef(null);

  const originalPrice = useMemo(() => {
    return Number(
      selectedProduct?.precioOriginal ??
        selectedProduct?.originalPrice ??
        selectedProduct?.original_unit_price ??
        selectedProduct?.sale_price ??
        selectedProduct?.precio ??
        0
    );
  }, [selectedProduct]);

  const appliedFinalPrice = useMemo(() => {
    return Number(
      selectedProduct?.precio ??
        selectedProduct?.precioFinal ??
        selectedProduct?.finalPrice ??
        selectedProduct?.final_unit_price ??
        originalPrice
    );
  }, [selectedProduct, originalPrice]);

  const appliedDiscountPercent = useMemo(() => {
    if (originalPrice <= 0) return 0;

    const manualPercent = Number(
      selectedProduct?.discountPercent ??
        selectedProduct?.discount_percent ??
        0
    );

    if (manualPercent > 0) {
      return manualPercent;
    }

    const calculatedDiscount = ((originalPrice - appliedFinalPrice) / originalPrice) * 100;

    return calculatedDiscount > 0 ? calculatedDiscount : 0;
  }, [selectedProduct, originalPrice, appliedFinalPrice]);

  const costPrice = Number(selectedProduct?.costo ?? selectedProduct?.cost_price ?? 0);

  const [price, setPrice] = useState(originalPrice);
  const [newPrice, setNewPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!isOpen || !selectedProduct) return;

    const hasAppliedDiscount =
      originalPrice > 0 &&
      appliedFinalPrice >= 0 &&
      appliedFinalPrice < originalPrice;

    setPrice(originalPrice);

    if (hasAppliedDiscount) {
      setNewPrice(appliedFinalPrice.toFixed(2));
      setDiscount(appliedDiscountPercent.toFixed(2));
    } else {
      setNewPrice("");
      setDiscount("");
    }

    setShowWarning(false);
    editingField.current = null;
  }, [
    isOpen,
    selectedProduct?.id,
    selectedProduct?.cartLineId,
    selectedProduct?.precioOriginal,
    selectedProduct?.precio,
    selectedProduct?.descuentoMonto,
    selectedProduct?.descuentoValor,
    originalPrice,
    appliedFinalPrice,
    appliedDiscountPercent,
  ]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

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
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown, true);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (newPrice !== "" && parseFloat(newPrice) < costPrice) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [newPrice, costPrice]);

  const sanitize = (value) => {
    return String(value || "")
      .replace(/[^0-9.]/g, "")
      .replace(/(\..*)\./g, "$1");
  };

  const handlePriceChange = (event) => {
    const value = sanitize(event.target.value);

    editingField.current = "price";
    setNewPrice(value);

    const num = parseFloat(value);

    if (value !== "" && !isNaN(num) && price > 0) {
      const calculatedDiscount = ((price - num) / price) * 100;
      setDiscount(Math.max(calculatedDiscount, 0).toFixed(2));
    } else {
      setDiscount("");
    }
  };

  const handleDiscountChange = (event) => {
    const value = sanitize(event.target.value);

    editingField.current = "discount";
    setDiscount(value);

    const num = parseFloat(value);

    if (value !== "" && !isNaN(num)) {
      const cleanDiscount = Math.min(Math.max(num, 0), 100);
      const calculatedPrice = price - (price * cleanDiscount) / 100;
      setNewPrice(Math.max(calculatedPrice, 0).toFixed(2));
    } else {
      setNewPrice("");
    }
  };

  const handlePriceBlur = () => {
    editingField.current = null;

    const num = parseFloat(newPrice);

    if (!isNaN(num)) {
      setNewPrice(num.toFixed(2));
    }
  };

  const handleDiscountBlur = () => {
    editingField.current = null;

    const num = parseFloat(discount);

    if (!isNaN(num)) {
      setDiscount(Math.min(Math.max(num, 0), 100).toFixed(2));
    }
  };

  const handleConfirm = () => {
    const cleanNewPrice = Number.parseFloat(newPrice);

    if (!Number.isNaN(cleanNewPrice)) {
      const discountData = {
        originalPrice: price,
        newPrice: cleanNewPrice,
        discount: Number.parseFloat(discount) || 0,
        costPrice,
      };

      if (onApplyDiscount) {
        onApplyDiscount(discountData);
      }
    }

    onClose();
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2>
            <span className={styles.titleContent}>
              <img
                src={PercentIcon}
                alt=""
                className={styles.titleIcon}
                aria-hidden="true"
              />
              Cambiar precio
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
          {selectedProduct && (
            <div className={styles.productInfo}>
              <div className={styles.productName}>{selectedProduct.codigo}</div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label>Precio original</label>
            <div className={styles.currentPriceDisplay}>
              ${Number(price || 0).toFixed(2)}
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="newPrice">Nuevo precio</label>
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
              <img
                src={WarningIcon}
                alt=""
                className={styles.warningIcon}
                aria-hidden="true"
              />

              <span>
                El nuevo precio está por debajo del costo ($
                {Number(costPrice || 0).toFixed(2)})
              </span>
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
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={handleConfirm}
            >
              Cambiar precio
            </button>

            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              ESC - Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountModal;