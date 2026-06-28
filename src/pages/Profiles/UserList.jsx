import styles from './UserList.module.css';

const UserList = ({ users, loading, error, onReload }) => {
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha no válida';
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
            {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button className={styles.createButton} onClick={onReload}>
          Recargar
        </button>
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      {users.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👤</div>
          <h3>No hay usuarios registrados</h3>
          <p>No se encontraron registros en la tabla `users`.</p>
        </div>
      ) : (
        <div className={styles.userTable}>
          <div className={styles.tableHeader}>
            <div className={styles.headerCell}>Usuario</div>
            <div className={styles.headerCell}>Correo</div>
            <div className={styles.headerCell}>Rol / Estado</div>
            <div className={styles.headerCell}>Fecha de Creación</div>
          </div>
          
          <div className={styles.tableBody}>
            {users.map((user) => (
              <div key={user.id} className={styles.tableRow}>
                <div className={styles.userInfo}>
                  <div className={styles.userAvatar}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.userDetails}>
                    <span className={styles.userName}>{user.username}</span>
                    <span className={styles.userId}>ID: {user.id}</span>
                  </div>
                </div>
                
                <div className={styles.emailCell}>
                  {user.email || 'SIN CORREO'}
                </div>
                
                <div className={styles.metaCell}>
                  <span className={styles.permissionTag}>{user.roleName || 'SIN ROL'}</span>
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
                      ? 'ACTIVO'
                      : user.status === false
                        ? 'INACTIVO'
                        : 'SIN ESTADO'}
                  </span>
                </div>
                
                <div className={styles.dateCell}>
                  {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
