import { useMemo, useState } from "react";

import {
  clampRangeToToday,
  filterTransfersByDateRange,
  getPresetRange,
} from "../utils/transfersUtils";

const INITIAL_DATE_RANGE = {
  dateFrom: null,
  dateTo: null,
};

const getEmptyHistoryMessage = ({ hasFolio, hasDateRange }) => {
  if (hasFolio && hasDateRange) {
    return "No hay traspasos con esos filtros.";
  }

  if (hasFolio) {
    return "No hay traspasos con ese folio.";
  }

  if (hasDateRange) {
    return "No hay traspasos en el rango de fechas seleccionado.";
  }

  return "Todavía no hay traspasos registrados para esta sucursal.";
};

const useTransferHistoryFilters = ({ transferHistory = [] }) => {
  const [folioSearch, setFolioSearch] = useState("");
  const [dateRange, setDateRange] = useState(INITIAL_DATE_RANGE);
  const [rangePreset, setRangePreset] = useState("custom");

  const searchKey = folioSearch.trim().toLowerCase();

  const filteredHistory = useMemo(() => {
    const byFolio = searchKey
      ? transferHistory.filter((order) =>
          `${order.folio ?? ""}`.toLowerCase().includes(searchKey)
        )
      : transferHistory;

    return filterTransfersByDateRange(
      byFolio,
      dateRange.dateFrom,
      dateRange.dateTo
    );
  }, [transferHistory, searchKey, dateRange]);

  const handleDateChange = (key, date) => {
    setDateRange((previous) => ({ ...previous, [key]: date }));
    setRangePreset("custom");
  };

  const handleRangePreset = (preset) => {
    setDateRange(clampRangeToToday(getPresetRange(preset)));
    setRangePreset(preset);
  };

  const handleClearFilters = () => {
    setFolioSearch("");
    setDateRange(INITIAL_DATE_RANGE);
    setRangePreset("custom");
  };

  const handleFolioSearchChange = (value) => {
    setFolioSearch(value);
  };

  const hasDateRange = Boolean(dateRange.dateFrom || dateRange.dateTo);
  const hasActiveFilters = Boolean(searchKey || hasDateRange);
  const emptyMessage = getEmptyHistoryMessage({
    hasFolio: Boolean(searchKey),
    hasDateRange,
  });

  return {
    filteredHistory,
    dateRange,
    rangePreset,
    folioSearch,
    hasActiveFilters,
    emptyMessage,
    handleDateChange,
    handleRangePreset,
    handleClearFilters,
    handleFolioSearchChange,
  };
};

export default useTransferHistoryFilters;
