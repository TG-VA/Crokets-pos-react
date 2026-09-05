/**
 * CustomersReportFilters.jsx
 * Barra de filtros para el reporte de clientes (historial completo).
 */

import React from "react";
import styles from "./CustomersComponents.module.css";
import searchIcon from "../../../../../assets/icons/searchIcon.svg";
import rotateLeftIcon from "../../../../../assets/icons/rotate-left-solid-full.svg";

const CustomersReportFilters = ({
  branchesList = [],
  selectedBranchId = "ALL",
  setSelectedBranchId,
  customerType = "ALL",
  setCustomerType,
  riskFilter = "ALL",
  setRiskFilter,
  searchTerm = "",
  setSearchTerm,
  activeTab = "RANKING",
}) => {
  const handleReset = () => {
    setSelectedBranchId("ALL");
    setCustomerType("ALL");
    setRiskFilter("ALL");
    setSearchTerm("");
  };

  return (
    <div className={styles.filtersWrapper}>
      <div className={styles.filtersToolbar}>
        {/* Sucursal */}
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Sucursal:</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className={styles.selectInput}
          >
            <option value="ALL">Todas las sucursales</option>
            {branchesList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Cliente (solo en pestaña de Ranking) */}
        {activeTab === "RANKING" && (
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Tipo de Cliente:</label>
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
              className={styles.selectInput}
            >
              <option value="ALL">Todos los clientes</option>
              <option value="POINTS">Con Programa de Puntos</option>
              <option value="BILLING">Clientes de Facturación</option>
            </select>
          </div>
        )}

        {/* Filtro de Riesgo/Inactividad (solo en pestaña de Ranking) */}
        {activeTab === "RANKING" && (
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Estatus de Actividad:</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className={styles.selectInput}
            >
              <option value="ALL">Todos los estatus</option>
              <option value="ACTIVE_ONLY">Activos Recientes (últimos 30 días)</option>
              <option value="RISK_ONLY">En Riesgo / Inactivos (más de 30 días)</option>
            </select>
          </div>
        )}

        {/* Buscador de Texto */}
        <div className={`${styles.filterField} ${styles.filterFieldGrow}`.trim()}>
          <label className={styles.filterLabel}>Buscar:</label>
          <div className={styles.searchWrapper}>
            <img src={searchIcon} alt="" className={styles.searchIcon} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === "PRODUCTS"
                  ? "Buscar producto por nombre o código..."
                  : activeTab === "REWARDS"
                  ? "Buscar por cliente, ticket, premio o producto..."
                  : "Buscar por nombre, teléfono o RFC..."
              }
              className={`${styles.searchInput} ${styles.searchInputWithIcon}`.trim()}
            />
          </div>
        </div>

        {/* Botón Reset */}
        <button
          type="button"
          onClick={handleReset}
          className={styles.btnReset}
          title="Restablecer filtros"
        >
          <img src={rotateLeftIcon} alt="" style={{ width: 14, height: 14 }} />
          Limpiar
        </button>
      </div>
    </div>
  );
};

export default CustomersReportFilters;
