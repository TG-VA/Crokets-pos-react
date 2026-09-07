/**
 * useCashierCommissionDetail.js
 * Hook para el estado, paginación y comprobante individual del modal de cajero.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { groupCashierSalesByTicket } from "../services/cashierCommissionDetailService";
import { exportCashierStatementToExcel } from "../utils/commissionsReportExportUtils";

export const useCashierCommissionDetail = ({
  cashier,
  allDetailedRows = [],
  startDate,
  endDate,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isExportingStatement, setIsExportingStatement] = useState(false);

  // Filtrar partidas del cajero seleccionado
  const cashierRows = useMemo(() => {
    if (!cashier?.cashierId) return [];
    return allDetailedRows.filter(
      (r) => r.cashierId === cashier.cashierId && r.hasCommission
    );
  }, [cashier?.cashierId, allDetailedRows]);

  // Agrupar por ticket de venta
  const ticketGroups = useMemo(() => {
    return groupCashierSalesByTicket(cashierRows);
  }, [cashierRows]);

  const totalPages = Math.ceil(ticketGroups.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [ticketGroups.length]);

  const currentTickets = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return ticketGroups.slice(startIndex, startIndex + pageSize);
  }, [ticketGroups, safeCurrentPage, pageSize]);

  const handleExportStatement = useCallback(async () => {
    if (!cashier?.cashierName || ticketGroups.length === 0) return;

    try {
      setIsExportingStatement(true);
      await exportCashierStatementToExcel({
        cashierName: cashier.cashierName,
        ticketGroups,
        startDate,
        endDate,
      });
    } catch (err) {
      console.error("Error al exportar comprobante de cajero:", err);
    } finally {
      setIsExportingStatement(false);
    }
  }, [cashier?.cashierName, ticketGroups, startDate, endDate]);

  return {
    cashierRows,
    ticketGroups,
    currentTickets,
    currentPage: safeCurrentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalTickets: ticketGroups.length,
    isExportingStatement,
    handleExportStatement,
  };
};
