import {
  useCallback,
  useEffect,
  useState,
} from "react";

export const MOVEMENTS_COLUMNS = [
  {
    key: "date",
    label: "Fecha y hora",
    min: 120,
  },
  {
    key: "product",
    label: "Producto",
    min: 160,
  },
  {
    key: "ticket",
    label: "Ticket",
    min: 90,
  },
  {
    key: "type",
    label: "Tipo de movimiento",
    min: 140,
  },
  {
    key: "qty",
    label: "Cantidad",
    min: 60,
  },
  {
    key: "prev",
    label: "Stock anterior",
    min: 85,
  },
  {
    key: "next",
    label: "Nuevo stock",
    min: 85,
  },
  {
    key: "reason",
    label: "Motivo",
    min: 160,
  },
  {
    key: "user",
    label: "Usuario",
    min: 120,
  },
];

const COLUMN_WIDTHS_STORAGE_KEY =
  "movementsReportColWidths_v6";

const LEGACY_COLUMN_WIDTHS_STORAGE_KEYS = [
  "movementsReportColWidths_v5",
  "movementsReportColWidths_v4",
  "movementsReportColWidths_v3",
  "movementsReportColWidths_v2",
  "movementsReportColWidths",
];

const DEFAULT_COLUMN_WIDTHS = {
  date: 140,
  product: 280,
  ticket: 120,
  type: 160,
  qty: 72,
  prev: 92,
  next: 92,
  reason: 260,
  user: 140,
};

const getColumnMinimumWidth = (
  columnKey
) => {
  const column = MOVEMENTS_COLUMNS.find(
    (item) => item.key === columnKey
  );

  return column?.min ?? 60;
};

const normalizeColumnWidths = (
  sourceWidths = {}
) => {
  const nextWidths = {
    ...DEFAULT_COLUMN_WIDTHS,
  };

  Object.keys(
    DEFAULT_COLUMN_WIDTHS
  ).forEach((key) => {
    const rawWidth = sourceWidths[key];

    const parsedWidth =
      typeof rawWidth === "number"
        ? rawWidth
        : Number(rawWidth);

    if (!Number.isFinite(parsedWidth)) {
      return;
    }

    nextWidths[key] = Math.max(
      getColumnMinimumWidth(key),
      parsedWidth
    );
  });

  return nextWidths;
};

const readStoredColumnWidths = () => {
  try {
    const currentStoredValue =
      window.localStorage.getItem(
        COLUMN_WIDTHS_STORAGE_KEY
      );

    if (currentStoredValue) {
      const parsedValue =
        JSON.parse(currentStoredValue);

      if (
        parsedValue &&
        typeof parsedValue === "object"
      ) {
        return normalizeColumnWidths(
          parsedValue
        );
      }
    }

    for (
      const legacyStorageKey of
      LEGACY_COLUMN_WIDTHS_STORAGE_KEYS
    ) {
      const legacyStoredValue =
        window.localStorage.getItem(
          legacyStorageKey
        );

      if (!legacyStoredValue) {
        continue;
      }

      const parsedLegacyValue =
        JSON.parse(
          legacyStoredValue
        );

      if (
        parsedLegacyValue &&
        typeof parsedLegacyValue ===
          "object"
      ) {
        return normalizeColumnWidths(
          parsedLegacyValue
        );
      }
    }

    return {
      ...DEFAULT_COLUMN_WIDTHS,
    };
  } catch (error) {
    console.error(
      "Error leyendo anchos de columnas:",
      error
    );

    return {
      ...DEFAULT_COLUMN_WIDTHS,
    };
  }
};

const useResizableColumns = () => {
  const [
    columnWidths,
    setColumnWidths,
  ] = useState(readStoredColumnWidths);

  const [
    isResizing,
    setIsResizing,
  ] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        COLUMN_WIDTHS_STORAGE_KEY,
        JSON.stringify(columnWidths)
      );
    } catch (error) {
      console.error(
        "Error guardando anchos de columnas:",
        error
      );
    }
  }, [columnWidths]);

  const startResize = useCallback(
    (
      columnKey,
      minimumWidth = 60,
      event
    ) => {
      if (!columnKey || !event) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const initialMouseX =
        event.clientX;

      const effectiveMinimumWidth =
        Math.max(
          minimumWidth,
          getColumnMinimumWidth(
            columnKey
          )
        );

      const initialColumnWidth =
        Number(
          columnWidths[columnKey] ??
            DEFAULT_COLUMN_WIDTHS[
              columnKey
            ] ??
            effectiveMinimumWidth
        );

      setIsResizing(true);

      const handleMouseMove = (
        mouseEvent
      ) => {
        const movement =
          mouseEvent.clientX -
          initialMouseX;

        const nextWidth = Math.max(
          effectiveMinimumWidth,
          Math.round(
            initialColumnWidth +
              movement
          )
        );

        setColumnWidths(
          (currentWidths) => ({
            ...currentWidths,
            [columnKey]: nextWidth,
          })
        );
      };

      const handleMouseUp = () => {
        window.removeEventListener(
          "mousemove",
          handleMouseMove
        );

        window.removeEventListener(
          "mouseup",
          handleMouseUp
        );

        setIsResizing(false);
      };

      window.addEventListener(
        "mousemove",
        handleMouseMove
      );

      window.addEventListener(
        "mouseup",
        handleMouseUp
      );
    },
    [columnWidths]
  );

  const resetColumnWidths =
    useCallback(() => {
      setColumnWidths({
        ...DEFAULT_COLUMN_WIDTHS,
      });
    }, []);

  return {
    columns: MOVEMENTS_COLUMNS,
    columnWidths,
    isResizing,

    setColumnWidths,
    startResize,
    resetColumnWidths,
  };
};

export default useResizableColumns;