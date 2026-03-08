import React, { useState } from "react";
import styles from "./ProductsPromotions.module.css";

const ProductsPromotions = () => {
  const [form, setForm] = useState({
    barcode: "",
    description: "",
    price: "",
    quantity: 1,
  });

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [kits, setKits] = useState([]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Promociones</h1>
        </div>

        <div className={styles.card}>
        <div className={styles.topSection}>
          {/* Form Column */}
          <div className={styles.formColumn}>
            <div className={styles.formRow}>
              <label className={styles.label}>Código de Barras</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Código de barras del Producto"
                value={form.barcode}
                onChange={(e) => updateField("barcode", e.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>Descripción kit</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Descripción del kit"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>Precio kit</label>
              <input
                className={styles.input}
                type="number"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => updateField("price", e.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>Cantidad</label>
              <input
                className={styles.input}
                type="number"
                value={form.quantity}
                onChange={(e) => updateField("quantity", e.target.value)}
              />
            </div>
          </div>

          {/* List Column */}
          <div className={styles.listColumn}>
            <div className={styles.columnHeader}>Productos seleccionados</div>
            <div className={styles.listArea}>
              {/* Items would be mapped here */}
              {selectedProducts.length === 0 && (
                <div className={styles.emptyState}>No hay productos seleccionados</div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.actionsSection}>
          <div className={styles.leftButtons}>
            <button className={`${styles.btn} ${styles.btnSave}`}>
              Guardar kit
            </button>
            <button className={`${styles.btn} ${styles.btnDelete}`}>
              Eliminar kit
            </button>
          </div>
          <div className={styles.rightButtons}>
            <button className={`${styles.btn} ${styles.btnRemove}`}>
              Remover seleccionado
            </button>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>Kits</div>
        <div className={styles.cardContent}>
          {/* Kits list would be mapped here */}
          {kits.length === 0 && (
            <div className={styles.emptyState}>No hay kits registrados</div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default ProductsPromotions;
