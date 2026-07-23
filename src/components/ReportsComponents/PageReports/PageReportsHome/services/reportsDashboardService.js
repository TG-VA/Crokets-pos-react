import {
  getDashboardDateRanges,
  getDateInputFromIso,
  getEmptyReportsDashboard,
  isCompletedSale,
  toNumber,
  uniqueValues,
} from "./reportsDashboardUtils";

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
    salesRows.map((sale) => sale.id)
  );

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
    returnRows.map((row) => row.id)
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

  const [
    productRows,
    paymentMethodRows,
  ] = await Promise.all([
    getProductsByIds(productIds),

    getPaymentMethodsByIds(
      paymentMethodIds
    ),
  ]);

  const returnedAmountBySale =
    buildReturnedAmountBySale(
      returnRows
    );

  const completedSales =
    salesRows.filter(isCompletedSale);

  const completedSaleIds = new Set(
    completedSales.map(
      (sale) => sale.id
    )
  );

  const returnedQuantityByProduct =
    buildReturnedQuantityByProduct(
      returnItems
    );

  const returnedAmountByProduct =
    buildReturnedAmountByProduct({
      returnRows,
      returnItems,
      validSaleIds: completedSaleIds,
    });

  const todaySales =
    completedSales.filter(
      (sale) =>
        getDateInputFromIso(
          sale.sale_date
        ) === todayInput
    );

  const todaySaleIds = new Set(
    todaySales.map((sale) => sale.id)
  );

  const netSalesToday =
    todaySales.reduce(
      (sum, sale) => {
        const returnedAmount =
          toNumber(
            returnedAmountBySale[
              sale.id
            ]
          );

        return (
          sum +
          Math.max(
            toNumber(sale.total) -
              returnedAmount,
            0
          )
        );
      },
      0
    );

  const completedTicketsToday =
    todaySales.length;

  const averageTicketToday =
    completedTicketsToday > 0
      ? netSalesToday /
        completedTicketsToday
      : 0;

  const grossUnitsSoldToday =
    detailRows.reduce(
      (sum, detail) => {
        if (
          !todaySaleIds.has(
            detail.sale_id
          )
        ) {
          return sum;
        }

        return (
          sum +
          toNumber(detail.quantity)
        );
      },
      0
    );

  const returnedUnitsToday =
    toNumber(todayReturns.units);

  const netUnitsToday =
    grossUnitsSoldToday -
    returnedUnitsToday;

  const inventoryAlerts =
    buildInventoryAlerts(
      inventoryRows
    );

  return {
    kpis: {
      netSalesToday,
      completedTicketsToday,
      averageTicketToday,
      grossUnitsSoldToday,
      returnedUnitsToday,
      netUnitsToday,
    },

    salesChart: buildSalesChart({
      sales: salesRows,
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
          salesRows,
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