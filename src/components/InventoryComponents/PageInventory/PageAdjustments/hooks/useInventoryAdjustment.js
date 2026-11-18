import { useMemo, useRef, useState } from "react";

import { useProducts } from "../../../../../contexts/ProductsContext";
import { useBranch } from "../../../../../contexts/BranchContext";

import {
  applyInventoryAdjustment,
  isAdminGrantRequiredError,
} from "../services/inventoryAdjustmentService";
import {
  normalizeAdjustmentQuantityInput,
  parseAdjustmentQuantity,
} from "../utils/adjustmentQuantity";
import useInventoryAlertModal from "../../shared/hooks/useInventoryAlertModal";
import useGrantReauthorization from "../../shared/hooks/useGrantReauthorization";
import useAdjustmentProductSelection from "./useAdjustmentProductSelection";

const ERROR_ALERT_TITLES = {
  NEGATIVE_STOCK: "Stock insuficiente",
  INVENTORY_NOT_REGISTERED: "Inventario no registrado",
};

const useInventoryAdjustment = () => {
  const {
    products,
    loadingProducts,
    productsError,
    getProductByCodigo,
    refreshProducts,
  } = useProducts();
  const { branch } = useBranch();

  const { appModal, closeAppModal, showAppAlert } = useInventoryAlertModal();
  const {
    reauthorizationOpen,
    requestReauthorization,
    closeReauthorization,
    confirmReauthorization,
  } = useGrantReauthorization();
  const productSelection = useAdjustmentProductSelection({
    getProductByCodigo,
    showAppAlert,
  });
  const { selectedProduct } = productSelection;

  const [quantityToAdjust, setQuantityToAdjust] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [submitArmed, setSubmitArmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const barcodeInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const bodyRef = useRef(null);

  const currentStock = useMemo(() => {
    return Number(selectedProduct?.existencia ?? 0) || 0;
  }, [selectedProduct?.existencia]);

  const parsedQuantity = useMemo(
    () => parseAdjustmentQuantity(quantityToAdjust),
    [quantityToAdjust]
  );

  const newStock = useMemo(() => {
    return currentStock + parsedQuantity;
  }, [currentStock, parsedQuantity]);

  const salePrice = useMemo(() => {
    const price = Number(selectedProduct?.precio ?? 0);

    return Number.isFinite(price) ? price : 0;
  }, [selectedProduct?.precio]);

  const focusBarcodeInput = () => {
    window.requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();

      if (typeof barcodeInputRef.current?.select === "function") {
        barcodeInputRef.current.select();
      }
    });
  };

  const clearCurrentOperation = () => {
    setSubmitArmed(false);
    productSelection.clearSelection();
    setQuantityToAdjust("");
    setAdjustmentReason("");
    setAdjustmentNotes("");
  };

  const handleReasonChange = (event) => {
    setAdjustmentReason(event.target.value);
  };

  const handleNotesChange = (event) => {
    setAdjustmentNotes(event.target.value);
  };

  const handleQuantityChange = (event) => {
    setQuantityToAdjust(normalizeAdjustmentQuantityInput(event.target.value));
  };

  const cancelCurrentOperation = () => {
    if (saving) return;

    clearCurrentOperation();
    focusBarcodeInput();
  };

  const resetAfterSave = () => {
    clearCurrentOperation();
    focusBarcodeInput();
  };

  const handleSubmitAdjustment = async () => {
    if (!selectedProduct || saving) return;

    if (!branch?.id) {
      showAppAlert({
        type: "danger",
        title: "Sucursal no detectada",
        message: "No hay una sucursal activa para aplicar el ajuste.",
      });

      return;
    }

    const reason = String(adjustmentReason ?? "").trim();

    if (!reason) {
      showAppAlert({
        type: "warning",
        title: "Motivo requerido",
        message: "Captura el motivo del ajuste.",
      });

      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
      showAppAlert({
        type: "warning",
        title: "Diferencia inválida",
        message: "La diferencia debe ser distinta de 0.",
      });

      quantityInputRef.current?.focus();
      return;
    }

    const productId = selectedProduct.product_id || selectedProduct.id;

    if (!productId) {
      showAppAlert({
        type: "danger",
        title: "Producto no detectado",
        message: "No se detectó el identificador del producto.",
      });

      return;
    }

    try {
      setSaving(true);

      await applyInventoryAdjustment({
        branchId: branch.id,
        product: selectedProduct,
        quantity: parsedQuantity,
        reason,
        notes: adjustmentNotes,
      });

      await refreshProducts();

      const description = String(selectedProduct.descripcion ?? "").trim();

      const descriptionUpper = description
        ? description.toUpperCase()
        : "PRODUCTO";

      const quantityLabel =
        parsedQuantity > 0 ? `+${parsedQuantity}` : `${parsedQuantity}`;

      resetAfterSave();

      showAppAlert({
        type: "success",
        title: "Inventario ajustado",
        message: `${descriptionUpper}\nAjuste aplicado: ${quantityLabel} PZ`,
        confirmText: "Aceptar",
      });
    } catch (error) {
      // La autorizacion vencio o no existe: se vuelve a pedir sin salir de la
      // pantalla y sin perder la captura.
      if (isAdminGrantRequiredError(error)) {
        requestReauthorization();
        return;
      }

      console.error("Error aplicando ajuste:", error);

      const knownTitle = ERROR_ALERT_TITLES[error?.code];

      if (knownTitle) {
        showAppAlert({
          type: "warning",
          title: knownTitle,
          message: error.message,
        });

        return;
      }

      showAppAlert({
        type: "danger",
        title: "No se pudo aplicar el ajuste",
        message: error?.message || "No se pudo aplicar el ajuste.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReauthorized = () => {
    confirmReauthorization(handleSubmitAdjustment);
  };

  return {
    products,
    loadingProducts,
    productsError,
    searchModalOpen: productSelection.searchModalOpen,
    barcode: productSelection.barcode,
    selectedProduct,
    quantityToAdjust,
    adjustmentReason,
    adjustmentNotes,
    submitArmed,
    saving,
    appModal,
    reauthorizationOpen,
    branchId: branch?.id || null,

    currentStock,
    newStock,
    salePrice,

    barcodeInputRef,
    quantityInputRef,
    bodyRef,

    setSubmitArmed,
    setQuantityToAdjust,
    setAdjustmentReason,
    setAdjustmentNotes,

    openSearchModal: productSelection.openSearchModal,
    closeSearchModal: productSelection.closeSearchModal,
    closeAppModal,
    cancelCurrentOperation,

    handleBarcodeChange: productSelection.handleBarcodeChange,
    handleQuantityChange,
    handleReasonChange,
    handleNotesChange,
    handleLookup: productSelection.handleLookup,
    loadProduct: productSelection.loadProduct,
    handleSubmitAdjustment,
    closeReauthorization,
    handleReauthorized,
  };
};

export default useInventoryAdjustment;
