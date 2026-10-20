import { useEffect } from "react";

import styles from "../SettingsBranches.module.css";
import warningIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";
import checkIcon from "../../../../../assets/icons/circle-check-solid-full.svg";

const BranchToggleStatusModal = ({
  isOpen,
  branch,
  saving,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen || !branch) return null;

  const isDeactivating = branch.isActive;
  const actionLabel = isDeactivating ? "Desactivar" : "Reactivar";

  const handleOverlayMouseDown = (event) => {
    if (event.target === event.currentTarget && !saving) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm(branch, !branch.isActive);
  };

  return (
    <div className={styles.modalOverlay} onMouseDown={handleOverlayMouseDown}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-branches-toggle-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="settings-branches-toggle-title" className={styles.modalTitle}>
            {actionLabel} sucursal
          </h2>
          <p className={styles.modalSubtitle}>
            {branch.name} ({branch.code})
          </p>
        </div>

        <div className={styles.modalBody}>
          <div
            className={[
              styles.notice,
              isDeactivating ? styles.noticeDanger : styles.noticeInfo,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <img
              src={isDeactivating ? warningIcon : checkIcon}
              alt=""
              aria-hidden="true"
              className={styles.noticeIcon}
            />
            <span>
              {isDeactivating
                ? "Al desactivar la sucursal dejará de ofrecerse en operaciones nuevas (login, traspasos, selector de sucursal). Su historial de ventas, cajas e inventario se conserva íntegro y no se elimina ningún registro."
                : "Al reactivar la sucursal volverá a estar disponible en las operaciones nuevas del sistema."}
            </span>
          </div>

          {isDeactivating && branch.posDevicesCount > 0 ? (
            <div className={[styles.notice, styles.noticeInfo].join(" ")}>
              <img
                src={warningIcon}
                alt=""
                aria-hidden="true"
                className={styles.noticeIcon}
              />
              <span>
                Hay {branch.posDevicesCount} terminal(es) POS vinculada(s) a
                esta sucursal. Esas terminales dejarán de resolver sucursal
                hasta que se reasignen.
              </span>
            </div>
          ) : null}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.modalPrimaryButton}
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Guardando..." : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchToggleStatusModal;
