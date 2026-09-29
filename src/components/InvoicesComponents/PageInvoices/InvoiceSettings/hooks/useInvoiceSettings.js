import { useCallback, useEffect, useState } from "react";

import { useAppModal } from "../../../../../hooks/useAppModal";
import {
  fetchTaxRegimes,
  lookupPostalCode,
} from "../../../services/invoicesCatalogService";
import {
  fetchActiveCfdiSettings,
  saveCfdiSettings,
} from "../services/invoiceSettingsService";
import {
  EMPTY_SETTINGS_FORM,
  PRODUCTION_CONFIRM_MESSAGE,
  buildSettingsConfirmMessage,
  buildSettingsFormFromRow,
  buildSettingsPayload,
  getNormalizedIssuerName,
  getSettingsFieldValidity,
  isSettingsFormValid,
  normalizeSettingsField,
} from "../services/invoiceSettingsCalculationService";

const PRODUCTION_CONFIRM_TEXT = "Sí, cambiar a producción";
const TEST_CONNECTION_DELAY_MS = 600;
const SYNC_TIMBRES_DELAY_MS = 600;

export const useInvoiceSettings = () => {
  const [form, setForm] = useState(EMPTY_SETTINGS_FORM);
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

  const { appModal, closeAppModal, showAppConfirm } = useAppModal();

  const resolvePostalCode = useCallback(async (postalCode) => {
    const cp = String(postalCode || "")
      .replace(/\D/g, "")
      .slice(0, 5);

    setPostalInfo(null);
    setPostalError("");

    if (cp.length !== 5) return;

    try {
      setPostalLoading(true);

      const found = await lookupPostalCode(cp);

      if (!found) {
        setPostalError("Código postal no encontrado en catálogo SEPOMEX.");
        setPostalInfo(null);
        return;
      }

      setPostalInfo(found);
    } catch (err) {
      console.error("Error consultando código postal:", err);
      setPostalError("No se pudo validar el código postal.");
      setPostalInfo(null);
    } finally {
      setPostalLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      await fetchTaxRegimes().then((regimes) => setTaxRegimes(regimes));

      const settingsRow = await fetchActiveCfdiSettings();

      if (settingsRow) {
        setSettingId(settingsRow.id);
        setForm(buildSettingsFormFromRow(settingsRow));

        if (settingsRow.issuer_postal_code) {
          resolvePostalCode(settingsRow.issuer_postal_code);
        }
      }
    } catch (err) {
      console.error("Error cargando configuración CFDI:", err);
      setError("No se pudo cargar la configuración CFDI.");
    } finally {
      setLoading(false);
    }
  }, [resolvePostalCode]);

  useEffect(() => {
    // Carga inicial de la pantalla; deuda heredada de `set-state-in-effect`
    // registrada en `KNOWN_ISSUES.md` #56.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
  }, [loadSettings]);

  const applyFieldChange = (name, normalizedValue) => {
    setForm((prev) => ({
      ...prev,
      [name]: normalizedValue,
    }));

    if (name === "issuer_postal_code") {
      setPostalInfo(null);
      setPostalError("");

      if (String(normalizedValue).length === 5) {
        resolvePostalCode(normalizedValue);
      }
    }

    setError("");
    setSuccessMessage("");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    const normalizedValue =
      type === "checkbox" ? checked : normalizeSettingsField(name, value);

    if (
      name === "environment" &&
      normalizedValue === "production" &&
      form.environment !== "production"
    ) {
      showAppConfirm({
        type: "danger",
        title: "Cambiar a producción",
        message: PRODUCTION_CONFIRM_MESSAGE,
        confirmText: PRODUCTION_CONFIRM_TEXT,
        cancelText: "Cancelar",
        onConfirm: () => applyFieldChange(name, normalizedValue),
      });
      return;
    }

    applyFieldChange(name, normalizedValue);
  };

  const validateForm = () => {
    const validity = getSettingsFieldValidity(form, postalInfo, postalError);

    if (!validity.issuerRfc) return "El RFC emisor no tiene un formato válido.";

    if (!validity.issuerName) {
      return "La razón social debe tener entre 3 y 255 caracteres.";
    }

    if (!form.issuer_tax_regime) return "Selecciona el régimen fiscal emisor.";

    if (!/^\d{5}$/.test(form.issuer_postal_code)) {
      return "El código postal fiscal debe tener 5 dígitos.";
    }

    if (!validity.postalCode) {
      return "El código postal fiscal no existe en el catálogo SEPOMEX.";
    }

    if (!validity.series) {
      return "La serie debe contener solo letras y números, máximo 10 caracteres.";
    }

    if (!validity.folio) return "El próximo folio debe ser mayor a 0.";

    return "";
  };

  const executeSaveSettings = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      await saveCfdiSettings({
        settingId,
        payload: buildSettingsPayload(form),
      });

      if (!settingId) {
        const created = await fetchActiveCfdiSettings();
        setSettingId(created?.id ?? null);
      }

      setSuccessMessage("Configuración CFDI guardada correctamente.");
    } catch (err) {
      console.error("Error guardando configuración CFDI:", err);
      setError("No se pudo guardar la configuración CFDI.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    showAppConfirm({
      type: "warning",
      title: "Guardar configuración CFDI",
      message: buildSettingsConfirmMessage(form, postalInfo),
      confirmText: "Sí, guardar",
      cancelText: "Cancelar",
      onConfirm: executeSaveSettings,
    });
  };

  const handleTestConnection = () => {
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
    }, TEST_CONNECTION_DELAY_MS);
  };

  const handleSyncTimbres = () => {
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
    }, SYNC_TIMBRES_DELAY_MS);
  };

  return {
    appModal,
    closeAppModal,
    error,
    fieldValidity: getSettingsFieldValidity(form, postalInfo, postalError),
    form,
    handleChange,
    handleSave,
    handleSyncTimbres,
    handleTestConnection,
    isFormValid: isSettingsFormValid(form, postalInfo, postalError),
    loadSettings,
    loading,
    normalizedIssuerName: getNormalizedIssuerName(form.issuer_name),
    postalError,
    postalInfo,
    postalLoading,
    saveDisabled:
      saving ||
      loading ||
      postalLoading ||
      !isSettingsFormValid(form, postalInfo, postalError),
    saving,
    successMessage,
    syncingTimbres,
    taxRegimes,
    testingConnection,
  };
};
