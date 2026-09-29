import { useState, useEffect, useCallback, useMemo } from "react";
import { useRequestStatus } from "../../../../../hooks/useRequestStatus";
import { loadInventoryReportData } from "../services/inventoryReportService";

export const useInventoryReport = (selectedBranchId = "ALL") => {
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);

  // La carga se deriva de la clave pedida en lugar de marcarse con un
  // setLoading(true) sincrono dentro del efecto, que provocaba un re-render en
  // cascada en cada cambio de sucursal.
  const { isLoading, isStale, markSettled } = useRequestStatus(selectedBranchId);

  // El error de una peticion anterior no debe mostrarse mientras corre la nueva.
  const visibleError = isStale ? null : error;

  // Filtros
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedStockStatus, setSelectedStockStatus] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("valuation");

  const loadData = useCallback(async () => {
    await loadInventoryReportData(selectedBranchId, {
      onData: (data) => {
        setReportData(data);
        setError(null);
        setSyncedAt(new Date().toISOString());
      },
      onError: setError,
      onSettled: markSettled,
    });
  }, [selectedBranchId, markSettled]);

  useEffect(() => {
    let cancelled = false;

    loadInventoryReportData(selectedBranchId, {
      onData: (data) => {
        if (cancelled) return;
        setReportData(data);
        setError(null);
        setSyncedAt(new Date().toISOString());
      },
      onError: (message) => {
        if (cancelled) return;
        setError(message);
      },
      onSettled: () => {
        if (cancelled) return;
        markSettled();
      },
    });

    return () => {
      cancelled = true;
    };
  }, [selectedBranchId, markSettled]);

  // Colecciones de origen expuestas como variables planas: la dependencia del
  // memo pasa a ser el valor ya resuelto, de modo que la lista declarada
  // coincide con la inferida por el compilador sin perder el acceso seguro.
  const reportItems = reportData?.items;
  const reportReorderSuggestions = reportData?.reorderSuggestions;
  const reportExhaustedProducts = reportData?.exhaustedProducts;

  // Filtrado de items
  const filteredItems = useMemo(() => {
    if (!reportItems) return [];

    return reportItems.filter((item) => {
      // Filtro por departamento
      if (selectedDepartment !== "ALL" && item.departmentId !== selectedDepartment) {
        return false;
      }

      // Filtro por estado de stock
      if (selectedStockStatus !== "ALL" && item.status !== selectedStockStatus) {
        return false;
      }

      // Filtro por texto de búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(term);
        const matchesBarcode = item.barcode.toLowerCase().includes(term);
        const matchesDept = item.departmentName.toLowerCase().includes(term);
        if (!matchesName && !matchesBarcode && !matchesDept) {
          return false;
        }
      }

      return true;
    });
  }, [reportItems, selectedDepartment, selectedStockStatus, searchTerm]);

  // Filtrado de sugerencias de reorden
  const filteredReorder = useMemo(() => {
    if (!reportReorderSuggestions) return [];

    return reportReorderSuggestions.filter((item) => {
      if (selectedDepartment !== "ALL" && item.departmentId !== selectedDepartment) {
        return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(term);
        const matchesBarcode = item.barcode.toLowerCase().includes(term);
        if (!matchesName && !matchesBarcode) {
          return false;
        }
      }

      return true;
    });
  }, [reportReorderSuggestions, selectedDepartment, searchTerm]);

  // Filtrado de productos agotados
  const filteredExhausted = useMemo(() => {
    if (!reportExhaustedProducts) return [];

    return reportExhaustedProducts.filter((item) => {
      if (selectedDepartment !== "ALL" && item.departmentId !== selectedDepartment) {
        return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(term);
        const matchesBarcode = item.barcode.toLowerCase().includes(term);
        if (!matchesName && !matchesBarcode) {
          return false;
        }
      }

      return true;
    });
  }, [reportExhaustedProducts, selectedDepartment, searchTerm]);

  return {
    reportData,
    filteredItems,
    filteredReorder,
    filteredExhausted,
    departments: reportData?.departments || [],
    kpis: reportData?.kpis || {},
    byDepartment: reportData?.byDepartment || [],
    isLoading,
    error: visibleError,
    syncedAt,
    selectedDepartment,
    setSelectedDepartment,
    selectedStockStatus,
    setSelectedStockStatus,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    reloadReport: loadData,
  };
};
