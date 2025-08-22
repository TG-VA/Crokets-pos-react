import React from 'react';
import styles from './Profiles.module.css';

const UserList = ({ users, availablePermissions, loading, onCreateUser, onEditUser, onDeleteUser }) => {
  
  const getPermissionLabel = (permissionId) => {
    const permission = availablePermissions.find(p => p.id === permissionId);
    return permission ? permission.label : permissionId;
  };

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
          <h2>Usuarios del Sistema</h2>
          <span className={styles.userCount}>
            {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button 
          className={styles.createButton}
          onClick={onCreateUser}
        >
          <span className={styles.buttonIcon}>+</span>
          Crear Usuario
        </button>
      </div>

      {users.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👤</div>
          <h3>No hay usuarios registrados</h3>
          <p>Comience creando el primer usuario del sistema</p>
          <button 
            className={styles.createButton}
            onClick={onCreateUser}
          >
            <span className={styles.buttonIcon}>+</span>
            Crear Primer Usuario
          </button>
        </div>
      ) : (
        <div className={styles.userTable}>
          <div className={styles.tableHeader}>
            <div className={styles.headerCell}>Usuario</div>
            <div className={styles.headerCell}>Permisos</div>
            <div className={styles.headerCell}>Fecha de Creación</div>
            <div className={styles.headerCell}>Acciones</div>
          </div>
          
          <div className={styles.tableBody}>
            {users.map((user) => (
              <div key={user.id} className={styles.tableRow}>
                <div className={styles.userInfo}>
                  <div className={styles.userAvatar}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.userDetails}>
                    <span className={styles.userName}>{user.name}</span>
                    <span className={styles.userId}>ID: {user.id}</span>
                  </div>
                </div>
                
                <div className={styles.permissionsCell}>
                  <div className={styles.permissionsList}>
                    {user.permissions.length > 0 ? (
                      user.permissions.slice(0, 3).map((permissionId, index) => (
                        <span key={permissionId} className={styles.permissionTag}>
                          {getPermissionLabel(permissionId)}
                        </span>
                      ))
                    ) : (
                      <span className={styles.noPermissions}>Sin permisos</span>
                    )}
                    {user.permissions.length > 3 && (
                      <span className={styles.morePermissions}>
                        +{user.permissions.length - 3} más
                      </span>
                    )}
                  </div>
                </div>
                
                <div className={styles.dateCell}>
                  {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                </div>
                
                <div className={styles.actionsCell}>
                  <button
                    className={styles.editButton}
                    onClick={() => onEditUser(user)}
                    title="Editar usuario"
                  >
                    ✏️
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => onDeleteUser(user.id)}
                    title="Eliminar usuario"
                  >
                    🗑️
                  </button>
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
