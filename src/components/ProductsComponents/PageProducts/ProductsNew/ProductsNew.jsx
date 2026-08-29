import React from "react";
import styles from "./ProductsNew.module.css";
import AppModal from "../../../AppModal/AppModal";
import { useProductsNew } from "./hooks/useProductsNew";

const ProductsNew = () => {
  const {
    bodyRef,
    form,
    errors,
    saving,
    appModal,
    satClaves,
    loadingSatClaves,
    activeDepartments,
    ganancia,
    usesInventory,
    isFormValid,
    setSubmitArmed,
    updateField,
    markTouched,
    handleSubmit,
    closeAppModal,
    handleContentKeyDown,
    preventNumberScrollChange,
    preventNumberArrows,
    showError
  } = useProductsNew();

  const inputClassName = (field) => 
    [styles.input, showError(field) ? styles.inputError : ""].filter(Boolean).join(" ");

  const renderError = (field) =>
    showError(field) ? (
      <span className={styles.errorText || ""}>{errors[field]}</span>
    ) : null;

  return (
    <div className={styles.container}>
      <div
        className={styles.content}
        onKeyDown={handleContentKeyDown}
        onFocusCapture={() => setSubmitArmed(false)}
      >
        <div className={styles.header}>
          <h1 className={styles.title}>Nuevo Producto</h1>

          <p className={styles.subtitle}>
            Captura primero los datos generales del producto y despues la
            configuracion de inventario para la sucursal actual.
          </p>

          <p className={styles.requiredNote}>
            Los campos con * son obligatorios.
          </p>
        </div>

        <div className={styles.body} ref={bodyRef}>
          <form className={styles.formLayout} onSubmit={handleSubmit}>
            <div className={styles.column}>
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    Datos generales del producto
                  </h2>

                  <p className={styles.sectionDescription}>
                    Esta informacion pertenece al catalogo general.
                  </p>
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Codigo de barras *</label>

                  <input
                    name="codigo"
                    className={inputClassName("codigo")}
                    type="text"
                    value={form.codigo}
                    onChange={(e) => updateField("codigo", e.target.value)}
                    onBlur={() => markTouched("codigo")}
                    autoFocus
                  />

                  {renderError("codigo")}
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Descripcion *</label>

                  <input
                    name="descripcion"
                    className={inputClassName("descripcion")}
                    type="text"
                    value={form.descripcion}
                    onChange={(e) => updateField("descripcion", e.target.value.toUpperCase())}
                    onBlur={() => markTouched("descripcion")}
                  />

                  {renderError("descripcion")}
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Departamento</label>

                  <select
                    name="departamento"
                    className={inputClassName("departamento")}
                    value={form.departamento}
                    onChange={(e) => updateField("departamento", e.target.value)}
                    onBlur={() => markTouched("departamento")}
                  >
                    <option value="">Sin departamento</option>

                    {activeDepartments.map((dep) => (
                      <option key={dep.id} value={dep.name}>
                        {dep.name}
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
                    className={inputClassName("tax")}
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
                  <label className={styles.label}>Estado</label>

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

                <div className={styles.formRow}>
                  <label className={styles.label}>Fecha de creacion</label>

                  <input
                    className={styles.input}
                    type="date"
                    value={form.created_at}
                    onChange={(e) => updateField("created_at", e.target.value)}
                  />
                </div>
              </section>

              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    Precios y control comercial
                  </h2>

                  <p className={styles.sectionDescription}>
                    Estos valores son globales y aplican en todas las
                    sucursales.
                  </p>
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Precio costo global *</label>

                  <input
                    name="costo"
                    className={inputClassName("costo")}
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
                    className={inputClassName("precio")}
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
                  <label className={styles.label}>Genera comision</label>

                  <select
                    className={styles.input}
                    value={form.commission_enabled ? "activo" : "inactivo"}
                    onChange={(e) => updateField("commission_enabled", e.target.value === "activo")}
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
                    {form.commission_type === "percent" ? "Porcentaje comision (%)" : "Valor de comisión"}
                  </label>

                  <input
                    name="commission_value"
                    className={inputClassName("commission_value")}
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
            </div>

            <div className={styles.column}>
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    Configuracion de inventario en esta sucursal
                  </h2>

                  <p className={styles.sectionDescription}>
                    Estos valores aplican solo para la sucursal actual.
                  </p>
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Usa inventario?</label>

                  <select
                    className={styles.input}
                    value={form.use_inventory ? "si" : "no"}
                    onChange={(e) => updateField("use_inventory", e.target.value === "si")}
                  >
                    <option value="si">Si</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {!usesInventory && (
                  <div className={styles.helperBox}>
                    Este producto o servicio no maneja stock. La existencia, el
                    minimo y el maximo se guardaran en 0.
                  </div>
                )}

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    Existencia inicial en esta sucursal
                  </label>

                  <input
                    name="existencia"
                    className={inputClassName("existencia")}
                    type="number"
                    inputMode="numeric"
                    step="1"
                    value={form.existencia}
                    onChange={(e) => updateField("existencia", e.target.value)}
                    onBlur={() => markTouched("existencia")}
                    onWheel={preventNumberScrollChange}
                    onKeyDown={preventNumberArrows}
                    disabled={!usesInventory}
                  />

                  {renderError("existencia")}
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    Stock minimo en esta sucursal
                  </label>

                  <input
                    name="minimo"
                    className={inputClassName("minimo")}
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
                  <label className={styles.label}>
                    Stock maximo en esta sucursal
                  </label>

                  <input
                    name="maximo"
                    className={inputClassName("maximo")}
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
            </div>
          </form>
        </div>

        <div className={styles.bodyFooter}>
          <button
            className={styles.saveButton}
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || saving || appModal.isOpen}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
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

export default ProductsNew;