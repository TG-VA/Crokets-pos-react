/**
 * useCommissionsReport.js
 * Hook principal para el estado, filtros y agregaciones del Reporte de Comisiones.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getBranchesList,
  getCashiersList,
  getDepartmentsList,
  loadCommissionsReport,
} from "../services/commissionsReportService";
import { useRequestStatus } from "../../../../../hooks/useRequestStatus";

// El rango se acota a los extremos del día, como antes de extraer la orquestacion
// de la carga al servicio.
const toIsoRange = (startDate, endDate) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return { startDateIso: start.toISOString(), endDateIso: end.toISOString() };
};
import {
  aggregateCashierCommissions,
  aggregateProductCommissions,
  calculateGlobalKpis,
} from "../services/commissionsCalculationService";
import { exportCommissionsReportToExcel } from "../utils/commissionsReportExportUtils";

export const useCommissionsReport = (initialBranchId = "ALL") => {
  // Rango de fechas por defecto: Hoy
  const [dateRange, setDateRange] = useState(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return [start, end];
  });

  const [activeDatePreset, setActiveDatePreset] = useState("today");
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  const [selectedCashierId, setSelectedCashierId] = useState("ALL");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("ALL");
  const [selectedDiscountFilter, setSelectedDiscountFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("cashiers");

  // Catálogos
  const [branchesList, setBranchesList] = useState([]);
  const [cashiersList, setCashiersList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  // Datos
  const [rawData, setRawData] = useState([]);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);

  // Modal de Detalle de Cajero
  const [selectedCashierForModal, setSelectedCashierForModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [startDate, endDate] = dateRange;

  // Cargar catálogos iniciales
  useEffect(() => {
    let isMounted = true;
    const loadCatalogs = async () => {
      try {
        const [branches, cashiers, depts] = await Promise.all([
          getBranchesList(),
          getCashiersList(),
          getDepartmentsList(),
        ]);
        if (isMounted) {
          setBranchesList(branches);
          setCashiersList(cashiers);
          setDepartmentsList(depts);
        }
      } catch (err) {
        console.error(
          "Error al cargar catálogos en useCommissionsReport:",
          err
        );
      }
    };
    loadCatalogs();
    return () => {
      isMounted = false;
    };
  }, []);

  // Preset rápido de fechas
  const setQuickDatePreset = useCallback((preset) => {
    setActiveDatePreset(preset);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case "this_week": {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;
      }
      case "this_fortnight": {
        const currentDay = now.getDate();
        if (currentDay <= 15) {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          start.setHours(0, 0, 0, 0);
          end = new Date(now.getFullYear(), now.getMonth(), 15);
          end.setHours(23, 59, 59, 999);
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 16);
          start.setHours(0, 0, 0, 0);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
        }
        break;
      }
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        break;
    }

    setDateRange([start, end]);
  }, []);

  const handleDateRangeChange = useCallback((update) => {
    setActiveDatePreset("custom");
    setDateRange(update);
  }, []);

  // La carga se deriva de la clave pedida en lugar de marcarse con un
  // setIsLoading(true) sincrono, que provocaba un re-render en cascada.
  const requestKey = useMemo(
    () =>
      `${startDate}|${endDate}|${selectedBranchId}|${selectedCashierId}|${selectedDepartmentId}`,
    [
      startDate,
      endDate,
      selectedBranchId,
      selectedCashierId,
      selectedDepartmentId,
    ]
  );
  const { isLoading, isStale, markSettled } = useRequestStatus(requestKey);

  // El error de una peticion anterior no debe mostrarse mientras corre la nueva.
  const visibleError = isStale ? null : error;

  // Carga de datos de ventas comisionables
  const loadCommissions = useCallback(
    () =>
      loadCommissionsReport(
        {
          startDateIso: toIsoRange(startDate, endDate).startDateIso,
          endDateIso: toIsoRange(startDate, endDate).endDateIso,
          branchId: selectedBranchId,
          cashierId: selectedCashierId,
          departmentId: selectedDepartmentId,
        },
        {
          onData: (result) => {
            setRawData(result.detailedRows || []);
            setError(null);
            setSyncedAt(new Date().toISOString());
          },
          onError: setError,
          onSettled: markSettled,
        }
      ),
    [
      startDate,
      endDate,
      selectedBranchId,
      selectedCashierId,
      selectedDepartmentId,
      markSettled,
    ]
  );

  useEffect(() => {
    if (!startDate || !endDate) return undefined;

    let cancelled = false;
    const { startDateIso, endDateIso } = toIsoRange(startDate, endDate);

    loadCommissionsReport(
      {
        startDateIso,
        endDateIso,
        branchId: selectedBranchId,
        cashierId: selectedCashierId,
        departmentId: selectedDepartmentId,
      },
      {
        onData: (result) => {
          if (cancelled) return;
          setRawData(result.detailedRows || []);
          setError(null);
          setSyncedAt(new Date().toISOString());
        },
        onError: (message) => {
          if (cancelled) return;
          setError(message);
        },
        onSettled: () => {
          if (cancelled) return;
          markSettled();
        },
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    startDate,
    endDate,
    selectedBranchId,
    selectedCashierId,
    selectedDepartmentId,
    markSettled,
  ]);

  // Filtrado reactivo en memoria por descuento y término de búsqueda
  const filteredRows = useMemo(() => {
    let rows = rawData;

    if (selectedDiscountFilter === "WITH_DISCOUNT") {
      rows = rows.filter((row) => row.hasDiscount);
    } else if (selectedDiscountFilter === "WITHOUT_DISCOUNT") {
      rows = rows.filter((row) => !row.hasDiscount);
    }

    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase().trim();

    return rows.filter((row) => {
      const matchProduct = (row.productName || "").toLowerCase().includes(term);
      const matchBarcode = (row.barcode || "").toLowerCase().includes(term);
      const matchCashier = (row.cashierName || "").toLowerCase().includes(term);
      const matchTicket = (row.ticketNumber || "").toLowerCase().includes(term);
      return matchProduct || matchBarcode || matchCashier || matchTicket;
    });
  }, [rawData, searchTerm, selectedDiscountFilter]);

  // Agregaciones
  const cashierSummaries = useMemo(() => {
    return aggregateCashierCommissions(filteredRows);
  }, [filteredRows]);

  const productSummaries = useMemo(() => {
    return aggregateProductCommissions(filteredRows);
  }, [filteredRows]);

  const kpis = useMemo(() => {
    return calculateGlobalKpis(cashierSummaries, filteredRows);
  }, [cashierSummaries, filteredRows]);

  // Contador de filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeDatePreset !== "today") count++;
    if (selectedBranchId !== "ALL") count++;
    if (selectedCashierId !== "ALL") count++;
    if (selectedDepartmentId !== "ALL") count++;
    if (selectedDiscountFilter !== "ALL") count++;
    if ((searchTerm || "").trim()) count++;
    return count;
  }, [
    activeDatePreset,
    selectedBranchId,
    selectedCashierId,
    selectedDepartmentId,
    selectedDiscountFilter,
    searchTerm,
  ]);

  const hasActiveFilters = activeFiltersCount > 0;

  const handleClearFilters = useCallback(() => {
    setQuickDatePreset("today");
    setSelectedBranchId(initialBranchId || "ALL");
    setSelectedCashierId("ALL");
    setSelectedDepartmentId("ALL");
    setSelectedDiscountFilter("ALL");
    setSearchTerm("");
  }, [setQuickDatePreset, initialBranchId]);

  // Modal handlers
  const handleOpenCashierModal = useCallback((cashier) => {
    setSelectedCashierForModal(cashier);
    setIsModalOpen(true);
  }, []);

  const handleCloseCashierModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedCashierForModal(null);
  }, []);

  // Exportar Excel general
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const branchName =
        selectedBranchId === "ALL"
          ? "Todas las sucursales"
          : branchesList.find((b) => b.id === selectedBranchId)?.name ||
            "Sucursal";

      await exportCommissionsReportToExcel({
        cashierSummaries,
        productSummaries,
        detailedRows: filteredRows,
        kpis,
        branchName,
        startDate,
        endDate,
      });
    } catch (err) {
      console.error("Error al exportar reporte de comisiones:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    dateRange,
    startDate,
    endDate,
    handleDateRangeChange,
    activeDatePreset,
    setQuickDatePreset,
    selectedBranchId,
    setSelectedBranchId,
    selectedCashierId,
    setSelectedCashierId,
    selectedDepartmentId,
    setSelectedDepartmentId,
    selectedDiscountFilter,
    setSelectedDiscountFilter,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    branchesList,
    cashiersList,
    departmentsList,
    filteredRows,
    cashierSummaries,
    productSummaries,
    kpis,
    isLoading,
    error: visibleError,
    syncedAt,
    isExporting,
    hasActiveFilters,
    activeFiltersCount,
    handleClearFilters,
    reloadReport: loadCommissions,
    handleExportExcel,
    selectedCashierForModal,
    isModalOpen,
    handleOpenCashierModal,
    handleCloseCashierModal,
  };
};
