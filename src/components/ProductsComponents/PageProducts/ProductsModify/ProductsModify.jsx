import React from "react";
import ProductsSearchModal from "../../Modals/ProductsSearchModal/ProductsSearchModal";
import AppModal from "../../../AppModal/AppModal";
import { useProductsModify } from "./hooks/useProductsModify";
import ProductModifyLookup from "./components/ProductModifyLookup";
import ProductModifyGeneralSection from "./components/ProductModifyGeneralSection";
import ProductModifyPricingSection from "./components/ProductModifyPricingSection";
import ProductModifyInventorySection from "./components/ProductModifyInventorySection";
import ProductModifyDiscountSection from "./components/ProductModifyDiscountSection";
import ProductModifyFooter from "./components/ProductModifyFooter";
import styles from "./ProductsModify.module.css";

const ProductsModify = () => {
  const {
    products,
    searchModalOpen,
    setSearchModalOpen,
    barcode,
    setBarcode,
    selectedProduct,
    saving,
    loadingDiscount,
    satClaves,
    loadingSatClaves,
    appModal,
    closeAppModal,
    form,
    usesInventory,
    activeDepartments,
    ganancia,
    errors,
    isFormValid,
    updateField,
    markTouched,
    handleClearAndReset,
    showError,
    handleLookup,
    loadProduct,
    handleSave,
    bodyRef,
    setSubmitArmed,
    preventNumberScrollChange,
    preventNumberArrows,
    handleContentKeyDown,
  } = useProductsModify();

  const getFieldClassName = (field) =>
    [styles.input, showError(field) ? styles.inputError : ""]
      .filter(Boolean)
      .join(" ");

  const renderError = (field) =>
    showError(field) ? (
      <span className={styles.errorText}>{errors[field]}</span>
    ) : null;

  return (
    <div className={styles.container}>
      <div
        className={styles.content}
        onKeyDown={handleContentKeyDown}
        onFocusCapture={() => setSubmitArmed(false)}
      >
        <div className={styles.header}>
          <h1 className={styles.title}>Modificar producto</h1>

          <p className={styles.subtitle}>
            Busca un producto para editar sus datos globales, descuentos y
            configuración local de inventario.
          </p>

          <p className={styles.requiredNote}>
            Los campos con * son obligatorios.
          </p>
        </div>

        {!selectedProduct && (
          <ProductModifyLookup
            barcode={barcode}
            setBarcode={setBarcode}
            handleLookup={handleLookup}
          />
        )}

        {selectedProduct && (
          <>
            <div className={styles.body} ref={bodyRef}>
              <form className={styles.formLayout} onSubmit={handleSave}>
                <div className={styles.column}>
                  <ProductModifyGeneralSection
                    form={form}
                    updateField={updateField}
                    markTouched={markTouched}
                    activeDepartments={activeDepartments}
                    satClaves={satClaves}
                    loadingSatClaves={loadingSatClaves}
                    getFieldClassName={getFieldClassName}
                    renderError={renderError}
                    preventNumberScrollChange={preventNumberScrollChange}
                    preventNumberArrows={preventNumberArrows}
                  />

                  <ProductModifyPricingSection
                    form={form}
                    updateField={updateField}
                    markTouched={markTouched}
                    ganancia={ganancia}
                    getFieldClassName={getFieldClassName}
                    renderError={renderError}
                    preventNumberScrollChange={preventNumberScrollChange}
                    preventNumberArrows={preventNumberArrows}
                  />
                </div>

                <div className={styles.column}>
                  <ProductModifyInventorySection
                    form={form}
                    usesInventory={usesInventory}
                    updateField={updateField}
                    markTouched={markTouched}
                    selectedProduct={selectedProduct}
                    getFieldClassName={getFieldClassName}
                    renderError={renderError}
                    preventNumberScrollChange={preventNumberScrollChange}
                    preventNumberArrows={preventNumberArrows}
                  />

                  <ProductModifyDiscountSection
                    form={form}
                    updateField={updateField}
                    markTouched={markTouched}
                    loadingDiscount={loadingDiscount}
                    getFieldClassName={getFieldClassName}
                    renderError={renderError}
                    preventNumberScrollChange={preventNumberScrollChange}
                    preventNumberArrows={preventNumberArrows}
                  />
                </div>
              </form>
            </div>

            <ProductModifyFooter
              saving={saving}
              isFormValid={isFormValid}
              loadingDiscount={loadingDiscount}
              appModalIsOpen={appModal.isOpen}
              handleSave={handleSave}
              handleClearAndReset={handleClearAndReset}
            />
          </>
        )}

        <ProductsSearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          products={products}
          onSelect={(p) => {
            loadProduct(p);
            setSearchModalOpen(false);
          }}
        />
      </div>

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        onClose={closeAppModal}
        onConfirm={closeAppModal}
      />
    </div>
  );
};

export default ProductsModify;
