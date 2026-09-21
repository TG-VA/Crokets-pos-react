import { useState, useMemo } from "react";

import {
  calculateGanancia,
  getDiscountPercentFromPrice,
  getDiscountPriceFromPercent,
  validateProductModifyForm,
} from "../services/productModifyCalculationService";

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
  commission_enabled: false,
  commission_type: "percent",
  commission_value: 0,
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
  commission_value: false,
  discount_percent: false,
  discount_price: false,
  discount_concept: false,
});

export const useProductModifyForm = (
  departments,
  getProductByCodigo,
  selectedProduct
) => {
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
      if (currentDepartment) return [...active, currentDepartment];
    }
    return active;
  }, [departments, form.departamento]);

  const ganancia = useMemo(
    () => calculateGanancia(form.costo, form.precio),
    [form.costo, form.precio]
  );

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
      if (key === "commission_enabled" && !value) {
        next.commission_value = 0;
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

  const { errors, isValid } = useMemo(
    () =>
      validateProductModifyForm({
        form,
        usesInventory,
        getProductByCodigo,
        selectedProductId: selectedProduct?.id,
      }),
    [form, usesInventory, getProductByCodigo, selectedProduct?.id]
  );

  const showError = (field) => Boolean(touched[field] && errors[field]);

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

  return {
    form,
    setForm,
    touched,
    usesInventory,
    activeDepartments,
    ganancia,
    errors,
    isFormValid: isValid,
    updateField,
    markTouched,
    touchAllRelevantFields,
    resetForm,
    resetTouched,
    showError,
  };
};
