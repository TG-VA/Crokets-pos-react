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
  getPaymentMethodsByIds,
  getProductsByIds,
  getSaleDetails,
  getSalePayments,
  getSalesRows,
} from "./reportsSalesQueries";

import {
  buildMainPaymentMethod,
  buildSalesChart,
  buildTopProduct,
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

export { getEmptyReportsDashboard };

export const getReportsDashboard = async (
  branchId
) => {
  if (!branchId) {
    throw new Error(
      "No se detectó la sucursal activa."
    );
  }

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

  const productIds = uniqueValues([
    ...detailRows.map(
      (detail) => detail.product_id
    ),

    ...returnItems.map(
      (item) => item.product_id
    ),
  ]);

  const paymentMethodIds =
    uniqueValues(
      paymentRows.map(
        (payment) =>
          payment.payment_method_id
      )
    );

  /*
   * Tercera carga:
   * catálogos necesarios para presentar los
   * nombres de productos y métodos de pago.
   */
  const [
    productRows,
    paymentMethodRows,
  ] = await Promise.all([
    getProductsByIds(productIds),

    getPaymentMethodsByIds(
      paymentMethodIds
    ),
  ]);

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
      inventoryRows
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
      topProduct: buildTopProduct({
        detailRows,
        validSaleIds:
          completedSaleIds,
        returnedQuantityByProduct,
        returnedAmountByProduct,
        productRows,
      }),

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

      outOfStockProducts:
        inventoryAlerts
          .outOfStockProducts,

      lowStockProducts:
        inventoryAlerts
          .lowStockProducts,
    },

    meta: {
      branchId,

      generatedAt:
        new Date().toISOString(),
    },
  };
};