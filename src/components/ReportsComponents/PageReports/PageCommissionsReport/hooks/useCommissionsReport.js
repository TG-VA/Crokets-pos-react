/**
 * useCommissionsReport.js
 * Hook principal para el estado, filtros y agregaciones del Reporte de Comisiones.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getBranchesList,
  getCashiersList,
  getDepartmentsList,
  fetchCommissionsData,
} from "../services/commissionsReportService";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("cashiers");

  // Catálogos
  const [branchesList, setBranchesList] = useState([]);
  const [cashiersList, setCashiersList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  // Datos
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

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
        console.error("Error al cargar catálogos en useCommissionsReport:", err);
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

  // Carga de datos de ventas comisionables
  const loadCommissions = useCallback(async () => {
    if (!startDate || !endDate) return;

    try {
      setIsLoading(true);
      setError(null);

      const startDateIso = new Date(startDate);
      startDateIso.setHours(0, 0, 0, 0);
      const endDateIso = new Date(endDate);
      endDateIso.setHours(23, 59, 59, 999);

      const result = await fetchCommissionsData({
        startDateIso: startDateIso.toISOString(),
        endDateIso: endDateIso.toISOString(),
        branchId: selectedBranchId,
        cashierId: selectedCashierId,
        departmentId: selectedDepartmentId,
      });

      setRawData(result.detailedRows || []);
    } catch (err) {
      console.error("Error al cargar comisiones:", err);
      setError("No se pudieron cargar los datos de comisiones. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedBranchId, selectedCashierId, selectedDepartmentId]);

  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  // Filtrado reactivo en memoria por término de búsqueda
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rawData;
    const term = searchTerm.toLowerCase().trim();

    return rawData.filter((row) => {
      const matchProduct = (row.productName || "").toLowerCase().includes(term);
      const matchBarcode = (row.barcode || "").toLowerCase().includes(term);
      const matchCashier = (row.cashierName || "").toLowerCase().includes(term);
      const matchTicket = (row.ticketNumber || "").toLowerCase().includes(term);
      return matchProduct || matchBarcode || matchCashier || matchTicket;
    });
  }, [rawData, searchTerm]);

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

  // Indicador de filtros activos
  const hasActiveFilters = Boolean(
    activeDatePreset !== "today" ||
      selectedBranchId !== "ALL" ||
      selectedCashierId !== "ALL" ||
      selectedDepartmentId !== "ALL" ||
      (searchTerm || "").trim()
  );

  const handleClearFilters = useCallback(() => {
    setQuickDatePreset("today");
    setSelectedBranchId(initialBranchId || "ALL");
    setSelectedCashierId("ALL");
    setSelectedDepartmentId("ALL");
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
          : branchesList.find((b) => b.id === selectedBranchId)?.name || "Sucursal";

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
    error,
    isExporting,
    hasActiveFilters,
    handleClearFilters,
    reloadReport: loadCommissions,
    handleExportExcel,
    selectedCashierForModal,
    isModalOpen,
    handleOpenCashierModal,
    handleCloseCashierModal,
  };
};
