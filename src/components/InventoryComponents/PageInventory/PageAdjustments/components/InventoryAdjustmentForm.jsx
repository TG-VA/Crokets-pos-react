import React from "react";

import styles from "../PageAdjustments.module.css";

const InventoryAdjustmentForm = ({
  selectedProduct,
  barcode = "",
  currentStock = 0,
  quantityToAdjust = "",
  newStock = 0,
  salePrice = 0,
  adjustmentReason = "",
  adjustmentNotes = "",
  submitArmed = false,
  saving = false,
  quantityInputRef,
  bodyRef,
  onQuantityChange,
  onReasonChange,
  onNotesChange,
  onSubmitArmed,
  onSubmit,
  onCancel,
}) => {
  if (!selectedProduct) {
    return null;
  }

  const handlePrimaryButtonClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (saving) return;

    if (!submitArmed) {
      onSubmitArmed?.();
      return;
    }

    onSubmit?.();
  };

  const handlePrimaryButtonDoubleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (saving) return;

    onSubmit?.();
  };

  const handleCancelClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (saving) return;

    onCancel?.();
  };

  return (
    <div className={styles.body} ref={bodyRef}>
      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>
          Datos del producto
        </h2>

        <p className={styles.sectionDescription}>
          Información del producto seleccionado para el ajuste.
        </p>

        <div className={styles.formRow}>
          <label className={styles.label}>
            Código de barras
          </label>

          <input
            className={styles.input}
            type="text"
            value={barcode}
            readOnly
            tabIndex={-1}
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.label}>
            Nombre del producto
          </label>

          <input
            className={styles.input}
            type="text"
            value={selectedProduct.descripcion ?? ""}
            readOnly
            tabIndex={-1}
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.label}>
            Precio de venta
          </label>

          <input
            className={styles.input}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={Number(salePrice).toFixed(2)}
            readOnly
            tabIndex={-1}
          />
        </div>
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>
          Ajuste de inventario
        </h2>

        <p className={styles.sectionDescription}>
          Captura la diferencia y el motivo del ajuste.
        </p>

        <div className={styles.stockGrid}>
          <div className={styles.formRow}>
            <label className={styles.label}>
              Stock actual
            </label>

            <input
              className={styles.input}
              type="number"
              value={currentStock}
              readOnly
              tabIndex={-1}
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>
              Diferencia
            </label>

            <input
              ref={quantityInputRef}
              className={styles.input}
              type="text"
              inputMode="numeric"
              value={quantityToAdjust}
              onChange={onQuantityChange}
              placeholder="0"
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>
              Nuevo stock
            </label>

            <input
              className={styles.input}
              type="number"
              value={newStock}
              readOnly
              tabIndex={-1}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <label className={styles.label}>
            Motivo del ajuste
          </label>

          <input
            className={styles.input}
            type="text"
            value={adjustmentReason}
            onChange={onReasonChange}
            placeholder="Ej. Merma / Inventario físico / Corrección"
            maxLength={50}
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.label}>
            Notas
          </label>

          <textarea
            className={styles.textarea}
            value={adjustmentNotes}
            onChange={onNotesChange}
            placeholder="Comentarios adicionales (opcional)"
            rows={3}
          />
        </div>

        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            type="button"
            disabled={saving}
            onClick={handleCancelClick}
          >
            Cancelar
          </button>

          <button
            className={`${styles.primaryButton} ${
              submitArmed ? styles.confirmButton : ""
            }`}
            type="button"
            disabled={saving}
            onClick={handlePrimaryButtonClick}
            onDoubleClick={handlePrimaryButtonDoubleClick}
          >
            {saving
              ? "Guardando..."
              : submitArmed
                ? "Confirmar ajuste"
                : "Aplicar ajuste"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default InventoryAdjustmentForm;