import {
  useCallback,
  useState,
} from "react";

const getProductName = (
  product
) => {
  return (
    product?.descripcion ??
    product?.name ??
    "este producto"
  );
};

const createClosedConfirmation =
  () => ({
    isOpen: false,
    slot: null,
    title: "",
    message: "",
  });

const useKardexRemoveConfirmation = ({
  selectedProducts = [],
  rowsBySlot = [],
  appliedDateFrom = "",
  appliedDateTo = "",
  removeProduct,
  onBeforeRemove,
} = {}) => {
  const [
    removeConfirmation,
    setRemoveConfirmation,
  ] = useState(
    createClosedConfirmation
  );

  const closeRemoveConfirmation =
    useCallback(() => {
      setRemoveConfirmation(
        createClosedConfirmation()
      );
    }, []);

  const executeRemove =
    useCallback(
      (slot) => {
        if (
          typeof onBeforeRemove ===
          "function"
        ) {
          onBeforeRemove(slot);
        }

        if (
          typeof removeProduct ===
          "function"
        ) {
          removeProduct(slot);
        }
      },
      [
        onBeforeRemove,
        removeProduct,
      ]
    );

  const requestRemoveProduct =
    useCallback(
      (slot) => {
        const product =
          selectedProducts[
            slot
          ];

        if (!product) {
          return;
        }

        const rows =
          rowsBySlot[slot] ??
          [];

        const hasLoadedMovements =
          rows.length > 0;

        const hasAppliedRange =
          Boolean(
            appliedDateFrom ||
              appliedDateTo
          );

        if (
          !hasLoadedMovements &&
          !hasAppliedRange
        ) {
          executeRemove(slot);
          return;
        }

        const productName =
          getProductName(
            product
          );

        let message =
          `¿Deseas quitar "${productName}" del Kardex?`;

        if (
          hasLoadedMovements &&
          hasAppliedRange
        ) {
          message =
            `"${productName}" tiene movimientos cargados y un rango de fechas aplicado. ` +
            "Al quitarlo se perderá esta vista.";
        } else if (
          hasAppliedRange
        ) {
          message =
            `"${productName}" tiene un rango de fechas aplicado. ` +
            "Al quitarlo se perderá esta vista.";
        } else if (
          hasLoadedMovements
        ) {
          message =
            `"${productName}" tiene movimientos cargados. ` +
            "¿Deseas quitarlo del Kardex?";
        }

        setRemoveConfirmation({
          isOpen: true,
          slot,
          title:
            "Quitar producto",
          message,
        });
      },
      [
        appliedDateFrom,
        appliedDateTo,
        executeRemove,
        rowsBySlot,
        selectedProducts,
      ]
    );

  const confirmRemoveProduct =
    useCallback(() => {
      const slot =
        removeConfirmation.slot;

      if (
        slot !== 0 &&
        slot !== 1
      ) {
        closeRemoveConfirmation();
        return;
      }

      executeRemove(slot);
      closeRemoveConfirmation();
    }, [
      closeRemoveConfirmation,
      executeRemove,
      removeConfirmation.slot,
    ]);

  return {
    removeConfirmation,
    requestRemoveProduct,
    confirmRemoveProduct,
    closeRemoveConfirmation,
  };
};

export default useKardexRemoveConfirmation;