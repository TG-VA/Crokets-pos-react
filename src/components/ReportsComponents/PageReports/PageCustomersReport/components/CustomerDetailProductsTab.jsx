/**
 * CustomerDetailProductsTab.jsx
 * Pestaña con la lista de productos más consumidos por el cliente y su paginación.
 */

import React from "react";
import styles from "./CustomersComponents.module.css";
import { formatCurrency, formatNumber } from "../utils/customersReportFormatters";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../../components/PaginationBar/PaginationBar";

const CustomerDetailProductsTab = ({ favoriteProducts = [] }) => {
  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    pageItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: favoriteProducts.length,
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 20],
  });

  const totalProducts = favoriteProducts.length;
  const paginatedProducts = pageItems(favoriteProducts);

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
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalProducts}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20]}
              startIndex={startIndex}
              endIndex={endIndex}
              itemsNoun="productos"
              modal
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CustomerDetailProductsTab;
