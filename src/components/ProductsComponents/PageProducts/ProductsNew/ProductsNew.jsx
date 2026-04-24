import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProducts } from "../../../../contexts/ProductsContext";
import styles from "./ProductsNew.module.css";

const ProductsNew = () => {
  const bodyRef = useRef(null);

  const { departments, addProduct, getProductByCodigo } = useProducts();

  const [submitArmed, setSubmitArmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const createInitialForm = () => ({
    codigo: "",
    descripcion: "",
    costo: "",
    precio: "",
    departamento: "",
    existencia: 0,
    minimo: 0,
    maximo: 0,
    use_inventory: true,
    sale_type: "unidad",
    unit: "pieza",
    tax: 16,
    cfdi: "",
    status: "activo",
    isGlobal: false,
    created_at: new Date().toISOString().slice(0, 10),
    commission_enable: false,
    commission_percent: 0,
  });

  const [form, setForm] = useState(createInitialForm);

  const [touched, setTouched] = useState({
    codigo: false,
    descripcion: false,
    costo: false,
    precio: false,
    departamento: false,
    existencia: false,
    minimo: false,
    maximo: false,
    tax: false,
    commission_percent: false,
  });

  const resetForm = () => {
    setForm(createInitialForm());
    setTouched({
      codigo: false,
      descripcion: false,
      costo: false,
      precio: false,
      departamento: false,
      existencia: false,
      minimo: false,
      maximo: false,
      tax: false,
      commission_percent: false,
    });
    setSubmitArmed(false);
  };

  const usesInventory = !!form.use_inventory;

  const ganancia = useMemo(() => {
    const c = parseFloat(form.costo);
    const p = parseFloat(form.precio);

    if (!isFinite(c) || !isFinite(p) || c < 0) return 0;
    if (c === 0) return p > 0 ? 100 : 0;

    return ((p - c) / c) * 100;
  }, [form.costo, form.precio]);

  const markTouched = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "use_inventory") {
        const usesInv = !!value;

        if (!usesInv) {
          next.existencia = 0;
          next.minimo = 0;
          next.maximo = 0;
        }
      }

      if (key === "commission_enable" && !value) {
        next.commission_percent = 0;
      }

      return next;
    });
  };

  const preventNumberScrollChange = (e) => {
    e.target.blur();
  };

  const preventNumberArrows = (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
    }
  };

  const errors = useMemo(() => {
    const nextErrors = {};

    const codigo = form.codigo.trim();
    const descripcion = form.descripcion.trim();
    const departamento = form.departamento.trim();

    const costo =
      form.costo === "" || form.costo === null ? NaN : Number(form.costo);
    const precio =
      form.precio === "" || form.precio === null ? NaN : Number(form.precio);
    const existencia =
      form.existencia === "" || form.existencia === null
        ? NaN
        : Number(form.existencia);
    const minimo =
      form.minimo === "" || form.minimo === null ? NaN : Number(form.minimo);
    const maximo =
      form.maximo === "" || form.maximo === null ? NaN : Number(form.maximo);
    const tax = form.tax === "" || form.tax === null ? NaN : Number(form.tax);
    const commissionPercent =
      form.commission_percent === "" || form.commission_percent === null
        ? NaN
        : Number(form.commission_percent);

    if (!codigo) {
      nextErrors.codigo = "El código de barras es obligatorio.";
    } else if (getProductByCodigo(codigo)) {
      nextErrors.codigo = "Ese código ya existe.";
    }

    if (!descripcion) {
      nextErrors.descripcion = "La descripción es obligatoria.";
    }

    if (!departamento) {
      nextErrors.departamento = "Debes seleccionar un departamento.";
    }

    if (!Number.isFinite(costo)) {
      nextErrors.costo = "Debes capturar el precio costo global.";
    } else if (costo < 0) {
      nextErrors.costo = "El precio costo global no puede ser menor a 0.";
    }

    if (!Number.isFinite(precio)) {
      nextErrors.precio = "Debes capturar el precio venta global.";
    } else if (precio <= 0) {
      nextErrors.precio = "El precio venta global debe ser mayor a 0.";
    }

    if (Number.isFinite(costo) && Number.isFinite(precio) && precio < costo) {
      nextErrors.precio =
        "El precio venta global no puede ser menor al precio costo global.";
    }

    if (!Number.isFinite(tax)) {
      nextErrors.tax = "Debes capturar el IVA.";
    } else if (tax < 0) {
      nextErrors.tax = "El IVA no puede ser negativo.";
    }

    if (usesInventory) {
      if (!Number.isFinite(existencia)) {
        nextErrors.existencia = "Debes capturar la existencia inicial.";
      } else if (existencia < 0) {
        nextErrors.existencia = "La existencia inicial no puede ser negativa.";
      }

      if (!Number.isFinite(minimo)) {
        nextErrors.minimo = "Debes capturar el stock mínimo.";
      } else if (minimo < 0) {
        nextErrors.minimo = "El stock mínimo no puede ser negativo.";
      }

      if (!Number.isFinite(maximo)) {
        nextErrors.maximo = "Debes capturar el stock máximo.";
      } else if (maximo < 0) {
        nextErrors.maximo = "El stock máximo no puede ser negativo.";
      }

      if (
        Number.isFinite(minimo) &&
        Number.isFinite(maximo) &&
        minimo > maximo
      ) {
        nextErrors.maximo =
          "El stock máximo no puede ser menor que el stock mínimo.";
      }
    }

    if (form.commission_enable) {
      if (!Number.isFinite(commissionPercent)) {
        nextErrors.commission_percent =
          "Debes capturar el porcentaje de comisión.";
      } else if (commissionPercent < 0) {
        nextErrors.commission_percent = "La comisión no puede ser negativa.";
      }
    }

    return nextErrors;
  }, [form, usesInventory, getProductByCodigo]);

  const isFormValid = Object.keys(errors).length === 0;

  const getFocusableBodyElements = () => {
    if (!bodyRef.current) return [];

    const nodes = Array.from(
      bodyRef.current.querySelectorAll("input, select, textarea, button")
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

  const showError = (field) => Boolean(touched[field] && errors[field]);

  const inputClassName = (field) =>
    `${styles.input} ${showError(field) ? styles.inputError || "" : ""}`;

  const renderError = (field) =>
    showError(field) ? (
      <span className={styles.errorText || ""}>{errors[field]}</span>
    ) : null;

  const touchAllRelevantFields = () => {
    setTouched({
      codigo: true,
      descripcion: true,
      costo: true,
      precio: true,
      departamento: true,
      existencia: true,
      minimo: true,
      maximo: true,
      tax: true,
      commission_percent: true,
    });
  };

  const focusFirstInvalidField = () => {
    const order = [
      "codigo",
      "descripcion",
      "departamento",
      "costo",
      "precio",
      "tax",
      ...(usesInventory ? ["existencia", "minimo", "maximo"] : []),
      ...(form.commission_enable ? ["commission_percent"] : []),
    ];

    for (const field of order) {
      if (errors[field]) {
        const selectorMap = {
          codigo: 'input[name="codigo"]',
          descripcion: 'input[name="descripcion"]',
          departamento: 'select[name="departamento"]',
          costo: 'input[name="costo"]',
          precio: 'input[name="precio"]',
          tax: 'input[name="tax"]',
          existencia: 'input[name="existencia"]',
          minimo: 'input[name="minimo"]',
          maximo: 'input[name="maximo"]',
          commission_percent: 'input[name="commission_percent"]',
        };

        const target = bodyRef.current?.querySelector(selectorMap[field]);
        if (target) {
          target.focus();
          if (typeof target.select === "function") target.select();
        }
        break;
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    touchAllRelevantFields();

    if (!isFormValid) {
      focusFirstInvalidField();
      return;
    }

    try {
      setSaving(true);

      const payload = {
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        costo: parseFloat(form.costo) || 0,
        precio: parseFloat(form.precio) || 0,
        ganancia,
        departamento: form.departamento.trim(),
        existencia: usesInventory ? parseFloat(form.existencia) || 0 : 0,
        minimo: usesInventory ? parseFloat(form.minimo) || 0 : 0,
        maximo: usesInventory ? parseFloat(form.maximo) || 0 : 0,
        use_inventory: usesInventory,
        sale_type: form.sale_type || "unidad",
        unit: form.unit || "pieza",
        tax: parseFloat(form.tax) || 0,
        cfdi: form.cfdi.trim(),
        status: form.status,
        isGlobal: !!form.isGlobal,
        created_at: form.created_at,
        commission_enable: !!form.commission_enable,
        commission_percent: parseFloat(form.commission_percent) || 0,
      };

      const result = await addProduct(payload);

      if (!result?.success) {
        if (result?.partial) {
          alert(
            `El producto sí se creó en el catálogo global, pero no se pudo crear su inventario en la sucursal.\n\nDetalle: ${result.error}`
          );
          return;
        }

        alert(result?.error || "Error al guardar el producto.");
        return;
      }

      alert("Producto agregado correctamente");
      resetForm();

      setTimeout(() => {
        const firstInput = bodyRef.current?.querySelector(
          'input[name="codigo"]'
        );
        if (firstInput) firstInput.focus();
      }, 0);
    } finally {
      setSaving(false);
    }
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
  }, [submitArmed, isFormValid, errors, form]);

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

          <p className={styles.subtitle}>
            Captura primero los datos generales del producto y después la
            configuración de inventario para la sucursal actual.
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
                    autoFocus
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
                  <label className={styles.label}>Departamento *</label>
                  <select
                    name="departamento"
                    className={inputClassName("departamento")}
                    value={form.departamento}
                    onChange={(e) =>
                      updateField("departamento", e.target.value)
                    }
                    onBlur={() => markTouched("departamento")}
                  >
                    <option value="">Selecciona...</option>
                    {departments.map((dep) => (
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
                      updateField(
                        "commission_enable",
                        e.target.value === "activo"
                      )
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
                    Configuración de inventario en esta sucursal
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
                    Este producto o servicio no maneja stock. La existencia, el
                    mínimo y el máximo se guardarán en 0.
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
            </div>
          </form>
        </div>

        <div className={styles.bodyFooter}>
          <button
            className={styles.saveButton}
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || saving}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductsNew;