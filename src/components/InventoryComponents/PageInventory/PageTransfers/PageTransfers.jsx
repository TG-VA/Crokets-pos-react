import InventorySearchModal from "../../Modals/InventorySearchModal/InventorySearchModal";
import useTransfersPage from "./hooks/useTransfersPage";
import styles from "./PageTransfers.module.css";
import {
  formatTransferDateTime,
  getTransferStatusMeta,
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
                            min="1"
                            max={item.availableStock}
                            className={styles.quantityInput}
                            value={item.quantity}
                            onChange={(event) =>
                              handleDraftQuantityChange(
                                item.productId,
                                event.target.value
                              )
                            }
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
                    const statusMeta = getTransferStatusMeta(order.status);

                    return (
                      <tr key={order.id}>
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
                              onClick={() => handleCancelTransfer(order.id)}
                              disabled={submitting}
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
    </div>
  );
};

export default PageTransfers;
