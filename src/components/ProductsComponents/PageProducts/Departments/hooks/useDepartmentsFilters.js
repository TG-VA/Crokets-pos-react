import { useCallback, useMemo, useState } from "react";
import { usePagination } from "../../../../../hooks/usePagination";
import { filterDepartments } from "../services/departmentsFilterService";

const INITIAL_FILTERS = { search: "", status: "all", commission: "all" };
const PAGE_SIZE_OPTIONS = [8];

export const useDepartmentsFilters = (departments) => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const filteredDepartments = useMemo(
    () => filterDepartments(departments, filters),
    [departments, filters]
  );

  const pagination = usePagination({
    totalItems: filteredDepartments.length,
    defaultPageSize: 8,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });
  const { resetPagination, pageItems } = pagination;

  const setFilter = useCallback(
    (key, value) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      resetPagination();
    },
    [resetPagination]
  );

  return {
    filters,
    setFilter,
    totalFiltered: filteredDepartments.length,
    visibleDepartments: pageItems(filteredDepartments),
    pagination,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };
};
