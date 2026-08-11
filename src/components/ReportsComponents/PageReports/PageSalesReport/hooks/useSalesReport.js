import { useState, useEffect, useCallback } from "react";
import { 
  getBranchesList, getCashiersList, getSaleDetailsById, 
  getPaginatedSales, getSalesKPIs, 
  getAllSalesForExport, getDetailedSalesForExport 
} from "../services/salesReportService";
import { generateSummaryExcel, generateDetailedExcel } from "../services/excelExportService";
import { getTimezoneOffset, formatYMD } from "../utils/dateUtils"; // <-- IMPORTACIÓN PURA

export const ITEMS_PER_PAGE = 10; 

export const useSalesReport = () => {
  const [reportModal, setReportModal] = useState({ isOpen: false, type: "info", title: "", message: "" });
  const closeReportModal = () => setReportModal((prev) => ({ ...prev, isOpen: false }));

  const [dateRange, setDateRange] = useState([new Date(), new Date()]);
  const [startDate, endDate] = dateRange;
  const [selectedBranch, setSelectedBranch] = useState("Todas");
  const [selectedCashier, setSelectedCashier] = useState("Todos");
  const [saleStatus, setSaleStatus] = useState("Completada");
  const [paymentMethod, setPaymentMethod] = useState("Todos");
  const [discountFilter, setDiscountFilter] = useState("Todos");

  const [branchesList, setBranchesList] = useState([{ id: "Todas", name: "Cargando..." }]);
  const [cashiersList, setCashiersList] = useState([{ id: "Todos", name: "Cargando..." }]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  const [ticketDetails, setTicketDetails] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  
  const [isExportingDetailed, setIsExportingDetailed] = useState(false);
  const [isExportingSummary, setIsExportingSummary] = useState(false);

  const [loading, setLoading] = useState(false);
  const [paginatedSales, setPaginatedSales] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalTickets: 0, averageTicket: 0, totalDiscounts: 0 });

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

  const getCurrentFilters = useCallback(() => {
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
  
  const fetchSalesReport = useCallback(async (options = { isActive: true }) => {
    const filters = getCurrentFilters();
    if (!filters) return;
    
    setLoading(true);
    try {
      const [salesRes, kpisRes] = await Promise.all([
        getPaginatedSales(filters, currentPage, ITEMS_PER_PAGE),
        getSalesKPIs(filters)
      ]);

      if (!options.isActive) return;

      setPaginatedSales(salesRes.data);
      setTotalPages(Math.ceil(salesRes.totalCount / ITEMS_PER_PAGE) || 1);
      
      setSummary({
        totalIncome: kpisRes.totalIncome,
        totalDiscounts: kpisRes.totalDiscounts,
        totalTickets: kpisRes.totalTickets,
        averageTicket: kpisRes.totalTickets > 0 && kpisRes.totalIncome > 0 
          ? (kpisRes.totalIncome / kpisRes.totalTickets) 
          : 0,
      });
    } catch (error) {
      if (!options.isActive) return;
      console.error("Error cargando reporte de ventas:", error);
      setReportModal({ isOpen: true, type: "danger", title: "Error al generar reporte", message: error.message || "Revisa tu conexión a internet." });
      setPaginatedSales([]); 
    } finally {
      if (options.isActive) {
        setLoading(false);
      }
    }
  }, [getCurrentFilters, currentPage]);

  useEffect(() => {
    const state = { isActive: true };
    fetchSalesReport(state);
    return () => { state.isActive = false; };
  }, [fetchSalesReport]);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, selectedBranch, selectedCashier, saleStatus, paymentMethod, discountFilter]);

  const handleClearFilters = () => {
    setDateRange([new Date(), new Date()]);
    setSelectedBranch("Todas");
    setSelectedCashier("Todos");
    setSaleStatus("Completada");
    setPaymentMethod("Todos");
    setDiscountFilter("Todos");
  };

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

  const hasActiveFilters = selectedBranch !== "Todas" || selectedCashier !== "Todos" || saleStatus !== "Completada" || paymentMethod !== "Todos" || discountFilter !== "Todos";

  const handleExportExcel = async () => {
    if (summary.totalTickets === 0) return;
    if (summary.totalTickets > 5000) {
      setReportModal({ isOpen: true, type: "warning", title: "Límite excedido", message: "El reporte excede el límite de 5,000 registros para exportación. Reduce el rango de fechas." });
      return;
    }

    setIsExportingSummary(true);
    try {
      const filters = getCurrentFilters();
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
      const filters = getCurrentFilters();
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
    dateRange, setDateRange, startDate, endDate,
    selectedBranch, setSelectedBranch, selectedCashier, setSelectedCashier,
    saleStatus, setSaleStatus, paymentMethod, setPaymentMethod, discountFilter, setDiscountFilter,
    branchesList, cashiersList, currentPage, setCurrentPage, totalPages,
    paginatedSales, isTicketModalOpen, selectedTicket, ticketDetails,
    loadingModal, loading, summary, hasActiveFilters, handleClearFilters,
    handleRowClick, handleCloseModal, handleExportExcel, handleExportDetailedExcel, isExportingDetailed, isExportingSummary
  };
};