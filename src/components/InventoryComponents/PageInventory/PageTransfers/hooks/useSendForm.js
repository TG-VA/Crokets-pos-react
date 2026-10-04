import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createTransferOrder } from "../services/transfersService";
import useProductLookup from "./useProductLookup";

const useSendForm = ({
  branch,
  user,
  products,
  activeTab,
  getProductByCodigo,
  refreshProducts,
  reloadOrders,
  setActiveTab,
  submitting,
  setSubmitting,
  clearFeedback,
  setError,
  setSuccess,
  branchOptions,
  destinationOptions,
}) => {
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [draftItems, setDraftItems] = useState([]);
  const [transferNotes, setTransferNotes] = useState("");
  const resetLookupRef = useRef(() => {});

  const draftTotals = useMemo(() => {
    return draftItems.reduce(
      (summary, item) => {
        summary.lines += 1;
        summary.units += Number(item.quantity ?? 0) || 0;
        return summary;
      },
      {
        lines: 0,
        units: 0,
      }
    );
  }, [draftItems]);

  useEffect(() => {
    if (destinationBranchId) {
      const destinationStillExists = destinationOptions.some(
        (option) => option.id === destinationBranchId
      );

      if (destinationStillExists) {
        return;
      }
    }

    setDestinationBranchId(destinationOptions[0]?.id || ""); // eslint-disable-line react-hooks/set-state-in-effect -- default sincrono a primera sucursal destino cuando cambian options
  }, [destinationBranchId, destinationOptions]);

  useEffect(() => {
    if (!Array.isArray(products) || products.length === 0) {
      return undefined;
    }
    if (!Array.isArray(draftItems) || draftItems.length === 0) {
      return undefined;
    }

    const stockByProductId = new Map(
      products.map((product) => {
        const productId = String(product?.id || product?.product_id || "");
        const currentStock = Number(product?.existencia ?? 0) || 0;
        return [productId, currentStock];
      })
    );

    let changed = false;
    const nextItems = draftItems.map((item) => {
      const productId = String(item?.productId || "");
      const freshStock = stockByProductId.get(productId);
      if (freshStock === undefined) return item;
      const currentStored = Number(item?.availableStock ?? 0) || 0;
      if (freshStock === currentStored) return item;
      changed = true;
      return { ...item, availableStock: freshStock };
    });

    if (changed) {
      setDraftItems(nextItems); // eslint-disable-line react-hooks/set-state-in-effect -- sync actualizacion de stock disponible por item cuando cambia products[] o draftItems
    }
  }, [products, draftItems]);

  const resetLookupAfterSelection = useCallback(() => {
    resetLookupRef.current();
  }, []);

  const handleAddDraftItem = useCallback(
    (product, quantityValue = 1) => {
      clearFeedback();

      const productId = product?.id || product?.product_id;
      const parsedQuantity = Number(quantityValue || 1);
      const quantity = Number.isFinite(parsedQuantity)
        ? Math.floor(parsedQuantity)
        : 0;
      const availableStock = Number(product?.existencia ?? 0) || 0;
      const productName = product?.descripcion || "PRODUCTO";

      if (!productId) {
        setError("No se detectó el producto a traspasar.");
        return;
      }

      if (quantity <= 0) {
        setError("La cantidad a enviar debe ser mayor a 0.");
        return;
      }

      const existingItem = draftItems.find(
        (item) => item.productId === productId
      );
      const existingQuantity =
        Number(existingItem?.quantity ?? 0) || 0;
      const nextQuantity = existingQuantity + quantity;

      if (nextQuantity > availableStock) {
        setError(
          `No puedes enviar más de ${availableStock} piezas de ${productName}.`
        );
        return;
      }

      const nextItem = {
        productId,
        barcode: product.codigo || "",
        name: productName,
        availableStock,
        quantity: nextQuantity,
        costPrice: Number(product?.costo ?? 0) || 0,
        salePrice: Number(product?.precio ?? 0) || 0,
      };

      setDraftItems((currentItems) => {
        const alreadyPresent = currentItems.some(
          (item) => item.productId === productId
        );
        if (alreadyPresent) {
          return currentItems.map((item) =>
            item.productId === productId ? nextItem : item
          );
        }
        return [...currentItems, nextItem];
      });

      resetLookupAfterSelection();
    },
    [clearFeedback, draftItems, resetLookupAfterSelection, setError]
  );

  const lookup = useProductLookup({
    products,
    activeTab,
    getProductByCodigo,
    clearFeedback,
    setError,
    onProductSelected: handleAddDraftItem,
    resetAfterSelection: resetLookupAfterSelection,
  });

  useEffect(() => {
    resetLookupRef.current = () => {
      lookup.setProductSearch("");
      lookup.setSearchModalOpen(false);
    };
  }, [lookup]);

  const handleDraftQuantityChange = useCallback(
    (productId, value) => {
      clearFeedback();

      const currentItem = draftItems.find((item) => item.productId === productId);
      if (!currentItem) {
        return;
      }

      const availableStock = Number(currentItem?.availableStock ?? 0) || 0;
      const itemName = currentItem?.name || "PRODUCTO";

      if (value === "" || value === null || value === undefined) {
        setDraftItems((currentItems) =>
          currentItems.map((item) =>
            item.productId === productId
              ? { ...item, quantity: "" }
              : item
          )
        );
        return;
      }

      const rawNumeric = String(value).replace(/[^0-9]/g, "");
      if (rawNumeric === "") {
        setDraftItems((currentItems) =>
          currentItems.map((item) =>
            item.productId === productId
              ? { ...item, quantity: "" }
              : item
          )
        );
        return;
      }

      const parsedQuantity = Number(rawNumeric);
      const floored = Number.isFinite(parsedQuantity)
        ? Math.floor(parsedQuantity)
        : NaN;

      if (!Number.isFinite(floored)) {
        return;
      }

      if (floored === 0) {
        return;
      }

      let clamped;
      if (floored > availableStock) {
        clamped = availableStock;
        setError(
          `No puedes enviar más de ${availableStock} piezas de ${itemName}. Cantidad ajustada a ${availableStock}.`
        );
      } else {
        clamped = floored;
      }

      setDraftItems((currentItems) =>
        currentItems.map((item) => {
          if (item.productId !== productId) {
            return item;
          }
          return {
            ...item,
            quantity: clamped,
          };
        })
      );
    },
    [clearFeedback, draftItems, setError]
  );

  const handleRemoveDraftItem = useCallback(
    (productId) => {
      clearFeedback();
      setDraftItems((currentItems) =>
        currentItems.filter((item) => item.productId !== productId)
      );
    },
    [clearFeedback]
  );

  const handleSubmitTransfer = useCallback(async () => {
    clearFeedback();

    if (!branch?.id) {
      setError("No hay una sucursal activa para generar el traspaso.");
      return;
    }

    if (!destinationBranchId) {
      setError("Selecciona la sucursal destino.");
      return;
    }

    const emptyQtyItem = draftItems.find((item) => {
      const qty = Number(item?.quantity);
      return !Number.isFinite(qty) || qty <= 0;
    });

    if (emptyQtyItem) {
      setError(
        `Escribe una cantidad válida para "${emptyQtyItem.name}" (debe ser mayor a 0).`
      );
      return;
    }

    const stockByProductId = new Map(
      (Array.isArray(products) ? products : []).map((product) => {
        const productId = String(product?.id || product?.product_id || "");
        const currentStock = Number(product?.existencia ?? 0) || 0;
        return [productId, currentStock];
      })
    );

    const overStockedItem = draftItems.find((item) => {
      const qty = Number(item?.quantity ?? 0);
      const productId = String(item?.productId || "");
      const freshStock = stockByProductId.has(productId)
        ? stockByProductId.get(productId)
        : Number(item?.availableStock ?? 0);
      return qty > freshStock;
    });

    if (overStockedItem) {
      const productId = String(overStockedItem?.productId || "");
      const freshStock = stockByProductId.has(productId)
        ? stockByProductId.get(productId)
        : Number(overStockedItem?.availableStock ?? 0);
      setError(
        `"${overStockedItem.name}" supera el stock disponible de ${freshStock}.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const destinationBranch = branchOptions.find(
        (option) => option.id === destinationBranchId
      );

      const createdTransfer = await createTransferOrder({
        originBranch: branch,
        destinationBranch,
        items: draftItems,
        notes: transferNotes,
        user,
      });

      await refreshProducts();
      await reloadOrders();
      setDraftItems([]);
      setTransferNotes("");
      lookup.clearLookupSelection();
      setSuccess(
        `Traspaso ${createdTransfer.folio} enviado a ${createdTransfer.destinationBranchName}.`
      );
      setActiveTab("history");
    } catch (submitError) {
      console.error("No se pudo generar el traspaso:", submitError);
      setError(
        submitError?.message ||
          "No se pudo generar la orden de traspaso."
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    branch,
    branchOptions,
    clearFeedback,
    destinationBranchId,
    draftItems,
    lookup,
    products,
    refreshProducts,
    reloadOrders,
    setActiveTab,
    setSubmitting,
    setError,
    setSuccess,
    transferNotes,
    user,
  ]);

  return {
    destinationBranchId,
    setDestinationBranchId,
    productSearch: lookup.productSearch,
    handleLookupProductSearchChange: lookup.handleLookupProductSearchChange,
    handleLookupProduct: lookup.handleLookupProduct,
    searchableProducts: lookup.searchableProducts,
    searchModalOpen: lookup.searchModalOpen,
    openSearchModal: lookup.openSearchModal,
    closeSearchModal: lookup.closeSearchModal,
    loadProductForTransfer: lookup.loadProductForTransfer,
    draftItems,
    draftTotals,
    handleDraftQuantityChange,
    handleRemoveDraftItem,
    transferNotes,
    setTransferNotes,
    handleSubmitTransfer,
  };
};

export default useSendForm;
