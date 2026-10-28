import styles from "../PageOrders.module.css";
import { formatOrderDateTime, formatQuantity } from "../utils/ordersFormatters";
import { getOrderDifferences } from "../utils/ordersCalculationService";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../PaginationBar/PaginationBar";

const DETAIL_PAGE_SIZES = [10, 25, 50];

/**
 * Cuerpo compartido del detalle y de la vista previa de exportacion.
 * Mantiene una sola fuente para metadatos, partidas, notas y diferencias,
 * de modo que ambas vistas no puedan divergir.
 *
 * `paginated` pagina la tabla de partidas (modal de detalle). La vista previa
 * de impresion lo deja apagado para imprimir todas las partidas.
 */
const OrderPreviewSections = ({ order, paginated = false }) => {
  const differences = getOrderDifferences(order?.items);
  const items = order?.items ?? [];

  const pagination = usePagination({
    totalItems: paginated ? items.length : 0,
    defaultPageSize: 10,
    pageSizeOptions: DETAIL_PAGE_SIZES,
    storageKey: "crokets_order_detail_page_size",
  });

  const visibleItems = paginated ? pagination.pageItems(items) : items;

  if (!order) return null;

  return (
    <>
      <dl className={styles.detailMeta}>
        <div>
          <dt>Enviado</dt>
          <dd>{formatOrderDateTime(order.sentAt)}</dd>
        </div>
        <div>
          <dt>Recibido</dt>
          <dd>
            {order.acceptedAt
              ? formatOrderDateTime(order.acceptedAt)
              : "Pendiente"}
          </dd>
        </div>
        <div>
          <dt>Generado por</dt>
          <dd>{order.createdByLabel || "—"}</dd>
        </div>
        <div>
          <dt>Recibido por</dt>
          <dd>{order.receivedByLabel || "—"}</dd>
        </div>
        <div>
          <dt>Departamentos</dt>
          <dd>{order.departments.join(", ") || "Sin departamento"}</dd>
        </div>
        <div>
          <dt>Productos</dt>
          <dd>{order.items?.length || 0}</dd>
        </div>
      </dl>

      <div className={styles.tableWrapper}>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Departamento</th>
              <th className={styles.numeric}>Esperado</th>
              <th className={styles.numeric}>Recibido</th>
              <th className={styles.numeric}>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => {
              const hasDifference =
                item?.differenceQty !== undefined &&
                item?.differenceQty !== null &&
                Number(item.differenceQty) !== 0;

              return (
                <tr
                  key={item.id || item.productId}
                  className={
                    hasDifference ? styles.rowWithDifference : undefined
                  }
                >
                  <td>{item.barcode || "—"}</td>
                  <td>{item.productName}</td>
                  <td>{item.departmentName || "Sin departamento"}</td>
                  <td className={styles.numeric}>
                    {formatQuantity(item.expectedQty)}
                  </td>
                  <td className={styles.numeric}>
                    {formatQuantity(item.receivedQty)}
                  </td>
                  <td className={styles.numeric}>
                    {formatQuantity(item.differenceQty)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {paginated && items.length > pagination.pageSize ? (
        <div className={styles.paginationFooter}>
          <PaginationBar
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            pageSizeOptions={DETAIL_PAGE_SIZES}
            onPageChange={pagination.handlePageChange}
            onPageSizeChange={pagination.handlePageSizeChange}
            totalItems={items.length}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            itemsNoun="productos"
            labelMode="range"
          />
        </div>
      ) : null}

      {order.notes ? (
        <div className={styles.detailNote}>
          <strong>Notas del pedido</strong>
          <p>{order.notes}</p>
        </div>
      ) : null}

      {order.receiptNotes ? (
        <div className={`${styles.detailNote} ${styles.detailReceiptNote}`}>
          <strong>Nota de recepción</strong>
          <p>{order.receiptNotes}</p>
        </div>
      ) : null}

      {differences.length > 0 ? (
        <div className={styles.differencesSection}>
          <strong>Diferencias de recepción</strong>
          <div className={styles.tableWrapper}>
            <table className={styles.differencesTable}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Departamento</th>
                  <th className={styles.numeric}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {differences.map((item) => {
                  const difference = Number(item.differenceQty);
                  const isPositive = difference > 0;
                  const differenceLabel = isPositive
                    ? `+${formatQuantity(difference)}`
                    : formatQuantity(difference);

                  return (
                    <tr key={item.id || item.productId}>
                      <td>{item.barcode || "—"}</td>
                      <td>{item.productName}</td>
                      <td>{item.departmentName || "Sin departamento"}</td>
                      <td className={styles.numeric}>
                        <span
                          className={
                            isPositive
                              ? styles.differencePositive
                              : styles.differenceNegative
                          }
                        >
                          {differenceLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default OrderPreviewSections;
