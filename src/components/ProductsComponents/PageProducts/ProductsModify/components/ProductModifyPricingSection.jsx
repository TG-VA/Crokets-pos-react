import styles from "../ProductsModify.module.css";

const ProductModifyPricingSection = ({
  form,
  updateField,
  markTouched,
  ganancia,
  getFieldClassName,
  renderError,
  preventNumberScrollChange,
  preventNumberArrows,
}) => {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Precios y control comercial</h2>

        <p className={styles.sectionDescription}>
          Estos valores son globales y aplican en todas las sucursales.
        </p>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Precio costo global *</label>

        <input
          name="costo"
          className={getFieldClassName("costo")}
          type="number"
          inputMode="decimal"
          step="0.01"
          value={form.costo}
          onChange={(e) => updateField("costo", e.target.value)}
          onBlur={() => markTouched("costo")}
          onWheel={preventNumberScrollChange}
          onKeyDown={preventNumberArrows}
        />

        {renderError("costo")}
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Precio venta global *</label>

        <input
          name="precio"
          className={getFieldClassName("precio")}
          type="number"
          inputMode="decimal"
          step="0.01"
          value={form.precio}
          onChange={(e) => updateField("precio", e.target.value)}
          onBlur={() => markTouched("precio")}
          onWheel={preventNumberScrollChange}
          onKeyDown={preventNumberArrows}
        />

        {renderError("precio")}
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Ganancia (%)</label>

        <input
          className={styles.input}
          type="text"
          value={Number.isFinite(ganancia) ? ganancia.toFixed(2) : "0.00"}
          readOnly
          tabIndex={-1}
        />
      </div>

      <div className={styles.sectionTitleInline}>Comisiones</div>

      <div className={styles.formRow}>
        <label className={styles.label}>Genera comisión</label>

        <select
          className={styles.input}
          value={form.commission_enabled ? "activo" : "inactivo"}
          onChange={(e) =>
            updateField("commission_enabled", e.target.value === "activo")
          }
        >
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Tipo de comisión</label>

        <select
          className={styles.input}
          value={form.commission_type || "percent"}
          onChange={(e) => updateField("commission_type", e.target.value)}
          disabled={!form.commission_enabled}
        >
          <option value="percent">Porcentaje (%)</option>
          <option value="flat">Monto Fijo (Moneda)</option>
        </select>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>
          {form.commission_type === "percent"
            ? "Porcentaje comisión (%)"
            : "Valor de comisión"}
        </label>

        <input
          name="commission_value"
          className={getFieldClassName("commission_value")}
          type="number"
          inputMode="decimal"
          step="0.01"
          value={form.commission_value}
          onChange={(e) => updateField("commission_value", e.target.value)}
          onBlur={() => markTouched("commission_value")}
          onWheel={preventNumberScrollChange}
          onKeyDown={preventNumberArrows}
          disabled={!form.commission_enabled}
        />

        {renderError("commission_value")}
      </div>
    </section>
  );
};

export default ProductModifyPricingSection;
