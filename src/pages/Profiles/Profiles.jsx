import { useCallback, useEffect, useState } from 'react';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import UserList from './UserList';
import styles from './Profiles.module.css';
import { supabase } from '../../lib/supabaseClient';
import { useRequestStatus } from '../../hooks/useRequestStatus';

/** Identidad de la carga unica de usuarios, usada para derivar el indicador. */
const PROFILES_USERS_REQUEST = 'profiles:users';

/**
 * Consulta los usuarios visibles para el usuario actual.
 *
 * Vive fuera del componente porque no escribe estado: asi el efecto que la
 * dispara puede limitarse a pedir los datos y aplicar el resultado en la
 * continuacion asincrona, sin un setState sincrono que provoque un render en
 * cascada. El primer `select` pide el rol; si la vista `roles` no esta expuesta
 * para el rol actual se reintenta sin ella.
 */
const fetchProfilesUsers = async () => {
  const candidates = [
    'id, username, email, status, created_at, roles ( name )',
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

  return Array.isArray(data) ? data.map(normalizeUserRow) : [];
};

const normalizeRoleName = (rolesValue) => {
  if (Array.isArray(rolesValue)) {
    return rolesValue[0]?.name || null;
  }
  return rolesValue?.name || null;
};

const normalizeUserRow = (row) => {
  const roleName = normalizeRoleName(row?.roles);
  const username = (row?.username || row?.email || 'SIN USUARIO').toString().trim();

  return {
    id: row?.id || username,
    username,
    email: row?.email || 'SIN CORREO',
    status: typeof row?.status === 'boolean' ? row.status : null,
    roleName: roleName || 'SIN ROL',
    createdAt: row?.created_at || null,
  };
};

const Profiles = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  // Cada recarga es una peticion distinta, y el indicador se deriva de su clave en
  // lugar de marcarse con setLoading(true) dentro del efecto, que provocaba un
  // re-render en cascada en el primer render.
  const [reloadCount, setReloadCount] = useState(0);
  const requestKey = `${PROFILES_USERS_REQUEST}|${reloadCount}`;
  const { isLoading: loading, isStale, markSettled } = useRequestStatus(requestKey);
  const visibleError = isStale ? '' : error;

  const reloadUsers = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchProfilesUsers()
      .then((normalizedUsers) => {
        if (cancelled) return;
        setUsers(normalizedUsers);
        setError('');
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error('Error al cargar usuarios desde Supabase:', loadError);
        setUsers([]);
        setError('No se pudieron cargar los usuarios desde la base de datos.');
      })
      .finally(() => {
        if (cancelled) return;
        markSettled();
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, markSettled]);

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
            error={visibleError}
            onReload={reloadUsers}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profiles;
