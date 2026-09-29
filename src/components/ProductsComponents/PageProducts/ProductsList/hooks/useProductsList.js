import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useBranch } from "../../../../../contexts/BranchContext";
import { usePagination } from "../../../../../hooks/usePagination";
import { useProductsRealtime } from "../../../../../hooks/useProductsRealtime";
import { useDidChange } from "../../../../../hooks/useDidChange";
import { useRequestStatus } from "../../../../../hooks/useRequestStatus";
import {
  fetchDepartments,
  fetchPaginatedBranchProducts,
} from "../../../../../services/products/productCatalogService";

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const PAGE_SIZE_STORAGE_KEY = "crokets.productsList.pageSize";
const SEARCH_DEBOUNCE_MS = 400;

export const useProductsList = () => {
  const { branch } = useBranch();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [showDepartmentFilter, setShowDepartmentFilter] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [productsError, setProductsError] = useState(null);
  const [departmentOptions, setDepartmentOptions] = useState([]);

  const tableContainerRef = useRef(null);
  const filterRef = useRef(null);
  const selectedRowRef = useRef(null);

  const normalizeDept = (dept) => (dept || "").trim().toLowerCase();

  const formatDept = (dept) =>
    (dept || "")
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex: pageStart,
    endIndex: pageEnd,
    resetPagination,
    handlePageChange: changePage,
    handlePageSizeChange: changePageSize,
  } = usePagination({
    totalItems: totalCount,
    defaultPageSize: 10,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    storageKey: PAGE_SIZE_STORAGE_KEY,
  });

  useEffect(() => {
    let isActive = true;
    const loadDepartmentOptions = async () => {
      const result = await fetchDepartments();

      if (!isActive) return;

      if (result.success) {
        const options = [...(result.data || [])].sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), "es", {
            sensitivity: "base",
            numeric: true,
          })
        );
        setDepartmentOptions(options);
        return;
      }

      console.error("Error cargando departamentos:", result.error);
      setDepartmentOptions([]);
    };
    loadDepartmentOptions();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const handler = setTimeout(
      () => setDebouncedSearch(searchTerm.trim()),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const selectedDepartmentId = useMemo(() => {
    if (!selectedDepartment) return null;
    const found = departmentOptions.find(
      (dept) => normalizeDept(dept.name) === normalizeDept(selectedDepartment)
    );
    return found?.id || null;
  }, [selectedDepartment, departmentOptions, normalizeDept]);

  // La carga se deriva de la clave pedida en lugar de marcarse con un
  // setLoadingProducts(true) sincrono, que provocaba un re-render en cascada.
  // El refresco en tiempo real no cambia la clave, asi que ya no hace falta un
  // flag `silent`: el spinner solo aparece cuando cambia lo que el usuario pide.
  const requestKey = `${branch?.id || ""}|${debouncedSearch}|${selectedDepartmentId}|${currentPage}|${pageSize}`;
  const { isLoading: loadingProducts, isStale, markSettled } =
    useRequestStatus(requestKey);

  // El error de una peticion anterior no debe mostrarse mientras corre la nueva.
  const visibleProductsError = isStale ? null : productsError;

  const reload = useCallback(async () => {
    if (!branch?.id) {
      setProducts([]);
      setTotalCount(0);
      return;
    }

    setProductsError(null);

    const result = await fetchPaginatedBranchProducts({
      branchId: branch.id,
      searchTerm: debouncedSearch,
      departmentId: selectedDepartmentId,
      page: currentPage,
      pageSize,
    });

    if (result.success) {
      setProducts(result.data.products);
      setTotalCount(result.data.totalCount);
    } else {
      console.error("Error cargando productos:", result.error);
      setProducts([]);
      setTotalCount(0);
      setProductsError(result.error || "Error al cargar productos");
    }

    markSettled();
  }, [branch, debouncedSearch, selectedDepartmentId, currentPage, pageSize, markSettled]);

  // El efecto llama directo a la funcion de datos importada y aplica el estado
  // en la continuacion asincrona; `reload` queda para el refresco en tiempo real.
  useEffect(() => {
    if (!branch?.id) {
      return undefined;
    }

    let cancelled = false;

    fetchPaginatedBranchProducts({
      branchId: branch.id,
      searchTerm: debouncedSearch,
      departmentId: selectedDepartmentId,
      page: currentPage,
      pageSize,
    })
      .then((result) => {
        if (cancelled) return;

        if (result.success) {
          setProducts(result.data.products);
          setTotalCount(result.data.totalCount);
        } else {
          console.error("Error cargando productos:", result.error);
          setProducts([]);
          setTotalCount(0);
          setProductsError(result.error || "Error al cargar productos");
        }

        markSettled();
      })
      .catch((loadError) => {
        if (cancelled) return;

        console.error("Error cargando productos:", loadError);
        setProducts([]);
        setTotalCount(0);
        setProductsError("Error al cargar productos");
        markSettled();
      });

    return () => {
      cancelled = true;
    };
  }, [branch?.id, debouncedSearch, selectedDepartmentId, currentPage, pageSize, markSettled]);

  useProductsRealtime(branch?.id, reload);

  useEffect(() => {
    const page = Math.floor(selectedRowIndex / pageSize) + 1;
    if (page !== currentPage && page <= totalPages) {
      changePage(page);
    }
  }, [selectedRowIndex, currentPage, totalPages, pageSize, changePage]);

  // El indice seleccionado y la pagina se reinician durante el render, en
  // lugar de desde un efecto que provocaba un re-render adicional. El scroll del
  // documento si es un efecto sobre el DOM y se queda en el efecto.
  const filtersKey = `${debouncedSearch}|${selectedDepartment}`;

  if (useDidChange(filtersKey)) {
    setSelectedRowIndex(0);
    resetPagination();
  }

  useEffect(() => {
    document.body.scrollTop = 0;
  }, [filtersKey]);

  useEffect(() => {
    const row = selectedRowRef.current;
    if (!row) return;

    const body = document.body;
    const rowRect = row.getBoundingClientRect();

    const topOffset = 450;

    if (rowRect.top < topOffset) {
      body.scrollTop = body.scrollTop + rowRect.top - topOffset;
    } else if (rowRect.bottom > window.innerHeight) {
      body.scrollTop = body.scrollTop + rowRect.bottom - window.innerHeight + 30;
    }
  }, [selectedRowIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!products.length) return;

      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        if (e.key === "Escape") setShowDepartmentFilter(false);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedRowIndex((prev) =>
          prev < products.length - 1 ? prev + 1 : prev
        );
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedRowIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }

      if (e.key === "PageDown") {
        e.preventDefault();
        setSelectedRowIndex((prev) =>
          Math.min(prev + pageSize, products.length - 1)
        );
      }

      if (e.key === "PageUp") {
        e.preventDefault();
        setSelectedRowIndex((prev) => Math.max(prev - pageSize, 0));
      }

      if (e.key === "Home") {
        e.preventDefault();
        setSelectedRowIndex(0);
      }

      if (e.key === "End") {
        e.preventDefault();
        setSelectedRowIndex(products.length - 1);
      }

      if (e.key === "Escape") {
        setShowDepartmentFilter(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [products.length, pageSize]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!showDepartmentFilter) return;
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowDepartmentFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDepartmentFilter]);

  const handleDepartmentSelect = (department) => {
    setSelectedDepartment(department);
    setShowDepartmentFilter(false);
    resetPagination();
    setSelectedRowIndex(0);
  };

  const handleRowClick = (index) => {
    setSelectedRowIndex(index);
  };

  const handlePageChange = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    changePage(nextPage);
    setSelectedRowIndex(0);
    document.body.scrollTop = 0;
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  };

  const handlePageSizeChange = (size) => {
    changePageSize(size);
    setSelectedRowIndex(0);
    document.body.scrollTop = 0;
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedDepartment("");
    resetPagination();
    setSelectedRowIndex(0);
    setShowDepartmentFilter(false);
  };

  const formatMoney = (value) => {
    const amount = Number(value || 0);
    return `$${amount.toFixed(2)}`;
  };

  return {
    departments: departmentOptions,
    loadingProducts,
    productsError: visibleProductsError,
    searchTerm,
    setSearchTerm,
    selectedDepartment,
    showDepartmentFilter,
    setShowDepartmentFilter,
    selectedRowIndex,
    tableContainerRef,
    filterRef,
    selectedRowRef,
    totalCount,
    paginatedProducts: products,
    currentPage,
    totalPages,
    pageSize,
    pageStart,
    pageEnd,
    handlePageChange,
    handlePageSizeChange,
    formatDept,
    handleDepartmentSelect,
    handleRowClick,
    clearFilters,
    formatMoney,
  };
};
