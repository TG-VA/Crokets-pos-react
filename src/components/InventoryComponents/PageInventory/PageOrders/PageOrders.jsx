import styles from "./PageOrders.module.css";
import { useOrdersPage } from "./hooks/useOrdersPage";
import OrdersHeroSection from "./components/OrdersHeroSection";
import OrdersRouteTabs from "./components/OrdersRouteTabs";
import FeedbackBanner from "./components/FeedbackBanner";
import ReceiveOrdersWorkspace from "./components/ReceiveOrdersWorkspace";
import CreateOrderWorkspace from "./components/CreateOrderWorkspace";
import OrdersHistoryTable from "./components/OrdersHistoryTable";
import OrderDetailModal from "./components/OrderDetailModal";
import OrderPrintModal from "./components/OrderPrintModal";
import AdminAuthorizationModal from "../../../AdminAuthorizationModal/AdminAuthorizationModal";

const PageOrders = () => {
  const page = useOrdersPage();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <OrdersHeroSection summary={page.summary} />

        <OrdersRouteTabs
          activeTab={page.activeTab}
          pendingCount={page.pendingOrders.length}
          createAccessGranted={page.createAccessGranted}
          onSelectTab={page.handleTabSelect}
        />

        <FeedbackBanner
          feedback={page.feedback}
          onDismiss={page.dismissFeedback}
        />

        {page.activeTab === "receive" ? (
          <ReceiveOrdersWorkspace
            pendingOrders={page.pendingOrders}
            selectedOrder={page.receiveForm.selectedOrder}
            quantities={page.receiveForm.quantities}
            receiptNote={page.receiveForm.receiptNote}
            isNoteRequired={page.receiveForm.isNoteRequired}
            noteError={page.receiveForm.noteError}
            isComplete={page.receiveForm.isComplete}
            missingItems={page.receiveForm.missingItems}
            error={page.receiveForm.error || page.error}
            isSubmitting={page.receiveForm.isSubmitting}
            canSubmit={page.receiveForm.canSubmit}
            currentBranchName={page.currentBranch?.name}
            onSelectOrder={page.receiveForm.selectOrder}
            onQuantityChange={page.receiveForm.setQuantity}
            onReceiptNoteChange={page.receiveForm.setReceiptNote}
            getDifferencePreview={page.receiveForm.getDifferencePreview}
            onSubmit={page.receiveForm.submitReceipt}
            onOpenDetail={page.openDetail}
          />
        ) : null}

        {page.activeTab === "create" ? (
          <CreateOrderWorkspace
            form={page.createForm}
            products={page.products}
            onSave={page.handleCreate}
          />
        ) : null}

        {page.activeTab === "history" ? (
          <OrdersHistoryTable
            orders={page.orders}
            branches={page.branches}
            lockedDestinationId={page.historyLockedDestinationId}
            onOpenDetail={page.openDetail}
            onOpenPrint={page.openPrint}
          />
        ) : null}
      </div>

      <OrderDetailModal order={page.detailOrder} onClose={page.closeDetail} />

      <OrderPrintModal order={page.printOrder} onClose={page.closePrint} />

      <AdminAuthorizationModal
        isOpen={page.adminAuthOpen}
        onClose={page.closeAdminAuth}
        onAuthorized={page.handleAdminAuthorized}
        action="inventory_orders_create"
        title="Autorización para crear pedidos"
        message="Crear pedidos de abastecimiento entre sucursales requiere autorización de un administrador."
      />
    </div>
  );
};

export default PageOrders;
