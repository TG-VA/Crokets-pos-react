// Reexportados desde src/utils para no romper los imports existentes.
export {
  getCachedValue,
  setCachedValue,
} from "../../../../../utils/localStorageCache";
export {
  getDatabaseErrorMessage,
  isMissingColumnError,
  isMissingRelationError,
} from "../../../../../utils/databaseErrors";

export const getUniqueIds = (rows, field) => {
  const normalizedRows = Array.isArray(rows) ? rows : [];

  return Array.from(
    new Set(normalizedRows.map((row) => row?.[field]).filter(Boolean))
  );
};

export const createEntityMap = (items) => {
  const normalizedItems = Array.isArray(items) ? items : [];

  return new Map(
    normalizedItems.filter((item) => item?.id).map((item) => [item.id, item])
  );
};

import { parseMovementDate } from "../utils/movementDateUtils";

export const sortMovementsByDate = (movements) => {
  const normalizedMovements = Array.isArray(movements) ? movements : [];

  return [...normalizedMovements].sort((first, second) => {
    const firstType = String(first?.movement_type ?? "")
      .trim()
      .toLowerCase();
    const secondType = String(second?.movement_type ?? "")
      .trim()
      .toLowerCase();

    const firstDate = parseMovementDate(
      first?.report_sort_at ?? first?.created_at ?? 0,
      {
        assumeUtcNaive: ["transfer", "canceled", "return"].includes(firstType),
      }
    );

    const secondDate = parseMovementDate(
      second?.report_sort_at ?? second?.created_at ?? 0,
      {
        assumeUtcNaive: ["transfer", "canceled", "return"].includes(secondType),
      }
    );

    const firstTimestamp = firstDate?.getTime?.() ?? 0;
    const secondTimestamp = secondDate?.getTime?.() ?? 0;

    const safeFirstTimestamp = Number.isFinite(firstTimestamp)
      ? firstTimestamp
      : 0;

    const safeSecondTimestamp = Number.isFinite(secondTimestamp)
      ? secondTimestamp
      : 0;

    return safeSecondTimestamp - safeFirstTimestamp;
  });
};
