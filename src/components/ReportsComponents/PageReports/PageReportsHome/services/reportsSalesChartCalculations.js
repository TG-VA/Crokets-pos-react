import {
  CANCUN_OFFSET,
  DASHBOARD_DAYS,
  formatChartDayLabel,
  getDateInputFromIso,
  getDateInputValue,
  isCompletedSale,
  toNumber,
} from "./reportsDashboardUtils";

export const buildSalesChart = ({
  sales = [],
  returnedAmountBySale = {},
  firstDateInput,
}) => {
  const totalsByDate = {};

  for (
    let index = 0;
    index < DASHBOARD_DAYS;
    index += 1
  ) {
    const date = new Date(
      `${firstDateInput}T12:00:00${CANCUN_OFFSET}`
    );

    date.setDate(date.getDate() + index);

    const dateInput = getDateInputValue(date);

    totalsByDate[dateInput] = {
      date: dateInput,
      label: formatChartDayLabel(dateInput),
      total: 0,
      tickets: 0,
    };
  }

  for (const sale of sales) {
    if (!isCompletedSale(sale)) continue;

    const dateInput = getDateInputFromIso(
      sale.sale_date
    );

    if (!totalsByDate[dateInput]) continue;

    const returnedAmount = toNumber(
      returnedAmountBySale[sale.id]
    );

    const netTotal = Math.max(
      toNumber(sale.total) - returnedAmount,
      0
    );

    totalsByDate[dateInput].total += netTotal;
    totalsByDate[dateInput].tickets += 1;
  }

  return Object.values(totalsByDate);
};
