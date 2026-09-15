import { SectionCard, DataRow, EmptyState } from "./primitives";
import { fmt, fmtTime } from "../utils/cashCutFormatters";

import EntryIcon from "../../../assets/icons/entryIcon.svg";

const CashInflowsSection = ({ entradas, total }) => (
  <SectionCard icon={EntryIcon} title="ENTRADAS DE EFECTIVO">
    {entradas.length === 0 ? (
      <EmptyState msg="No hubo entradas de efectivo" />
    ) : (
      <>
        {entradas.map((mov) => (
          <DataRow
            key={mov.id}
            label={`${mov.description || "Entrada"} · ${fmtTime(mov.created_at)}`}
            value={`+ ${fmt(mov.amount)}`}
            color="#2e7d32"
          />
        ))}
        <DataRow label="Total entradas" value={fmt(total)} bold borderTop />
      </>
    )}
  </SectionCard>
);

export default CashInflowsSection;
