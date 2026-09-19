import styles from "./RewardModal.module.css";

const RewardProductSelector = ({
  productSearchTerm,
  onSearchChange,
  loadingProducts,
  saving,
  filteredProducts,
  selectedProducts,
  selectedProductCount,
  onToggleProduct,
  productsError,
}) => {
  const searchLength = productSearchTerm.trim().length;

  return (
    <div className={`${styles.fieldGroup} ${styles.productSearchBox}`}>
      <label>Productos aplicables *</label>

      <input
        type="text"
        value={productSearchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
        disabled={saving || loadingProducts}
        placeholder="Buscar producto por nombre o código..."
      />

      {loadingProducts && (
        <span className={styles.productHelpText}>Cargando productos...</span>
      )}

      {!loadingProducts && searchLength > 0 && searchLength < 2 && (
        <span className={styles.productHelpText}>
          Escribe al menos 2 caracteres para buscar productos.
        </span>
      )}

      {!loadingProducts &&
        searchLength >= 2 &&
        filteredProducts.length === 0 && (
          <span className={styles.productHelpText}>
            No hay productos con esa búsqueda.
          </span>
        )}

      {!loadingProducts && filteredProducts.length > 0 && (
        <div className={styles.productResultsBox}>
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              className={styles.productResultButton}
              onClick={() => onToggleProduct(product.id)}
              disabled={saving}
            >
              <span>
                <strong className={styles.productResultName}>
                  {product.name || "SIN NOMBRE"}
                </strong>

                {product.barcode && (
                  <small className={styles.productBarcode}>
                    ({product.barcode})
                  </small>
                )}
              </span>

              <strong className={styles.productPrice}>
                ${Number(product.sale_price || 0).toFixed(2)}
              </strong>
            </button>
          ))}
        </div>
      )}

      <div className={styles.selectedProductsBox}>
        <div className={styles.selectedProductsTitle}>
          <span>Productos seleccionados</span>
          <strong>{selectedProductCount}</strong>
        </div>

        {selectedProducts.length === 0 ? (
          <p className={styles.emptySelectedText}>
            Aún no has seleccionado productos para esta recompensa.
          </p>
        ) : (
          <div className={styles.selectedProductsList}>
            {selectedProducts.map((product) => (
              <div key={product.id} className={styles.selectedProductItem}>
                <span>
                  <strong className={styles.selectedProductName}>
                    {product.name || "SIN NOMBRE"}
                  </strong>

                  {product.barcode && (
                    <small className={styles.productBarcode}>
                      ({product.barcode})
                    </small>
                  )}
                </span>

                <button
                  type="button"
                  className={styles.removeProductButton}
                  onClick={() => onToggleProduct(product.id)}
                  disabled={saving}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {productsError && (
        <span className={styles.fieldError}>{productsError}</span>
      )}
    </div>
  );
};

export default RewardProductSelector;
