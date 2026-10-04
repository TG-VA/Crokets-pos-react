import { useCallback, useEffect, useMemo, useState } from "react";

import { useBranch } from "../../../../../contexts/BranchContext";
import { getTodayDateString } from "../../../utils/invoiceFormatters";
import {
  fetchActiveBranches,
  fetchInvoicesHistory,
} from "../services/invoicesHistoryReportService";
import { fetchInvoiceItems } from "../services/invoicesHistoryDetailService";
import {
  filterInvoicesBySearch,
  getInvoicesTableColSpan,
  sumInvoicesTotal,
} from "../services/invoicesHistoryCalculationService";

export const useInvoicesHistory = () => {
  const { branch } = useBranch();
  const currentBranchId = branch?.id;

  const [invoices, setInvoices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("current");
  const [startDate, setStartDate] = useState(getTodayDateString);
  const [endDate, setEndDate] = useState(getTodayDateString);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  const loadBranches = useCallback(async () => {
    try {
      setBranches(await fetchActiveBranches());
    } catch (err) {
      console.error("Error cargando sucursales:", err);
      setBranches([]);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    if (!currentBranchId && branchFilter === "current") return;

    try {
      setLoading(true);
      setError("");

      setInvoices(
        await fetchInvoicesHistory({
          startDate,
          endDate,
          branchFilter,
          currentBranchId,
        })
      );
    } catch (err) {
      console.error("Error cargando historial de facturas:", err);
      setError("No se pudo cargar el historial de facturas.");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [currentBranchId, branchFilter, startDate, endDate]);

  const loadInvoiceDetail = async (invoice) => {
    if (!invoice?.id) return;

    try {
      setLoadingDetail(true);
      setError("");
      setSelectedInvoice(invoice);

      setInvoiceItems(await fetchInvoiceItems(invoice.id));
    } catch (err) {
      console.error("Error cargando detalle de factura:", err);
      setError("No se pudo cargar el detalle de la factura.");
      setInvoiceItems([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeInvoiceDetail = () => {
    setSelectedInvoice(null);
    setInvoiceItems([]);
  };

  useEffect(() => {
    // Carga inicial del filtro de sucursales; deuda heredada de
    // `set-state-in-effect` registrada en `KNOWN_ISSUES.md` #56.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    // El historial se recarga con cada cambio de filtro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInvoices();
  }, [loadInvoices]);

  const isGlobalView = branchFilter === "all";

  const filteredInvoices = useMemo(
    () => filterInvoicesBySearch(invoices, searchTerm),
    [invoices, searchTerm]
  );

  return {
    branch,
    branchFilter,
    branchMaxDate: new Date().toISOString().split("T")[0],
    branches,
    closeInvoiceDetail,
    endDate,
    error,
    filteredInvoices,
    invoiceItems,
    isGlobalView,
    loadInvoices,
    loadInvoiceDetail,
    loading,
    loadingDetail,
    searchTerm,
    selectedInvoice,
    setBranchFilter,
    setEndDate,
    setSearchTerm,
    setStartDate,
    startDate,
    tableColSpan: getInvoicesTableColSpan(isGlobalView),
    totalFacturado: sumInvoicesTotal(filteredInvoices),
  };
};
