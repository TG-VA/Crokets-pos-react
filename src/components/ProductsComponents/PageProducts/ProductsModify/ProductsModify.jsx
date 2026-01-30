import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProducts } from "../../../../context/ProductsContext";
import ProductsSearchModal from "../../Modals/ProductsSearchModal/ProductsSearchModal";
import styles from "./ProductsModify.module.css";

const ProductsModify = () => {
  const { products, departments, getProductByCodigo, updateProductByCodigo } =
    useProducts();
  const bodyRef = useRef(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitArmed, setSubmitArmed] = useState(false);

  const [form, setForm] = useState({
    codigo: "",
    descripcion: "",
    costo: "",
    precio: "",
    departamento: "",
    existencia: 0,
    minimo: 0,
    maximo: 0,
    sale_type: "unidad",
    unit: "pz",
    tax: 16,
    cfdi: "",
    status: "activo",
    isGlobal: false,
    created_at: new Date().toISOString().slice(0, 10),
    commission_enable: false,
    commission_percent: 0,
  });

  const ganancia = useMemo(() => {
    const c = parseFloat(form.costo);
    const p = parseFloat(form.precio);
    if (!isFinite(c) || !isFinite(p) || c <= 0) return 0;
    return ((p - c) / c) * 100;
  }, [form.costo, form.precio]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadProduct = (product) => {
    if (!product) return;
    setSelectedProduct(product);
    setBarcode(product.codigo ?? "");
    setForm({
      codigo: product.codigo ?? "",
      descripcion: product.descripcion ?? "",
      costo: (product.costo ?? "").toString(),
      precio: (product.precio ?? "").toString(),
      departamento: product.departamento ?? "",
      existencia: product.existencia ?? 0,
      minimo: product.minimo ?? 0,
      maximo: product.maximo ?? 0,
      sale_type: product.sale_type ?? "unidad",
      unit: product.unit ?? "pz",
      tax: product.tax ?? 16,
      cfdi: product.cfdi ?? "",
      status: product.status ?? "activo",
      isGlobal: !!product.isGlobal,
      created_at: product.created_at ?? new Date().toISOString().slice(0, 10),
      commission_enable: !!product.commission_enable,
      commission_percent: product.commission_percent ?? 0,
    });
  };

  const handleLookup = () => {
    const found = getProductByCodigo(barcode.trim());
    if (!found) {
      alert("Producto no encontrado");
      return;
    }
    loadProduct(found);
  };

  const handleSave = () => {
    if (!selectedProduct) return;
    const payload = {
      codigo: form.codigo.toString().trim(),
      descripcion: form.descripcion.toString().trim(),
      costo: parseFloat(form.costo) || 0,
      precio: parseFloat(form.precio) || 0,
      ganancia: ganancia,
      departamento: form.departamento.toString().trim(),
      existencia: parseInt(form.existencia) || 0,
      minimo: parseInt(form.minimo) || 0,
      maximo: parseInt(form.maximo) || 0,
      sale_type: form.sale_type,
      unit: form.unit,
      tax: parseFloat(form.tax) || 0,
      cfdi: form.cfdi.toString().trim(),
      status: form.status,
      isGlobal: !!form.isGlobal,
      created_at: form.created_at,
      commission_enable: !!form.commission_enable,
      commission_percent: parseFloat(form.commission_percent) || 0,
    };

    const ok = updateProductByCodigo(selectedProduct.codigo, payload);
    if (!ok) {
      alert("No se pudo actualizar el producto");
      return;
    }
    alert("Producto modificado");
    setSelectedProduct(null);
    setBarcode("");
  };

  const getFocusableBodyElements = () => {
    if (!bodyRef.current) return [];
    const nodes = Array.from(
      bodyRef.current.querySelectorAll("input, select, textarea")
    );
    return nodes.filter((el) => {
      if (!el) return false;
      if (el.disabled) return false;
      if (el.tagName === "INPUT" && el.type === "hidden") return false;
      if (el.tabIndex === -1) return false;
      if (el.tagName === "INPUT" && el.readOnly) return false;
      return true;
    });
  };

  useEffect(() => {
    if (!submitArmed) return;
    const onKeyDown = (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      setSubmitArmed(false);
      handleSave();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [submitArmed]);

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

  const handleContentKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (!selectedProduct) return;
    if (!bodyRef.current || !bodyRef.current.contains(e.target)) return;
    e.preventDefault();

    const focusables = getFocusableBodyElements();
    const active = document.activeElement;
    const index = focusables.indexOf(active);
    if (index === -1) return;

    if (index < focusables.length - 1) {
      setSubmitArmed(false);
      const next = focusables[index + 1];
      next.focus();
      if (typeof next.select === "function") next.select();
      return;
    }

    if (!submitArmed) {
      setSubmitArmed(true);
      if (active && typeof active.blur === "function") active.blur();
      return;
    }

    setSubmitArmed(false);
    handleSave();
  };

  return (
    <div className={styles.container}>
      <div
        className={styles.content}
        onKeyDown={handleContentKeyDown}
        onFocusCapture={() => setSubmitArmed(false)}
      >
        <div className={styles.header}>
          <h1 className={styles.title}>Modificar productos</h1>
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
              <form className={styles.form}>
                <div className={styles.formRow}>
                  <label className={styles.label}>Código de barras</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={form.codigo}
                    onChange={(e) => updateField("codigo", e.target.value)}
                  />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Descripción</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={form.descripcion}
                    onChange={(e) => updateField("descripcion", e.target.value)}
                  />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Precio costo</label>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={form.costo}
                    onChange={(e) => updateField("costo", e.target.value)}
                  />
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

                <div className={styles.formRow}>
                  <label className={styles.label}>Precio venta</label>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={form.precio}
                    onChange={(e) => updateField("precio", e.target.value)}
                  />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Departamento</label>
                  <select
                    className={styles.input}
                    value={form.departamento}
                    onChange={(e) => updateField("departamento", e.target.value)}
                  >
                    <option value="">Selecciona...</option>
                    {departments.map((dep) => (
                      <option key={dep.id} value={dep.name}>
                        {dep.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Existencia</label>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="numeric"
                    step="1"
                    value={form.existencia}
                    onChange={(e) => updateField("existencia", e.target.value)}
                  />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Mínimo</label>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="numeric"
                    step="1"
                    value={form.minimo}
                    onChange={(e) => updateField("minimo", e.target.value)}
                  />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Máximo</label>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="numeric"
                    step="1"
                    value={form.maximo}
                    onChange={(e) => updateField("maximo", e.target.value)}
                  />
                </div>
              </form>

              <div className={styles.containerSecunday}>
                <form className={styles.formSecondary}>
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
                      <option value="pz">Pieza</option>
                      <option value="kg">Kilogramo</option>
                      <option value="lt">Litro</option>
                    </select>
                  </div>

                  <div className={styles.formRow}>
                    <label className={styles.label}>IVA (%)</label>
                    <input
                      className={styles.input}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={form.tax}
                      onChange={(e) => updateField("tax", e.target.value)}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <label className={styles.label}>CFDI clave SAT</label>
                    <input
                      className={styles.input}
                      type="text"
                      value={form.cfdi}
                      onChange={(e) => updateField("cfdi", e.target.value)}
                    />
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
                      onChange={(e) =>
                        updateField("isGlobal", e.target.value === "activo")
                      }
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>

                  <div className={styles.formRow}>
                    <label className={styles.label}>Fecha de creación</label>
                    <input
                      className={styles.input}
                      type="date"
                      value={form.created_at}
                      onChange={(e) => updateField("created_at", e.target.value)}
                    />
                  </div>

                  <div className={styles.sectionTitle}>Comisiones</div>

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
                    <label className={styles.label}>Porcentaje comisión (%)</label>
                    <input
                      className={styles.input}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={form.commission_percent}
                      onChange={(e) => updateField("commission_percent", e.target.value)}
                      disabled={!form.commission_enable}
                    />
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.bodyFooter}>
              <button className={styles.saveButton} type="button" onClick={handleSave}>
                Guardar
              </button>
            </div>
          </>
        )}

        <ProductsSearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          products={products}
          onSelect={(p) => loadProduct(p)}
        />
      </div>
    </div>
  );
};

export default ProductsModify;
