import {
  getProductMinStock,
  getProductStock,
  isProductBelowMinimum,
} from "../../../../../services/inventory/inventoryProductCalculationService";
import styles from "../InventorySearchModal.module.css";

const InventorySearchResults = ({
  products = [],
  selectedIndex = -1,
  searchTerm = "",
  loading = false,
  error = null,
  resultsListRef,
  isAlreadySelected,
  isProductDisabled,
  showLowStock = false,
  onProductClick,
}) => {
  if (loading) {
    return <div className={styles.emptyMessage}>Cargando inventario...</div>;
  }

  if (error) {
    return <div className={styles.emptyMessage}>{error}</div>;
  }

  if (!Array.isArray(products) || products.length === 0) {
    return (
      <div className={styles.emptyMessage}>
        {searchTerm.trim()
          ? "No se encontraron productos"
          : "No hay productos para mostrar"}
      </div>
    );
  }

  return (
    <div className={styles.resultsList} ref={resultsListRef}>
      {products.map((product, index) => {
        const alreadySelected = isAlreadySelected?.(product) === true;
        const disabled = isProductDisabled?.(product) === true;
        const belowMinimum = showLowStock && isProductBelowMinimum(product);
        const stock = getProductStock(product);
        const minStock = getProductMinStock(product);

        const itemClassName = [
          styles.resultItem,
          index === selectedIndex ? styles.selectedResult : "",
          alreadySelected ? styles.alreadySelectedResult : "",
          disabled ? styles.disabledResult : "",
        ]
          .filter(Boolean)
          .join(" ");

        const stockClassName = [
          styles.productStock,
          belowMinimum
            ? styles.lowStockText
            : stock > 0
              ? styles.inStock
              : styles.outOfStock,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={product?.product_id ?? product?.id ?? product?.codigo ?? index}
            data-search-result
            className={itemClassName}
            onClick={() => {
              if (!disabled) {
                onProductClick?.(product, index);
              }
            }}
            role="button"
            aria-disabled={alreadySelected || disabled}
          >
            <div className={styles.productInfo}>
              <div className={styles.productNameRow}>
                <div className={styles.productName}>
                  {product?.descripcion ??
                    product?.name ??
                    "Producto sin nombre"}
                </div>

                <div className={styles.productBadges}>
                  {alreadySelected ? (
                    <span className={styles.alreadySelectedBadge}>
                      YA SELECCIONADO
                    </span>
                  ) : null}

                  {disabled ? (
                    <span className={styles.localProductBadge}>
                      Producto local o no global
                    </span>
                  ) : null}

                  {belowMinimum ? (
                    <span className={styles.lowStockBadge}>Bajo mínimo</span>
                  ) : null}
                </div>
              </div>

              <div className={styles.productDetails}>
                <span className={styles.productCode}>
                  Código: {product?.codigo ?? product?.barcode ?? "—"}
                </span>

                <span className={styles.productPrice}>
                  $
                  {Number(product?.precio ?? product?.sale_price ?? 0).toFixed(
                    2
                  )}
                </span>

                <span className={stockClassName}>Stock: {stock}</span>

                {minStock > 0 ? (
                  <span className={styles.productMin}>Mínimo: {minStock}</span>
                ) : null}

                <span className={styles.productCode}>
                  Dept:{" "}
                  {product?.departamento ??
                    product?.department_name ??
                    "Sin departamento"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InventorySearchResults;
