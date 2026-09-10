import { useEffect, useState } from 'react';
import Navbar from '../../Navbar/Navbar';
import Footer from '../../Footer/Footer';
import UserList from './UserList';
import styles from './Profiles.module.css';
import { supabase } from '../../../lib/supabaseClient';

const BASE_ACCESS_LABELS = [
  'VENTAS',
  'PRODUCTOS',
  'INVENTARIO',
  'FACTURAS',
  'CLIENTES',
  'CORTE',
  'REPORTES',
];

const ADMIN_EXTRA_ACCESS_LABELS = [
  'PERFILES',
  'PRODUCTOS AVANZADOS',
  'CFDI',
  'AJUSTE DE PUNTOS',
  'CONFIG. RECOMPENSAS',
];

const normalizeRoleName = (rolesValue) => {
  if (Array.isArray(rolesValue)) {
    return rolesValue[0]?.name || null;
  }
  return rolesValue?.name || null;
};

const getRoleAccessSummary = (status, roleName) => {
  if (status === false) {
    return ['SIN ACCESO'];
  }

  const normalizedRole = String(roleName || '').trim().toLowerCase();

  if (normalizedRole === 'admin') {
    return [...BASE_ACCESS_LABELS, ...ADMIN_EXTRA_ACCESS_LABELS];
  }

  return BASE_ACCESS_LABELS;
};

const normalizeUserRow = (row) => {
  const roleName = normalizeRoleName(row?.roles);
  const username = (row?.username || row?.email || 'SIN USUARIO').toString().trim();
  const status = typeof row?.status === 'boolean' ? row.status : null;

  return {
    id: row?.id || username,
    username,
    email: row?.email || 'SIN CORREO',
    roleId: row?.role_id || null,
    status,
    roleName: roleName || 'SIN ROL',
    effectivePermissions: getRoleAccessSummary(status, roleName),
    createdAt: row?.created_at || null,
  };
};

const Profiles = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const candidates = [
        'id, username, email, status, created_at, role_id, roles ( id, name )',
        'id, username, email, status, created_at, role_id, roles ( name )',
        'id, username, email, status, created_at',
      ];

      let data = null;
      let lastError = null;

      for (const selectClause of candidates) {
        const result = await supabase
          .from('users')
          .select(selectClause)
          .order('created_at', { ascending: false });

        if (!result.error) {
          data = result.data;
          lastError = null;
          break;
        }

        lastError = result.error;
      }

      if (lastError) {
        throw lastError;
      }

      const normalizedUsers = Array.isArray(data)
        ? data.map(normalizeUserRow)
        : [];

      setUsers(normalizedUsers);

      const roleCandidates = ['id, name', 'id, name, description'];
      let roleRows = [];
      let roleError = null;

      for (const selectClause of roleCandidates) {
        const result = await supabase
          .from('roles')
          .select(selectClause)
          .order('name', { ascending: true });

        if (!result.error) {
          roleRows = Array.isArray(result.data) ? result.data : [];
          roleError = null;
          break;
        }

        roleError = result.error;
      }

      if (roleError) {
        throw roleError;
      }

      setRoles(
        roleRows.map((role) => ({
          id: role.id,
          name: role.name || 'SIN NOMBRE',
          description:
            role.description ||
            (String(role.name || '').toLowerCase() === 'admin'
              ? 'Control total del sistema y configuracion avanzada.'
              : 'Acceso operativo general para el punto de venta.'),
        }))
      );
    } catch (loadError) {
      console.error('Error al cargar usuarios desde Supabase:', loadError);
      setUsers([]);
      setRoles([]);
      setError('No se pudieron cargar los usuarios desde la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, roleId) => {
    const { error: updateError } = await supabase
      .from('users')
      .update({ role_id: roleId })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    const selectedRole = roles.find((role) => String(role.id) === String(roleId));

    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId
          ? normalizeUserRow({
              ...user,
              role_id: roleId,
              roles: { id: roleId, name: selectedRole?.name || user.roleName },
            })
          : user
      )
    );
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
          <UserList
            users={users}
            loading={loading}
            error={error}
            roles={roles}
            onReload={loadUsers}
            onSaveRole={updateUserRole}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profiles;
