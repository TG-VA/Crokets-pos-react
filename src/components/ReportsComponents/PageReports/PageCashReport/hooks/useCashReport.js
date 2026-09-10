import { useState, useEffect, useCallback, useMemo } from "react";
import { useBranch } from "../../../../../contexts/BranchContext";
import {
  fetchBranchesList,
  fetchCashiersList,
  fetchCashSessions,
  fetchCashMovements,
  fetchPaymentMethodsSummary,
  fetchCashSessionDetail,
  calculateCashReportKpis,
  calculateCashierDiscrepancies,
} from "../services/cashReportService";
import { exportCashReportToExcel } from "../utils/cashReportExportUtils";
import { usePagination } from "../../../../../hooks/usePagination";

export const ITEMS_PER_PAGE = 5;

export const useCashReport = () => {
  const { branch } = useBranch();

  // Estados de filtros
  const [branchesList, setBranchesList] = useState([]);
  const [cashiersList, setCashiersList] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(branch?.id || "ALL");
  const [selectedCashierId, setSelectedCashierId] = useState("ALL");
  const [sessionStatus, setSessionStatus] = useState("ALL");
  const [movementType, setMovementType] = useState("ALL");

  // Rango de fechas (Por defecto: Hoy)
  const today = new Date();
  const [dateRange, setDateRange] = useState([today, today]);
  const [activeDatePreset, setActiveDatePreset] = useState("today");
  const [startDate, endDate] = dateRange;

  // Pestaña activa
  const [activeTab, setActiveTab] = useState("sessions"); // "sessions" | "movements" | "payments" | "audit"

  // Datos del reporte
  const [sessions, setSessions] = useState([]);
  const [movements, setMovements] = useState([]);
  const [paymentMethodsSummary, setPaymentMethodsSummary] = useState([]);
  
  // Estados de carga y error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);

  // Paginación de sesiones y movimientos (estado centralizado compartido con las tablas)
  const {
    currentPage: currentSessionsPage,
    totalPages: totalSessionsPages,
    pageItems: pageSessions,
    resetPagination: resetSessionsPagination,
    handlePageChange: handleSessionsPageChange,
  } = usePagination({
    totalItems: sessions.length,
    defaultPageSize: ITEMS_PER_PAGE,
    pageSizeOptions: [ITEMS_PER_PAGE],
  });

  const {
    currentPage: currentMovementsPage,
    totalPages: totalMovementsPages,
    pageItems: pageMovements,
    resetPagination: resetMovementsPagination,
    handlePageChange: handleMovementsPageChange,
  } = usePagination({
    totalItems: movements.length,
    defaultPageSize: ITEMS_PER_PAGE,
    pageSizeOptions: [ITEMS_PER_PAGE],
  });

  const paginatedSessions = pageSessions(sessions);
  const paginatedMovements = pageMovements(movements);

  // Modal de detalle de sesión
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);

  // Sincronizar sucursal del contexto
  useEffect(() => {
    if (branch?.id) {
      setSelectedBranchId(branch.id);
    }
  }, [branch?.id]);

  // Cargar catálogos iniciales
  useEffect(() => {
    let isMounted = true;

    const loadInitialCatalogs = async () => {
      try {
        const [branches, cashiers] = await Promise.all([
          fetchBranchesList(),
          fetchCashiersList(),
        ]);

        if (isMounted) {
          setBranchesList(branches);
          setCashiersList(cashiers);
        }
      } catch (err) {
        console.error("Error cargando catálogos iniciales de caja:", err);
      }
    };

    loadInitialCatalogs();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cargar datos del reporte
  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [sessionsData, movementsData, paymentsData] = await Promise.all([
        fetchCashSessions({
          branchId: selectedBranchId,
          startDate,
          endDate,
          cashierId: selectedCashierId,
          sessionStatus,
        }),
        fetchCashMovements({
          branchId: selectedBranchId,
          startDate,
          endDate,
          cashierId: selectedCashierId,
          movementType,
        }),
        fetchPaymentMethodsSummary({
          branchId: selectedBranchId,
          startDate,
          endDate,
        }),
      ]);

      setSessions(sessionsData);
      setMovements(movementsData);
      setPaymentMethodsSummary(paymentsData);
      resetSessionsPagination();
      resetMovementsPagination();
      setSyncedAt(new Date().toISOString());
    } catch (err) {
      console.error("Error al cargar datos del reporte de caja:", err);
      setError("No se pudieron cargar los datos del reporte de caja. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, startDate, endDate, selectedCashierId, sessionStatus, movementType, resetSessionsPagination, resetMovementsPagination]);

  // Recargar al cambiar filtros clave
  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Presets rápidos de fechas
  const setQuickDatePreset = (preset) => {
    setActiveDatePreset(preset);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case "today":
        start = new Date(now);
        end = new Date(now);
        break;
      case "yesterday": {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        start = y;
        end = new Date(y);
        break;
      }
      case "this_week": {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes
        const mon = new Date(now);
        mon.setDate(diff);
        start = mon;
        end = new Date();
        break;
      }
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        break;
    }

    setDateRange([start, end]);
  };

  const handleDateRangeChange = (update) => {
    setActiveDatePreset("custom");
    setDateRange(update);
  };

  // Limpiar filtros a valores por defecto
  const handleClearFilters = () => {
    const now = new Date();
    setActiveDatePreset("today");
    setDateRange([now, now]);
    setSelectedBranchId(branch?.id || "ALL");
    setSelectedCashierId("ALL");
    setSessionStatus("ALL");
    setMovementType("ALL");
  };

  // KPIs calculados
  const kpis = useMemo(() => {
    return calculateCashReportKpis(sessions, movements, paymentMethodsSummary);
  }, [sessions, movements, paymentMethodsSummary]);

  // Auditoría por cajero
  const cashierAudit = useMemo(() => {
    return calculateCashierDiscrepancies(sessions);
  }, [sessions]);

  // Abrir modal de detalle de sesión
  const handleOpenDetailModal = async (sessionId) => {
    if (!sessionId) return;
    try {
      setIsDetailModalOpen(true);
      setLoadingModal(true);
      const detail = await fetchCashSessionDetail(sessionId);
      setSelectedSessionDetail(detail);
    } catch (err) {
      console.error("Error al cargar detalle de sesión en modal:", err);
    } finally {
      setLoadingModal(false);
    }
  };

  // Cerrar modal de detalle
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSessionDetail(null);
  };

  // Exportar a Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);

      const branchName =
        selectedBranchId === "ALL"
          ? "Todas las sucursales"
          : branchesList.find((b) => b.id === selectedBranchId)?.name || "Sucursal seleccionada";

      const startText = startDate ? startDate.toLocaleDateString("es-MX") : "";
      const endText = endDate ? endDate.toLocaleDateString("es-MX") : startText;
      const dateRangeText = `${startText} - ${endText}`;

      await exportCashReportToExcel({
        sessions,
        movements,
        paymentMethods: paymentMethodsSummary,
        kpis,
        branchName,
        dateRangeText,
        startDate,
        endDate,
      });
    } catch (err) {
      console.error("Error ejecutando exportación:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Saber si hay filtros activos no por defecto
  const hasActiveFilters = useMemo(() => {
    return (
      (selectedBranchId !== "ALL" && selectedBranchId !== branch?.id) ||
      selectedCashierId !== "ALL" ||
      sessionStatus !== "ALL" ||
      movementType !== "ALL" ||
      activeDatePreset !== "today"
    );
  }, [selectedBranchId, branch?.id, selectedCashierId, sessionStatus, movementType, activeDatePreset]);

  return {
    // Filtros
    branchesList,
    cashiersList,
    selectedBranchId,
    setSelectedBranchId,
    selectedCashierId,
    setSelectedCashierId,
    sessionStatus,
    setSessionStatus,
    movementType,
    setMovementType,
    dateRange,
    setDateRange: handleDateRangeChange,
    startDate,
    endDate,
    activeDatePreset,
    setQuickDatePreset,
    handleClearFilters,
    hasActiveFilters,

    // Pestañas
    activeTab,
    setActiveTab,

    // Datos y KPIs
    sessions,
    paginatedSessions,
    currentSessionsPage,
    totalSessionsPages,
    handleSessionsPageChange,

    movements,
    paginatedMovements,
    currentMovementsPage,
    totalMovementsPages,
    handleMovementsPageChange,

    paymentMethodsSummary,
    cashierAudit,
    kpis,

    // Estados de carga
    loading,
    error,
    syncedAt,
    isExporting,
    loadReportData,
    handleExportExcel,

    // Modal
    isDetailModalOpen,
    selectedSessionDetail,
    loadingModal,
    handleOpenDetailModal,
    handleCloseDetailModal,
  };
};
