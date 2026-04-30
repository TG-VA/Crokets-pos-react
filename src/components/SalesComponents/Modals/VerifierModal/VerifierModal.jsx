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

  const getProductDiscount = async (productId) => {
    const { data, error } = await supabase
      .from("product_discounts")
      .select("enabled, discount_percent, discount_concept")
      .eq("product_id", productId)
      .maybeSingle();

    if (error) throw error;

    return data || null;
  };

  const applyDiscountToPrice = (salePrice, discountRow) => {
    const price = Number(salePrice || 0);

    if (!discountRow?.enabled) {
      return {
        finalPrice: price,
        discountEnabled: false,
        discountPercent: 0,
        discountConcept: "",
      };
    }

    const discountPercent = Number(discountRow.discount_percent || 0);

    if (discountPercent <= 0) {
      return {
        finalPrice: price,
        discountEnabled: false,
        discountPercent: 0,
        discountConcept: "",
      };
    }

    const finalPrice = Math.max(price - price * (discountPercent / 100), 0);

    return {
      finalPrice: Number(finalPrice.toFixed(2)),
      discountEnabled: true,
      discountPercent,
      discountConcept: discountRow.discount_concept || "",
    };
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
        .select(`
          id,
          barcode,
          name,
          cost_price,
          sale_price,
          is_kit,
          status,
          is_global,
          tracks_inventory
        `)
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

      const tracksInventory = !!productRow.tracks_inventory;
      const discountRow = await getProductDiscount(productRow.id);

      if (currentRequestId !== requestIdRef.current) return;

      if (!tracksInventory) {
        if (!productRow.is_global) {
          setProduct(null);
          setError("Este producto no está disponible para esta sucursal.");
          return;
        }

        const salePrice = Number(productRow.sale_price || 0);
        const discountInfo = applyDiscountToPrice(salePrice, discountRow);

        const mappedProduct = {
          id: productRow.id,
          codigo: productRow.barcode,
          nombre: productRow.name,
          precioOriginal: salePrice,
          precio: discountInfo.finalPrice,
          costo: Number(productRow.cost_price || 0),
          existencia: "∞",
          is_active_in_branch: true,
          has_been_stocked: true,
          is_kit: !!productRow.is_kit,
          tracks_inventory: false,
          discount_enabled: discountInfo.discountEnabled,
          discount_percent: discountInfo.discountPercent,
          discount_concept: discountInfo.discountConcept,
        };

        setProduct(mappedProduct);
        setError("");
        return;
      }

      const { data: inventoryRow, error: inventoryError } = await supabase
        .from("branch_inventory")
        .select("stock, is_active, has_been_stocked, cost_price, sale_price")
        .eq("branch_id", branch.id)
        .eq("product_id", productRow.id)
        .maybeSingle();

      if (currentRequestId !== requestIdRef.current) return;
      if (inventoryError) throw inventoryError;

      if (!inventoryRow) {
        setProduct(null);
        setError("Este producto no tiene inventario registrado en esta sucursal.");
        return;
      }

      const salePrice = Number(
        inventoryRow.sale_price ?? productRow.sale_price ?? 0
      );

      const discountInfo = applyDiscountToPrice(salePrice, discountRow);

      const mappedProduct = {
        id: productRow.id,
        codigo: productRow.barcode,
        nombre: productRow.name,
        precioOriginal: salePrice,
        precio: discountInfo.finalPrice,
        costo: Number(inventoryRow.cost_price ?? productRow.cost_price ?? 0),
        existencia: Number(inventoryRow.stock || 0),
        is_active_in_branch: inventoryRow.is_active !== false,
        has_been_stocked: !!inventoryRow.has_been_stocked,
        is_kit: !!productRow.is_kit,
        tracks_inventory: true,
        discount_enabled: discountInfo.discountEnabled,
        discount_percent: discountInfo.discountPercent,
        discount_concept: discountInfo.discountConcept,
      };

      setProduct(mappedProduct);

      if (mappedProduct.is_active_in_branch === false) {
        setError("Este producto está inactivo en esta sucursal.");
        return;
      }

      if (!mappedProduct.has_been_stocked) {
        setError("Este producto aún no tiene inventario inicial registrado.");
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

    if (product.tracks_inventory && !product.has_been_stocked) {
      setError("Este producto aún no tiene inventario inicial registrado.");
      return;
    }

    if (product.tracks_inventory && Number(product.existencia || 0) <= 0) {
      setError("Este producto no tiene existencia disponible.");
      return;
    }

    await onAddToSale({
      id: product.id,
      barcode: product.codigo,
      name: product.nombre,
      sale_price: product.precioOriginal,
      cost_price: product.costo,
      is_kit: product.is_kit,
      tracks_inventory: product.tracks_inventory,
      discount_enabled: !!product.discount_enabled,
      discount_percent: Number(product.discount_percent || 0),
      discount_concept: product.discount_concept || "",
    });

    handleClose();
  };

  if (!isOpen) return null;

  const canAddToSale =
    product &&
    product.is_active_in_branch !== false &&
    (!product.tracks_inventory ||
      (product.has_been_stocked && Number(product.existencia || 0) > 0));

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

                {Number(product.discount_percent || 0) > 0 && (
                  <div className={styles.productRow}>
                    <span className={styles.label}>Precio original:</span>
                    <span className={styles.value}>
                      ${Number(product.precioOriginal || 0).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className={styles.productRow}>
                  <span className={styles.label}>Precio actual:</span>
                  <span className={`${styles.value} ${styles.price}`}>
                    ${Number(product.precio || 0).toFixed(2)}
                  </span>
                </div>

                {Number(product.discount_percent || 0) > 0 && (
                  <div className={styles.productRow}>
                    <span className={styles.label}>Descuento:</span>
                    <span className={styles.value}>
                      {Number(product.discount_percent || 0).toFixed(2)}%
                      {product.discount_concept
                        ? ` - ${product.discount_concept}`
                        : ""}
                    </span>
                  </div>
                )}

                <div className={styles.productRow}>
                  <span className={styles.label}>Existencia actual:</span>
                  <span
                    className={`${styles.value} ${
                      !product.tracks_inventory ||
                      Number(product.existencia || 0) > 0
                        ? styles.inStock
                        : styles.outOfStock
                    }`}
                  >
                    {product.tracks_inventory
                      ? `${product.existencia} unidades`
                      : "Sin control de inventario"}
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
              disabled={!canAddToSale}
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