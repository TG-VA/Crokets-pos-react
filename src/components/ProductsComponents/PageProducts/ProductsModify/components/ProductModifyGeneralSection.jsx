import styles from "../ProductsModify.module.css";

const ProductModifyGeneralSection = ({
  form,
  updateField,
  markTouched,
  activeDepartments,
  satClaves,
  loadingSatClaves,
  getFieldClassName,
  renderError,
  preventNumberScrollChange,
  preventNumberArrows,
}) => {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Datos generales del producto</h2>

        <p className={styles.sectionDescription}>
          Esta información pertenece al catálogo general.
        </p>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Código de barras *</label>

        <input
          name="codigo"
          className={getFieldClassName("codigo")}
          type="text"
          value={form.codigo}
          onChange={(e) => updateField("codigo", e.target.value)}
          onBlur={() => markTouched("codigo")}
        />

        {renderError("codigo")}
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Descripción *</label>

        <input
          name="descripcion"
          className={getFieldClassName("descripcion")}
          type="text"
          value={form.descripcion}
          onChange={(e) =>
            updateField("descripcion", e.target.value.toUpperCase())
          }
          onBlur={() => markTouched("descripcion")}
        />

        {renderError("descripcion")}
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Departamento</label>

        <select
          name="departamento"
          className={getFieldClassName("departamento")}
          value={form.departamento}
          onChange={(e) => updateField("departamento", e.target.value)}
          onBlur={() => markTouched("departamento")}
        >
          <option value="">Sin departamento</option>

          {activeDepartments.map((dep) => (
            <option key={dep.id} value={dep.name}>
              {dep.name}
              {dep.status === false ? " (Inactivo)" : ""}
            </option>
          ))}
        </select>

        {renderError("departamento")}
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Tipo de venta</label>

        <select
          className={styles.input}
          value={form.sale_type}
          onChange={(e) => updateField("sale_type", e.target.value)}
        >
          <option value="unidad">Por unidad</option>
          <option value="granel">A granel</option>
        </select>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Unidad</label>

        <select
          className={styles.input}
          value={form.unit}
          onChange={(e) => updateField("unit", e.target.value)}
        >
          <option value="pieza">Pieza</option>
          <option value="kg">Kilogramo</option>
          <option value="lt">Litro</option>
        </select>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>IVA (%)</label>

        <input
          name="tax"
          className={getFieldClassName("tax")}
          type="number"
          inputMode="decimal"
          step="0.01"
          value={form.tax}
          onChange={(e) => updateField("tax", e.target.value)}
          onBlur={() => markTouched("tax")}
          onWheel={preventNumberScrollChange}
          onKeyDown={preventNumberArrows}
        />

        {renderError("tax")}
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>CFDI clave SAT</label>

        <select
          className={styles.input}
          value={form.cfdi}
          onChange={(e) => updateField("cfdi", e.target.value)}
        >
          <option value="">Selecciona...</option>

          {loadingSatClaves && (
            <option value="" disabled>
              Cargando claves SAT...
            </option>
          )}

          {!loadingSatClaves &&
            satClaves.map((item) => (
              <option key={item.clave} value={item.clave}>
                {item.clave} - {item.descripcion}
              </option>
            ))}
        </select>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Estado global</label>

        <select
          className={styles.input}
          value={form.status}
          onChange={(e) => updateField("status", e.target.value)}
        >
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Global</label>

        <select
          className={styles.input}
          value={form.isGlobal ? "activo" : "inactivo"}
          onChange={(e) => updateField("isGlobal", e.target.value === "activo")}
        >
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>
    </section>
  );
};

export default ProductModifyGeneralSection;
