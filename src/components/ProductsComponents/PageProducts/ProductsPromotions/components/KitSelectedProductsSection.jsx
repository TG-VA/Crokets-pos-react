import styles from "../ProductsPromotions.module.css";

const KitSelectedProductsSection = ({
  selectedProducts,
  selectedProductId,
  setSelectedProductId,
  updateProductQuantity,
}) => {
  return (
    <div className={styles.listColumn}>
      <div className={styles.columnHeader}>Productos del kit</div>

      <div className={styles.listArea}>
        {selectedProducts.length === 0 ? (
          <div className={styles.emptyState}>
            No hay productos seleccionados
          </div>
        ) : (
          <div className={styles.selectedList}>
            {selectedProducts.map((product) => {
              const productTotal =
                Number(product.sale_price || 0) * Number(product.quantity || 0);

              return (
                <div
                  key={product.id}
                  className={[
                    styles.productItem,
                    selectedProductId === product.id
                      ? styles.selectedProductItem
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedProductId(product.id)}
                >
                  <div>
                    <strong>{product.name}</strong>
                    <div className={styles.productMeta}>
                      Código: {product.barcode || "Sin código"} · Precio: $
                      {Number(product.sale_price || 0).toFixed(2)} · Total: $
                      {productTotal.toFixed(2)}
                    </div>
                  </div>

                  <input
                    className={styles.productQty}
                    type="number"
                    min="1"
                    step="1"
                    value={product.quantity}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      updateProductQuantity(product.id, e.target.value)
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KitSelectedProductsSection;
