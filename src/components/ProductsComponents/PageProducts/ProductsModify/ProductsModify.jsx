import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProducts } from "../../../../contexts/ProductsContext";
import { supabase } from "../../../../lib/supabaseClient";
import ProductsSearchModal from "../../Modals/ProductsSearchModal/ProductsSearchModal";
import styles from "./ProductsModify.module.css";
import AppModal from "../../../AppModal/AppModal";

const ProductsModify = () => {
  const {
    products,
    departments,
    getProductByCodigo,
    updateProductByCodigo,
    getProductDiscountByProductId,
    upsertProductDiscount,
  } = useProducts();

  const bodyRef = useRef(null);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitArmed, setSubmitArmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDiscount, setLoadingDiscount] = useState(false);
  const [satClaves, setSatClaves] = useState([]);
  const [loadingSatClaves, setLoadingSatClaves] = useState(false);
  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Entendido",
  });

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const showAppAlert = ({
    type = "info",
    title = "Aviso",
    message = "",
    confirmText = "Entendido",
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
    });
  };

  const createInitialForm = () => ({
    codigo: "",
    descripcion: "",
    costo: "",
    precio: "",
    departamento: "",
    minimo: 0,
    maximo: 0,
    use_inventory: true,
    sale_type: "unidad",
    unit: "pieza",
    tax: 16,
    cfdi: "",
    status: "activo",
    isGlobal: false,
    commission_enable: false,
    commission_percent: 0,
    discount_enable: false,
    discount_percent: 0,
    discount_price: "",
    discount_concept: "",
  });

  const createInitialTouched = () => ({
    codigo: false,
    descripcion: false,
    costo: false,
    precio: false,
    departamento: false,
    minimo: false,
    maximo: false,
    tax: false,
    commission_percent: false,
    discount_percent: false,
    discount_price: false,
    discount_concept: false,
  });

  const [form, setForm] = useState(createInitialForm);
  const [touched, setTouched] = useState(createInitialTouched);

  const usesInventory = !!form.use_inventory;

  const activeDepartments = useMemo(() => {
    const active = (departments || []).filter((dep) => dep.status === true);

    if (
      form.departamento &&
      !active.some(
        (dep) =>
          dep.name.trim().toLowerCase() ===
          form.departamento.trim().toLowerCase()
      )
    ) {
      const currentDepartment = (departments || []).find(
        (dep) =>
          dep.name.trim().toLowerCase() ===
          form.departamento.trim().toLowerCase()
      );

      if (currentDepartment) {
        return [...active, currentDepartment];
      }
    }

    return active;
  }, [departments, form.departamento]);

  useEffect(() => {
    const loadSatClaves = async () => {
      try {
        setLoadingSatClaves(true);

        const { data, error } = await supabase
          .from("sat_claves_productos_servicios")
          .select("clave, descripcion")
          .eq("status", true)
          .order("descripcion", { ascending: true });

        if (error) throw error;

        setSatClaves(data || []);
      } catch (error) {
        console.error("Error cargando claves SAT:", error);
        setSatClaves([]);
      } finally {
        setLoadingSatClaves(false);
      }
    };

    loadSatClaves();
  }, []);

  const ganancia = useMemo(() => {
    const c = parseFloat(form.costo);
    const p = parseFloat(form.precio);

    if (!isFinite(c) || !isFinite(p) || c < 0) return 0;
    if (c === 0) return p > 0 ? 100 : 0;

    return ((p - c) / c) * 100;
  }, [form.costo, form.precio]);

  const roundMoney = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    return (Math.round(number * 100) / 100).toFixed(2);
  };

  const roundPercent = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    return (Math.round(number * 100) / 100).toString();
  };

  const getDiscountPriceFromPercent = (salePrice, percent) => {
    const price = Number(salePrice);
    const discount = Number(percent);

    if (!Number.isFinite(price) || price <= 0) return "";
    if (!Number.isFinite(discount) || discount <= 0) return "";

    return roundMoney(price - price * (discount / 100));
  };

  const getDiscountPercentFromPrice = (salePrice, discountPrice) => {
    const price = Number(salePrice);
    const newPrice = Number(discountPrice);

    if (!Number.isFinite(price) || price <= 0) return "";
    if (!Number.isFinite(newPrice) || newPrice < 0) return "";

    return roundPercent(((price - newPrice) / price) * 100);
  };

  const resetTouched = () => {
    setTouched(createInitialTouched());
  };

  const resetForm = () => {
    setForm(createInitialForm());
    resetTouched();
    setSelectedProduct(null);
    setBarcode("");
    setSubmitArmed(false);
    setLoadingDiscount(false);
  };

  const markTouched = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "use_inventory" && !value) {
        next.minimo = 0;
        next.maximo = 0;
      }

      if (key === "commission_enable" && !value) {
        next.commission_percent = 0;
      }

      if (key === "precio") {
        if (next.discount_enable && Number(next.discount_percent) > 0) {
          next.discount_price = getDiscountPriceFromPercent(
            value,
            next.discount_percent
          );
        }
      }

      if (key === "discount_enable" && !value) {
        next.discount_percent = 0;
        next.discount_price = "";
        next.discount_concept = "";
      }

      if (key === "discount_percent") {
        next.discount_price = getDiscountPriceFromPercent(next.precio, value);
      }

      if (key === "discount_price") {
        next.discount_percent = getDiscountPercentFromPrice(next.precio, value);
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

  const loadProductDiscount = async (productId, salePrice) => {
    if (!productId) return;

    try {
      setLoadingDiscount(true);

      const result = await getProductDiscountByProductId(productId);

      if (!result?.success) {
        console.error(result?.error || "No se pudo cargar el descuento.");
        return;
      }

      const discount = result.data;
      const discountPercent = Number(discount?.discount_percent ?? 0);
      const discountPrice = getDiscountPriceFromPercent(
        salePrice,
        discountPercent
      );

      setForm((prev) => ({
        ...prev,
        discount_enable: !!discount?.enabled,
        discount_percent: discountPercent,
        discount_price: discount?.enabled ? discountPrice : "",
        discount_concept: discount?.discount_concept || "",
      }));
    } finally {
      setLoadingDiscount(false);
    }
  };

  const loadProduct = async (product) => {
    if (!product) return;

    setSelectedProduct(product);
    setBarcode(product.codigo ?? "");
    setSubmitArmed(false);
    resetTouched();

    const salePrice = product.precio ?? "";
    const productDepartment =
      product.departamento === "Sin departamento" ? "" : product.departamento ?? "";

    setForm({
      codigo: product.codigo ?? "",
      descripcion: product.descripcion ?? "",
      costo: (product.costo ?? "").toString(),
      precio: (salePrice ?? "").toString(),
      departamento: productDepartment,
      minimo: product.minimo ?? 0,
      maximo: product.maximo ?? 0,
      use_inventory: product.use_inventory ?? product.tracks_inventory ?? true,
      sale_type: product.sale_type ?? "unidad",
      unit: product.unit ?? "pieza",
      tax: product.tax ?? 16,
      cfdi: product.cfdi ?? "",
      status: product.status ? "activo" : "inactivo",
      isGlobal: !!product.is_global,
      commission_enable: !!product.commission_enable,
      commission_percent: product.commission_percent ?? 0,
      discount_enable: false,
      discount_percent: 0,
      discount_price: "",
      discount_concept: "",
    });

    await loadProductDiscount(product.id, salePrice);
  };

  const handleLookup = async () => {
    const cleanBarcode = barcode.trim();

    if (!cleanBarcode) {
      showAppAlert({
        type: "warning",
        title: "Código requerido",
        message: "Captura un código de barras.",
        confirmText: "Entendido",
      });
      return;
    }

    const found = getProductByCodigo(cleanBarcode);

    if (!found) {
      showAppAlert({
        type: "warning",
        title: "Producto no encontrado",
        message: "Producto no encontrado.",
        confirmText: "Entendido",
      });
      return;
    }

    await loadProduct(found);
  };

  const errors = useMemo(() => {
    const nextErrors = {};

    const codigo = form.codigo.trim();
    const descripcion = form.descripcion.trim();

    const costo =
      form.costo === "" || form.costo === null ? NaN : Number(form.costo);
    const precio =
      form.precio === "" || form.precio === null ? NaN : Number(form.precio);
    const minimo =
      form.minimo === "" || form.minimo === null ? NaN : Number(form.minimo);
    const maximo =
      form.maximo === "" || form.maximo === null ? NaN : Number(form.maximo);
    const tax = form.tax === "" || form.tax === null ? NaN : Number(form.tax);
    const commissionPercent =
      form.commission_percent === "" || form.commission_percent === null
        ? NaN
        : Number(form.commission_percent);
    const discountPercent =
      form.discount_percent === "" || form.discount_percent === null
        ? NaN
        : Number(form.discount_percent);
    const discountPrice =
      form.discount_price === "" || form.discount_price === null
        ? NaN
        : Number(form.discount_price);

    if (!codigo) {
      nextErrors.codigo = "El código de barras es obligatorio.";
    } else {
      const duplicate = getProductByCodigo(codigo);

      if (duplicate && duplicate.id !== selectedProduct?.id) {
        nextErrors.codigo = "Ya existe otro producto con ese código.";
      }
    }

    if (!descripcion) {
      nextErrors.descripcion = "La descripción es obligatoria.";
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

    if (form.discount_enable) {
      if (!Number.isFinite(discountPercent)) {
        nextErrors.discount_percent =
          "Debes capturar el porcentaje de descuento.";
      } else if (discountPercent <= 0) {
        nextErrors.discount_percent =
          "El descuento debe ser mayor a 0 cuando está activo.";
      } else if (discountPercent >= 100) {
        nextErrors.discount_percent = "El descuento debe ser menor a 100%.";
      }

      if (!Number.isFinite(discountPrice)) {
        nextErrors.discount_price = "Debes capturar el precio con descuento.";
      } else if (discountPrice <= 0) {
        nextErrors.discount_price =
          "El precio con descuento debe ser mayor a 0.";
      } else if (Number.isFinite(precio) && discountPrice >= precio) {
        nextErrors.discount_price =
          "El precio con descuento debe ser menor al precio venta global.";
      }

      if (!form.discount_concept.trim()) {
        nextErrors.discount_concept =
          "Debes capturar el concepto del descuento.";
      }
    }

    return nextErrors;
  }, [form, usesInventory, getProductByCodigo, selectedProduct?.id]);

  const isFormValid = selectedProduct && Object.keys(errors).length === 0;

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
      minimo: true,
      maximo: true,
      tax: true,
      commission_percent: true,
      discount_percent: true,
      discount_price: true,
      discount_concept: true,
    });
  };

  const focusFirstInvalidField = () => {
    const order = [
      "codigo",
      "descripcion",
      "costo",
      "precio",
      "tax",
      ...(usesInventory ? ["minimo", "maximo"] : []),
      ...(form.commission_enable ? ["commission_percent"] : []),
      ...(form.discount_enable
        ? ["discount_percent", "discount_price", "discount_concept"]
        : []),
    ];

    for (const field of order) {
      if (errors[field]) {
        const selectorMap = {
          codigo: 'input[name="codigo"]',
          descripcion: 'input[name="descripcion"]',
          costo: 'input[name="costo"]',
          precio: 'input[name="precio"]',
          tax: 'input[name="tax"]',
          minimo: 'input[name="minimo"]',
          maximo: 'input[name="maximo"]',
          commission_percent: 'input[name="commission_percent"]',
          discount_percent: 'input[name="discount_percent"]',
          discount_price: 'input[name="discount_price"]',
          discount_concept: 'input[name="discount_concept"]',
        };

        const target = bodyRef.current?.querySelector(selectorMap[field]);

        if (target) {
          target.focus();

          if (typeof target.select === "function") {
            target.select();
          }
        }

        break;
      }
    }
  };

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

  const handleSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (!selectedProduct) return;

    touchAllRelevantFields();

    if (!isFormValid) {
      focusFirstInvalidField();
      return;
    }

    try {
      setSaving(true);

      const payload = {
        codigo: form.codigo.toString().trim(),
        descripcion: form.descripcion.toString().trim(),
        costo: parseFloat(form.costo) || 0,
        precio: parseFloat(form.precio) || 0,
        ganancia,
        departamento: form.departamento.toString().trim(),
        minimo: usesInventory ? parseFloat(form.minimo) || 0 : 0,
        maximo: usesInventory ? parseFloat(form.maximo) || 0 : 0,
        use_inventory: usesInventory,
        sale_type: form.sale_type || "unidad",
        unit: form.unit || "pieza",
        tax: parseFloat(form.tax) || 0,
        cfdi: form.cfdi.toString().trim(),
        status: form.status,
        isGlobal: !!form.isGlobal,
        commission_enable: !!form.commission_enable,
        commission_percent: parseFloat(form.commission_percent) || 0,
      };

      const productResult = await updateProductByCodigo(
        selectedProduct.codigo,
        payload
      );

      if (!productResult?.success) {
        showAppAlert({
          type: "danger",
          title: "No se pudo actualizar el producto",
          message: productResult?.error || "No se pudo actualizar el producto.",
          confirmText: "Entendido",
        });
        return;
      }

      const discountResult = await upsertProductDiscount(selectedProduct.id, {
        enabled: !!form.discount_enable,
        discount_percent: parseFloat(form.discount_percent) || 0,
        discount_concept: form.discount_concept.trim(),
      });

      if (!discountResult?.success) {
        showAppAlert({
          type: "warning",
          title: "Producto modificado parcialmente",
          message:
            discountResult?.error ||
            "El producto se modificó, pero no se pudo guardar el descuento.",
          confirmText: "Entendido",
        });
        return;
      }

      showAppAlert({
        type: "success",
        title: "Producto modificado",
        message: "Producto modificado correctamente.",
        confirmText: "Entendido",
      });
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!submitArmed || appModal.isOpen) return;

    const onKeyDown = (e) => {
      if (e.key !== "Enter") return;

      e.preventDefault();
      e.stopPropagation();

      setSubmitArmed(false);
      handleSave();
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [submitArmed, isFormValid, errors, form, appModal.isOpen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (appModal.isOpen) return;

      if (e.key === "F10") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [appModal.isOpen]);

  const handleContentKeyDown = (e) => {
    if (appModal.isOpen) return;
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

      if (typeof next.select === "function") {
        next.select();
      }

      return;
    }

    if (!submitArmed) {
      setSubmitArmed(true);

      if (active && typeof active.blur === "function") {
        active.blur();
      }

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
                          updateField(
                            "descripcion",
                            e.target.value.toUpperCase()
                          )
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
                        onChange={(e) =>
                          updateField("departamento", e.target.value)
                        }
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
                        onChange={(e) =>
                          updateField("sale_type", e.target.value)
                        }
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
                        Estos valores son globales y aplican en todas las
                        sucursales.
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
                          Number.isFinite(ganancia)
                            ? ganancia.toFixed(2)
                            : "0.00"
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
                          updateField(
                            "use_inventory",
                            e.target.value === "si"
                          )
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
                          updateField(
                            "discount_enable",
                            e.target.value === "si"
                          )
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
                onClick={resetForm}
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