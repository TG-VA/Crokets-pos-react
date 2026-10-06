import { useCallback, useEffect, useState } from "react";
import UserList from "../../../../pages/Profiles/UserList";
import { fetchProfilesUsers } from "../../../../pages/Profiles/services/profilesUsersService";
import { useRequestStatus } from "../../../../hooks/useRequestStatus";
import shared from "../PageSettings.module.css";

const SETTINGS_USERS_REQUEST = "settings:users";

const SettingsUsers = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const [reloadCount, setReloadCount] = useState(0);
  const requestKey = `${SETTINGS_USERS_REQUEST}|${reloadCount}`;
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
    <section className={shared.page} aria-labelledby="settings-users-title">
      <header className={shared.pageHeader}>
        <h1 id="settings-users-title" className={shared.pageTitle}>
          Usuarios y Permisos
        </h1>
        <p className={shared.pageSubtitle}>
          Usuarios registrados en Supabase y su rol vigente
        </p>
      </header>

      <UserList
        users={users}
        loading={loading}
        error={visibleError}
        onReload={reloadUsers}
      />
    </section>
  );
};

export default SettingsUsers;
