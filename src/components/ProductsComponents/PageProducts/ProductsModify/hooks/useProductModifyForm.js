import { useState, useMemo } from "react";

const createInitialForm = () => ({
  codigo: "", descripcion: "", costo: "", precio: "", departamento: "",
  minimo: 0, maximo: 0, use_inventory: true, sale_type: "unidad",
  unit: "pieza", tax: 16, cfdi: "", status: "activo", isGlobal: false,
  commission_enable: false, commission_percent: 0, discount_enable: false,
  discount_percent: 0, discount_price: "", discount_concept: "",
});

const createInitialTouched = () => ({
  codigo: false, descripcion: false, costo: false, precio: false,
  departamento: false, minimo: false, maximo: false, tax: false,
  commission_percent: false, discount_percent: false, discount_price: false, discount_concept: false,
});

export const useProductModifyForm = (departments, getProductByCodigo, selectedProduct) => {
  const [form, setForm] = useState(createInitialForm);
  const [touched, setTouched] = useState(createInitialTouched);

  const usesInventory = !!form.use_inventory;

  const activeDepartments = useMemo(() => {
    const active = (departments || []).filter((dep) => dep.status === true);
    if (form.departamento && !active.some((dep) => dep.name.trim().toLowerCase() === form.departamento.trim().toLowerCase())) {
      const currentDepartment = (departments || []).find((dep) => dep.name.trim().toLowerCase() === form.departamento.trim().toLowerCase());
      if (currentDepartment) return [...active, currentDepartment];
    }
    return active;
  }, [departments, form.departamento]);

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

  const resetTouched = () => setTouched(createInitialTouched());
  
  const resetForm = () => {
    setForm(createInitialForm());
    resetTouched();
  };

  const markTouched = (key) => setTouched((prev) => ({ ...prev, [key]: true }));

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
          next.discount_price = getDiscountPriceFromPercent(value, next.discount_percent);
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

  const errors = useMemo(() => {
    const nextErrors = {};
    const codigo = form.codigo.toString().trim();
    const descripcion = form.descripcion.toString().trim();
    const costo = form.costo === "" || form.costo === null ? NaN : Number(form.costo);
    const precio = form.precio === "" || form.precio === null ? NaN : Number(form.precio);
    const minimo = form.minimo === "" || form.minimo === null ? NaN : Number(form.minimo);
    const maximo = form.maximo === "" || form.maximo === null ? NaN : Number(form.maximo);
    const tax = form.tax === "" || form.tax === null ? NaN : Number(form.tax);
    const commissionPercent = form.commission_percent === "" || form.commission_percent === null ? NaN : Number(form.commission_percent);
    const discountPercent = form.discount_percent === "" || form.discount_percent === null ? NaN : Number(form.discount_percent);
    const discountPrice = form.discount_price === "" || form.discount_price === null ? NaN : Number(form.discount_price);

    if (!codigo) {
      nextErrors.codigo = "El código de barras es obligatorio.";
    } else {
      const duplicate = getProductByCodigo(codigo);
      if (duplicate && duplicate.id !== selectedProduct?.id) {
        nextErrors.codigo = "Ya existe otro producto con ese código.";
      }
    }

    if (!descripcion) nextErrors.descripcion = "La descripción es obligatoria.";

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
      if (!Number.isFinite(minimo)) nextErrors.minimo = "Debes capturar el stock mínimo.";
      else if (minimo < 0) nextErrors.minimo = "El stock mínimo no puede ser negativo.";

      if (!Number.isFinite(maximo)) nextErrors.maximo = "Debes capturar el stock máximo.";
      else if (maximo < 0) nextErrors.maximo = "El stock máximo no puede ser negativo.";

      if (Number.isFinite(minimo) && Number.isFinite(maximo) && minimo > maximo) {
        nextErrors.maximo = "El stock máximo no puede ser menor que el stock mínimo.";
      }
    }

    if (form.commission_enable) {
      if (!Number.isFinite(commissionPercent)) nextErrors.commission_percent = "Debes capturar el porcentaje de comisión.";
      else if (commissionPercent < 0) nextErrors.commission_percent = "La comisión no puede ser negativa.";
    }

    if (form.discount_enable) {
      if (!Number.isFinite(discountPercent)) nextErrors.discount_percent = "Debes capturar el porcentaje de descuento.";
      else if (discountPercent <= 0) nextErrors.discount_percent = "El descuento debe ser mayor a 0 cuando está activo.";
      else if (discountPercent >= 100) nextErrors.discount_percent = "El descuento debe ser menor a 100%.";

      if (!Number.isFinite(discountPrice)) nextErrors.discount_price = "Debes capturar el precio con descuento.";
      else if (discountPrice <= 0) nextErrors.discount_price = "El precio con descuento debe ser mayor a 0.";
      else if (Number.isFinite(precio) && discountPrice >= precio) nextErrors.discount_price = "El precio con descuento debe ser menor al precio venta global.";

      if (!form.discount_concept.trim()) nextErrors.discount_concept = "Debes capturar el concepto del descuento.";
    }

    return nextErrors;
  }, [form, usesInventory, getProductByCodigo, selectedProduct?.id]);

  const isFormValid = selectedProduct && Object.keys(errors).length === 0;
  const showError = (field) => Boolean(touched[field] && errors[field]);

  const touchAllRelevantFields = () => {
    setTouched({
      codigo: true, descripcion: true, costo: true, precio: true, departamento: true,
      minimo: true, maximo: true, tax: true, commission_percent: true,
      discount_percent: true, discount_price: true, discount_concept: true,
    });
  };

  return {
    form, setForm, touched, usesInventory, activeDepartments, ganancia, errors, isFormValid,
    updateField, markTouched, touchAllRelevantFields, resetForm, resetTouched, showError, getDiscountPriceFromPercent
  };
};