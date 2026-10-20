import { useEffect } from "react";

import styles from "./SettingsBranches.module.css";
import useSettingsBranches, {
  BRANCH_STATUS_FILTERS,
} from "./hooks/useSettingsBranches";
import BranchesTable from "./components/BranchesTable";
import BranchesPagination from "./components/BranchesPagination";
import BranchFormModal from "./components/BranchFormModal";
import BranchToggleStatusModal from "./components/BranchToggleStatusModal";
import plusIcon from "../../../../assets/icons/plus-solid-full.svg";
import circleCheckIcon from "../../../../assets/icons/circle-check-solid-full.svg";
import circleInfoIcon from "../../../../assets/icons/circle-info-solid-full.svg";
import storeIcon from "../../../../assets/icons/store-solid-full.svg";
import eyeSlashIcon from "../../../../assets/icons/eye-slash-solid-full.svg";
import displayIcon from "../../../../assets/icons/display-solid-full.svg";
import searchIcon from "../../../../assets/icons/searchIcon.svg";
import closeIcon from "../../../../assets/icons/xmark-solid-full.svg";

const FEEDBACK_TIMEOUT = 5000;

const STATUS_FILTER_OPTIONS = [
  { id: BRANCH_STATUS_FILTERS.ALL, label: "Todas" },
  { id: BRANCH_STATUS_FILTERS.ACTIVE, label: "Activas" },
  { id: BRANCH_STATUS_FILTERS.INACTIVE, label: "Inactivas" },
];

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const buildKpiCards = (metrics) => [
  {
    key: "total",
    label: "Total de Sucursales",
    value: metrics.total,
    icon: storeIcon,
    tone: "Neutral",
  },
  {
    key: "active",
    label: "Sucursales Activas",
    value: metrics.active,
    icon: circleCheckIcon,
    tone: "Active",
  },
  {
    key: "inactive",
    label: "Sucursales Inactivas",
    value: metrics.inactive,
    icon: eyeSlashIcon,
    tone: "Inactive",
  },
  {
    key: "terminals",
    label: "Terminales POS",
    value: metrics.terminals,
    icon: displayIcon,
    tone: "Info",
  },
];

const buildSearchSummary = (count, term) => {
  const label = count === 1 ? "resultado" : "resultados";
  return `${count} ${label} para "${term}"`;
};

