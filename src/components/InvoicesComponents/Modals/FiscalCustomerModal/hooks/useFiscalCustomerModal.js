import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppModal } from "../../../../../hooks/useAppModal";
import {
  fetchCfdiUses,
  fetchTaxRegimes,
  lookupPostalCode,
} from "../../../services/invoicesCatalogService";
import {
  getFiscalFieldStatus,
  isFiscalCustomerFormValid,
  onlyDigits,
  validateFiscalCustomerForm,
} from "../../../services/fiscalValidationService";
import {
  getFiscalCustomerErrorMessage,
  saveFiscalCustomer,
  searchFiscalCustomerCandidates,
} from "../services/fiscalCustomerService";
import {
  ALL_FISCAL_FIELDS_TOUCHED,
  EMPTY_FISCAL_FORM,
  buildFiscalConfirmMessage,
  buildFiscalCustomerPayload,
  buildFiscalFormFromCustomer,
  buildNormalizedFiscalValues,
  normalizeFiscalField,
} from "../services/fiscalCustomerCalculationService";

const POSTAL_CODE_LENGTH = 5;

export const useFiscalCustomerModal = ({
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
  const [form, setForm] = useState(EMPTY_FISCAL_FORM);
  const [touched, setTouched] = useState({});
  const [postalInfo, setPostalInfo] = useState(null);
  const [postalLoading, setPostalLoading] = useState(false);
  const [postalError, setPostalError] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { appModal, closeAppModal, showAppConfirm } = useAppModal();

  const isEditMode = !!customerToEdit?.id;

  const resolvePostalCode = useCallback(async (postalCode) => {
    const cp = onlyDigits(postalCode).slice(0, POSTAL_CODE_LENGTH);

    setPostalInfo(null);
    setPostalError("");

    if (cp.length !== POSTAL_CODE_LENGTH) return;

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

  const loadCatalogs = useCallback(async () => {
    try {
      const [uses, regimes] = await Promise.all([
        fetchCfdiUses(),
        fetchTaxRegimes(),
      ]);

      setCfdiUses(uses);
      setTaxRegimes(regimes);
    } catch (err) {
      console.error("Error cargando catálogos fiscales:", err);
      setError("No se pudieron cargar los catálogos fiscales.");
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Deuda heredada de `set-state-in-effect` (`KNOWN_ISSUES.md` #56): el
    // reinicio del formulario depende de la apertura y del cliente a editar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCatalogs();

    if (customerToEdit?.id) {
      const postalCode = onlyDigits(customerToEdit.postal_code || "").slice(
        0,
        POSTAL_CODE_LENGTH
      );

      setMode("form");
      setTouched({});
      setForm(buildFiscalFormFromCustomer(customerToEdit));

      resolvePostalCode(postalCode);
    } else {
      setMode("search");
      setSearchTerm("");
      setMatches([]);
      setHasSearched(false);
      setTouched({});
      setForm(EMPTY_FISCAL_FORM);
      setPostalInfo(null);
      setPostalError("");
    }

    setError("");
  }, [isOpen, customerToEdit, loadCatalogs, resolvePostalCode]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscKey = (event) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      event.stopPropagation();

      if (appModal.isOpen) {
        closeAppModal();
        return;
      }

      if (!saving) {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleEscKey, true);

    return () => {
      document.removeEventListener("keydown", handleEscKey, true);
    };
    // `useAppModal` recrea sus funciones en cada render, asi que depender de
    // `closeAppModal` reescribiria el listener en cada actualizacion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, appModal.isOpen, saving, onClose]);

  const isFormValid = isFiscalCustomerFormValid(form, postalInfo, postalError);

  const fieldStatus = useMemo(
    () => getFiscalFieldStatus(form, postalInfo, postalError),
    [form, postalInfo, postalError]
  );

  const handleSearchTermChange = (value) => {
    setSearchTerm(value);
    setHasSearched(false);
  };

  const handleSearch = async () => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      setError("Ingresa teléfono, correo, RFC o razón social para buscar.");
      setHasSearched(false);
      return;
    }

    try {
      setLoadingSearch(true);
      setError("");

      setMatches(await searchFiscalCustomerCandidates(normalizedSearch));
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
    const postalCode = onlyDigits(customer.postal_code || "").slice(
      0,
      POSTAL_CODE_LENGTH
    );

    setForm(
      buildFiscalFormFromCustomer(customer, { fallbackEmail: customer.email })
    );

    setTouched({});
    setMode("form");
    setError("");
    resolvePostalCode(postalCode);
  };

  const handleCreateNew = () => {
    setForm(EMPTY_FISCAL_FORM);
    setTouched({});
    setPostalInfo(null);
    setPostalError("");
    setMode("form");
    setError("");
  };

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "postal_code") {
      setPostalInfo(null);
      setPostalError("");

      const cp = onlyDigits(value).slice(0, POSTAL_CODE_LENGTH);
      if (cp.length === POSTAL_CODE_LENGTH) {
        resolvePostalCode(cp);
      }
    }

    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
    setError("");
  };

  const handleChange = (field, rawValue) => {
    updateField(field, normalizeFiscalField(field, rawValue));
  };

  const executeSaveFiscalCustomer = async (values) => {
    try {
      setSaving(true);
      setError("");

      await saveFiscalCustomer({
        customerId: form.customerId,
        payload: buildFiscalCustomerPayload(values, form),
      });

      if (onSaved) await onSaved();
      onClose();
    } catch (err) {
      console.error("Error guardando cliente fiscal:", err);
      setError(getFiscalCustomerErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const validationError = validateFiscalCustomerForm(
      form,
      postalInfo,
      postalError
    );

    if (validationError) {
      setError(validationError);
      setTouched(ALL_FISCAL_FIELDS_TOUCHED);
      return;
    }

    const values = buildNormalizedFiscalValues(form);

    showAppConfirm({
      type: "warning",
      title: "Guardar datos fiscales",
      message: buildFiscalConfirmMessage(values, postalInfo),
      confirmText: "Sí, guardar",
      cancelText: "Cancelar",
      onConfirm: () => executeSaveFiscalCustomer(values),
    });
  };

  return {
    appModal,
    cfdiUses,
    closeAppModal,
    error,
    fieldStatus,
    form,
    handleAppModalConfirm: appModal.onConfirm,
    handleChange,
    handleCreateNew,
    handleSave,
    handleSearch,
    handleSearchTermChange,
    handleSelectCustomer,
    hasSearched,
    isEditMode,
    isFormValid,
    loadingSearch,
    matches,
    mode,
    postalError,
    postalInfo,
    postalLoading,
    saveDisabled: saving || postalLoading || !isFormValid,
    saving,
    searchTerm,
    setMode,
    taxRegimes,
    touched,
  };
};
