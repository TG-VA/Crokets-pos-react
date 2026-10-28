import { useEffect, useRef } from "react";

import styles from "../PageOrders.module.css";
import { formatQuantity } from "../utils/ordersFormatters";
import { RECEIPT_NOTE_MAX_LENGTH } from "../utils/ordersCalculationService";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../PaginationBar/PaginationBar";
import BranchBadge from "./BranchBadge";
import ChangeIcon from "../../../../../assets/icons/changeIcon.svg";
import CheckIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import WarningIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";
import ImportIcon from "../../../../../assets/icons/file-import-solid-full.svg";

const RECEIPT_PAGE_SIZES = [10, 25, 50];

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

const ReceiptPanel = ({
  order,
  quantities,
  isComplete,
  missingItems,
  receiptNote = "",
  isNoteRequired = false,
  noteError = "",
  error,
  isSubmitting,
  canSubmit,
  onChangeOrder,
  onQuantityChange,
  onReceiptNoteChange,
  getDifferencePreview,
  onSubmit,
}) => {
  const tableRef = useRef(null);
  const shouldFocusRef = useRef(false);

  const pagination = usePagination({
    totalItems: order.items.length,
    defaultPageSize: 10,
    pageSizeOptions: RECEIPT_PAGE_SIZES,
    storageKey: "crokets_receipt_items_page_size",
  });
  const { currentPage, pageSize, handlePageChange } = pagination;

  useEffect(() => {
    if (!shouldFocusRef.current) return;

    shouldFocusRef.current = false;
    tableRef.current?.querySelector("input:not([disabled])")?.focus();
  }, [currentPage, pageSize]);

  const goToPage = (page) => {
    shouldFocusRef.current = true;
    handlePageChange(page);
  };

  const goToFirstMissing = () => {
    const firstMissing = missingItems[0];
    const index = order.items.findIndex(
      (item) => item.productId === firstMissing?.productId
    );

    if (index < 0) return;

    goToPage(Math.floor(index / pageSize) + 1);
  };

  const capturedCount = order.items.length - missingItems.length;
  const visibleItems = pagination.pageItems(order.items);

  return (
    <div className={styles.receiptPanel}>
      <div className={styles.receiptHeader}>
        <div>
          <span className={styles.orderFolio}>{order.orderNumber}</span>
          <h3 className={styles.receiptTitle}>{order.orderName}</h3>
          <p className={styles.receiptRoute}>
            <BranchBadge role="origin" name={order.fromBranchName} />
            <span className={styles.routeConnector}>hacia</span>
            <BranchBadge role="destination" name={order.toBranchName} />
          </p>
        </div>
        <button
          type="button"
          className={styles.changeOrderButton}
          onClick={onChangeOrder}
          disabled={isSubmitting}
        >
          <img src={ChangeIcon} alt="" aria-hidden="true" />
          Cambiar pedido
        </button>
      </div>

      <div className={styles.receiptProgress}>
        <span>
          {capturedCount} de {order.items.length} productos capturados
        </span>
        <progress
          className={styles.progressBar}
          value={capturedCount}
          max={order.items.length}
          aria-label="Productos capturados"
        />
      </div>

      <div className={styles.tableWrapper} ref={tableRef}>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Departamento</th>
              <th className={styles.numeric}>Esperado</th>
              <th className={styles.numeric}>Conteo físico</th>
              <th className={styles.numeric}>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => {
              const difference = getDifferencePreview(item);
              const value = quantities[item.productId] ?? "";

              return (
                <tr key={item.id || item.productId}>
                  <td>{item.barcode || "—"}</td>
                  <td className={styles.productNameCell}>{item.productName}</td>
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

      {order.items.length > pageSize ? (
        <div className={styles.paginationFooter}>
          <PaginationBar
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            pageSize={pageSize}
            pageSizeOptions={RECEIPT_PAGE_SIZES}
            onPageChange={goToPage}
            onPageSizeChange={pagination.handlePageSizeChange}
            totalItems={order.items.length}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            itemsNoun="productos"
            labelMode="range"
          />
        </div>
      ) : null}

      {error ? (
        <p className={styles.inlineError} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.receiptNoteField}>
        <label className={styles.receiptNoteLabel} htmlFor="receipt-note">
          {isNoteRequired
            ? "Nota (obligatoria por diferencias)"
            : "Nota (opcional)"}
        </label>
        <textarea
          id="receipt-note"
          className={styles.receiptNoteInput}
          value={receiptNote}
          onChange={(event) => onReceiptNoteChange?.(event.target.value)}
          maxLength={RECEIPT_NOTE_MAX_LENGTH}
          rows={3}
          placeholder="Describe el faltante o sobrante"
          aria-invalid={Boolean(noteError)}
          aria-describedby={
            noteError ? "receipt-note-error" : "receipt-note-help"
          }
          disabled={isSubmitting}
        />
        {noteError ? (
          <p
            id="receipt-note-error"
            className={styles.inlineError}
            role="alert"
          >
            {noteError}
          </p>
        ) : (
          <p id="receipt-note-help" className={styles.receiptNoteHelp}>
            Máximo {RECEIPT_NOTE_MAX_LENGTH} caracteres.
          </p>
        )}
      </div>

      <footer className={styles.receiptFooter}>
        <div className={styles.receiptStatus} role="status" aria-live="polite">
          {isComplete ? (
            <span className={`${styles.statusPill} ${styles.statusPillOk}`}>
              <img src={CheckIcon} alt="" aria-hidden="true" />
              Conteo completo
            </span>
          ) : (
            <>
              <span
                className={`${styles.statusPill} ${styles.statusPillMissing}`}
              >
                <img src={WarningIcon} alt="" aria-hidden="true" />
                Faltan {missingItems.length}{" "}
                {missingItems.length === 1 ? "producto" : "productos"} por
                capturar
              </span>
              {order.items.length > pageSize ? (
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={goToFirstMissing}
                >
                  Ir al primer pendiente
                </button>
              ) : null}
            </>
          )}
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          <img src={ImportIcon} alt="" aria-hidden="true" />
          {isSubmitting ? "Registrando..." : "Registrar recepción"}
        </button>
      </footer>
    </div>
  );
};

export default ReceiptPanel;
