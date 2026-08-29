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
      // ⚠️ Eliminamos el console.error() para no ensuciar la consola con falsos "bugs".
      // Simplemente atrapamos la regla de negocio y se la mostramos al cajero.
      showAppWarning(error?.message || "El producto no se pudo agregar a la venta.");
    } finally {
      searchInProgressRef.current = false;
      // Siempre limpiamos la barra pase lo que pase, para que no se interrumpa el flujo
      setBarcode("");
    }
  }, [barcode, branchId, addProductToCart, setBarcode, showAppWarning, validateSaleAvailable]);

  const handleAddProductFromVerifier = useCallback(async (product) => {
    if (!validateSaleAvailable() || !product) return false;

    try {
      return await addProductToCart(product);
    } catch (error) {
      // También limpiamos el console.error() de esta función por si acaso
      showAppWarning(error?.message || "No se pudo agregar el producto.");
      return false;
    }
  }, [addProductToCart, showAppWarning, validateSaleAvailable]);

  return {
    handleBarcodeSearch,
    handleAddProductFromVerifier,
  };
};

export default useSalesProductSearch;