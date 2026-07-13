import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  buildRowView,
  MOVEMENT_TYPE_LABELS,
} from "../utils/movementFormatters";

import {
  createDateRange,
} from "../utils/movementDateUtils";

export const FILTERABLE_MOVEMENT_COLUMNS = new Set([
  "product",
  "ticket",
  "type",
  "reason",
  "user",
]);

const INITIAL_FACET_FILTERS = {
  product: null,
  ticket: null,
  type: null,
  reason: null,
  user: null,
};

const INITIAL_FACET_SEARCH = {
  product: "",
  ticket: "",
  type: "",
  reason: "",
  user: "",
};

const normalizeFilterValue = (value) => {
  return String(value ?? "").trim();
};

const createOptionList = (
  valuesMap,
  labelsMap = null
) => {
  return Array.from(valuesMap.entries())
    .map(([value, count]) => ({
      value,
      label:
        labelsMap?.get?.(value) ??
        value,
      count,
    }))
    .sort((first, second) =>
      first.label.localeCompare(
        second.label,
        "es",
        {
          sensitivity: "base",
        }
      )
    );
};

const addOptionValue = (
  valuesMap,
  value
) => {
  const normalizedValue =
    normalizeFilterValue(value);

  if (
    !normalizedValue ||
    normalizedValue === "—"
  ) {
    return;
  }

  valuesMap.set(
    normalizedValue,
    (valuesMap.get(normalizedValue) ?? 0) + 1
  );
};

