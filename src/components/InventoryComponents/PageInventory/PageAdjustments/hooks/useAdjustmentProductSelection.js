import { useState } from "react";

import {
  isInventoryTrackedProduct,
  isKitProduct,
} from "../../../../../services/inventory/inventoryProductCalculationService";

// Subdominio de busqueda y seleccion del producto a ajustar: codigo de barras,
// buscador F10 y filtro de productos que no manejan inventario.
const useAdjustmentProductSelection = ({
  getProductByCodigo,
  showAppAlert,
}) => {
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const openSearchModal = () => {
    setSearchModalOpen(true);
  };

  const closeSearchModal = () => {
    setSearchModalOpen(false);
  };

  const handleBarcodeChange = (event) => {
    setBarcode(event.target.value);
  };

  const clearSelection = () => {
    setSelectedProduct(null);
    setBarcode("");
    setSearchModalOpen(false);
  };

  // Mismo criterio que el buscador F10: kits y productos sin inventario no se ajustan.
  const ensureAdjustableProduct = (product) => {
    if (!isKitProduct(product) && isInventoryTrackedProduct(product)) {
      return true;
    }

    showAppAlert({
      type: "warning",
      title: "Producto sin inventario",
      message:
        "Este producto es un kit o no maneja inventario, por lo que no se puede ajustar.",
    });

    return false;
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

    if (!ensureAdjustableProduct(foundProduct)) return;

    setSelectedProduct(foundProduct);
    setBarcode(foundProduct.codigo ?? "");
  };

  const loadProduct = (product) => {
    if (!product) return;
    if (!ensureAdjustableProduct(product)) return;

    setSelectedProduct(product);
    setBarcode(product.codigo ?? "");
    setSearchModalOpen(false);
  };

  return {
    searchModalOpen,
    barcode,
    selectedProduct,
    openSearchModal,
    closeSearchModal,
    handleBarcodeChange,
    handleLookup,
    loadProduct,
    clearSelection,
  };
};

export default useAdjustmentProductSelection;
