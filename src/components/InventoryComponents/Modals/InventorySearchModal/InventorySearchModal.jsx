import { useCallback, useState } from "react";

import MakeGlobalConfirmModal from "./components/MakeGlobalConfirmModal";
import useInventorySearchModal from "./hooks/useInventorySearchModal";
import usePromoteLocalProduct from "./hooks/usePromoteLocalProduct";
import ProductSearchDialog from "../../../ModalControls/ProductSearchDialog";
import ProductSearchResults from "../../../ModalControls/ProductSearchResults";

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
  showStock = false,
  localBranchName = "",
}) => {
  const [promotingProduct, setPromotingProduct] = useState(null);

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
    selectedProductDisabledReason,
    resultsListRef,

    isAlreadySelected,
    isProductDisabled,
    getDisabledReason,
    handleSearchChange,
    handleProductClick,
    handleSelectProduct,
    handleClose,
  } = useInventorySearchModal({
    isOpen,
    products,
    selectedProductIds,
    restrictLocalProducts,
    showStock,
    keyboardEnabled: !promotingProduct,
    onClose,
    onSelect,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <ProductSearchDialog
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        placeholder="Escribe para filtrar (opcional)..."
        resultsCount={searchResults.length}
        selectLabel={
          selectedProductIsOpen
            ? "Ya seleccionado"
            : selectedProductDisabledReason === "outOfStock"
              ? "Sin stock"
              : selectedProductDisabledReason === "local"
                ? "Producto local"
                : "Seleccionar"
        }
        selectDisabled={
          !selectedProduct || selectedProductIsOpen || selectedProductIsDisabled
        }
        onSelect={() => {
          if (
            selectedProduct &&
            !selectedProductIsOpen &&
            !selectedProductIsDisabled
          ) {
            handleSelectProduct(selectedProduct);
          }
        }}
        onClose={handleClose}
      >
        <ProductSearchResults
          products={searchResults}
          selectedIndex={selectedIndex}
          searchTerm={searchTerm}
          loading={loading}
          error={error}
          resultsListRef={resultsListRef}
          isAlreadySelected={isAlreadySelected}
          isProductDisabled={isProductDisabled}
          getDisabledReason={getDisabledReason}
          showStock={showStock}
          localBranchName={localBranchName}
          onProductClick={handleProductClick}
          onLocalProductDoubleClick={setPromotingProduct}
        />
      </ProductSearchDialog>

      <MakeGlobalConfirmModal
        product={promotingProduct}
        saving={promoting}
        error={promoteError}
        onClose={cancelPromotion}
        onConfirm={() =>
          promote(promotingProduct.product_id ?? promotingProduct.id)
        }
      />
    </>
  );
};

export default InventorySearchModal;
