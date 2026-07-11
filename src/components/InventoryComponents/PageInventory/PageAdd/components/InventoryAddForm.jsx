import React from "react";

import styles from "../PageAdd.module.css";

const InventoryAddForm = ({
  selectedProduct,
  currentInventory = 0,
  quantityToAdd = "",
  newInventory = 0,
  salePrice = 0,
  submitArmed = false,
  saving = false,
  quantityInputRef,
  bodyRef,
  onQuantityChange,
  onSubmitArmed,
  onSubmit,
  onCancel,
}) => {
  if (!selectedProduct) {
    return null;
  }

  const handleQuantityKeyDown = (event) => {
    if (
      event.key === "-" ||
      event.key === "+" ||
      event.key === "e" ||
      event.key === "E"
    ) {
      event.preventDefault();
    }
  };

  const handleCancelClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (saving) return;

    onCancel?.();
  };

  const handleButtonClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (saving) return;

    if (!submitArmed) {
      onSubmitArmed?.();
      return;
    }

    onSubmit?.();
  };

  const handleButtonDoubleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (saving) return;

    onSubmit?.();
  };

  return (
    <div className={styles.body} ref={bodyRef}>
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
          Inventario actual
        </label>

        <input
          className={styles.input}
          type="number"
          value={currentInventory}
          readOnly
          tabIndex={-1}
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>
          Cantidad
        </label>

        <input
          ref={quantityInputRef}
          className={styles.input}
          type="number"
          inputMode="numeric"
          step="1"
          min="1"
          value={quantityToAdd}
          onKeyDown={handleQuantityKeyDown}
          onChange={onQuantityChange}
          placeholder="1"
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>
          Nuevo inventario
        </label>

        <input
          className={styles.input}
          type="number"
          value={newInventory}
          readOnly
          tabIndex={-1}
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>
          Precio venta
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
          onClick={handleButtonClick}
          onDoubleClick={handleButtonDoubleClick}
        >
          {saving
            ? "Guardando..."
            : submitArmed
              ? "Confirmar ingreso"
              : "Ingresar producto"}
        </button>
      </div>
    </div>
  );
};

export default InventoryAddForm;