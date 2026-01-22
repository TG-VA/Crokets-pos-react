import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProducts } from "../../../../context/ProductsContext";
import styles from "./ProductsNew.module.css";

const ProductsNew = () => {
  const bodyRef = useRef(null);
  const [submitArmed, setSubmitArmed] = useState(false);
  const { departments, providers } = useProducts();

  const [form, setForm] = useState({
    codigo: "",
    descripcion: "",
    costo: "",
    precio: "",
    departamento: "",
    proveedor: "",
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
      handleSubmit();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [submitArmed]);

  const handleContentKeyDown = (e) => {
    if (e.key !== "Enter") return;
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
    handleSubmit();
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const payload = {
      codigo: form.codigo.trim(),
      descripcion: form.descripcion.trim(),
      costo: parseFloat(form.costo) || 0,
      precio: parseFloat(form.precio) || 0,
      ganancia: ganancia,
      departamento: form.departamento.trim(),
      proveedor: form.proveedor.trim(),
      existencia: parseInt(form.existencia) || 0,
      minimo: parseInt(form.minimo) || 0,
      maximo: parseInt(form.maximo) || 0,
      sale_type: form.sale_type,
      unit: form.unit,
      tax: parseFloat(form.tax) || 0,
      cfdi: form.cfdi.trim(),
      status: form.status,
      isGlobal: !!form.isGlobal,
      created_at: form.created_at,
      commission_enable: !!form.commission_enable,
      commission_percent: parseFloat(form.commission_percent) || 0,
    };
    console.log("Nuevo producto", payload);
    alert("Producto preparado para guardar");
  };

  return (
    <div className={styles.container}>
      <div
        className={styles.content}
        onKeyDown={handleContentKeyDown}
        onFocusCapture={() => setSubmitArmed(false)}
      >
        <div className={styles.header}>
          <h1 className={styles.title}>Nuevo Producto</h1>
        </div>
        <div className={styles.body} ref={bodyRef}>
        <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <label className={styles.label}>Código de barras</label>
          <input
            className={styles.input}
            type="text"
            value={form.codigo}
            onChange={(e) => updateField("codigo", e.target.value)}
            autoFocus
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
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formRow}>
          <label className={styles.label}>Proveedor</label>
          <select
            className={styles.input}
            value={form.proveedor}
            onChange={(e) => updateField("proveedor", e.target.value)}
          >
            <option value="">Selecciona...</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
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
          <form className={styles.formSecondary} onSubmit={handleSubmit}>
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
                onChange={(e) => updateField("isGlobal", e.target.value === "activo")}
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
          <button className={styles.saveButton} type="button" onClick={handleSubmit}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

export default ProductsNew;
