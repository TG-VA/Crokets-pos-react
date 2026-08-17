import React from "react";
import { formatCurrency } from "../../../../../utils/formatters";

const ProductKpiCards = ({ data, isLoading }) => {
  if (isLoading) {
    return <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Calculando métricas...</div>;
  }

  const { totalUnits = 0, totalRevenue = 0, topDepartment = "-", bestProduct = "-" } = data || {};

  const kpiList = [
    { label: "Unidades Vendidas", value: totalUnits },
    { label: "Ingreso Total", value: formatCurrency(totalRevenue) },
    { label: "Departamento Líder", value: topDepartment },
    { label: "Producto Más Vendido", value: bestProduct, isText: true },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
      }}
    >
      {kpiList.map((kpi, index) => (
        <div
          key={index}
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "0.775rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
            {kpi.label}
          </span>
          <span
            title={kpi.isText ? kpi.value : undefined}
            style={{
              fontSize: kpi.isText ? "1rem" : "1.4rem",
              fontWeight: "700",
              color: "#0f172a",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {kpi.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ProductKpiCards;