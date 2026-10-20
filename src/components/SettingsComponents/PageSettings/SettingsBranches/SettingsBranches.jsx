import { useEffect } from "react";

import styles from "./SettingsBranches.module.css";
import useSettingsBranches, {
  BRANCH_STATUS_FILTERS,
} from "./hooks/useSettingsBranches";
import BranchesTable from "./components/BranchesTable";
import BranchFormModal from "./components/BranchFormModal";
import BranchToggleStatusModal from "./components/BranchToggleStatusModal";
import plusIcon from "../../../../assets/icons/plus-solid-full.svg";
import circleCheckIcon from "../../../../assets/icons/circle-check-solid-full.svg";
import circleInfoIcon from "../../../../assets/icons/circle-info-solid-full.svg";

const FEEDBACK_TIMEOUT = 5000;

const STATUS_FILTER_OPTIONS = [
  { id: BRANCH_STATUS_FILTERS.ALL, label: "Todas" },
  { id: BRANCH_STATUS_FILTERS.ACTIVE, label: "Activas" },
  { id: BRANCH_STATUS_FILTERS.INACTIVE, label: "Inactivas" },
];

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const SettingsBranches = () => {
  const {
    branches,
    totalBranches,
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

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Buscar por nombre o código..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          aria-label="Buscar sucursales por nombre o código"
        />
        <div
          className={styles.filterGroup}
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

      <p className={styles.pageSubtitle}>
        {loading
          ? "Cargando..."
          : `${branches.length} de ${totalBranches} sucursal(es)`}
      </p>

      <BranchesTable
        branches={branches}
        loading={loading}
        loadError={loadError}
        isAdmin={isAdmin}
        onEdit={openEditModal}
        onToggleStatus={openToggleModal}
      />

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
