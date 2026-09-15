import { SectionCard, DataRow } from "./primitives";
import { fmt } from "../utils/cashCutFormatters";

import ReceiptIcon from "../../../assets/icons/receipt-solid-full.svg";

const SalesSummarySection = ({
  subtotal,
  descuentoTotal,
  tax,
  ventasTotales,
  ventasNetas,
}) => (
  <SectionCard icon={ReceiptIcon} title="RESUMEN DE VENTAS">
    <DataRow label="Subtotal registrado" value={fmt(subtotal)} />
    <DataRow
      label="Descuento aplicado"
      value={`- ${fmt(descuentoTotal)}`}
      color="#c62828"
    />
    <DataRow label="Impuestos registrados" value={fmt(tax)} color="#1976d2" />
    <DataRow label="Total bruto" value={fmt(ventasTotales)} bold borderTop />

    <DataRow
      label="Total neto"
      value={fmt(ventasNetas)}
      bold
      color={ventasNetas < 0 ? "#c62828" : "#111827"}
    />
  </SectionCard>
);

export default SalesSummarySection;
