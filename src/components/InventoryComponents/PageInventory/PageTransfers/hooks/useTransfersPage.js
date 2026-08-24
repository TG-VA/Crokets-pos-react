import { useAuth } from "../../../../../contexts/AuthContext";
import { useBranch } from "../../../../../contexts/BranchContext";
import { useProducts } from "../../../../../contexts/ProductsContext";

import useTransferFeedback from "./useTransferFeedback";
import useTransferDataLoad from "./useTransferDataLoad";
import useSendForm from "./useSendForm";
import useReceiveForm from "./useReceiveForm";

const useTransfersPage = () => {
  const { branch } = useBranch();
  const { user } = useAuth();
  const {
    getProductByCodigo,
    products,
    loadingProducts,
    refreshProducts,
  } = useProducts();

  const {
    error,
    success,
    setError,
    setSuccess,
    clearFeedback,
  } = useTransferFeedback();

  const dataLoad = useTransferDataLoad({
    branch,
    user,
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

  const sendForm = useSendForm({
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
    clearLookupSelection: sendForm.clearLookupSelection || (() => {}),
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
