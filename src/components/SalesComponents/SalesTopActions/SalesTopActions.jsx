import React from "react";

import styles from "../../../pages/Sales/Sales.module.css";

import searchIcon from "../../../assets/icons/searchIcon.svg";
import entryIcon from "../../../assets/icons/entryIcon.svg";
import exitIcon from "../../../assets/icons/exitIcon.svg";
import deleteIcon from "../../../assets/icons/deleteIcon.svg";
import verifyIcon from "../../../assets/icons/verifyIcon.svg";

const SHIFT_CUT_MESSAGE =
  "El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.";

const SalesTopActions = ({
  shiftAlreadyCut,
  selectedProduct,
  onOpenSearch,
  onOpenEntry,
  onOpenExit,
  onOpenDeleteItem,
  onOpenVerifier,
  showAppWarning,
}) => {
  const handleOpenEntry = () => {
    if (shiftAlreadyCut) {
      showAppWarning(SHIFT_CUT_MESSAGE);
      return;
    }

    onOpenEntry();
  };

  const handleOpenDeleteItem = () => {
    if (!selectedProduct) {
      showAppWarning(
        "Por favor, selecciona un producto primero",
      );
      return;
    }

    onOpenDeleteItem();
  };

  return (
    <div className={styles.topActionBar}>
      <div
        className={styles.horizontalActionButton}
        onClick={onOpenSearch}
      >
        <span className={styles.actionKey}>
          F10
        </span>

        <img
          src={searchIcon}
          alt="Buscar"
          className={styles.buttonIcon}
        />

        <span className={styles.actionText}>
          Buscar
        </span>
      </div>

      <div
        className={`${styles.horizontalActionButton} ${
          shiftAlreadyCut
            ? styles.actionButtonDisabled
            : ""
        }`}
        onClick={handleOpenEntry}
      >
        <span className={styles.actionKey}>
          F7
        </span>

        <img
          src={entryIcon}
          alt="Entradas"
          className={styles.buttonIcon}
        />

        <span className={styles.actionText}>
          Entradas
        </span>
      </div>

      <div
        className={`${styles.horizontalActionButton} ${
          shiftAlreadyCut
            ? styles.actionButtonDisabled
            : ""
        }`}
        onClick={onOpenExit}
      >
        <span className={styles.actionKey}>
          F8
        </span>

        <img
          src={exitIcon}
          alt="Salidas"
          className={styles.buttonIcon}
        />

        <span className={styles.actionText}>
          Salidas
        </span>
      </div>

      <div
        className={styles.horizontalActionButton}
        onClick={handleOpenDeleteItem}
      >
        <span className={styles.actionKey}>
          DEL
        </span>

        <img
          src={deleteIcon}
          alt="Borrar"
          className={styles.buttonIcon}
        />

        <span className={styles.actionText}>
          Borrar Art.
        </span>
      </div>

      <div
        className={styles.horizontalActionButton}
        onClick={onOpenVerifier}
      >
        <span className={styles.actionKey}>
          F9
        </span>

        <img
          src={verifyIcon}
          alt="Verificador"
          className={styles.buttonIcon}
        />

        <span className={styles.actionText}>
          Verificador
        </span>
      </div>
    </div>
  );
};

export default SalesTopActions;