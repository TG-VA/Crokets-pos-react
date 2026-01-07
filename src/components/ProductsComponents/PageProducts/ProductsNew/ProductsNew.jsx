import React, { useMemo, useState } from "react";
import styles from "./ProductsNew.module.css";

const ProductsNew = () => {
  const [form, setForm] = useState({
    codigo: "",
    descripcion: "",
    costo: "",
    precio: "",
    departamento: "",
    proveedor: "",
    hay: "",
    minimo: "",
    maximo: "",
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      codigo: form.codigo.trim(),
      descripcion: form.descripcion.trim(),
      costo: parseFloat(form.costo) || 0,
      precio: parseFloat(form.precio) || 0,
      ganancia: ganancia,
      departamento: form.departamento.trim(),
      proveedor: form.proveedor.trim(),
      hay: parseInt(form.hay) || 0,
      minimo: parseInt(form.minimo) || 0,
      maximo: parseInt(form.maximo) || 0,
    };
    console.log("Nuevo producto", payload);
    alert("Producto preparado para guardar");
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Nuevo Producto</h1>
        </div>
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
          <input
            className={styles.input}
            type="text"
            value={form.departamento}
            onChange={(e) => updateField("departamento", e.target.value)}
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.label}>Proveedor</label>
          <input
            className={styles.input}
            type="text"
            value={form.proveedor}
            onChange={(e) => updateField("proveedor", e.target.value)}
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.label}>Hay</label>
          <input
            className={styles.input}
            type="number"
            inputMode="numeric"
            step="1"
            value={form.hay}
            onChange={(e) => updateField("hay", e.target.value)}
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

        <div className={styles.actions}>
          <button className={styles.saveButton} type="submit">Guardar</button>
        </div>
        </form>
      </div>
    </div>
  );
};

export default ProductsNew;
