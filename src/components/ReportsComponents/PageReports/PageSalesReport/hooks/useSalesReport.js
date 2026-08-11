import { useState, useEffect, useCallback } from "react";
import { 
  getBranchesList, getCashiersList, getSaleDetailsById, 
  getPaginatedSales, getSalesKPIs, 
  getAllSalesForExport, getDetailedSalesForExport 
} from "../services/salesReportService";

export const ITEMS_PER_PAGE = 10; 

export const useSalesReport = () => {
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
    const fetchCatalogs = async () => {
      const [branches, cashiers] = await Promise.all([getBranchesList(), getCashiersList()]);
      setBranchesList(branches);
      setCashiersList(cashiers);
    };
    fetchCatalogs();
  }, []);

  const getCurrentFilters = useCallback(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    
    return {
      startDate: start, endDate: end, branch: selectedBranch, cashier: selectedCashier,
      status: saleStatus, payment: paymentMethod, discount: discountFilter
    };
  }, [startDate, endDate, selectedBranch, selectedCashier, saleStatus, paymentMethod, discountFilter]);

  const fetchSalesReport = useCallback(async () => {
    const filters = getCurrentFilters();
    if (!filters) return;
    
    setLoading(true);
    try {
      const [salesRes, kpisRes] = await Promise.all([
        getPaginatedSales(filters, currentPage, ITEMS_PER_PAGE),
        getSalesKPIs(filters)
      ]);

      setPaginatedSales(salesRes.data);
      setTotalPages(Math.ceil(salesRes.totalCount / ITEMS_PER_PAGE) || 1);
      
      setSummary({
        totalIncome: kpisRes.totalIncome,
        totalDiscounts: kpisRes.totalDiscounts,
        totalTickets: kpisRes.totalTickets,
        averageTicket: kpisRes.totalTickets > 0 ? (kpisRes.totalIncome / kpisRes.totalTickets) : 0,
      });
    } catch (error) {
      console.error("Error cargando reporte de ventas:", error);
    } finally {
      setLoading(false);
    }
  }, [getCurrentFilters, currentPage]);

  useEffect(() => {
    fetchSalesReport();
  }, [fetchSalesReport]);

  // Si cambiamos los filtros, regresamos a la página 1 automáticamente
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
    setIsExportingSummary(true);
    
    try {
      const exportData = await getAllSalesForExport(getCurrentFilters());
      const fileName = getExportFileName("Resumen_Ventas");
      
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
          <div class="subtitle"><b>Fecha de emisión:</b> ${new Date().toLocaleDateString('es-MX')}</div>
          <table>
            <thead>
              <tr><th>Folio</th><th>Fecha</th><th>Sucursal</th><th>Cajero</th><th>Cliente</th><th>Método de Pago</th><th>Estado</th><th style="text-align: right;">Descuento</th><th style="text-align: right;">Total</th></tr>
            </thead>
            <tbody>
              ${exportData.map((sale) => `
                <tr><td><b>#${sale.ticketNumber}</b></td><td>${sale.date}</td><td>${sale.branch}</td><td>${sale.cashier}</td><td>${sale.client}</td><td class="text-center">${sale.method}</td><td class="${sale.status === "Completada" ? "status-completed" : sale.status === "Cancelada" ? "status-cancelled" : "status-warning"}">${sale.status}</td><td class="discount">${sale.discount}</td><td class="currency">${sale.total}</td></tr>
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
    } finally {
      setIsExportingSummary(false);
    }
  };

  const handleExportDetailedExcel = async () => {
    if (summary.totalTickets === 0) return;
    setIsExportingDetailed(true);

    try {
      const detailedData = await getDetailedSalesForExport(getCurrentFilters());
      const fileName = getExportFileName("Reporte_Detallado");

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
          <div class="subtitle"><b>Fecha de emisión:</b> ${new Date().toLocaleDateString('es-MX')}</div>
          <table>
            <thead>
              <tr><th>Folio</th><th>Fecha</th><th>Sucursal</th><th>Cajero</th><th>Cliente</th><th>Estado</th><th>Código Producto</th><th>Descripción</th><th style="text-align: center;">Cantidad</th><th style="text-align: right;">Precio Unitario</th><th>Motivo Descuento</th><th style="text-align: right;">Descuento</th><th style="text-align: right;">Total Línea</th></tr>
            </thead>
            <tbody>
              ${detailedData.map((row) => `
                <tr><td><b>#${row.ticketNumber}</b></td><td>${row.date}</td><td>${row.branch}</td><td>${row.cashier}</td><td>${row.client}</td><td>${row.status}</td><td class="text-code">${row.barcode}</td><td>${row.productName}</td><td class="text-center">${row.quantity}</td><td class="currency">${row.unitPrice}</td><td>${row.discountType}</td><td class="discount">${row.discountAmount}</td><td class="currency"><b>${row.totalPrice}</b></td></tr>
              `).join("")}
            </tbody>
          </table>
        </body>
        </html>
      `;
      triggerDownload(htmlTemplate, fileName);
    } catch (error) {
      console.error("Error exportando detalle:", error);
    } finally {
      setIsExportingDetailed(false);
    }
  };

  return {
    dateRange, setDateRange, startDate, endDate,
    selectedBranch, setSelectedBranch, selectedCashier, setSelectedCashier,
    saleStatus, setSaleStatus, paymentMethod, setPaymentMethod, discountFilter, setDiscountFilter,
    branchesList, cashiersList, currentPage, setCurrentPage, totalPages,
    paginatedSales, isTicketModalOpen, selectedTicket, ticketDetails,
    loadingModal, loading, summary, hasActiveFilters, handleClearFilters,
    handleRowClick, handleCloseModal, handleExportExcel, handleExportDetailedExcel, isExportingDetailed, isExportingSummary
  };
};