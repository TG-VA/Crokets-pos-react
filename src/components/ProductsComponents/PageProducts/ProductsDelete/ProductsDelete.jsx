import React, { useEffect, useRef, useState } from "react";
import { useProducts } from "../../../../contexts/ProductsContext";
import ProductsSearchModal from "../../Modals/ProductsSearchModal/ProductsSearchModal";
import styles from "./ProductsDelete.module.css";

const CONFIRM_TEXT = "ELIMINAR";

const ProductsDelete = () => {
  const { products, getProductByCodigo, deleteProductByCodigo } = useProducts();

  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "F10") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const focusBarcodeInput = () => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleLookup = () => {
    const cleanBarcode = barcode.trim();

    if (!cleanBarcode) {
      alert("Captura un código de barras.");
      return;
    }

    const found = getProductByCodigo(cleanBarcode);

    if (!found) {
      alert("Producto no encontrado.");
      setSelectedProduct(null);
      setConfirmText("");
      focusBarcodeInput();
      return;
    }

    setSelectedProduct(found);
    setConfirmText("");
  };

  const handleCancel = () => {
    setSelectedProduct(null);
    setBarcode("");
    setConfirmText("");
    focusBarcodeInput();
  };

  const handleDelete = async () => {
    if (!selectedProduct || deleting) return;

    if (confirmText.trim().toUpperCase() !== CONFIRM_TEXT) {
      alert(`Para confirmar escribe ${CONFIRM_TEXT}.`);
      return;
    }

    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar del sistema el producto "${selectedProduct.descripcion}"?\n\nEste producto ya no estará disponible para venta.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      const result = await deleteProductByCodigo(selectedProduct.codigo);

      if (!result?.success) {
        alert(result?.error || "No se pudo eliminar el producto.");
        return;
      }

      alert("Producto eliminado correctamente.");
      handleCancel();
    } finally {
      setDeleting(false);
    }
  };

  const canDelete =
    !!selectedProduct && confirmText.trim().toUpperCase() === CONFIRM_TEXT;

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
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
                autoFocus
                placeholder="Escanea el código o presiona F10 para buscar"
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
                        {selectedProduct.use_inventory ||
                        selectedProduct.tracks_inventory
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
                      disabled={deleting}
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
                disabled={deleting}
              >
                Cancelar / Buscar otro
              </button>

              <button
                className={styles.deleteButton}
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || deleting}
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
      </div>
    </div>
  );
};

export default ProductsDelete;