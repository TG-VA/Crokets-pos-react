import { useMemo, useState } from "react";
import { usePagination } from "../../../../../hooks/usePagination";
import { filterKits, KIT_STATUS_FILTERS } from "../services/kitsFilterService";

const KITS_PAGE_SIZE = 4;

export const useKitsList = (kits) => {
  const [searchTerm, setSearchTermState] = useState("");
  const [status, setStatusState] = useState(KIT_STATUS_FILTERS.ALL);

  const filteredKits = useMemo(
    () => filterKits(kits, { searchTerm, status }),
    [kits, searchTerm, status]
  );

  const pagination = usePagination({
    totalItems: filteredKits.length,
    defaultPageSize: KITS_PAGE_SIZE,
    pageSizeOptions: [KITS_PAGE_SIZE],
  });

  const setSearchTerm = (value) => {
    setSearchTermState(value);
    pagination.resetPagination();
  };

  const setStatus = (value) => {
    setStatusState(value);
    pagination.resetPagination();
  };

  return {
    searchTerm,
    setSearchTerm,
    status,
    setStatus,
    filteredKits,
    visibleKits: pagination.pageItems(filteredKits),
    pagination,
  };
};
