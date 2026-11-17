import { useCallback, useState } from "react";

import { useAuth } from "../../../../../contexts/AuthContext";
import { useBranch } from "../../../../../contexts/BranchContext";
import { useProducts } from "../../../../../contexts/ProductsContext";
import {
  isAdminBranch,
  resolveStockOriginId,
} from "../../../../../services/branchScopeCalculationService";

import useTransferFeedback from "./useTransferFeedback";
import useTransferDataLoad from "./useTransferDataLoad";
import useSendForm from "./useSendForm";
import useReceiveForm from "./useReceiveForm";
import useTransferOriginCatalog from "./useTransferOriginCatalog";

const useTransfersPage = ({ isActive = true } = {}) => {
  const { branch } = useBranch();
  const { user } = useAuth();
  const contextCatalog = useProducts();
  const { refreshProducts } = contextCatalog;

  const canChooseOrigin = isAdminBranch(branch);
  const [chosenOriginId, setOriginBranchId] = useState("");
  const originBranchId = resolveStockOriginId(branch, chosenOriginId);

  const originCatalog = useTransferOriginCatalog({
    branch,
    originBranchId,
    contextCatalog,
  });
  const { products, loadingProducts, productsError } = originCatalog;
  const refreshOriginProducts = originCatalog.refreshProducts;

  const handleProductPromoted = useCallback(async () => {
    await refreshProducts();
    await refreshOriginProducts?.();
  }, [refreshOriginProducts, refreshProducts]);

  const { error, success, setError, setSuccess, clearFeedback } =
    useTransferFeedback();

  const dataLoad = useTransferDataLoad({
    branch,
    originBranchId,
    user,
    isActive,
    refreshProducts,
    clearFeedback,
    setSuccess,
    setError,
  });

  const {
    activeTab,
    setActiveTab,
    branchOptions,
    destinationOptions,
    loadingBranches,
    pendingReceiptOrders,
    pendingReceiptsCount,
    transferHistory,
    transferMetrics,
    cancellableTransferIds,
    submitting,
    setSubmitting,
    handleTabChange,
    handleCancelTransfer,
    reloadOrders,
  } = dataLoad;

  const originBranch = canChooseOrigin
    ? branchOptions.find((option) => option.id === originBranchId) || null
    : branch;

  const sendForm = useSendForm({
    originBranch,
    user,
    products,
    activeTab,
    getProductByCodigo: originCatalog.getProductByCodigo,
    refreshProducts: originCatalog.refreshProducts,
    reloadOrders,
    setActiveTab,
    submitting,
    setSubmitting,
    clearFeedback,
    setError,
    setSuccess,
    branchOptions,
    destinationOptions,
  });

  const {
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
  } = sendForm;

  const receiveForm = useReceiveForm({
    branch,
    user,
    refreshProducts,
    reloadOrders,
    setActiveTab,
    pendingReceiptOrders,
    submitting,
    setSubmitting,
    clearFeedback,
    setError,
    setSuccess,
  });

  const {
    selectedReceiptOrder,
    receiptQuantities,
    handleSelectReceiptOrder,
    handleReceiptQuantityChange,
    handleConfirmReceipt,
  } = receiveForm;

  return {
    activeTab,
    branch,
    branchOptions,
    canChooseOrigin,
    originBranchId,
    originBranchName: originBranch?.name || "",
    setOriginBranchId,
    cancellableTransferIds,
    destinationBranchId,
    destinationOptions,
    draftItems,
    draftTotals,
    error,
    loadingProducts,
    productsError,
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
    handleCancelTransfer,
    handleConfirmReceipt,
    handleDraftQuantityChange,
    handleLookupProduct,
    handleLookupProductSearchChange,
    handleProductPromoted,
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
