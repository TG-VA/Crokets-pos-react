import React from "react";

import InventorySearchModal from "../../Modals/InventorySearchModal/InventorySearchModal";
import AppModal from "../../../AppModal/AppModal";

import InventoryAddForm from "./components/InventoryAddForm";
import useInventoryAdd from "./hooks/useInventoryAdd";
import useInventoryAddKeyboard from "./hooks/useInventoryAddKeyboard";

import styles from "./PageAdd.module.css";

const PageAdd = () => {
  const {
    products,
    searchModalOpen,
    barcode,
    selectedProduct,
    quantityToAdd,
    submitArmed,
    saving,
    appModal,
    currentInventory,
    newInventory,
    salePrice,
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
      </div>
    </div>
  );
};

export default PageAdd;