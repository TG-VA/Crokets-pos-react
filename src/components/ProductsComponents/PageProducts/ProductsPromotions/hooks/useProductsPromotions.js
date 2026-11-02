import { useState, useEffect, useRef } from "react";
import { validateKitForm } from "../services/kitFormValidationService";
import { useAppModal } from "../../../../../hooks/useAppModal";
import { useKitForm } from "./useKitForm";
import { useKitListActions } from "./useKitListActions";
import { getKitMarginWarning } from "../services/kitMarginCalculationService";
import {
  checkKitDuplicates,
  createNewKitTransaction,
  updateKitTransaction,
  fetchKitItems,
} from "../services/productKitsService";

export const useProductsPromotions = () => {
  const { appModal, closeAppModal, showAppAlert, showAppConfirm } =
    useAppModal();

  const kitForm = useKitForm({ showAppAlert, showAppConfirm });
  const {
    form,
    selectedProducts,
    editingKit,
    setEditingKit,
    resetForm,
    handleCancelEdit,
    loadKitIntoForm,
  } = kitForm;

  // El listener de teclado se registra pocas veces; la ref evita un cierre obsoleto.
  const cancelEditRef = useRef(handleCancelEdit);
  useEffect(() => {
    cancelEditRef.current = handleCancelEdit;
  });

  const {
    kits,
    loadKits,
    handleToggleKitStatus,
    handleSoftDeleteKit,
    deletingKit,
    confirmSoftDeleteKit,
    cancelSoftDeleteKit,
    handleRenewKitValidity,
  } = useKitListActions({
    editingKit,
    setEditingKit,
    resetForm,
    showAppAlert,
    showAppConfirm,
  });

  const [saving, setSaving] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (appModal.isOpen) return;
      if (e.key === "F10") {
        e.preventDefault();
        setShowSearchModal(true);
      }
      if (e.key === "Escape" && editingKit && !showSearchModal) {
        e.preventDefault();
        cancelEditRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [editingKit, showSearchModal, appModal.isOpen]);

  const validateForm = () => {
    const error = validateKitForm(form, selectedProducts);
    if (!error) return true;
    showAppAlert({ type: "warning", ...error });
    return false;
  };

  const validateDuplicatedKit = async (
    cleanBarcode,
    cleanDescription,
    currentProductId = null
  ) => {
    const { isDuplicate, reason } = await checkKitDuplicates(
      cleanBarcode,
      cleanDescription,
      currentProductId
    );
    if (isDuplicate) {
      const message =
        reason === "barcode"
          ? "Ya existe un producto o kit con ese código de barras."
          : "Ya existe un kit con ese nombre.";
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
    const maxKitsValue = Number(form.max_kits_per_sale || 1);

    try {
      setSaving(true);
      const isValid = await validateDuplicatedKit(
        cleanBarcode,
        cleanDescription,
        editingKit?.kit_product_id || null
      );
      if (!isValid) return;

      const kitData = {
        barcode: cleanBarcode,
        description: cleanDescription,
        price: kitPriceValue,
        max_kits_per_sale: maxKitsValue,
        starts_on: form.starts_on || null,
        ends_on: form.ends_on || null,
      };

      if (editingKit) {
        await updateKitTransaction(editingKit, kitData, selectedProducts);
        showAppAlert({
          type: "success",
          title: "Kit actualizado",
          message: "Kit actualizado correctamente.",
        });
      } else {
        await createNewKitTransaction(kitData, selectedProducts);
        showAppAlert({
          type: "success",
          title: "Kit guardado",
          message: "Kit guardado correctamente.",
        });
      }

      resetForm();
      await loadKits();
    } catch (error) {
      console.error("Error guardando kit:", error);
      showAppAlert({
        type: "danger",
        title: "Error al guardar",
        message: error.message || "No se pudo guardar el kit.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditKit = async (kit) => {
    if (!kit?.id || !kit?.kit_product_id) return;
    try {
      const items = await fetchKitItems(kit.id);
      loadKitIntoForm(kit, items);
    } catch (error) {
      console.error("Error cargando kit para editar:", error);
      showAppAlert({
        type: "danger",
        title: "Error de carga",
        message: "No se pudo cargar el kit para editar.",
      });
    }
  };

  return {
    form,
    updateField: kitForm.updateField,
    selectedProducts,
    kits,
    selectedProductId: kitForm.selectedProductId,
    setSelectedProductId: kitForm.setSelectedProductId,
    saving,
    showSearchModal,
    setShowSearchModal,
    editingKit,
    appModal,
    closeAppModal,
    barcodeInputRef: kitForm.barcodeInputRef,
    selectedProductsTotal: kitForm.selectedProductsTotal,
    kitPrice: kitForm.kitPrice,
    kitDiscount: kitForm.kitDiscount,
    kitDiscountPercent: kitForm.kitDiscountPercent,
    kitMarginWarning: getKitMarginWarning(
      kitForm.selectedProducts,
      kitForm.kitPrice
    ),
    handleClearForm: kitForm.handleClearForm,
    handleCancelEdit,
    isFormComplete: kitForm.isFormComplete,
    missingFields: kitForm.missingFields,
    addProductToKit: kitForm.addProductToKit,
    updateProductQuantity: kitForm.updateProductQuantity,
    removeSelectedProduct: kitForm.removeSelectedProduct,
    handleSaveKit,
    handleEditKit,
    handleToggleKitStatus,
    handleSoftDeleteKit,
    deletingKit,
    confirmSoftDeleteKit,
    cancelSoftDeleteKit,
    handleRenewKitValidity,
    showAppAlert,
  };
};
