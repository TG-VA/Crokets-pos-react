import React from "react";

import receiptIcon from "../../../../../assets/icons/receipt-solid-full.svg";
import boxIcon from "../../../../../assets/icons/box-solid-full.svg";
import infoIcon from "../../../../../assets/icons/circle-info-solid-full.svg";
import coinsIcon from "../../../../../assets/icons/coins-solid-full.svg";

import {
  formatCurrency,
  formatCurrencyDelta,
  formatQuantity,
} from "../utils/inventoryAddFormatters";

import styles from "./InventoryAddCostEntry.module.css";

const ENTRY_OPTIONS = [
  {
    value: "purchase",
    label: "Compra / Recepcion de factura",
    description: "El CPP se recalcula con el costo de compra.",
    icon: receiptIcon,
  },
  {
    value: "manual",
    label: "Entrada manual / Ajuste de conteo",
    description: "La mercancia entra al costo vigente, sin mover el CPP.",
    icon: boxIcon,
  },
];

const optionClassName = (isSelected) =>
  [styles.option, isSelected ? styles.optionSelected : ""]
    .filter(Boolean)
    .join(" ");

const rowClassName = (isMuted) =>
  [styles.row, isMuted ? styles.rowMuted : ""].filter(Boolean).join(" ");

const IconBadge = ({ src }) => (
  <span className={styles.iconSlot}>
    <img src={src} alt="" className={styles.icon} />
  </span>
);

const StatRow = ({ label, value, isMuted = false }) => (
  <div className={rowClassName(isMuted)}>
    <span className={styles.rowLabel}>{label}</span>
    <span className={styles.rowValue}>{value}</span>
  </div>
);

/**
 * InventoryAddCostEntry
 * Captura del origen y del costo de la entrada, con la proyeccion del CPP
 * resultante antes de guardar.
 *
 * Es un componente de presentation: no calcula nada ni habla con Supabase. Todos
 * los numeros y el mensaje de validacion llegan resueltos desde
 * `useInventoryAddCost`, de modo que la misma proyeccion que se muestra aqui es
 * la que el servicio aplica al guardar.
 *
 * Recibe un unico objeto `costEntry` (el retorno del hook) en lugar de una decena
 * de props sueltas: el subcomponente consume el subdominio completo de la captura
 * de costo y nada mas.
 *
 * @param {object} props
 * @param {object} props.costEntry Estado de la entrada de costo.
 * @param {boolean} props.disabled Bloquea la captura durante el guardado.
 */
const InventoryAddCostEntry = ({ costEntry, disabled = false }) => {
  const {
    isPurchase = true,
    incomingCostInput = "",
    costError = null,
    currentCost = 0,
    projection,
    setEntryMode,
    handleIncomingCostChange,
  } = costEntry || {};

  if (!projection) return null;

  const {
    currentStock,
    incomingQty,
    resolvedIncomingCost,
    projectedStock,
    projectedCost,
    currentInventoryValue,
    projectedInventoryValue,
    totalIncomingCost,
    costWillChange,
  } = projection;

  const costDelta = projectedCost - currentCost;

  return (
    <section className={styles.section}>
      <div className={styles.formRow}>
        <label className={styles.label}>Tipo de entrada</label>

        <div
          className={styles.optionGroup}
          role="radiogroup"
          aria-label="Tipo de entrada de inventario"
        >
          {ENTRY_OPTIONS.map((option) => {
            const isSelected =
              option.value === (isPurchase ? "purchase" : "manual");

            return (
              <button
                key={option.value}
                className={optionClassName(isSelected)}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => setEntryMode?.(option.value)}
              >
                <span className={styles.optionHeader}>
                  <IconBadge src={option.icon} />

                  <span className={styles.optionLabel}>{option.label}</span>
                </span>

                <span className={styles.optionDescription}>
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isPurchase ? (
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="inventory-incoming-cost">
            Costo unitario de compra
          </label>

          <div className={styles.inputAffix}>
            <span className={styles.affix}>$</span>

            <input
              id="inventory-incoming-cost"
              className={styles.input}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={incomingCostInput}
              placeholder="0.00"
              disabled={disabled}
              aria-invalid={Boolean(costError)}
              aria-describedby={
                costError ? "inventory-incoming-cost-error" : undefined
              }
              onChange={handleIncomingCostChange}
            />
          </div>

          {costError ? (
            <p
              id="inventory-incoming-cost-error"
              className={styles.errorMessage}
              role="alert"
            >
              {costError}
            </p>
          ) : (
            <p className={styles.hint}>
              Se precarga con el costo vigente. El CPP se recalcula con este
              valor.
            </p>
          )}
        </div>
      ) : (
        <div className={styles.note}>
          <IconBadge src={infoIcon} />

          <p className={styles.noteText}>
            La mercancia ingresa al costo promedio vigente (
            <strong>{formatCurrency(currentCost)}</strong>); el CPP no se
            alterara.
          </p>
        </div>
      )}

      <div className={styles.preview}>
        <div className={styles.previewHeader}>
          <IconBadge src={coinsIcon} />

          <h2 className={styles.previewTitle}>
            Costo Promedio Ponderado resultante
          </h2>
        </div>

        <div className={styles.previewRows}>
          <StatRow
            label="Stock actual"
            value={`${formatQuantity(currentStock)} pzs (Costo: ${formatCurrency(currentCost)})`}
          />

          <StatRow
            label={isPurchase ? "Entrada por compra" : "Entrada manual"}
            value={
              incomingQty > 0
                ? `${formatQuantity(incomingQty)} pzs (${
                    isPurchase
                      ? `Compra: ${formatCurrency(resolvedIncomingCost)}`
                      : `Al costo vigente: ${formatCurrency(resolvedIncomingCost)}`
                  })`
                : "Captura la cantidad"
            }
            isMuted={incomingQty <= 0}
          />

          <StatRow
            label="Stock resultante"
            value={`${formatQuantity(projectedStock)} pzs`}
            isMuted={incomingQty <= 0}
          />

          <StatRow
            label="Valor del inventario"
            value={
              incomingQty > 0
                ? `${formatCurrency(projectedInventoryValue)}`
                : `${formatCurrency(currentInventoryValue)}`
            }
            isMuted={incomingQty <= 0}
          />
        </div>

        <div
          className={`${styles.result} ${
            costWillChange ? styles.resultChanged : ""
          }`.trim()}
        >
          <span className={styles.resultLabel}>Nuevo Costo Promedio</span>

          <span className={styles.resultValue}>
            {formatCurrency(projectedCost)}
          </span>

          {costWillChange ? (
            <span
              className={`${styles.resultDelta} ${
                costDelta > 0 ? styles.resultDeltaUp : styles.resultDeltaDown
              }`.trim()}
            >
              {formatCurrencyDelta(costDelta)} respecto al costo vigente
            </span>
          ) : (
            <span className={styles.resultDelta}>
              Sin cambio: la entrada entra al costo vigente
            </span>
          )}
        </div>

        {isPurchase && incomingQty > 0 ? (
          <p className={styles.previewFootnote}>
            Importe del lote: {formatCurrency(totalIncomingCost)}
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default InventoryAddCostEntry;
