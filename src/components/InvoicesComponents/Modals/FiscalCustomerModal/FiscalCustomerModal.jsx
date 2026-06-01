import React, { useEffect, useMemo, useState } from "react";
import styles from "./FiscalCustomerModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";

const emptyForm = {
  customerId: "",
  phone: "",
  fiscal_email: "",
  rfc: "",
  razon_social: "",
  postal_code: "",
  tax_regime: "",
  cfdi_use: "",
  address: "",
};

const FiscalCustomerModal = ({
  isOpen,
  onClose,
  onSaved,
  customerToEdit = null,
}) => {
  const [mode, setMode] = useState("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [cfdiUses, setCfdiUses] = useState([]);
  const [taxRegimes, setTaxRegimes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [touched, setTouched] = useState({});
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditMode = !!customerToEdit?.id;

  const onlyNumbers = (value) => String(value || "").replace(/\D/g, "");

  const normalizeRFC = (value) =>
    String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9Ñ&]/g, "");

  const normalizeEmail = (value) =>
    String(value || "").trim().toLowerCase().replace(/\s/g, "");

  const normalizeUpperText = (value) =>
    String(value || "")
      .toUpperCase()
      .replace(/\s+/g, " ");

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const isValidRFC = (value) =>
    /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(value);

  const fieldStatus = {
    phone:
      form.phone.length === 0
        ? ""
        : onlyNumbers(form.phone).length === 10
        ? "valid"
        : "invalid",

    fiscal_email:
      form.fiscal_email.length === 0
        ? ""
        : isValidEmail(form.fiscal_email)
        ? "valid"
        : "invalid",

    rfc:
      form.rfc.length === 0 ? "" : isValidRFC(form.rfc) ? "valid" : "invalid",

    razon_social:
      form.razon_social.trim().length === 0
        ? ""
        : form.razon_social.trim().length > 0
        ? "valid"
        : "invalid",

    postal_code:
      form.postal_code.length === 0
        ? ""
        : onlyNumbers(form.postal_code).length === 5
        ? "valid"
        : "invalid",

    tax_regime: form.tax_regime ? "valid" : "",

    cfdi_use: form.cfdi_use ? "valid" : "",
  };

  const getInputClass = (field) => {
    if (!touched[field] && !form[field]) return styles.input;

    if (fieldStatus[field] === "valid") {
      return `${styles.input} ${styles.validInput}`;
    }

    if (fieldStatus[field] === "invalid") {
      return `${styles.input} ${styles.invalidInput}`;
    }

    return styles.input;
  };

  const getSelectClass = (field) => {
    if (!touched[field] && !form[field]) return styles.input;

    if (fieldStatus[field] === "valid") {
      return `${styles.input} ${styles.validInput}`;
    }

    return styles.input;
  };

  const markTouched = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const isFormValid =
    onlyNumbers(form.phone).length === 10 &&
    isValidEmail(form.fiscal_email) &&
    isValidRFC(form.rfc) &&
    form.razon_social.trim().length > 0 &&
    onlyNumbers(form.postal_code).length === 5 &&
    !!form.tax_regime &&
    !!form.cfdi_use;

  useEffect(() => {
    if (!isOpen) return;

    loadCatalogs();

    if (customerToEdit?.id) {
      setMode("form");
      setTouched({});
      setForm({
        customerId: customerToEdit.id,
        phone: onlyNumbers(customerToEdit.phone || "").slice(0, 10),
        fiscal_email: normalizeEmail(customerToEdit.fiscal_email || ""),
        rfc: normalizeRFC(customerToEdit.rfc || "").slice(0, 13),
        razon_social: normalizeUpperText(customerToEdit.razon_social || ""),
        postal_code: onlyNumbers(customerToEdit.postal_code || "").slice(0, 5),
        tax_regime: customerToEdit.tax_regime || "",
        cfdi_use: customerToEdit.cfdi_use || "",
        address: customerToEdit.address || "",
      });
    } else {
      setMode("search");
      setSearchTerm("");
      setMatches([]);
      setHasSearched(false);
      setTouched({});
      setForm(emptyForm);
    }

    setError("");
  }, [isOpen, customerToEdit]);

  const loadCatalogs = async () => {
    try {
      const [cfdiRes, regimesRes] = await Promise.all([
        supabase
          .from("cfdi_uses")
          .select("id, description")
          .eq("status", true)
          .order("id", { ascending: true }),

        supabase
          .from("tax_regimes")
          .select("id, description")
          .eq("status", true)
          .order("id", { ascending: true }),
      ]);

      if (cfdiRes.error) throw cfdiRes.error;
      if (regimesRes.error) throw regimesRes.error;

      setCfdiUses(cfdiRes.data || []);
      setTaxRegimes(regimesRes.data || []);
    } catch (err) {
      console.error("Error cargando catálogos fiscales:", err);
      setError("No se pudieron cargar los catálogos fiscales.");
    }
  };

  const normalizedSearch = useMemo(
    () => searchTerm.trim().toLowerCase(),
    [searchTerm]
  );

  const handleSearch = async () => {
    if (!normalizedSearch) {
      setError("Ingresa teléfono, correo, RFC o razón social para buscar.");
      setHasSearched(false);
      return;
    }

    try {
      setLoadingSearch(true);
      setError("");

      const like = `%${normalizedSearch}%`;

      const { data, error: searchError } = await supabase
        .from("customers")
        .select(`
          id,
          name,
          phone,
          email,
          fiscal_email,
          rfc,
          razon_social,
          postal_code,
          tax_regime,
          cfdi_use,
          address,
          status,
          is_billing_customer
        `)
        .or(
          `phone.ilike.${like},email.ilike.${like},fiscal_email.ilike.${like},rfc.ilike.${like},name.ilike.${like},razon_social.ilike.${like}`
        )
        .order("name", { ascending: true })
        .limit(20);

      if (searchError) throw searchError;

      setMatches(data || []);
      setHasSearched(true);
    } catch (err) {
      console.error("Error buscando cliente:", err);
      setError("No se pudo buscar el cliente.");
      setMatches([]);
      setHasSearched(true);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setForm({
      customerId: customer.id,
      phone: onlyNumbers(customer.phone || "").slice(0, 10),
      fiscal_email: normalizeEmail(customer.fiscal_email || customer.email || ""),
      rfc: normalizeRFC(customer.rfc || "").slice(0, 13),
      razon_social: normalizeUpperText(customer.razon_social || ""),
      postal_code: onlyNumbers(customer.postal_code || "").slice(0, 5),
      tax_regime: customer.tax_regime || "",
      cfdi_use: customer.cfdi_use || "",
      address: customer.address || "",
    });

    setTouched({});
    setMode("form");
    setError("");
  };

  const handleCreateNew = () => {
    setForm(emptyForm);
    setTouched({});
    setMode("form");
    setError("");
  };

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    markTouched(field);
    setError("");
  };

  const validateForm = () => {
    if (onlyNumbers(form.phone).length !== 10) {
      return "El teléfono debe tener 10 dígitos.";
    }

    if (!isValidEmail(form.fiscal_email)) {
      return "Ingresa un correo fiscal válido.";
    }

    if (!isValidRFC(form.rfc)) {
      return "Ingresa un RFC válido.";
    }

    if (!form.razon_social.trim()) {
      return "La razón social es obligatoria.";
    }

    if (onlyNumbers(form.postal_code).length !== 5) {
      return "El código postal fiscal debe tener 5 dígitos.";
    }

    if (!form.tax_regime) return "Selecciona el régimen fiscal.";
    if (!form.cfdi_use) return "Selecciona el uso CFDI.";

    return "";
  };

  const handleSave = async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setTouched({
        phone: true,
        fiscal_email: true,
        rfc: true,
        razon_social: true,
        postal_code: true,
        tax_regime: true,
        cfdi_use: true,
      });
      return;
    }

    const razonSocial = normalizeUpperText(form.razon_social).trim();
    const fiscalEmail = normalizeEmail(form.fiscal_email);
    const phone = onlyNumbers(form.phone);
    const postalCode = onlyNumbers(form.postal_code);
    const rfc = normalizeRFC(form.rfc);

    const confirmed = window.confirm(
      `¿Deseas guardar estos datos fiscales?\n\nRFC: ${rfc}\nRazón social: ${razonSocial}`
    );

    if (!confirmed) return;

    const payload = {
      name: null,
      phone,
      email: fiscalEmail,
      fiscal_email: fiscalEmail,
      rfc,
      razon_social: razonSocial,
      postal_code: postalCode,
      tax_regime: form.tax_regime,
      cfdi_use: form.cfdi_use,
      address: form.address.trim() || null,
      is_billing_customer: true,
      status: true,
      updated_at: new Date().toISOString(),
    };

    try {
      setSaving(true);
      setError("");

      if (form.customerId) {
        const { error: updateError } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", form.customerId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("customers")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      if (onSaved) await onSaved();
      onClose();
    } catch (err) {
      console.error("Error guardando cliente fiscal:", err);

      if (err?.code === "23505") {
        setError("Ya existe un cliente con ese RFC o correo.");
      } else {
        setError("No se pudo guardar el cliente fiscal.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2>
              {isEditMode ? "Editar datos fiscales" : "Agregar datos fiscales"}
            </h2>
            <p>Captura únicamente la información fiscal necesaria para CFDI.</p>
          </div>

          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {!isEditMode && mode === "search" && (
          <div className={styles.searchSection}>
            <label className={styles.label}>
              Buscar cliente por teléfono, correo, RFC o razón social
            </label>

            <div className={styles.searchRow}>
              <input
                type="text"
                className={styles.input}
                placeholder="Buscar por teléfono, RFC o correo..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHasSearched(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />

              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleSearch}
                disabled={loadingSearch}
              >
                {loadingSearch ? "Buscando..." : "Buscar"}
              </button>
            </div>

            <div className={styles.matchesContainer}>
              {matches.length > 0 ? (
                matches.map((customer) => (
                  <div key={customer.id} className={styles.matchCard}>
                    <div>
                      <strong>
                        {customer.razon_social ||
                          customer.name ||
                          "SIN NOMBRE"}
                      </strong>
                      <span>
                        Tel: {customer.phone || "—"} · Correo:{" "}
                        {customer.fiscal_email || customer.email || "—"}
                      </span>
                      <span>
                        RFC: {customer.rfc || "SIN RFC"} ·{" "}
                        {customer.is_billing_customer
                          ? "Ya tiene datos fiscales"
                          : "Sin datos fiscales"}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      Seleccionar
                    </button>
                  </div>
                ))
              ) : hasSearched ? (
                <div className={styles.emptyState}>
                  No se encontró ningún cliente con esa búsqueda. Puedes crear
                  uno nuevo.
                </div>
              ) : (
                <div className={styles.emptyState}>
                  Busca un cliente existente antes de crear uno nuevo.
                </div>
              )}
            </div>

            <button
              type="button"
              className={styles.createButton}
              onClick={handleCreateNew}
            >
              + Crear cliente con datos fiscales
            </button>
          </div>
        )}

        {mode === "form" && (
          <div className={styles.formSection}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Teléfono *</label>
                <input
                  className={getInputClass("phone")}
                  value={form.phone}
                  onChange={(e) =>
                    updateField("phone", onlyNumbers(e.target.value).slice(0, 10))
                  }
                  maxLength={10}
                />
                {fieldStatus.phone === "invalid" && (
                  <small className={styles.fieldError}>
                    El teléfono debe tener 10 dígitos.
                  </small>
                )}
              </div>

              <div className={styles.field}>
                <label>Correo fiscal *</label>
                <input
                  className={getInputClass("fiscal_email")}
                  value={form.fiscal_email}
                  onChange={(e) =>
                    updateField("fiscal_email", normalizeEmail(e.target.value))
                  }
                />
                {fieldStatus.fiscal_email === "invalid" && (
                  <small className={styles.fieldError}>
                    Ingresa un correo fiscal válido.
                  </small>
                )}
              </div>

              <div className={styles.field}>
                <label>RFC *</label>
                <input
                  className={getInputClass("rfc")}
                  value={form.rfc}
                  onChange={(e) =>
                    updateField("rfc", normalizeRFC(e.target.value).slice(0, 13))
                  }
                  maxLength={13}
                />
                {fieldStatus.rfc === "invalid" && (
                  <small className={styles.fieldError}>
                    RFC inválido. Debe tener 12 o 13 caracteres.
                  </small>
                )}
                <small className={styles.helpText}>
                  Captúralo exactamente como aparece en la Constancia de
                  Situación Fiscal.
                </small>
              </div>

              <div className={styles.field}>
                <label>Razón social *</label>
                <input
                  className={getInputClass("razon_social")}
                  value={form.razon_social}
                  onChange={(e) =>
                    updateField(
                      "razon_social",
                      normalizeUpperText(e.target.value)
                    )
                  }
                />
              </div>

              <div className={styles.field}>
                <label>Código postal fiscal *</label>
                <input
                  className={getInputClass("postal_code")}
                  value={form.postal_code}
                  onChange={(e) =>
                    updateField(
                      "postal_code",
                      onlyNumbers(e.target.value).slice(0, 5)
                    )
                  }
                  maxLength={5}
                />
                {fieldStatus.postal_code === "invalid" && (
                  <small className={styles.fieldError}>
                    El código postal debe tener 5 dígitos.
                  </small>
                )}
                <small className={styles.helpText}>
                  Debe coincidir con el código postal registrado ante el SAT.
                </small>
              </div>

              <div className={styles.field}>
                <label>Régimen fiscal *</label>
                <select
                  className={getSelectClass("tax_regime")}
                  value={form.tax_regime}
                  onChange={(e) => updateField("tax_regime", e.target.value)}
                >
                  <option value="">Selecciona régimen</option>
                  {taxRegimes.map((regime) => (
                    <option key={regime.id} value={regime.id}>
                      {regime.id} - {regime.description}
                    </option>
                  ))}
                </select>
                <small className={styles.helpText}>
                  Debe coincidir con el régimen indicado en la Constancia de
                  Situación Fiscal.
                </small>
              </div>

              <div className={styles.field}>
                <div className={styles.labelWithHelp}>
                  <label>Uso CFDI *</label>
                  <span
                    className={styles.tooltip}
                    title="G03 = Gastos en general. S01 = Sin efectos fiscales. D01 = Honorarios médicos."
                  >
                    ⓘ
                  </span>
                </div>

                <select
                  className={getSelectClass("cfdi_use")}
                  value={form.cfdi_use}
                  onChange={(e) => updateField("cfdi_use", e.target.value)}
                >
                  <option value="">Selecciona uso CFDI</option>
                  {cfdiUses.map((use) => (
                    <option key={use.id} value={use.id}>
                      {use.id} - {use.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label>Dirección fiscal</label>
                <textarea
                  className={styles.textarea}
                  value={form.address}
                  onChange={(e) =>
                    updateField("address", normalizeUpperText(e.target.value))
                  }
                />
              </div>
            </div>

            <div className={styles.footer}>
              {!isEditMode && (
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => setMode("search")}
                  disabled={saving}
                >
                  Volver a búsqueda
                </button>
              )}

              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.saveButton}
                onClick={handleSave}
                disabled={saving || !isFormValid}
              >
                {saving ? "Guardando..." : "Guardar datos fiscales"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FiscalCustomerModal;