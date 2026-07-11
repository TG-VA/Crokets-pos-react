import React from "react";

import InventorySearchModal from "../../Modals/InventorySearchModal/InventorySearchModal";
import AppModal from "../../../AppModal/AppModal";

import InventoryAdjustmentForm from "./components/InventoryAdjustmentForm";
import useInventoryAdjustment from "./hooks/useInventoryAdjustment";
import useInventoryAdjustmentKeyboard from "./hooks/useInventoryAdjustmentKeyboard";

import styles from "./PageAdjustments.module.css";

const PageAdjustments = () => {
  const {
    products,
    searchModalOpen,
    barcode,
    selectedProduct,
    quantityToAdjust,
    adjustmentReason,
    adjustmentNotes,
    submitArmed,
    saving,
    appModal,

    currentStock,
    newStock,
    salePrice,

    barcodeInputRef,
    quantityInputRef,
    bodyRef,

    setSubmitArmed,
    setQuantityToAdjust,
    setAdjustmentReason,
    setAdjustmentNotes,

    openSearchModal,
    closeSearchModal,
    closeAppModal,
    cancelCurrentOperation,

    handleBarcodeChange,
    handleQuantityChange,
    handleReasonChange,
    handleNotesChange,
    handleLookup,
    loadProduct,
    handleSubmitAdjustment,
  } = useInventoryAdjustment();

  const { handleContentKeyDown } =
    useInventoryAdjustmentKeyboard({
      selectedProduct,
      submitArmed,
      saving,
      bodyRef,
      quantityInputRef,
      setQuantityToAdjust,
      setAdjustmentReason,
      setAdjustmentNotes,
      setSubmitArmed,
      openSearchModal,
      handleSubmitAdjustment,
    });

  return (
    <div className={styles.container}>
      <div
        className={styles.content}
        onKeyDown={handleContentKeyDown}
        onFocusCapture={() =>
          setSubmitArmed(false)
        }
      >
        <div className={styles.header}>
          <h1 className={styles.title}>
            Ajustes de inventario
          </h1>

          <p className={styles.subtitle}>
            Busca un producto y registra una diferencia
            positiva o negativa para corregir el inventario
            de la sucursal actual.
          </p>
        </div>

        {!selectedProduct && (
          <div className={styles.lookup}>
            <div className={styles.formRow}>
              <label className={styles.label}>
                Código de barras
              </label>

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

        <InventoryAdjustmentForm
          selectedProduct={selectedProduct}
          barcode={barcode}
          currentStock={currentStock}
          quantityToAdjust={quantityToAdjust}
          newStock={newStock}
          salePrice={salePrice}
          adjustmentReason={adjustmentReason}
          adjustmentNotes={adjustmentNotes}
          submitArmed={submitArmed}
          saving={saving}
          quantityInputRef={quantityInputRef}
          bodyRef={bodyRef}
          onQuantityChange={handleQuantityChange}
          onReasonChange={handleReasonChange}
          onNotesChange={handleNotesChange}
          onSubmitArmed={() =>
            setSubmitArmed(true)
          }
          onSubmit={handleSubmitAdjustment}
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
          onConfirm={
            appModal.onConfirm || closeAppModal
          }
          onCancel={
            appModal.onCancel || closeAppModal
          }
          onClose={closeAppModal}
        />
      </div>
    </div>
  );
};

export default PageAdjustments;