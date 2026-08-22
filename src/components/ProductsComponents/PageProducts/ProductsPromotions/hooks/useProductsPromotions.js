import { useState, useMemo, useEffect, useRef } from "react";
import { useAppModal } from "../../../../../hooks/useAppModal";
import {
  fetchKits,
  checkKitDuplicates,
  createNewKitTransaction,
  updateKitTransaction,
  fetchKitItems,
  toggleKitStatus,
  softDeleteKitTransaction
} from "../services/productKitsService";

export const useProductsPromotions = () => {
  const { appModal, closeAppModal, showAppAlert, showAppConfirm } = useAppModal();

  const [form, setForm] = useState({ barcode: "", description: "", price: "" });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [kits, setKits] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [editingKit, setEditingKit] = useState(null);

  const barcodeInputRef = useRef(null);

  const selectedProductsTotal = useMemo(() => {
    return selectedProducts.reduce((sum, product) => sum + Number(product.sale_price || 0) * Number(product.quantity || 0), 0);
  }, [selectedProducts]);

  const kitPrice = Number(form.price || 0);
  const kitDiscount = useMemo(() => (selectedProductsTotal <= 0 || kitPrice <= 0) ? 0 : selectedProductsTotal - kitPrice, [selectedProductsTotal, kitPrice]);
  const kitDiscountPercent = useMemo(() => (selectedProductsTotal <= 0 || kitDiscount <= 0) ? 0 : (kitDiscount / selectedProductsTotal) * 100, [selectedProductsTotal, kitDiscount]);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm({ barcode: "", description: "", price: "" });
    setSelectedProducts([]);
    setSelectedProductId(null);
    setEditingKit(null);
    setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  const handleClearForm = () => {
    const hasData = form.barcode.trim() || form.description.trim() || String(form.price).trim() || selectedProducts.length > 0 || editingKit;
    if (!hasData) return resetForm();

    showAppConfirm({
      type: "warning",
      title: editingKit ? "Cancelar edición" : "Limpiar formulario",
      message: editingKit ? "¿Deseas cancelar la edición y limpiar el formulario?" : "¿Deseas limpiar el formulario del kit?",
      confirmText: editingKit ? "Sí, cancelar edición" : "Sí, limpiar",
      cancelText: "No, regresar",
      onConfirm: resetForm,
    });
  };

  const loadKits = async () => {
    try {
      const data = await fetchKits();
      setKits(data);
    } catch (error) {
      console.error("Error cargando kits:", error);
      setKits([]);
    }
  };

  useEffect(() => { loadKits(); }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (appModal.isOpen) return;
      if (e.key === "F10") {
        e.preventDefault();
        setShowSearchModal(true);
      }
      if (e.key === "Escape" && editingKit && !showSearchModal) {
        e.preventDefault();
        resetForm();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [editingKit, showSearchModal, appModal.isOpen]);

  const addProductToKit = (product) => {
    if (!product?.id) return;
    if (product.is_kit) return showAppAlert({ type: "warning", title: "Kit no permitido", message: "No puedes agregar un kit dentro de otro kit." });
    if (selectedProducts.some((p) => p.id === product.id)) return showAppAlert({ type: "warning", title: "Producto repetido", message: "Este producto ya está agregado al kit." });

    setSelectedProducts((prev) => [
      ...prev,
      { id: product.id, barcode: product.barcode || "", name: product.name || "Producto", sale_price: Number(product.sale_price || 0), cost_price: Number(product.cost_price || 0), quantity: 1 },
    ]);
    setSelectedProductId(product.id);
  };

  const updateProductQuantity = (productId, value) => {
    const quantity = Number(value);
    setSelectedProducts((prev) => prev.map((p) => p.id === productId ? { ...p, quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1 } : p));
  };

  const removeSelectedProduct = () => {
    if (!selectedProductId) return showAppAlert({ type: "warning", title: "Producto requerido", message: "Selecciona un producto del kit para removerlo." });
    setSelectedProducts((prev) => prev.filter((p) => p.id !== selectedProductId));
    setSelectedProductId(null);
  };

  const validateForm = () => {
    if (!form.barcode.trim()) {
      showAppAlert({ type: "warning", title: "Código requerido", message: "Captura el código de barras del kit." });
      return false;
    }
    if (!form.description.trim()) {
      showAppAlert({ type: "warning", title: "Descripción requerida", message: "Captura la descripción del kit." });
      return false;
    }
    if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) {
      showAppAlert({ type: "warning", title: "Precio requerido", message: "Captura un precio válido para el kit." });
      return false;
    }
    if (selectedProducts.length === 0) {
      showAppAlert({ type: "warning", title: "Productos requeridos", message: "Agrega al menos un producto al kit." });
      return false;
    }
    if (selectedProducts.some((p) => !Number.isFinite(Number(p.quantity)) || Number(p.quantity) <= 0)) {
      showAppAlert({ type: "warning", title: "Cantidad inválida", message: "Todos los productos del kit deben tener cantidad mayor a 0." });
      return false;
    }
    return true;
  };

  const validateDuplicatedKit = async (cleanBarcode, cleanDescription, currentProductId = null) => {
    const { isDuplicate, reason } = await checkKitDuplicates(cleanBarcode, cleanDescription, currentProductId);
    if (isDuplicate) {
      const message = reason === "barcode" ? "Ya existe un producto o kit con ese código de barras." : "Ya existe un kit con ese nombre.";
      showAppAlert({ type: "warning", title: "Dato duplicado", message });
      return false;
    }
    return true;
  };

  const handleSaveKit = async () => {
    if (!validateForm()) return;

    const cleanBarcode = form.barcode.trim();
    const cleanDescription = form.description.trim().toUpperCase();
    const kitPriceValue = Number(form.price);

    try {
      setSaving(true);
      const isValid = await validateDuplicatedKit(cleanBarcode, cleanDescription, editingKit?.kit_product_id || null);
      if (!isValid) return;

      const kitData = { barcode: cleanBarcode, description: cleanDescription, price: kitPriceValue };

      if (editingKit) {
        await updateKitTransaction(editingKit, kitData, selectedProducts);
        showAppAlert({ type: "success", title: "Kit actualizado", message: "Kit actualizado correctamente." });
      } else {
        await createNewKitTransaction(kitData, selectedProducts);
        showAppAlert({ type: "success", title: "Kit guardado", message: "Kit guardado correctamente." });
      }

      resetForm();
      await loadKits();
    } catch (error) {
      console.error("Error guardando kit:", error);
      showAppAlert({ type: "danger", title: "Error al guardar", message: error.message || "No se pudo guardar el kit." });
    } finally {
      setSaving(false);
    }
  };

  const handleEditKit = async (kit) => {
    if (!kit?.id || !kit?.kit_product_id) return;
    try {
      const items = await fetchKitItems(kit.id);
      setEditingKit(kit);
      setForm({ barcode: kit.products?.barcode || "", description: kit.products?.name || "", price: String(Number(kit.products?.sale_price || 0)) });
      setSelectedProducts((items || []).filter((item) => item.products).map((item) => ({
        id: item.products.id, barcode: item.products.barcode || "", name: item.products.name || "Producto",
        sale_price: Number(item.products.sale_price || 0), cost_price: Number(item.products.cost_price || 0), quantity: Number(item.quantity || 1),
      })));
      setSelectedProductId(null);
      setTimeout(() => barcodeInputRef.current?.focus(), 0);
    } catch (error) {
      console.error("Error cargando kit para editar:", error);
      showAppAlert({ type: "danger", title: "Error de carga", message: "No se pudo cargar el kit para editar." });
    }
  };

  const executeToggleKitStatus = async (kit, nextStatus) => {
    try {
      await toggleKitStatus(kit.id, nextStatus);
      await loadKits();
      if (editingKit?.id === kit.id) setEditingKit((prev) => (prev ? { ...prev, is_active: nextStatus } : prev));
      showAppAlert({ type: "success", title: nextStatus ? "Kit activado" : "Kit desactivado", message: nextStatus ? "Kit activado." : "Kit desactivado." });
    } catch (error) {
      console.error("Error actualizando kit:", error);
      showAppAlert({ type: "danger", title: "Error al actualizar", message: "No se pudo actualizar el estatus del kit." });
    }
  };

  const handleToggleKitStatus = async (kit) => {
    if (!kit?.id) return;
    const nextStatus = !kit.is_active;
    showAppConfirm({
      type: "warning", title: nextStatus ? "Activar kit" : "Desactivar kit",
      message: nextStatus ? "¿Deseas activar este kit?" : "¿Deseas desactivar este kit?",
      confirmText: nextStatus ? "Sí, activar" : "Sí, desactivar", cancelText: "No, regresar",
      onConfirm: () => executeToggleKitStatus(kit, nextStatus),
    });
  };

  const executeSoftDeleteKit = async (kit) => {
    try {
      await softDeleteKitTransaction(kit.id, kit.kit_product_id);
      if (editingKit?.id === kit.id) resetForm();
      showAppAlert({ type: "success", title: "Kit eliminado", message: "Kit eliminado del POS correctamente." });
      await loadKits();
    } catch (error) {
      console.error("Error eliminando kit del POS:", error);
      showAppAlert({ type: "danger", title: "Error al eliminar", message: "No se pudo eliminar el kit del POS." });
    }
  };

  const handleSoftDeleteKit = async (kit) => {
    if (!kit?.id || !kit?.kit_product_id) return;
    showAppConfirm({
      type: "danger", title: "Eliminar kit",
      message: `¿Deseas eliminar del POS el kit "${kit.products?.name || "KIT"}"?\n\nEl registro se conservará en la base de datos.`,
      confirmText: "Sí, eliminar", cancelText: "No, regresar",
      onConfirm: () => executeSoftDeleteKit(kit),
    });
  };

  return {
    form, updateField, selectedProducts, kits, selectedProductId, setSelectedProductId,
    saving, showSearchModal, setShowSearchModal, editingKit, appModal, closeAppModal,
    barcodeInputRef, selectedProductsTotal, kitPrice, kitDiscount, kitDiscountPercent,
    handleClearForm, addProductToKit, updateProductQuantity, removeSelectedProduct,
    handleSaveKit, handleEditKit, handleToggleKitStatus, handleSoftDeleteKit, showAppAlert,
  };
};