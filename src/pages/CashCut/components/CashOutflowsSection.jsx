import { SectionCard, DataRow, EmptyState } from "./primitives";
import { fmt, fmtTime } from "../utils/cashCutFormatters";

import ExitIcon from "../../../assets/icons/exitIcon.svg";

const CashOutflowsSection = ({ salidas, total }) => (
  <SectionCard icon={ExitIcon} title="SALIDAS DE EFECTIVO">
    {salidas.length === 0 ? (
      <EmptyState msg="No hubo salidas de efectivo" />
    ) : (
      <>
        {salidas.map((mov) => (
          <DataRow
            key={mov.id}
            label={`${mov.description || "Salida"} · ${fmtTime(mov.created_at)}`}
            value={`- ${fmt(mov.amount)}`}
            color="#c62828"
          />
        ))}
        <DataRow label="Total salidas" value={fmt(total)} bold borderTop />
      </>
    )}
  </SectionCard>
);

export default CashOutflowsSection;
