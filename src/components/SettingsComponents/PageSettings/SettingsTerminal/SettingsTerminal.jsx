import { useEffect, useState } from "react";
import { useBranch } from "../../../../contexts/BranchContext";
import {
  fetchDeviceCode,
  checkSupabaseConnection,
  readZoomFactor,
  applyZoomFactor,
  resetZoom,
} from "../../../../services/terminalSettingsService";
import shared from "../PageSettings.module.css";

const ZOOM_STEP = 0.1;

const CONNECTION_LABELS = {
  checking: "Verificando conexión...",
  online: "Conectado a Supabase",
  offline: "Sin conexión con Supabase",
};

const SettingsTerminal = () => {
  const { branch } = useBranch();

  const [device, setDevice] = useState({ status: "loading", code: null });
  const [connection, setConnection] = useState("checking");
  const [zoomFactor, setZoomFactor] = useState(1);
  const [zoomFeedback, setZoomFeedback] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchDeviceCode().then((result) => {
      if (cancelled) return;
      setDevice({
        status: result.success ? "ready" : "error",
        code: result.deviceCode,
      });
    });

    checkSupabaseConnection().then((result) => {
      if (cancelled) return;
      setConnection(result.connected ? "online" : "offline");
    });

    readZoomFactor().then((result) => {
      if (cancelled || !result.success) return;
      setZoomFactor(result.zoomFactor);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleZoomChange = async (delta) => {
    setZoomFeedback(null);

    const result = await applyZoomFactor(zoomFactor + delta);

    if (!result.success) {
      setZoomFeedback({ type: "error", message: result.error });
      return;
    }

    setZoomFactor(result.zoomFactor);
    setZoomFeedback({
      type: "success",
      message: `Zoom de la ventana: ${Math.round(result.zoomFactor * 100)}%.`,
    });
  };

  const handleZoomReset = async () => {
    setZoomFeedback(null);

    const result = await resetZoom();

    if (!result.success) {
      setZoomFeedback({ type: "error", message: result.error });
      return;
    }

    setZoomFactor(result.zoomFactor);
    setZoomFeedback({
      type: "success",
      message: "Zoom de la ventana restablecido.",
    });
  };

  const handleReconnect = async () => {
    setConnection("checking");

    const result = await checkSupabaseConnection();
    setConnection(result.connected ? "online" : "offline");
  };

  return (
    <section className={shared.page} aria-labelledby="settings-terminal-title">
      <header className={shared.pageHeader}>
        <h1 id="settings-terminal-title" className={shared.pageTitle}>
          Terminal y Sucursal
        </h1>
        <p className={shared.pageSubtitle}>
          Identificación del dispositivo y estado del sistema
        </p>
      </header>

      <article className={shared.card}>
        <h2 className={shared.cardTitle}>Identificación del terminal</h2>
        <p className={shared.cardDescription}>
          Datos que vinculan este puesto de trabajo con la sucursal en Supabase.
        </p>

        <dl className={shared.definitionList}>
          <dt className={shared.definitionTerm}>Código del dispositivo</dt>
          <dd className={shared.definitionValue}>
            {device.status === "loading"
              ? "Cargando código del dispositivo..."
              : device.status === "ready"
                ? device.code
                : "No disponible en este entorno"}
          </dd>

          <dt className={shared.definitionTerm}>Sucursal vinculada</dt>
          <dd className={shared.definitionValue}>
            {branch?.code
              ? `${branch.code} - ${branch.name}`
              : "Sin sucursal asignada"}
          </dd>

          <dt className={shared.definitionTerm}>Conexión con Supabase</dt>
          <dd className={shared.definitionValue}>
            <span role="status">{CONNECTION_LABELS[connection]}</span>
          </dd>
        </dl>

        <div className={shared.buttonRow}>
          <button
            type="button"
            className={shared.buttonSecondary}
            onClick={handleReconnect}
            disabled={connection === "checking"}
          >
            Revisar conexión
          </button>
        </div>
      </article>

      <article className={shared.card}>
        <h2 className={shared.cardTitle}>Zoom de la ventana</h2>
        <p className={shared.cardDescription}>
          Ajuste visual de la interfaz para esta terminal.
        </p>

        <div className={shared.buttonRow}>
          <button
            type="button"
            className={shared.button}
            onClick={() => handleZoomChange(ZOOM_STEP)}
          >
            Acercar vista
          </button>
          <button
            type="button"
            className={shared.button}
            onClick={() => handleZoomChange(-ZOOM_STEP)}
          >
            Alejar vista
          </button>
          <button
            type="button"
            className={shared.buttonSecondary}
            onClick={handleZoomReset}
          >
            Restablecer vista
          </button>
        </div>

        <p className={shared.hint}>
          Zoom actual: {Math.round(zoomFactor * 100)}%
        </p>

        {zoomFeedback?.type === "error" ? (
          <p role="alert" className={shared.errorMessage}>
            {zoomFeedback.message}
          </p>
        ) : null}

        {zoomFeedback?.type === "success" ? (
          <p role="status" className={shared.statusMessage}>
            {zoomFeedback.message}
          </p>
        ) : null}
      </article>
    </section>
  );
};

export default SettingsTerminal;
