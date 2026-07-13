export const MOVEMENTS_TIME_ZONE =
  "America/Cancun";

export const formatDateTime = (
  value,
  { useSystemTime = false } = {}
) => {
  if (!value) return "—";

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  if (!useSystemTime) {
    options.timeZone =
      MOVEMENTS_TIME_ZONE;
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    options
  ).format(date);
};

export const getDateParts = (
  value,
  { useSystemTime = false } = {}
) => {
  if (!value) return null;

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  if (!useSystemTime) {
    options.timeZone =
      MOVEMENTS_TIME_ZONE;
  }

  const parts = new Intl.DateTimeFormat(
    "en-CA",
    options
  ).formatToParts(date);

  const partsMap = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ])
  );

  if (
    !partsMap.year ||
    !partsMap.month ||
    !partsMap.day
  ) {
    return null;
  }

  return {
    year: partsMap.year,
    month: partsMap.month,
    day: partsMap.day,
  };
};

export const getDateKeyFromValue = (
  value,
  options
) => {
  const parts = getDateParts(
    value,
    options
  );

  if (!parts) return null;

  return [
    parts.year,
    parts.month,
    parts.day,
  ].join("-");
};

export const getTodayDateKey = () => {
  return (
    getDateKeyFromValue(new Date()) ||
    "0000-00-00"
  );
};

export const formatDateKeyLabel = (
  value
) => {
  if (!value) return "—";

  const [year, month, day] =
    String(value).split("-");

  if (!year || !month || !day) {
    return "—";
  }

  return `${day}/${month}/${year}`;
};

export const dateKeyToDate = (
  value
) => {
  if (!value) return null;

  const [year, month, day] =
    String(value)
      .split("-")
      .map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

export const dateToLocalKey = (
  value
) => {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return getTodayDateKey();
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const formatDateForFilename = (
  value = new Date()
) => {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "00-00-00";
  }

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const year = String(
    date.getFullYear()
  ).slice(-2);

  return `${day}-${month}-${year}`;
};

export const createDateRange = (
  startDateKey,
  endDateKey
) => {
  const fallbackDateKey =
    getTodayDateKey();

  let normalizedStartKey =
    startDateKey || fallbackDateKey;

  let normalizedEndKey =
    endDateKey ||
    normalizedStartKey;

  if (
    normalizedStartKey >
    normalizedEndKey
  ) {
    [
      normalizedStartKey,
      normalizedEndKey,
    ] = [
      normalizedEndKey,
      normalizedStartKey,
    ];
  }

  const start = dateKeyToDate(
    normalizedStartKey
  );

  const end = dateKeyToDate(
    normalizedEndKey
  );

  if (!start || !end) {
    return null;
  }

  return {
    start,
    end,
    startKey: normalizedStartKey,
    endKey: normalizedEndKey,
  };
};

export const getDateRangeForPreset = (
  dateKey,
  preset = "day"
) => {
  const baseKey =
    dateKey || getTodayDateKey();

  const baseDate =
    dateKeyToDate(baseKey);

  if (!baseDate) {
    return null;
  }

  if (preset === "month") {
    const start = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      1
    );

    const end = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() + 1,
      0
    );

    return createDateRange(
      dateToLocalKey(start),
      dateToLocalKey(end)
    );
  }

  if (preset === "week") {
    const start = new Date(baseDate);

    const dayOfWeek =
      start.getDay();

    const daysFromMonday =
      dayOfWeek === 0
        ? 6
        : dayOfWeek - 1;

    start.setDate(
      start.getDate() -
        daysFromMonday
    );

    const end = new Date(start);

    end.setDate(
      start.getDate() + 6
    );

    return createDateRange(
      dateToLocalKey(start),
      dateToLocalKey(end)
    );
  }

  return createDateRange(
    baseKey,
    baseKey
  );
};