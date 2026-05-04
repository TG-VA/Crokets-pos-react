import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProducts } from "../../../../contexts/ProductsContext";
import InventorySearchModal from "../../Modals/InventorySearchModal/InventorySearchModal";
import styles from "./PageAdjustments.module.css";

const PageAdjustments = () => {
  const { products, getProductByCodigo } = useProducts();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityToAdjust, setQuantityToAdjust] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitArmed, setSubmitArmed] = useState(false);

  const barcodeInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "F10") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(""), 2500);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  useEffect(() => {
    if (!submitArmed) return;
    const onKeyDown = (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      setSubmitArmed(false);
      handleSimulatedAdjustment();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [submitArmed]);

  useEffect(() => {
    if (!selectedProduct) return;
    setQuantityToAdjust("");
    setAdjustmentReason("");
    setAdjustmentNotes("");
    setSubmitArmed(false);
    const raf = window.requestAnimationFrame(() => {
      quantityInputRef.current?.focus();
      if (typeof quantityInputRef.current?.select === "function") {
        quantityInputRef.current.select();
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [selectedProduct?.codigo]);

  const currentStock = useMemo(() => {
    return Number(selectedProduct?.existencia ?? 0) || 0;
  }, [selectedProduct?.existencia]);

  const parsedQuantity = useMemo(() => {
    const raw = (quantityToAdjust ?? "").toString().replace(",", ".").trim();
    const n = raw ? Number.parseFloat(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  }, [quantityToAdjust]);

  const newStock = useMemo(() => {
    return currentStock + parsedQuantity;
  }, [currentStock, parsedQuantity]);

  const difference = useMemo(() => {
    return newStock - currentStock;
  }, [newStock, currentStock]);

  const salePrice = useMemo(() => {
    const n = Number(selectedProduct?.precio ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, [selectedProduct?.precio]);

  const getFocusableBodyElements = () => {
    if (!bodyRef.current) return [];
    const nodes = Array.from(
      bodyRef.current.querySelectorAll("input, select, textarea")
    );
    return nodes.filter((el) => {
      if (!el) return false;
      if (el.disabled) return false;
      if (el.tagName === "INPUT" && el.type === "hidden") return false;
      if (el.tabIndex === -1) return false;
      if (el.tagName === "INPUT" && el.readOnly) return false;
      return true;
    });
  };

  const handleContentKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (!selectedProduct) return;
    if (e.shiftKey) return;
    if (!bodyRef.current?.contains(e.target)) return;

    e.preventDefault();

    const focusables = getFocusableBodyElements();
    const active = document.activeElement;
    const index = focusables.indexOf(active);
    if (index === -1) return;

    if (index < focusables.length - 1) {
      setSubmitArmed(false);
      const next = focusables[index + 1];
      next.focus();
      if (typeof next.select === "function") next.select();
      return;
    }

    if (!submitArmed) {
      setSubmitArmed(true);
      if (active && typeof active.blur === "function") active.blur();
      return;
    }

    setSubmitArmed(false);
    handleSimulatedAdjustment();
  };

  const handleLookup = (code) => {
    const found = getProductByCodigo((code ?? "").trim());
    if (!found) {
      alert("Producto no encontrado");
      return;
    }
    setSelectedProduct(found);
    setBarcode(found.codigo ?? "");
  };

  const handleSelectFromModal = (product) => {
    if (!product) return;
    setSelectedProduct(product);
    setBarcode(product.codigo ?? "");
  };

  const handleSimulatedAdjustment = () => {
    if (!selectedProduct) return;

    const reason = (adjustmentReason ?? "").toString().trim();
    if (!reason) {
      alert("Captura el motivo del ajuste.");
      return;
    }

    const qty = parsedQuantity;
    const desc = (selectedProduct.descripcion ?? "").toString().trim();
    const descUpper = desc ? desc.toUpperCase() : "PRODUCTO";
    setSuccessMessage(`AJUSTE EXITOSO DE ${qty} ${descUpper}`);
    setSubmitArmed(false);
    setSelectedProduct(null);
    setBarcode("");
    setQuantityToAdjust("");
    setAdjustmentReason("");
    setAdjustmentNotes("");

    window.requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();
      if (typeof barcodeInputRef.current?.select === "function") {
        barcodeInputRef.current.select();
      }
    });
  };

  return (
    <div className={styles.container}>
      <div
        className={styles.content}
        onKeyDown={handleContentKeyDown}
        onFocusCapture={() => setSubmitArmed(false)}
      >
        <div className={styles.header}>
          <h1 className={styles.title}>Ajustes de inventario</h1>
        </div>

        {!!successMessage && (
          <div
            className={styles.successOverlay}
            onClick={() => setSuccessMessage("")}
          >
            <div className={styles.successToast} role="status">
              {successMessage}
            </div>
          </div>
        )}

        {!selectedProduct && (
          <div className={styles.lookup}>
            <div className={styles.formRow}>
              <label className={styles.label}>Código de barras</label>
              <input
                ref={barcodeInputRef}
                className={styles.input}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLookup(barcode);
                  }
                }}
                autoFocus
                placeholder="Escanea el código o presiona F10 para buscar"
              />
            </div>
          </div>
        )}

        {selectedProduct && (
          <div className={styles.body} ref={bodyRef}>
            <div className={styles.formRow}>
              <label className={styles.label}>Código de barras</label>
              <input
                className={styles.input}
                type="text"
                value={barcode}
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Nombre del producto</label>
              <input
                className={styles.input}
                type="text"
                value={selectedProduct.descripcion ?? ""}
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Stock actual</label>
              <input
                className={styles.input}
                type="number"
                value={currentStock}
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Diferencia</label>
              <input
                ref={quantityInputRef}
                className={styles.input}
                type="number"
                inputMode="decimal"
                step="0.001"
                value={quantityToAdjust}
                onChange={(e) => setQuantityToAdjust(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Nuevo stock</label>
              <input
                className={styles.input}
                type="number"
                value={newStock}
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Precio de venta</label>
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={salePrice.toFixed(2)}
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Motivo del ajuste</label>
              <input
                className={styles.input}
                type="text"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Ej. Merma / Inventario físico / Corrección"
                maxLength={50}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Notas</label>
              <textarea
                className={styles.textarea}
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                placeholder="Comentarios adicionales (opcional)"
                rows={3}
              />
            </div>

            <button
              className={styles.primaryButton}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!submitArmed) {
                  setSubmitArmed(true);
                  return;
                }
                handleSimulatedAdjustment();
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSimulatedAdjustment();
              }}
            >
              {submitArmed ? "Confirmar ajuste" : "Aplicar ajuste"}
            </button>
          </div>
        )}

        <InventorySearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          products={products}
          onSelect={(p) => handleSelectFromModal(p)}
        />
      </div>
    </div>
  );
};

export default PageAdjustments;
