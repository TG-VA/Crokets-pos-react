import React from "react";
import AppModal from "../../../../../AppModal/AppModal";
import styles from "../../PageTransfers.module.css";
import {
  formatTransferDateTime,
  getTransferStatusMetaForBranch,
} from "../../utils/transfersUtils";

const TransferDetailModal = ({
  order,
  branch,
  products,
  onClose,
}) => {
  if (!order) return null;

  const items = Array.isArray(order?.items) ? order.items : [];
  const statusMeta = getTransferStatusMetaForBranch(order, branch?.id);

  const inventoryByProductId = new Map(
    (products || []).map((product) => {
      const productId = String(product?.id || product?.product_id || "");
      const currentStock = Number(product?.existencia ?? 0) || 0;
      return [productId, { currentStock }];
    })
  );

  const orderStatus = String(order?.status || "");
  const isCancelled = orderStatus === "cancelled";
  const isPending = orderStatus === "pending_receipt";
  const isOriginRoute =
    String(order?.originBranchId) === String(branch?.id);
  const isDestinationRoute =
    String(order?.destinationBranchId) === String(branch?.id);

  // Detecta si AL MENOS UNA fila tiene snapshot real (no NULL).
  // Importante: revisamos !== null/undefined (NO > 0), porque stock 0
  // es un valor valido y distinto de "traspaso antiguo sin dato".
  const hasAnyStockSnapshot = items.some((item) => {
    return (
      (item?.origin_stock_before !== null &&
        item?.origin_stock_before !== undefined) ||
      (item?.origin_stock_after !== null &&
        item?.origin_stock_after !== undefined) ||
      (item?.destination_stock_before !== null &&
        item?.destination_stock_before !== undefined) ||
      (item?.destination_stock_after !== null &&
        item?.destination_stock_after !== undefined)
    );
  });

  const previousStockLabel = hasAnyStockSnapshot
    ? "Inventario anterior"
    : "Inv. anterior";
  const postEventStockLabel = hasAnyStockSnapshot
    ? "Inventario post-evento"
    : "Inv. post-evento";
  const dashPlaceholder = "—";

  return (
    <AppModal
      isOpen={!!order}
      type="info"
      size="large"
      title={`Detalle del traspaso ${String(
        order?.folio || order?.id || ""
      ).toUpperCase()}`}
      confirmText="Cerrar"
      onClose={onClose}
      onConfirm={onClose}
    >
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderGrid}>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Origen</span>
            <span className={styles.detailValue}>
              {order?.originBranchName || "—"}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Destino</span>
            <span className={styles.detailValue}>
              {order?.destinationBranchName || "—"}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Estado</span>
            <span
              className={`${styles.statusBadge} ${
                styles[`status${statusMeta.tone}`]
              }`}
            >
              {statusMeta.label}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Creado por</span>
            <span className={styles.detailValue}>
              {order?.createdByUsername ||
                order?.createdByEmail ||
                "SISTEMA"}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Fecha de creación</span>
            <span className={styles.detailValue}>
              {formatTransferDateTime(order?.createdAt)}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Fecha de recepción</span>
            <span className={styles.detailValue}>
              {formatTransferDateTime(order?.receivedAt)}
            </span>
          </div>
        </div>

        {order?.notes ? (
          <div className={styles.detailNotes}>
            <span className={styles.detailLabel}>Notas</span>
            <p className={styles.detailNotesText}>{order.notes}</p>
          </div>
        ) : null}
      </div>

      <div className={styles.detailTableWrapper}>
        <table className={styles.detailTable}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Código / Barras</th>
              <th className={styles.alignRight}>Solicitado</th>
              <th className={styles.alignRight}>Recibido</th>
              <th className={styles.alignRight}>Devuelto</th>
              <th className={styles.alignRight}>Diferencia</th>
              <th
                className={styles.alignRight}
                title={
                  hasAnyStockSnapshot
                    ? "Foto historica tomada milisegundos ANTES del evento (envio o recepcion). 100% real, inamovible. Guion (—) significa traspaso creado antes de esta migracion."
                    : "Esta instancia no tiene snapshots historicos de inventario para traspasos antiguos."
                }
              >
                {previousStockLabel}
              </th>
              <th
                className={styles.alignRight}
                title={
                  hasAnyStockSnapshot
                    ? "Foto historica tomada milisegundos DESPUES del evento, calculada por el RPC. 100% real, inamovible. Guion (—) significa traspaso creado antes de esta migracion."
                    : "Esta instancia no tiene snapshots historicos de inventario para traspasos antiguos."
                }
              >
                {postEventStockLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const requestedQty = Number(item?.requestedQty ?? 0) || 0;
              const receivedQty = Number(item?.receivedQty ?? 0) || 0;
              const returnedQty = Number(item?.returnedQty ?? 0) || 0;
              const difference =
                requestedQty - receivedQty - returnedQty;

              const productId = String(item?.productId || item?.id || "");
              const inventoryRow =
                inventoryByProductId.get(productId) || {};
              const currentStock =
                Number(inventoryRow?.currentStock ?? 0) || 0;

              // --- Lectura de snapshots historicos (NULLABLE).
              // Si el dato no existe (NULL) mostramos guion — SIN retro-calculo.
              // Regla de visualizacion segun la sucursal del usuario:
              //   - Usuario ORIGEN:    muestra origin_stock_before / origin_stock_after
              //   - Usuario DESTINO:   muestra destination_stock_before / destination_stock_after
              //   - Sucursal no participante o dato inexistente: guion (—)
              let rawBefore = null;
              let rawAfter = null;
              if (!isCancelled) {
                if (isOriginRoute) {
                  rawBefore = item?.origin_stock_before;
                  rawAfter = item?.origin_stock_after;
                } else if (isDestinationRoute) {
                  rawBefore = item?.destination_stock_before;
                  rawAfter = item?.destination_stock_after;
                }
              }

              const hasBefore =
                rawBefore !== null && rawBefore !== undefined;
              const hasAfter = rawAfter !== null && rawAfter !== undefined;

              const previousStock = hasBefore ? Number(rawBefore) : null;
              const postEventStock = hasAfter ? Number(rawAfter) : null;

              const stockCellTitle = hasBefore || hasAfter
                ? "Foto historica del evento, tomada por el RPC. 100% real e inamovible."
                : "Sin snapshot historico para este traspaso (creado antes de la migracion o evento aun no ocurrido).";

              return (
                <tr key={item?.id || item?.productId || index}>
                  <td>
                    <div className={styles.productCell}>
                      <strong>
                        {item?.name ||
                          item?.productName ||
                          item?.product?.name ||
                          item?.products?.name ||
                          "PRODUCTO SIN NOMBRE"}
                      </strong>
                      {item?.productId ? (
                        <span className={styles.detailMutedText}>
                          ID: {String(item.productId).slice(0, 8)}…
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    {item?.barcode && item.barcode !== "—"
                      ? item.barcode
                      : "—"}
                  </td>
                  <td className={styles.alignRight}>{requestedQty}</td>
                  <td className={styles.alignRight}>{receivedQty}</td>
                  <td className={styles.alignRight}>{returnedQty}</td>
                  <td
                    className={`${styles.alignRight} ${
                      difference === 0
                        ? styles.detailMutedText
                        : difference > 0
                          ? styles.detailWarningText
                          : styles.detailErrorText
                    }`}
                  >
                    {difference > 0 ? `-${difference}` : difference}
                  </td>
                  <td
                    className={styles.alignRight}
                    title={
                      isOriginRoute || isDestinationRoute
                        ? stockCellTitle
                        : "Solo visible para sucursales participantes en el traspaso."
                    }
                  >
                    {isOriginRoute || isDestinationRoute
                      ? (previousStock !== null
                          ? previousStock
                          : dashPlaceholder)
                      : dashPlaceholder}
                  </td>
                  <td
                    className={styles.alignRight}
                    title={stockCellTitle}
                  >
                    {isOriginRoute || isDestinationRoute
                      ? (postEventStock !== null
                          ? postEventStock
                          : dashPlaceholder)
                      : dashPlaceholder}
                  </td>
                </tr>
              );
            })}

            {items.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.emptyRow}>
                  Este traspaso no tiene productos registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppModal>
  );
};

export default TransferDetailModal;
