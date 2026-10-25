import styles from "../PageOrders.module.css";
import {
  formatOrderDateTime,
  formatQuantity,
  getOrderStatusMeta,
} from "../utils/ordersFormatters";
import { getStatusToneClass } from "../utils/ordersStatusClasses";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../PaginationBar/PaginationBar";
import ClockIcon from "../../../../../assets/icons/clock-solid-full.svg";
import ImportIcon from "../../../../../assets/icons/file-import-solid-full.svg";
import CheckIcon from "../../../../../assets/icons/circle-check-solid-full.svg";

const ORDER_CARD_PAGE_SIZES = [4, 8, 12];

const getDifferenceClass = (difference) => {
  if (difference === null) return styles.differencePending;
  if (difference === 0) return styles.differenceOk;
  if (difference > 0) return styles.differenceOver;
  return styles.differenceShort;
};

const getDifferenceLabel = (difference) => {
  if (difference === null) return "Pendiente";
  if (difference === 0) return "Sin diferencia";
  if (difference > 0) return `+${formatQuantity(difference)}`;
  return formatQuantity(difference);
};

const ReceiveOrdersWorkspace = ({
  pendingOrders = [],
  selectedOrder,
  quantities,
  isComplete,
  missingItems,
  error,
  isSubmitting,
  canSubmit,
  currentBranchName,
  onSelectOrder,
  onQuantityChange,
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
            {paginatedPendingOrders.map((order) => {
              const status = getOrderStatusMeta(order.status);

              return (
                <article key={order.id} className={styles.orderCard}>
                  <div className={styles.orderCardHeader}>
                    <div>
                      <span className={styles.orderFolio}>
                        {order.orderNumber}
                      </span>
                      <h3 className={styles.orderCardTitle}>
                        {order.orderName}
                      </h3>
                    </div>
                    <span
                      className={[
                        styles.statusBadge,
                        getStatusToneClass(styles, status.tone),
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {status.label}
                    </span>
                  </div>

                  <dl className={styles.orderMeta}>
                    <div>
                      <dt>Origen</dt>
                      <dd>{order.fromBranchName}</dd>
                    </div>
                    <div>
                      <dt>Enviado</dt>
                      <dd>{formatOrderDateTime(order.sentAt)}</dd>
                    </div>
                    <div>
                      <dt>Productos</dt>
                      <dd>{order.items.length}</dd>
                    </div>
                  </dl>

                  <p className={styles.orderDepartments}>
                    {order.departments.join(", ") || "Sin departamento"}
                  </p>

                  <div className={styles.orderCardActions}>
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={() => onOpenDetail(order)}
                    >
                      Ver detalle
                    </button>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => onSelectOrder(order)}
                    >
                      <img src={ImportIcon} alt="" aria-hidden="true" />
                      Recibir pedido
                    </button>
                  </div>
                </article>
              );
            })}
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
        <div className={styles.receiptPanel}>
          <div className={styles.receiptHeader}>
            <div>
              <span className={styles.orderFolio}>
                {selectedOrder.orderNumber}
              </span>
              <h3 className={styles.receiptTitle}>{selectedOrder.orderName}</h3>
              <p className={styles.receiptRoute}>
                {selectedOrder.fromBranchName} hacia{" "}
                {selectedOrder.toBranchName}
              </p>
            </div>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => onSelectOrder(null)}
              disabled={isSubmitting}
            >
              Cambiar pedido
            </button>
          </div>

          <div className={styles.receiptProgress}>
            <span>
              {selectedOrder.items.length - missingItems.length} de{" "}
              {selectedOrder.items.length} productos capturados
            </span>
            <progress
              className={styles.progressBar}
              value={selectedOrder.items.length - missingItems.length}
              max={selectedOrder.items.length}
              aria-label="Productos capturados"
            />
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Producto</th>
                  <th>Departamento</th>
                  <th className={styles.numeric}>Esperado</th>
                  <th className={styles.numeric}>Conteo fisico</th>
                  <th className={styles.numeric}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item) => {
                  const difference = getDifferencePreview(item);
                  const value = quantities[item.productId] ?? "";

                  return (
                    <tr key={item.id || item.productId}>
                      <td>{item.barcode || "—"}</td>
                      <td className={styles.productNameCell}>
                        {item.productName}
                      </td>
                      <td>{item.departmentName || "Sin departamento"}</td>
                      <td className={styles.numeric}>
                        {formatQuantity(item.expectedQty)}
                      </td>
                      <td className={styles.numeric}>
                        <input
                          type="text"
                          inputMode="numeric"
                          className={styles.quantityInput}
                          value={value}
                          onChange={(event) =>
                            onQuantityChange(item.productId, event.target.value)
                          }
                          onFocus={(event) => event.target.select()}
                          placeholder="Captura"
                          aria-label={`Cantidad recibida de ${item.productName}`}
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className={styles.numeric}>
                        <span
                          className={[
                            styles.differenceBadge,
                            getDifferenceClass(difference),
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {getDifferenceLabel(difference)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error ? (
            <p className={styles.inlineError} role="alert">
              {error}
            </p>
          ) : null}

          <footer className={styles.receiptFooter}>
            <div className={styles.receiptHint}>
              <img src={CheckIcon} alt="" aria-hidden="true" />
              <span>
                {isComplete
                  ? "Conteo completo. Revisa diferencias antes de confirmar."
                  : `Faltan ${missingItems.length} producto(s) por capturar.`}
              </span>
            </div>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={onSubmit}
              disabled={!canSubmit}
            >
              <img src={ImportIcon} alt="" aria-hidden="true" />
              {isSubmitting ? "Registrando..." : "Registrar recepcion"}
            </button>
          </footer>
        </div>
      ) : null}
    </section>
  );
};

export default ReceiveOrdersWorkspace;
