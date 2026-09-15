import { SectionCard, DataRow, EmptyState } from "./primitives";
import { fmt } from "../utils/cashCutFormatters";
import RefundItem from "./RefundItem";

import RotateLeftIcon from "../../../assets/icons/rotate-left-solid-full.svg";

const PartialReturnsSection = ({ devolucionesParciales, total }) => (
  <SectionCard icon={RotateLeftIcon} title="DEVOLUCIONES PARCIALES">
    {devolucionesParciales.length === 0 ? (
      <EmptyState msg="No hubo devoluciones parciales en este turno" />
    ) : (
      <>
        {devolucionesParciales.map((item) => (
          <RefundItem
            key={item.id}
            saleId={item.sale_id}
            date={item.created_at}
            reason={item.return_reason}
            amount={item.total_refund}
            method={item.refund_method_name}
          />
        ))}

        <DataRow
          label="Total devoluciones parciales"
          value={fmt(total)}
          bold
          borderTop
        />
      </>
    )}
  </SectionCard>
);

export default PartialReturnsSection;
