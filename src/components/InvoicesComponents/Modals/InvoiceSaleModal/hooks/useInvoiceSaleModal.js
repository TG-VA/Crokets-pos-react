import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppModal } from "../../../../../hooks/useAppModal";
import { useAuth } from "../../../../../contexts/AuthContext";
import { useBranch } from "../../../../../contexts/BranchContext";
import {
  fetchCfdiUses,
  lookupPostalCode,
} from "../../../services/invoicesCatalogService";
import { isFiscalCustomerComplete } from "../../../utils/invoiceFormatters";
import {
  fetchExistingInvoiceId,
  fetchFiscalCustomers,
  fetchSaleInvoiceData,
  insertInvoice,
  insertInvoiceItems,
  insertInvoicePayments,
} from "../services/invoiceSaleService";
import {
  buildInvoiceConfirmMessage,
  buildInvoiceItems,
  buildInvoicePayments,
  buildInvoicePayload,
  buildInvoiceTotals,
  filterFiscalCustomers,
  getCfdiUseDescription,
  validateInvoiceBeforeSave,
} from "../services/invoiceSaleCalculationService";

const POSTAL_CODE_LENGTH = 5;

/**
 * Estado y flujo de facturacion de una venta: carga de conceptos, pagos,
 * clientes fiscales y usos CFDI, y escritura de la factura interna.
 */
