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

  // Paginación
  const [currentSessionsPage, setCurrentSessionsPage] = useState(1);
  const [currentMovementsPage, setCurrentMovementsPage] = useState(1);

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
      setCurrentSessionsPage(1);
      setCurrentMovementsPage(1);
    } catch (err) {
      console.error("Error al cargar datos del reporte de caja:", err);
      setError("No se pudieron cargar los datos del reporte de caja. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, startDate, endDate, selectedCashierId, sessionStatus, movementType]);

  // Recargar al cambiar filtros clave
  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Presets rápidos de fechas
  const setQuickDatePreset = (preset) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case "today":
        start = new Date(now);
        end = new Date(now);
        break;
      case "yesterday":
        start = new Date(now.setDate(now.getDate() - 1));
        end = new Date(start);
        break;
      case "this_week": {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes
        start = new Date(now.setDate(diff));
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

  // Limpiar filtros a valores por defecto
  const handleClearFilters = () => {
    const now = new Date();
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

  // Paginación de sesiones
  const totalSessionsPages = Math.ceil(sessions.length / ITEMS_PER_PAGE) || 1;
  const paginatedSessions = useMemo(() => {
    const startIdx = (currentSessionsPage - 1) * ITEMS_PER_PAGE;
    return sessions.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [sessions, currentSessionsPage]);

  // Paginación de movimientos
  const totalMovementsPages = Math.ceil(movements.length / ITEMS_PER_PAGE) || 1;
  const paginatedMovements = useMemo(() => {
    const startIdx = (currentMovementsPage - 1) * ITEMS_PER_PAGE;
    return movements.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [movements, currentMovementsPage]);

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
      movementType !== "ALL"
    );
  }, [selectedBranchId, branch?.id, selectedCashierId, sessionStatus, movementType]);

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
    setDateRange,
    startDate,
    endDate,
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
    setCurrentSessionsPage,
    totalSessionsPages,

    movements,
    paginatedMovements,
    currentMovementsPage,
    setCurrentMovementsPage,
    totalMovementsPages,

    paymentMethodsSummary,
    cashierAudit,
    kpis,

    // Estados de carga
    loading,
    error,
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
