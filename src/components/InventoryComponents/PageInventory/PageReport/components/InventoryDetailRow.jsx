import React from "react";
import styles from "../PageReport.module.css";

const InventoryDetailRow = ({
  detailRows = [],
  loading = false,
  error = "",
}) => {
  return (
    <tr>
      <td colSpan={7} className={styles.detailCell}>
        {loading && (
          <div className={styles.info}>
            Cargando otras sucursales...
          </div>
        )}

        {!loading && !!error && (
          <div className={styles.error}>{error}</div>
        )}

        {!loading && !error && detailRows.length === 0 && (
          <div className={styles.info}>
            No hay stock de este producto en otras sucursales.
          </div>
        )}

        {!loading && !error && detailRows.length > 0 && (
          <table className={styles.nestedTable}>
            <thead>
              <tr>
                <th>Sucursal</th>
                <th>Existencia</th>
                <th>Mín</th>
                <th>Máx</th>
                <th>Estatus</th>
              </tr>
            </thead>

            <tbody>
              {detailRows.map((detail) => {
                const branchLabel = detail?.branches?.code
                  ? `${detail.branches.name} (${detail.branches.code})`
                  : detail?.branches?.name || detail?.branch_id || "—";

                return (
                  <tr key={detail.id}>
                    <td>{branchLabel}</td>

                    <td>{Number(detail?.stock ?? 0) || 0}</td>

                    <td>{Number(detail?.min_stock ?? 0) || 0}</td>

                    <td>{Number(detail?.max_stock ?? 0) || 0}</td>

                    <td>
                      {detail?.is_active ? "Activo" : "Inactivo"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </td>
    </tr>
  );
};

export default InventoryDetailRow;