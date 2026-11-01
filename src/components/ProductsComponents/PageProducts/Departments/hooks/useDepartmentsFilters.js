import { useCallback, useMemo, useState } from "react";
import { usePagination } from "../../../../../hooks/usePagination";
import { filterDepartments } from "../services/departmentsFilterService";

const INITIAL_FILTERS = { search: "", status: "all", commission: "all" };
const PAGE_SIZE = 8;
const PAGE_SIZE_OPTIONS = [PAGE_SIZE];

export const useDepartmentsFilters = (departments) => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const filteredDepartments = useMemo(
    () => filterDepartments(departments, filters),
    [departments, filters]
  );

  const pagination = usePagination({
    totalItems: filteredDepartments.length,
    defaultPageSize: PAGE_SIZE,
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
