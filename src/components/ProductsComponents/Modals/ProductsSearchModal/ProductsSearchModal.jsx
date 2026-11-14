import styles from "./ProductsSearchModal.module.css";
import { useProductSearchModal } from "../hooks/useProductSearchModal";
import ProductSearchDialog from "../../../ModalControls/ProductSearchDialog";

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
    <ProductSearchDialog
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      placeholder="Escribe para buscar..."
      resultsCount={searchResults.length}
      resultsContainerRef={resultsListRef}
      selectDisabled={selectedIndex < 0 || !searchResults[selectedIndex]}
      onSelect={() => {
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleSelectProduct(searchResults[selectedIndex]);
        }
      }}
      onClose={handleClose}
    >
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
              index === selectedIndex ? styles.selectedResult : "",
            ]
              .filter(Boolean)
              .join(" ");

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
                        (product.existencia || 0) > 0
                          ? styles.inStock
                          : styles.outOfStock,
                      ]
                        .filter(Boolean)
                        .join(" ")}
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
    </ProductSearchDialog>
  );
};

export default ProductsSearchModal;
