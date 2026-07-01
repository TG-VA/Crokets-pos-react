import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ProductsSearchModal.module.css";

const ProductsSearchModal = ({ isOpen, onClose, products, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const resultsListRef = useRef(null);

  const getProductName = (product) => {
    return String(
      product?.descripcion ||
        product?.nombre ||
        product?.name ||
        ""
    ).trim();
  };

  const searchResults = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();

    if (!term) return [];

    return (products || [])
      .filter((p) => {
        const code = (p?.codigo ?? "").toString().toLowerCase();
        const desc = (p?.descripcion ?? "").toString().toLowerCase();
        const dept = (p?.departamento ?? "").toString().toLowerCase();

        return (
          code.includes(term) ||
          desc.includes(term) ||
          dept.includes(term)
        );
      })
      .sort((a, b) => {
        const nameA = getProductName(a);
        const nameB = getProductName(b);

        return nameA.localeCompare(nameB, "es", {
          sensitivity: "base",
          numeric: true,
        });
      });
  }, [products, searchTerm]);

  useEffect(() => {
    if (!searchTerm.trim() || searchResults.length === 0) {
      setSelectedIndex(-1);
      return;
    }

    setSelectedIndex(0);
  }, [searchTerm, searchResults.length]);

  useEffect(() => {
    if (selectedIndex >= 0 && resultsListRef.current) {
      const container = resultsListRef.current;
      const items = container.querySelectorAll(`.${styles.resultItem}`);

      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();

        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleSelectProduct(searchResults[selectedIndex]);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, searchResults, selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;

    setSearchTerm("");
    setSelectedIndex(-1);
  }, [isOpen]);

  const handleClose = () => {
    setSearchTerm("");
    setSelectedIndex(-1);
    onClose?.();
  };

  const handleSelectProduct = (product) => {
    onSelect?.(product);
    handleClose();
  };

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
                  {searchResults.map((product, index) => (
                    <div
                      key={product.codigo}
                      className={`${styles.resultItem} ${
                        index === selectedIndex ? styles.selectedResult : ""
                      }`}
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
                            className={`${styles.productStock} ${
                              (product.existencia || 0) > 0
                                ? styles.inStock
                                : styles.outOfStock
                            }`}
                          >
                            Stock: {product.existencia ?? 0}
                          </span>

                          <span className={styles.productCode}>
                            Dept: {product.departamento}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <div className={styles.actionButtons}>
            <button
              className={`${styles.actionButton} ${styles.selectButton}`}
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
              className={`${styles.actionButton} ${styles.cancelButton}`}
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