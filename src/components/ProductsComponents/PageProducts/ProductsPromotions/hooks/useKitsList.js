import { useMemo, useState } from "react";
import { usePagination } from "../../../../../hooks/usePagination";
import { filterKits, KIT_STATUS_FILTERS } from "../services/kitsFilterService";
import { sortKits } from "../services/kitsSortService";
import {
  getTodayInTimezone,
  isKitExpiringSoon,
} from "../services/kitValidityCalculationService";

const KITS_PAGE_SIZE = 10;
const KITS_PAGE_SIZE_OPTIONS = [5, 10, 20];

export const useKitsList = (kits) => {
  const [searchTerm, setSearchTermState] = useState("");
  const [status, setStatusState] = useState(KIT_STATUS_FILTERS.ALL);

  const [sortCriterion, setSortCriterionState] = useState(null);
  const [expiringOnly, setExpiringOnly] = useState(false);

  const expiringKitIds = useMemo(() => {
    const today = getTodayInTimezone();
    return new Set(
      (kits ?? [])
        .filter((kit) => isKitExpiringSoon(kit, today))
        .map((kit) => kit.id)
    );
  }, [kits]);

  const filteredKits = useMemo(() => {
    const base = filterKits(kits, { searchTerm, status });
    const scoped = expiringOnly
      ? base.filter((kit) => expiringKitIds.has(kit.id))
      : base;
    return sortKits(scoped, sortCriterion);
  }, [kits, searchTerm, status, sortCriterion, expiringOnly, expiringKitIds]);

  const pagination = usePagination({
    totalItems: filteredKits.length,
    defaultPageSize: KITS_PAGE_SIZE,
    pageSizeOptions: KITS_PAGE_SIZE_OPTIONS,
  });

  const setSearchTerm = (value) => {
    setSearchTermState(value);
    pagination.resetPagination();
  };

  const setSortCriterion = (value) => {
    setSortCriterionState(value);
    pagination.resetPagination();
  };
  const setStatus = (value) => {
    setStatusState(value);
    pagination.resetPagination();
  };

  const toggleExpiringOnly = () => {
    setExpiringOnly((current) => !current);
    pagination.resetPagination();
  };

  return {
    searchTerm,
    setSearchTerm,
    status,
    setStatus,
    sortCriterion,
    setSortCriterion,
    expiringOnly,
    toggleExpiringOnly,
    expiringCount: expiringKitIds.size,
    expiringKitIds,
    filteredKits,
    visibleKits: pagination.pageItems(filteredKits),
    pagination,
    pageSizeOptions: KITS_PAGE_SIZE_OPTIONS,
  };
};
