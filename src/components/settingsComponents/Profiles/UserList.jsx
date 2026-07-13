import { useMemo, useState } from 'react';
import styles from './UserList.module.css';
import RoleEditor from './RoleEditor';

const UserList = ({
  users,
  loading,
  error,
  onReload,
  roles,
  onSaveRole,
}) => {
  const [selectedUser, setSelectedUser] = useState(null);

  const availableRolesCount = useMemo(
    () => roles?.length || 0,
    [roles]
  );

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
          <span className={styles.permissionsHint}>
            {availableRolesCount} roles disponibles para gestion
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
            <div className={styles.headerCell}>Acceso por rol</div>
            <div className={styles.headerCell}>Fecha de Creación</div>
            <div className={styles.headerCell}>Acciones</div>
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

                <div className={styles.permissionsCell}>
                  <div className={styles.permissionsList}>
                    {(user.effectivePermissions || []).map((permission) => (
                      <span key={`${user.id}-${permission}`} className={styles.permissionChip}>
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className={styles.dateCell}>
                  {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                </div>

                <div className={styles.actionsCell}>
                  <button
                    type="button"
                    className={styles.manageButton}
                    onClick={() => setSelectedUser(user)}
                  >
                    Cambiar rol
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <RoleEditor
        user={selectedUser}
        roles={roles}
        onSave={onSaveRole}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
};

export default UserList;
