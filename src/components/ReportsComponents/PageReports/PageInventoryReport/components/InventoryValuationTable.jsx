import React, { useState, useMemo } from "react";
import styles from "./InventoryComponents.module.css";
import { formatCurrency } from "../../../../../utils/formatters";

const ITEMS_PER_PAGE = 25;

const InventoryValuationTable = ({ items = [], isLoading = false }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;

  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [items, currentPage]);

  const getStatusBadge = (status, label) => {
    let badgeClass = styles.badgeNeutral;
    if (status === "exhausted") badgeClass = styles.badgeExhausted;
    else if (status === "low") badgeClass = styles.badgeLow;
    else if (status === "optimal") badgeClass = styles.badgeOptimal;
    else if (status === "excess") badgeClass = styles.badgeExcess;

    return <span className={`${styles.kpiAlertBadge} ${badgeClass}`}>{label}</span>;
  };

  if (isLoading) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.emptyState}>Cargando existencias del inventario...</div>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeaderBar}>
        <div>
          <h3 className={styles.tableTitle}>Existencias y Valorización</h3>
          <span className={styles.tableSubtitle}>
            Mostrando {items.length} producto(s) encontrado(s)
          </span>
        </div>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Departamento</th>
              <th className={styles.textRight}>Stock Actual</th>
              <th className={styles.textRight}>Mín / Máx</th>
              <th className={styles.textRight}>Costo Unit.</th>
              <th className={styles.textRight}>Precio Venta</th>
              <th className={styles.textRight}>Total Costo</th>
              <th className={styles.textRight}>Total Venta</th>
              <th className={styles.textCenter}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.emptyState}>
                  No se encontraron productos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <tr key={item.id}>
                  <td className={styles.fontMono}>{item.barcode || "---"}</td>
                  <td className={styles.fontBold}>{item.name}</td>
                  <td>{item.departmentName}</td>
                  <td className={`${styles.textRight} ${styles.fontBold}`}>
                    {item.tracks_inventory ? item.stock.toLocaleString() : "---"}
                  </td>
                  <td className={`${styles.textRight} ${styles.fontMono}`}>
                    {item.tracks_inventory ? `${item.min_stock} / ${item.max_stock}` : "---"}
                  </td>
                  <td className={styles.textRight}>{formatCurrency(item.cost_price)}</td>
                  <td className={styles.textRight}>{formatCurrency(item.sale_price)}</td>
                  <td className={`${styles.textRight} ${styles.fontBold}`}>
                    {formatCurrency(item.total_cost)}
                  </td>
                  <td className={styles.textRight}>{formatCurrency(item.total_sale)}</td>
                  <td className={styles.textCenter}>
                    {getStatusBadge(item.status, item.statusLabel)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.paginationBar}>
          <span>
            Página {currentPage} de {totalPages} ({items.length} registros)
          </span>
          <div className={styles.paginationActions}>
            <button
              type="button"
              className={styles.btnPagination}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className={styles.btnPagination}
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryValuationTable;
