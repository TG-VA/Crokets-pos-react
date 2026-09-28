import { useCallback, useEffect, useMemo, useState } from "react";

import { useBranch } from "../../../../../contexts/BranchContext";
import { subscribeToBranchInvoiceChanges } from "../../../services/invoicesRealtimeService";
import { getTodayDateString } from "../../../utils/invoiceFormatters";
import { fetchCompletedBranchSales } from "../services/invoicesPendingService";
import {
  buildSalesDayRange,
  filterPendingSales,
  filterSalesWithoutInvoice,
} from "../services/invoicesPendingCalculationService";

export const useInvoicesPending = () => {
  const { branch } = useBranch();
  const branchId = branch?.id;

  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState(getTodayDateString);

  const dayRange = useMemo(() => buildSalesDayRange(dateFilter), [dateFilter]);

  const loadPendingSales = useCallback(async () => {
    if (!branchId) return;

    try {
      setLoadingSales(true);
      setError("");

      const completedSales = await fetchCompletedBranchSales({
        branchId,
        dayRange,
      });

      setSales(filterSalesWithoutInvoice(completedSales));
    } catch (err) {
      console.error("Error cargando ventas por facturar:", err);
      setError("No se pudieron cargar las ventas por facturar.");
      setSales([]);
    } finally {
      setLoadingSales(false);
    }
  }, [branchId, dayRange]);

  useEffect(() => {
    // Carga inicial y recarga al cambiar el dia; deuda heredada de
    // `set-state-in-effect` registrada en `KNOWN_ISSUES.md` #56.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPendingSales();
  }, [loadPendingSales]);

  useEffect(() => {
    return subscribeToBranchInvoiceChanges({
      branchId,
      channelName: `invoices-pending-${branchId}`,
      onChange: loadPendingSales,
    });
  }, [branchId, loadPendingSales]);

  const filteredSales = useMemo(
    () => filterPendingSales(sales, searchTerm),
    [sales, searchTerm]
  );

  const handleInvoiceSale = (sale) => {
    setSelectedSale(sale);
    setIsInvoiceModalOpen(true);
  };

  const handleCloseInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setSelectedSale(null);
  };

  return {
    dateFilter,
    error,
    filteredSales,
    handleCloseInvoiceModal,
    handleInvoiceSale,
    handleInvoiceSaved: loadPendingSales,
    isInvoiceModalOpen,
    loadPendingSales,
    loadingSales,
    searchTerm,
    selectedSale,
    setDateFilter,
    setSearchTerm,
  };
};
