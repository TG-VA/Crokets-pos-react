import { useState } from "react";
import { useProducts } from "../../../../contexts/ProductsContext";
import { useProductsDeleteDOM } from "./useProductsDeleteDOM";
import { useAppModal } from "../../../../../../hooks/useAppModal";

const CONFIRM_TEXT = "ELIMINAR";

export const useProductsDelete = () => {
  const { products, getProductByCodigo, deleteProductByCodigo } = useProducts();

  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  
  // Extraemos toda la lógica pesada desde el hook global
  const { appModal, closeAppModal, showAppAlert, showAppConfirm } = useAppModal();

  const { inputRef, focusBarcodeInput } = useProductsDeleteDOM({
    appModalIsOpen: appModal.isOpen,
    setSearchModalOpen
  });

  const handleLookup = () => {
    const cleanBarcode = barcode.trim();

    if (!cleanBarcode) {
      showAppAlert({
        type: "warning",
        title: "Código requerido",
        message: "Captura un código de barras.",
        confirmText: "Entendido",
      });
      return;
    }

    const found = getProductByCodigo(cleanBarcode);

    if (!found) {
      showAppAlert({
        type: "warning",
        title: "Producto no encontrado",
        message: "Producto no encontrado.",
        confirmText: "Entendido",
      });
      setSelectedProduct(null);
      setConfirmText("");
      focusBarcodeInput();
      return;
    }

    setSelectedProduct(found);
    setConfirmText("");
  };

  const handleCancel = () => {
    setSelectedProduct(null);
    setBarcode("");
    setConfirmText("");
    focusBarcodeInput();
  };

  const executeDelete = async () => {
    if (!selectedProduct || deleting) return;

    try {
      setDeleting(true);
      const result = await deleteProductByCodigo(selectedProduct.codigo);

      if (!result?.success) {
        // Trazabilidad en consola mantenida estrictamente para producción
        console.error("Error al eliminar producto:", result.error);
        showAppAlert({
          type: "danger",
          title: "No se pudo eliminar el producto",
          message: result?.error || "No se pudo eliminar el producto.",
          confirmText: "Entendido",
        });
        return;
      }

      showAppAlert({
        type: "success",
        title: "Producto eliminado",
        message: "Producto eliminado correctamente.",
        confirmText: "Entendido",
      });

      handleCancel();
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct || deleting) return;

    if (confirmText.trim().toUpperCase() !== CONFIRM_TEXT) {
      showAppAlert({
        type: "warning",
        title: "Confirmación requerida",
        message: `Para confirmar escribe ${CONFIRM_TEXT}.`,
        confirmText: "Entendido",
      });
      return;
    }

    showAppConfirm({
      type: "danger",
      title: "Eliminar producto",
      message: `¿Seguro que deseas eliminar del sistema el producto "${
        selectedProduct.descripcion || "Sin descripción"
      }"?\n\nEste producto ya no estará disponible para venta.`,
      confirmText: "Sí, eliminar",
      cancelText: "No, regresar",
      onConfirm: executeDelete,
    });
  };

  const canDelete = !!selectedProduct && confirmText.trim().toUpperCase() === CONFIRM_TEXT;

  return {
    products,
    barcode,
    setBarcode,
    selectedProduct,
    setSelectedProduct,
    searchModalOpen,
    setSearchModalOpen,
    confirmText,
    setConfirmText,
    deleting,
    appModal,
    closeAppModal,
    inputRef,
    handleLookup,
    handleCancel,
    handleDelete,
    canDelete,
    CONFIRM_TEXT
  };
};