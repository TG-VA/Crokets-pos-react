import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProducts } from "../../../../contexts/ProductsContext";
import InventorySearchModal from "../../Modals/InventorySearchModal/InventorySearchModal";
import styles from "./PageAdd.module.css";

const PageAdd = () => {
  const { products, getProductByCodigo } = useProducts();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityToAdd, setQuantityToAdd] = useState("");
  const quantityInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const bodyRef = useRef(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitArmed, setSubmitArmed] = useState(false);

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
      handleSimulatedSubmit();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [submitArmed]);

  useEffect(() => {
    if (!selectedProduct) return;
    setQuantityToAdd("");
    setSubmitArmed(false);
    const raf = window.requestAnimationFrame(() => {
      quantityInputRef.current?.focus();
      if (typeof quantityInputRef.current?.select === "function") {
        quantityInputRef.current.select();
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [selectedProduct?.codigo]);

  const currentInventory = useMemo(() => {
    return Number(selectedProduct?.existencia ?? 0) || 0;
  }, [selectedProduct?.existencia]);

  const parsedQuantityToAdd = useMemo(() => {
    const n = parseInt((quantityToAdd ?? "").toString(), 10);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, n);
  }, [quantityToAdd]);

  const newInventory = useMemo(() => {
    return currentInventory + parsedQuantityToAdd;
  }, [currentInventory, parsedQuantityToAdd]);

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
    handleSimulatedSubmit();
  };

  const handleLookup = () => {
    const found = getProductByCodigo(barcode.trim());
    if (!found) {
      alert("Producto no encontrado");
      return;
    }
    setSelectedProduct(found);
  };

  const loadProduct = (product) => {
    if (!product) return;
    setSelectedProduct(product);
    setBarcode(product.codigo ?? "");
  };

  const handleSimulatedSubmit = () => {
    if (!selectedProduct) return;

    const qty = parsedQuantityToAdd;
    if (qty <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }
    const desc = (selectedProduct.descripcion ?? "").toString().trim();
    const descUpper = desc ? desc.toUpperCase() : "PRODUCTO";
    setSuccessMessage(`INGRESO EXITOSO DE ${qty} ${descUpper}`);
    setSubmitArmed(false);
    setSelectedProduct(null);
    setBarcode("");
    setQuantityToAdd("");

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
          <h1 className={styles.title}>Agregar inventario</h1>
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
                    handleLookup();
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
              <label className={styles.label}>Inventario actual</label>
              <input
                className={styles.input}
                type="number"
                value={currentInventory}
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Cantidad</label>
              <input
                ref={quantityInputRef}
                className={styles.input}
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                value={quantityToAdd}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const raw = (e.target.value ?? "").toString();
                  if (!raw) {
                    setQuantityToAdd("");
                    return;
                  }

                  const digitsOnly = raw.replace(/[^\d]/g, "");
                  const n = parseInt(digitsOnly, 10);
                  if (!Number.isFinite(n) || n < 1) {
                    setQuantityToAdd("");
                    return;
                  }
                  setQuantityToAdd(String(n));
                }}
                placeholder="1"
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Nuevo inventario</label>
              <input
                className={styles.input}
                type="number"
                value={newInventory}
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Precio venta</label>
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

            <div className={styles.actions}>
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
                  handleSimulatedSubmit();
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSimulatedSubmit();
                }}
              >
                {submitArmed ? "Confirmar ingreso" : "Ingresar producto"}
              </button>
            </div>
          </div>
        )}

        <InventorySearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          products={products}
          onSelect={(p) => loadProduct(p)}
        />
      </div>
    </div>
  );
};

export default PageAdd;
