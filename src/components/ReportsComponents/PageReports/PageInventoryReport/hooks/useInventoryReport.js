import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchInventoryReportData } from "../services/inventoryReportService";

export const useInventoryReport = (selectedBranchId = "ALL") => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);

  // Filtros
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedStockStatus, setSelectedStockStatus] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("valuation");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchInventoryReportData(selectedBranchId);
      setReportData(data);
      setSyncedAt(new Date().toISOString());
    } catch (err) {
      console.error("Error en useInventoryReport:", err);
      setError("No se pudo cargar el reporte de inventario. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    error,
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
