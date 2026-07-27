import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const DEFAULT_COLUMN_WIDTHS = [
  400,
  150,
  80,
  150,
  150,
];

const DEFAULT_COLUMN_PROPORTIONS = [
  0.4,
  0.15,
  0.1,
  0.15,
];

const useSalesTableColumns = ({
  minColumnWidth = 80,
  tableHorizontalOffset = 22,
  initialColumnWidths = DEFAULT_COLUMN_WIDTHS,
  columnProportions = DEFAULT_COLUMN_PROPORTIONS,
} = {}) => {
  const [columnWidths, setColumnWidths] =
    useState(initialColumnWidths);

  const [isInitialized, setIsInitialized] =
    useState(false);

  const tableRef = useRef(null);

  const resizeRef = useRef({
    isResizing: false,
    columnIndex: -1,
    startX: 0,
    startWidth: 0,
    nextStartWidth: 0,
  });

  const handleMouseMove = useCallback(
    (event) => {
      const {
        isResizing,
        columnIndex,
        startX,
        startWidth,
        nextStartWidth,
      } = resizeRef.current;

      if (
        !isResizing ||
        columnIndex === -1
      ) {
        return;
      }

      const deltaX =
        event.clientX - startX;

      let newWidth =
        startWidth + deltaX;

      let newNextWidth =
        nextStartWidth - deltaX;

      if (
        newWidth < minColumnWidth
      ) {
        newWidth =
          minColumnWidth;

        newNextWidth =
          startWidth +
          nextStartWidth -
          minColumnWidth;
      }

      if (
        newNextWidth <
        minColumnWidth
      ) {
        newNextWidth =
          minColumnWidth;

        newWidth =
          startWidth +
          nextStartWidth -
          minColumnWidth;
      }

      setColumnWidths(
        (previousWidths) => {
          const updatedWidths = [
            ...previousWidths,
          ];

          updatedWidths[
            columnIndex
          ] = newWidth;

          updatedWidths[
            columnIndex + 1
          ] = newNextWidth;

          return updatedWidths;
        },
      );
    },
    [minColumnWidth],
  );

  const handleMouseUp =
    useCallback(() => {
      resizeRef.current.isResizing =
        false;

      resizeRef.current.columnIndex =
        -1;

      document.removeEventListener(
        "mousemove",
        handleMouseMove,
      );

      document.removeEventListener(
        "mouseup",
        handleMouseUp,
      );

      document.body.style.cursor =
        "";

      document.body.style.userSelect =
        "";
    }, [handleMouseMove]);

  const handleMouseDown =
    useCallback(
      (event, columnIndex) => {
        event.preventDefault();
        event.stopPropagation();

        if (
          columnIndex >=
          columnWidths.length - 1
        ) {
          return;
        }

        resizeRef.current = {
          isResizing: true,
          columnIndex,
          startX:
            event.clientX,
          startWidth:
            columnWidths[
              columnIndex
            ],
          nextStartWidth:
            columnWidths[
              columnIndex + 1
            ],
        };

        document.addEventListener(
          "mousemove",
          handleMouseMove,
        );

        document.addEventListener(
          "mouseup",
          handleMouseUp,
        );

        document.body.style.cursor =
          "col-resize";

        document.body.style.userSelect =
          "none";
      },
      [
        columnWidths,
        handleMouseMove,
        handleMouseUp,
      ],
    );

  useEffect(() => {
    return () => {
      document.removeEventListener(
        "mousemove",
        handleMouseMove,
      );

      document.removeEventListener(
        "mouseup",
        handleMouseUp,
      );

      document.body.style.cursor =
        "";

      document.body.style.userSelect =
        "";
    };
  }, [
    handleMouseMove,
    handleMouseUp,
  ]);

  useEffect(() => {
    if (
      !tableRef.current ||
      isInitialized
    ) {
      return;
    }

    const tableWidth =
      tableRef.current.offsetWidth;

    const availableWidth =
      tableWidth -
      tableHorizontalOffset;

    const calculatedWidths =
      columnProportions.map(
        (proportion) =>
          Math.max(
            minColumnWidth,
            Math.floor(
              availableWidth *
                proportion,
            ),
          ),
      );

    const usedWidth =
      calculatedWidths.reduce(
        (sum, width) =>
          sum + width,
        0,
      );

    const lastColumnWidth =
      Math.max(
        minColumnWidth,
        availableWidth -
          usedWidth,
      );

    setColumnWidths([
      ...calculatedWidths,
      lastColumnWidth,
    ]);

    setIsInitialized(true);
  }, [
    columnProportions,
    isInitialized,
    minColumnWidth,
    tableHorizontalOffset,
  ]);

  const gridTemplate =
    columnWidths
      .map(
        (width) =>
          `${width}px`,
      )
      .join(" ");

  return {
    tableRef,
    columnWidths,
    gridTemplate,
    handleMouseDown,
  };
};

export default useSalesTableColumns;