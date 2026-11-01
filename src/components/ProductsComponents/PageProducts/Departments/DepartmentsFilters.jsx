import React from "react";
import styles from "./Departments.module.css";

const SELECT_FILTERS = [
  {
    key: "status",
    label: "Filtrar por estatus",
    options: [
      { value: "all", label: "Todos los estatus" },
      { value: "active", label: "Activos" },
      { value: "inactive", label: "Inactivos" },
    ],
  },
  {
    key: "commission",
    label: "Filtrar por comisión",
    options: [
      { value: "all", label: "Toda comisión" },
      { value: "with", label: "Generan comisión" },
      { value: "without", label: "No generan comisión" },
    ],
  },
];

const DepartmentsFilters = ({ filters, onChange }) => (
  <div className={styles.filters}>
    <input
      className={styles.filterInput}
      type="text"
      value={filters.search}
      onChange={(e) => onChange("search", e.target.value)}
      placeholder="Buscar departamento"
      aria-label="Buscar departamento"
    />

    {SELECT_FILTERS.map((filter) => (
      <select
        key={filter.key}
        className={styles.filterInput}
        value={filters[filter.key]}
        onChange={(e) => onChange(filter.key, e.target.value)}
        aria-label={filter.label}
      >
        {filter.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ))}
  </div>
);

export default DepartmentsFilters;
