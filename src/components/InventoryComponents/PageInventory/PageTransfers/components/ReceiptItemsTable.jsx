import PaginationBar from "../../../../PaginationBar/PaginationBar";
import { usePagination } from "../../../../../hooks/usePagination";
import styles from "../PageTransfers.module.css";
import { normalizeReceivedQuantity } from "../utils/transfersUtils";

const RECEIPT_PAGE_SIZE = 5;

const ReceiptItemsTable = ({
  items = [],
  receiptQuantities,
  onReceiptQuantityChange,
}) => {
  const { currentPage, totalPages, pageSize, pageItems, handlePageChange } =
    usePagination({
      totalItems: items.length,
      defaultPageSize: RECEIPT_PAGE_SIZE,
      pageSizeOptions: [RECEIPT_PAGE_SIZE],
    });

  return (
    <>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Solicitado</th>
              <th>Recibido</th>
              <th>Regresa</th>
            </tr>
          </thead>
          <tbody>
            {pageItems(items).map((item) => {
              const requestedQty = Number(item.requestedQty ?? 0);
              const receivedValue = receiptQuantities[item.productId] ?? "0";
              const receivedQty = Number(receivedValue);
              const normalizedReceivedQty = Number.isFinite(receivedQty)
                ? receivedQty
                : 0;
              const returnedQty = Math.max(
                0,
                requestedQty - normalizedReceivedQty
              );

              return (
                <tr key={item.productId}>
                  <td>
                    <div className={styles.productCell}>
                      <strong>{item.name}</strong>
                      <span>{item.barcode}</span>
                    </div>
                  </td>
                  <td>{requestedQty}</td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={styles.quantityInput}
                      aria-label={`Cantidad recibida de ${item.name}`}
                      value={receivedValue}
                      onChange={(event) =>
                        onReceiptQuantityChange(
                          item.productId,
                          normalizeReceivedQuantity(
                            event.target.value,
                            requestedQty
                          )
                        )
                      }
                    />
                  </td>
                  <td>{returnedQty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={items.length}
          pageSize={pageSize}
          itemsNoun="productos"
          onPageChange={handlePageChange}
        />
      ) : null}
    </>
  );
};

export default ReceiptItemsTable;
