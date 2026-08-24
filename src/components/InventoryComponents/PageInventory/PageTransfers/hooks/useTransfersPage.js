import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../../contexts/AuthContext";
import { useBranch } from "../../../../../contexts/BranchContext";
import { useProducts } from "../../../../../contexts/ProductsContext";

import {
  cancelTransferOrder,
  createTransferOrder,
  fetchTransferBranchOptions,
  loadTransferOrders,
  receiveTransferOrder,
} from "../services/transfersService";
import {
  filterTransferProducts,
  getPendingReceiptOrders,
  getPendingReceiptsCount,
  getTransferMetrics,
  getTransfersHistory,
} from "../utils/transfersUtils";

const DEFAULT_TAB = "send";

const useTransfersPage = () => {
  const { branch } = useBranch();
  const { user } = useAuth();
  const {
    getProductByCodigo,
    products,
    loadingProducts,
    refreshProducts,
  } = useProducts();

  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);
  const [branchOptions, setBranchOptions] = useState([]);
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [draftItems, setDraftItems] = useState([]);
  const [transferNotes, setTransferNotes] = useState("");
  const [transferOrders, setTransferOrders] = useState([]);
  const [selectedReceiptOrderId, setSelectedReceiptOrderId] = useState("");
  const [receiptQuantities, setReceiptQuantities] = useState({});
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true);

    try {
      const options = await fetchTransferBranchOptions(branch);
      setBranchOptions(options);
    } finally {
      setLoadingBranches(false);
    }
  }, [branch]);

  const reloadOrders = useCallback(async () => {
    try {
      const orders = await loadTransferOrders();
      setTransferOrders(orders);
    } catch (loadError) {
      console.error("No se pudieron cargar los traspasos:", loadError);
      setError(
        loadError?.message || "No se pudieron cargar los traspasos desde Supabase."
      );
    }
  }, []);

  const reloadProductsSilently = useCallback(async () => {
    try {
      if (typeof refreshProducts === "function") {
        await refreshProducts();
      }
    } catch (err) {
      console.error("No se pudo refrescar ProductsContext durante el poll:", err);
    }
  }, [refreshProducts]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    reloadOrders();
  }, [reloadOrders]);

  useEffect(() => {
    let interval = null;
    const runLoop = async () => {
      try {
        await Promise.all([
          reloadOrders(),
          reloadProductsSilently(),
        ]);
      } catch (err) {
        console.error("Polling automático traspasos/inventario falló:", err);
      }
    };

    interval = setInterval(runLoop, 10 * 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [reloadOrders, reloadProductsSilently]);

  const destinationOptions = useMemo(() => {
    return branchOptions.filter((option) => option.id !== branch?.id);
  }, [branch?.id, branchOptions]);

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

  const searchableProducts = useMemo(() => {
    return filterTransferProducts({
      products,
      searchTerm: "",
    });
  }, [products]);

  const pendingReceiptOrders = useMemo(() => {
    return getPendingReceiptOrders({
      orders: transferOrders,
      currentBranchId: branch?.id || "",
    });
  }, [branch?.id, transferOrders]);

  const transferHistory = useMemo(() => {
    return getTransfersHistory({
      orders: transferOrders,
      currentBranchId: branch?.id || "",
    });
  }, [branch?.id, transferOrders]);

  const pendingReceiptsCount = useMemo(() => {
    return getPendingReceiptsCount({
      orders: transferOrders,
      currentBranchId: branch?.id || "",
    });
  }, [branch?.id, transferOrders]);

  const transferMetrics = useMemo(() => {
    return getTransferMetrics({
      orders: transferOrders,
      currentBranchId: branch?.id || "",
    });
  }, [branch?.id, transferOrders]);

  const cancellableTransferIds = useMemo(() => {
    return new Set(
      transferHistory
        .filter(
          (order) =>
            order.originBranchId === branch?.id &&
            order.status === "pending_receipt"
        )
        .map((order) => order.id)
    );
  }, [branch?.id, transferHistory]);

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
    if (pendingReceiptOrders.length === 0) {
      setSelectedReceiptOrderId("");
      return;
    }

    const stillExists = pendingReceiptOrders.some(
      (order) => order.id === selectedReceiptOrderId
    );

    if (stillExists) {
      return;
    }

    setSelectedReceiptOrderId(pendingReceiptOrders[0]?.id || "");
  }, [pendingReceiptOrders, selectedReceiptOrderId]);

  const selectedReceiptOrder = useMemo(() => {
    return (
      pendingReceiptOrders.find((order) => order.id === selectedReceiptOrderId) ||
      null
    );
  }, [pendingReceiptOrders, selectedReceiptOrderId]);

  useEffect(() => {
    if (!selectedReceiptOrder) {
      setReceiptQuantities({});
      return;
    }

    const nextReceiptQuantities = selectedReceiptOrder.items.reduce(
      (accumulator, item) => {
        accumulator[item.productId] = Number(item.requestedQty ?? 0) || 0;
        return accumulator;
      },
      {}
    );

    setReceiptQuantities(nextReceiptQuantities);
  }, [selectedReceiptOrder]);

  const clearFeedback = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  const handleTabChange = useCallback(
    (tab) => {
      clearFeedback();
      setActiveTab(tab);
    },
    [clearFeedback]
  );

  const openSearchModal = useCallback(() => {
    setSearchModalOpen(true);
  }, []);

  const closeSearchModal = useCallback(() => {
    setSearchModalOpen(false);
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

  const clearLookupSelection = useCallback(() => {
    setProductSearch("");
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
        const existingItem = currentItems.find((item) => item.productId === productId);
        const existingQuantity = Number(existingItem?.quantity ?? 0) || 0;
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
    [clearFeedback]
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

  const handleDraftQuantityChange = useCallback((productId, value) => {
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
          floored > item.availableStock ? item.availableStock : floored;

        return {
          ...item,
          quantity: limited,
        };
      })
    );
  }, [clearFeedback]);

  const handleRemoveDraftItem = useCallback((productId) => {
    clearFeedback();
    setDraftItems((currentItems) =>
      currentItems.filter((item) => item.productId !== productId)
    );
  }, [clearFeedback]);

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
    destinationBranchId,
    draftItems,
    refreshProducts,
    reloadOrders,
    transferNotes,
    user,
    clearLookupSelection,
  ]);

  const handleSelectReceiptOrder = useCallback(
    (orderId) => {
      clearFeedback();
      setSelectedReceiptOrderId(orderId);
    },
    [clearFeedback]
  );

  const handleReceiptQuantityChange = useCallback((productId, value) => {
    clearFeedback();

    setReceiptQuantities((currentValues) => ({
      ...currentValues,
      [productId]: value,
    }));
  }, [clearFeedback]);

  const handleConfirmReceipt = useCallback(async () => {
    if (!selectedReceiptOrder) {
      setError("Selecciona una orden pendiente para recibir.");
      return;
    }

    clearFeedback();
    setSubmitting(true);

    try {
      const completedTransfer = await receiveTransferOrder({
        transferOrderId: selectedReceiptOrder.id,
        receivedQuantities: receiptQuantities,
        currentBranch: branch,
        user,
      });

      await refreshProducts();
      await reloadOrders();
      setSuccess(
        completedTransfer.status === "received_with_difference"
          ? `Se recibió ${completedTransfer.folio} con diferencias y el faltante regresó automáticamente a ${completedTransfer.originBranchName}.`
          : `Se recibió completo el traspaso ${completedTransfer.folio}.`
      );
      setActiveTab("history");
    } catch (receiveError) {
      console.error("No se pudo recibir el traspaso:", receiveError);
      setError(
        receiveError?.message ||
          "No se pudo registrar la recepción del traspaso."
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    branch,
    clearFeedback,
    receiptQuantities,
    refreshProducts,
    reloadOrders,
    selectedReceiptOrder,
    user,
  ]);

  const handleCancelTransfer = useCallback(
    async (transferOrderId) => {
      clearFeedback();
      setSubmitting(true);

      try {
        const cancelledTransfer = await cancelTransferOrder({
          transferOrderId,
          currentBranch: branch,
          user,
        });

        await refreshProducts();
        await reloadOrders();
        setSuccess(
          `Se canceló ${cancelledTransfer.folio} y las piezas regresaron a ${cancelledTransfer.originBranchName}.`
        );
      } catch (cancelError) {
        console.error("No se pudo cancelar el traspaso:", cancelError);
        setError(
          cancelError?.message || "No se pudo cancelar la orden de traspaso."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [branch, clearFeedback, refreshProducts, reloadOrders, user]
  );

  return {
    activeTab,
    branch,
    cancellableTransferIds,
    destinationBranchId,
    destinationOptions,
    draftItems,
    draftTotals,
    error,
    loadingProducts,
    products,
    productSearch,
    searchModalOpen,
    searchableProducts,
    loadingBranches,
    pendingReceiptOrders,
    pendingReceiptsCount,
    receiptQuantities,
    selectedReceiptOrder,
    submitting,
    success,
    transferHistory,
    transferMetrics,
    transferNotes,
    clearLookupSelection,
    handleCancelTransfer,
    handleConfirmReceipt,
    handleDraftQuantityChange,
    handleLookupProduct,
    handleLookupProductSearchChange,
    handleReceiptQuantityChange,
    handleRemoveDraftItem,
    handleSelectReceiptOrder,
    handleSubmitTransfer,
    handleTabChange,
    loadProductForTransfer,
    openSearchModal,
    closeSearchModal,
    setDestinationBranchId,
    setTransferNotes,
  };
};

export default useTransfersPage;
