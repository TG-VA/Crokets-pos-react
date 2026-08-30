import React from "react";
import styles from "./CashComponents.module.css";
import { useEscapeKey } from "../../../../../hooks/useEscapeKey";
import { getShortFolio, getDifferenceStatus } from "../utils/cashReportFormatters";

import DetailTurnInfoSection from "./detailModalSections/DetailTurnInfoSection";
import DetailCashBalanceSection from "./detailModalSections/DetailCashBalanceSection";
import DetailPaymentsSection from "./detailModalSections/DetailPaymentsSection";
import DetailMovementsSection from "./detailModalSections/DetailMovementsSection";
import DetailDiscountsSection from "./detailModalSections/DetailDiscountsSection";

import XMarkIcon from "../../../../../assets/icons/xmark-solid-full.svg";

const CashSessionDetailModal = ({
  isOpen = false,
  onClose,
  sessionDetail = null,
  loading = false,
}) => {
  // Soporte para cerrar con tecla ESC
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const branchTz = sessionDetail?.branches?.timezone || "America/Cancun";
  const diffInfo = getDifferenceStatus(sessionDetail?.difference);
  const isClosed = sessionDetail?.status === "closed";
  const cutData = sessionDetail?.cash_cuts?.[0] || null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleGroup}>
            <h2 className={styles.modalTitle}>
              Detalle de Turno: {sessionDetail ? getShortFolio(sessionDetail.id) : "Cargando..."}
            </h2>
            <p className={styles.modalSubtitle}>
              {sessionDetail?.branches?.name || "Sucursal"} | Cajero:{" "}
              {sessionDetail?.users?.username
                ? String(sessionDetail.users.username).toUpperCase()
                : "USUARIO"}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeModalBtn}
            onClick={onClose}
            title="Cerrar modal"
          >
            <img src={XMarkIcon} alt="Cerrar" className={styles.closeIcon} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.modalLoadingWrapper}>
              <div className={`${styles.skeletonCell} ${styles.skeletonTitle}`} />
              <div className={`${styles.skeletonCell} ${styles.skeletonBox}`} />
              <div className={`${styles.skeletonCell} ${styles.skeletonTable}`} />
            </div>
          ) : sessionDetail ? (
            <>
              {/* Sección 1: Datos Generales */}
              <DetailTurnInfoSection
                sessionDetail={sessionDetail}
                branchTz={branchTz}
                diffInfo={diffInfo}
                isClosed={isClosed}
              />

              {/* Sección 2: Balance de Efectivo */}
              <DetailCashBalanceSection
                sessionDetail={sessionDetail}
                isClosed={isClosed}
              />

              {/* Sección 3: Ventas por Método de Pago en el Turno */}
              <DetailPaymentsSection
                paymentsByMethod={sessionDetail.paymentsByMethod}
              />

              {/* Sección 4: Movimientos Manuales del Turno */}
              <DetailMovementsSection
                movements={sessionDetail.movements}
                branchTz={branchTz}
                totalManualIn={sessionDetail.totalManualIn}
                totalManualOut={sessionDetail.totalManualOut}
              />

              {/* Sección 5: Auditoría de Descuentos y Canjes de Recompensas */}
              <DetailDiscountsSection
                sessionDetail={sessionDetail}
                discountsList={sessionDetail.discountsAndRewardsList}
                branchTz={branchTz}
              />

              {/* Sección 6: Notas del Corte */}
              {cutData?.notes && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Observaciones del Corte</h3>
                  <div className={styles.modalNotesCard}>
                    {cutData.notes}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>No se pudo cargar la información del turno.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CashSessionDetailModal;
