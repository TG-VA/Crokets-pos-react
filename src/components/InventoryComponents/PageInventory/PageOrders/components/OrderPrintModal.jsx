import React, { useEffect, useRef, useState } from "react";

import AppModal from "../../../../AppModal/AppModal";
import styles from "../PageOrders.module.css";
import {
  formatOrderDateTime,
  formatQuantity,
  getOrderStatusMeta,
} from "../utils/ordersFormatters";

const STATUS_CLASS = {
  pending: styles.statusPending,
  success: styles.statusSuccess,
  warning: styles.statusWarning,
  danger: styles.statusDanger,
  neutral: styles.statusPending,
};

const OrderPrintModal = ({ order, onClose, onConfirm, onExportExcel }) => {
  const status = getOrderStatusMeta(order?.status);
  const [exportOpen, setExportOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const prevOrderIdRef = useRef(order?.id);

  useEffect(() => {
    if (prevOrderIdRef.current !== order?.id) {
      prevOrderIdRef.current = order?.id;
      setExportOpen(false);
    }
  }, [order?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target)
      ) {
        setExportOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExportPdf = () => {
    if (typeof window === "undefined") return;

    const printWindow = window.open("", "_blank", "width=900,height=700");

    setExportOpen(false);

    if (!printWindow) {
      if (onConfirm) {
        onConfirm(order);
      }
      return;
    }

    if (onConfirm) {
      onConfirm(order, printWindow);
    }
  };

  const handleExportExcel = async () => {
    setExportOpen(false);
    if (onExportExcel) {
      onExportExcel(order);
      return;
    }
    try {
      const { exportStoreOrderToExcel } =
        await import("../services/ordersExportExcelService");
      await exportStoreOrderToExcel(order);
    } catch (err) {
      console.error("Error al exportar pedido a Excel:", err);
    }
  };

  return (
    <AppModal
      isOpen={Boolean(order)}
      confirmText="Guardar PDF / Excel"
      cancelText="Cerrar"
      showCancel
      onConfirm={() => setExportOpen((prev) => !prev)}
      onCancel={onClose}
      onClose={onClose}
      size="large"
    >
      {order ? (
        <div className={styles.printPreview}>
          <div className={styles.printHeader}>
            <div>
              <span className={styles.eyebrow}>Pedido de abastecimiento</span>
              <h3 className={styles.detailTitle}>
                {order.orderNumber} - {order.orderName}
              </h3>
            </div>
            <span
              className={[
                styles.statusBadge,
                styles.statusBadgeBold,
                STATUS_CLASS[status.tone] || STATUS_CLASS.neutral,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {status.label}
            </span>
          </div>

          <dl className={styles.detailMeta}>
            <div>
              <dt>Origen</dt>
              <dd>{order.fromBranchName}</dd>
            </div>
            <div>
              <dt>Destino</dt>
              <dd>{order.toBranchName}</dd>
            </div>
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
                  <th>Codigo</th>
                  <th>Producto</th>
                  <th>Departamento</th>
                  <th className={styles.numeric}>Esperado</th>
                  <th className={styles.numeric}>Recibido</th>
                  <th className={styles.numeric}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item) => {
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

          {order.notes ? (
            <div className={styles.detailNote}>
              <strong>Notas del pedido</strong>
              <p>{order.notes}</p>
            </div>
          ) : null}

          {order.discrepancyNotes ? (
            <div className={`${styles.detailNote} ${styles.detailWarning}`}>
              <strong>Diferencias de recepcion</strong>
              <p>{order.discrepancyNotes}</p>
            </div>
          ) : null}

          <div className={styles.detailActions} ref={exportMenuRef}>
            {exportOpen ? (
              <div className={styles.exportMenu}>
                <button
                  type="button"
                  className={styles.exportMenuItem}
                  onClick={handleExportPdf}
                >
                  Exportar a PDF
                </button>
                <button
                  type="button"
                  className={styles.exportMenuItem}
                  onClick={handleExportExcel}
                >
                  Exportar a Excel
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppModal>
  );
};

export default OrderPrintModal;
