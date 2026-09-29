import { useState, useEffect, useMemo } from "react";
import {
  getBranchesList, getCashiersList, getSaleDetailsById,
  loadSalesReport,
  getAllSalesForExport, getDetailedSalesForExport
} from "../services/salesReportService";
import { generateSummaryExcel, generateDetailedExcel } from "../services/excelExportService";
import { getTimezoneOffset, formatYMD } from "../utils/dateUtils"; // <-- IMPORTACIÓN PURA
import { usePagination } from "../../../../../hooks/usePagination";
import { useRequestStatus } from "../../../../../hooks/useRequestStatus";

export const ITEMS_PER_PAGE = 10; 

export const useSalesReport = () => {
  const [reportModal, setReportModal] = useState({ isOpen: false, type: "info", title: "", message: "" });
  const closeReportModal = () => setReportModal((prev) => ({ ...prev, isOpen: false }));

  const [dateRange, setDateRange] = useState([new Date(), new Date()]);
  const [activeDatePreset, setActiveDatePreset] = useState("today");
  const [startDate, endDate] = dateRange;
  const [selectedBranch, setSelectedBranch] = useState("Todas");
  const [selectedCashier, setSelectedCashier] = useState("Todos");
  const [saleStatus, setSaleStatus] = useState("Completada");
  const [paymentMethod, setPaymentMethod] = useState("Todos");
  const [discountFilter, setDiscountFilter] = useState("Todos");

  const [branchesList, setBranchesList] = useState([{ id: "Todas", name: "Cargando..." }]);
  const [cashiersList, setCashiersList] = useState([{ id: "Todos", name: "Cargando..." }]);

  const [totalCount, setTotalCount] = useState(0);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  const [ticketDetails, setTicketDetails] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  
  const [isExportingDetailed, setIsExportingDetailed] = useState(false);
  const [isExportingSummary, setIsExportingSummary] = useState(false);

  const [paginatedSales, setPaginatedSales] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalTickets: 0, averageTicket: 0, totalDiscounts: 0 });
  const [syncedAt, setSyncedAt] = useState(null);

  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    handlePageChange,
    resetPagination,
  } = usePagination({
    totalItems: totalCount,
    defaultPageSize: ITEMS_PER_PAGE,
  });

  useEffect(() => {
    let isActive = true;
    const fetchCatalogs = async () => {
      try {
        const [branches, cashiers] = await Promise.all([getBranchesList(), getCashiersList()]);
        if (!isActive) return;
        setBranchesList(branches);
        setCashiersList(cashiers);
      } catch (err) {
        if (!isActive) return;
        setReportModal({ isOpen: true, type: "danger", title: "Error de conexión", message: err.message || "No se pudieron cargar los catálogos." });
      }
    };
    fetchCatalogs();
    return () => { isActive = false; };
  }, []);

  // Los filtros se memorizan en lugar de reconstruirse en cada llamada: su
  // identidad es exactamente la clave de peticion, asi que una recarga solo
  // ocurre cuando cambia alguno de los filtros que la consulta usa de verdad.
  const currentFilters = useMemo(() => {
    if (!startDate || !endDate) return null;

    const selectedBranchObj = branchesList.find((b) => b.id === selectedBranch);
    const businessTimeZone = selectedBranchObj?.timezone || "America/Cancun"; 

    const startOffset = getTimezoneOffset(startDate, businessTimeZone);
    const endOffset = getTimezoneOffset(endDate, businessTimeZone);

    const startIso = `${formatYMD(startDate)}T00:00:00.000${startOffset}`;
    const endIso = `${formatYMD(endDate)}T23:59:59.999${endOffset}`;
    
    return {
      startDateIso: startIso, 
      endDateIso: endIso, 
      branch: selectedBranch, 
      cashier: selectedCashier,
      status: saleStatus, 
      payment: paymentMethod, 
      discount: discountFilter,
      timeZone: businessTimeZone
    };
  }, [startDate, endDate, selectedBranch, selectedCashier, saleStatus, paymentMethod, discountFilter, branchesList]);
  
  // La carga se deriva de la clave pedida en lugar de marcarse con un
  // setLoading(true) sincrono, que provocaba un re-render en cascada.
  const { loading, isStale, markSettled } = useRequestStatus(currentFilters);

  useEffect(() => {
    if (!currentFilters) return undefined;

    let cancelled = false;

    loadSalesReport(
      { filters: currentFilters, currentPage, pageSize },
      {
        onData: ({ salesRes, kpisRes }) => {
          if (cancelled) return;
          setPaginatedSales(salesRes.data);
          setTotalCount(salesRes.totalCount);
          setSummary({
            totalIncome: kpisRes.totalIncome,
            totalDiscounts: kpisRes.totalDiscounts,
            totalTickets: kpisRes.totalTickets,
            averageTicket:
              kpisRes.totalTickets > 0 && kpisRes.totalIncome > 0
                ? kpisRes.totalIncome / kpisRes.totalTickets
                : 0,
          });
          setSyncedAt(new Date().toISOString());
        },
        onError: (message) => {
          if (cancelled) return;
          setReportModal({
            isOpen: true,
            type: "danger",
            title: "Error al generar reporte",
            message,
          });
          setPaginatedSales([]);
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
  }, [currentFilters, currentPage, pageSize, markSettled]);

  useEffect(() => {
    resetPagination();
  }, [startDate, endDate, selectedBranch, selectedCashier, saleStatus, paymentMethod, discountFilter, resetPagination]);

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

  const handleClearFilters = () => {
    const now = new Date();
    setActiveDatePreset("today");
    setDateRange([now, now]);
    setSelectedBranch("Todas");
    setSelectedCashier("Todos");
    setSaleStatus("Completada");
    setPaymentMethod("Todos");
    setDiscountFilter("Todos");
  };

  const hasActiveFilters = Boolean(
    selectedBranch !== "Todas" ||
    selectedCashier !== "Todos" ||
    saleStatus !== "Completada" ||
    paymentMethod !== "Todos" ||
    discountFilter !== "Todos" ||
    activeDatePreset !== "today"
  );

  const handleRowClick = async (sale) => {
    setSelectedTicket(sale);
    setIsTicketModalOpen(true);
    setLoadingModal(true);
    setTicketDetails([]);
    try {
      const details = await getSaleDetailsById(sale.id);
      setTicketDetails(details);
    } catch (error) {
      console.error("Error al obtener detalle:", error);
      setReportModal({ isOpen: true, type: "warning", title: "Detalle no disponible", message: "Error al cargar los productos del ticket." });
    } finally {
      setLoadingModal(false);
    }
  };

  const handleCloseModal = () => {
    setIsTicketModalOpen(false);
    setSelectedTicket(null);
    setTicketDetails([]);
  };

  const handleExportExcel = async () => {
    if (summary.totalTickets === 0) return;
    if (summary.totalTickets > 5000) {
      setReportModal({ isOpen: true, type: "warning", title: "Límite excedido", message: "El reporte excede el límite de 5,000 registros para exportación. Reduce el rango de fechas." });
      return;
    }

    setIsExportingSummary(true);
    try {
      const filters = currentFilters;
      const exportData = await getAllSalesForExport(filters);
      generateSummaryExcel(exportData, summary, filters, branchesList, startDate, endDate);
    } catch (error) {
      console.error("Error exportando resumen:", error);
      setReportModal({ isOpen: true, type: "danger", title: "Error en Exportación", message: error.message || "Error al generar el archivo Excel." });
    } finally {
      setIsExportingSummary(false);
    }
  };

  const handleExportDetailedExcel = async () => {
    if (summary.totalTickets === 0) return;
    if (summary.totalTickets > 5000) {
      setReportModal({ isOpen: true, type: "warning", title: "Límite excedido", message: "El reporte excede el límite de 5,000 registros para exportación. Reduce el rango de fechas." });
      return;
    }

    setIsExportingDetailed(true);
    try {
      const filters = currentFilters;
      const detailedData = await getDetailedSalesForExport(filters);
      generateDetailedExcel(detailedData, filters, branchesList, startDate, endDate);
    } catch (error) {
      console.error("Error exportando detalle:", error);
      setReportModal({ isOpen: true, type: "danger", title: "Error en Exportación", message: error.message || "Error al generar el archivo Excel detallado." });
    } finally {
      setIsExportingDetailed(false);
    }
  };

  return {
    reportModal, closeReportModal, 
    dateRange, setDateRange: handleDateRangeChange, startDate, endDate,
    activeDatePreset, setQuickDatePreset,
    selectedBranch, setSelectedBranch, selectedCashier, setSelectedCashier,
    saleStatus, setSaleStatus, paymentMethod, setPaymentMethod, discountFilter, setDiscountFilter,
    branchesList, cashiersList, currentPage, totalPages, startIndex, endIndex,
    handlePageChange,
    paginatedSales, isTicketModalOpen, selectedTicket, ticketDetails,
    loadingModal, loading, summary, syncedAt, hasActiveFilters, handleClearFilters,
    handleRowClick, handleCloseModal, handleExportExcel, handleExportDetailedExcel, isExportingDetailed, isExportingSummary
  };
};
