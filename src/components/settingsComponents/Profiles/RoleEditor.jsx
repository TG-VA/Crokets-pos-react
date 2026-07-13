import { useEffect, useMemo, useState } from 'react';
import styles from './RoleEditor.module.css';

const RoleEditor = ({ user, roles, onSave, onClose }) => {
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setSelectedRoleId(user.roleId ? String(user.roleId) : '');
    setSaving(false);
    setError('');
  }, [user]);

  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === String(selectedRoleId)) || null,
    [roles, selectedRoleId]
  );

  if (!user) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (!selectedRoleId) {
        setError('Debes seleccionar un rol antes de guardar.');
        setSaving(false);
        return;
      }

      await onSave(user.id, selectedRoleId);
      onClose();
    } catch (saveError) {
      console.error('No se pudo actualizar el rol del usuario:', saveError);
      setError('No se pudo actualizar el rol del usuario en Supabase.');
      setSaving(false);
    }
  };

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />

      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>GESTION DE ROL</span>
            <h2>Rol de {user.username}</h2>
            <p>
              Cambia el rol del usuario para actualizar su nivel de acceso dentro
              del sistema.
            </p>
          </div>

          <button type="button" className={styles.closeButton} onClick={onClose}>
            Cerrar
          </button>
        </header>

        <div className={styles.summary}>
          <div className={styles.summaryCard}>
            <span>Rol actual</span>
            <strong>{user.roleName || 'SIN ROL'}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Estado</span>
            <strong>
              {user.status === true
                ? 'ACTIVO'
                : user.status === false
                  ? 'INACTIVO'
                  : 'SIN ESTADO'}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Roles disponibles</span>
            <strong>{roles.length}</strong>
          </div>
        </div>

        {error ? <div className={styles.errorBanner}>{error}</div> : null}

        <div className={styles.rolesList}>
          {roles.map((role) => {
            const checked = String(role.id) === String(selectedRoleId);
            return (
              <label
                key={role.id}
                className={`${styles.roleCard} ${checked ? styles.roleCardActive : ''}`}
              >
                <input
                  type="radio"
                  name="user-role"
                  checked={checked}
                  onChange={() => setSelectedRoleId(String(role.id))}
                />

                <div className={styles.roleInfo}>
                  <strong>{String(role.name || '').toUpperCase()}</strong>
                  <span>{role.description}</span>
                </div>
              </label>
            );
          })}
        </div>

        <div className={styles.preview}>
          <span>Vista previa</span>
          <strong>{selectedRole ? String(selectedRole.name || '').toUpperCase() : 'SIN ROL'}</strong>
          <p>
            {selectedRole?.description ||
              'Selecciona un rol para definir el acceso operativo del usuario.'}
          </p>
        </div>

        <footer className={styles.actions}>
          <button type="button" className={styles.ghostButton} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar rol'}
          </button>
        </footer>
      </section>
    </>
  );
};

export default RoleEditor;
