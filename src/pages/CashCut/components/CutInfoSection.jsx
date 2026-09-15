import { SectionCard, DataRow } from "./primitives";
import { fmt, fmtShortDate, fmtTime } from "../utils/cashCutFormatters";

import ThumbtackIcon from "../../../assets/icons/thumbtack-solid-full.svg";

const CutInfoSection = ({
  cut,
  expectedDisplay,
  countedDisplay,
  differenceDisplay,
}) => (
  <SectionCard icon={ThumbtackIcon} title="INFORMACIÓN DEL CORTE">
    <DataRow
      label="Fecha del corte"
      value={`${fmtShortDate(cut?.created_at)} · ${fmtTime(cut?.created_at)}`}
    />
    <DataRow label="Monto esperado" value={fmt(expectedDisplay)} bold />
    <DataRow label="Monto contado" value={fmt(countedDisplay)} bold />
    <DataRow
      label="Diferencia"
      value={fmt(differenceDisplay)}
      color={differenceDisplay < 0 ? "#c62828" : "#2e7d32"}
      bold
      borderTop
    />
    <DataRow label="Notas" value={cut?.notes || "Sin notas"} />
  </SectionCard>
);

export default CutInfoSection;
