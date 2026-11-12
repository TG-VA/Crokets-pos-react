import { useState, useMemo, useRef } from "react";
import { getMissingKitFields } from "../services/kitFormCompletenessService";
import { hasUnsavedKitChanges } from "../services/kitFormChangesService";

const EMPTY_FORM = {
  barcode: "",
  description: "",
  price: "",
  max_kits_per_sale: "1",
  starts_on: "",
  ends_on: "",
  no_starts_on: false,
  no_ends_on: false,
};

const EMPTY_SNAPSHOT = { form: EMPTY_FORM, selectedProducts: [] };

const toSelectedProduct = (product, quantity) => ({
  id: product.id,
  barcode: product.barcode || "",
  name: product.name || "Producto",
  sale_price: Number(product.sale_price || 0),
  cost_price: Number(product.cost_price || 0),
  is_global: product.is_global,
  quantity,
});

/**
 * Estado y reglas del formulario de kits: campos, productos seleccionados,
 * totales derivados y limpieza. No toca persistencia.
 */
export const useKitForm = ({ showAppAlert, showAppConfirm }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [editingKit, setEditingKit] = useState(null);
  const [initialSnapshot, setInitialSnapshot] = useState(EMPTY_SNAPSHOT);

  const barcodeInputRef = useRef(null);

  const selectedProductsTotal = useMemo(
    () =>
      selectedProducts.reduce(
        (sum, product) =>
          sum + Number(product.sale_price || 0) * Number(product.quantity || 0),
        0
      ),
    [selectedProducts]
  );

  const kitPrice = Number(form.price || 0);
  const kitDiscount = useMemo(
    () =>
      selectedProductsTotal <= 0 || kitPrice <= 0
        ? 0
        : selectedProductsTotal - kitPrice,
    [selectedProductsTotal, kitPrice]
  );
  const kitDiscountPercent = useMemo(
    () =>
      selectedProductsTotal <= 0 || kitDiscount <= 0
        ? 0
        : (kitDiscount / selectedProductsTotal) * 100,
    [selectedProductsTotal, kitDiscount]
  );

  const missingFields = useMemo(
    () => getMissingKitFields(form, selectedProducts),
    [form, selectedProducts]
  );
  const isFormComplete = missingFields.length === 0;

  const focusBarcode = () =>
    setTimeout(() => barcodeInputRef.current?.focus(), 0);

  const updateField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedProducts([]);
    setSelectedProductId(null);
    setEditingKit(null);
    setInitialSnapshot(EMPTY_SNAPSHOT);
    focusBarcode();
  };

  const hasUnsavedChanges = hasUnsavedKitChanges(
    initialSnapshot,
    form,
    selectedProducts
  );

  // Cancela directo si no hay cambios; si los hay, pide confirmacion.
  const handleCancelEdit = () => {
    if (!hasUnsavedChanges) return resetForm();
    showAppConfirm({
      type: "warning",
      title: editingKit ? "Cancelar edición" : "Descartar cambios",
      message: "Hay cambios sin guardar. ¿Deseas descartarlos?",
      confirmText: "Sí, descartar",
      cancelText: "No, regresar",
      onConfirm: resetForm,
    });
  };

  const handleClearForm = () => {
    const hasData =
      form.barcode.trim() ||
      form.description.trim() ||
      String(form.price).trim() ||
      selectedProducts.length > 0 ||
      editingKit;
    if (!hasData) return resetForm();

    showAppConfirm({
      type: "warning",
      title: editingKit ? "Cancelar edición" : "Limpiar formulario",
      message: editingKit
        ? "¿Deseas cancelar la edición y limpiar el formulario?"
        : "¿Deseas limpiar el formulario del kit?",
      confirmText: editingKit ? "Sí, cancelar edición" : "Sí, limpiar",
      cancelText: "No, regresar",
      onConfirm: resetForm,
    });
  };

  const addProductToKit = (product) => {
    if (!product?.id) return;
    if (product.is_kit)
      return showAppAlert({
        type: "warning",
        title: "Kit no permitido",
        message: "No puedes agregar un kit dentro de otro kit.",
      });
    if (selectedProducts.some((p) => p.id === product.id))
      return showAppAlert({
        type: "warning",
        title: "Producto repetido",
        message: "Este producto ya está agregado al kit.",
      });

    setSelectedProducts((prev) => [...prev, toSelectedProduct(product, 1)]);
    setSelectedProductId(product.id);
  };

  const updateProductQuantity = (productId, value) => {
    const quantity = Number(value);
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              quantity:
                Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
            }
          : p
      )
    );
  };

  const removeSelectedProduct = () => {
    if (!selectedProductId)
      return showAppAlert({
        type: "warning",
        title: "Producto requerido",
        message: "Selecciona un producto del kit para removerlo.",
      });
    setSelectedProducts((prev) =>
      prev.filter((p) => p.id !== selectedProductId)
    );
    setSelectedProductId(null);
  };

  // Puebla el formulario con un kit existente y sus items para editarlo.
  const loadKitIntoForm = (kit, items) => {
    const loadedForm = {
      barcode: kit.products?.barcode || "",
      description: kit.products?.name || "",
      price: String(Number(kit.products?.sale_price || 0)),
      max_kits_per_sale: String(Number(kit.products?.max_kits_per_sale ?? 1)),
      starts_on: kit.starts_on || "",
      ends_on: kit.ends_on || "",
      no_starts_on: !kit.starts_on,
      no_ends_on: !kit.ends_on,
    };
    const loadedProducts = (items || [])
      .filter((item) => item.products)
      .map((item) =>
        toSelectedProduct(item.products, Number(item.quantity || 1))
      );
    setEditingKit(kit);
    setForm(loadedForm);
    setSelectedProducts(loadedProducts);
    setInitialSnapshot({ form: loadedForm, selectedProducts: loadedProducts });
    setSelectedProductId(null);
    focusBarcode();
  };

  return {
    form,
    updateField,
    selectedProducts,
    selectedProductId,
    setSelectedProductId,
    editingKit,
    setEditingKit,
    barcodeInputRef,
    selectedProductsTotal,
    kitPrice,
    kitDiscount,
    kitDiscountPercent,
    missingFields,
    isFormComplete,
    resetForm,
    handleClearForm,
    handleCancelEdit,
    addProductToKit,
    updateProductQuantity,
    removeSelectedProduct,
    loadKitIntoForm,
  };
};
