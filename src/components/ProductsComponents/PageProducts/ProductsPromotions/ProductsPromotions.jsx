import styles from "./ProductsPromotions.module.css";
import AppModal from "../../../AppModal/AppModal";
import { useProductsPromotions } from "./hooks/useProductsPromotions";
import KitFormSection from "./components/KitFormSection";
import KitSelectedProductsSection from "./components/KitSelectedProductsSection";
import KitActionsSection from "./components/KitActionsSection";
import KitRegisteredListSection from "./components/KitRegisteredListSection";
import { useKitsList } from "./hooks/useKitsList";
import KitProductSearchModal from "./components/KitProductSearchModal";
import BranchBadgeList from "./components/BranchBadgeList";
import KitDeleteConfirmModal from "./components/KitDeleteConfirmModal";
import { useIsAdmin } from "../../../../hooks/useIsAdmin";

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
    kitMarginWarning,
    handleClearForm,
    handleCancelEdit,
    isFormComplete,
    missingFields,
    addProductToKit,
    updateProductQuantity,
    removeSelectedProduct,
    handleSaveKit,
    handleEditKit,
    handleToggleKitStatus,
    handleSoftDeleteKit,
    handleRenewKitValidity,
    deletingKit,
    confirmSoftDeleteKit,
    cancelSoftDeleteKit,
    showAppAlert,
  } = useProductsPromotions();
  const isAdmin = useIsAdmin();
  const kitsList = useKitsList(kits);

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
              kitMarginWarning={kitMarginWarning}
              onOpenSearch={() => setShowSearchModal(true)}
            />

            <KitSelectedProductsSection
              selectedProducts={selectedProducts}
              selectedProductId={selectedProductId}
              setSelectedProductId={setSelectedProductId}
              updateProductQuantity={updateProductQuantity}
              removeSelectedProduct={removeSelectedProduct}
            />
          </div>

          <KitActionsSection
            handleSaveKit={handleSaveKit}
            saving={saving}
            isFormComplete={isFormComplete}
            missingFields={missingFields}
            editingKit={editingKit}
            handleClearForm={handleClearForm}
            handleCancelEdit={handleCancelEdit}
          />
        </div>

        <KitRegisteredListSection
          kits={kits}
          visibleKits={kitsList.visibleKits}
          totalKits={kitsList.filteredKits.length}
          searchTerm={kitsList.searchTerm}
          onSearchTermChange={kitsList.setSearchTerm}
          status={kitsList.status}
          onStatusChange={kitsList.setStatus}
          sortCriterion={kitsList.sortCriterion}
          onSortCriterionChange={kitsList.setSortCriterion}
          expiringCount={kitsList.expiringCount}
          expiringKitIds={kitsList.expiringKitIds}
          expiringOnly={kitsList.expiringOnly}
          onToggleExpiringOnly={kitsList.toggleExpiringOnly}
          pagination={kitsList.pagination}
          pageSizeOptions={kitsList.pageSizeOptions}
          editingKit={editingKit}
          handleEditKit={handleEditKit}
          handleToggleKitStatus={handleToggleKitStatus}
          handleSoftDeleteKit={handleSoftDeleteKit}
          handleRenewKitValidity={handleRenewKitValidity}
          canManageKits={isAdmin}
        />
      </div>

      <KitProductSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectProduct={addProductToKit}
        showAppAlert={showAppAlert}
        appModalIsOpen={appModal.isOpen}
        addedProductIds={selectedProducts.map((p) => p.id)}
      />

      <KitDeleteConfirmModal
        key={deletingKit?.id ?? "none"}
        kit={deletingKit}
        onConfirm={confirmSoftDeleteKit}
        onCancel={cancelSoftDeleteKit}
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
      >
        {appModal.branches.length > 0 ? (
          <BranchBadgeList branches={appModal.branches} />
        ) : (
          appModal.children
        )}
      </AppModal>
    </div>
  );
};

export default ProductsPromotions;
