import styles from "./DeviceActivationModal.module.css";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useDeviceActivation } from "./hooks/useDeviceActivation";

import displayIcon from "../../assets/icons/display-solid-full.svg";
import warningIcon from "../../assets/icons/triangle-exclamation-solid-full.svg";
import successIcon from "../../assets/icons/circle-check-solid-full.svg";
import xmarkIcon from "../../assets/icons/xmark-solid-full.svg";

const DeviceActivationModal = ({
  isOpen,
  deviceCode,
  onClose,
  onActivated,
}) => {
  const {
    step,
    username,
    setUsername,
    password,
    setPassword,
    selectedBranchId,
    setSelectedBranchId,
    branches,
    loading,
    error,
    activatedBranch,
    submit,
    confirmActivation,
  } = useDeviceActivation({ isOpen, deviceCode, onActivated });

  const handleClose = () => {
    if (loading) return;
    onClose?.();
  };

  useEscapeKey(handleClose, isOpen && !loading);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    submit();
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Activación de Punto de Venta"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Activación de Punto de Venta</h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={loading}
            aria-label="Cerrar"
          >
            <img src={xmarkIcon} alt="" />
          </button>
        </div>

        <div className={styles.deviceBox}>
          <img src={displayIcon} alt="" className={styles.deviceIcon} />

          <div className={styles.deviceInfo}>
            <span className={styles.deviceLabel}>Código de este equipo</span>
            <span className={styles.deviceCode}>{deviceCode}</span>
          </div>
        </div>

        {step === 2 && activatedBranch ? (
          <div className={styles.successBox} role="status">
            <img src={successIcon} alt="" className={styles.successIcon} />

            <div className={styles.successTitle}>Equipo vinculado</div>

            <div className={styles.successText}>
              Este punto de venta quedó asignado a {activatedBranch.name}. Ya
              puedes ingresar con tu usuario.
            </div>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={confirmActivation}
            >
              Continuar
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.fieldGroup}>
              <label htmlFor="activation-username">Usuario Administrador</label>
              <input
                id="activation-username"
                type="text"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value.trimStart())}
                disabled={loading}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="activation-password">
                Contraseña Administrador
              </label>
              <input
                id="activation-password"
                type="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="activation-branch">Sucursal</label>
              <select
                id="activation-branch"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={loading || branches.length === 0}
              >
                {branches.length === 0 ? (
                  <option value="">
                    {loading
                      ? "Cargando sucursales..."
                      : "No hay sucursales disponibles"}
                  </option>
                ) : (
                  branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {error && (
              <div className={styles.errorBanner} role="alert">
                <img src={warningIcon} alt="" className={styles.errorIcon} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={loading || branches.length === 0}
            >
              {loading ? "Vinculando..." : "Vincular y Activar Equipo"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default DeviceActivationModal;
