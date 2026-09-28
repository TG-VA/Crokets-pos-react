import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppModal } from "../../../../../hooks/useAppModal";
import { useEscapeKey } from "../../../../../hooks/useEscapeKey";
import { normalizePhoneDigits } from "../../../PageCustomers/utils/customerFormatters";
import {
  createCustomer,
  findCustomerByPhone,
  resolveCustomerSaveErrorMessage,
  updateCustomer,
} from "../services/customerModalService";
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
  getCustomerModalTitle,
  hasPhoneChanged,
  isEditingCustomer,
  normalizeCustomerFieldValue,
  validateCustomerValues,
} from "../services/customerModalCalculationService";

export const useCustomerModal = ({
  isOpen,
  onClose,
  onSaved,
  customerToEdit,
}) => {
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

  const handleRequestClose = useCallback(() => {
    if (saving || appModal.isOpen) return;
    onClose();
  }, [appModal.isOpen, onClose, saving]);

  const handleChange = useCallback(
    (field, value) => {
      const nextFormData = {
        ...formData,
        [field]: normalizeCustomerFieldValue(field, value),
      };

      setFormData(nextFormData);
      setFieldErrors(validateCustomerValues(nextFormData));
    },
    [formData]
  );

  const handleBlur = useCallback(
    (field) => {
      setTouchedFields((prev) => ({
        ...prev,
        [field]: true,
      }));

      setFieldErrors(validateCustomerValues(formData));
    },
    [formData]
  );

  const currentErrors = validateCustomerValues(formData);

  const canSave = canSubmitCustomerForm({
    formData,
    errors: currentErrors,
    saving,
  });

  const saveCustomer = useCallback(
    async (normalizedData, existingCustomer = null) => {
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
          console.error(
            "Error actualizando listado de clientes:",
            refreshError
          );
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
    },
    [
      closeAppModal,
      customerToEdit,
      isEditing,
      onClose,
      onSaved,
      setAppModalLoading,
      showAppAlert,
    ]
  );

  const handleSubmit = useCallback(
    async (event) => {
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
    },
    [
      closeAppModal,
      customerToEdit,
      formData,
      isEditing,
      saveCustomer,
      showAppAlert,
      showAppConfirm,
    ]
  );

  useEffect(() => {
    if (!isOpen) return;

    setFormData(buildCustomerFormValues(customerToEdit));

    setFieldErrors({});
    setTouchedFields({});
    setSaving(false);
    closeAppModal();
    // `closeAppModal` se recrea en cada render de useAppModal, por lo que
    // incluirla en las dependencias reiniciaria el formulario en cada
    // pulsacion. Depender solo de la apertura y del cliente editado mantiene el
    // reinicio al abrir el modal, como antes de extraer el hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customerToEdit]);

  useEscapeKey(
    (event) => {
      event.preventDefault();
      onClose();
    },
    isOpen && !saving && !appModal.isOpen
  );

  return {
    appModal,
    canSave,
    closeAppModal,
    currentErrors,
    fieldErrors,
    formData,
    handleBlur,
    handleChange,
    handleRequestClose,
    handleSubmit,
    isEditing,
    modalTitle: getCustomerModalTitle(isEditing),
    saving,
    touchedFields,
  };
};
