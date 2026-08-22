import React from "react";
import styles from "./ProductsSearchModal.module.css";
import { useProductSearchModal } from "../hooks/useProductSearchModal";

const ProductsSearchModal = ({ isOpen, onClose, products, onSelect }) => {
  const {
    searchTerm,
    setSearchTerm,
    selectedIndex,
    searchResults,
    resultsListRef,
    handleClose,
    handleSelectProduct,
  } = useProductSearchModal({ isOpen, onClose, products, onSelect });

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.searchModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Búsqueda de Productos</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className={styles.searchModalBody}>
          <div className={styles.searchSection}>
            <label htmlFor="searchInput">Nombre / Código / Departamento:</label>

            <div className={styles.inputContainer}>
              <input
                id="searchInput"
                type="text"
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Escribe para buscar..."
                autoFocus
              />
            </div>

            <div className={styles.searchHelp}>
              <span>↑↓ Navegar • Enter - Seleccionar • ESC - Cerrar</span>
            </div>
          </div>

          <div className={styles.resultsSection}>
            <div className={styles.resultsHeader}>
              <span>Resultados:</span>

              {searchResults.length > 0 && (
                <span className={styles.resultsCount}>
                  {searchResults.length} producto(s)
                </span>
              )}
            </div>

            <div className={styles.resultsContainer} ref={resultsListRef}>
              {searchResults.length === 0 ? (
                <div className={styles.emptyMessage}>
                  {searchTerm.trim()
                    ? "No se encontraron productos"
                    : "Ingresa nombre, código o departamento del producto"}
                </div>
              ) : (
                <div className={styles.resultsList}>
                  {searchResults.map((product, index) => {
                    // Limpieza estricta de clases dinámicas para evitar espacios colgantes
                    const itemClasses = [
                      styles.resultItem,
                      index === selectedIndex ? styles.selectedResult : ""
                    ].filter(Boolean).join(" ");

                    return (
                      <div
                        key={product.codigo}
                        className={itemClasses}
                        onClick={() => handleSelectProduct(product)}
                      >
                        <div className={styles.productInfo}>
                          <div className={styles.productName}>
                            {product.descripcion}
                          </div>

                          <div className={styles.productDetails}>
                            <span className={styles.productCode}>
                              Código: {product.codigo}
                            </span>

                            <span className={styles.productPrice}>
                              ${Number(product.precio || 0).toFixed(2)}
                            </span>

                            <span
                              className={[
                                styles.productStock,
                                (product.existencia || 0) > 0 ? styles.inStock : styles.outOfStock
                              ].filter(Boolean).join(" ")}
                            >
                              Stock: {product.existencia ?? 0}
                            </span>

                            <span className={styles.productCode}>
                              Dept: {product.departamento}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <div className={styles.actionButtons}>
            <button
              className={[styles.actionButton, styles.selectButton].join(" ")}
              onClick={() => {
                if (selectedIndex >= 0 && searchResults[selectedIndex]) {
                  handleSelectProduct(searchResults[selectedIndex]);
                }
              }}
              disabled={selectedIndex < 0 || !searchResults[selectedIndex]}
            >
              Seleccionar
            </button>

            <button
              className={[styles.actionButton, styles.cancelButton].join(" ")}
              onClick={handleClose}
            >
              ESC - Cerrar
            </button>
          </div>

          <div className={styles.actionHints}>
            <span>F10 - Buscar productos</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsSearchModal;
