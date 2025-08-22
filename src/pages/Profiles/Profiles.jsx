import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import UserForm from './UserForm';
import UserList from './UserList';
import styles from './Profiles.module.css';

const Profiles = () => {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lista de permisos disponibles
  const availablePermissions = [
    { id: 'ventas', label: 'Ventas', description: 'Acceso al módulo de ventas y caja registradora' },
    { id: 'productos', label: 'Productos', description: 'Gestión de productos y catálogo' },
    { id: 'inventario', label: 'Inventario', description: 'Control de inventario y stock' },
    { id: 'facturas', label: 'Facturas', description: 'Generación y gestión de facturas' },
    { id: 'corte', label: 'Corte de Caja', description: 'Realizar cortes de caja y cierre de turno' },
    { id: 'reportes', label: 'Reportes', description: 'Visualización de reportes y estadísticas' },
    { id: 'configuracion', label: 'Configuración', description: 'Acceso completo a configuración del sistema' }
  ];

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/users');
      
      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData);
      } else {
        console.error('Error al cargar usuarios');
        alert('Error al cargar la lista de usuarios.');
        setUsers([]); // Limpiar usuarios en caso de error
      }
    } catch (error) {
      console.error('Error al conectar con el servidor:', error);
      alert('No se pudo conectar con el servidor. Verifique que esté encendido.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setUsers(users.filter(user => user.id !== userId));
          alert('Usuario eliminado exitosamente');
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Error al eliminar usuario');
        }
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
        alert('Error de conexión. No se pudo eliminar el usuario.');
      }
    }
  };

  const handleFormSubmit = async (userData) => {
    try {
      if (editingUser) {
        // Actualizar usuario existente
        const response = await fetch(`http://localhost:3000/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        });

        if (response.ok) {
          const updatedUser = await response.json();
          setUsers(users.map(user => user.id === editingUser.id ? updatedUser : user));
          alert('Usuario actualizado exitosamente');
          setShowForm(false);
          setEditingUser(null);
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Error al actualizar usuario');
          return; // No cerrar el formulario si hay error
        }
      } else {
        // Crear nuevo usuario
        const response = await fetch('http://localhost:3000/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        });

        if (response.ok) {
          const newUser = await response.json();
          setUsers([newUser, ...users]); // Agregar al inicio
          alert('Usuario creado exitosamente');
          setShowForm(false);
          setEditingUser(null);
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Error al crear usuario');
          return; // No cerrar el formulario si hay error
        }
      }
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      alert('Error de conexión. No se pudo guardar el usuario.');
      return; // No cerrar el formulario si hay error
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  return (
    <div className={styles.container}>
      <Navbar />
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1>GESTIÓN DE PERFILES</h1>
          <p>Administrar usuarios y permisos del sistema</p>
        </div>

        <div className={styles.content}>
          {showForm ? (
            <UserForm
              user={editingUser}
              availablePermissions={availablePermissions}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          ) : (
            <UserList
              users={users}
              availablePermissions={availablePermissions}
              loading={loading}
              onCreateUser={handleCreateUser}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profiles;
