import React from "react";
import ProductsSearchModal from "../../Modals/ProductsSearchModal/ProductsSearchModal";
import AppModal from "../../../AppModal/AppModal";
import styles from "./ProductsDelete.module.css";
import { useProductsDelete } from "./hooks/useProductsDeleteDOM";

const ProductsDelete = () => {
  const {
    products,
    barcode,
    setBarcode,
    selectedProduct,
    setSelectedProduct,
    searchModalOpen,
    setSearchModalOpen,
    confirmText,
    setConfirmText,
    deleting,
    appModal,
    closeAppModal,
    inputRef,
    handleLookup,
    handleCancel,
    handleDelete,
    canDelete,
    CONFIRM_TEXT
  } = useProductsDelete();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Eliminar producto</h1>

          <p className={styles.subtitle}>
            Selecciona un producto para retirarlo del sistema.
          </p>
        </div>

        {!selectedProduct && (
          <div className={styles.lookup}>
            <div className={styles.formRow}>
              <label className={styles.label}>Código de barras</label>

              <input
                ref={inputRef}
                className={styles.input}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (appModal.isOpen) return;

                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
                autoFocus
                placeholder="Escanea el código o presiona F10 para buscar"
                disabled={appModal.isOpen}
              />
            </div>
          </div>
        )}

        {selectedProduct && (
          <div className={styles.body}>
            <div className={styles.formLayout}>
              <div className={styles.column}>
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                      Producto seleccionado
                    </h2>

                    <p className={styles.sectionDescription}>
                      Revisa que sea el producto correcto antes de eliminarlo
                      del sistema.
                    </p>
                  </div>

                  <div className={styles.infoGrid}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Código</span>
                      <span className={styles.infoValue}>
                        {selectedProduct.codigo || "Sin código"}
                      </span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Descripción</span>
                      <span className={styles.infoValue}>
                        {selectedProduct.descripcion || "Sin descripción"}
                      </span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Departamento</span>
                      <span className={styles.infoValue}>
                        {selectedProduct.departamento || "Sin departamento"}
                      </span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Precio venta</span>
                      <span className={styles.infoValue}>
                        ${Number(selectedProduct.precio || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Existencia</span>
                      <span className={styles.infoValue}>
                        {selectedProduct.use_inventory || selectedProduct.tracks_inventory
                          ? Number(selectedProduct.existencia || 0)
                          : "Sin control de inventario"}
                      </span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Global</span>
                      <span className={styles.infoValue}>
                        {selectedProduct.is_global ? "Sí" : "No"}
                      </span>
                    </div>
                  </div>
                </section>
              </div>

              <div className={styles.column}>
                <section className={styles.sectionCardDanger}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.dangerTitle}>
                      Confirmar eliminación
                    </h2>

                    <p className={styles.sectionDescription}>
                      Este producto ya no estará disponible para venderse.
                    </p>
                  </div>

                  <div className={styles.warningBox}>
                    Esta acción es irreversible. Las ventas anteriores y
                    tickets seguirán conservando la información histórica.
                  </div>

                  <div className={styles.formRow}>
                    <label className={styles.label}>
                      Escribe {CONFIRM_TEXT} para confirmar
                    </label>

                    <input
                      className={styles.input}
                      type="text"
                      value={confirmText}
                      onChange={(e) =>
                        setConfirmText(e.target.value.toUpperCase())
                      }
                      placeholder={CONFIRM_TEXT}
                      disabled={deleting || appModal.isOpen}
                    />
                  </div>
                </section>
              </div>
            </div>

            <div className={styles.bodyFooter}>
              <button
                className={styles.cancelButton}
                type="button"
                onClick={handleCancel}
                disabled={deleting || appModal.isOpen}
              >
                Cancelar / Buscar otro
              </button>

              <button
                className={styles.deleteButton}
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || deleting || appModal.isOpen}
              >
                {deleting ? "Eliminando..." : "Eliminar producto"}
              </button>
            </div>
          </div>
        )}

        <ProductsSearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          products={products}
          onSelect={(p) => {
            setBarcode(p.codigo || "");
            setSelectedProduct(p);
            setConfirmText("");
            setSearchModalOpen(false);
          }}
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

export default ProductsDelete;