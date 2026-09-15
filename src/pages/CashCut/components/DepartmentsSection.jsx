import { SectionCard, DataRow, EmptyState } from "./primitives";
import { fmt } from "../utils/cashCutFormatters";

import BoxIcon from "../../../assets/icons/box-solid-full.svg";

const DepartmentsSection = ({ ventasPorDepartamento, departamentosTotal }) => (
  <SectionCard icon={BoxIcon} title="VENTAS POR DEPARTAMENTO">
    {ventasPorDepartamento.length === 0 ? (
      <EmptyState msg="No hay datos de departamentos" />
    ) : (
      <>
        {ventasPorDepartamento.map((dep) => (
          <DataRow key={dep.name} label={dep.name} value={fmt(dep.total)} />
        ))}
        <DataRow label="Total" value={fmt(departamentosTotal)} bold borderTop />
      </>
    )}
  </SectionCard>
);

export default DepartmentsSection;
