import styles from "../PageOrders.module.css";
import {
  formatOrderDate,
  formatOrderDateTime,
  formatQuantity,
} from "../utils/ordersFormatters";
import { getOrderDifferences } from "../utils/ordersCalculationService";
import { usePagination } from "../../../../../hooks/usePagination";
import ItemsPaginationFooter, {
  ITEMS_PAGE_SIZES,
} from "./ItemsPaginationFooter";

/**
 * Cuerpo del modal de detalle. Mantiene una sola fuente para metadatos,
 * partidas, notas y diferencias.
 */
const OrderPreviewSections = ({ order }) => {
  const differences = getOrderDifferences(order?.items);
  const items = order?.items ?? [];

  const pagination = usePagination({
    totalItems: items.length,
    defaultPageSize: 10,
    pageSizeOptions: ITEMS_PAGE_SIZES,
    storageKey: "crokets_order_detail_page_size",
  });

  const visibleItems = pagination.pageItems(items);
  const receiptNoteMeta = [
    order?.receivedByLabel ? `Registrada por ${order.receivedByLabel}` : "",
    order?.acceptedAt ? formatOrderDate(order.acceptedAt) : "",
  ]
    .filter(Boolean)
    .join(" · ");

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

      {items.length > pagination.pageSize ? (
        <ItemsPaginationFooter
          pagination={pagination}
          totalItems={items.length}
        />
      ) : null}

      {order.notes ? (
        <div className={styles.detailNote}>
          <strong>Notas del pedido</strong>
          <p>{order.notes}</p>
        </div>
      ) : null}

      {order.receiptNotes ? (
        <section
          className={styles.receiptNoteCard}
          aria-labelledby="receipt-note-detail-title"
        >
          <header className={styles.receiptNoteHeader}>
            <strong
              id="receipt-note-detail-title"
              className={styles.receiptNoteTitle}
            >
              Nota de recepción
            </strong>
          </header>
          <p className={styles.receiptNoteText}>{order.receiptNotes}</p>
          {receiptNoteMeta ? (
            <p className={styles.receiptNoteMeta}>{receiptNoteMeta}</p>
          ) : null}
        </section>
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
