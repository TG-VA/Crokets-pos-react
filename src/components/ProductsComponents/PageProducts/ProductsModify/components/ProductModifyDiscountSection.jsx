import styles from "../ProductsModify.module.css";

const ProductModifyDiscountSection = ({
  form,
  updateField,
  markTouched,
  loadingDiscount,
  getFieldClassName,
  renderError,
  preventNumberScrollChange,
  preventNumberArrows,
}) => {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Descuento del producto</h2>

        <p className={styles.sectionDescription}>
          Define si este producto tendrá un descuento automático al venderse.
        </p>
      </div>

      {loadingDiscount && (
        <div className={styles.helperBox}>
          Cargando descuento del producto...
        </div>
      )}

      <div className={styles.formRow}>
        <label className={styles.label}>¿Aplica descuento?</label>

        <select
          className={styles.input}
          value={form.discount_enable ? "si" : "no"}
          onChange={(e) =>
            updateField("discount_enable", e.target.value === "si")
          }
          disabled={loadingDiscount}
        >
          <option value="no">No</option>
          <option value="si">Sí</option>
        </select>
      </div>

      {form.discount_enable && (
        <>
          <div className={styles.formRow}>
            <label className={styles.label}>Porcentaje de descuento (%)</label>

            <input
              name="discount_percent"
              className={getFieldClassName("discount_percent")}
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.discount_percent}
              onChange={(e) => updateField("discount_percent", e.target.value)}
              onBlur={() => markTouched("discount_percent")}
              onWheel={preventNumberScrollChange}
              onKeyDown={preventNumberArrows}
              disabled={loadingDiscount}
            />

            {renderError("discount_percent")}
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Precio con descuento</label>

            <input
              name="discount_price"
              className={getFieldClassName("discount_price")}
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.discount_price}
              onChange={(e) => updateField("discount_price", e.target.value)}
              onBlur={() => markTouched("discount_price")}
              onWheel={preventNumberScrollChange}
              onKeyDown={preventNumberArrows}
              disabled={loadingDiscount}
            />

            {renderError("discount_price")}
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Concepto del descuento</label>

            <input
              name="discount_concept"
              className={getFieldClassName("discount_concept")}
              type="text"
              value={form.discount_concept}
              onChange={(e) =>
                updateField("discount_concept", e.target.value.toUpperCase())
              }
              onBlur={() => markTouched("discount_concept")}
              disabled={loadingDiscount}
            />

            {renderError("discount_concept")}
          </div>
        </>
      )}
    </section>
  );
};

export default ProductModifyDiscountSection;
