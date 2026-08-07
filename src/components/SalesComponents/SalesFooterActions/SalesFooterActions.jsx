import React from "react";

import styles from "../../../pages/Sales/Sales.module.css";

import deleteIcon from "../../../assets/icons/deleteIcon.svg";
import changeIcon from "../../../assets/icons/changeIcon.svg";
import assignClientIcon from "../../../assets/icons/assignClientIcon.svg";
import payIcon from "../../../assets/icons/payIcon.svg";
import DiscountIcon from "../../../assets/icons/percent-solid-full.svg";
import SalesHistoryIcon from "../../../assets/icons/table-list-solid-full.svg";

const SalesFooterActions = ({
  subtotal,
  discountTotal,
  total,
  shiftAlreadyCut,
  onOpenChange,
  onOpenPending,
  onOpenDelete,
  onOpenDiscount,
  onOpenClient,
  onOpenHistory,
  onPay,
}) => {
  const handlePay = () => {
    if (shiftAlreadyCut) {
      return;
    }

    onPay();
  };

  return (
    <div className={styles.footerBar}>
      <div className={styles.leftActions}>
        <div
          className={styles.squareButton}
          onClick={onOpenChange}
          data-tooltip="F5"
        >
          <img
            src={changeIcon}
            alt="Cambiar"
            className={styles.squareIcon}
          />
          <span className={styles.squareKey}>F5</span>
          <span className={styles.squareText}>Cambiar</span>
        </div>

        <div
          className={styles.squareButton}
          onClick={onOpenPending}
          data-tooltip="F6"
        >
          <span className={styles.squareKey}>F6</span>
          <span className={styles.squareText}>Pendiente</span>
        </div>

        <div
          className={styles.squareButton}
          onClick={onOpenDelete}
        >
          <img
            src={deleteIcon}
            alt="Eliminar"
            className={styles.squareIcon}
          />
          <span className={styles.squareText}>Eliminar</span>
        </div>

        <div
          className={styles.squareButton}
          onClick={onOpenDiscount}
          data-tooltip="Ctrl + D"
        >
          <img
            src={DiscountIcon}
            alt="Descuento Icono"
            className={styles.squareIcon}
          />
          <span className={styles.squareText}>Descuento</span>
        </div>

        <div
          className={styles.squareButton}
          onClick={onOpenClient}
        >
          <img
            src={assignClientIcon}
            alt="Asignar cliente"
            className={styles.squareIcon}
          />
          <span className={styles.squareText}>Asignar cliente</span>
        </div>

        <div
          className={styles.SquareButtonSecondary}
          onClick={onOpenHistory}
        >
          <img
            src={SalesHistoryIcon}
            alt="Ventas del día y Devoluciones"
            className={styles.squareIconSecondary}
          />

          <span className={styles.salesHistoryButtonText}>
            <span className={styles.salesHistoryButtonLine}>
              Ventas del día y
            </span>
            <span className={styles.salesHistoryButtonLine}>
              Devoluciones
            </span>
          </span>
        </div>
      </div>

      <div className={styles.rightActions}>
        <div className={styles.totalSection}>
          <span className={styles.totalLabel}>Subtotal:</span>
          <span className={styles.totalAmount}>
            ${Number(subtotal || 0).toFixed(2)}
          </span>
        </div>

        <div className={styles.totalSection}>
          <span className={styles.totalLabel}>Descuento:</span>
          <span className={styles.totalAmount}>
            -${Number(discountTotal || 0).toFixed(2)}
          </span>
        </div>

        <div className={styles.totalSection}>
          <span className={styles.totalLabel}>Total:</span>
          <span className={styles.totalAmount}>
            ${Number(total || 0).toFixed(2)}
          </span>
        </div>

        <div
          className={`${styles.payButton} ${
            shiftAlreadyCut ? styles.payButtonDisabled : ""
          }`}
          onClick={handlePay}
        >
          <img
            src={payIcon}
            alt="Cobrar"
            className={styles.payIcon}
          />
          <span className={styles.payKey}>F12</span>
          <span className={styles.payText}>Cobrar</span>
        </div>
      </div>
    </div>
  );
};

export default SalesFooterActions;