export const TIME_ZONE = "America/Cancun";
export const CANCUN_OFFSET = "-05:00";
export const DASHBOARD_DAYS = 7;

export const EMPTY_DASHBOARD = {
  kpis: {
    netSalesToday: 0,
    completedTicketsToday: 0,
    averageTicketToday: 0,
    grossUnitsSoldToday: 0,
    returnedUnitsToday: 0,
    netUnitsToday: 0,
  },

  salesChart: [],

  highlights: {
    topProduct: null,
    mainPaymentMethod: null,
  },

  alerts: {
    cancelledSalesToday: 0,
    returnsToday: 0,
    returnedAmountToday: 0,
    returnedUnitsToday: 0,
    outOfStockProducts: [],
    lowStockProducts: [],
  },

  meta: {
    branchId: null,
    generatedAt: null,
  },
};

export const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

export const uniqueValues = (values = []) => {
  return [...new Set(values.filter(Boolean))];
};

export const getDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getCancunDayRange = (dateInput) => {
  return {
    start: new Date(
      `${dateInput}T00:00:00${CANCUN_OFFSET}`,
    ).toISOString(),

    end: new Date(
      `${dateInput}T23:59:59.999${CANCUN_OFFSET}`,
    ).toISOString(),
  };
};

export const getDashboardDateRanges = () => {
  const today = new Date();

  const todayInput = getDateInputValue(today);
  const todayRange = getCancunDayRange(todayInput);

  const firstChartDay = new Date(today);

  firstChartDay.setDate(
    today.getDate() - (DASHBOARD_DAYS - 1),
  );

  const firstChartDayInput =
    getDateInputValue(firstChartDay);

  return {
    todayInput,
    todayRange,

    chartRange: {
      start: getCancunDayRange(firstChartDayInput).start,
      end: todayRange.end,
    },
  };
};

export const getDateInputFromIso = (isoDate) => {
  if (!isoDate) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoDate));
};

export const formatChartDayLabel = (dateInput) => {
  const date = new Date(
    `${dateInput}T12:00:00${CANCUN_OFFSET}`,
  );

  return date
    .toLocaleDateString("es-MX", {
      timeZone: TIME_ZONE,
      weekday: "short",
      day: "2-digit",
    })
    .replace(".", "");
};

export const isCompletedSale = (sale) => {
  const status = String(sale?.status || "")
    .trim()
    .toLowerCase();

  return status !== "cancelled" && status !== "pending";
};

export const getMxnPaymentAmount = (payment) => {
  const amount = toNumber(payment?.amount);

  const currency = String(payment?.currency || "MXN")
    .trim()
    .toUpperCase();

  if (currency !== "USD") {
    return amount;
  }

  const exchangeRate = toNumber(payment?.exchange_rate);

  return exchangeRate > 0
    ? amount * exchangeRate
    : 0;
};

export const getEmptyReportsDashboard = () => {
  return structuredClone(EMPTY_DASHBOARD);
};