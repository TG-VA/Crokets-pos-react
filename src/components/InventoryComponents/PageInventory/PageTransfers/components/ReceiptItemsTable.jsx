import { useEffect, useRef } from "react";

import PaginationBar from "../../../../PaginationBar/PaginationBar";
import { usePagination } from "../../../../../hooks/usePagination";
import styles from "../PageTransfers.module.css";
import { normalizeReceivedQuantity } from "../utils/transfersUtils";

const RECEIPT_PAGE_SIZE = 5;

const ReceiptItemsTable = ({
  items = [],
  receiptQuantities,
  onReceiptQuantityChange,
  onLastItemEnter,
}) => {
  const inputRefs = useRef(new Map());
  const pendingFocusId = useRef(null);

  const { currentPage, totalPages, pageSize, pageItems, handlePageChange } =
    usePagination({
      totalItems: items.length,
      defaultPageSize: RECEIPT_PAGE_SIZE,
      pageSizeOptions: [RECEIPT_PAGE_SIZE],
    });

  // Enfoca el input pendiente cuando el cambio de pagina ya se reflejo en el DOM.
  useEffect(() => {
    const pendingId = pendingFocusId.current;

    if (!pendingId) {
      return;
    }

    const pendingInput = inputRefs.current.get(pendingId);

    if (!pendingInput) {
      return;
    }

    pendingFocusId.current = null;
    pendingInput.focus();
  }, [currentPage]);

  const registerInput = (productId, node) => {
    if (node) {
      inputRefs.current.set(productId, node);
      return;
    }

    inputRefs.current.delete(productId);
  };

  const handleInputKeyDown = (event, item) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    const currentIndex = items.findIndex(
      (candidate) => candidate.productId === item.productId
    );
    const nextItem = items[currentIndex + 1];

    if (!nextItem) {
      onLastItemEnter?.();
      return;
    }

    const nextPage = Math.floor((currentIndex + 1) / pageSize) + 1;

    if (nextPage !== currentPage) {
      pendingFocusId.current = nextItem.productId;
      handlePageChange(nextPage);
      return;
    }

    inputRefs.current.get(nextItem.productId)?.focus();
  };

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
                      ref={(node) => registerInput(item.productId, node)}
                      type="text"
                      inputMode="numeric"
                      className={styles.quantityInput}
                      aria-label={`Cantidad recibida de ${item.name}`}
                      value={receivedValue}
                      onFocus={(event) => event.target.select()}
                      onKeyDown={(event) => handleInputKeyDown(event, item)}
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
