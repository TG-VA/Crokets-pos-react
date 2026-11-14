import { useCallback, useId, useState } from "react";

import InventorySearchResults from "./components/InventorySearchResults";
import MakeGlobalConfirmModal from "./components/MakeGlobalConfirmModal";
import useInventorySearchModal from "./hooks/useInventorySearchModal";
import usePromoteLocalProduct from "./hooks/usePromoteLocalProduct";

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
  onProductPromoted,
}) => {
  const [promotingProduct, setPromotingProduct] = useState(null);
  const titleId = useId();

  const handlePromoted = useCallback(() => {
    setPromotingProduct(null);
    onProductPromoted?.();
  }, [onProductPromoted]);

  const {
    saving: promoting,
    error: promoteError,
    promote,
    resetError: resetPromoteError,
  } = usePromoteLocalProduct({ onSuccess: handlePromoted });

  const cancelPromotion = () => {
    setPromotingProduct(null);
    resetPromoteError();
  };

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
    keyboardEnabled: !promotingProduct,
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
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id={titleId}>Búsqueda de Productos</h2>

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
                onLocalProductDoubleClick={setPromotingProduct}
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
        </div>
      </div>

      <MakeGlobalConfirmModal
        product={promotingProduct}
        saving={promoting}
        error={promoteError}
        onClose={cancelPromotion}
        onConfirm={() =>
          promote(promotingProduct.product_id ?? promotingProduct.id)
        }
      />
    </div>
  );
};

export default InventorySearchModal;
