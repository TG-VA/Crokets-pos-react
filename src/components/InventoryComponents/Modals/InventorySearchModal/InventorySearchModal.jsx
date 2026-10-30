import InventorySearchResults from "./components/InventorySearchResults";
import useInventorySearchModal from "./hooks/useInventorySearchModal";

import styles from "./InventorySearchModal.module.css";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const InventorySearchModal = ({
  isOpen,
  onClose,
  products = [],
  selectedProductIds = [],
  onSelect,
  loading = false,
  error = null,
  restrictLocalProducts = false,
}) => {
  const {
    searchTerm,
    selectedIndex,
    searchResults,
    selectedProduct,
    selectedProductIsOpen,
    selectedProductIsDisabled,
    resultsListRef,

    isAlreadySelected,
    isProductDisabled,
    handleSearchChange,
    handleProductClick,
    handleSelectProduct,
    handleClose,
  } = useInventorySearchModal({
    isOpen,
    products,
    selectedProductIds,
    restrictLocalProducts,
    onClose,
    onSelect,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div
        className={styles.searchModal}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>Búsqueda de Productos</h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Cerrar búsqueda de productos"
          >
            <img
              src={XmarkIcon}
              alt=""
              className={styles.closeIcon}
              aria-hidden="true"
            />
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
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Escribe para filtrar (opcional)..."
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

            <div className={styles.resultsContainer}>
              <InventorySearchResults
                products={searchResults}
                selectedIndex={selectedIndex}
                searchTerm={searchTerm}
                loading={loading}
                error={error}
                resultsListRef={resultsListRef}
                isAlreadySelected={isAlreadySelected}
                isProductDisabled={isProductDisabled}
                onProductClick={handleProductClick}
              />
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.selectButton}`}
              onClick={() => {
                if (
                  selectedProduct &&
                  !selectedProductIsOpen &&
                  !selectedProductIsDisabled
                ) {
                  handleSelectProduct(selectedProduct);
                }
              }}
              disabled={
                !selectedProduct ||
                selectedProductIsOpen ||
                selectedProductIsDisabled
              }
            >
              {selectedProductIsOpen
                ? "Ya seleccionado"
                : selectedProductIsDisabled
                  ? "Producto local"
                  : "Seleccionar"}
            </button>

            <button
              type="button"
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

export default InventorySearchModal;
