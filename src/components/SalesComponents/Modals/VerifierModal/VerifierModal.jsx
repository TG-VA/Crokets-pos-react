import React, { useEffect, memo } from "react";
import styles from "./VerifierModal.module.css";
import { useBranch } from "../../../../contexts/BranchContext";
import { useVerifier } from "./useVerifier";

import VerifyIcon from "../../../../assets/icons/verifyIcon.svg";
import SearchIcon from "../../../../assets/icons/searchIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const VerifierModal = memo(({ isOpen, onClose, onAddToSale }) => {
  const { branch } = useBranch();
  
  const {
    barcode, setBarcode, product, kitItems, isLoading, error, inputRef,
    handleClose, handleSearchProduct, handleAddToSale, canAddToSale
  } = useVerifier({ isOpen, onClose, onAddToSale, branch });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); handleClose(); }
      else if (e.key === "F1" && canAddToSale) { e.preventDefault(); e.stopPropagation(); handleAddToSale(); }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, canAddToSale, handleClose, handleAddToSale]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.verifierModal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>
            <span className={styles.titleContent}>
              <img src={VerifyIcon} alt="" className={styles.titleIcon} aria-hidden="true" />
              Verificador de precios
            </span>
          </h2>
          <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="Cerrar modal">
            <img src={XmarkIcon} alt="" className={styles.closeIcon} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.verifierModalBody}>
          <div className={styles.barcodeSection}>
            <label htmlFor="barcodeInput">Código de barras:</label>
            <div className={styles.inputContainer}>
              <div className={styles.barcodeInputWrapper}>
                <img src={SearchIcon} alt="" className={styles.inputIcon} aria-hidden="true" />
                <input
                  ref={inputRef}
                  id="barcodeInput"
                  type="text"
                  className={styles.barcodeInput}
                  value={barcode}
                  onChange={e => {
                    setBarcode(e.target.value);
                    if (!e.target.value.trim()) handleClose(); // Limpia sutilmente
                  }}
                  placeholder="Escanea o ingresa el código..."
                  autoFocus
                  autoComplete="off"
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleSearchProduct(); }
                  }}
                />
              </div>
              <button type="button" className={styles.searchButton} onClick={handleSearchProduct} disabled={isLoading}>
                {isLoading ? "Buscando..." : "Buscar"}
              </button>
            </div>
            <div className={styles.branchHint}>
              Consulta precio y existencia de la sucursal actual: <strong>{branch?.code ? `${branch.code} - ` : ""}{branch?.name || "Sucursal actual"}</strong>
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          {product && (
            <div className={styles.productInfo}>
              <h3>Producto encontrado {product.is_kit && <span className={styles.kitBadge}>KIT</span>}</h3>
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
                    <span className={styles.value}>${Number(product.precioOriginal || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className={styles.productRow}>
                  <span className={styles.label}>Precio actual:</span>
                  <span className={`${styles.value} ${styles.price}`}>${Number(product.precio || 0).toFixed(2)}</span>
                </div>

                {Number(product.discount_percent || 0) > 0 && (
                  <div className={styles.productRow}>
                    <span className={styles.label}>Descuento:</span>
                    <span className={styles.value}>{Number(product.discount_percent || 0).toFixed(2)}% {product.discount_concept ? ` - ${product.discount_concept}` : ""}</span>
                  </div>
                )}

                <div className={styles.productRow}>
                  <span className={styles.label}>Existencia actual:</span>
                  <span className={`${styles.value} ${!product.tracks_inventory || Number(product.existencia || 0) > 0 ? styles.inStock : styles.outOfStock}`}>
                    {product.tracks_inventory ? `${product.existencia} unidades` : product.is_kit ? "Kit sin inventario propio" : "Sin control de inventario"}
                  </span>
                </div>

                <div className={styles.productRow}>
                  <span className={styles.label}>Estado:</span>
                  <span className={`${styles.statusBadge} ${product.is_active_in_branch ? styles.statusActive : styles.statusInactive}`}>
                    {product.is_active_in_branch ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>

              {product.is_kit && (
                <div className={styles.kitSection}>
                  <h4>Componentes del kit</h4>
                  {kitItems.length === 0 ? <div className={styles.kitEmpty}>No se encontraron componentes registrados.</div> : (
                    <div className={styles.kitList}>
                      {kitItems.map((item) => (
                        <div key={item.id} className={styles.kitItem}>
                          <div>
                            <span className={styles.kitItemName}>{item.products?.name || "Producto"}</span>
                            <div className={styles.kitItemCode}>Código: {item.products?.barcode || "Sin código"}</div>
                          </div>
                          <span className={styles.kitItemQty}>x{Number(item.quantity || 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} onClick={handleClose}>ESC - Cerrar</button>
          {product && (
            <button type="button" className={styles.addButton} onClick={handleAddToSale} disabled={!canAddToSale}>
              F1 - Agregar a la venta
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default VerifierModal;