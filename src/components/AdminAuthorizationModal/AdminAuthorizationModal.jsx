import React, { useState } from "react";
import styles from "./AdminAuthorizationModal.module.css";
import { authorizeAdminAction } from "../../lib/adminAuthorizationService";
import { useEscapeKey } from "../../hooks/useEscapeKey";

const AdminAuthorizationModal = ({
  isOpen,
  onClose,
  onAuthorized,
  action,
  title = "Autorización requerida",
  message = "Esta acción requiere autorización de un administrador.",
  targetId = null,
  branchId = null,
  requireReason = false,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setReason("");
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose?.();
  };

  useEscapeKey(handleClose, isOpen && !loading);

  if (!isOpen) return null;

  const handleAuthorize = async (e) => {
    e.preventDefault();

    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setError("Ingresa el usuario administrador.");
      return;
    }

    if (!password.trim()) {
      setError("Ingresa la contraseña.");
      return;
    }

    if (requireReason && !reason.trim()) {
      setError("Ingresa el motivo de la autorización.");
      return;
    }

    try {
      setLoading(true);

      const result = await authorizeAdminAction({
        username: cleanUsername,
        password,
        action,
        targetId,
        branchId,
        reason: reason.trim() || null,
      });

      if (!result.ok) {
        setError(result.message || "No se pudo autorizar la acción.");
        return;
      }

      resetForm();

      onAuthorized?.({
        authorizedBy: result.authorizedBy,
        authorizedByUsername: result.authorizedByUsername,
        action,
        targetId,
        branchId,
        reason: reason.trim() || null,
      });
    } catch (err) {
      console.error("Error al autorizar acción:", err);
      setError("Ocurrió un error al validar la autorización.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <p className={styles.message}>{message}</p>

        <form onSubmit={handleAuthorize} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label>Usuario administrador</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              disabled={loading}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              disabled={loading}
            />
          </div>

          {requireReason && (
            <div className={styles.fieldGroup}>
              <label>Motivo</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={styles.authorizeButton}
              disabled={loading}
            >
              {loading ? "Validando..." : "Autorizar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAuthorizationModal;