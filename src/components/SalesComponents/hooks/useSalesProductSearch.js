import { useCallback, useRef } from "react";
import { getSellableProductByBarcode } from "../services/salesProductService";

const useSalesProductSearch = ({
  barcode,
  setBarcode,
  branchId,
  shiftAlreadyCut,
  addProductToCart,
  showAppWarning,
}) => {
  const searchInProgressRef = useRef(false);

  const validateSaleAvailable = useCallback(() => {
    if (shiftAlreadyCut) {
      showAppWarning("Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo.");
      return false;
    }
    return true;
  }, [shiftAlreadyCut, showAppWarning]);

  const handleBarcodeSearch = useCallback(async () => {
    if (searchInProgressRef.current) return;

    const cleanBarcode = String(barcode || "").trim();
    
    if (!cleanBarcode) {
      setBarcode(""); // Limpiar en caso de que solo hayan tecleado espacios
      return;
    }

    if (!validateSaleAvailable() || !branchId) {
      if (!branchId) showAppWarning("La sucursal aún no está cargada.");
      setBarcode(""); // Limpiar el input para no dejar "basura" visual al cajero
      return;
    }

    searchInProgressRef.current = true;

    try {
      const product = await getSellableProductByBarcode({
        barcode: cleanBarcode,
        branchId,
      });

      await addProductToCart(product);
    } catch (error) {
      console.error("Error buscando producto:", error);
      showAppWarning(error?.message || "Error buscando producto.");
    } finally {
      searchInProgressRef.current = false;
      setBarcode("");
    }
  }, [barcode, branchId, addProductToCart, setBarcode, showAppWarning, validateSaleAvailable]);

  const handleAddProductFromVerifier = useCallback(async (product) => {
    if (!validateSaleAvailable() || !product) return;

    try {
      await addProductToCart(product);
    } catch (error) {
      console.error("Error agregando producto desde verificador:", error);
      showAppWarning("No se pudo agregar el producto.");
    }
  }, [addProductToCart, showAppWarning, validateSaleAvailable]);

  return {
    handleBarcodeSearch,
    handleAddProductFromVerifier,
  };
};

export default useSalesProductSearch;