import React, { useEffect, memo } from "react";
import styles from "./SearchModal.module.css";
import { useBranch } from "../../../../contexts/BranchContext";
import AppModal from "../../../AppModal/AppModal";
import { useSearchModal } from "./useSearchModal";
import SearchIcon from "../../../../assets/icons/searchIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const SearchModal = memo(({ isOpen, onClose, onAddToSale, productosEnVenta = [] }) => {
  const { branch } = useBranch();
  
  const {
    searchTerm, searchResults, selectedIndex, setSelectedIndex, selectedProduct, selectedProductStocks, kitValidation, loading, loadingStocks, addingProduct, error, appModal,
    resultsListRef, searchInputRef, closeAppModal, handleClose, handleInputChange, handleSelectProduct, canAddSelectedProduct, getProductAvailableStock, getProductCartQuantity, getDisplayPrice
  } = useSearchModal({ isOpen, onClose, onAddToSale, productosEnVenta, branch });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      // Evitar que el Escape cierre toda la aplicación si el modal está abierto
      if (e.key === "Escape") { 
        e.preventDefault(); 
        e.stopPropagation(); 
        handleClose(); 
      }
      else if (e.key === "ArrowDown" && searchResults.length > 0) { e.preventDefault(); setSelectedIndex(p => p < searchResults.length - 1 ? p + 1 : p); }
      else if (e.key === "ArrowUp" && searchResults.length > 0) { e.preventDefault(); setSelectedIndex(p => p > 0 ? p - 1 : 0); }
      else if (e.key === "Enter" && searchResults.length > 0) {
        e.preventDefault(); 
        e.stopPropagation();
        if (selectedIndex >= 0) handleSelectProduct(searchResults[selectedIndex]);
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, searchResults, selectedIndex, addingProduct, handleClose, setSelectedIndex, handleSelectProduct]);

  useEffect(() => {
    if (selectedIndex >= 0 && resultsListRef.current) {
      const items = resultsListRef.current.querySelectorAll(`.${styles.resultItem}`);
      if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Manejador estricto para evitar que el click cierre el modal
  const handleModalClick = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  return (
    <div className={styles.modalOverlay} onMouseDown={handleClose}>
      <div className={styles.searchModal} onMouseDown={handleModalClick} onClick={handleModalClick}>
        <div className={styles.modalHeader}>
          <h2><span className={styles.titleContent}><img src={SearchIcon} alt="" className={styles.titleIcon} /> Búsqueda de productos</span></h2>
          <button type="button" className={styles.closeButton} onClick={handleClose}><img src={XmarkIcon} alt="" className={styles.closeIcon} /></button>
        </div>

        <div className={styles.searchModalBody}>
          <div className={styles.searchSection}>
            <label>Nombre o código del producto:</label>
            <div className={styles.inputContainer}>
              <img src={SearchIcon} alt="" className={styles.inputIcon} />
              <input 
                ref={searchInputRef} 
                type="text" 
                className={styles.searchInput} 
                value={searchTerm} 
                onChange={handleInputChange} 
                placeholder="Escribe nombre o código..." 
                autoComplete="off" 
                autoFocus
                onClick={handleModalClick} /* Blindaje extra en el input */
              />
            </div>
            <div className={styles.searchHelp}>Busca dentro de los productos vendibles para: <strong>{branch?.code ? `${branch.code} - ` : ""}{branch?.name || "Sucursal"}</strong></div>
          </div>

          <div className={styles.contentGrid}>
            <div className={styles.resultsSection}>
              <div className={styles.resultsHeader}>
                <span>Resultados de búsqueda</span>
                {loading ? <span className={styles.resultsCount}>Buscando...</span> : searchResults.length > 0 ? <span className={styles.resultsCount}>{searchResults.length} producto(s)</span> : null}
              </div>
              <div className={styles.resultsContainer} ref={resultsListRef}>
                {error ? <div className={styles.emptyMessage}>{error}</div> : loading ? <div className={styles.emptyMessage}>Cargando...</div> : searchResults.length === 0 ? <div className={styles.emptyMessage}>{searchTerm.length >= 2 ? "No se encontraron productos" : "Ingresa al menos 2 caracteres"}</div> : (
                  <div className={styles.resultsList}>
                    {searchResults.map((product, index) => {
                      const displayPrice = getDisplayPrice(product);
                      const canSell = canAddSelectedProduct(product);
                      const stock = getProductAvailableStock(product);
                      const qty = getProductCartQuantity(product.id, product.barcode, product.name);

                      return (
                        <div key={product.id} className={`${styles.resultItem} ${index === selectedIndex ? styles.selectedResult : ""} ${product.tracks_inventory && !product.is_kit && stock <= 0 ? styles.unavailableResult : ""}`} onClick={() => setSelectedIndex(index)} onDoubleClick={() => handleSelectProduct(product)}>
                          <div className={styles.productTopRow}>
                            <div className={styles.productName}>{product.name}{product.is_kit ? " (KIT)" : ""}</div>
                            <span className={`${styles.statusBadge} ${canSell ? styles.statusActive : styles.statusInactive}`}>{canSell ? "Activo" : "Sin existencia"}</span>
                          </div>
                          <div className={styles.productDetails}>
                            <span className={styles.productCode}>Código: {product.barcode || "N/A"}</span>
                            <span className={styles.productPrice}>${displayPrice.finalPrice.toFixed(2)}</span>
                            {product.discount_enabled && <span className={styles.productStock}>Desc. {product.discount_percent}%</span>}
                            <span className={`${styles.productStock} ${canSell || (!product.is_kit && !product.tracks_inventory) ? styles.inStock : styles.outOfStock}`}>
                              {product.is_kit ? (canSell ? "Kit disponible" : "Kit incompleto") : product.tracks_inventory ? `Stock: ${stock}` : "Sin control inv."}
                            </span>
                            {product.tracks_inventory && !product.is_kit && qty > 0 && <span className={styles.reservedStock}>En venta: {qty}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailCard}>
                <div className={styles.detailTitle}>Detalle del producto</div>
                {!selectedProduct ? <div className={styles.detailEmpty}>Selecciona un producto</div> : (
                  <>
                    <div className={styles.selectedProductSummary}>
                      <div className={styles.selectedProductName}>{selectedProduct.name}{selectedProduct.is_kit ? " (KIT)" : ""}</div>
                      <div className={styles.selectedProductMeta}>
                        <span>Código: {selectedProduct.barcode || "N/A"}</span>
                        <span>Precio: ${getDisplayPrice(selectedProduct).finalPrice.toFixed(2)}</span>
                        {selectedProduct.discount_enabled && <span>Descuento: {selectedProduct.discount_percent}%</span>}
                      </div>
                    </div>

                    {selectedProduct.is_kit ? (
                      <div className={styles.stockBlock}>
                        <div className={styles.stockBlockTitle}>Componentes del kit</div>
                        {kitValidation.items.length === 0 ? <div className={styles.stockLoading}>{kitValidation.message || "Validando..."}</div> : (
                          <div className={styles.branchStockList}>
                            {kitValidation.items.map(item => (
                              <div key={item.product_id} className={`${styles.branchStockItem} ${item.ok ? styles.otherBranchItem : styles.currentBranchItem}`}>
                                <div className={styles.branchStockInfo}>
                                  <div className={styles.branchStockName}>{item.name}</div>
                                  <div className={styles.branchStockMeta}>Código: {item.barcode} {item.quantityInSale > 0 && `· En venta: ${item.quantityInSale}`}</div>
                                </div>
                                <div className={styles.branchStockRight}>
                                  <span className={`${styles.branchStockQty} ${item.ok ? styles.branchStockPositive : styles.branchStockZero}`}>{item.stock}/{item.requiredQty}</span>
                                  <span className={`${styles.miniStatusBadge} ${item.ok ? styles.miniStatusActive : styles.miniStatusInactive}`}>{item.ok ? "OK" : item.reason}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : selectedProduct.tracks_inventory ? (
                      <div className={styles.stockBlock}>
                        <div className={styles.stockBlockTitle}>Existencia por sucursal</div>
                        {loadingStocks ? <div className={styles.stockLoading}>Cargando...</div> : !selectedProductStocks.length ? <div className={styles.stockLoading}>No hay existencias activas.</div> : (
                          <div className={styles.branchStockList}>
                            {selectedProductStocks.map(s => (
                              <div key={s.branch_id} className={`${styles.branchStockItem} ${s.is_current_branch ? styles.currentBranchItem : styles.otherBranchItem}`}>
                                <div className={styles.branchStockInfo}>
                                  <div className={styles.branchStockName}>{s.branch_code ? `${s.branch_code} - ` : ""}{s.branch_name}</div>
                                  <div className={styles.branchStockMeta}>{s.is_current_branch ? (s.quantity_in_sale > 0 ? `Actual · En venta: ${s.quantity_in_sale}` : "Actual") : "Consulta"}</div>
                                </div>
                                <div className={styles.branchStockRight}>
                                  <span className={`${styles.branchStockQty} ${s.stock > 0 ? styles.branchStockPositive : styles.branchStockZero}`}>{s.stock}</span>
                                  <span className={`${styles.miniStatusBadge} ${s.is_active ? styles.miniStatusActive : styles.miniStatusInactive}`}>{s.is_active ? "Activa" : "Inactiva"}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : <div className={styles.infoNotice}>Se vende sin control de existencias.</div>}

                    {selectedProduct.is_kit && <div className={kitValidation.isValid ? styles.infoNotice : styles.errorNotice}>{kitValidation.message || "Validando..."}</div>}
                    {selectedProduct.discount_enabled && (
                      <div className={styles.infoNotice}>
                        <p className={styles.discountNoticeTitle}>Descuento automático aplicado.</p>
                        {selectedProduct.discount_concept && <p className={styles.discountNoticeReason}><strong>Motivo:</strong> {selectedProduct.discount_concept}</p>}
                      </div>
                    )}
                    <div className={styles.infoNotice}>{selectedProduct.is_kit ? "Valida el stock de sus componentes restando los del carrito." : selectedProduct.tracks_inventory ? "El stock mostrado ya descuenta las piezas del carrito." : "Sin control de inventario."}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <div className={styles.actionButtons}>
            <button type="button" className={`${styles.actionButton} ${styles.addButton}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(selectedProduct) handleSelectProduct(selectedProduct); }} disabled={addingProduct || !canAddSelectedProduct(selectedProduct)}>{addingProduct ? "Agregando..." : "Agregar a la venta"}</button>
            <button type="button" className={`${styles.actionButton} ${styles.cancelButton}`} onClick={handleClose}>ESC - Cerrar</button>
          </div>
          <div className={styles.actionHints}><span>↑↓ Navegar • Enter o doble clic para agregar</span></div>
        </div>
      </div>
      <AppModal isOpen={appModal.isOpen} type={appModal.type} title={appModal.title} message={appModal.message} confirmText={appModal.confirmText} onClose={closeAppModal} onConfirm={closeAppModal} />
    </div>
  );
});

export default SearchModal;