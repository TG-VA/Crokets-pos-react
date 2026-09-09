/**
 * ProductBuyersModal.jsx
 * Modal que desglosa los clientes que han comprado un producto específico.
 */

import React, { useState, useMemo, useEffect } from "react";
import styles from "./CustomersComponents.module.css";
import useEscapeKey from "../hooks/useEscapeKey";
import {
  formatCurrency,
  formatNumber,
  formatPhoneNumber,
  formatShortDate,
} from "../utils/customersReportFormatters";

import xmarkIcon from "../../../../../assets/icons/xmark-solid-full.svg";
import userIcon from "../../../../../assets/icons/user-solid.svg";
import boxIcon from "../../../../../assets/icons/box-solid-full.svg";
import searchIcon from "../../../../../assets/icons/searchIcon.svg";
import { usePagination } from "../../../../../hooks/usePagination";

const ProductBuyersModal = ({
  isOpen = false,
  onClose,
  product = null,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Permitir cerrar modal con la tecla ESC mediante hook compartido
  useEscapeKey(isOpen, onClose);

  const buyers = useMemo(() => {
    return product?.buyers || [];
  }, [product]);

  const filteredBuyers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return buyers;

    return buyers.filter((b) => {
      const name = (b.name || "").toLowerCase();
      const phone = (b.phone || "").toLowerCase();
      const rfc = (b.rfc || "").toLowerCase();
      return name.includes(term) || phone.includes(term) || rfc.includes(term);
    });
  }, [buyers, searchTerm]);

  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    pageItems,
    resetPagination,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: filteredBuyers.length,
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 25],
  });

  useEffect(() => {
    resetPagination();
  }, [searchTerm, product?.productId, resetPagination]);

  const totalBuyers = filteredBuyers.length;
  const paginatedBuyers = pageItems(filteredBuyers);

  if (!isOpen || !product) return null;


  const totalUnits = product.quantity || 0;
  const totalRevenue = product.revenue || 0;
  const uniqueCount = buyers.length;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContainer}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 840 }}
      >
        {/* Cabecera del modal */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderInfo}>
            <div className={styles.modalAvatar} style={{ backgroundColor: "#0284c7" }}>
              <img
                src={boxIcon}
                alt=""
                style={{ width: 20, height: 20, filter: "brightness(0) invert(1)" }}
              />
            </div>
            <div className={styles.modalTitleGroup}>
              <h2 className={styles.modalTitle}>Clientes que compraron este producto</h2>
              <div className={styles.modalSubtitle}>
                <span style={{ fontWeight: 600, color: "#1e293b" }}>
                  {product.productName}
                </span>
                <span>·</span>
                <span>Código: {product.barcode || "S/C"}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={styles.modalCloseBtn}
            title="Cerrar modal"
          >
            <img src={xmarkIcon} alt="" style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Resumen de métricas del producto */}
        <div className={styles.buyersStatsStrip}>
          <div className={styles.buyerStatItem}>
            <span className={styles.buyerStatLabel}>Compradores Únicos</span>
            <span className={styles.buyerStatValue}>
              {formatNumber(uniqueCount)} {uniqueCount === 1 ? "cliente" : "clientes"}
            </span>
          </div>

          <div className={styles.buyerStatItem}>
            <span className={styles.buyerStatLabel}>Unidades Totales</span>
            <span className={styles.buyerStatValue}>
              {formatNumber(totalUnits)} uds
            </span>
          </div>

          <div className={styles.buyerStatItem}>
            <span className={styles.buyerStatLabel}>Veces Vendido</span>
            <span className={styles.buyerStatValue}>
              {formatNumber(product.ticketsCount || 0)}{" "}
              <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>
                {(product.ticketsCount || 0) === 1 ? "ticket" : "tickets"}
              </span>
            </span>
          </div>

          <div className={styles.buyerStatItem}>
            <span className={styles.buyerStatLabel}>Ingreso por este Producto</span>
            <span className={styles.buyerStatValue} style={{ color: "#0f766e" }}>
              {formatCurrency(totalRevenue)}
            </span>
          </div>
        </div>

        {/* Buscador de clientes compradores */}
        <div className={styles.buyersFilterBar}>
          <div className={styles.buyersSearchWrapper}>
            <img
              src={searchIcon}
              alt=""
              style={{ width: 14, height: 14, opacity: 0.5 }}
            />
            <input
              type="text"
              className={styles.buyersSearchInput}
              placeholder="Buscar cliente comprador por nombre o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className={styles.buyersClearBtn}
                onClick={() => setSearchTerm("")}
              >
                Limpiar
              </button>
            )}
          </div>
          <span className={styles.buyersCountNote}>
            {filteredBuyers.length} de {uniqueCount} compradores
          </span>
        </div>

        {/* Tabla de compradores */}
        <div className={styles.modalBodyScroll}>
          {filteredBuyers.length === 0 ? (
            <div className={styles.emptyContainer} style={{ padding: "40px 20px" }}>
              <div className={styles.emptyIconWrapper}>
                <img src={userIcon} alt="" style={{ width: 22, height: 22 }} />
              </div>
              <h3 className={styles.emptyTitle}>No se encontraron clientes</h3>
              <p className={styles.emptyDescription}>
                {searchTerm
                  ? "Ningún comprador coincide con el término de búsqueda."
                  : "No hay registros de compras asociados a este artículo."}
              </p>
            </div>
          ) : (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className={styles.alignCenter}>Unidades Compradas</th>
                  <th className={styles.alignCenter}>Veces Comprado</th>
                  <th className={styles.alignRight}>Total Invertido</th>
                  <th className={styles.alignRight}>Última Compra</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBuyers.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className={styles.customerNameCell}>
                        <span className={styles.customerNameText}>{b.name}</span>
                        <div className={styles.customerMetaRow}>
                          <span className={styles.customerPhone}>
                            {formatPhoneNumber(b.phone)}
                          </span>
                          {b.isPointsCustomer && (
                            <span
                              className={`${styles.badge} ${styles.badgePoints}`.trim()}
                            >
                              Puntos
                            </span>
                          )}
                          {b.isBillingCustomer && (
                            <span
                              className={`${styles.badge} ${styles.badgeBilling}`.trim()}
                            >
                              Factura
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className={styles.alignCenter}>
                      <span className={styles.cellPrimaryValue}>
                        {formatNumber(b.quantity)}
                      </span>
                    </td>

                    <td className={styles.alignCenter}>
                      <span className={styles.cellPrimaryValue}>
                        {formatNumber(b.ticketsCount || b.purchasesCount || 0)}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: 4 }}>
                        {(b.ticketsCount || b.purchasesCount || 0) === 1 ? "ticket" : "tickets"}
                      </span>
                    </td>

                    <td className={styles.alignRight}>
                      <span className={styles.cellPrimaryValue}>
                        {formatCurrency(b.spent)}
                      </span>
                    </td>

                    <td className={styles.alignRight}>
                      <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                        {b.lastPurchaseDate
                          ? formatShortDate(b.lastPurchaseDate)
                          : "Sin fecha"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Paginación de compradores del producto */}
          {totalBuyers > 0 && (
            <div className={styles.paginationWrapper} style={{ margin: "auto 18px 16px 18px" }}>
              <div className={styles.paginationInfo}>
                <span>
                  Mostrando {startIndex + 1} a {endIndex} de {totalBuyers} compradores
                </span>
                <span>|</span>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  Por página:
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className={styles.pageSizeSelect}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                </label>
              </div>

              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Anterior
                </button>
                <span className={styles.pageIndicator}>
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default ProductBuyersModal;
