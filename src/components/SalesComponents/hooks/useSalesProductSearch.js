import {
  useCallback,
  useRef,
} from "react";

import {
  getSellableProductByBarcode,
} from "../services/salesProductService";

const useSalesProductSearch = ({
  barcode,
  setBarcode,
  branchId,
  shiftAlreadyCut,
  addProductToCart,
  showAppWarning,
}) => {
  const barcodeSearchInProgressRef =
    useRef(false);

  const validateSaleAvailable =
    useCallback(() => {
      if (shiftAlreadyCut) {
        showAppWarning(
          "Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo.",
        );

        return false;
      }

      return true;
    }, [
      shiftAlreadyCut,
      showAppWarning,
    ]);

  const handleBarcodeSearch =
    useCallback(async () => {
      if (
        barcodeSearchInProgressRef.current
      ) {
        return;
      }

      if (!validateSaleAvailable()) {
        return;
      }

      if (!branchId) {
        showAppWarning(
          "La sucursal aún no está cargada.",
        );

        return;
      }

      const cleanBarcode =
        String(barcode || "").trim();

      if (!cleanBarcode) {
        return;
      }

      barcodeSearchInProgressRef.current =
        true;

      try {
        const product =
          await getSellableProductByBarcode({
            barcode: cleanBarcode,
            branchId,
          });

        await addProductToCart(
          product,
        );
      } catch (error) {
        console.error(
          "Error buscando producto:",
          error,
        );

        showAppWarning(
          error?.message ||
            "Error buscando producto.",
        );
      } finally {
        barcodeSearchInProgressRef.current =
          false;

        setBarcode("");
      }
    }, [
      barcode,
      branchId,
      addProductToCart,
      setBarcode,
      showAppWarning,
      validateSaleAvailable,
    ]);

  const handleAddProductFromVerifier =
    useCallback(
      async (product) => {
        if (
          !validateSaleAvailable()
        ) {
          return;
        }

        if (!product) {
          return;
        }

        try {
          await addProductToCart(
            product,
          );

          console.log(
            "Producto agregado desde verificador:",
            product,
          );
        } catch (error) {
          console.error(
            "Error agregando producto desde verificador:",
            error,
          );

          showAppWarning(
            "No se pudo agregar el producto.",
          );
        }
      },
      [
        addProductToCart,
        showAppWarning,
        validateSaleAvailable,
      ],
    );

  return {
    handleBarcodeSearch,
    handleAddProductFromVerifier,
  };
};

export default useSalesProductSearch;