import React, { useState } from "react";

import AppModal from "../../../AppModal/AppModal";
import InventorySearchModal from "../../Modals/InventorySearchModal/InventorySearchModal";
import useTransfersPage from "./hooks/useTransfersPage";
import styles from "./PageTransfers.module.css";
import {
  formatTransferDateTime,
  getTransferStatusMetaForBranch,
} from "./utils/transfersUtils";

const TRANSFER_TABS = [
  {
    id: "send",
    label: "Enviar",
    description: "Preparar y descontar existencias de la sucursal origen.",
  },
  {
    id: "receive",
    label: "Recibir",
    description: "Registrar llegada, diferencias y devoluciones automáticas.",
  },
  {
    id: "history",
    label: "Historial",
    description: "Consultar todos los traspasos emitidos y recibidos.",
  },
];

const PageTransfers = () => {
  const {
    activeTab,
    branch,
    cancellableTransferIds,
    destinationBranchId,
    destinationOptions,
    draftItems,
    draftTotals,
    error,
    loadingProducts,
    products,
    loadingBranches,
    pendingReceiptOrders,
    pendingReceiptsCount,
    productSearch,
    receiptQuantities,
    searchModalOpen,
    searchableProducts,
    selectedReceiptOrder,
    submitting,
    success,
    transferHistory,
    transferMetrics,
    transferNotes,
    handleCancelTransfer,
    handleConfirmReceipt,
    handleDraftQuantityChange,
    handleLookupProduct,
    handleLookupProductSearchChange,
    handleReceiptQuantityChange,
    handleRemoveDraftItem,
    handleSelectReceiptOrder,
    handleSubmitTransfer,
    handleTabChange,
    loadProductForTransfer,
    openSearchModal,
    closeSearchModal,
    setDestinationBranchId,
    setTransferNotes,
  } = useTransfersPage();

  const [cancelConfirm, setCancelConfirm] = useState({
    isOpen: false,
    orderId: "",
    folio: "",
    originBranchName: "",
    requestedUnits: 0,
    loading: false,
  });

  const [detailOrder, setDetailOrder] = useState(null);

  const openOrderDetail = (order) => {
    if (!order?.id) {
      return;
    }

    setDetailOrder(order);
  };

  const closeOrderDetail = () => {
    setDetailOrder(null);
  };

  const handleHistoryRowClick = (order, event) => {
    const target = event?.currentTarget;
    const clickedCell = event?.target;

    if (
      clickedCell &&
      target &&
      target.tagName === "TR" &&
      clickedCell.closest("td:last-child")
    ) {
      return;
    }

    openOrderDetail(order);
  };

  const closeCancelConfirm = () => {
    setCancelConfirm({
      isOpen: false,
      orderId: "",
      folio: "",
      originBranchName: "",
      requestedUnits: 0,
      loading: false,
    });
  };

  const showCancelConfirm = (order) => {
    if (!order?.id) return;
    setCancelConfirm({
      isOpen: true,
      orderId: order.id,
      folio: String(order.folio || order.id).toUpperCase(),
      originBranchName: String(order.originBranchName || "la sucursal origen"),
      requestedUnits: Number(order.totals?.requestedUnits ?? 0),
      loading: false,
    });
  };

  const handleConfirmCancel = async () => {
    const orderId = cancelConfirm.orderId;
    if (!orderId) {
      closeCancelConfirm();
      return;
    }

    setCancelConfirm((prev) => ({ ...prev, loading: true }));

    try {
      await handleCancelTransfer(orderId);
    } finally {
      closeCancelConfirm();
    }
  };

  const orderDetailModal = () => {
    const order = detailOrder;
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
    const isOriginRoute = String(order?.originBranchId) === String(branch?.id);
    const isDestinationRoute =
      String(order?.destinationBranchId) === String(branch?.id);

    return (
      <AppModal
        isOpen={!!detailOrder}
        type="info"
        size="large"
        title={`Detalle del traspaso ${String(order?.folio || order?.id || "").toUpperCase()}`}
        showCancel
        cancelText="Cerrar"
        confirmText="Cerrar"
        onCancel={closeOrderDetail}
        onClose={closeOrderDetail}
        onConfirm={closeOrderDetail}
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
                className={`${styles.statusBadge} ${styles[`status${statusMeta.tone}`]}`}
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
                <th className={styles.alignRight}>Inventario anterior</th>
                <th className={styles.alignRight}>Inventario actual</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const requestedQty =
                  Number(item?.requestedQty ?? 0) || 0;
                const receivedQty =
                  Number(item?.receivedQty ?? 0) || 0;
                const returnedQty =
                  Number(item?.returnedQty ?? 0) || 0;
                const difference = requestedQty - receivedQty - returnedQty;

                const productId = String(item?.productId || item?.id || "");
                const inventoryRow = inventoryByProductId.get(productId) || {};
                const currentStock =
                  Number(inventoryRow?.currentStock ?? 0) || 0;

                let previousStock = currentStock;
                if (isCancelled) {
                  previousStock = currentStock;
                } else if (isOriginRoute) {
                  if (isPending) {
                    previousStock = currentStock + requestedQty;
                  } else {
                    previousStock =
                      currentStock +
                      (receivedQty + returnedQty > 0
                        ? receivedQty + returnedQty
                        : requestedQty);
                  }
                } else if (isDestinationRoute) {
                  if (isPending) {
                    previousStock = currentStock;
                  } else {
                    previousStock =
                      currentStock -
                      (receivedQty > 0 ? receivedQty : requestedQty);
                  }
                }

                if (previousStock < 0) previousStock = 0;

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
                    <td className={styles.alignRight}>
                      {isOriginRoute || isDestinationRoute
                        ? previousStock
                        : "—"}
                    </td>
                    <td className={styles.alignRight}>{currentStock}</td>
                  </tr>
                );
              })}

              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className={styles.emptyRow}
                  >
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

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroMain}>
            <p className={styles.eyebrow}>Inventario / Traspasos</p>
            <h1 className={styles.title}>TRASPASOS ENTRE SUCURSALES</h1>
            <p className={styles.description}>
              Controla envios internos, recepciones pendientes y diferencias de
              entrega desde un mismo flujo operativo.
            </p>

            <div className={styles.routeCard}>
              <div>
                <span className={styles.routeLabel}>Sucursal activa</span>
                <strong className={styles.routeValue}>
                  {branch?.name || "Sin sucursal"}
                </strong>
              </div>

              <div>
                <span className={styles.routeLabel}>Recepciones pendientes</span>
                <strong className={styles.routeValue}>
                  {pendingReceiptsCount}
                </strong>
              </div>
            </div>
          </div>

          <div className={styles.heroAside}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Enviados</span>
              <strong className={styles.metricValue}>
                {transferMetrics.sent}
              </strong>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Pendientes</span>
              <strong className={styles.metricValue}>
                {transferMetrics.pendingReceipts}
              </strong>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Recepciones cerradas</span>
              <strong className={styles.metricValue}>
                {transferMetrics.completedReceipts}
              </strong>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>
                Cancelados / En tránsito
              </span>
              <strong className={styles.metricValue}>
                {transferMetrics.cancelled} / {transferMetrics.unitsInTransit}
              </strong>
            </div>
          </div>
        </section>

        {(error || success) && (
          <div
            className={`${styles.feedback} ${
              error ? styles.feedbackError : styles.feedbackSuccess
            }`}
          >
            {error || success}
          </div>
        )}

        <nav className={styles.tabBar} aria-label="Subnavegación de traspasos">
          {TRANSFER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tabButton} ${
                  isActive ? styles.tabButtonActive : ""
                }`}
                onClick={() => handleTabChange(tab.id)}
              >
                <span className={styles.tabLabelRow}>
                  <span>{tab.label}</span>
                  {tab.id === "receive" && pendingReceiptsCount > 0 ? (
                    <span className={styles.tabBadge}>
                      {pendingReceiptsCount}
                    </span>
                  ) : null}
                </span>
                <span className={styles.tabDescription}>{tab.description}</span>
              </button>
            );
          })}
        </nav>

        {activeTab === "send" ? (
          <section className={styles.sendWorkspace}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Preparar envío</h2>
                  <p className={styles.panelText}>
                    Selecciona la sucursal destino y agrega productos con
                    existencia disponible en la sucursal actual.
                  </p>
                </div>
              </div>

              <div className={styles.formRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Sucursal destino</span>
                  <select
                    value={destinationBranchId}
                    onChange={(event) =>
                      setDestinationBranchId(event.target.value)
                    }
                    className={styles.select}
                    disabled={loadingBranches || submitting}
                  >
                    <option value="">Seleccionar</option>
                    {destinationOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                        {option.code ? ` (${option.code})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Código o búsqueda de producto
                  </span>
                  <div className={styles.lookupRow}>
                    <input
                      type="text"
                      className={styles.input}
                      value={productSearch}
                      onChange={(event) =>
                        handleLookupProductSearchChange(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleLookupProduct();
                        }
                      }}
                      placeholder="Escanea el código o presiona F10 para buscar"
                    />
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={openSearchModal}
                    >
                      F10 Buscar
                    </button>
                  </div>
                </label>
              </div>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Notas del envío</span>
                <textarea
                  className={styles.textarea}
                  value={transferNotes}
                  onChange={(event) => setTransferNotes(event.target.value)}
                  placeholder="Observaciones internas del traspaso"
                  rows={3}
                />
              </label>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Resumen del envío</h2>
                  <p className={styles.panelText}>
                    Ajusta las piezas antes de generar la orden y descontar el
                    inventario de origen.
                  </p>
                </div>

                <div className={styles.summaryPill}>
                  {draftTotals.lines} líneas / {draftTotals.units} pzas
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Disponible</th>
                      <th>Enviar</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftItems.map((item) => (
                      <tr key={item.productId}>
                        <td>
                          <div className={styles.productCell}>
                            <strong>{item.name}</strong>
                            <span>{item.barcode || "—"}</span>
                          </div>
                        </td>
                        <td>{item.availableStock}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={item.availableStock}
                            step="1"
                            inputMode="numeric"
                            className={styles.quantityInput}
                            value={item.quantity ?? ""}
                            onChange={(event) =>
                              handleDraftQuantityChange(
                                item.productId,
                                event.target.value
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "0") {
                                const target = event.currentTarget;
                                const cursorStart = target.selectionStart ?? 0;
                                const cursorEnd = target.selectionEnd ?? 0;
                                const currentValue = String(
                                  target.value ?? ""
                                );
                                const nextValue =
                                  currentValue.slice(0, cursorStart) +
                                  "0" +
                                  currentValue.slice(cursorEnd);
                                const numeric = Number(
                                  nextValue.replace(/[^0-9]/g, "")
                                );
                                if (!Number.isNaN(numeric) && numeric === 0) {
                                  event.preventDefault();
                                }
                              }
                            }}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.ghostButton}
                            onClick={() => handleRemoveDraftItem(item.productId)}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}

                    {draftItems.length === 0 ? (
                      <tr>
                        <td colSpan="4" className={styles.emptyRow}>
                          Todavía no agregas productos al traspaso.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className={styles.actionRow}>
                <div className={styles.actionText}>
                  Al generar la orden se descuenta el stock de origen y queda
                  pendiente para recepción en destino.
                </div>

                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSubmitTransfer}
                  disabled={
                    submitting ||
                    draftItems.length === 0 ||
                    !destinationBranchId
                  }
                >
                  {submitting ? "Generando..." : "Generar traspaso"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <InventorySearchModal
          isOpen={searchModalOpen}
          onClose={closeSearchModal}
          products={searchableProducts}
          onSelect={loadProductForTransfer}
          loading={loadingProducts}
        />

        {activeTab === "receive" ? (
          <section className={styles.workspace}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Orden de recepción</h2>
                  <p className={styles.panelText}>
                    Captura la cantidad que llegó; cualquier faltante regresa
                    automáticamente a la sucursal origen.
                  </p>
                </div>
              </div>

              {selectedReceiptOrder ? (
                <>
                  <div className={styles.receiptMeta}>
                    <div>
                      <span className={styles.metaLabel}>Folio</span>
                      <strong>{selectedReceiptOrder.folio}</strong>
                    </div>
                    <div>
                      <span className={styles.metaLabel}>Origen</span>
                      <strong>{selectedReceiptOrder.originBranchName}</strong>
                    </div>
                    <div>
                      <span className={styles.metaLabel}>Creado</span>
                      <strong>
                        {formatTransferDateTime(selectedReceiptOrder.createdAt)}
                      </strong>
                    </div>
                  </div>

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
                        {selectedReceiptOrder.items.map((item) => {
                          const requestedQty = Number(item.requestedQty ?? 0);
                          const receivedQty = Number(
                            receiptQuantities[item.productId] ?? requestedQty
                          );
                          const normalizedReceivedQty = Number.isFinite(
                            receivedQty
                          )
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
                                  type="number"
                                  min="0"
                                  max={requestedQty}
                                  className={styles.quantityInput}
                                  value={
                                    receiptQuantities[item.productId] ??
                                    String(requestedQty)
                                  }
                                  onChange={(event) =>
                                    handleReceiptQuantityChange(
                                      item.productId,
                                      event.target.value
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

                  <div className={styles.actionRow}>
                    <div className={styles.actionText}>
                      La recepción genera entradas automáticas en destino y
                      reingresa el faltante a origen.
                    </div>

                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={handleConfirmReceipt}
                      disabled={submitting}
                    >
                      {submitting ? "Procesando..." : "Confirmar recepción"}
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  Selecciona una orden pendiente para abrir el detalle de
                  recepción.
                </div>
              )}
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Recepciones pendientes</h2>
                  <p className={styles.panelText}>
                    Selecciona una orden para capturar lo recibido realmente en
                    sucursal.
                  </p>
                </div>

                <div className={styles.pendingIndicator}>
                  {pendingReceiptsCount} pendientes
                </div>
              </div>

              <div className={styles.orderList}>
                {pendingReceiptOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    className={`${styles.orderCard} ${
                      selectedReceiptOrder?.id === order.id
                        ? styles.orderCardActive
                        : ""
                    }`}
                    onClick={() => handleSelectReceiptOrder(order.id)}
                  >
                    <div className={styles.orderTopRow}>
                      <strong>{order.folio}</strong>
                      <span className={styles.inlineBadge}>
                        {order.totals.requestedUnits} pzas
                      </span>
                    </div>
                    <span>{order.originBranchName}</span>
                    <span>{formatTransferDateTime(order.createdAt)}</span>
                  </button>
                ))}

                {pendingReceiptOrders.length === 0 ? (
                  <div className={styles.emptyState}>
                    No tienes órdenes pendientes por recibir en esta sucursal.
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "history" ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Historial de traspasos</h2>
                <p className={styles.panelText}>
                  Consulta envíos, recepciones completas y órdenes con
                  diferencias relacionadas con esta sucursal.
                </p>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Ruta</th>
                    <th>Estado</th>
                    <th>Solicitado</th>
                    <th>Recibido</th>
                    <th>Devuelto</th>
                    <th>Creado</th>
                    <th>Recibido</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {transferHistory.map((order) => {
                    const statusMeta = getTransferStatusMetaForBranch(
                      order,
                      branch?.id
                    );

                    return (
                      <tr
                        key={order.id}
                        className={styles.clickableRow}
                        onClick={(event) => handleHistoryRowClick(order, event)}
                        title="Clic para ver el detalle de productos del traspaso"
                      >
                        <td>
                          <div className={styles.productCell}>
                            <strong>{order.folio}</strong>
                            <span>{order.createdByUsername}</span>
                          </div>
                        </td>
                        <td>
                          {order.originBranchName} → {order.destinationBranchName}
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              styles[`status${statusMeta.tone}`]
                            }`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td>{order.totals.requestedUnits}</td>
                        <td>{order.totals.receivedUnits}</td>
                        <td>{order.totals.returnedUnits}</td>
                        <td>{formatTransferDateTime(order.createdAt)}</td>
                        <td>{formatTransferDateTime(order.receivedAt)}</td>
                        <td>
                          {cancellableTransferIds.has(order.id) ? (
                            <button
                              type="button"
                              className={styles.ghostButton}
                              onClick={() => showCancelConfirm(order)}
                              disabled={submitting || cancelConfirm.loading}
                            >
                              Cancelar
                            </button>
                          ) : (
                            <span className={styles.noActionText}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {transferHistory.length === 0 ? (
                    <tr>
                      <td colSpan="9" className={styles.emptyRow}>
                        Todavía no hay traspasos registrados para esta sucursal.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>

      <AppModal
        isOpen={cancelConfirm.isOpen}
        type="warning"
        title="Cancelar traspaso"
        message={
          cancelConfirm.folio
            ? `¿Deseas cancelar el traspaso ${cancelConfirm.folio}? ${cancelConfirm.requestedUnits > 0 ? `Las ${cancelConfirm.requestedUnits} pieza(s) volverán automáticamente a ${cancelConfirm.originBranchName}. ` : ""}Esta acción no se puede deshacer.`
            : "¿Deseas cancelar este traspaso? Esta acción no se puede deshacer."
        }
        confirmText="Sí, cancelar"
        cancelText="Cancelar"
        showCancel
        loading={cancelConfirm.loading}
        onConfirm={handleConfirmCancel}
        onCancel={closeCancelConfirm}
        onClose={closeCancelConfirm}
      />

      {detailOrder && orderDetailModal()}
    </div>
  );
};

export default PageTransfers;
