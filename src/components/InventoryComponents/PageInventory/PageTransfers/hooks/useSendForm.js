import { useCallback, useEffect, useMemo, useState } from "react";

import { filterTransferProducts } from "../utils/transfersUtils";
import { createTransferOrder } from "../services/transfersService";

const useSendForm = ({
  branch,
  user,
  products,
  activeTab,
  getProductByCodigo,
  refreshProducts,
  reloadOrders,
  reloadProductsSilently,
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
  const [productSearch, setProductSearch] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [draftItems, setDraftItems] = useState([]);
  const [transferNotes, setTransferNotes] = useState("");

  const searchableProducts = useMemo(() => {
    return filterTransferProducts({
      products,
      searchTerm: "",
    });
  }, [products]);

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

    setDestinationBranchId(destinationOptions[0]?.id || "");
  }, [destinationBranchId, destinationOptions]);

  const openSearchModal = useCallback(() => {
    setSearchModalOpen(true);
  }, []);

  const closeSearchModal = useCallback(() => {
    setSearchModalOpen(false);
  }, []);

  const clearLookupSelection = useCallback(() => {
    setProductSearch("");
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if (event.key !== "F10") {
        return;
      }

      if (activeTab !== "send") {
        return;
      }

      event.preventDefault();
      openSearchModal();
    };

    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [activeTab, openSearchModal]);

  const handleLookupProductSearchChange = useCallback((value) => {
    setProductSearch(value);
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

      if (!productId) {
        setError("No se detectó el producto a traspasar.");
        return;
      }

      if (quantity <= 0) {
        setError("La cantidad a enviar debe ser mayor a 0.");
        return;
      }

      setDraftItems((currentItems) => {
        const existingItem = currentItems.find(
          (item) => item.productId === productId
        );
        const existingQuantity =
          Number(existingItem?.quantity ?? 0) || 0;
        const nextQuantity = existingQuantity + quantity;

        if (nextQuantity > availableStock) {
          setError(
            `No puedes enviar más de ${availableStock} piezas de ${product.descripcion}.`
          );
          return currentItems;
        }

        const nextItem = {
          productId,
          barcode: product.codigo || "",
          name: product.descripcion || "PRODUCTO",
          availableStock,
          quantity: nextQuantity,
          costPrice: Number(product?.costo ?? 0) || 0,
          salePrice: Number(product?.precio ?? 0) || 0,
        };

        if (existingItem) {
          return currentItems.map((item) =>
            item.productId === productId ? nextItem : item
          );
        }

        return [...currentItems, nextItem];
      });
      setProductSearch("");
      setSearchModalOpen(false);
    },
    [clearFeedback, setError]
  );

  const handleLookupProduct = useCallback(() => {
    const cleanSearch = String(productSearch || "").trim();

    if (!cleanSearch) {
      setError("Escanea o escribe un código, o presiona F10 para buscar.");
      return;
    }

    const byCode = getProductByCodigo(cleanSearch);
    if (byCode) {
      setError("");
      handleAddDraftItem(byCode, 1);
      return;
    }

    const searchKey = cleanSearch.trim().toLowerCase();
    const searchTokens = searchKey.split(/\s+/).filter(Boolean);

    const exactMatch = searchableProducts.find(
      (product) =>
        String(product?.descripcion || "")
          .trim()
          .toLowerCase() === searchKey
    );
    if (exactMatch) {
      setError("");
      handleAddDraftItem(exactMatch, 1);
      return;
    }

    const partialMatches = searchableProducts.filter((product) => {
      const desc = String(product?.descripcion || "")
        .trim()
        .toLowerCase();
      const dept = String(product?.departamento || "")
        .trim()
        .toLowerCase();
      const code = String(product?.codigo || "")
        .trim()
        .toLowerCase();

      if (searchTokens.length === 0) return false;

      return searchTokens.every(
        (token) =>
          code.includes(token) ||
          desc.includes(token) ||
          dept.includes(token)
      );
    });

    if (partialMatches.length === 1) {
      setError("");
      handleAddDraftItem(partialMatches[0], 1);
      return;
    }

    if (partialMatches.length > 1) {
      setSearchModalOpen(true);
      setError(
        `Hay ${partialMatches.length} coincidencias. Selecciona una del modal.`
      );
      return;
    }

    setError(
      "No se encontró un producto con ese código. Presiona F10 para buscarlo."
    );
  }, [
    getProductByCodigo,
    handleAddDraftItem,
    productSearch,
    searchableProducts,
    setError,
  ]);

  const loadProductForTransfer = useCallback(
    (product) => {
      if (!product) {
        return;
      }

      handleAddDraftItem(product, 1);
    },
    [handleAddDraftItem]
  );

  const handleDraftQuantityChange = useCallback(
    (productId, value) => {
      clearFeedback();

      setDraftItems((currentItems) =>
        currentItems.map((item) => {
          if (item.productId !== productId) {
            return item;
          }

          if (value === "" || value === null || value === undefined) {
            return {
              ...item,
              quantity: "",
            };
          }

          const rawNumeric = String(value).replace(/[^0-9]/g, "");
          if (rawNumeric === "") {
            return {
              ...item,
              quantity: "",
            };
          }

          const parsedQuantity = Number(rawNumeric);
          const floored = Number.isFinite(parsedQuantity)
            ? Math.floor(parsedQuantity)
            : NaN;

          if (!Number.isFinite(floored)) {
            return item;
          }

          if (floored === 0) {
            return item;
          }

          const limited =
            floored > item.availableStock
              ? item.availableStock
              : floored;

          return {
            ...item,
            quantity: limited,
          };
        })
      );
    },
    [clearFeedback]
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

    const overStockedItem = draftItems.find((item) => {
      const qty = Number(item?.quantity ?? 0);
      return qty > (item?.availableStock ?? 0);
    });

    if (overStockedItem) {
      setError(
        `"${overStockedItem.name}" supera el stock disponible de ${overStockedItem.availableStock}.`
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
      clearLookupSelection();
      setSuccess(
        `Traspaso ${createdTransfer.folio} enviado a ${createdTransfer.destinationBranchName}.`
      );
      setActiveTab("receive");
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
    clearLookupSelection,
    destinationBranchId,
    draftItems,
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
    productSearch,
    handleLookupProductSearchChange,
    handleLookupProduct,
    searchableProducts,
    searchModalOpen,
    openSearchModal,
    closeSearchModal,
    loadProductForTransfer,
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
