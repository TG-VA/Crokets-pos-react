/**
 * CustomersProductsSummaryTable.jsx
 * Tabla de análisis de productos más consumidos por clientes identificados con paginación.
 */

import React, { useState, useEffect, useMemo } from "react";
import styles from "./CustomersComponents.module.css";
import { formatCurrency, formatNumber } from "../utils/customersReportFormatters";
import boxIcon from "../../../../../assets/icons/box-solid-full.svg";
import userIcon from "../../../../../assets/icons/user-solid.svg";
import ProductBuyersModal from "./ProductBuyersModal";

const CustomersProductsSummaryTable = ({ products = [] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedProductForBuyers, setSelectedProductForBuyers] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [products.length]);

  const totalItems = products.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return products.slice(startIndex, startIndex + pageSize);
  }, [products, safeCurrentPage, pageSize]);

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableCardHeader}>
        <div className={styles.tableCardTitleGroup}>
          <span className={styles.tableCardTitle}>Productos Más Comprados por Clientes</span>
          <span className={styles.tableCardSubtitle}>
            Preferencia y consumo histórico de artículos ({totalItems} productos registrados)
          </span>
        </div>
      </div>

      <div className={styles.tableScrollArea}>
        {products.length === 0 ? (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIconWrapper}>
              <img src={boxIcon} alt="" style={{ width: 22, height: 22 }} />
            </div>
            <h3 className={styles.emptyTitle}>No hay datos de productos</h3>
            <p className={styles.emptyDescription}>
              No se registraron ventas con detalle de productos a clientes identificados.
            </p>
          </div>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th className={styles.alignCenter}>Unidades Vendidas</th>
                <th className={styles.alignCenter} title="Número de tickets en los que se vendió">Veces Vendido</th>
                <th className={styles.alignRight}>Ingreso Acumulado</th>
                <th className={styles.alignCenter}>Clientes Únicos</th>
                <th className={styles.alignRight}>Promedio por Cliente</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((p) => {
                const avgPerCustomer =
                  p.uniqueCustomersCount > 0
                    ? (p.quantity / p.uniqueCustomersCount).toFixed(1)
                    : "0";

                return (
                  <tr key={p.productId}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#64748b" }}>
                      {p.barcode || "S/C"}
                    </td>
                    <td>
                      <span className={styles.cellPrimaryValue}>{p.productName}</span>
                    </td>
                    <td className={styles.alignCenter}>
                      <span className={styles.cellPrimaryValue}>
                        {formatNumber(p.quantity)}
                      </span>
                    </td>
                    <td className={styles.alignCenter}>
                      <span className={styles.cellPrimaryValue}>
                        {formatNumber(p.ticketsCount || 0)}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: 4 }}>
                        {(p.ticketsCount || 0) === 1 ? "ticket" : "tickets"}
                      </span>
                    </td>
                    <td className={styles.alignRight}>
                      <span className={styles.cellPrimaryValue}>
                        {formatCurrency(p.revenue)}
                      </span>
                    </td>
                    <td className={styles.alignCenter}>
                      {p.uniqueCustomersCount > 0 ? (
                        <button
                          type="button"
                          className={styles.clickableBadge}
                          onClick={() => setSelectedProductForBuyers(p)}
                          title="Ver los clientes que compraron este producto"
                        >
                          <img
                            src={userIcon}
                            alt=""
                            style={{ width: 11, height: 11 }}
                          />
                          <span>
                            {formatNumber(p.uniqueCustomersCount)}{" "}
                            {p.uniqueCustomersCount === 1 ? "cliente" : "clientes"}
                          </span>
                        </button>
                      ) : (
                        <span className={styles.badgeNeutralFixed}>
                          0 clientes
                        </span>
                      )}

                    </td>

                    <td className={styles.alignRight}>
                      <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                        {avgPerCustomer} uds/cte
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Barra de Paginación */}
      {totalItems > 0 && (
        <div className={styles.paginationWrapper}>
          <div className={styles.paginationInfo}>
            <span>
              Mostrando {Math.min((safeCurrentPage - 1) * pageSize + 1, totalItems)} a{" "}
              {Math.min(safeCurrentPage * pageSize, totalItems)} de {totalItems} productos
            </span>
            <span>|</span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              Por página:
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={styles.pageSizeSelect}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
            >
              Anterior
            </button>
            <span className={styles.pageIndicator}>
              Página {safeCurrentPage} de {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal para ver qué clientes compran este producto */}
      <ProductBuyersModal
        isOpen={Boolean(selectedProductForBuyers)}
        onClose={() => setSelectedProductForBuyers(null)}
        product={selectedProductForBuyers}
      />

    </div>
  );
};

export default CustomersProductsSummaryTable;

