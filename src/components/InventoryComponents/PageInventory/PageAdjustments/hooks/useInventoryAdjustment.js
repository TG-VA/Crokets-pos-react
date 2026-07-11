import { useMemo, useRef, useState } from "react";

import { useProducts } from "../../../../../contexts/ProductsContext";
import { useBranch } from "../../../../../contexts/BranchContext";
import { useAuth } from "../../../../../contexts/AuthContext";

import { applyInventoryAdjustment } from "../services/inventoryAdjustmentService";

const INITIAL_APP_MODAL = {
  isOpen: false,
  type: "info",
  title: "",
  message: "",
  confirmText: "Entendido",
  cancelText: "Cancelar",
  showCancel: false,
  loading: false,
  onConfirm: null,
  onCancel: null,
};

const useInventoryAdjustment = () => {
  const { products, getProductByCodigo, refreshProducts } = useProducts();
  const { branch } = useBranch();
  const { user } = useAuth();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityToAdjust, setQuantityToAdjust] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [submitArmed, setSubmitArmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appModal, setAppModal] = useState(INITIAL_APP_MODAL);

  const barcodeInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const bodyRef = useRef(null);

  const currentStock = useMemo(() => {
    return Number(selectedProduct?.existencia ?? 0) || 0;
  }, [selectedProduct?.existencia]);

  const parsedQuantity = useMemo(() => {
    const rawValue = String(quantityToAdjust ?? "").trim();

    if (!rawValue || rawValue === "-") {
      return 0;
    }

    const quantity = Number.parseInt(rawValue, 10);

    return Number.isFinite(quantity) ? quantity : 0;
  }, [quantityToAdjust]);

  const newStock = useMemo(() => {
    return currentStock + parsedQuantity;
  }, [currentStock, parsedQuantity]);

  const salePrice = useMemo(() => {
    const price = Number(selectedProduct?.precio ?? 0);

    return Number.isFinite(price) ? price : 0;
  }, [selectedProduct?.precio]);

  const closeAppModal = () => {
    setAppModal((previous) => ({
      ...previous,
      isOpen: false,
      loading: false,
      onConfirm: null,
      onCancel: null,
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
      cancelText: "Cancelar",
      showCancel: false,
      loading: false,
      onConfirm: closeAppModal,
      onCancel: closeAppModal,
    });
  };

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
    setSelectedProduct(null);
    setBarcode("");
    setQuantityToAdjust("");
    setAdjustmentReason("");
    setAdjustmentNotes("");
    setSearchModalOpen(false);
  };

  const openSearchModal = () => {
    setSearchModalOpen(true);
  };

  const closeSearchModal = () => {
    setSearchModalOpen(false);
  };

  const handleBarcodeChange = (event) => {
    setBarcode(event.target.value);
  };

  const handleReasonChange = (event) => {
    setAdjustmentReason(event.target.value);
  };

  const handleNotesChange = (event) => {
    setAdjustmentNotes(event.target.value);
  };

  const handleQuantityChange = (event) => {
    const rawValue = String(event.target.value ?? "");

    if (!rawValue) {
      setQuantityToAdjust("");
      return;
    }

    const normalizedValue = rawValue.replace(/[^\d-]/g, "");
    const hasNegativeSign = normalizedValue.startsWith("-");
    const digitsOnly = normalizedValue.replace(/-/g, "");

    if (!digitsOnly) {
      setQuantityToAdjust(hasNegativeSign ? "-" : "");
      return;
    }

    setQuantityToAdjust(
      `${hasNegativeSign ? "-" : ""}${digitsOnly}`
    );
  };

  const handleLookup = () => {
    const cleanCode = String(barcode ?? "").trim();

    if (!cleanCode) {
      showAppAlert({
        type: "warning",
        title: "Código requerido",
        message: "Escanea o escribe el código de barras.",
      });

      return;
    }

    const foundProduct = getProductByCodigo(cleanCode);

    if (!foundProduct) {
      showAppAlert({
        type: "warning",
        title: "Producto no encontrado",
        message:
          "No se encontró ningún producto con ese código de barras. Verifica el código o presiona F10 para buscarlo.",
      });

      return;
    }

    setSelectedProduct(foundProduct);
    setBarcode(foundProduct.codigo ?? "");
  };

  const loadProduct = (product) => {
    if (!product) return;

    setSelectedProduct(product);
    setBarcode(product.codigo ?? "");
    setSearchModalOpen(false);
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

    const productId =
      selectedProduct.product_id || selectedProduct.id;

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
        userId: user?.id || null,
      });

      await refreshProducts();

      const description = String(
        selectedProduct.descripcion ?? ""
      ).trim();

      const descriptionUpper = description
        ? description.toUpperCase()
        : "PRODUCTO";

      const quantityLabel =
        parsedQuantity > 0
          ? `+${parsedQuantity}`
          : `${parsedQuantity}`;

      resetAfterSave();

      showAppAlert({
        type: "success",
        title: "Inventario ajustado",
        message: `${descriptionUpper}\nAjuste aplicado: ${quantityLabel} PZ`,
        confirmText: "Aceptar",
      });
    } catch (error) {
      console.error("Error aplicando ajuste:", error);

      if (error?.code === "NEGATIVE_STOCK") {
        showAppAlert({
          type: "warning",
          title: "Stock insuficiente",
          message: error.message,
        });

        return;
      }

      if (error?.code === "INVENTORY_NOT_REGISTERED") {
        showAppAlert({
          type: "warning",
          title: "Inventario no registrado",
          message: error.message,
        });

        return;
      }

      showAppAlert({
        type: "danger",
        title: "No se pudo aplicar el ajuste",
        message:
          error?.message || "No se pudo aplicar el ajuste.",
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    products,
    searchModalOpen,
    barcode,
    selectedProduct,
    quantityToAdjust,
    adjustmentReason,
    adjustmentNotes,
    submitArmed,
    saving,
    appModal,

    currentStock,
    parsedQuantity,
    newStock,
    salePrice,

    barcodeInputRef,
    quantityInputRef,
    bodyRef,

    setSubmitArmed,
    setQuantityToAdjust,
    setAdjustmentReason,
    setAdjustmentNotes,

    openSearchModal,
    closeSearchModal,
    closeAppModal,
    cancelCurrentOperation,

    handleBarcodeChange,
    handleQuantityChange,
    handleReasonChange,
    handleNotesChange,
    handleLookup,
    loadProduct,
    handleSubmitAdjustment,
  };
};

export default useInventoryAdjustment;