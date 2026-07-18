import React from "react";

import {
  formatKardexDateTime,
  getKardexMovementDescription,
} from "../utils/kardexFormatters";

import {
  getKardexMinimumStock,
} from "../utils/kardexMovementUtils";

import styles from "./KardexTable.module.css";

const KardexTable = ({
  rows = [],
  product = null,
  loading = false,
  error = "",
}) => {
  const normalizedRows =
    Array.isArray(rows)
      ? rows
      : [];

  const minimumStock =
    getKardexMinimumStock(product);

  if (loading) {
    return (
      <div className={styles.movementsLoading}>
        Cargando movimientos...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.movementsError}>
        {error}
      </div>
    );
  }

  if (normalizedRows.length === 0) {
    return (
      <div className={styles.movementsEmpty}>
        No hay movimientos registrados para este producto
        dentro del rango seleccionado.
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.colFecha}>
              FECHA
            </th>

            <th className={styles.colDescripcion}>
              DESCRIPCIÓN / MOTIVO
            </th>

            <th className={styles.colEntradas}>
              ENTRADAS
            </th>

            <th className={styles.colSalidas}>
              SALIDAS
            </th>

            <th className={styles.colExistencia}>
              EXISTENCIA
            </th>
          </tr>
        </thead>

        <tbody>
          {normalizedRows.map(
            (row, index) => {
              const runningStock =
                row?.runningStock;

              const hasLowStock =
                runningStock !== null &&
                runningStock !== undefined &&
                Number(runningStock) <
                  Number(minimumStock);

              return (
                <tr
                  key={
                    row?.id ??
                    row?.row_key ??
                    `${row?.created_at}-${index}`
                  }
                >
                  <td className={styles.cellFecha}>
                    {formatKardexDateTime(
                      row?.created_at
                    )}
                  </td>

                  <td
                    className={
                      styles.cellDescripcion
                    }
                  >
                    {getKardexMovementDescription(
                      row
                    )}
                  </td>

                  <td
                    className={`${styles.cellEntradas} ${
                      row?.entryQty > 0
                        ? styles.positive
                        : ""
                    }`}
                  >
                    {row?.entryQty > 0
                      ? `+${row.entryQty}`
                      : "—"}
                  </td>

                  <td
                    className={`${styles.cellSalidas} ${
                      row?.exitQty > 0
                        ? styles.negative
                        : ""
                    }`}
                  >
                    {row?.exitQty > 0
                      ? `-${row.exitQty}`
                      : "—"}
                  </td>

                  <td
                    className={`${styles.cellExistencia} ${
                      hasLowStock
                        ? styles.lowStock
                        : ""
                    }`}
                  >
                    {runningStock ?? "—"}
                  </td>
                </tr>
              );
            }
          )}
        </tbody>
      </table>
    </div>
  );
};

export default KardexTable;