/**
 * KitComponentsDetailModal.jsx
 * Modal para visualizar el desglose de productos componentes y costos de un Kit.
 */

import React from "react";
import styles from "./KitComponentsDetailModal.module.css";
import useEscapeKey from "../hooks/useEscapeKey";
import { formatCurrency, formatNumber, formatPercent } from "../utils/profitabilityReportFormatters";

import xmarkIcon from "../../../../../assets/icons/xmark-solid-full.svg";
import boxesIcon from "../../../../../assets/icons/boxes-stacked-solid-full.svg";

export const KitComponentsDetailModal = ({
  isOpen = false,
  onClose,
  kitProduct = null,
}) => {
  useEscapeKey(isOpen, onClose);

  if (!isOpen || !kitProduct) return null;

  const components = kitProduct.kitComponentsDetails || [];
  const unitCost = kitProduct.averageCostPrice || 0;
  const unitPrice = kitProduct.averageSalePrice || 0;
  const unitProfit = unitPrice - unitCost;
  const unitMargin = unitPrice > 0 ? (unitProfit / unitPrice) * 100 : 0;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIconWrapper}>
              <img src={boxesIcon} alt="" />
            </div>
            <div>
              <h3 className={styles.modalTitle}>{kitProduct.productName}</h3>
              <p className={styles.modalSubtitle}>
                Código: {kitProduct.barcode || "S/C"} · Desglose de componentes del kit
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <img src={xmarkIcon} alt="" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.statsStrip}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Componentes</span>
              <span className={styles.statValue}>
                {components.length} artículos
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Precio Venta Unit.</span>
              <span className={styles.statValue}>
                {formatCurrency(unitPrice)}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Costo Total Kit</span>
              <span className={styles.statValue}>
                {formatCurrency(unitCost)}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Margen Unitario</span>
              <span className={styles.statValueProfit}>
                {formatPercent(unitMargin)}
              </span>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.componentsTable}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto Componente</th>
                  <th className={styles.alignCenter}>Cantidad</th>
                  <th className={styles.alignRight}>Costo Unit.</th>
                  <th className={styles.alignRight}>Subtotal Costo</th>
                </tr>
              </thead>
              <tbody>
                {components.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.alignCenter}>
                      No se encontraron componentes registrados para este kit.
                    </td>
                  </tr>
                ) : (
                  components.map((comp, idx) => (
                    <tr key={`${comp.componentId || idx}`}>
                      <td className={styles.monospaceCell}>
                        {comp.barcode || "S/C"}
                      </td>
                      <td>
                        <span className={styles.componentName}>
                          {comp.name}
                        </span>
                      </td>
                      <td className={styles.alignCenter}>
                        <span className={styles.boldValue}>
                          {formatNumber(comp.quantity)}
                        </span>
                      </td>
                      <td className={styles.alignRight}>
                        {formatCurrency(comp.unitCost)}
                      </td>
                      <td className={styles.alignRight}>
                        <span className={styles.boldValue}>
                          {formatCurrency(comp.totalCost)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <p className={styles.footerNote}>
            Los costos unitarios corresponden a la sucursal de venta activa.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KitComponentsDetailModal;
