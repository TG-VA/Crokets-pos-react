import { useCallback, useEffect, useState } from "react";
import UserList from "./UserList";
import styles from "./Profiles.module.css";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { fetchProfilesUsers } from "./services/profilesUsersService";
import { useRequestStatus } from "../../hooks/useRequestStatus";

/** Identidad de la carga unica de usuarios, usada para derivar el indicador. */
const PROFILES_USERS_REQUEST = "profiles:users";

const Profiles = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  // Cada recarga es una peticion distinta, y el indicador se deriva de su clave en
  // lugar de marcarse con setLoading(true) dentro del efecto, que provocaba un
  // re-render en cascada en el primer render.
  const [reloadCount, setReloadCount] = useState(0);
  const requestKey = `${PROFILES_USERS_REQUEST}|${reloadCount}`;
  const {
    isLoading: loading,
    isStale,
    markSettled,
  } = useRequestStatus(requestKey);
  const visibleError = isStale ? "" : error;

  const reloadUsers = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchProfilesUsers()
      .then((normalizedUsers) => {
        if (cancelled) return;
        setUsers(normalizedUsers);
        setError("");
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error("Error al cargar usuarios desde Supabase:", loadError);
        setUsers([]);
        setError("No se pudieron cargar los usuarios desde la base de datos.");
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
