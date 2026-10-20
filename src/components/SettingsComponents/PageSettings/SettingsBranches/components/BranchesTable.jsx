import styles from "../SettingsBranches.module.css";
import pencilIcon from "../../../../../assets/icons/pencil-solid-full.svg";
import checkIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import lockIcon from "../../../../../assets/icons/lock-solid-full.svg";
import displayIcon from "../../../../../assets/icons/display-solid-full.svg";
import searchIcon from "../../../../../assets/icons/searchIcon.svg";
import { getBranchStatusLabel } from "../utils/branchesFormatters";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const getTerminalLabel = (count) =>
  count === 1 ? "1 terminal" : `${count} terminales`;

const BranchesTable = ({
  branches,
  loading,
  loadError,
  isAdmin,
  searchTerm,
  onResetSearch,
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
        <div className={styles.emptyState}>
          <img
            src={searchIcon}
            alt=""
            aria-hidden="true"
            className={styles.emptyStateIcon}
          />
          <p className={styles.emptyStateText}>
            No se encontraron sucursales coincidentes con tu búsqueda.
          </p>
          {searchTerm ? (
            <button
              type="button"
              className={styles.emptyStateAction}
              onClick={onResetSearch}
            >
              Restablecer búsqueda
            </button>
          ) : null}
        </div>
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
              <td>
                <span className={styles.codeChip}>{branch.code}</span>
              </td>
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
              <td>
                <span className={styles.terminalCount}>
                  <img
                    src={displayIcon}
                    alt=""
                    aria-hidden="true"
                    className={styles.terminalIcon}
                  />
                  {getTerminalLabel(branch.posDevicesCount || 0)}
                </span>
              </td>
              <td>
                <div className={styles.actionsCell}>
                  <button
                    type="button"
                    className={joinClasses(
                      styles.iconButton,
                      styles.iconButtonEdit
                    )}
                    aria-label={`Editar ${branch.name}`}
                    title={`Editar ${branch.name}`}
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
                    className={joinClasses(
                      styles.iconButton,
                      branch.isActive
                        ? styles.iconButtonDanger
                        : styles.iconButtonSuccess
                    )}
                    aria-label={
                      branch.isActive
                        ? `Desactivar ${branch.name}`
                        : `Reactivar ${branch.name}`
                    }
                    title={
                      branch.isActive
                        ? `Desactivar ${branch.name}`
                        : `Reactivar ${branch.name}`
                    }
                    onClick={() => onToggleStatus(branch)}
                    disabled={!isAdmin}
                  >
                    <img
                      src={branch.isActive ? lockIcon : checkIcon}
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
