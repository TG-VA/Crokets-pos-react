import styles from "../SettingsBranches.module.css";
import pencilIcon from "../../../../../assets/icons/pencil-solid-full.svg";
import checkIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import warningIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";
import { getBranchStatusLabel } from "../utils/branchesFormatters";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const BranchesTable = ({
  branches,
  loading,
  loadError,
  isAdmin,
  onEdit,
  onToggleStatus,
}) => {
  if (loading) {
    return (
      <div className={styles.tableCard}>
        <p className={styles.loadingState} role="status">
          Cargando sucursales...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.tableCard}>
        <p className={styles.errorState} role="alert">
          {loadError}
        </p>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className={styles.tableCard}>
        <p className={styles.emptyState}>
          No se encontraron sucursales con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Nombre</th>
            <th scope="col">Ubicación</th>
            <th scope="col">Estatus</th>
            <th scope="col">Terminales</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((branch) => (
            <tr key={branch.id}>
              <td>{branch.code}</td>
              <td>{branch.name}</td>
              <td>
                {branch.city}
                {branch.state ? `, ${branch.state}` : ""}
              </td>
              <td>
                <span
                  className={joinClasses(
                    styles.statusBadge,
                    branch.isActive
                      ? styles.statusBadgeActive
                      : styles.statusBadgeInactive
                  )}
                >
                  {getBranchStatusLabel(branch.isActive)}
                </span>
              </td>
              <td>{branch.posDevicesCount}</td>
              <td>
                <div className={styles.actionsCell}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={`Editar ${branch.name}`}
                    onClick={() => onEdit(branch)}
                    disabled={!isAdmin}
                  >
                    <img
                      src={pencilIcon}
                      alt=""
                      aria-hidden="true"
                      className={styles.actionIcon}
                    />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={
                      branch.isActive
                        ? `Desactivar ${branch.name}`
                        : `Reactivar ${branch.name}`
                    }
                    onClick={() => onToggleStatus(branch)}
                    disabled={!isAdmin}
                  >
                    <img
                      src={branch.isActive ? warningIcon : checkIcon}
                      alt=""
                      aria-hidden="true"
                      className={styles.actionIcon}
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BranchesTable;
