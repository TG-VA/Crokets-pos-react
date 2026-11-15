import { useProductSearchModal } from "../hooks/useProductSearchModal";
import ProductSearchDialog from "../../../ModalControls/ProductSearchDialog";
import ProductSearchResults from "../../../ModalControls/ProductSearchResults";

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
      selectDisabled={selectedIndex < 0 || !searchResults[selectedIndex]}
      onSelect={() => {
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleSelectProduct(searchResults[selectedIndex]);
        }
      }}
      onClose={handleClose}
    >
      <ProductSearchResults
        products={searchResults}
        selectedIndex={selectedIndex}
        searchTerm={searchTerm}
        emptyMessage="Ingresa nombre, código o departamento del producto"
        showPrice={false}
        resultsListRef={resultsListRef}
        onProductClick={handleSelectProduct}
      />
    </ProductSearchDialog>
  );
};

export default ProductsSearchModal;
