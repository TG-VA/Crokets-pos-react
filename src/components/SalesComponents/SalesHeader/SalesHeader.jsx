import React from "react";
import styles from "../../../pages/Sales/Sales.module.css";

const SalesHeader = ({
  ticketNumber,
  currentSaleClient,
  currentSaleRewards,
  currentSaleRewardsLabel,
  shiftAlreadyCut,
  stockWarningMsg,
}) => {
  return (
    <>
      <div className={styles.saleHeader}>
        <div className={styles.saleHeaderMain}>
          <h2>VENTA - Ticket {ticketNumber}</h2>
        </div>

        <div className={styles.saleClientBadge}>
          <span>{currentSaleClient ? "Cliente asignado:" : "Cliente:"}</span>
          <strong>{currentSaleClient?.name || "PÚBLICO EN GENERAL"}</strong>
          {currentSaleRewards?.length > 0 && (
            <small>{currentSaleRewardsLabel}</small>
          )}
        </div>
      </div>

      {shiftAlreadyCut && (
        <div className={styles.shiftCutWarning}>
          <span>
            Corte de cajero realizado. Debes cerrar turno antes de seguir
            vendiendo.
          </span>

          <span>PENDIENTE CERRAR TURNO</span>
        </div>
      )}

      {!shiftAlreadyCut && stockWarningMsg && (
        <div className={styles.shiftCutWarning}>
          <span>{stockWarningMsg}</span>
          <span>REVISAR STOCK</span>
        </div>
      )}
    </>
  );
};

export default SalesHeader;