/**
 * CustomerDetailProductsTab.jsx
 * Pestaña con la lista de productos más consumidos por el cliente y su paginación.
 */

import React, { useState, useMemo } from "react";
import styles from "./CustomersComponents.module.css";
import { formatCurrency, formatNumber } from "../utils/customersReportFormatters";

const CustomerDetailProductsTab = ({ favoriteProducts = [] }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalProducts = favoriteProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return favoriteProducts.slice(start, start + pageSize);
  }, [favoriteProducts, safePage, pageSize]);

  return (
    <div className={styles.tabPanel}>
      <div className={styles.modalSectionTitle}>
        <span>Productos más consumidos por el cliente</span>
      </div>

      {favoriteProducts.length === 0 ? (
        <p className={styles.modalEmptyText}>
          No hay compras registradas con productos para este cliente.
        </p>
      ) : (
        <>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th className={styles.alignCenter}>Unidades</th>
                <th className={styles.alignCenter}>Veces Comprado</th>
                <th className={styles.alignRight}>Total Invertido</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((p) => (
                <tr key={p.productId}>
                  <td className={styles.monospaceCell}>
                    {p.barcode || "S/C"}
                  </td>
                  <td>
                    <span className={styles.cellPrimaryValue}>
                      {p.productName}
                    </span>
                  </td>
                  <td className={styles.alignCenter}>
                    <span className={styles.cellPrimaryValue}>
                      {formatNumber(p.totalQuantity)}
                    </span>
                  </td>
                  <td className={styles.alignCenter}>
                    <span>{p.purchasesCount} tickets</span>
                  </td>
                  <td className={styles.alignRight}>
                    <span className={styles.cellPrimaryValue}>
                      {formatCurrency(p.totalSpent)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalProducts > 0 && (
            <div className={`${styles.paginationWrapper} ${styles.modalPaginationWrapper}`.trim()}>
              <div className={styles.paginationInfo}>
                <span>
                  Mostrando {Math.min((safePage - 1) * pageSize + 1, totalProducts)} a{" "}
                  {Math.min(safePage * pageSize, totalProducts)} de {totalProducts} productos
                </span>
                <span>|</span>
                <label className={styles.paginationLabel}>
                  Por página:
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className={styles.pageSizeSelect}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label>
              </div>

              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  Anterior
                </button>
                <span className={styles.pageIndicator}>
                  Página {safePage} de {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerDetailProductsTab;
