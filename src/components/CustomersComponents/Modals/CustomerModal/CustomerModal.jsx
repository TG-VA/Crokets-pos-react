import React, { useEffect, useMemo, useState } from "react";
import styles from "./CustomerModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import AppModal from "../../../AppModal/AppModal";
import { useEscapeKey } from "../../../../hooks/useEscapeKey";

const emptyForm = {
  name: "",
  phone: "",
  phoneConfirm: "",
  email: "",
  status: true,
};

const CustomerModal = ({ isOpen, onClose, onSaved, customerToEdit }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Entendido",
    cancelText: "Cancelar",
    showCancel: false,
    loading: false,
    onConfirm: null,
    onCancel: null,
  });

  const isEditing = useMemo(() => !!customerToEdit?.id, [customerToEdit]);

  const normalizeName = (value) => {
    return String(value || "")
      .replace(/\s+/g, " ")
      .toUpperCase();
  };

  const normalizePhone = (value) => {
    return String(value || "")
      .replace(/\D/g, "")
      .slice(0, 10);
  };

  const normalizeEmail = (value) => {
    return String(value || "").trim().toLowerCase();
  };

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
      onConfirm: null,
      onCancel: null,
    }));
  };

  const showAppAlert = ({
    type = "info",
    title = "Aviso",
    message = "",
    confirmText = "Entendido",
    onConfirm = closeAppModal,
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText: "Cancelar",
      showCancel: false,
      loading: false,
      onConfirm,
      onCancel: closeAppModal,
    });
  };

  const showAppConfirm = ({
    type = "warning",
    title = "Confirmar acción",
    message = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      showCancel: true,
      loading: false,
      onConfirm,
      onCancel: closeAppModal,
    });
  };

  const setAppModalLoading = (loading) => {
    setAppModal((prev) => ({
      ...prev,
      loading,
    }));
  };

  const validateValues = (values) => {
    const errors = {};

    const cleanName = String(values.name || "").trim();
    const cleanPhone = String(values.phone || "").trim();
    const cleanPhoneConfirm = String(values.phoneConfirm || "").trim();
    const cleanEmail = String(values.email || "").trim();

    if (!cleanName) {
      errors.name = "Ingresa el nombre del cliente.";
    } else if (cleanName.length < 3) {
      errors.name = "El nombre debe tener al menos 3 caracteres.";
    }

    if (!cleanPhone) {
      errors.phone = "Ingresa el teléfono del cliente.";
    } else if (cleanPhone.length !== 10) {
      errors.phone = "El teléfono debe tener 10 dígitos.";
    }

    if (!cleanPhoneConfirm) {
      errors.phoneConfirm = "Confirma el teléfono del cliente.";
    } else if (cleanPhoneConfirm.length !== 10) {
      errors.phoneConfirm = "La confirmación debe tener 10 dígitos.";
    } else if (cleanPhone && cleanPhoneConfirm !== cleanPhone) {
      errors.phoneConfirm = "Los teléfonos no coinciden.";
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = "Ingresa un correo válido.";
    }

    return errors;
  };

  const handleRequestClose = () => {
    if (saving || appModal.isOpen) return;
    onClose();
  };

  const handleChange = (field, value) => {
    let finalValue = value;

    if (field === "name") {
      finalValue = normalizeName(value);
    }

    if (field === "phone" || field === "phoneConfirm") {
      finalValue = normalizePhone(value);
    }

    if (field === "email") {
      finalValue = normalizeEmail(value);
    }

    const nextFormData = {
      ...formData,
      [field]: finalValue,
    };

    setFormData(nextFormData);
    setFieldErrors(validateValues(nextFormData));
  };

  const handleBlur = (field) => {
    setTouchedFields((prev) => ({
      ...prev,
      [field]: true,
    }));

    setFieldErrors(validateValues(formData));
  };

  const getFieldClassName = (field) => {
    const wasTouched = touchedFields[field];

    if (!wasTouched) return "";

    if (fieldErrors[field]) {
      return styles.inputInvalid;
    }

    const value = String(formData[field] ?? "").trim();

    if (value) {
      return styles.inputValid;
    }

    return "";
  };

  const findCustomerByPhone = async (phone) => {
    let query = supabase
      .from("customers")
      .select(`
        id,
        name,
        phone,
        email,
        razon_social,
        status,
        is_billing_customer,
        is_points_customer
      `)
      .eq("phone", phone)
      .limit(1);

    if (isEditing && customerToEdit?.id) {
      query = query.neq("id", customerToEdit.id);
    }

    const { data, error: phoneError } = await query;

    if (phoneError) {
      throw phoneError;
    }

    return data?.[0] || null;
  };

  const currentErrors = validateValues(formData);

  const canSave =
    String(formData.name || "").trim().length >= 3 &&
    String(formData.phone || "").trim().length === 10 &&
    String(formData.phoneConfirm || "").trim().length === 10 &&
    formData.phone === formData.phoneConfirm &&
    Object.keys(currentErrors).length === 0 &&
    !saving;

  const saveCustomer = async (normalizedData, existingCustomer = null) => {
    try {
      setSaving(true);
      setAppModalLoading(true);

      const payload = {
        name: normalizedData.name,
        phone: normalizedData.phone,
        email: normalizedData.email || null,
        status: normalizedData.status,
        is_points_customer: true,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        const { error: updateError } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", customerToEdit.id);

        if (updateError) throw updateError;
      } else if (existingCustomer?.id) {
        const { error: linkError } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", existingCustomer.id);

        if (linkError) throw linkError;
      } else {
        const { error: insertError } = await supabase.from("customers").insert([
          {
            id: crypto.randomUUID(),
            ...payload,
            is_billing_customer: false,
            created_at: new Date().toISOString(),
          },
        ]);

        if (insertError) throw insertError;
      }

      try {
        await onSaved?.();
      } catch (refreshError) {
        console.error("Error actualizando listado de clientes:", refreshError);
      }

      setAppModal({
        isOpen: true,
        type: "success",
        title: isEditing ? "Cliente actualizado" : "Cliente creado",
        message: isEditing
          ? "Los datos del cliente fueron actualizados correctamente."
          : "El cliente fue registrado correctamente.",
        confirmText: "Aceptar",
        cancelText: "Cancelar",
        showCancel: false,
        loading: false,
        onConfirm: () => {
          closeAppModal();
          onClose();
        },
        onCancel: closeAppModal,
      });
    } catch (err) {
      console.error("Error guardando cliente:", err);

      const errorMessage = String(err?.message || "");

      let message = err?.message || "No se pudo guardar el cliente.";

      if (errorMessage.includes("customers_email_key")) {
        message = "Ya existe un cliente registrado con ese correo.";
      } else if (errorMessage.includes("duplicate key")) {
        message = "Ya existe un cliente con información duplicada.";
      }

      setAppModal({
        isOpen: true,
        type: "danger",
        title: "No se pudo guardar",
        message,
        confirmText: "Entendido",
        cancelText: "Cancelar",
        showCancel: false,
        loading: false,
        onConfirm: closeAppModal,
        onCancel: closeAppModal,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedData = {
      name: normalizeName(formData.name).trim(),
      phone: normalizePhone(formData.phone).trim(),
      phoneConfirm: normalizePhone(formData.phoneConfirm).trim(),
      email: normalizeEmail(formData.email),
      status: formData.status,
    };

    const errors = validateValues(normalizedData);

    setFieldErrors(errors);
    setTouchedFields({
      name: true,
      phone: true,
      phoneConfirm: true,
      email: true,
    });

    if (Object.keys(errors).length > 0) {
      showAppAlert({
        type: "warning",
        title: "Campos incompletos",
        message: "Corrige los campos marcados antes de guardar.",
        confirmText: "Entendido",
      });
      return;
    }

    try {
      setSaving(true);

      const originalPhone = normalizePhone(customerToEdit?.phone || "");
      const phoneWasChanged = isEditing && originalPhone !== normalizedData.phone;

      const existingCustomer = await findCustomerByPhone(normalizedData.phone);

      if (isEditing && existingCustomer?.id) {
        showAppAlert({
          type: "warning",
          title: "Teléfono duplicado",
          message: `Ya existe otro cliente registrado con ese teléfono: ${
            existingCustomer.name ||
            existingCustomer.razon_social ||
            "SIN NOMBRE"
          }.`,
          confirmText: "Entendido",
        });
        return;
      }

      if (!isEditing && existingCustomer?.is_points_customer === true) {
        showAppAlert({
          type: "warning",
          title: "Cliente duplicado",
          message: `Ya existe un cliente de puntos registrado con ese teléfono: ${
            existingCustomer.name || "SIN NOMBRE"
          }.`,
          confirmText: "Entendido",
        });
        return;
      }

      if (phoneWasChanged) {
        const hasFiscalData = customerToEdit?.is_billing_customer === true;

        const fiscalWarning = hasFiscalData
          ? " Este cliente también tiene datos fiscales, por lo que el teléfono fiscal asociado también se actualizará."
          : "";

        setSaving(false);

        showAppConfirm({
          type: "warning",
          title: "Confirmar cambio de teléfono",
          message: `El teléfono cambiará de ${
            originalPhone || "SIN TELÉFONO"
          } a ${
            normalizedData.phone
          }. Este dato se usa para vincular clientes de puntos con datos fiscales.${fiscalWarning} ¿Deseas continuar?`,
          confirmText: "Continuar",
          cancelText: "Cancelar",
          onConfirm: () => {
            closeAppModal();
            saveCustomer(normalizedData, existingCustomer);
          },
        });

        return;
      }

      setSaving(false);
      await saveCustomer(normalizedData, existingCustomer);
    } catch (err) {
      console.error("Error validando cliente:", err);

      showAppAlert({
        type: "danger",
        title: "No se pudo validar",
        message:
          err?.message ||
          "No se pudo validar si ya existe un cliente con ese teléfono.",
        confirmText: "Entendido",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (customerToEdit) {
      const currentPhone = normalizePhone(customerToEdit.phone || "");

      setFormData({
        name: customerToEdit.name || "",
        phone: currentPhone,
        phoneConfirm: currentPhone,
        email: customerToEdit.email || "",
        status: customerToEdit.status !== false,
      });
    } else {
      setFormData(emptyForm);
    }

    setFieldErrors({});
    setTouchedFields({});
    setSaving(false);
    closeAppModal();
  }, [isOpen, customerToEdit]);

  useEscapeKey((event) => {
    event.preventDefault();
    onClose();
  }, isOpen && !saving && !appModal.isOpen);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleRequestClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="customer-modal-title">
            {isEditing ? "Editar cliente" : "Nuevo cliente"}
          </h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={handleRequestClose}
            disabled={saving}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label>Nombre *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              disabled={saving}
              autoFocus
              className={getFieldClassName("name")}
            />

            {touchedFields.name && fieldErrors.name && (
              <span className={styles.fieldError}>{fieldErrors.name}</span>
            )}
          </div>

          <div className={styles.twoColumns}>
            <div className={styles.fieldGroup}>
              <label>Teléfono *</label>
              <input
                type="text"
                inputMode="numeric"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                onBlur={() => handleBlur("phone")}
                disabled={saving}
                maxLength={10}
                className={getFieldClassName("phone")}
              />

              {touchedFields.phone && fieldErrors.phone && (
                <span className={styles.fieldError}>{fieldErrors.phone}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label>Confirmar teléfono *</label>
              <input
                type="text"
                inputMode="numeric"
                value={formData.phoneConfirm}
                onChange={(e) => handleChange("phoneConfirm", e.target.value)}
                onBlur={() => handleBlur("phoneConfirm")}
                disabled={saving}
                maxLength={10}
                className={getFieldClassName("phoneConfirm")}
              />

              {touchedFields.phoneConfirm && fieldErrors.phoneConfirm && (
                <span className={styles.fieldError}>
                  {fieldErrors.phoneConfirm}
                </span>
              )}
            </div>
          </div>

          <div className={styles.twoColumns}>
            <div className={styles.fieldGroup}>
              <label>Correo</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                disabled={saving}
                className={getFieldClassName("email")}
              />

              {touchedFields.email && fieldErrors.email && (
                <span className={styles.fieldError}>{fieldErrors.email}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label>Estado</label>
              <select
                value={formData.status ? "active" : "inactive"}
                onChange={(e) =>
                  handleChange("status", e.target.value === "active")
                }
                disabled={saving}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleRequestClose}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={styles.saveButton}
              disabled={!canSave}
              title={
                !canSave && !saving
                  ? "Completa nombre, teléfono y confirmación correctamente."
                  : ""
              }
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        showCancel={appModal.showCancel}
        loading={appModal.loading}
        onConfirm={appModal.onConfirm || closeAppModal}
        onCancel={appModal.onCancel || closeAppModal}
        onClose={closeAppModal}
      />
    </div>
  );
};

export default CustomerModal;