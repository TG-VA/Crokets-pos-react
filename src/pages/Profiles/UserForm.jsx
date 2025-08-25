import React, { useState, useEffect } from 'react';
import styles from './UserForm.module.css';

const UserForm = ({ user, availablePermissions, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    permissions: []
  });
  const [errors, setErrors] = useState({});

  // Cargar datos del usuario si estamos editando
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        password: '', // No mostrar contraseña existente
        confirmPassword: '',
        permissions: user.permissions || []
      });
    } else {
      setFormData({
        name: '',
        username: '',
        password: '',
        confirmPassword: '',
        permissions: []
      });
    }
    setErrors({});
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePermissionChange = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar nombre
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    // Validar username
    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      newErrors.username = 'El nombre de usuario solo puede contener letras, números y guiones bajos';
    }

    // Validar contraseña solo si estamos creando un usuario o si se ingresó una nueva contraseña
    if (!user || formData.password) {
      if (!formData.password) {
        newErrors.password = 'La contraseña es requerida';
      } else if (formData.password.length < 6) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    // Validar permisos
    if (formData.permissions.length === 0) {
      newErrors.permissions = 'Debe seleccionar al menos un permiso';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const userData = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        permissions: formData.permissions
      };

      // Solo incluir contraseña si se proporcionó una nueva
      if (formData.password) {
        userData.password = formData.password;
      }

      onSubmit(userData);
    }
  };

  return (
    <>
      <div className={styles.modalBackdrop} onClick={onCancel} />
      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <h2>{user ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
          <button 
            type="button" 
            className={styles.closeButton}
            onClick={onCancel}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.userForm}>
          <div className={styles.leftColumn}>
            {/* Datos básicos */}
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>
                Nombre Completo *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                placeholder="Ingrese el nombre completo del usuario"
              />
              {errors.name && <span className={styles.errorText}>{errors.name}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="username" className={styles.label}>
                Nombre de Usuario (Login) *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
                placeholder="Nombre para iniciar sesión"
              />
              {errors.username && <span className={styles.errorText}>{errors.username}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                {user ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                placeholder={user ? "Dejar vacío para mantener la actual" : "Mínimo 6 caracteres"}
              />
              {errors.password && <span className={styles.errorText}>{errors.password}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                {user ? 'Confirmar Nueva Contraseña' : 'Confirmar Contraseña *'}
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                placeholder="Confirme la contraseña"
              />
              {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
            </div>
          </div>

          <div className={styles.rightColumn}>
            {/* Sección de Permisos */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Permisos del Usuario *
              </label>
              <div className={styles.permissionsContainer}>
                {availablePermissions.map(permission => (
                  <div key={permission.id} className={styles.permissionItem}>
                    <label className={styles.checkboxWrapper}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={formData.permissions.includes(permission.id)}
                        onChange={() => handlePermissionChange(permission.id)}
                      />
                      <div className={styles.permissionInfo}>
                        <span className={styles.permissionLabel}>{permission.label}</span>
                        <span className={styles.permissionDescription}>
                          {permission.description}
                        </span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              {errors.permissions && <span className={styles.errorText}>{errors.permissions}</span>}
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitButton}>
              {user ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default UserForm;