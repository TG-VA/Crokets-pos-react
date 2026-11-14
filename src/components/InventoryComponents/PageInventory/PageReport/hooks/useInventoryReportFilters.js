import { useEffect, useState } from "react";

import {
  QUANTITY_FILTER_PREFIX,
  INITIAL_FACET_FILTERS,
} from "../utils/inventoryReportUtils";

const useInventoryReportFilters = () => {
  const [facetFilters, setFacetFilters] = useState(INITIAL_FACET_FILTERS);

  const [openFacet, setOpenFacet] = useState(null);
  const [facetSearch, setFacetSearch] = useState({});
  const [existenceQuantity, setExistenceQuantity] = useState("");

  useEffect(() => {
    if (!openFacet) return undefined;

    const key = openFacet;

    const handleMouseDown = (event) => {
      const popover = event.target?.closest?.(
        `[data-inv-filter-popover="${key}"]`
      );

      const button = event.target?.closest?.(
        `[data-inv-filter-button="${key}"]`
      );

      if (popover || button) return;

      setOpenFacet(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenFacet(null);
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openFacet]);

  const setFacet = (key, values, { close = false } = {}) => {
    setFacetFilters((previous) => ({
      ...previous,
      [key]: values,
    }));

    if (close) {
      setOpenFacet(null);
    }
  };

  const toggleFacetValue = (key, value, { close = true } = {}) => {
    setFacetFilters((previous) => {
      const currentValues = Array.isArray(previous[key]) ? previous[key] : [];

      const valueExists = currentValues.includes(value);

      return {
        ...previous,
        [key]: valueExists
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value],
      };
    });

    if (close) {
      setOpenFacet(null);
    }
  };

  const clearFacet = (key, { close = true } = {}) => {
    setFacet(key, [], { close });

    if (key === "existencia") {
      setExistenceQuantity("");
    }
  };

  const toggleFacet = (key) => {
    setOpenFacet((previous) => {
      const next = previous === key ? null : key;

      if (next && next !== "existencia") {
        setFacetSearch((current) => ({
          ...current,
          [key]: current?.[key] ?? "",
        }));
      }

      return next;
    });
  };

  const handleSearchFacet = (key, value) => {
    setFacetSearch((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSelectAllFacet = (key, values) => {
    setFacet(key, values, { close: true });
  };

  const clearAllFilters = () => {
    setFacetFilters(INITIAL_FACET_FILTERS);

    setFacetSearch({});
    setExistenceQuantity("");
    setOpenFacet(null);
  };

  const handleExistenceQuantityChange = (event) => {
    const value = event.target.value.replace(/\D/g, "");
    setExistenceQuantity(value);
  };

  const applyExistenceQuantityFilter = () => {
    const cleanQuantity = String(existenceQuantity || "").trim();

    if (!cleanQuantity) return;

    const normalizedQuantity = String(Number(cleanQuantity));
    const quantityFilter = `${QUANTITY_FILTER_PREFIX}${normalizedQuantity}`;

    setFacetFilters((previous) => {
      const currentValues = Array.isArray(previous.existencia)
        ? previous.existencia
        : [];

      const valuesWithoutPreviousQuantities = currentValues.filter(
        (value) => !value.startsWith(QUANTITY_FILTER_PREFIX)
      );

      return {
        ...previous,
        existencia: [...valuesWithoutPreviousQuantities, quantityFilter],
      };
    });

    setExistenceQuantity(normalizedQuantity);
    setOpenFacet(null);
  };

  const removeExistenceQuantityFilter = () => {
    setFacetFilters((previous) => ({
      ...previous,
      existencia: previous.existencia.filter(
        (value) => !value.startsWith(QUANTITY_FILTER_PREFIX)
      ),
    }));

    setExistenceQuantity("");
  };

  const closeFacet = () => setOpenFacet(null);

  return {
    facetFilters,
    openFacet,
    facetSearch,
    existenceQuantity,
    toggleFacet,
    toggleFacetValue,
    clearFacet,
    clearAllFilters,
    closeFacet,
    handleSearchFacet,
    handleSelectAllFacet,
    handleExistenceQuantityChange,
    applyExistenceQuantityFilter,
    removeExistenceQuantityFilter,
  };
};

export default useInventoryReportFilters;
