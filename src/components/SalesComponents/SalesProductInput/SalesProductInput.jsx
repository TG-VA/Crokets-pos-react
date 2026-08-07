import React from "react";

import styles from "../../../pages/Sales/Sales.module.css";

const SalesProductInput = ({
  barcode,
  setBarcode,
  shiftAlreadyCut,
  onAddProduct,
}) => {
  const handleChange = (event) => {
    setBarcode(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.repeat || shiftAlreadyCut) {
      return;
    }

    onAddProduct();
  };

  const handleAddProduct = () => {
    if (shiftAlreadyCut) {
      return;
    }

    onAddProduct();
  };

  return (
    <div className={styles.productInputBar}>
      <div className={styles.inputSection}>
        <label>Código de Barras:</label>

        <input
          type="text"
          className={styles.barcodeInput}
          value={barcode}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Escanea o escribe código"
          disabled={shiftAlreadyCut}
        />
      </div>

      <div
        className={`${styles.addProductBtn} ${
          shiftAlreadyCut
            ? styles.actionButtonDisabled
            : ""
        }`}
        onClick={handleAddProduct}
      >
        <span className={styles.actionKey2}>
          ENTER
        </span>

        <span className={styles.actionText2}>
          Agregar Producto
        </span>
      </div>
    </div>
  );
};

export default SalesProductInput;