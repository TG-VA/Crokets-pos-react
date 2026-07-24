import {
  getDateInputFromIso,
  toNumber,
} from "./reportsDashboardUtils";

export const buildValidReturnsData = ({
  returnRows = [],
  returnItems = [],
  validSaleIds,
}) => {
  if (!(validSaleIds instanceof Set)) {
    return {
      validReturnRows: [],
      validReturnItems: [],
    };
  }

  const validReturnRows = returnRows.filter(
    (row) =>
      row?.id &&
      validSaleIds.has(row.sale_id)
  );

  const validReturnIds = new Set(
    validReturnRows.map((row) => row.id)
  );

  const validReturnItems = returnItems.filter(
    (item) =>
      item?.return_id &&
      validReturnIds.has(item.return_id)
  );

  return {
    validReturnRows,
    validReturnItems,
  };
};

export const buildTodaySalesKpis = ({
  completedSales = [],
  detailRows = [],
  returnedAmountBySale = {},
  returnedUnitsToday = 0,
  todayInput,
}) => {
  const todaySales = completedSales.filter(
    (sale) =>
      getDateInputFromIso(sale.sale_date) ===
      todayInput
  );

  const todaySaleIds = new Set(
    todaySales.map((sale) => sale.id)
  );

  const netSalesToday = todaySales.reduce(
    (sum, sale) => {
      const returnedAmount = toNumber(
        returnedAmountBySale[sale.id]
      );

      const netSaleAmount = Math.max(
        toNumber(sale.total) -
          returnedAmount,
        0
      );

      return sum + netSaleAmount;
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

  const normalizedReturnedUnitsToday =
    toNumber(returnedUnitsToday);

  const netUnitsToday =
    grossUnitsSoldToday -
    normalizedReturnedUnitsToday;

  return {
    netSalesToday,
    completedTicketsToday,
    averageTicketToday,
    grossUnitsSoldToday,
    returnedUnitsToday:
      normalizedReturnedUnitsToday,
    netUnitsToday,
  };
};
