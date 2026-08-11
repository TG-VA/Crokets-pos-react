import { useState, useEffect, useCallback } from "react";
import { 
  getBranchesList, getCashiersList, getSaleDetailsById, 
  getPaginatedSales, getSalesKPIs, 
  getAllSalesForExport, getDetailedSalesForExport 
} from "../services/salesReportService";

export const ITEMS_PER_PAGE = 10; 

// Helper para evitar que caracteres como < o > rompan el HTML del Excel
const escapeHtml = (unsafe) => {
  return (unsafe || "").toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const useSalesReport = () => {
  // Estado del AppModal para reportes
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
    // REGLA DE NEGOCIO: "Todas" usa la hora corporativa (Cancún). Las demás, la suya.
    const businessTimeZone = selectedBranchObj?.timezone || "America/Cancun"; 

    // Función pura recomendada por ChatGPT para normalizar GMT-5 a -05:00
    const getTimezoneOffset = (date, timeZone) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'shortOffset'
      }).formatToParts(date);
      
      const tzPart = parts.find(part => part.type === 'timeZoneName').value;
      if (tzPart === 'GMT') return 'Z';
      
      const offset = tzPart.replace('GMT', ''); // ej. "-5", "+5:30", "-04"
      const match = offset.match(/([+-])(\d+)(?::(\d+))?/);
      
      if (match) {
        const sign = match[1];
        const hours = match[2].padStart(2, '0'); // Convierte "5" en "05"
        const minutes = match[3] || '00';
        return `${sign}${hours}:${minutes}`; // Retorna "-05:00" válido para ISO
      }
      return '-05:00'; // Fallback de máxima seguridad
    };

    // Extraemos la fecha seleccionada por el usuario en el calendario
    const formatYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Calculamos los offsets independientes (Soluciona el bug del Horario de Verano)
    const startOffset = getTimezoneOffset(startDate, businessTimeZone);
    const endOffset = getTimezoneOffset(endDate, businessTimeZone);

    // Construimos el ISO estricto
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

      // Escudo anti-fantasmas: Si el filtro cambió mientras cargaba, abortar
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
    // Generamos un token por cada vez que cambien los filtros
    const state = { isActive: true };
    fetchSalesReport(state);
    
    // Si el usuario cambia de opinión rápido, matamos el token anterior
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

  const getExportFileName = (prefix) => {
    const dStr = (d) => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : "";
    let bName = "Global";
    if (selectedBranch !== "Todas") {
      const fb = branchesList.find((b) => b.id === selectedBranch);
      bName = fb ? fb.name.trim() : "Sucursal";
    }
    const bLabel = bName.replace(/\s+/g, "_");
    const startStr = dStr(startDate); const endStr = dStr(endDate);
    const dateLabel = startStr && endStr ? (startStr === endStr ? startStr : `del_${startStr}_al_${endStr}`) : dStr(new Date());
    return `${prefix}_${bLabel}_${dateLabel}.xls`;
  };

  const triggerDownload = (htmlTemplate, fileName) => {
    const blob = new Blob(["\uFEFF" + htmlTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    if (summary.totalTickets === 0) return;
    if (summary.totalTickets > 5000) {
      setReportModal({ isOpen: true, type: "warning", title: "Límite excedido", message: "El reporte excede el límite de 5,000 registros para exportación segura. Por favor, reduce el rango de fechas." });
      return;
    }

    setIsExportingSummary(true);
    try {
      const filters = getCurrentFilters();
      const exportData = await getAllSalesForExport(filters);
      const fileName = getExportFileName("Resumen_Ventas");
      const emissionDate = new Date().toLocaleString("es-MX", { timeZone: filters.timeZone });
      
      const htmlTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; font-size: 10pt; color: #1f2d3d; }
            .title { font-size: 16pt; font-weight: bold; color: #1092b1; margin-bottom: 4px; }
            .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 16px; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            th { background-color: #1092b1; color: #ffffff; font-size: 10pt; font-weight: bold; padding: 10px 14px; border: 1px solid #0e7c97; text-align: left; }
            td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 9.5pt; vertical-align: middle; }
            .text-center { text-align: center; }
            .currency { mso-number-format: "\\$#,##0.00"; text-align: right; font-weight: bold; }
            .discount { color: #d97706; mso-number-format: "-\\$#,##0.00"; text-align: right; font-weight: bold; }
            .status-completed { background-color: #ecfdf5; color: #059669; font-weight: bold; text-align: center; }
            .status-cancelled { background-color: #fef2f2; color: #dc2626; font-weight: bold; text-align: center; }
            .status-warning { background-color: #fffbeb; color: #d97706; font-weight: bold; text-align: center; }
            .tfoot-label { text-align: right; font-weight: bold; background-color: #f8fafc; }
            .tfoot-value { background-color: #f8fafc; font-size: 11pt; }
          </style>
        </head>
        <body>
          <div class="title">RESUMEN DE VENTAS - CROKETS POS</div>
          <div class="subtitle"><b>Fecha de emisión:</b> ${emissionDate}</div>
          <table>
            <thead>
              <tr><th>Folio</th><th>Fecha</th><th>Sucursal</th><th>Cajero</th><th>Cliente</th><th>Método de Pago</th><th>Estado</th><th style="text-align: right;">Descuento</th><th style="text-align: right;">Total</th></tr>
            </thead>
            <tbody>
              ${exportData.map((sale) => `
                <tr><td><b>#${sale.ticketNumber}</b></td><td>${sale.date}</td><td>${escapeHtml(sale.branch)}</td><td>${escapeHtml(sale.cashier)}</td><td>${escapeHtml(sale.client)}</td><td class="text-center">${escapeHtml(sale.method)}</td><td class="${sale.status === "Completada" ? "status-completed" : sale.status === "Cancelada" ? "status-cancelled" : "status-warning"}">${sale.status}</td><td class="discount">${sale.discount}</td><td class="currency">${sale.total}</td></tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr><td colspan="7" class="tfoot-label">TOTAL ACUMULADO (FILTRO ACTIVO):</td><td class="discount tfoot-value">${summary.totalDiscounts}</td><td class="currency tfoot-value">${summary.totalIncome}</td></tr>
            </tfoot>
          </table>
        </body>
        </html>
      `;
      triggerDownload(htmlTemplate, fileName);
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
      setReportModal({ isOpen: true, type: "warning", title: "Límite excedido", message: "El reporte excede el límite de 5,000 registros para exportación segura. Por favor, reduce el rango de fechas." });
      return;
    }

    setIsExportingDetailed(true);
    try {
      const filters = getCurrentFilters();
      const detailedData = await getDetailedSalesForExport(filters);
      const fileName = getExportFileName("Reporte_Detallado");
      const emissionDate = new Date().toLocaleString("es-MX", { timeZone: filters.timeZone });

      const htmlTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; font-size: 10pt; color: #1f2d3d; }
            .title { font-size: 16pt; font-weight: bold; color: #1092b1; margin-bottom: 4px; }
            .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 16px; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            th { background-color: #1092b1; color: #ffffff; font-size: 10pt; font-weight: bold; padding: 10px 14px; border: 1px solid #0e7c97; text-align: left; }
            td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 9.5pt; vertical-align: middle; }
            .text-center { text-align: center; }
            .currency { mso-number-format: "\\$#,##0.00"; text-align: right; }
            .discount { color: #d97706; mso-number-format: "-\\$#,##0.00"; text-align: right; }
            .text-code { mso-number-format: "\\@"; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="title">REPORTE DETALLADO DE PRODUCTOS - CROKETS POS</div>
          <div class="subtitle"><b>Fecha de emisión:</b> ${emissionDate}</div>
          <table>
            <thead>
              <tr><th>Folio</th><th>Fecha</th><th>Sucursal</th><th>Cajero</th><th>Cliente</th><th>Estado</th><th>Código Producto</th><th>Descripción</th><th style="text-align: center;">Cantidad</th><th style="text-align: right;">Precio Unitario</th><th>Motivo Descuento</th><th style="text-align: right;">Descuento</th><th style="text-align: right;">Total Línea</th></tr>
            </thead>
            <tbody>
              ${detailedData.map((row) => `
                <tr><td><b>#${row.ticketNumber}</b></td><td>${row.date}</td><td>${escapeHtml(row.branch)}</td><td>${escapeHtml(row.cashier)}</td><td>${escapeHtml(row.client)}</td><td>${row.status}</td><td class="text-code">${escapeHtml(row.barcode)}</td><td>${escapeHtml(row.productName)}</td><td class="text-center">${row.quantity}</td><td class="currency">${row.unitPrice}</td><td>${escapeHtml(row.discountType)}</td><td class="discount">${row.discountAmount}</td><td class="currency"><b>${row.totalPrice}</b></td></tr>
              `).join("")}
            </tbody>
          </table>
        </body>
        </html>
      `;
      triggerDownload(htmlTemplate, fileName);
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