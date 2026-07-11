import { useMemo, useRef, useState } from "react";

import { useProducts } from "../../../../../contexts/ProductsContext";
import { useBranch } from "../../../../../contexts/BranchContext";
import { useAuth } from "../../../../../contexts/AuthContext";

import { addInventoryToProduct } from "../services/inventoryAddService";

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

const useInventoryAdd = () => {
  const { products, getProductByCodigo, refreshProducts } = useProducts();
  const { branch } = useBranch();
  const { user } = useAuth();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityToAdd, setQuantityToAdd] = useState("");
  const [submitArmed, setSubmitArmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appModal, setAppModal] = useState(INITIAL_APP_MODAL);

  const quantityInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const bodyRef = useRef(null);

  const currentInventory = useMemo(() => {
    return Number(selectedProduct?.existencia ?? 0) || 0;
  }, [selectedProduct?.existencia]);

  const parsedQuantityToAdd = useMemo(() => {
    const quantity = parseInt(String(quantityToAdd ?? ""), 10);

    if (!Number.isFinite(quantity)) {
      return 0;
    }

    return Math.max(0, quantity);
  }, [quantityToAdd]);

  const newInventory = useMemo(() => {
    return currentInventory + parsedQuantityToAdd;
  }, [currentInventory, parsedQuantityToAdd]);

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
    setSelectedProduct(null);
    setBarcode("");
    setQuantityToAdd("");
    setSearchModalOpen(false);
  };

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

  const openSearchModal = () => {
    setSearchModalOpen(true);
  };

  const closeSearchModal = () => {
    setSearchModalOpen(false);
  };

  const handleBarcodeChange = (event) => {
    setBarcode(event.target.value);
  };

  const handleQuantityChange = (event) => {
    const rawValue = String(event.target.value ?? "");

    if (!rawValue) {
      setQuantityToAdd("");
      return;
    }

    const digitsOnly = rawValue.replace(/[^\d]/g, "");
    const quantity = parseInt(digitsOnly, 10);

    if (!Number.isFinite(quantity) || quantity < 1) {
      setQuantityToAdd("");
      return;
    }

    setQuantityToAdd(String(quantity));
  };

  const handleLookup = () => {
    const cleanBarcode = String(barcode || "").trim();

    if (!cleanBarcode) {
      showAppAlert({
        type: "warning",
        title: "Código requerido",
        message: "Escanea o escribe el código de barras del producto.",
      });

      return;
    }

    const foundProduct = getProductByCodigo(cleanBarcode);

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

  const handleSubmit = async () => {
    if (!selectedProduct || saving) return;

    if (!branch?.id) {
      showAppAlert({
        type: "danger",
        title: "Sucursal no detectada",
        message: "No hay una sucursal activa para registrar el inventario.",
      });

      return;
    }

    if (parsedQuantityToAdd <= 0) {
      showAppAlert({
        type: "warning",
        title: "Cantidad inválida",
        message: "La cantidad debe ser mayor a 0.",
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

      await addInventoryToProduct({
        branchId: branch.id,
        product: selectedProduct,
        quantity: parsedQuantityToAdd,
        userId: user?.id || null,
      });

      await refreshProducts();

      const description = String(
        selectedProduct.descripcion ?? ""
      ).trim();

      const descriptionUpper = description
        ? description.toUpperCase()
        : "PRODUCTO";

      const savedQuantity = parsedQuantityToAdd;

      resetAfterSave();

      showAppAlert({
        type: "success",
        title: "Inventario actualizado",
        message: `${descriptionUpper}\nInventario agregado: +${savedQuantity} PZ`,
        confirmText: "Aceptar",
      });
    } catch (error) {
      console.error("Error agregando inventario:", error);

      showAppAlert({
        type: "danger",
        title: "No se pudo agregar inventario",
        message:
          error?.message || "No se pudo agregar inventario.",
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
    quantityToAdd,
    submitArmed,
    saving,
    appModal,

    currentInventory,
    newInventory,
    salePrice,

    quantityInputRef,
    barcodeInputRef,
    bodyRef,

    setSubmitArmed,
    setQuantityToAdd,

    openSearchModal,
    closeSearchModal,
    closeAppModal,
    cancelCurrentOperation,

    handleBarcodeChange,
    handleQuantityChange,
    handleLookup,
    loadProduct,
    handleSubmit,
  };
};

export default useInventoryAdd;