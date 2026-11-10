import removeIcon from "../../../../../assets/icons/xmark-solid-full.svg";
import PaginationBar from "../../../../PaginationBar/PaginationBar";
import { usePagination } from "../../../../../hooks/usePagination";
import styles from "../ProductsPromotions.module.css";
import { useKitProductBranches } from "../hooks/useKitProductBranches";
import { sanitizeIntegerInput } from "../services/kitInputSanitizers";

const PRODUCTS_PAGE_SIZE = 7;
const PRODUCTS_PAGE_SIZE_OPTIONS = [PRODUCTS_PAGE_SIZE];

const KitSelectedProductsSection = ({
  selectedProducts,
  selectedProductId,
  setSelectedProductId,
  updateProductQuantity,
  removeSelectedProduct,
}) => {
  const pagination = usePagination({
    totalItems: selectedProducts.length,
    defaultPageSize: PRODUCTS_PAGE_SIZE,
    pageSizeOptions: PRODUCTS_PAGE_SIZE_OPTIONS,
  });

  const branchesByProduct = useKitProductBranches(selectedProducts);

  return (
    <div className={styles.listColumn}>
      <div
        className={[styles.columnHeader, styles.columnHeaderWithAction].join(
          " "
        )}
      >
        <span>Productos del kit</span>
        <button
          type="button"
          className={[styles.btn, styles.btnCompact, styles.btnSoftDanger].join(
            " "
          )}
          onClick={removeSelectedProduct}
          disabled={!selectedProductId}
        >
          <img src={removeIcon} alt="" className={styles.btnIcon} />
          Remover seleccionado
        </button>
      </div>

      <div className={styles.listArea}>
        {selectedProducts.length === 0 ? (
          <div className={styles.emptyState}>
            No hay productos seleccionados. Presiona F10 para buscar
          </div>
        ) : (
          <div className={styles.selectedList}>
            {pagination.pageItems(selectedProducts).map((product) => {
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
                    <div className={styles.productNameRow}>
                      <strong>{product.name}</strong>
                      {product.is_global !== undefined && (
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
                      )}
                    </div>
                    <div className={styles.productMeta}>
                      Código: {product.barcode || "Sin código"} · Precio: $
                      {Number(product.sale_price || 0).toFixed(2)} · Total: $
                      {productTotal.toFixed(2)}
                    </div>
                    {product.is_global === false && (
                      <div className={styles.productBranches}>
                        {branchesByProduct[product.id]?.length
                          ? `Sucursales: ${branchesByProduct[product.id].join(", ")}`
                          : "Sucursales: sin sucursal asignada"}
                      </div>
                    )}
                  </div>

                  <input
                    className={styles.productQty}
                    type="text"
                    inputMode="numeric"
                    value={product.quantity}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      updateProductQuantity(
                        product.id,
                        sanitizeIntegerInput(e.target.value)
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedProducts.length > 0 && (
        <PaginationBar
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          pageSizeOptions={PRODUCTS_PAGE_SIZE_OPTIONS}
          onPageChange={pagination.handlePageChange}
          onPageSizeChange={pagination.handlePageSizeChange}
          totalItems={selectedProducts.length}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          itemsNoun="productos"
        />
      )}
    </div>
  );
};

export default KitSelectedProductsSection;