const useMovementsFilters = ({
  rows,
  startDateKey,
  endDateKey,
}) => {
  const [
    facetFilters,
    setFacetFilters,
  ] = useState(INITIAL_FACET_FILTERS);

  const [
    facetSearch,
    setFacetSearch,
  ] = useState(INITIAL_FACET_SEARCH);

  const [
    openFacet,
    setOpenFacet,
  ] = useState(null);

  useEffect(() => {
    if (!openFacet) {
      return undefined;
    }

    const currentFacet = openFacet;

    const handleMouseDown = (event) => {
      const clickedPopover =
        event.target?.closest?.(
          `[data-mov-filter-popover="${currentFacet}"]`
        );

      const clickedButton =
        event.target?.closest?.(
          `[data-mov-filter-button="${currentFacet}"]`
        );

      if (
        clickedPopover ||
        clickedButton
      ) {
        return;
      }

      setOpenFacet(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenFacet(null);
      }
    };

    window.addEventListener(
      "mousedown",
      handleMouseDown
    );

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "mousedown",
        handleMouseDown
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [openFacet]);

  const rowViews = useMemo(() => {
    const sourceRows = Array.isArray(rows)
      ? rows
      : [];

    return sourceRows.map((row) => ({
      row,
      view: buildRowView(row),
    }));
  }, [rows]);

  const rowsForFacets = useMemo(() => {
    const range = createDateRange(
      startDateKey,
      endDateKey
    );

    if (!range) {
      return rowViews;
    }

    return rowViews.filter(({ view }) => {
      const currentDateKey =
        view.soldAtDateKey;

      if (!currentDateKey) {
        return false;
      }

      return (
        currentDateKey >= range.startKey &&
        currentDateKey <= range.endKey
      );
    });
  }, [
    rowViews,
    startDateKey,
    endDateKey,
  ]);

  const periodRows = useMemo(() => {
    return rowsForFacets.map(
      ({ row }) => row
    );
  }, [rowsForFacets]);

  const facetOptions = useMemo(() => {
    const productValues = new Map();
    const ticketValues = new Map();
    const typeValues = new Map();
    const reasonValues = new Map();
    const userValues = new Map();

    rowsForFacets.forEach(({ view }) => {
      addOptionValue(
        productValues,
        view.productName
      );

      addOptionValue(
        ticketValues,
        view.ticket
      );

      const movementTypeValues =
        Array.isArray(
          view.typeFilterKeys
        ) &&
        view.typeFilterKeys.length > 0
          ? Array.from(
              new Set(
                view.typeFilterKeys
              )
            )
          : [
              view.typeKey ||
                view.typeLabel,
            ];

      movementTypeValues.forEach(
        (movementType) => {
          addOptionValue(
            typeValues,
            movementType
          );
        }
      );

      addOptionValue(
        reasonValues,
        view.reason
      );

      addOptionValue(
        userValues,
        view.username
      );
    });

    const movementTypeLabels =
      new Map(
        Object.entries(
          MOVEMENT_TYPE_LABELS
        )
      );

    return {
      product: createOptionList(
        productValues
      ),

      ticket: createOptionList(
        ticketValues
      ),

      type: createOptionList(
        typeValues,
        movementTypeLabels
      ),

      reason: createOptionList(
        reasonValues
      ),

      user: createOptionList(
        userValues
      ),
    };
  }, [rowsForFacets]);

  const filteredRows = useMemo(() => {
    const valueMatches = (
      selection,
      value
    ) => {
      if (selection === null) {
        return true;
      }

      if (!Array.isArray(selection)) {
        return true;
      }

      return selection.includes(value);
    };

    const typeMatches = (
      selection,
      view
    ) => {
      if (selection === null) {
        return true;
      }

      if (!Array.isArray(selection)) {
        return true;
      }

      const possibleValues =
        Array.from(
          new Set(
            [
              view.typeKey,
              view.typeLabel,
              ...(Array.isArray(
                view.typeFilterKeys
              )
                ? view.typeFilterKeys
                : []),
            ].filter(Boolean)
          )
        );

      return possibleValues.some(
        (value) =>
          selection.includes(value)
      );
    };

    return rowsForFacets
      .filter(({ view }) => {
        if (
          !valueMatches(
            facetFilters.product,
            view.productName
          )
        ) {
          return false;
        }

        if (
          !valueMatches(
            facetFilters.ticket,
            view.ticket
          )
        ) {
          return false;
        }

        if (
          !typeMatches(
            facetFilters.type,
            view
          )
        ) {
          return false;
        }

        if (
          !valueMatches(
            facetFilters.reason,
            view.reason
          )
        ) {
          return false;
        }

        if (
          !valueMatches(
            facetFilters.user,
            view.username
          )
        ) {
          return false;
        }

        return true;
      })
      .map(({ row }) => row);
  }, [
    rowsForFacets,
    facetFilters,
  ]);

  const toggleFacet = useCallback(
    (facetKey) => {
      if (
        !FILTERABLE_MOVEMENT_COLUMNS.has(
          facetKey
        )
      ) {
        return;
      }

      setOpenFacet(
        (currentOpenFacet) =>
          currentOpenFacet === facetKey
            ? null
            : facetKey
      );
    },
    []
  );

  const closeFacet = useCallback(() => {
    setOpenFacet(null);
  }, []);

  const setFacetSearchValue =
    useCallback(
      (facetKey, value) => {
        setFacetSearch(
          (currentSearch) => ({
            ...currentSearch,
            [facetKey]:
              String(value ?? ""),
          })
        );
      },
      []
    );

  const clearFacetSearch =
    useCallback((facetKey) => {
      setFacetSearch(
        (currentSearch) => ({
          ...currentSearch,
          [facetKey]: "",
        })
      );
    }, []);

  const showAllFacetValues =
    useCallback(
      (
        facetKey,
        { close = true } = {}
      ) => {
        setFacetFilters(
          (currentFilters) => ({
            ...currentFilters,
            [facetKey]: null,
          })
        );

        if (close) {
          setOpenFacet(null);
        }
      },
      []
    );

  const showNoFacetValues =
    useCallback(
      (
        facetKey,
        { close = true } = {}
      ) => {
        setFacetFilters(
          (currentFilters) => ({
            ...currentFilters,
            [facetKey]: [],
          })
        );

        if (close) {
          setOpenFacet(null);
        }
      },
      []
    );

  const setFacetValues =
    useCallback(
      (
        facetKey,
        values,
        { close = false } = {}
      ) => {
        setFacetFilters(
          (currentFilters) => ({
            ...currentFilters,
            [facetKey]:
              Array.isArray(values)
                ? values
                : null,
          })
        );

        if (close) {
          setOpenFacet(null);
        }
      },
      []
    );

  const toggleFacetValue =
    useCallback(
      (facetKey, value) => {
        setFacetFilters(
          (currentFilters) => {
            const currentSelection =
              currentFilters[facetKey];

            const availableValues =
              (
                facetOptions[
                  facetKey
                ] ?? []
              ).map(
                (option) =>
                  option.value
              );

            const normalizedSelection =
              currentSelection === null
                ? availableValues
                : Array.isArray(
                      currentSelection
                    )
                  ? currentSelection
                  : [];

            const valueExists =
              normalizedSelection.includes(
                value
              );

            const nextSelection =
              valueExists
                ? normalizedSelection.filter(
                    (currentValue) =>
                      currentValue !== value
                  )
                : [
                    ...normalizedSelection,
                    value,
                  ];

            const allValuesSelected =
              availableValues.length > 0 &&
              nextSelection.length ===
                availableValues.length &&
              availableValues.every(
                (availableValue) =>
                  nextSelection.includes(
                    availableValue
                  )
              );

            return {
              ...currentFilters,
              [facetKey]:
                allValuesSelected
                  ? null
                  : nextSelection,
            };
          }
        );
      },
      [facetOptions]
    );

  const resetAllFilters =
    useCallback(() => {
      setFacetFilters({
        ...INITIAL_FACET_FILTERS,
      });

      setFacetSearch({
        ...INITIAL_FACET_SEARCH,
      });

      setOpenFacet(null);
    }, []);

  const isFacetValueSelected =
    useCallback(
      (facetKey, value) => {
        const selection =
          facetFilters[facetKey];

        if (selection === null) {
          return true;
        }

        return (
          Array.isArray(selection) &&
          selection.includes(value)
        );
      },
      [facetFilters]
    );

  const getFacetActiveCount =
    useCallback(
      (facetKey) => {
        const selection =
          facetFilters[facetKey];

        if (selection === null) {
          return null;
        }

        return Array.isArray(selection)
          ? selection.length
          : null;
      },
      [facetFilters]
    );

  const isFacetActive =
    useCallback(
      (facetKey) => {
        return (
          facetFilters[facetKey] !== null
        );
      },
      [facetFilters]
    );

  const getVisibleFacetOptions =
    useCallback(
      (facetKey) => {
        const options =
          facetOptions[facetKey] ?? [];

        const searchValue =
          String(
            facetSearch[facetKey] ?? ""
          )
            .trim()
            .toLowerCase();

        if (!searchValue) {
          return options;
        }

        return options.filter(
          (option) =>
            String(option.label)
              .toLowerCase()
              .includes(searchValue)
        );
      },
      [
        facetOptions,
        facetSearch,
      ]
    );

  return {
    filterableColumns:
      FILTERABLE_MOVEMENT_COLUMNS,

    facetFilters,
    facetSearch,
    facetOptions,
    openFacet,

    rowsForFacets: periodRows,
    periodRowsCount: periodRows.length,

    filteredRows,

    setFacetFilters,
    setOpenFacet,

    toggleFacet,
    closeFacet,

    setFacetSearchValue,
    clearFacetSearch,

    setFacetValues,
    toggleFacetValue,

    showAllFacetValues,
    showNoFacetValues,

    resetAllFilters,

    isFacetValueSelected,
    getFacetActiveCount,
    isFacetActive,
    getVisibleFacetOptions,
  };
};

export default useMovementsFilters;