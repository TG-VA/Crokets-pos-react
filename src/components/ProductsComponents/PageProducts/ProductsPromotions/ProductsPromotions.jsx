import React from "react";
import styles from "./ProductsPromotions.module.css";
import AppModal from "../../../AppModal/AppModal";
import { useProductsPromotions } from "./hooks/useProductsPromotions";
import { useKitProductSearch } from "./hooks/useKitProductSearch";

const ProductsPromotions = () => {
  const {
    form, updateField, selectedProducts, kits, selectedProductId, setSelectedProductId,
    saving, showSearchModal, setShowSearchModal, editingKit, appModal, closeAppModal,
    barcodeInputRef, selectedProductsTotal, kitPrice, kitDiscount, kitDiscountPercent,
    handleClearForm, addProductToKit, updateProductQuantity, removeSelectedProduct,
    handleSaveKit, handleEditKit, handleToggleKitStatus, handleSoftDeleteKit, showAppAlert,
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
            <div className={styles.formColumn}>
              <div className={styles.formRow}>
                <label className={styles.label}>Código de Barras</label>
                <input
                  ref={barcodeInputRef}
                  className={styles.input}
                  type="text"
                  placeholder="Código de barras del kit"
                  value={form.barcode}
                  onChange={(e) => updateField("barcode", e.target.value)}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>Descripción</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Descripción del kit"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value.toUpperCase())}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>Precio kit</label>
                <input
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>Límite por venta</label>
                <input
                  className={styles.input}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  placeholder="1"
                  value={form.max_kits_per_sale}
                  onChange={(e) => updateField("max_kits_per_sale", e.target.value)}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>Precio real</label>
                <div className={styles.summaryBox}>
                  <strong>${selectedProductsTotal.toFixed(2)}</strong>

                  {selectedProductsTotal > 0 && kitPrice > 0 && (
                    <span>
                      Ahorro: ${Math.max(kitDiscount, 0).toFixed(2)} /{" "}
                      {Math.max(kitDiscountPercent, 0).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>Agregar producto</label>
                <button
                  type="button"
                  className={[styles.btn, styles.btnSave].join(" ")}
                  onClick={() => setShowSearchModal(true)}
                >
                  F10 - Buscar producto
                </button>
              </div>
            </div>

            <div className={styles.listColumn}>
              <div className={styles.columnHeader}>Productos del kit</div>

              <div className={styles.listArea}>
                {selectedProducts.length === 0 ? (
                  <div className={styles.emptyState}>No hay productos seleccionados</div>
                ) : (
                  <div className={styles.selectedList}>
                    {selectedProducts.map((product) => {
                      const productTotal = Number(product.sale_price || 0) * Number(product.quantity || 0);

                      return (
                        <div
                          key={product.id}
                          className={[styles.productItem, selectedProductId === product.id ? styles.selectedProductItem : ""].filter(Boolean).join(" ")}
                          onClick={() => setSelectedProductId(product.id)}
                        >
                          <div>
                            <strong>{product.name}</strong>
                            <div className={styles.productMeta}>
                              Código: {product.barcode || "Sin código"} ·
                              Precio: ${Number(product.sale_price || 0).toFixed(2)} ·
                              Total: ${productTotal.toFixed(2)}
                            </div>
                          </div>

                          <input
                            className={styles.productQty}
                            type="number"
                            min="1"
                            step="1"
                            value={product.quantity}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateProductQuantity(product.id, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.actionsSection}>
            <div className={styles.leftButtons}>
              <button
                type="button"
                className={[styles.btn, styles.btnSave].join(" ")}
                onClick={handleSaveKit}
                disabled={saving}
              >
                {saving ? "Guardando..." : editingKit ? "Actualizar kit" : "Guardar kit"}
              </button>

              <button
                type="button"
                className={[styles.btn, styles.btnDelete].join(" ")}
                onClick={handleClearForm}
                disabled={saving}
              >
                Limpiar
              </button>
            </div>

            <div className={styles.rightButtons}>
              <button
                type="button"
                className={[styles.btn, styles.btnRemove].join(" ")}
                onClick={removeSelectedProduct}
                disabled={!selectedProductId}
              >
                Remover seleccionado
              </button>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>Kits registrados</div>

          <div className={styles.cardContent}>
            {kits.length === 0 ? (
              <div className={styles.emptyState}>No hay kits registrados</div>
            ) : (
              <div className={styles.kitsList}>
                {kits.map((kit) => (
                  <div
                    key={kit.id}
                    className={[styles.kitRow, editingKit?.id === kit.id ? styles.selectedProductItem : ""].filter(Boolean).join(" ")}
                  >
                    <div>
                      <strong>{kit.products?.name || "KIT"}</strong>
                      <div className={styles.productMeta}>
                        Código: {kit.products?.barcode || "Sin código"} ·
                        Precio: ${Number(kit.products?.sale_price || 0).toFixed(2)}
                      </div>
                    </div>

                    <span
                      className={[styles.kitStatus, kit.is_active ? styles.kitStatusActive : styles.kitStatusInactive].join(" ")}
                    >
                      {kit.is_active ? "Activo" : "Inactivo"}
                    </span>

                    <div className={styles.kitActions}>
                      <button
                        type="button"
                        className={[styles.btn, styles.btnSave].join(" ")}
                        onClick={() => handleEditKit(kit)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className={[styles.btn, kit.is_active ? styles.btnDelete : styles.btnSave].join(" ")}
                        onClick={() => handleToggleKitStatus(kit)}
                      >
                        {kit.is_active ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        className={[styles.btn, styles.btnRemove].join(" ")}
                        onClick={() => handleSoftDeleteKit(kit)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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

const KitProductSearchModal = ({ isOpen, onClose, onSelectProduct, showAppAlert, appModalIsOpen }) => {
  const {
    searchTerm, results, selectedIndex, setSelectedIndex, loading,
    inputRef, resultsListRef, searchProducts, handleSelect
  } = useKitProductSearch({ isOpen, onClose, onSelectProduct, showAppAlert, appModalIsOpen });

  if (!isOpen) return null;

  return (
    <div className={styles.searchOverlay} onClick={onClose}>
      <div className={styles.searchModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchHeader}>
          <h2>Búsqueda de productos</h2>
          <button type="button" className={styles.searchCloseButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.searchBody}>
          <label className={styles.searchLabel}>Nombre o código del producto:</label>
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => searchProducts(e.target.value)}
            placeholder="Escribe para buscar..."
          />
          <div className={styles.searchHint}>↑↓ Navegar · Enter seleccionar · ESC cerrar</div>

          <div ref={resultsListRef} className={styles.searchResults}>
            {loading ? (
              <div className={styles.searchEmpty}>Buscando productos...</div>
            ) : results.length === 0 ? (
              <div className={styles.searchEmpty}>
                {searchTerm.trim() ? "No se encontraron productos." : "Ingresa nombre o código del producto."}
              </div>
            ) : (
              results.map((product, index) => (
                <div
                  key={product.id}
                  data-product-index={index}
                  className={[styles.searchResultItem, index === selectedIndex ? styles.searchResultSelected : ""].filter(Boolean).join(" ")}
                  onClick={() => setSelectedIndex(index)}
                  onDoubleClick={() => handleSelect(product)}
                >
                  <strong>{product.name}</strong>
                  <div className={styles.searchResultMeta}>
                    Código: {product.barcode || "Sin código"} · Precio: ${Number(product.sale_price || 0).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.searchFooter}>
          <button
            type="button"
            className={[styles.searchActionButton, styles.searchSelectButton].join(" ")}
            onClick={() => {
              if (selectedIndex >= 0 && results[selectedIndex]) handleSelect(results[selectedIndex]);
            }}
            disabled={selectedIndex < 0}
          >
            Seleccionar
          </button>
          <button type="button" className={[styles.searchActionButton, styles.searchCancelButton].join(" ")} onClick={onClose}>
            ESC - Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductsPromotions;