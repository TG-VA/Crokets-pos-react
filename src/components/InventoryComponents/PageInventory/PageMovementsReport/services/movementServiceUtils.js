export const getCachedValue = (key) => {
  if (
    typeof window === "undefined" ||
    !window.localStorage
  ) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
};

export const setCachedValue = (
  key,
  value
) => {
  if (
    typeof window === "undefined" ||
    !window.localStorage
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      key,
      value
    );
  } catch (_error) {
    // El caché es opcional.
  }
};

export const getDatabaseErrorMessage = (
  error
) => {
  return String(
    error?.message ??
      error?.details ??
      error?.hint ??
      ""
  )
    .trim()
    .toLowerCase();
};

export const isMissingColumnError = (
  error
) => {
  return getDatabaseErrorMessage(
    error
  ).includes("column");
};

export const isMissingRelationError = (
  error
) => {
  const message =
    getDatabaseErrorMessage(error);

  return (
    message.includes("relation") ||
    message.includes("does not exist")
  );
};

export const getUniqueIds = (
  rows,
  field
) => {
  const normalizedRows =
    Array.isArray(rows)
      ? rows
      : [];

  return Array.from(
    new Set(
      normalizedRows
        .map((row) => row?.[field])
        .filter(Boolean)
    )
  );
};

export const createEntityMap = (
  items
) => {
  const normalizedItems =
    Array.isArray(items)
      ? items
      : [];

  return new Map(
    normalizedItems
      .filter((item) => item?.id)
      .map((item) => [
        item.id,
        item,
      ])
  );
};

export const sortMovementsByDate = (
  movements
) => {
  const normalizedMovements =
    Array.isArray(movements)
      ? movements
      : [];

  return [...normalizedMovements].sort(
    (first, second) => {
      const firstTimestamp =
        new Date(
          first?.report_sort_at ??
            first?.created_at ??
            0
        ).getTime();

      const secondTimestamp =
        new Date(
          second?.report_sort_at ??
            second?.created_at ??
            0
        ).getTime();

      const safeFirstTimestamp =
        Number.isFinite(firstTimestamp)
          ? firstTimestamp
          : 0;

      const safeSecondTimestamp =
        Number.isFinite(secondTimestamp)
          ? secondTimestamp
          : 0;

      return (
        safeSecondTimestamp -
        safeFirstTimestamp
      );
    }
  );
};