export const useInvoiceSaleModal = ({ isOpen, onClose, sale, onSaved }) => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const [saleDetails, setSaleDetails] = useState([]);
  const [salePayments, setSalePayments] = useState([]);
  const [fiscalCustomers, setFiscalCustomers] = useState([]);
  const [cfdiUses, setCfdiUses] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCfdiUse, setSelectedCfdiUse] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  const [postalInfo, setPostalInfo] = useState(null);
  const [postalLoading, setPostalLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { appModal, closeAppModal, showAppAlert, showAppConfirm } =
    useAppModal();

  const branchId = branch?.id;
  const userId = user?.id;
  const saleId = sale?.id;
  const saleCustomer = sale?.customers || null;

  const resolvePostalCode = useCallback(async (postalCode) => {
    const cp = String(postalCode || "")
      .replace(/\D/g, "")
      .slice(0, POSTAL_CODE_LENGTH);

    setPostalInfo(null);

    if (cp.length !== POSTAL_CODE_LENGTH) return;

    try {
      setPostalLoading(true);

      const found = await lookupPostalCode(cp);

      setPostalInfo(found || null);
    } catch (err) {
      console.error("Error consultando código postal:", err);
      setPostalInfo(null);
    } finally {
      setPostalLoading(false);
    }
  }, []);

  const loadSaleData = useCallback(async () => {
    if (!saleId) return;

    try {
      setLoading(true);
      setError("");

      const { saleDetails: details, salePayments: payments } =
        await fetchSaleInvoiceData(saleId);

      setSaleDetails(details);
      setSalePayments(payments);
    } catch (err) {
      console.error("Error cargando información de venta:", err);
      setError("No se pudo cargar la información de la venta.");
      setSaleDetails([]);
      setSalePayments([]);
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  const loadFiscalCustomers = useCallback(async () => {
    try {
      setLoadingCustomers(true);

      setFiscalCustomers(await fetchFiscalCustomers());
    } catch (err) {
      console.error("Error cargando clientes fiscales:", err);
      setError("No se pudieron cargar los clientes fiscales.");
      setFiscalCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  const loadCfdiUsesList = useCallback(async () => {
    try {
      setCfdiUses(await fetchCfdiUses());
    } catch (err) {
      console.error("Error cargando usos CFDI:", err);
      setError("No se pudieron cargar los usos CFDI.");
      setCfdiUses([]);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Deuda heredada de `set-state-in-effect` (`KNOWN_ISSUES.md` #56): el
    // modal reinicia su contexto cada vez que se abre o cambia la venta.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError("");
    setCustomerSearch("");
    setSaleDetails([]);
    setSalePayments([]);
    setSelectedCustomer(null);
    setSelectedCfdiUse("");
    setPostalInfo(null);

    if (isFiscalCustomerComplete(saleCustomer)) {
      setSelectedCustomer(saleCustomer);
      setSelectedCfdiUse(saleCustomer.cfdi_use || "");
      resolvePostalCode(saleCustomer.postal_code);
    }

    loadSaleData();
    loadFiscalCustomers();
    loadCfdiUsesList();
    // El modal se reinicia por apertura y por venta, no por identidad de las
    // consultas: incluirlas volveria a recargar los catalogos en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, saleId]);

  useEffect(() => {
    if (selectedCustomer?.cfdi_use) {
      // Deuda heredada de `set-state-in-effect` (`KNOWN_ISSUES.md` #56): el uso
      // CFDI y el C.P. se derivan del cliente elegido.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCfdiUse(selectedCustomer.cfdi_use);
    }

    if (selectedCustomer?.postal_code) {
      resolvePostalCode(selectedCustomer.postal_code);
    } else {
      setPostalInfo(null);
    }
  }, [selectedCustomer, resolvePostalCode]);

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
        onClose();
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

  const filteredFiscalCustomers = useMemo(
    () => filterFiscalCustomers(fiscalCustomers, customerSearch),
    [fiscalCustomers, customerSearch]
  );

  const invoiceTotals = useMemo(() => buildInvoiceTotals(sale), [sale]);

  const selectedCustomerReady = isFiscalCustomerComplete(selectedCustomer);

  const selectedCfdiDescription = getCfdiUseDescription(
    cfdiUses,
    selectedCfdiUse
  );

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSelectedCfdiUse(customer.cfdi_use || "");
  };

  const handleChangeCustomer = () => {
    setSelectedCustomer(null);
    setSelectedCfdiUse("");
    setPostalInfo(null);
  };

  const executeSaveInvoice = async () => {
    try {
      setSaving(true);
      setError("");

      const existingInvoiceId = await fetchExistingInvoiceId(saleId);

      if (existingInvoiceId) {
        setError("Esta venta ya tiene una factura registrada.");
        return;
      }

      const invoiceId = await insertInvoice(
        buildInvoicePayload({
          sale,
          customerId: selectedCustomer.id,
          branchId,
          userId,
          cfdiUse: selectedCfdiUse,
          totals: invoiceTotals,
        })
      );

      await insertInvoiceItems(
        buildInvoiceItems({ saleDetails, invoiceId, branchId })
      );

      const invoicePayments = buildInvoicePayments({ salePayments, invoiceId });

      if (invoicePayments.length > 0) {
        await insertInvoicePayments(invoicePayments);
      }

      if (onSaved) await onSaved();

      showAppAlert({
        type: "success",
        title: "Factura generada",
        message: "Factura interna generada correctamente.",
        confirmText: "Aceptar",
        onConfirm: () => {
          closeAppModal();
          onClose();
        },
      });
    } catch (err) {
      console.error("Error generando factura interna:", err);
      setError("No se pudo generar la factura interna.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInvoice = () => {
    const validationError = validateInvoiceBeforeSave({
      sale,
      branchId,
      userId,
      customer: selectedCustomer,
      cfdiUse: selectedCfdiUse,
      saleDetails,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    showAppConfirm({
      type: "warning",
      title: "Generar factura interna",
      message: buildInvoiceConfirmMessage({
        sale,
        customer: selectedCustomer,
        cfdiUse: selectedCfdiUse,
      }),
      confirmText: "Sí, generar",
      cancelText: "Cancelar",
      onConfirm: executeSaveInvoice,
    });
  };

  return {
    appModal,
    cfdiUses,
    closeAppModal,
    customerSearch,
    error,
    filteredFiscalCustomers,
    handleAppModalConfirm: appModal.onConfirm || closeAppModal,
    handleChangeCustomer,
    handleSelectCustomer,
    handleSaveInvoice,
    invoiceTotals,
    loading,
    loadingCustomers,
    postalInfo,
    postalLoading,
    saleDetails,
    saveDisabled:
      saving ||
      loading ||
      postalLoading ||
      !selectedCustomerReady ||
      !selectedCfdiUse,
    saving,
    selectedCfdiDescription,
    selectedCfdiUse,
    selectedCustomer,
    selectedCustomerReady,
    setCustomerSearch,
    setSelectedCfdiUse,
  };
};
