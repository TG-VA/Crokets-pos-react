import React, { useState, useEffect, useRef } from "react";
import styles from "./VerifierModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";

const VerifierModal = ({ isOpen, onClose, onAddToSale }) => {
  const { branch } = useBranch();

  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    setBarcode("");
    setProduct(null);
    setError("");
    setIsLoading(false);
    requestIdRef.current += 1;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleClose();
        return;
      }

      if (e.key === "F1" && product) {
        e.preventDefault();
        e.stopPropagation();
        handleAddToSale();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown, true);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, product]);

  const handleClose = () => {
    requestIdRef.current += 1;
    setBarcode("");
    setProduct(null);
    setError("");
    setIsLoading(false);
    onClose();
  };

  const handleSearchProduct = async () => {
    const cleanBarcode = barcode.trim();

    if (!cleanBarcode) {
      setProduct(null);
      setError("Por favor ingrese un código de barras.");
      return;
    }

    if (!branch?.id) {
      setProduct(null);
      setError("La sucursal actual no está cargada.");
      return;
    }

    const currentRequestId = ++requestIdRef.current;

    try {
      setIsLoading(true);
      setError("");
      setProduct(null);

      const { data: productRow, error: productError } = await supabase
        .from("products")
        .select("id, barcode, name, cost_price, sale_price, is_kit, status")
        .eq("barcode", cleanBarcode)
        .eq("status", true)
        .maybeSingle();

      if (currentRequestId !== requestIdRef.current) return;

      if (productError) throw productError;

      if (!productRow) {
        setProduct(null);
        setError("Producto no encontrado.");
        return;
      }

      const { data: inventoryRow, error: inventoryError } = await supabase
        .from("branch_inventory")
        .select("stock, is_active, cost_price, sale_price")
        .eq("branch_id", branch.id)
        .eq("product_id", productRow.id)
        .maybeSingle();

      if (currentRequestId !== requestIdRef.current) return;

      if (inventoryError) throw inventoryError;

      if (!inventoryRow) {
        setProduct(null);
        setError("Este producto no existe en el inventario de esta sucursal.");
        return;
      }

      const mappedProduct = {
        id: productRow.id,
        codigo: productRow.barcode,
        nombre: productRow.name,
        precio: Number(inventoryRow.sale_price ?? productRow.sale_price ?? 0),
        costo: Number(inventoryRow.cost_price ?? productRow.cost_price ?? 0),
        existencia: Number(inventoryRow.stock || 0),
        is_active_in_branch: inventoryRow.is_active !== false,
        is_kit: !!productRow.is_kit,
      };

      setProduct(mappedProduct);

      if (mappedProduct.is_active_in_branch === false) {
        setError("Este producto está inactivo en esta sucursal.");
        return;
      }

      if (mappedProduct.existencia <= 0) {
        setError("Este producto no tiene existencia disponible.");
        return;
      }

      setError("");
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;

      console.error("Error buscando producto en verificador:", err);
      setProduct(null);
      setError("Error buscando producto.");
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleAddToSale = async () => {
    if (!product || !onAddToSale) return;

    if (product.is_active_in_branch === false) {
      setError("Este producto está inactivo en esta sucursal.");
      return;
    }

    if (product.existencia <= 0) {
      setError("Este producto no tiene existencia disponible.");
      return;
    }

    await onAddToSale({
      id: product.id,
      barcode: product.codigo,
      name: product.nombre,
      sale_price: product.precio,
      cost_price: product.costo,
      is_kit: product.is_kit,
    });

    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div
        className={styles.verifierModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>Verificador de Precios</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className={styles.verifierModalBody}>
          <div className={styles.barcodeSection}>
            <label htmlFor="barcodeInput">Código de Barras:</label>
            <div className={styles.inputContainer}>
              <input
                ref={inputRef}
                id="barcodeInput"
                type="text"
                className={styles.barcodeInput}
                value={barcode}
                onChange={(e) => {
                  setBarcode(e.target.value);
                  setError("");
                  if (!e.target.value.trim()) {
                    requestIdRef.current += 1;
                    setProduct(null);
                    setIsLoading(false);
                  }
                }}
                placeholder="Escanee o ingrese el código..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchProduct();
                  }
                }}
              />

              <button
                className={styles.searchButton}
                onClick={handleSearchProduct}
                disabled={isLoading}
              >
                {isLoading ? "Buscando..." : "Buscar"}
              </button>
            </div>

            <div className={styles.branchHint}>
              Consulta precio y existencia de la sucursal actual:{" "}
              <strong>
                {branch?.code ? `${branch.code} - ` : ""}
                {branch?.name || "Sucursal actual"}
              </strong>
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          {product && (
            <div className={styles.productInfo}>
              <h3>Producto encontrado</h3>

              <div className={styles.productDetails}>
                <div className={styles.productRow}>
                  <span className={styles.label}>Código:</span>
                  <span className={styles.value}>{product.codigo}</span>
                </div>

                <div className={styles.productRow}>
                  <span className={styles.label}>Nombre:</span>
                  <span className={styles.value}>{product.nombre}</span>
                </div>

                <div className={styles.productRow}>
                  <span className={styles.label}>Precio actual:</span>
                  <span className={`${styles.value} ${styles.price}`}>
                    ${Number(product.precio || 0).toFixed(2)}
                  </span>
                </div>

                <div className={styles.productRow}>
                  <span className={styles.label}>Existencia actual:</span>
                  <span
                    className={`${styles.value} ${
                      product.existencia > 0 ? styles.inStock : styles.outOfStock
                    }`}
                  >
                    {product.existencia} unidades
                  </span>
                </div>

                <div className={styles.productRow}>
                  <span className={styles.label}>Estado:</span>
                  <span
                    className={`${styles.statusBadge} ${
                      product.is_active_in_branch
                        ? styles.statusActive
                        : styles.statusInactive
                    }`}
                  >
                    {product.is_active_in_branch ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={handleClose}>
            ESC - Cerrar
          </button>

          {product && (
            <button
              className={styles.addButton}
              onClick={handleAddToSale}
              disabled={
                product.existencia <= 0 || product.is_active_in_branch === false
              }
            >
              F1 - Agregar a la venta
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifierModal;