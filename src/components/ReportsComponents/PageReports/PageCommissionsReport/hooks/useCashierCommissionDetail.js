/**
 * useCashierCommissionDetail.js
 * Hook para el estado, paginación y comprobante individual del modal de cajero.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { groupCashierSalesByTicket } from "../services/cashierCommissionDetailService";
import { exportCashierStatementToExcel } from "../utils/commissionsReportExportUtils";
import { usePagination } from "../../../../../hooks/usePagination";

export const useCashierCommissionDetail = ({
  cashier,
  allDetailedRows = [],
  startDate,
  endDate,
}) => {
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

  const totalTickets = ticketGroups.length;

  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    pageItems,
    resetPagination,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: totalTickets,
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 20],
  });

  useEffect(() => {
    resetPagination();
  }, [totalTickets, resetPagination]);

  const currentTickets = pageItems(ticketGroups);

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
    currentPage,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    totalTickets,
    handlePageChange,
    handlePageSizeChange,
    isExportingStatement,
    handleExportStatement,
  };
};
