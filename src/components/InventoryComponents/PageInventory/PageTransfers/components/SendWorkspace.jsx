import React from "react";
import styles from "../PageTransfers.module.css";

const SendWorkspace = ({
  destinationBranchId,
  destinationOptions,
  loadingBranches,
  submitting,
  productSearch,
  transferNotes,
  draftItems,
  draftTotals,
  onDestinationChange,
  onProductSearchChange,
  onLookupProduct,
  onOpenSearchModal,
  onTransferNotesChange,
  onDraftQuantityChange,
  onRemoveDraftItem,
  onSubmitTransfer,
}) => {
  return (
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
              onChange={(event) => onDestinationChange(event.target.value)}
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
                  onProductSearchChange(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onLookupProduct();
                  }
                }}
                placeholder="Escanea el código o presiona F10 para buscar"
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onOpenSearchModal}
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
            onChange={(event) => onTransferNotesChange(event.target.value)}
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
                        onDraftQuantityChange(
                          item.productId,
                          event.target.value
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "0") {
                          const target = event.currentTarget;
                          const cursorStart =
                            target.selectionStart ?? 0;
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
                          if (
                            !Number.isNaN(numeric) &&
                            numeric === 0
                          ) {
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
                      onClick={() => onRemoveDraftItem(item.productId)}
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
            onClick={onSubmitTransfer}
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
  );
};

export default SendWorkspace;
