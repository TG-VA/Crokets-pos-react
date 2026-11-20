import { useEffect, useRef } from "react";

import styles from "../PageOrders.module.css";
import receiptStyles from "../ReceiptPanel.module.css";
import { getOrderItemStatus } from "../utils/ordersCalculationService";
import { ITEM_STATUS_DIFFERENCE_CLASS } from "../utils/differenceToneClasses";
import {
  formatQuantity,
  formatSignedQuantity,
} from "../utils/ordersFormatters";
import { usePagination } from "../../../../../hooks/usePagination";
import BranchBadge from "./BranchBadge";
import ReceiptNoteField from "./ReceiptNoteField";
import ItemsPaginationFooter, {
  ITEMS_PAGE_SIZES,
} from "./ItemsPaginationFooter";
import ChangeIcon from "../../../../../assets/icons/changeIcon.svg";
import CheckIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import WarningIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";
import ImportIcon from "../../../../../assets/icons/file-import-solid-full.svg";

const getDifferenceClass = (difference) =>
  ITEM_STATUS_DIFFERENCE_CLASS[
    getOrderItemStatus({ differenceQty: difference }, "accepted")
  ];

const getDifferenceLabel = (difference) => {
  if (difference === null) return "Pendiente";
  if (difference === 0) return "Sin diferencia";
  return formatSignedQuantity(difference);
};

const ReceiptPanel = ({
  order,
  quantities,
  costs = {},
  isComplete,
  missingItems,
  missingCostCount = 0,
  receiptNote = "",
  isNoteRequired = false,
  noteError = "",
  error,
  isSubmitting,
  canSubmit,
  onChangeOrder,
  onQuantityChange,
  onCostChange,
  onReceiptNoteChange,
  getDifferencePreview,
  onSubmit,
}) => {
  const tableRef = useRef(null);
  const shouldFocusRef = useRef(false);

  const pagination = usePagination({
    totalItems: order.items.length,
    defaultPageSize: 10,
    pageSizeOptions: ITEMS_PAGE_SIZES,
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
    <div className={receiptStyles.receiptPanel}>
      <div className={receiptStyles.receiptHeader}>
        <div>
          <span className={styles.orderFolio}>{order.orderNumber}</span>
          <h3 className={receiptStyles.receiptTitle}>{order.orderName}</h3>
          <p className={receiptStyles.receiptRoute}>
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

      <div className={receiptStyles.receiptProgress}>
        <span>
          {capturedCount} de {order.items.length} productos capturados
        </span>
        <progress
          className={receiptStyles.progressBar}
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
              <th className={styles.numeric}>Costo</th>
              <th className={styles.numeric}>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => {
              const difference = getDifferencePreview(item);
              const value = quantities[item.productId] ?? "";
              const cost = costs[item.productId] ?? "";

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
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.quantityInput}
                      value={cost}
                      onChange={(event) =>
                        onCostChange(item.productId, event.target.value)
                      }
                      onFocus={(event) => event.target.select()}
                      placeholder="0.00"
                      aria-label={`Costo unitario de ${item.productName}`}
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
        <ItemsPaginationFooter
          pagination={pagination}
          totalItems={order.items.length}
          onPageChange={goToPage}
        />
      ) : null}

      {error ? (
        <p className={styles.inlineError} role="alert">
          {error}
        </p>
      ) : null}

      <ReceiptNoteField
        value={receiptNote}
        isRequired={isNoteRequired}
        error={noteError}
        isDisabled={isSubmitting}
        onChange={onReceiptNoteChange}
      />

      <footer className={receiptStyles.receiptFooter}>
        <div
          className={receiptStyles.receiptStatus}
          role="status"
          aria-live="polite"
        >
          {isComplete && missingCostCount > 0 ? (
            <span
              className={`${receiptStyles.statusPill} ${receiptStyles.statusPillMissing}`}
            >
              <img src={WarningIcon} alt="" aria-hidden="true" />
              Falta el costo de {missingCostCount}{" "}
              {missingCostCount === 1 ? "producto" : "productos"}
            </span>
          ) : isComplete ? (
            <span
              className={`${receiptStyles.statusPill} ${receiptStyles.statusPillOk}`}
            >
              <img src={CheckIcon} alt="" aria-hidden="true" />
              Conteo completo
            </span>
          ) : (
            <>
              <span
                className={`${receiptStyles.statusPill} ${receiptStyles.statusPillMissing}`}
              >
                <img src={WarningIcon} alt="" aria-hidden="true" />
                Faltan {missingItems.length}{" "}
                {missingItems.length === 1 ? "producto" : "productos"} por
                capturar
              </span>
              {order.items.length > pageSize ? (
                <button
                  type="button"
                  className={receiptStyles.linkButton}
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
