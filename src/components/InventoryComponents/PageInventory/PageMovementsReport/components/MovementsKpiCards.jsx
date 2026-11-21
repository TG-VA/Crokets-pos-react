import { joinClasses } from "../utils/movementFormatters";

import styles from "./MovementsKpiCards.module.css";

const formatUnits = (value) => Number(value || 0).toLocaleString("es-MX");

const formatSignedUnits = (value) =>
  value > 0 ? `+${formatUnits(value)}` : formatUnits(value);

const formatCount = (count) =>
  `${formatUnits(count)} ${count === 1 ? "movimiento" : "movimientos"}`;

const KPI_DESCRIPTORS = [
  {
    key: "entries",
    label: "Entradas",
    getValue: (kpis) => formatUnits(kpis.entries.units),
    getSubtext: (kpis) => formatCount(kpis.entries.count),
    tone: "positive",
  },
  {
    key: "exits",
    label: "Salidas",
    getValue: (kpis) => formatUnits(kpis.exits.units),
    getSubtext: (kpis) => formatCount(kpis.exits.count),
    tone: "negative",
  },
  {
    key: "adjustments",
    label: "Ajustes (neto)",
    getValue: (kpis) => formatSignedUnits(kpis.adjustments.units),
    getSubtext: (kpis) => formatCount(kpis.adjustments.count),
  },
  {
    key: "net",
    label: "Neto del periodo",
    getValue: (kpis) => formatSignedUnits(kpis.net),
    getSubtext: () => "Unidades que suben o bajan el stock",
  },
];

const TONE_CLASS_NAMES = {
  positive: styles.kpiValuePositive,
  negative: styles.kpiValueNegative,
};

const MovementsKpiCards = ({ kpis }) => (
  <div className={styles.kpiGrid}>
    {KPI_DESCRIPTORS.map((descriptor) => (
      <div key={descriptor.key} className={styles.kpiCard}>
        <span className={styles.kpiLabel}>{descriptor.label}</span>
        <span
          className={joinClasses(
            styles.kpiValue,
            TONE_CLASS_NAMES[descriptor.tone]
          )}
        >
          {descriptor.getValue(kpis)}
        </span>
        <span className={styles.kpiSubtext}>{descriptor.getSubtext(kpis)}</span>
      </div>
    ))}
  </div>
);

export default MovementsKpiCards;
