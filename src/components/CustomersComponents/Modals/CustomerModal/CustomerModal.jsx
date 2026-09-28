import React, { useEffect, useMemo, useState } from "react";
import styles from "./CustomerModal.module.css";
import AppModal from "../../../AppModal/AppModal";
import { useAppModal } from "../../../../hooks/useAppModal";
import { useEscapeKey } from "../../../../hooks/useEscapeKey";
import { normalizePhoneDigits } from "../../PageCustomers/utils/customerFormatters";
import {
  createCustomer,
  findCustomerByPhone,
  resolveCustomerSaveErrorMessage,
  updateCustomer,
} from "./services/customerModalService";
import {
  CUSTOMER_TOUCHED_FIELDS,
  EMPTY_CUSTOMER_FORM,
  buildCustomerFormValues,
  buildDuplicatePhoneMessage,
  buildDuplicatePointsCustomerMessage,
  buildNormalizedCustomerData,
  buildPhoneChangeConfirmation,
  canSubmitCustomerForm,
  getCustomerSaveSuccessMessage,
  getCustomerSaveSuccessTitle,
  hasPhoneChanged,
  isEditingCustomer,
  normalizeCustomerFieldValue,
  validateCustomerValues,
} from "./services/customerModalCalculationService";

const CustomerModal = ({ isOpen, onClose, onSaved, customerToEdit }) => {
  const [formData, setFormData] = useState(EMPTY_CUSTOMER_FORM);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  const {
    appModal,
    closeAppModal,
    setAppModalLoading,
    showAppAlert,
    showAppConfirm,
  } = useAppModal();

  const isEditing = useMemo(
    () => isEditingCustomer(customerToEdit),
    [customerToEdit]
  );

  const handleRequestClose = () => {
    if (saving || appModal.isOpen) return;
    onClose();
  };

  const handleChange = (field, value) => {
    const nextFormData = {
      ...formData,
      [field]: normalizeCustomerFieldValue(field, value),
    };

    setFormData(nextFormData);
    setFieldErrors(validateCustomerValues(nextFormData));
  };

  const handleBlur = (field) => {
    setTouchedFields((prev) => ({
      ...prev,
      [field]: true,
    }));

    setFieldErrors(validateCustomerValues(formData));
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

  const currentErrors = validateCustomerValues(formData);

  const canSave = canSubmitCustomerForm({
    formData,
    errors: currentErrors,
    saving,
  });

  const saveCustomer = async (normalizedData, existingCustomer = null) => {
    try {
      setSaving(true);
      setAppModalLoading(true);

      if (isEditing) {
        await updateCustomer({
          customerId: customerToEdit.id,
          normalizedData,
        });
      } else if (existingCustomer?.id) {
        await updateCustomer({
          customerId: existingCustomer.id,
          normalizedData,
        });
      } else {
        await createCustomer(normalizedData);
      }

      try {
        await onSaved?.();
      } catch (refreshError) {
        console.error("Error actualizando listado de clientes:", refreshError);
      }

      showAppAlert({
        type: "success",
        title: getCustomerSaveSuccessTitle(isEditing),
        message: getCustomerSaveSuccessMessage(isEditing),
        confirmText: "Aceptar",
        onConfirm: () => {
          closeAppModal();
          onClose();
        },
      });
    } catch (err) {
      console.error("Error guardando cliente:", err);

      showAppAlert({
        type: "danger",
        title: "No se pudo guardar",
        message: resolveCustomerSaveErrorMessage(err),
        confirmText: "Entendido",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedData = buildNormalizedCustomerData(formData);

    const errors = validateCustomerValues(normalizedData);

    setFieldErrors(errors);
    setTouchedFields(CUSTOMER_TOUCHED_FIELDS);

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

      const phoneWasChanged = hasPhoneChanged({
        customerToEdit,
        isEditing,
        newPhone: normalizedData.phone,
      });

      const existingCustomer = await findCustomerByPhone({
        phone: normalizedData.phone,
        excludeCustomerId: isEditing ? customerToEdit.id : null,
      });

      if (isEditing && existingCustomer?.id) {
        showAppAlert({
          type: "warning",
          title: "Teléfono duplicado",
          message: buildDuplicatePhoneMessage(existingCustomer),
          confirmText: "Entendido",
        });
        return;
      }

      if (!isEditing && existingCustomer?.is_points_customer === true) {
        showAppAlert({
          type: "warning",
          title: "Cliente duplicado",
          message: buildDuplicatePointsCustomerMessage(existingCustomer),
          confirmText: "Entendido",
        });
        return;
      }

      if (phoneWasChanged) {
        setSaving(false);

        showAppConfirm({
          ...buildPhoneChangeConfirmation({
            originalPhone: normalizePhoneDigits(customerToEdit?.phone || ""),
            newPhone: normalizedData.phone,
            hasFiscalData: customerToEdit?.is_billing_customer === true,
          }),
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

    setFormData(buildCustomerFormValues(customerToEdit));

    setFieldErrors({});
    setTouchedFields({});
    setSaving(false);
    closeAppModal();
  }, [isOpen, customerToEdit]);

  useEscapeKey(
    (event) => {
      event.preventDefault();
      onClose();
    },
    isOpen && !saving && !appModal.isOpen
  );

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
