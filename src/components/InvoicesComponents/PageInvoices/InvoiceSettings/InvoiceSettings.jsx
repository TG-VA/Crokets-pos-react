import React, { useEffect, useMemo, useState } from "react";
import styles from "./InvoiceSettings.module.css";
import { supabase } from "../../../../lib/supabaseClient";

const emptyForm = {
  provider: "facturama",
  environment: "sandbox",
  issuer_rfc: "",
  issuer_name: "",
  issuer_tax_regime: "",
  issuer_postal_code: "",
  invoice_series: "A",
  next_folio: 1,
  api_username: "",
  api_password: "",
  api_token: "",
  status: true,
  connection_status: "not_configured",
  last_connection_test: null,
  timbres_available: 0,
  last_timbres_sync: null,
};

const RFC_REGEX = /^([A-ZÑ&]{3,4})\d{6}([A-Z0-9]{3})$/;

const InvoiceSettings = () => {
  const [form, setForm] = useState(emptyForm);
  const [settingId, setSettingId] = useState(null);
  const [taxRegimes, setTaxRegimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingTimbres, setSyncingTimbres] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [postalInfo, setPostalInfo] = useState(null);
  const [postalLoading, setPostalLoading] = useState(false);
  const [postalError, setPostalError] = useState("");

  const normalizedIssuerName = form.issuer_name.replace(/\s+/g, " ").trim();

  const isValidRFC = RFC_REGEX.test(form.issuer_rfc);
  const isValidIssuerName =
    normalizedIssuerName.length >= 3 && normalizedIssuerName.length <= 255;
  const isValidPostalCode =
    /^\d{5}$/.test(form.issuer_postal_code) && !!postalInfo && !postalError;
  const isValidSeries =
    /^[A-Z0-9]+$/.test(form.invoice_series) &&
    form.invoice_series.length <= 10;
  const isValidFolio = Number(form.next_folio) > 0;

  const isFormValid = useMemo(() => {
    return (
      form.provider &&
      form.environment &&
      isValidRFC &&
      isValidIssuerName &&
      form.issuer_tax_regime &&
      isValidPostalCode &&
      isValidSeries &&
      isValidFolio
    );
  }, [
    form.provider,
    form.environment,
    form.issuer_tax_regime,
    isValidRFC,
    isValidIssuerName,
    isValidPostalCode,
    isValidSeries,
    isValidFolio,
  ]);

  const normalizeForm = (name, value) => {
    if (name === "issuer_rfc") {
      return value.replace(/[^a-zA-Z0-9&Ññ]/g, "").toUpperCase().slice(0, 13);
    }

    if (name === "issuer_name") {
      return value.toUpperCase().replace(/\s+/g, " ");
    }

    if (name === "issuer_postal_code") {
      return value.replace(/\D/g, "").slice(0, 5);
    }

    if (name === "invoice_series") {
      return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
    }

    if (name === "next_folio") {
      return value.replace(/\D/g, "");
    }

    return value;
  };

  const formatDateTime = (value) => {
    if (!value) return "Nunca";

    return new Date(value).toLocaleString("es-MX", {
      timeZone: "America/Cancun",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getConnectionLabel = () => {
    if (form.connection_status === "connected") return "Conectado correctamente";
    if (form.connection_status === "error") return "Error de conexión";
    return "No configurado";
  };

  const getConnectionClass = () => {
    if (form.connection_status === "connected") return styles.statusConnected;
    if (form.connection_status === "error") return styles.statusError;
    return styles.statusPending;
  };

const lookupPostalCode = async (postalCode) => {
  const cp = String(postalCode || "").replace(/\D/g, "").slice(0, 5);

  setPostalInfo(null);
  setPostalError("");

  if (cp.length !== 5) return;

  try {
    setPostalLoading(true);

    const { data, error: postalLookupError } = await supabase
      .from("postal_codes")
      .select("postal_code, municipality, state, city")
      .eq("postal_code", cp)
      .eq("status", true)
      .limit(1);

    if (postalLookupError) throw postalLookupError;

    if (!data || data.length === 0) {
      setPostalError("Código postal no encontrado en catálogo SEPOMEX.");
      setPostalInfo(null);
      return;
    }

    setPostalInfo(data[0]);
  } catch (err) {
    console.error("Error consultando código postal:", err);
    setPostalError("No se pudo validar el código postal.");
    setPostalInfo(null);
  } finally {
    setPostalLoading(false);
  }
};

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "environment" && value === "production") {
      const confirmed = window.confirm(
        "Estás cambiando a PRODUCCIÓN. Las facturas emitidas tendrán validez fiscal. ¿Deseas continuar?"
      );

      if (!confirmed) return;
    }

    const normalizedValue =
      type === "checkbox" ? checked : normalizeForm(name, value);

    setForm((prev) => ({
      ...prev,
      [name]: normalizedValue,
    }));

    if (name === "issuer_postal_code") {
      setPostalInfo(null);
      setPostalError("");

      if (String(normalizedValue).length === 5) {
        lookupPostalCode(normalizedValue);
      }
    }

    setError("");
    setSuccessMessage("");
  };

  const loadTaxRegimes = async () => {
    const { data, error: regimesError } = await supabase
      .from("tax_regimes")
      .select("id, description")
      .eq("status", true)
      .order("id", { ascending: true });

    if (regimesError) throw regimesError;

    setTaxRegimes(data || []);
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      await loadTaxRegimes();

      const { data, error: settingsError } = await supabase
        .from("cfdi_settings")
        .select("*")
        .eq("status", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (data) {
        setSettingId(data.id);

        setForm({
          provider: data.provider || "facturama",
          environment: data.environment || "sandbox",
          issuer_rfc: data.issuer_rfc || "",
          issuer_name: data.issuer_name || "",
          issuer_tax_regime: data.issuer_tax_regime || "",
          issuer_postal_code: data.issuer_postal_code || "",
          invoice_series: data.invoice_series || "A",
          next_folio: data.next_folio || 1,
          api_username: data.api_username || "",
          api_password: data.api_password || "",
          api_token: data.api_token || "",
          status: data.status !== false,
          connection_status: data.connection_status || "not_configured",
          last_connection_test: data.last_connection_test || null,
          timbres_available: data.timbres_available || 0,
          last_timbres_sync: data.last_timbres_sync || null,
        });

        if (data.issuer_postal_code) {
          lookupPostalCode(data.issuer_postal_code);
        }
      }
    } catch (err) {
      console.error("Error cargando configuración CFDI:", err);
      setError("No se pudo cargar la configuración CFDI.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const validateForm = () => {
    if (!isValidRFC) return "El RFC emisor no tiene un formato válido.";

    if (!isValidIssuerName) {
      return "La razón social debe tener entre 3 y 255 caracteres.";
    }

    if (!form.issuer_tax_regime) return "Selecciona el régimen fiscal emisor.";

    if (!/^\d{5}$/.test(form.issuer_postal_code)) {
      return "El código postal fiscal debe tener 5 dígitos.";
    }

    if (!postalInfo) {
      return "El código postal fiscal no existe en el catálogo SEPOMEX.";
    }

    if (!isValidSeries) {
      return "La serie debe contener solo letras y números, máximo 10 caracteres.";
    }

    if (!isValidFolio) return "El próximo folio debe ser mayor a 0.";

    return "";
  };

  const handleSave = async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const confirmed = window.confirm(
      `¿Deseas guardar la configuración CFDI?\n\nRFC: ${
        form.issuer_rfc
      }\nRazón social: ${normalizedIssuerName}\nCP: ${
        form.issuer_postal_code
      } - ${postalInfo?.municipality}, ${postalInfo?.state}`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        provider: form.provider,
        environment: form.environment,
        issuer_rfc: form.issuer_rfc.trim(),
        issuer_name: normalizedIssuerName,
        issuer_tax_regime: form.issuer_tax_regime,
        issuer_postal_code: form.issuer_postal_code.trim(),
        invoice_series: form.invoice_series.trim(),
        next_folio: Number(form.next_folio || 1),
        api_username: form.api_username.trim() || null,
        api_password: form.api_password.trim() || null,
        api_token: form.api_token.trim() || null,
        status: form.status,
        connection_status: form.connection_status,
        last_connection_test: form.last_connection_test,
        timbres_available: Number(form.timbres_available || 0),
        last_timbres_sync: form.last_timbres_sync,
        updated_at: new Date().toISOString(),
      };

      if (settingId) {
        const { error: updateError } = await supabase
          .from("cfdi_settings")
          .update(payload)
          .eq("id", settingId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("cfdi_settings")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError) throw insertError;

        setSettingId(data.id);
      }

      setSuccessMessage("Configuración CFDI guardada correctamente.");
    } catch (err) {
      console.error("Error guardando configuración CFDI:", err);
      setError("No se pudo guardar la configuración CFDI.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setError("");
    setSuccessMessage("");

    const now = new Date().toISOString();

    setForm((prev) => ({
      ...prev,
      connection_status: "not_configured",
      last_connection_test: now,
    }));

    setTimeout(() => {
      setTestingConnection(false);
      setSuccessMessage(
        "Prueba pendiente de integración con Facturama. Por ahora solo se registró el intento."
      );
    }, 600);
  };

  const handleSyncTimbres = async () => {
    setSyncingTimbres(true);
    setError("");
    setSuccessMessage("");

    const now = new Date().toISOString();

    setForm((prev) => ({
      ...prev,
      timbres_available: Number(prev.timbres_available || 0),
      last_timbres_sync: now,
    }));

    setTimeout(() => {
      setSyncingTimbres(false);
      setSuccessMessage(
        "Consulta de timbres pendiente de integración con Facturama. Por ahora solo se registró el intento."
      );
    }, 600);
  };

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>CONFIGURACIÓN CFDI</h1>
          <p>
            Configura los datos del emisor y el proveedor que se usará para
            timbrar facturas.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={loadSettings}
          disabled={loading || saving}
        >
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {successMessage && (
        <div className={styles.successMessage}>{successMessage}</div>
      )}

      <div className={styles.formWrapper}>
        <section className={styles.section}>
          <h2>Proveedor de timbrado</h2>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Proveedor *</label>
              <select
                name="provider"
                value={form.provider}
                onChange={handleChange}
                className={styles.input}
              >
                <option value="facturama">Facturama</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>Ambiente *</label>
              <select
                name="environment"
                value={form.environment}
                onChange={handleChange}
                className={styles.input}
              >
                <option value="sandbox">Sandbox / Pruebas</option>
                <option value="production">Producción</option>
              </select>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Datos fiscales del emisor</h2>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>RFC emisor *</label>
              <input
                name="issuer_rfc"
                value={form.issuer_rfc}
                onChange={handleChange}
                className={`${styles.input} ${
                  isValidRFC ? styles.validInput : ""
                }`}
                maxLength={13}
              />
              {form.issuer_rfc && !isValidRFC && (
                <small className={styles.fieldError}>
                  RFC inválido. Debe tener 12 o 13 caracteres con formato SAT.
                </small>
              )}
            </div>

            <div className={styles.field}>
              <label>Razón social emisor *</label>
              <input
                name="issuer_name"
                value={form.issuer_name}
                onChange={handleChange}
                className={`${styles.input} ${
                  isValidIssuerName ? styles.validInput : ""
                }`}
                maxLength={255}
              />
              {form.issuer_name && !isValidIssuerName && (
                <small className={styles.fieldError}>
                  Debe tener mínimo 3 caracteres.
                </small>
              )}
            </div>

            <div className={styles.field}>
              <label>Régimen fiscal emisor *</label>
              <select
                name="issuer_tax_regime"
                value={form.issuer_tax_regime}
                onChange={handleChange}
                className={`${styles.input} ${
                  form.issuer_tax_regime ? styles.validInput : ""
                }`}
              >
                <option value="">Selecciona régimen fiscal</option>
                {taxRegimes.map((regime) => (
                  <option key={regime.id} value={regime.id}>
                    {regime.id} - {regime.description}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Código postal fiscal *</label>
              <input
                name="issuer_postal_code"
                value={form.issuer_postal_code}
                onChange={handleChange}
                className={`${styles.input} ${
                  isValidPostalCode ? styles.validInput : ""
                }`}
                maxLength={5}
              />

              {postalLoading && (
                <small>Validando código postal...</small>
              )}

              {postalInfo && (
                <small className={styles.validHelp}>
                  {postalInfo.city ? `${postalInfo.city}, ` : ""}
                  {postalInfo.municipality}, {postalInfo.state}
                </small>
              )}

              {postalError && (
                <small className={styles.fieldError}>{postalError}</small>
              )}

              {form.issuer_postal_code &&
                form.issuer_postal_code.length < 5 &&
                !postalLoading && (
                  <small className={styles.fieldError}>
                    El código postal debe tener 5 dígitos.
                  </small>
                )}

              <small>
                Debe coincidir con la Constancia de Situación Fiscal.
              </small>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Serie y folios</h2>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Serie *</label>
              <input
                name="invoice_series"
                value={form.invoice_series}
                onChange={handleChange}
                className={`${styles.input} ${
                  isValidSeries ? styles.validInput : ""
                }`}
                maxLength={10}
              />
              {form.invoice_series && !isValidSeries && (
                <small className={styles.fieldError}>
                  Solo letras y números. Máximo 10 caracteres.
                </small>
              )}
            </div>

            <div className={styles.field}>
              <label>Próximo folio *</label>
              <input
                name="next_folio"
                value={form.next_folio}
                onChange={handleChange}
                className={`${styles.input} ${
                  isValidFolio ? styles.validInput : ""
                }`}
              />
              {form.next_folio && !isValidFolio && (
                <small className={styles.fieldError}>
                  Debe ser mayor a 0.
                </small>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Credenciales del proveedor</h2>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Usuario API</label>
              <input
                name="api_username"
                value={form.api_username}
                onChange={handleChange}
                className={styles.input}
                autoComplete="off"
              />
            </div>

            <div className={styles.field}>
              <label>Contraseña API</label>
              <input
                name="api_password"
                type="password"
                value={form.api_password}
                onChange={handleChange}
                className={styles.input}
                autoComplete="new-password"
              />
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label>Token API</label>
              <input
                name="api_token"
                type="password"
                value={form.api_token}
                onChange={handleChange}
                className={styles.input}
                autoComplete="new-password"
              />
              <small>
                Se utilizará después para conectar el sistema con el PAC.
              </small>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Estado de conexión</h2>

          <div className={styles.infoCardsGrid}>
            <div className={styles.infoCard}>
              <span>Estado actual</span>
              <strong className={getConnectionClass()}>
                {getConnectionLabel()}
              </strong>
            </div>

            <div className={styles.infoCard}>
              <span>Última prueba</span>
              <strong>{formatDateTime(form.last_connection_test)}</strong>
            </div>

            <div className={styles.actionCard}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleTestConnection}
                disabled={testingConnection || saving}
              >
                {testingConnection ? "Probando..." : "Probar conexión"}
              </button>
              <small>Disponible cuando se conecte la API del proveedor.</small>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Timbres</h2>

          <div className={styles.infoCardsGrid}>
            <div className={styles.infoCard}>
              <span>Timbres disponibles</span>
              <strong>{Number(form.timbres_available || 0)}</strong>
            </div>

            <div className={styles.infoCard}>
              <span>Última sincronización</span>
              <strong>{formatDateTime(form.last_timbres_sync)}</strong>
            </div>

            <div className={styles.actionCard}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleSyncTimbres}
                disabled={syncingTimbres || saving}
              >
                {syncingTimbres ? "Consultando..." : "Consultar timbres"}
              </button>
              <small>Disponible cuando se conecte la API del proveedor.</small>
            </div>
          </div>
        </section>

        <section className={styles.statusSection}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="status"
              checked={form.status}
              onChange={handleChange}
            />
            Configuración activa
          </label>

          <div className={styles.connectionStatus}>
            Ambiente actual:{" "}
            <strong>
              {form.environment === "production"
                ? "Producción"
                : "Sandbox / Pruebas"}
            </strong>
          </div>
        </section>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving || loading || postalLoading || !isFormValid}
          >
            {saving ? "Guardando..." : "Guardar configuración CFDI"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSettings;