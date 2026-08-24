import React from "react";
import ProductsSearchModal from "../../Modals/ProductsSearchModal/ProductsSearchModal";
import styles from "./ProductsModify.module.css";
import AppModal from "../../../AppModal/AppModal";
import { useProductsModify } from "./hooks/useProductsModify";

const ProductsModify = () => {
  const {
    products,
    searchModalOpen,
    setSearchModalOpen,
    barcode,
    setBarcode,
    selectedProduct,
    saving,
    loadingDiscount,
    satClaves,
    loadingSatClaves,
    appModal,
    closeAppModal,
    form,
    usesInventory,
    activeDepartments,
    ganancia,
    errors,
    isFormValid,
    updateField,
    markTouched,
    handleClearAndReset,
    showError,
    handleLookup,
    loadProduct,
    handleSave,
    bodyRef,
    setSubmitArmed,
    preventNumberScrollChange,
    preventNumberArrows,
    handleContentKeyDown,
  } = useProductsModify();

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
          <h1 className={styles.title}>Modificar producto</h1>

          <p className={styles.subtitle}>
            Busca un producto para editar sus datos globales, descuentos y
            configuración local de inventario.
          </p>

          <p className={styles.requiredNote}>
            Los campos con * son obligatorios.
          </p>
        </div>

        {!selectedProduct && (
          <div className={styles.lookup}>
            <div className={styles.formRow}>
              <label className={styles.label}>Código de barras</label>

              <input
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
          <>
            <div className={styles.body} ref={bodyRef}>
              <form className={styles.formLayout} onSubmit={handleSave}>
                <div className={styles.column}>
                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>
                        Datos generales del producto
                      </h2>

                      <p className={styles.sectionDescription}>
                        Esta información pertenece al catálogo general.
                      </p>
                    </div>

                    <div className={styles.formRow}>
                      <label className={styles.label}>Código de barras *</label>

                      <input
                        name="codigo"
                        className={inputClassName("codigo")}
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
                        className={inputClassName("descripcion")}
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
                        className={inputClassName("departamento")}
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
                        onChange={(e) =>
                          updateField("isGlobal", e.target.value === "activo")
                        }
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </div>
                  </section>

                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>
                        Precios y control comercial
                      </h2>

                      <p className={styles.sectionDescription}>
                        Estos valores son globales y aplican en todas las sucursales.
                      </p>
                    </div>

                    <div className={styles.formRow}>
                      <label className={styles.label}>
                        Precio costo global *
                      </label>

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
                      <label className={styles.label}>
                        Precio venta global *
                      </label>

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
                        value={
                          Number.isFinite(ganancia) ? ganancia.toFixed(2) : "0.00"
                        }
                        readOnly
                        tabIndex={-1}
                      />
                    </div>

                    <div className={styles.sectionTitleInline}>Comisiones</div>

                    <div className={styles.formRow}>
                      <label className={styles.label}>Genera comisión</label>

                      <select
                        className={styles.input}
                        value={form.commission_enable ? "activo" : "inactivo"}
                        onChange={(e) =>
                          updateField("commission_enable", e.target.value === "activo")
                        }
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </div>

                    <div className={styles.formRow}>
                      <label className={styles.label}>
                        Porcentaje comisión (%)
                      </label>

                      <input
                        name="commission_percent"
                        className={inputClassName("commission_percent")}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={form.commission_percent}
                        onChange={(e) =>
                          updateField("commission_percent", e.target.value)
                        }
                        onBlur={() => markTouched("commission_percent")}
                        onWheel={preventNumberScrollChange}
                        onKeyDown={preventNumberArrows}
                        disabled={!form.commission_enable}
                      />

                      {renderError("commission_percent")}
                    </div>
                  </section>
                </div>

                <div className={styles.column}>
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
                        Este producto o servicio no maneja stock. El mínimo y el
                        máximo se guardarán en 0 para la sucursal actual.
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
                      <label className={styles.label}>
                        Stock mínimo en esta sucursal
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
                        Stock máximo en esta sucursal
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

                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>
                        Descuento del producto
                      </h2>

                      <p className={styles.sectionDescription}>
                        Define si este producto tendrá un descuento automático
                        al venderse.
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
                          <label className={styles.label}>
                            Porcentaje de descuento (%)
                          </label>

                          <input
                            name="discount_percent"
                            className={inputClassName("discount_percent")}
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            value={form.discount_percent}
                            onChange={(e) =>
                              updateField("discount_percent", e.target.value)
                            }
                            onBlur={() => markTouched("discount_percent")}
                            onWheel={preventNumberScrollChange}
                            onKeyDown={preventNumberArrows}
                            disabled={loadingDiscount}
                          />

                          {renderError("discount_percent")}
                        </div>

                        <div className={styles.formRow}>
                          <label className={styles.label}>
                            Precio con descuento
                          </label>

                          <input
                            name="discount_price"
                            className={inputClassName("discount_price")}
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            value={form.discount_price}
                            onChange={(e) =>
                              updateField("discount_price", e.target.value)
                            }
                            onBlur={() => markTouched("discount_price")}
                            onWheel={preventNumberScrollChange}
                            onKeyDown={preventNumberArrows}
                            disabled={loadingDiscount}
                          />

                          {renderError("discount_price")}
                        </div>

                        <div className={styles.formRow}>
                          <label className={styles.label}>
                            Concepto del descuento
                          </label>

                          <input
                            name="discount_concept"
                            className={inputClassName("discount_concept")}
                            type="text"
                            value={form.discount_concept}
                            onChange={(e) =>
                              updateField(
                                "discount_concept",
                                e.target.value.toUpperCase()
                              )
                            }
                            onBlur={() => markTouched("discount_concept")}
                            disabled={loadingDiscount}
                          />

                          {renderError("discount_concept")}
                        </div>
                      </>
                    )}
                  </section>
                </div>
              </form>
            </div>

            <div className={styles.bodyFooter}>
              <button
                className={styles.cancelButton}
                type="button"
                onClick={handleClearAndReset}
                disabled={saving || appModal.isOpen}
              >
                Cancelar
              </button>

              <button
                className={styles.saveButton}
                type="button"
                onClick={handleSave}
                disabled={!isFormValid || saving || loadingDiscount || appModal.isOpen}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </>
        )}

        <ProductsSearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          products={products}
          onSelect={(p) => {
            loadProduct(p);
            setSearchModalOpen(false);
          }}
        />
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

export default ProductsModify;