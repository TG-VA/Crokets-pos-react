import { useState, useEffect, useMemo } from "react";
import { useProducts } from "../../../../../contexts/ProductsContext";
import { fetchSatClaves } from "../../../../../services/satClavesService";
import { useAppModal } from "../../../../../hooks/useAppModal";
import { useProductFormValidation } from "./useProductFormValidation";
import { useProductDOMFocus } from "./useProductDOMFocus";

export const useProductsNew = () => {
  const { departments, addProduct, getProductByCodigo } = useProducts();
  const [saving, setSaving] = useState(false);
  const [satClaves, setSatClaves] = useState([]);
  const [loadingSatClaves, setLoadingSatClaves] = useState(false);

  const activeDepartments = useMemo(() => {
    return (departments || []).filter((dep) => dep.status === true);
  }, [departments]);

  useEffect(() => {
    let isMounted = true;
    const loadSatClaves = async () => {
      try {
        setLoadingSatClaves(true);
        const data = await fetchSatClaves();
        if (isMounted) setSatClaves(data);
      } catch (error) {
        console.error("Error cargando claves SAT:", error);
        if (isMounted) setSatClaves([]);
      } finally {
        if (isMounted) setLoadingSatClaves(false);
      }
    };
    loadSatClaves();
    return () => { isMounted = false; };
  }, []);

  const { appModal, closeAppModal, showAppAlert } = useAppModal();

  const {
    form, touched, usesInventory, ganancia, errors, isFormValid,
    updateField, markTouched, touchAllRelevantFields, resetForm, showError
  } = useProductFormValidation(getProductByCodigo);

  const getFriendlySaveError = (errorMessage = "") => {
    const message = String(errorMessage || "").toLowerCase();
    if (message.includes("products_barcode_key") || message.includes("duplicate key value") || message.includes("barcode")) {
      return "Ya existe un producto registrado con ese codigo de barras.\n\nAunque el producto haya sido retirado del sistema, su codigo no puede reutilizarse.\nPor favor utiliza otro codigo de barras.";
    }
    return errorMessage || "Error al guardar el producto.";
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
        commission_enabled: !!form.commission_enabled,
        commission_type: form.commission_type || "percent",
        commission_value: parseFloat(form.commission_value) || 0,
        commission_percent: form.commission_type === "percent" ? (parseFloat(form.commission_value) || 0) : 0,
      };

      const result = await addProduct(payload);

      if (!result?.success) {
        if (result?.partial) {
          showAppAlert({
            type: "warning",
            title: "Producto creado parcialmente",
            message: `El producto si se creo en el catalogo, pero no se pudo crear su inventario en la sucursal.\n\nDetalle: ${getFriendlySaveError(result.error)}`,
            confirmText: "Entendido",
          });
          return;
        }
        showAppAlert({
          type: "danger",
          title: "No se pudo guardar el producto",
          message: getFriendlySaveError(result?.error),
          confirmText: "Entendido",
        });
        return;
      }

      showAppAlert({
        type: "success",
        title: "Producto agregado",
        message: "Producto agregado correctamente.",
        confirmText: "Entendido",
      });

      resetForm();
      setTimeout(() => {
        const firstInput = bodyRef.current?.querySelector('input[name="codigo"]');
        if (firstInput) firstInput.focus();
      }, 0);
    } finally {
      setSaving(false);
    }
  };

  const {
    bodyRef, submitArmed, setSubmitArmed, focusFirstInvalidField,
    preventNumberScrollChange, preventNumberArrows, handleContentKeyDown
  } = useProductDOMFocus({
    isFormValid, errors, usesInventory, form,
    appModalIsOpen: appModal.isOpen,
    onSubmit: handleSubmit
  });

  return {
    bodyRef, form, errors, touched, saving, appModal, satClaves,
    loadingSatClaves, activeDepartments, ganancia, usesInventory,
    isFormValid, submitArmed, setSubmitArmed, updateField, markTouched,
    handleSubmit, closeAppModal, handleContentKeyDown,
    preventNumberScrollChange, preventNumberArrows, showError
  };
};