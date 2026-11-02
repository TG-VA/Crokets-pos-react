import { useState } from "react";
import PaginationBar from "../../../../PaginationBar/PaginationBar";
import { KIT_STATUS_FILTERS } from "../services/kitsFilterService";
import { KIT_SORT_CRITERIA } from "../services/kitsSortService";
import {
  KIT_VALIDITY_STATUS,
  getKitValidityStatus,
} from "../services/kitValidityCalculationService";
import KitRenewValidityForm from "./KitRenewValidityForm";
import styles from "../ProductsPromotions.module.css";

const SORT_OPTIONS = [
  { value: "", label: "Sin orden" },
  { value: KIT_SORT_CRITERIA.EXPIRY, label: "Vencimiento" },
  { value: KIT_SORT_CRITERIA.DESCRIPTION, label: "Descripción" },
  { value: KIT_SORT_CRITERIA.PRICE, label: "Precio" },
  { value: KIT_SORT_CRITERIA.STATUS, label: "Estado" },
];

const STATUS_OPTIONS = [
  { value: KIT_STATUS_FILTERS.ALL, label: "Todos" },
  { value: KIT_STATUS_FILTERS.ACTIVE, label: "Vigentes" },
  { value: KIT_STATUS_FILTERS.SCHEDULED, label: "Programados" },
  { value: KIT_STATUS_FILTERS.EXPIRED, label: "Vencidos" },
  { value: KIT_STATUS_FILTERS.INACTIVE, label: "Inactivos" },
];

const VALIDITY_BADGES = {
  [KIT_VALIDITY_STATUS.ACTIVE]: {
    label: "Vigente",
    className: styles.kitStatusActive,
  },
  [KIT_VALIDITY_STATUS.SCHEDULED]: {
    label: "Programado",
    className: styles.kitStatusScheduled,
  },
  [KIT_VALIDITY_STATUS.EXPIRED]: {
    label: "Vencido",
    className: styles.kitStatusExpired,
  },
  [KIT_VALIDITY_STATUS.INACTIVE]: {
    label: "Inactivo",
    className: styles.kitStatusInactive,
  },
};

const KitRegisteredListSection = ({
  kits,
  visibleKits,
  totalKits,
  searchTerm,
  onSearchTermChange,
  status,
  onStatusChange,
  sortCriterion,
  onSortCriterionChange,
  expiringCount,
  expiringKitIds,
  expiringOnly,
  onToggleExpiringOnly,
  pagination,
  pageSizeOptions,
  editingKit,
  handleEditKit,
  handleToggleKitStatus,
  handleSoftDeleteKit,
  handleRenewKitValidity,
  canManageKits = false,
}) => {
  const [renewingKitId, setRenewingKitId] = useState(null);

  const handleSubmitRenew = (kit, range) => {
    handleRenewKitValidity(kit, range, () => setRenewingKitId(null));
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Kits registrados</div>

      <div className={styles.kitsFilters}>
        <input
          type="text"
          className={styles.kitsSearchInput}
          aria-label="Buscar kits por nombre o código"
          placeholder="Buscar por nombre o código"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
        />
        <select
          className={styles.kitsStatusSelect}
          aria-label="Filtrar kits por estado"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className={styles.kitsStatusSelect}
          aria-label="Ordenar kits"
          value={sortCriterion ?? ""}
          onChange={(e) => onSortCriterionChange(e.target.value || null)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {expiringCount > 0 && (
        <button
          type="button"
          className={[
            styles.expiringStrip,
            expiringOnly ? styles.expiringStripActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={expiringOnly}
          onClick={onToggleExpiringOnly}
        >
          {expiringCount === 1
            ? "1 kit por vencer"
            : `${expiringCount} kits por vencer`}
          {expiringOnly ? " (mostrar todos)" : " (ver solo estos)"}
        </button>
      )}

      <div className={styles.cardContent}>
        {kits.length === 0 ? (
          <div className={styles.emptyState}>No hay kits registrados</div>
        ) : visibleKits.length === 0 ? (
          <div className={styles.emptyState}>
            Ningún kit coincide con la búsqueda
          </div>
        ) : (
          <div className={styles.kitsList}>
            {visibleKits.map((kit) => {
              const validityStatus = getKitValidityStatus(kit);
              const badge = VALIDITY_BADGES[validityStatus];
              const canRenew =
                canManageKits &&
                (validityStatus === KIT_VALIDITY_STATUS.EXPIRED ||
                  Boolean(expiringKitIds?.has(kit.id)));
              return (
                <div
                  key={kit.id}
                  className={[
                    styles.kitRow,
                    editingKit?.id === kit.id ? styles.selectedProductItem : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div>
                    <span className={styles.kitNameBadge}>
                      {kit.products?.name || "KIT"}
                    </span>
                    <div className={styles.productMeta}>
                      Código: {kit.products?.barcode || "Sin código"} · Precio:
                      ${Number(kit.products?.sale_price || 0).toFixed(2)}
                    </div>
                  </div>

                  <span
                    className={[styles.kitStatus, badge.className].join(" ")}
                  >
                    {badge.label}
                  </span>

                  {expiringKitIds?.has(kit.id) && (
                    <span className={styles.expiringBadge}>Por vencer</span>
                  )}

                  <div className={styles.kitActions}>
                    {canManageKits && (
                      <button
                        type="button"
                        className={[styles.btn, styles.btnSave].join(" ")}
                        onClick={() => handleEditKit(kit)}
                      >
                        Editar
                      </button>
                    )}

                    <button
                      type="button"
                      className={[
                        styles.btn,
                        kit.is_active ? styles.btnDelete : styles.btnSave,
                      ].join(" ")}
                      onClick={() => handleToggleKitStatus(kit)}
                    >
                      {kit.is_active ? "Desactivar" : "Activar"}
                    </button>

                    {canRenew && (
                      <button
                        type="button"
                        className={[styles.btn, styles.btnSave].join(" ")}
                        onClick={() => setRenewingKitId(kit.id)}
                      >
                        Renovar vigencia
                      </button>
                    )}

                    {canManageKits && (
                      <button
                        type="button"
                        className={[styles.btn, styles.btnRemove].join(" ")}
                        onClick={() => handleSoftDeleteKit(kit)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  {renewingKitId === kit.id && (
                    <KitRenewValidityForm
                      kit={kit}
                      onSubmit={handleSubmitRenew}
                      onCancel={() => setRenewingKitId(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalKits > 0 && (
        <PaginationBar
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          pageSizeOptions={pageSizeOptions ?? [pagination.pageSize]}
          onPageChange={pagination.handlePageChange}
          onPageSizeChange={pagination.handlePageSizeChange}
          totalItems={totalKits}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          itemsNoun="kits"
        />
      )}
    </div>
  );
};

export default KitRegisteredListSection;
