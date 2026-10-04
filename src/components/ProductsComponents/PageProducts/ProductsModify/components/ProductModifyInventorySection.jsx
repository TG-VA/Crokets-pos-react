import styles from "../ProductsModify.module.css";

const ProductModifyInventorySection = ({
  form,
  usesInventory,
  updateField,
  markTouched,
  selectedProduct,
  getFieldClassName,
  renderError,
  preventNumberScrollChange,
  preventNumberArrows,
}) => {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          Configuración local de inventario
        </h2>

        <p className={styles.sectionDescription}>
          Estos valores aplican solo para la sucursal actual.
        </p>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>¿Usa inventario?</label>

        <select
          className={styles.input}
          value={form.use_inventory ? "si" : "no"}
          onChange={(e) =>
            updateField("use_inventory", e.target.value === "si")
          }
        >
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
      </div>

      {!usesInventory && (
        <div className={styles.helperBox}>
          Este producto o servicio no maneja stock. El mínimo y el máximo se
          guardarán en 0 para la sucursal actual.
        </div>
      )}

      <div className={styles.infoBox}>
        La existencia actual no se modifica desde esta pantalla.
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Existencia actual</label>

        <input
          className={styles.input}
          type="text"
          value={selectedProduct?.existencia ?? 0}
          disabled
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Stock mínimo en esta sucursal</label>

        <input
          name="minimo"
          className={getFieldClassName("minimo")}
          type="number"
          inputMode="numeric"
          step="1"
          value={form.minimo}
          onChange={(e) => updateField("minimo", e.target.value)}
          onBlur={() => markTouched("minimo")}
          onWheel={preventNumberScrollChange}
          onKeyDown={preventNumberArrows}
          disabled={!usesInventory}
        />

        {renderError("minimo")}
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Stock máximo en esta sucursal</label>

        <input
          name="maximo"
          className={getFieldClassName("maximo")}
          type="number"
          inputMode="numeric"
          step="1"
          value={form.maximo}
          onChange={(e) => updateField("maximo", e.target.value)}
          onBlur={() => markTouched("maximo")}
          onWheel={preventNumberScrollChange}
          onKeyDown={preventNumberArrows}
          disabled={!usesInventory}
        />

        {renderError("maximo")}
      </div>
    </section>
  );
};

export default ProductModifyInventorySection;
