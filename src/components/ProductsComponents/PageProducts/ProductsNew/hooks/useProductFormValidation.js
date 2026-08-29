import { useState, useMemo } from "react";

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
  commission_enabled: false,
  commission_type: "percent",
  commission_value: 0,
});

export const useProductFormValidation = (getProductByCodigo) => {
  const [form, setForm] = useState(createInitialForm);
  const [touched, setTouched] = useState({
    codigo: false, descripcion: false, costo: false, precio: false,
    departamento: false, existencia: false, minimo: false, maximo: false,
    tax: false, commission_value: false,
  });

  const resetTouched = () => {
    setTouched({
      codigo: false, descripcion: false, costo: false, precio: false,
      departamento: false, existencia: false, minimo: false, maximo: false,
      tax: false, commission_value: false,
    });
  };

  const resetForm = () => {
    setForm(createInitialForm());
    resetTouched();
  };

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "use_inventory" && !value) {
        next.existencia = 0;
        next.minimo = 0;
        next.maximo = 0;
      }
      if (key === "commission_enabled" && !value) {
        next.commission_value = 0;
      }
      return next;
    });
  };

  const markTouched = (key) => setTouched((prev) => ({ ...prev, [key]: true }));

  const touchAllRelevantFields = () => {
    setTouched({
      codigo: true, descripcion: true, costo: true, precio: true,
      departamento: true, existencia: true, minimo: true, maximo: true,
      tax: true, commission_value: true,
    });
  };

  const usesInventory = !!form.use_inventory;

  const ganancia = useMemo(() => {
    const c = parseFloat(form.costo);
    const p = parseFloat(form.precio);
    if (!isFinite(c) || !isFinite(p) || c < 0) return 0;
    if (c === 0) return p > 0 ? 100 : 0;
    return ((p - c) / c) * 100;
  }, [form.costo, form.precio]);

  const errors = useMemo(() => {
    const nextErrors = {};
    const codigo = form.codigo.trim();
    const descripcion = form.descripcion.trim();
    const costo = form.costo === "" || form.costo === null ? NaN : Number(form.costo);
    const precio = form.precio === "" || form.precio === null ? NaN : Number(form.precio);
    const tax = form.tax === "" || form.tax === null ? NaN : Number(form.tax);
    const existencia = form.existencia === "" || form.existencia === null ? NaN : Number(form.existencia);
    const minimo = form.minimo === "" || form.minimo === null ? NaN : Number(form.minimo);
    const maximo = form.maximo === "" || form.maximo === null ? NaN : Number(form.maximo);
    const commissionValue = form.commission_value === "" || form.commission_value === null ? NaN : Number(form.commission_value);

    if (!codigo) nextErrors.codigo = "El codigo de barras es obligatorio.";
    else if (getProductByCodigo(codigo)) nextErrors.codigo = "Ese codigo ya existe.";

    if (!descripcion) nextErrors.descripcion = "La descripcion es obligatoria.";

    if (!Number.isFinite(costo)) nextErrors.costo = "Debes capturar el precio costo global.";
    else if (costo < 0) nextErrors.costo = "El precio costo global no puede ser menor a 0.";

    if (!Number.isFinite(precio)) nextErrors.precio = "Debes capturar el precio venta global.";
    else if (precio <= 0) nextErrors.precio = "El precio venta global debe ser mayor a 0.";

    if (Number.isFinite(costo) && Number.isFinite(precio) && precio < costo) {
      nextErrors.precio = "El precio venta global no puede ser menor al precio costo global.";
    }

    if (!Number.isFinite(tax)) nextErrors.tax = "Debes capturar el IVA.";
    else if (tax < 0) nextErrors.tax = "El IVA no puede ser negativo.";

    if (usesInventory) {
      if (!Number.isFinite(existencia)) nextErrors.existencia = "Debes capturar la existencia inicial.";
      else if (existencia < 0) nextErrors.existencia = "La existencia inicial no puede ser negativa.";

      if (!Number.isFinite(minimo)) nextErrors.minimo = "Debes capturar el stock minimo.";
      else if (minimo < 0) nextErrors.minimo = "El stock minimo no puede ser negativo.";

      if (!Number.isFinite(maximo)) nextErrors.maximo = "Debes capturar el stock maximo.";
      else if (maximo < 0) nextErrors.maximo = "El stock maximo no puede ser negativo.";

      if (Number.isFinite(minimo) && Number.isFinite(maximo) && minimo > maximo) {
        nextErrors.maximo = "El stock maximo no puede ser menor que el stock minimo.";
      }
    }

    if (form.commission_enabled) {
      if (!Number.isFinite(commissionValue)) nextErrors.commission_value = "Debes capturar el valor de la comision.";
      else if (commissionValue < 0) nextErrors.commission_value = "La comision no puede ser negativa.";
    }

    return nextErrors;
  }, [form, usesInventory, getProductByCodigo]);

  const isFormValid = Object.keys(errors).length === 0;
  const showError = (field) => Boolean(touched[field] && errors[field]);

  return {
    form, touched, usesInventory, ganancia, errors, isFormValid,
    updateField, markTouched, touchAllRelevantFields, resetForm, showError
  };
};