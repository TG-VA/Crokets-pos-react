import styles from "../InventorySearchModal.module.css";

const getLocalOwners = (product) =>
  Array.isArray(product?.localBranchNames) ? product.localBranchNames : [];

const getLocalBadgeLabel = (owners) =>
  owners.length > 0
    ? `Producto local de ${owners.join(", ")}`
    : "Producto local o no global";

const getLocalHint = (owners) =>
  owners.length > 1
    ? "Debe cambiarse a global manualmente en el punto de venta de esas sucursales."
    : "Debe cambiarse a global manualmente en el punto de venta de esa sucursal.";

const InventorySearchResults = ({
  products = [],
  selectedIndex = -1,
  searchTerm = "",
  loading = false,
  error = null,
  resultsListRef,
  isAlreadySelected,
  isProductDisabled,
  onProductClick,
  onLocalProductDoubleClick,
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
        const localOwners = getLocalOwners(product);
        const price = product?.precio ?? product?.sale_price;

        const itemClassName = [
          styles.resultItem,
          index === selectedIndex ? styles.selectedResult : "",
          alreadySelected ? styles.alreadySelectedResult : "",
          disabled ? styles.disabledResult : "",
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
            onDoubleClick={() => {
              if (disabled) {
                onLocalProductDoubleClick?.(product);
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
                      {getLocalBadgeLabel(localOwners)}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className={styles.productDetails}>
                <span className={styles.productCode}>
                  Código: {product?.codigo ?? product?.barcode ?? "—"}
                </span>

                {price !== undefined && price !== null ? (
                  <span className={styles.productPrice}>
                    ${Number(price).toFixed(2)}
                  </span>
                ) : null}

                <span className={styles.productCode}>
                  Dept:{" "}
                  {product?.departamento ??
                    product?.department_name ??
                    "Sin departamento"}
                </span>
              </div>

              {disabled && localOwners.length > 0 ? (
                <div className={styles.localProductHint}>
                  {getLocalHint(localOwners)}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InventorySearchResults;
