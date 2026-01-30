import React, { useState, useEffect, useRef } from "react";
import { useProducts } from "../../../../context/ProductsContext";
import ProductsSearchModal from "../../Modals/ProductsSearchModal/ProductsSearchModal";
import styles from "./ProductsDelete.module.css";

const ProductsDelete = () => {
  const { products, getProductByCodigo, deleteProductByCodigo } = useProducts();
  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
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

  const handleLookup = () => {
    const found = getProductByCodigo(barcode.trim());
    if (!found) {
      alert("Producto no encontrado");
      return;
    }
    setSelectedProduct(found);
  };

  const handleDelete = () => {
    if (!selectedProduct) return;
    
    if (window.confirm(`¿Estás seguro de que deseas eliminar el producto: ${selectedProduct.descripcion}?`)) {
      const success = deleteProductByCodigo(selectedProduct.codigo);
      if (success) {
        alert("Producto eliminado correctamente");
        handleCancel(); // Reset state
      } else {
        alert("Error al eliminar el producto");
      }
    }
  };

  const handleCancel = () => {
    setSelectedProduct(null);
    setBarcode("");
    if (inputRef.current) {
        setTimeout(() => inputRef.current.focus(), 0);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Eliminar productos</h1>
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
          <div className={styles.productInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Código:</span>
              <span className={styles.infoValue}>{selectedProduct.codigo}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Descripción:</span>
              <span className={styles.infoValue}>{selectedProduct.descripcion}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Departamento:</span>
              <span className={styles.infoValue}>{selectedProduct.departamento}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Existencia:</span>
              <span className={styles.infoValue}>{selectedProduct.existencia}</span>
            </div>

            <div className={styles.buttonGroup}>
              <button className={styles.cancelButton} onClick={handleCancel}>
                Cancelar / Buscar otro
              </button>
              <button className={styles.deleteButton} onClick={handleDelete}>
                Eliminar Producto
              </button>
            </div>
          </div>
        )}

        <ProductsSearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          products={products}
          onSelect={(p) => {
            setBarcode(p.codigo);
            setSelectedProduct(p);
          }}
        />
      </div>
    </div>
  );
};

export default ProductsDelete;
