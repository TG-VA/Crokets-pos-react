import { SectionCard, DataRow } from "./primitives";
import { fmt } from "../utils/cashCutFormatters";

import MoneyCheckIcon from "../../../assets/icons/money-check-dollar-solid-full.svg";

const CutCashSummarySection = ({
  openingAmount,
  totalEntradas,
  ventasEfectivoNeto,
  ventasDolaresUsd,
  ventasDolaresMxn,
  totalSalidas,
  devolucionesAfectanCaja,
  devolucionesParcialesAfectanCaja,
  isHistoricalView,
  hasShiftCut,
  expectedDisplay,
}) => (
  <SectionCard icon={MoneyCheckIcon} title="DINERO EN CAJA">
    <DataRow label="Fondo de caja inicial" value={fmt(openingAmount)} />
    <DataRow
      label="Entradas de efectivo"
      value={`+ ${fmt(totalEntradas)}`}
      color="#2e7d32"
    />
    <DataRow
      label="Ventas en efectivo netas"
      value={`+ ${fmt(ventasEfectivoNeto)}`}
      color="#2e7d32"
    />
    <DataRow
      label="Ventas en dólares"
      value={`+ USD ${ventasDolaresUsd.toFixed(2)}`}
      color="#2e7d32"
    />
    <DataRow
      label="Equivalente en MXN"
      value={`+ ${fmt(ventasDolaresMxn)}`}
      color="#2e7d32"
    />
    <DataRow
      label="Salidas de efectivo"
      value={`- ${fmt(totalSalidas)}`}
      color="#c62828"
    />
    <DataRow
      label="Devoluciones que afectan caja"
      value={`- ${fmt(devolucionesAfectanCaja)}`}
      color="#c62828"
    />
    <DataRow
      label="Dev. parciales que afectan caja"
      value={`- ${fmt(devolucionesParcialesAfectanCaja)}`}
      color="#c62828"
    />
    <DataRow
      label={isHistoricalView || hasShiftCut ? "Total esperado" : "Total en caja"}
      value={fmt(expectedDisplay)}
      bold
      borderTop
    />
  </SectionCard>
);

export default CutCashSummarySection;
