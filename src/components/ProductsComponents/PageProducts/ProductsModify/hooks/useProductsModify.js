import { useState, useEffect } from "react";
import { useProducts } from "../../../../../contexts/ProductsContext";
import { fetchSatClaves } from "../../../../../services/satClavesService";
import { useProductModifyForm } from "./useProductModifyForm";
import { useProductModifyDOM } from "./useProductModifyDOM";
import { useAppModal } from "../../../../../hooks/useAppModal";

export const useProductsModify = () => {
  const { products, departments, getProductByCodigo, updateProductByCodigo, getProductDiscountByProductId, upsertProductDiscount } = useProducts();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingDiscount, setLoadingDiscount] = useState(false);
  const [satClaves, setSatClaves] = useState([]);
  const [loadingSatClaves, setLoadingSatClaves] = useState(false);

  const { appModal, closeAppModal, showAppAlert } = useAppModal();

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

  const {
    form, setForm, touched, usesInventory, activeDepartments, ganancia, errors, isFormValid,
    updateField, markTouched, touchAllRelevantFields, resetForm, resetTouched, showError, getDiscountPriceFromPercent
  } = useProductModifyForm(departments, getProductByCodigo, selectedProduct);

  const handleClearAndReset = () => {
    resetForm();
    setSelectedProduct(null);
    setBarcode("");
    setLoadingDiscount(false);
  };

  const loadProductDiscount = async (productId, salePrice) => {
    if (!productId) return;
    try {
      setLoadingDiscount(true);
      const result = await getProductDiscountByProductId(productId);
      if (!result?.success) {
        console.error("No se pudo cargar el descuento.");
        return;
      }
      const discount = result.data;
      const discountPercent = Number(discount?.discount_percent ?? 0);
      const discountPrice = getDiscountPriceFromPercent(salePrice, discountPercent);

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
    resetTouched();

    const salePrice = product.precio ?? "";
    const productDepartment = product.departamento === "Sin departamento" ? "" : product.departamento ?? "";

    setForm({
      codigo: product.codigo ?? "", descripcion: product.descripcion ?? "",
      costo: (product.costo ?? "").toString(), precio: (salePrice ?? "").toString(),
      departamento: productDepartment, minimo: product.minimo ?? 0, maximo: product.maximo ?? 0,
      use_inventory: product.use_inventory ?? product.tracks_inventory ?? true,
      sale_type: product.sale_type ?? "unidad", unit: product.unit ?? "pieza",
      tax: product.tax ?? 16, cfdi: product.cfdi ?? "", status: product.status ? "activo" : "inactivo",
      isGlobal: !!product.is_global, commission_enabled: !!product.commission_enabled,
      commission_type: product.commission_type || "percent",
      commission_value: product.commission_value ?? product.commission_percent ?? 0,
      discount_enable: false,
      discount_percent: 0, discount_price: "", discount_concept: "",
    });

    await loadProductDiscount(product.id, salePrice);
  };

  const handleLookup = async () => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) {
      showAppAlert({ type: "warning", title: "Código requerido", message: "Captura un código de barras.", confirmText: "Entendido" });
      return;
    }
    const found = getProductByCodigo(cleanBarcode);
    if (!found) {
      showAppAlert({ type: "warning", title: "Producto no encontrado", message: "Producto no encontrado.", confirmText: "Entendido" });
      return;
    }
    await loadProduct(found);
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
        codigo: form.codigo.toString().trim(), descripcion: form.descripcion.toString().trim(),
        costo: parseFloat(form.costo) || 0, precio: parseFloat(form.precio) || 0,
        ganancia, departamento: form.departamento.toString().trim(),
        minimo: usesInventory ? parseFloat(form.minimo) || 0 : 0, maximo: usesInventory ? parseFloat(form.maximo) || 0 : 0,
        use_inventory: usesInventory, sale_type: form.sale_type || "unidad",
        unit: form.unit || "pieza", tax: parseFloat(form.tax) || 0,
        cfdi: form.cfdi.toString().trim(), status: form.status,
        isGlobal: !!form.isGlobal, commission_enabled: !!form.commission_enabled,
        commission_type: form.commission_type || "percent",
        commission_value: parseFloat(form.commission_value) || 0,
        commission_percent: form.commission_type === "percent" ? (parseFloat(form.commission_value) || 0) : 0,
      };

      const productResult = await updateProductByCodigo(selectedProduct.codigo, payload);

      if (!productResult?.success) {
        showAppAlert({ type: "danger", title: "No se pudo actualizar el producto", message: productResult?.error || "No se pudo actualizar el producto.", confirmText: "Entendido" });
        return;
      }

      const discountResult = await upsertProductDiscount(selectedProduct.id, {
        enabled: !!form.discount_enable, discount_percent: parseFloat(form.discount_percent) || 0,
        discount_concept: form.discount_concept.trim(),
      });

      if (!discountResult?.success) {
        showAppAlert({ type: "warning", title: "Producto modificado parcialmente", message: discountResult?.error || "El producto se modificó, pero no se pudo guardar el descuento.", confirmText: "Entendido" });
        return;
      }

      showAppAlert({ type: "success", title: "Producto modificado", message: "Producto modificado correctamente.", confirmText: "Entendido" });
      handleClearAndReset();
    } finally {
      setSaving(false);
    }
  };

  const {
    bodyRef, submitArmed, setSubmitArmed, focusFirstInvalidField,
    preventNumberScrollChange, preventNumberArrows, handleContentKeyDown
  } = useProductModifyDOM({
    isFormValid, errors, usesInventory, form, appModalIsOpen: appModal.isOpen,
    selectedProduct, onSubmit: handleSave, setSearchModalOpen
  });

  return {
    products, searchModalOpen, setSearchModalOpen, barcode, setBarcode, selectedProduct,
    saving, loadingDiscount, satClaves, loadingSatClaves, appModal, closeAppModal,
    form, touched, usesInventory, activeDepartments, ganancia, errors, isFormValid,
    updateField, markTouched, handleClearAndReset, showError, handleLookup, loadProduct, handleSave,
    bodyRef, submitArmed, setSubmitArmed, preventNumberScrollChange, preventNumberArrows, handleContentKeyDown
  };
};