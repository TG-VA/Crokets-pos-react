import { SectionCard, DataRow, EmptyState } from "./primitives";
import { fmt } from "../utils/cashCutFormatters";
import RefundItem from "./RefundItem";

import RotateLeftIcon from "../../../assets/icons/rotate-left-solid-full.svg";

const CancellationsSection = ({ cancelaciones, total }) => (
  <SectionCard icon={RotateLeftIcon} title="CANCELACIONES">
    {cancelaciones.length === 0 ? (
      <EmptyState msg="No hubo cancelaciones en este turno" />
    ) : (
      <>
        {cancelaciones.map((c) => (
          <RefundItem
            key={c.id}
            saleId={c.sale_id}
            date={c.canceled_at}
            reason={c.cancel_reason}
            amount={c.refund_amount}
            method={c.refund_method_name}
          />
        ))}

        <DataRow label="Total cancelado" value={fmt(total)} bold borderTop />
      </>
    )}
  </SectionCard>
);

export default CancellationsSection;
