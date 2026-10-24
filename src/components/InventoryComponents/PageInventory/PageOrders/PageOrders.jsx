import React from "react";

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
            isComplete={page.receiveForm.isComplete}
            missingItems={page.receiveForm.missingItems}
            error={page.receiveForm.error || page.error}
            isSubmitting={page.receiveForm.isSubmitting}
            canSubmit={page.receiveForm.canSubmit}
            currentBranchName={page.currentBranch?.name}
            onSelectOrder={page.receiveForm.selectOrder}
            onQuantityChange={page.receiveForm.setQuantity}
            getDifferencePreview={page.receiveForm.getDifferencePreview}
            onSubmit={page.receiveForm.submitReceipt}
            onCreateOrder={(event) => page.handleTabSelect("create", event)}
            onOpenDetail={page.openDetail}
          />
        ) : null}

        {page.activeTab === "create" ? (
          <CreateOrderWorkspace
            form={page.createForm}
            products={page.products}
            onSave={page.handleCreate}
            onCancel={(event) => page.handleTabSelect("receive", event)}
          />
        ) : null}

        {page.activeTab === "history" ? (
          <OrdersHistoryTable
            orders={page.orders}
            branches={page.branches}
            onOpenDetail={page.openDetail}
            onOpenPrint={page.openPrint}
          />
        ) : null}
      </div>

      <OrderDetailModal
        order={detailOrder}
        onClose={closeDetailModal}
        onPrint={(order, printWindow) => {
          closeDetailModal();
          openPrintModal(order, printWindow);
        }}
      />

      <OrderPrintModal
        order={page.printOrder}
        onClose={page.closePrint}
        onConfirm={(order, preOpenedWindow) =>
          page.handlePrint(order || page.printOrder, preOpenedWindow)
        }
      />

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
