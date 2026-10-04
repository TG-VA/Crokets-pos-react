import styles from "./ProductsPromotions.module.css";
import AppModal from "../../../AppModal/AppModal";
import { useProductsPromotions } from "./hooks/useProductsPromotions";
import KitFormSection from "./components/KitFormSection";
import KitSelectedProductsSection from "./components/KitSelectedProductsSection";
import KitActionsSection from "./components/KitActionsSection";
import KitRegisteredListSection from "./components/KitRegisteredListSection";
import KitProductSearchModal from "./components/KitProductSearchModal";

const ProductsPromotions = () => {
  const {
    form,
    updateField,
    selectedProducts,
    kits,
    selectedProductId,
    setSelectedProductId,
    saving,
    showSearchModal,
    setShowSearchModal,
    editingKit,
    appModal,
    closeAppModal,
    barcodeInputRef,
    selectedProductsTotal,
    kitPrice,
    kitDiscount,
    kitDiscountPercent,
    handleClearForm,
    addProductToKit,
    updateProductQuantity,
    removeSelectedProduct,
    handleSaveKit,
    handleEditKit,
    handleToggleKitStatus,
    handleSoftDeleteKit,
    showAppAlert,
  } = useProductsPromotions();

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {editingKit ? "Editar Kit" : "Promociones y Kits"}
          </h1>
        </div>

        <div className={styles.card}>
          <div className={styles.topSection}>
            <KitFormSection
              form={form}
              updateField={updateField}
              barcodeInputRef={barcodeInputRef}
              selectedProductsTotal={selectedProductsTotal}
              kitPrice={kitPrice}
              kitDiscount={kitDiscount}
              kitDiscountPercent={kitDiscountPercent}
              onOpenSearchModal={() => setShowSearchModal(true)}
            />

            <KitSelectedProductsSection
              selectedProducts={selectedProducts}
              selectedProductId={selectedProductId}
              setSelectedProductId={setSelectedProductId}
              updateProductQuantity={updateProductQuantity}
            />
          </div>

          <KitActionsSection
            handleSaveKit={handleSaveKit}
            saving={saving}
            editingKit={editingKit}
            handleClearForm={handleClearForm}
            removeSelectedProduct={removeSelectedProduct}
            selectedProductId={selectedProductId}
          />
        </div>

        <KitRegisteredListSection
          kits={kits}
          editingKit={editingKit}
          handleEditKit={handleEditKit}
          handleToggleKitStatus={handleToggleKitStatus}
          handleSoftDeleteKit={handleSoftDeleteKit}
        />
      </div>

      <KitProductSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectProduct={addProductToKit}
        showAppAlert={showAppAlert}
        appModalIsOpen={appModal.isOpen}
      />

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        showCancel={appModal.showCancel}
        onConfirm={appModal.onConfirm || closeAppModal}
        onCancel={appModal.onCancel || closeAppModal}
        onClose={closeAppModal}
      />
    </div>
  );
};

export default ProductsPromotions;
