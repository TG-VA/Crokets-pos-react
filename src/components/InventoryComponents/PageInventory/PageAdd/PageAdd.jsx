import InventorySearchModal from "../../Modals/InventorySearchModal/InventorySearchModal";
import AppModal from "../../../AppModal/AppModal";
import AdminAuthorizationModal from "../../../AdminAuthorizationModal/AdminAuthorizationModal";

import InventoryAddForm from "./components/InventoryAddForm";
import useInventoryAdd from "./hooks/useInventoryAdd";
import useInventoryAddKeyboard from "./hooks/useInventoryAddKeyboard";

import styles from "./PageAdd.module.css";

const PageAdd = () => {
  const {
    products,
    loadingProducts,
    productsError,
    searchModalOpen,
    barcode,
    selectedProduct,
    quantityToAdd,
    submitArmed,
    saving,
    appModal,
    reauthorizationOpen,
    branchId,
    currentInventory,
    newInventory,
    salePrice,
    costEntry,
    quantityInputRef,
    barcodeInputRef,
    bodyRef,
    setSubmitArmed,
    setQuantityToAdd,
    openSearchModal,
    closeSearchModal,
    closeAppModal,
    cancelCurrentOperation,
    handleBarcodeChange,
    handleQuantityChange,
    handleLookup,
    loadProduct,
    handleSubmit,
    closeReauthorization,
    handleReauthorized,
  } = useInventoryAdd();

  const { handleContentKeyDown } = useInventoryAddKeyboard({
    selectedProduct,
    submitArmed,
    bodyRef,
    quantityInputRef,
    setQuantityToAdd,
    setSubmitArmed,
    openSearchModal,
    handleSubmit,
  });

  return (
    <div className={styles.container}>
      <div
        className={styles.content}
        onKeyDown={handleContentKeyDown}
        onFocusCapture={() => setSubmitArmed(false)}
      >
        <div className={styles.header}>
          <h1 className={styles.title}>Agregar inventario</h1>

          <p className={styles.subtitle}>
            Busca un producto y registra una entrada para aumentar el inventario
            de la sucursal actual.
          </p>
        </div>

        {!selectedProduct && (
          <div className={styles.lookup}>
            <div className={styles.formRow}>
              <label className={styles.label}>Código de barras</label>

              <input
                ref={barcodeInputRef}
                className={styles.input}
                type="text"
                value={barcode}
                onChange={handleBarcodeChange}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleLookup();
                  }
                }}
                autoFocus
                placeholder="Escanea el código o presiona F10 para buscar"
              />
            </div>
          </div>
        )}

        <InventoryAddForm
          selectedProduct={selectedProduct}
          currentInventory={currentInventory}
          quantityToAdd={quantityToAdd}
          newInventory={newInventory}
          salePrice={salePrice}
          costEntry={costEntry}
          submitArmed={submitArmed}
          saving={saving}
          quantityInputRef={quantityInputRef}
          bodyRef={bodyRef}
          onQuantityChange={handleQuantityChange}
          onSubmitArmed={() => setSubmitArmed(true)}
          onSubmit={handleSubmit}
          onCancel={cancelCurrentOperation}
        />

        <InventorySearchModal
          isOpen={searchModalOpen}
          onClose={closeSearchModal}
          products={products}
          loading={loadingProducts}
          error={productsError}
          onSelect={loadProduct}
        />

        <AppModal
          isOpen={appModal.isOpen}
          type={appModal.type}
          title={appModal.title}
          message={appModal.message}
          confirmText={appModal.confirmText}
          cancelText={appModal.cancelText}
          showCancel={appModal.showCancel}
          loading={appModal.loading}
          onConfirm={appModal.onConfirm || closeAppModal}
          onCancel={appModal.onCancel || closeAppModal}
          onClose={closeAppModal}
        />

        <AdminAuthorizationModal
          isOpen={reauthorizationOpen}
          onClose={closeReauthorization}
          onAuthorized={handleReauthorized}
          action="inventory_add_access"
          title="Autorización vencida"
          message="La autorización para agregar inventario venció. Un administrador debe autorizar de nuevo para guardar esta entrada."
          targetId="/inventory/agregar"
          branchId={branchId}
        />
      </div>
    </div>
  );
};

export default PageAdd;
