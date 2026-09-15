import { Fragment } from "react";

import { SectionCard, DataRow, EmptyState } from "./primitives";
import { fmt } from "../utils/cashCutFormatters";

import CreditCardIcon from "../../../assets/icons/credit-card-solid-full.svg";

const PaymentMethodsSection = ({
  ventasPorMetodo,
  ventasDolaresUsd,
  ventasDolaresMxn,
  devolucionesTotales,
  devolucionesParcialesTotales,
  ventasTotales,
  ventasNetas,
}) => (
  <SectionCard icon={CreditCardIcon} title="VENTAS POR MÉTODO DE PAGO">
    {ventasPorMetodo.length === 0 ? (
      <EmptyState msg="No hubo ventas en este turno" />
    ) : (
      <>
        {ventasPorMetodo.map((m) => {
          const isDollars = m.name === "Dólares" || m.name === "Dolares";

          return (
            <Fragment key={m.name}>
              <DataRow
                label={m.name}
                value={
                  isDollars
                    ? `+ USD ${ventasDolaresUsd.toFixed(2)}`
                    : `+ ${fmt(m.total)}`
                }
                color="#2e7d32"
              />
              {isDollars && ventasDolaresUsd > 0 && (
                <DataRow
                  label="Equivalente en MXN"
                  value={`+ ${fmt(ventasDolaresMxn)}`}
                  color="#2e7d32"
                />
              )}
            </Fragment>
          );
        })}

        {devolucionesTotales > 0 && (
          <DataRow
            label="Devoluciones totales"
            value={`- ${fmt(devolucionesTotales)}`}
            color="#c62828"
          />
        )}

        {devolucionesParcialesTotales > 0 && (
          <DataRow
            label="Devoluciones parciales"
            value={`- ${fmt(devolucionesParcialesTotales)}`}
            color="#c62828"
          />
        )}

        <DataRow label="Total bruto" value={fmt(ventasTotales)} bold borderTop />

        <DataRow
          label="Total neto"
          value={fmt(ventasNetas)}
          bold
          color={ventasNetas < 0 ? "#c62828" : "#111827"}
        />
      </>
    )}
  </SectionCard>
);

export default PaymentMethodsSection;
