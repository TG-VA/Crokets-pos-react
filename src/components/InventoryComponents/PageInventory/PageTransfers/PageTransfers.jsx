import React, { useState } from "react";

import InventorySearchModal from "../../Modals/InventorySearchModal/InventorySearchModal";
import useTransfersPage from "./hooks/useTransfersPage";
import HeroSection from "./components/HeroSection";
import FeedbackBanner from "./components/FeedbackBanner";
import RouteTabs from "./components/RouteTabs";
import SendWorkspace from "./components/SendWorkspace";
import ReceiveWorkspace from "./components/ReceiveWorkspace";
import HistoryTable from "./components/HistoryTable";
import CancelConfirmModal from "./components/modals/CancelConfirmModal";
import TransferDetailModal from "./components/modals/TransferDetailModal";
import styles from "./PageTransfers.module.css";

const PageTransfers = () => {
  const {
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
    loadingBranches,
    pendingReceiptOrders,
    pendingReceiptsCount,
    productSearch,
    receiptQuantities,
    searchModalOpen,
    searchableProducts,
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
  } = useTransfersPage();

  const [cancelConfirm, setCancelConfirm] = useState({
    isOpen: false,
    orderId: "",
    folio: "",
    originBranchName: "",
    requestedUnits: 0,
    loading: false,
  });

  const [detailOrder, setDetailOrder] = useState(null);

  const openOrderDetail = (order) => {
    if (!order?.id) return;
    setDetailOrder(order);
  };

  const closeOrderDetail = () => setDetailOrder(null);

  const handleHistoryRowClick = (order, event) => {
    const target = event?.currentTarget;
    const clickedCell = event?.target;

    if (
      clickedCell &&
      target &&
      target.tagName === "TR" &&
      clickedCell.closest("td:last-child")
    ) {
      return;
    }

    openOrderDetail(order);
  };

  const closeCancelConfirm = () => {
    setCancelConfirm({
      isOpen: false,
      orderId: "",
      folio: "",
      originBranchName: "",
      requestedUnits: 0,
      loading: false,
    });
  };

  const showCancelConfirm = (order) => {
    if (!order?.id) return;
    setCancelConfirm({
      isOpen: true,
      orderId: order.id,
      folio: String(order.folio || order.id).toUpperCase(),
      originBranchName: String(
        order.originBranchName || "la sucursal origen"
      ),
      requestedUnits: Number(order.totals?.requestedUnits ?? 0),
      loading: false,
    });
  };

  const handleConfirmCancel = async () => {
    const orderId = cancelConfirm.orderId;
    if (!orderId) {
      closeCancelConfirm();
      return;
    }

    setCancelConfirm((prev) => ({ ...prev, loading: true }));

    try {
      await handleCancelTransfer(orderId);
    } finally {
      closeCancelConfirm();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <HeroSection
          branch={branch}
          pendingReceiptsCount={pendingReceiptsCount}
          transferMetrics={transferMetrics}
        />

        <FeedbackBanner error={error} success={success} />

        <RouteTabs
          activeTab={activeTab}
          pendingReceiptsCount={pendingReceiptsCount}
          onTabChange={handleTabChange}
        />

        {activeTab === "send" ? (
          <SendWorkspace
            destinationBranchId={destinationBranchId}
            destinationOptions={destinationOptions}
            loadingBranches={loadingBranches}
            submitting={submitting}
            productSearch={productSearch}
            transferNotes={transferNotes}
            draftItems={draftItems}
            draftTotals={draftTotals}
            onDestinationChange={setDestinationBranchId}
            onProductSearchChange={handleLookupProductSearchChange}
            onLookupProduct={handleLookupProduct}
            onOpenSearchModal={openSearchModal}
            onTransferNotesChange={setTransferNotes}
            onDraftQuantityChange={handleDraftQuantityChange}
            onRemoveDraftItem={handleRemoveDraftItem}
            onSubmitTransfer={handleSubmitTransfer}
          />
        ) : null}

        <InventorySearchModal
          isOpen={searchModalOpen}
          onClose={closeSearchModal}
          products={searchableProducts}
          onSelect={loadProductForTransfer}
          loading={loadingProducts}
        />

        {activeTab === "receive" ? (
          <ReceiveWorkspace
            submitting={submitting}
            pendingReceiptsCount={pendingReceiptsCount}
            pendingReceiptOrders={pendingReceiptOrders}
            selectedReceiptOrder={selectedReceiptOrder}
            receiptQuantities={receiptQuantities}
            onSelectReceiptOrder={handleSelectReceiptOrder}
            onReceiptQuantityChange={handleReceiptQuantityChange}
            onConfirmReceipt={handleConfirmReceipt}
          />
        ) : null}

        {activeTab === "history" ? (
          <HistoryTable
            branch={branch}
            transferHistory={transferHistory}
            cancellableTransferIds={cancellableTransferIds}
            submitting={submitting}
            cancelConfirmLoading={cancelConfirm.loading}
            onRowClick={handleHistoryRowClick}
            onCancelClick={showCancelConfirm}
          />
        ) : null}
      </div>

      <CancelConfirmModal
        isOpen={cancelConfirm.isOpen}
        folio={cancelConfirm.folio}
        requestedUnits={cancelConfirm.requestedUnits}
        originBranchName={cancelConfirm.originBranchName}
        loading={cancelConfirm.loading}
        onConfirm={handleConfirmCancel}
        onCancel={closeCancelConfirm}
        onClose={closeCancelConfirm}
      />

      <TransferDetailModal
        order={detailOrder}
        branch={branch}
        products={products}
        onClose={closeOrderDetail}
      />
    </div>
  );
};

export default PageTransfers;
