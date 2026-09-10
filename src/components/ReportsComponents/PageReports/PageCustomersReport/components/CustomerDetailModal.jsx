/**
 * CustomerDetailModal.jsx
 * Modal con vista 360° del cliente: datos, productos que ha comprado,
 * historial cronológico de tickets con desglose y bitácora de puntos.
 */

import React, { useState, useEffect } from "react";
import styles from "./CustomersComponents.module.css";
import useEscapeKey from "../hooks/useEscapeKey";
import {
  formatCurrency,
  formatNumber,
  formatPhoneNumber,
} from "../utils/customersReportFormatters";

import CustomerDetailProductsTab from "./CustomerDetailProductsTab";
import CustomerDetailSalesTab from "./CustomerDetailSalesTab";
import CustomerDetailPointsTab from "./CustomerDetailPointsTab";

import xmarkIcon from "../../../../../assets/icons/xmark-solid-full.svg";
import userIcon from "../../../../../assets/icons/user-solid.svg";
import basketIcon from "../../../../../assets/icons/basket-shopping-solid-full.svg";
import coinsIcon from "../../../../../assets/icons/coins-solid-full.svg";

const CustomerDetailModal = ({
  isOpen = false,
  onClose,
  customerDetail = null,
  loading = false,
  error = null,
}) => {
  const [modalTab, setModalTab] = useState("PRODUCTS"); // PRODUCTS, TICKETS, POINTS

  // Permitir cerrar modal con la tecla ESC mediante hook compartido
  useEscapeKey(isOpen, onClose);

  // Reset de pestaña al cambiar de cliente
  useEffect(() => {
    setModalTab("PRODUCTS");
  }, [customerDetail?.customer?.id]);

  if (!isOpen) return null;

  const customer = customerDetail?.customer || {};
  const sales = customerDetail?.sales || [];
  const pointsLedger = customerDetail?.pointsLedger || [];
  const favoriteProducts = customerDetail?.favoriteProducts || [];

  // Totales acumulados del cliente
  const totalSpent = sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  const totalVisits = sales.length;
  const avgTicket = totalVisits > 0 ? totalSpent / totalVisits : 0;

  // Saldo neto de puntos
  const currentPointsBalance = pointsLedger.reduce((acc, row) => {
    const raw = Number(row.points || 0);
    const mType = String(row.movement_type || "").toLowerCase();
    const isRedeem =
      mType.includes("canje") ||
      mType.includes("redeem") ||
      mType.includes("used") ||
      raw < 0;
    return isRedeem ? acc - Math.abs(raw) : acc + Math.abs(raw);
  }, 0);

  const getInitials = (name) => {
    if (!name) return "CL";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContainer}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderInfo}>
            <div className={styles.modalAvatar}>
              {getInitials(customer.name)}
            </div>
            <div className={styles.modalTitleGroup}>
              <h2 className={styles.modalTitle}>
                {customer.name || "Detalle del Cliente"}
              </h2>
              <div className={styles.modalSubtitle}>
                <span>{formatPhoneNumber(customer.phone)}</span>
                {customer.email && <span>| {customer.email}</span>}
                {customer.rfc && <span>| RFC: {customer.rfc}</span>}
                {customer.is_points_customer && (
                  <span className={`${styles.badge} ${styles.badgePoints}`.trim()}>
                    Programa Puntos
                  </span>
                )}
                {customer.is_billing_customer && (
                  <span className={`${styles.badge} ${styles.badgeBilling}`.trim()}>
                    Facturación
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={styles.modalCloseBtn}
            title="Cerrar modal"
          >
            <img src={xmarkIcon} alt="" className={styles.iconMedium} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <p className={styles.modalEmptyText}>
                Cargando información histórica del cliente...
              </p>
            </div>
          ) : error ? (
            <div className={styles.emptyContainer}>
              <p className={styles.modalErrorText}>{error}</p>
            </div>
          ) : (
            <>
              {/* Resumen de KPIs del Cliente */}
              <div className={styles.chipsGrid}>
                <div className={styles.infoChip}>
                  <span className={styles.chipLabel}>Total Gastado</span>
                  <span className={styles.chipValue}>{formatCurrency(totalSpent)}</span>
                </div>
                <div className={styles.infoChip}>
                  <span className={styles.chipLabel}>Total Compras</span>
                  <span className={styles.chipValue}>{formatNumber(totalVisits)} visitas</span>
                </div>
                <div className={styles.infoChip}>
                  <span className={styles.chipLabel}>Ticket Promedio</span>
                  <span className={styles.chipValue}>{formatCurrency(avgTicket)}</span>
                </div>
                <div className={styles.infoChip}>
                  <span className={styles.chipLabel}>Puntos Saldo Actual</span>
                  <span className={styles.chipValue}>{formatNumber(currentPointsBalance)} pts</span>
                </div>
              </div>

              {/* Sub-navegación del modal */}
              <div className={styles.tabsContainer}>
                <button
                  type="button"
                  onClick={() => setModalTab("PRODUCTS")}
                  className={`${styles.tabButton} ${
                    modalTab === "PRODUCTS" ? styles.tabButtonActive : ""
                  }`.trim()}
                >
                  <img src={basketIcon} alt="" className={styles.iconSmall} />
                  ¿Qué ha comprado?
                  <span className={styles.tabBadge}>{favoriteProducts.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab("TICKETS")}
                  className={`${styles.tabButton} ${
                    modalTab === "TICKETS" ? styles.tabButtonActive : ""
                  }`.trim()}
                >
                  <img src={userIcon} alt="" className={styles.iconSmall} />
                  Historial de Tickets
                  <span className={styles.tabBadge}>{sales.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab("POINTS")}
                  className={`${styles.tabButton} ${
                    modalTab === "POINTS" ? styles.tabButtonActive : ""
                  }`.trim()}
                >
                  <img src={coinsIcon} alt="" className={styles.iconSmall} />
                  Movimientos de Puntos
                  <span className={styles.tabBadge}>{pointsLedger.length}</span>
                </button>
              </div>

              {/* Contenido de la pestaña activa */}
              {modalTab === "PRODUCTS" && (
                <CustomerDetailProductsTab favoriteProducts={favoriteProducts} />
              )}

              {modalTab === "TICKETS" && (
                <CustomerDetailSalesTab sales={sales} />
              )}

              {modalTab === "POINTS" && (
                <CustomerDetailPointsTab pointsLedger={pointsLedger} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailModal;
