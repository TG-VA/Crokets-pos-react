import styles from "./UserList.module.css";
import userIcon from "../../assets/icons/user-solid.svg";

const UserList = ({ users, loading, error, onReload }) => {
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Fecha no válida";
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className={styles.listContainer}>
      <div className={styles.listHeader}>
        <div className={styles.listTitle}>
          <h2>Usuarios de Supabase</h2>
          <span className={styles.userCount}>
            {users.length} usuario{users.length !== 1 ? "s" : ""} registrado
            {users.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          type="button"
          className={styles.createButton}
          onClick={onReload}
        >
          Recargar
        </button>
      </div>

      {error ? (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      ) : null}

      {users.length === 0 ? (
        <div className={styles.emptyState}>
          <img src={userIcon} alt="" className={styles.emptyIcon} />
          <h3>No hay usuarios registrados</h3>
          <p>No se encontraron registros en la tabla `users`.</p>
        </div>
      ) : (
        <table className={styles.userTable}>
          <caption className={styles.tableCaption}>
            Listado de usuarios registrados con su rol y estado
          </caption>
          <thead>
            <tr className={styles.tableHeader}>
              <th className={styles.headerCell} scope="col">
                Usuario
              </th>
              <th className={styles.headerCell} scope="col">
                Correo
              </th>
              <th className={styles.headerCell} scope="col">
                Rol / Estado
              </th>
              <th className={styles.headerCell} scope="col">
                Fecha de Creación
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={styles.tableRow}>
                <td>
                  <div className={styles.userInfo}>
                    <div className={styles.userAvatar}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userDetails}>
                      <span className={styles.userName}>{user.username}</span>
                      <span className={styles.userId}>ID: {user.id}</span>
                    </div>
                  </div>
                </td>

                <td>
                  <div className={styles.emailCell}>
                    {user.email || "SIN CORREO"}
                  </div>
                </td>

                <td>
                  <div className={styles.metaCell}>
                    <span className={styles.permissionTag}>
                      {user.roleName || "SIN ROL"}
                    </span>
                    <span
                      className={`${styles.statusBadge} ${
                        user.status === true
                          ? styles.statusActive
                          : user.status === false
                            ? styles.statusInactive
                            : styles.statusUnknown
                      }`}
                    >
                      {user.status === true
                        ? "ACTIVO"
                        : user.status === false
                          ? "INACTIVO"
                          : "SIN ESTADO"}
                    </span>
                  </div>
                </td>

                <td>
                  <div className={styles.dateCell}>
                    {user.createdAt ? formatDate(user.createdAt) : "N/A"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserList;
