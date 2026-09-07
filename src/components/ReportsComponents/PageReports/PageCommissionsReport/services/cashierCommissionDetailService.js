/**
 * cashierCommissionDetailService.js
 * Servicio de agrupaciones y detalle para el modal de inspección individual de cajero.
 */

/**
 * Agrupa las partidas comisionables de un cajero por ticket de venta.
 */
export const groupCashierSalesByTicket = (cashierRows = []) => {
  const ticketMap = new Map();

  cashierRows.forEach((row) => {
    if (!row.hasCommission) return;

    const ticketId = row.saleId || row.ticketNumber;
    if (!ticketMap.has(ticketId)) {
      ticketMap.set(ticketId, {
        saleId: row.saleId,
        ticketNumber: row.ticketNumber,
        createdAt: row.createdAt,
        branchName: row.branchName,
        cashierName: row.cashierName,
        items: [],
        totalItemsCount: 0,
        totalSalesAmount: 0,
        totalCommissionAmount: 0,
      });
    }

    const ticket = ticketMap.get(ticketId);
    ticket.items.push(row);
    ticket.totalItemsCount += Number(row.quantity) || 0;
    ticket.totalSalesAmount += Number(row.totalPrice) || 0;
    ticket.totalCommissionAmount += Number(row.commissionAmount) || 0;
  });

  return Array.from(ticketMap.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};