const SettingsBranches = () => {
  const {
    branches,
    totalBranches,
    filteredCount,
    metrics,
    pagination,
    loading,
    loadError,
    isAdmin,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    saving,
    feedback,
    clearFeedback,
    formModal,
    toggleModal,
    openCreateModal,
    openEditModal,
    closeFormModal,
    openToggleModal,
    closeToggleModal,
    handleCreateBranch,
    handleUpdateBranch,
    handleToggleStatus,
  } = useSettingsBranches();

  useEffect(() => {
    if (!feedback) return undefined;

    const timeout = window.setTimeout(clearFeedback, FEEDBACK_TIMEOUT);
    return () => window.clearTimeout(timeout);
  }, [feedback, clearFeedback]);

  const safeMetrics = {
    total: metrics?.total ?? totalBranches,
    active: metrics?.active ?? 0,
    inactive: metrics?.inactive ?? 0,
    terminals: metrics?.terminals ?? 0,
  };

  const recordsCount = filteredCount ?? branches.length;
  const pageSize = pagination?.pageSize ?? branches.length;
  const currentPage = pagination?.currentPage ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  const pageStart = recordsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd =
    pageSize && pagination?.pageSize !== "all"
      ? Math.min(currentPage * pageSize, recordsCount)
      : recordsCount;

  return (
    <section className={styles.page} aria-labelledby="settings-branches-title">
      <header className={styles.pageHeader}>
        <div>
          <h1 id="settings-branches-title" className={styles.pageTitle}>
            Sucursales
          </h1>
          <p className={styles.pageSubtitle}>
            Catálogo corporativo de sucursales: crea, edita y controla el
            estatus operativo sin borrar el historial.
          </p>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={openCreateModal}
          disabled={!isAdmin}
          title={
            isAdmin
              ? "Registrar una sucursal nueva"
              : "Se requieren permisos de administrador"
          }
        >
          <img
            src={plusIcon}
            alt=""
            aria-hidden="true"
            className={styles.buttonIcon}
          />
          Nueva Sucursal
        </button>
      </header>

      {feedback ? (
        <div
          className={[
            styles.feedback,
            feedback.type === "success"
              ? styles.feedbackSuccess
              : styles.feedbackError,
          ]
            .filter(Boolean)
            .join(" ")}
          role={feedback.type === "error" ? "alert" : "status"}
          aria-live={feedback.type === "error" ? "assertive" : "polite"}
        >
          <img
            src={feedback.type === "error" ? circleInfoIcon : circleCheckIcon}
            alt=""
            aria-hidden="true"
            className={styles.feedbackIcon}
          />
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {!isAdmin ? (
        <div className={[styles.notice, styles.noticeInfo].join(" ")}>
          <img
            src={circleInfoIcon}
            alt=""
            aria-hidden="true"
            className={styles.noticeIcon}
          />
          <span>
            Vista de solo lectura. La gestión de sucursales requiere permisos de
            administrador.
          </span>
        </div>
      ) : null}

      <section className={styles.kpiGrid} aria-label="Resumen de sucursales">
        {buildKpiCards(safeMetrics).map((card) => (
          <article
            key={card.key}
            className={joinClasses(
              styles.kpiCard,
              styles[`kpiCard${card.tone}`]
            )}
          >
            <span
              className={joinClasses(
                styles.kpiIcon,
                styles[`kpiIcon${card.tone}`]
              )}
              aria-hidden="true"
            >
              <img src={card.icon} alt="" className={styles.kpiIconImage} />
            </span>
            <div className={styles.kpiBody}>
              <span className={styles.kpiValue}>{card.value}</span>
              <span className={styles.kpiLabel}>{card.label}</span>
            </div>
          </article>
        ))}
      </section>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchField}>
            <img
              src={searchIcon}
              alt=""
              aria-hidden="true"
              className={styles.searchIcon}
            />
            <label htmlFor="settings-branches-search" className={styles.srOnly}>
              Buscar sucursales
            </label>
            <input
              id="settings-branches-search"
              type="search"
              className={styles.searchInput}
              placeholder="Buscar por nombre, código, ciudad o estado..."
              title="Buscar por nombre, código, ciudad o estado"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              maxLength={50}
              aria-label="Buscar sucursales por nombre, código, ciudad o estado"
            />
            {searchTerm ? (
              <button
                type="button"
                className={styles.searchClearButton}
                onClick={() => setSearchTerm("")}
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
              >
                <img
                  src={closeIcon}
                  alt=""
                  aria-hidden="true"
                  className={styles.searchClearIcon}
                />
              </button>
            ) : null}
          </div>

          {searchTerm && !loading ? (
            <p className={styles.searchSummary} aria-live="polite">
              {buildSearchSummary(recordsCount, searchTerm)}
            </p>
          ) : null}
        </div>

        <div
          className={styles.segmentedControl}
          role="group"
          aria-label="Filtrar por estatus"
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={joinClasses(
                styles.filterButton,
                statusFilter === option.id ? styles.filterButtonActive : ""
              )}
              aria-pressed={statusFilter === option.id}
              onClick={() => setStatusFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <BranchesTable
        branches={branches}
        loading={loading}
        loadError={loadError}
        isAdmin={isAdmin}
        searchTerm={searchTerm}
        onResetSearch={() => setSearchTerm("")}
        onEdit={openEditModal}
        onToggleStatus={openToggleModal}
      />

      {!loading && !loadError && recordsCount > 0 ? (
        <BranchesPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={pagination?.pageSizeOptions ?? [5, 10, 20, "all"]}
          filteredCount={recordsCount}
          pageStart={pageStart}
          pageEnd={pageEnd}
          loading={loading}
          onPageChange={pagination?.setPage}
          onPageSizeChange={(value) =>
            pagination?.setPageSize(value === "all" ? "all" : Number(value))
          }
        />
      ) : null}

      <BranchFormModal
        key={`branch-form-${formModal.branch?.id || "new"}-${
          formModal.isOpen ? "open" : "closed"
        }`}
        isOpen={formModal.isOpen}
        branch={formModal.branch}
        saving={saving}
        onSubmit={
          formModal.branch
            ? (branchId, values) => handleUpdateBranch(branchId, values)
            : handleCreateBranch
        }
        onClose={closeFormModal}
      />

      <BranchToggleStatusModal
        isOpen={toggleModal.isOpen}
        branch={toggleModal.branch}
        saving={saving}
        onConfirm={handleToggleStatus}
        onClose={closeToggleModal}
      />
    </section>
  );
};

export default SettingsBranches;
