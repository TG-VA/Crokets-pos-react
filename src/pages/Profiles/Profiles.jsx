import React, { useEffect, useState } from "react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import UserList from "./UserList";
import styles from "./Profiles.module.css";
import { supabase } from "../../lib/supabaseClient";

const Profiles = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const candidates = [
        "id, username, email, status, created_at, role_id, roles ( id, name )",
        "id, username, email, status, created_at, role_id, roles ( name )",
        "id, username, email, status, created_at",
      ];

      let data = null;
      let lastError = null;

      for (const selectClause of candidates) {
        const result = await supabase
          .from("users")
          .select(selectClause)
          .order("created_at", { ascending: false });

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

      setUsers(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error("Error al cargar usuarios desde Supabase:", loadError);
      setUsers([]);
      setError("No se pudieron cargar los usuarios desde la base de datos.");
    } finally {
      setLoading(false);
    }
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
            onReload={loadUsers}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profiles;
