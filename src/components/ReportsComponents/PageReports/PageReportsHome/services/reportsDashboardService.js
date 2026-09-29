import {
  getDashboardDateRanges,
  getDateInputFromIso,
  getEmptyReportsDashboard,
  isCompletedSale,
  uniqueValues,
} from "./reportsDashboardUtils";

import {
  buildTodaySalesKpis,
  buildValidReturnsData,
} from "./reportsDashboardCalculations";

import {
  getBranchesCatalog,
  getProductById,
  getPaymentMethodsByIds,
  getSaleDetails,
  getSalePayments,
  getSalesRows,
} from "./reportsSalesQueries";

import {
  buildMainPaymentMethod,
  buildSalesChart,
  formatTopProduct,
  getTopProductStats,
} from "./reportsSalesCalculations";

import {
  buildReturnedAmountByProduct,
  buildReturnedAmountBySale,
  buildReturnedQuantityByProduct,
} from "./reportsReturnsCalculations";

import {
  getReturnItems,
  getSaleReturns,
  getTodayCancelledSales,
  getTodayReturns,
} from "./reportsReturnsService";

import {
  buildInventoryAlerts,
  getBranchInventory,
} from "./reportsInventoryService";

export { getEmptyReportsDashboard, getBranchesCatalog };

export const getReportsDashboard = async (
  branchId = "ALL"
) => {
  const isConsolidated =
    !branchId ||
    branchId === "ALL" ||
    branchId === "Todas";

  const {
    todayInput,
    todayRange,
    chartRange,
  } = getDashboardDateRanges();

  const firstChartDateInput =
    getDateInputFromIso(
      chartRange.start
    );

  /*
   * Primera carga:
   * información principal de ventas, inventario
   * e incidencias registradas durante el día.
   */
  const [
    salesRows,
    inventoryRows,
    cancelledSalesToday,
    todayReturns,
  ] = await Promise.all([
    getSalesRows({
      branchId,
      start: chartRange.start,
      end: chartRange.end,
    }),

    getBranchInventory(branchId),

    getTodayCancelledSales({
      branchId,
      todayStart: todayRange.start,
      todayEnd: todayRange.end,
    }),

    getTodayReturns({
      branchId,
      todayStart: todayRange.start,
      todayEnd: todayRange.end,
    }),
  ]);

  const saleIds = uniqueValues(
    salesRows.map(
      (sale) => sale.id
    )
  );

  /*
   * Segunda carga:
   * detalles, pagos y devoluciones de las ventas
   * recuperadas dentro del periodo del dashboard.
   */
  const [
    returnRows,
    detailRows,
    paymentRows,
  ] = await Promise.all([
    getSaleReturns(saleIds),
    getSaleDetails(saleIds),
    getSalePayments(saleIds),
  ]);

  const returnIds = uniqueValues(
    returnRows.map(
      (row) => row.id
    )
  );

  const returnItems =
    await getReturnItems(returnIds);

  /*
   * Las ventas canceladas y pendientes quedan
   * excluidas de los cálculos económicos.
   */
  const completedSales =
    salesRows.filter(
      isCompletedSale
    );

  const completedSaleIds = new Set(
    completedSales.map(
      (sale) => sale.id
    )
  );

  /*
   * Solo se consideran devoluciones asociadas
   * a ventas válidas y completadas.
   */
  const {
    validReturnRows,
    validReturnItems,
  } = buildValidReturnsData({
    returnRows,
    returnItems,
    validSaleIds: completedSaleIds,
  });

  const returnedAmountBySale =
    buildReturnedAmountBySale(
      validReturnRows
    );

  const returnedQuantityByProduct =
    buildReturnedQuantityByProduct(
      validReturnItems
    );

  const returnedAmountByProduct =
    buildReturnedAmountByProduct({
      returnRows: validReturnRows,
      returnItems: validReturnItems,
      validSaleIds: completedSaleIds,
    });

  /*
   * Identificar el producto más vendido en memoria primero
   * para consultar únicamente ese producto específico a Supabase.
   */
  const topProductStats = getTopProductStats({
    detailRows,
    validSaleIds: completedSaleIds,
    returnedQuantityByProduct,
    returnedAmountByProduct,
  });

  const paymentMethodIds =
    uniqueValues(
      paymentRows.map(
        (payment) =>
          payment.payment_method_id
      )
    );

  /*
   * Tercera carga:
   * Solo el producto ganador del periodo y los métodos de pago.
   */
  const [
    topProductRecord,
    paymentMethodRows,
  ] = await Promise.all([
    topProductStats?.productId
      ? getProductById(topProductStats.productId)
      : Promise.resolve(null),

    getPaymentMethodsByIds(
      paymentMethodIds
    ),
  ]);

  /*
   * KPI correspondientes al día actual.
   */
  const kpis =
    buildTodaySalesKpis({
      completedSales,
      detailRows,
      returnedAmountBySale,
      returnedUnitsToday:
        todayReturns.units,
      todayInput,
    });

  const inventoryAlerts =
    buildInventoryAlerts(
      inventoryRows,
      isConsolidated
    );

  return {
    kpis,

    salesChart: buildSalesChart({
      sales: completedSales,
      returnedAmountBySale,
      firstDateInput:
        firstChartDateInput,
    }),

    highlights: {
      topProduct: formatTopProduct(
        topProductStats,
        topProductRecord
      ),

      mainPaymentMethod:
        buildMainPaymentMethod({
          salesRows:
            completedSales,
          paymentRows,
          validSaleIds:
            completedSaleIds,
          paymentMethodRows,
        }),
    },

    alerts: {
      cancelledSalesToday,

      returnsToday:
        todayReturns.count,

      returnedAmountToday:
        todayReturns.amount,

      returnedUnitsToday:
        todayReturns.units,

      outOfStockCount:
        inventoryAlerts.outOfStockCount,

      lowStockCount:
        inventoryAlerts.lowStockCount,

      outOfStockProducts:
        inventoryAlerts.outOfStockProducts,

      lowStockProducts:
        inventoryAlerts.lowStockProducts,
    },

    meta: {
      branchId: isConsolidated ? "ALL" : branchId,
      isConsolidated,

      generatedAt:
        new Date().toISOString(),
    },
  };
};

/**
 * Carga el dashboard de reportes y entrega el resultado por callbacks.
 *
 * La orquestacion vive en el servicio para que el efecto que dispara la consulta
 * no escriba estado: todas las actualizaciones de React ocurren en la
 * continuacion asincrona, ya despues del `await`. `isStale` permite que el hook
 * descarte respuestas de peticiones que ya quedaron obsoletas, en lugar de
 * depender de un setState sincrono para marcar la carga.
 *
 * @param {string} branchId
 * @param {{ isStale: Function, onData: Function, onError: Function, onSettled: Function }} handlers
 */
export const loadReportsDashboard = async (
  branchId,
  { isStale, onData, onError, onSettled }
) => {
  try {
    const result = await getReportsDashboard(branchId);

    if (isStale()) return;

    onData(result);
  } catch (loadError) {
    if (isStale()) return;

    console.error("Error cargando el dashboard de reportes:", loadError);

    onError(
      loadError?.message || "No se pudo cargar el resumen de reportes."
    );
  } finally {
    if (!isStale()) onSettled();
  }
};

