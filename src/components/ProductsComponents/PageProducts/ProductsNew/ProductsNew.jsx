import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useProducts } from "../../../../contexts/ProductsContext";
import styles from "./ProductsNew.module.css";

const ProductsNew = () => {
  const bodyRef = useRef(null);
  const [submitArmed, setSubmitArmed] = useState(false);
  const { departments, addProduct, getProductByCodigo } = useProducts();
  const discountAnchorRef = useRef(null);
  const discountInputRef = useRef(null);
  const [discountPopoverStyle, setDiscountPopoverStyle] = useState(null);
  const [showDiscountPopover, setShowDiscountPopover] = useState(false);

  const [form, setForm] = useState({
    codigo: "",
    descripcion: "",
    costo: "",
    precio: "",
    departamento: "",
    existencia: 0,
    minimo: 0,
    maximo: 0,
    use_inventory: true,
    discount_enable: false,
    discount_percent: 0,
    discount_concept: "",
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

  const resetForm = () => {
    setForm({
      codigo: "",
      descripcion: "",
      costo: "",
      precio: "",
      departamento: "",
      existencia: 0,
      minimo: 0,
      maximo: 0,
      use_inventory: true,
      discount_enable: false,
      discount_percent: 0,
      discount_concept: "",
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
  };

  const ganancia = useMemo(() => {
    const c = parseFloat(form.costo);
    const p = parseFloat(form.precio);
    if (!isFinite(c) || !isFinite(p) || c <= 0) return 0;
    return ((p - c) / c) * 100;
  }, [form.costo, form.precio]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateDiscountPopoverPosition = () => {
    const el = discountAnchorRef.current;
    if (!el || typeof el.getBoundingClientRect !== "function") return;
    const rect = el.getBoundingClientRect();

    const desiredWidth = 420;
    const padding = 12;
    const width = Math.min(desiredWidth, window.innerWidth - padding * 2);
    const left = Math.max(padding, Math.min(rect.left, window.innerWidth - width - padding));
    const top = Math.min(rect.bottom + 10, window.innerHeight - padding);

    setDiscountPopoverStyle({ top, left, width });
  };

  useEffect(() => {
    if (!form.discount_enable || !showDiscountPopover) {
      setDiscountPopoverStyle(null);
      return;
    }

    updateDiscountPopoverPosition();

    const onResize = () => updateDiscountPopoverPosition();
    window.addEventListener("resize", onResize);

    const raf = window.requestAnimationFrame(() => {
      discountInputRef.current?.focus();
      if (typeof discountInputRef.current?.select === "function") {
        discountInputRef.current.select();
      }
    });

    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(raf);
    };
  }, [form.discount_enable, showDiscountPopover]);

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
    
    // Validar si el código ya existe
    if (getProductByCodigo(form.codigo.trim())) {
      alert("El código de producto ya existe. Por favor use uno diferente.");
      return;
    }

    const payload = {
      codigo: form.codigo.trim(),
      descripcion: form.descripcion.trim(),
      costo: parseFloat(form.costo) || 0,
      precio: parseFloat(form.precio) || 0,
      ganancia: ganancia,
      departamento: form.departamento.trim(),
      existencia: parseInt(form.existencia) || 0,
      minimo: parseInt(form.minimo) || 0,
      maximo: parseInt(form.maximo) || 0,
      use_inventory: !!form.use_inventory,
      discount_enable: !!form.discount_enable,
      discount_percent: parseFloat(form.discount_percent) || 0,
      discount_concept: form.discount_enable ? form.discount_concept.trim() : "",
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
    
    addProduct(payload);
    console.log("Nuevo producto", payload);
    alert("Producto agregado correctamente");
    resetForm();
    setShowDiscountPopover(false);
    
    // Enfocar de nuevo el primer input si es posible
    setTimeout(() => {
        const firstInput = bodyRef.current?.querySelector('input');
        if (firstInput) firstInput.focus();
    }, 0);
  };

  const SAT_CLAVE_PROD_SERV = [
    { code: "01010101", description: "No existe en el catálogo" },
    { code: "10121900", description: "Alimento para mascotas" },
    { code: "10121800", description: "Alimento para animales" },
    { code: "10111300", description: "Juguetes para mascotas" },
    { code: "42121600", description: "Servicios veterinarios" },
    { code: "10131700", description: "Productos para el cuidado de animales" },
    { code: "53131600", description: "Artículos de tocador para animales" },
    { code: "12131704", description: "Huesos o carnaza para perro" },
    { code: "12352300", description: "Productos químicos para mascotas" },
    { code: "10122100", description: "Alimento para aves" },
    { code: "10121500", description: "Alimento para ganado" },
    { code: "10121600", description: "Alimento para peces" },
  ];

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
            onChange={(e) => updateField("descripcion", e.target.value.toUpperCase())}
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

        <div className={styles.formRow} ref={discountAnchorRef}>
          <label className={styles.label}>¿Aplica descuento?</label>
          <div className={styles.discountSelectWrapper}>
            <select
              className={styles.input}
              value={form.discount_enable ? "si" : "no"}
              onChange={(e) => {
                const enabled = e.target.value === "si";
                updateField("discount_enable", enabled);
                setShowDiscountPopover(enabled);
                if (!enabled) {
                  updateField("discount_concept", "");
                  updateField("discount_percent", 0);
                }
              }}
            >
              <option value="no">No</option>
              <option value="si">Sí</option>
            </select>
            {form.discount_enable && !showDiscountPopover && (
              <button
                type="button"
                className={styles.editDiscountBtn}
                onClick={() => setShowDiscountPopover(true)}
                title="Editar descuento"
              >
                ✏️
              </button>
            )}
          </div>
        </div>

        {form.discount_enable &&
          showDiscountPopover &&
          discountPopoverStyle &&
          createPortal(
            <div
              className={styles.discountPopover}
              style={discountPopoverStyle}
              role="dialog"
              aria-label="Detalles del descuento"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setShowDiscountPopover(false);
                }
              }}
            >
              <div className={styles.discountPopoverTitle}>Detalles del descuento</div>
              <div className={styles.formRow}>
                <label className={styles.label}>Porcentaje de descuento (%)</label>
                <input
                  ref={discountInputRef}
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={form.discount_percent}
                  onChange={(e) => updateField("discount_percent", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.label}>Concepto del descuento</label>
                <input
                  className={styles.input}
                  type="text"
                  value={form.discount_concept}
                  onChange={(e) => updateField("discount_concept", e.target.value)}
                  placeholder="Ej. descuento buen fin"
                />
              </div>
              <div className={styles.discountPopoverHint}>
                Presiona <strong>Enter</strong> para cerrar y guardar
              </div>
            </div>,
            document.body
          )}

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

        <div className={styles.formRow}>
          <label className={styles.label}>¿Usa inventario?</label>
          <select
            className={styles.input}
            value={form.use_inventory ? "si" : "no"}
            onChange={(e) => updateField("use_inventory", e.target.value === "si")}
          >
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
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
              <select
                className={styles.input}
                value={form.cfdi}
                onChange={(e) => updateField("cfdi", e.target.value)}
              >
                <option value="">Selecciona...</option>
                {SAT_CLAVE_PROD_SERV.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} - {item.description}
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
