import styles from "../PageOrders.module.css";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../PaginationBar/PaginationBar";
import PendingOrderCard from "./PendingOrderCard";
import ReceiptPanel from "./ReceiptPanel";
import ClockIcon from "../../../../../assets/icons/clock-solid-full.svg";

const ORDER_CARD_PAGE_SIZES = [4, 8, 12];

const ReceiveOrdersWorkspace = ({
  pendingOrders = [],
  selectedOrder,
  quantities,
  receiptNote,
  isNoteRequired,
  noteError,
  isComplete,
  missingItems,
  error,
  isSubmitting,
  canSubmit,
  currentBranchName,
  onSelectOrder,
  onQuantityChange,
  onReceiptNoteChange,
  getDifferencePreview,
  onSubmit,
  onOpenDetail,
}) => {
  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    pageItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: pendingOrders.length,
    defaultPageSize: 4,
    pageSizeOptions: ORDER_CARD_PAGE_SIZES,
    storageKey: "crokets_receive_orders_cards_page_size",
  });

  const paginatedPendingOrders = pageItems(pendingOrders);

  return (
    <section
      className={styles.workspace}
      role="tabpanel"
      id="panel-receive"
      aria-labelledby="tab-receive"
      tabIndex={0}
    >
      <header className={styles.workspaceHeader}>
        <div>
          <p className={styles.eyebrow}>Recepción</p>
          <h2 className={styles.workspaceTitle}>Pedidos por recibir</h2>
          <span className={styles.branchBadge}>
            Sucursal activa: {currentBranchName || "Sin sucursal"}
          </span>
          <p className={styles.workspaceDescription}>
            Captura manualmente la cantidad recibida de cada producto. El
            sistema no precarga la cantidad esperada.
          </p>
        </div>
      </header>

      {pendingOrders.length === 0 ? (
        <div className={styles.emptyState}>
          <img src={ClockIcon} alt="" aria-hidden="true" />
          <h3>No hay pedidos pendientes</h3>
          <p>No hay pedidos pendientes de entrega para esta sucursal.</p>
        </div>
      ) : null}

      {pendingOrders.length > 0 && !selectedOrder ? (
        <>
          <div className={styles.orderCards}>
            {paginatedPendingOrders.map((order) => (
              <PendingOrderCard
                key={order.id}
                order={order}
                onOpenDetail={onOpenDetail}
                onSelectOrder={onSelectOrder}
              />
            ))}
          </div>
          {pendingOrders.length > pageSize && (
            <div className={styles.paginationFooter}>
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                pageSizeOptions={ORDER_CARD_PAGE_SIZES}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                totalItems={pendingOrders.length}
                startIndex={startIndex}
                endIndex={endIndex}
                itemsNoun="pedidos"
                labelMode="range"
              />
            </div>
          )}
        </>
      ) : null}

      {selectedOrder ? (
        <ReceiptPanel
          key={selectedOrder.id}
          order={selectedOrder}
          quantities={quantities}
          receiptNote={receiptNote}
          isNoteRequired={isNoteRequired}
          noteError={noteError}
          isComplete={isComplete}
          missingItems={missingItems}
          error={error}
          isSubmitting={isSubmitting}
          canSubmit={canSubmit}
          onChangeOrder={() => onSelectOrder(null)}
          onQuantityChange={onQuantityChange}
          onReceiptNoteChange={onReceiptNoteChange}
          getDifferencePreview={getDifferencePreview}
          onSubmit={onSubmit}
        />
      ) : null}
    </section>
  );
};

export default ReceiveOrdersWorkspace;
