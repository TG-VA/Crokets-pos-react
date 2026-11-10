import styles from "../ProductsPromotions.module.css";
import { useKitProductSearch } from "../hooks/useKitProductSearch";

const KitProductSearchModal = ({
  isOpen,
  onClose,
  onSelectProduct,
  showAppAlert,
  appModalIsOpen,
  addedProductIds,
}) => {
  const {
    searchTerm,
    results,
    selectedIndex,
    setSelectedIndex,
    loading,
    inputRef,
    resultsListRef,
    searchProducts,
    handleSelect,
    isAdded,
  } = useKitProductSearch({
    isOpen,
    onClose,
    onSelectProduct,
    showAppAlert,
    appModalIsOpen,
    addedProductIds,
  });

  if (!isOpen) return null;

  return (
    <div className={styles.searchOverlay} onClick={onClose}>
      <div className={styles.searchModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchHeader}>
          <h2>Búsqueda de productos</h2>
        </div>

        <div className={styles.searchBody}>
          <label className={styles.searchLabel}>
            Nombre o código del producto:
          </label>
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => searchProducts(e.target.value)}
            placeholder="Escribe para buscar..."
          />
          <div className={styles.searchHint}>
            ↑↓ Navegar · Enter seleccionar · ESC cerrar
          </div>

          <div ref={resultsListRef} className={styles.searchResults}>
            {loading ? (
              <div className={styles.searchEmpty}>Buscando productos...</div>
            ) : results.length === 0 ? (
              <div className={styles.searchEmpty}>
                {searchTerm.trim()
                  ? "No se encontraron productos."
                  : "Ingresa nombre o código del producto."}
              </div>
            ) : (
              results.map((product, index) => {
                const added = isAdded(product);
                return (
                  <div
                    key={product.id}
                    data-product-index={index}
                    className={[
                      styles.searchResultItem,
                      index === selectedIndex && !added
                        ? styles.searchResultSelected
                        : "",
                      added ? styles.searchResultDisabled : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-disabled={added}
                    onClick={() => {
                      if (!added) setSelectedIndex(index);
                    }}
                    onDoubleClick={() => handleSelect(product)}
                  >
                    <div className={styles.searchResultTitle}>
                      <strong>{product.name}</strong>
                      <span
                        className={[
                          styles.scopeBadge,
                          product.is_global === false
                            ? styles.scopeBadgeLocal
                            : styles.scopeBadgeGlobal,
                        ].join(" ")}
                      >
                        {product.is_global === false ? "Local" : "Global"}
                      </span>
                      {added && (
                        <span className={styles.addedBadge}>Ya agregado</span>
                      )}
                    </div>
                    <div className={styles.searchResultMeta}>
                      Código: {product.barcode || "Sin código"} · Precio: $
                      {Number(product.sale_price || 0).toFixed(2)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.searchFooter}>
          <button
            type="button"
            className={[
              styles.searchActionButton,
              styles.searchSelectButton,
            ].join(" ")}
            onClick={() => {
              if (selectedIndex >= 0 && results[selectedIndex])
                handleSelect(results[selectedIndex]);
            }}
            disabled={selectedIndex < 0 || isAdded(results[selectedIndex])}
          >
            Seleccionar
          </button>
          <button
            type="button"
            className={[
              styles.searchActionButton,
              styles.searchCancelButton,
            ].join(" ")}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default KitProductSearchModal;
