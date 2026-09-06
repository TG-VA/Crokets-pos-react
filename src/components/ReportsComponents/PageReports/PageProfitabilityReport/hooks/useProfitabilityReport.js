/**
 * useProfitabilityReport.js
 * Hook principal para la vista del Reporte de Rentabilidad.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  fetchProfitabilityReportData,
  fetchBranchesList,
} from "../services/profitabilityReportService";

export const useProfitabilityReport = (initialBranchId = "ALL") => {
  const [branchId, setBranchId] = useState(initialBranchId);
  const [departmentId, setDepartmentId] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("PRODUCTS"); // PRODUCTS, DEPARTMENTS, CRITICAL
  const [sortBy, setSortBy] = useState("profit"); // profit, margin, revenue, units, name
  const [sortDirection, setSortDirection] = useState("desc");

  // Rango de fechas por defecto: Este mes (desde el día 1 del mes en curso hasta hoy)
  const [activeDatePreset, setActiveDatePreset] = useState("this_month");
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date();
    return [start, end];
  });

  const [startDate, endDate] = Array.isArray(dateRange)
    ? dateRange
    : [null, null];

  const [branchesList, setBranchesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  const [reportData, setReportData] = useState({
    productsProfitability: [],
    departmentsProfitability: [],
    departmentsList: [],
    kpis: {
      totalRevenue: 0,
      totalCost: 0,
      grossProfit: 0,
      grossMarginPercent: 0,
      markupPercent: 0,
      totalUnitsSold: 0,
      totalProductsSold: 0,
      criticalProductsCount: 0,
      lossProductsCount: 0,
      totalSalesCount: 0,
    },
    totalSalesCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar lista de sucursales disponibles al montar
  useEffect(() => {
    let isMounted = true;
    fetchBranchesList().then((data) => {
      if (isMounted) setBranchesList(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sincronizar sucursal inicial si cambia externamente
  useEffect(() => {
    if (initialBranchId) {
      setBranchId(initialBranchId);
    }
  }, [initialBranchId]);

  // Función de carga principal
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchProfitabilityReportData({
        branchId,
        departmentId,
        startDate,
        endDate,
      });

      setReportData(data);
      if (data.departmentsList) {
        setDepartmentsList(data.departmentsList);
      }
    } catch (err) {
      console.error("Error al cargar reporte de rentabilidad:", err);
      setError("No se pudieron cargar los datos de rentabilidad.");
    } finally {
      setIsLoading(false);
    }
  }, [branchId, departmentId, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejo de ordenamiento
  const handleSort = useCallback((columnKey) => {
    setSortBy((prevKey) => {
      if (prevKey === columnKey) {
        setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return columnKey;
      }
      setSortDirection("desc");
      return columnKey;
    });
  }, []);

  // Presets rápidos de fechas
  const setQuickDatePreset = useCallback((preset) => {
    const now = new Date();
    setActiveDatePreset(preset);

    if (preset === "today") {
      setDateRange([now, now]);
    } else if (preset === "yesterday") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      setDateRange([yest, yest]);
    } else if (preset === "this_week") {
      const start = new Date(now);
      const day = start.getDay() || 7;
      start.setDate(start.getDate() - day + 1); // Lunes
      setDateRange([start, now]);
    } else if (preset === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateRange([start, now]);
    } else if (preset === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateRange([start, end]);
    }
  }, []);

  const handleCustomDateRange = useCallback((update) => {
    setActiveDatePreset("custom");
    if (Array.isArray(update)) {
      setDateRange(update);
    } else if (update) {
      setDateRange([update, null]);
    } else {
      setDateRange([null, null]);
    }
  }, []);

  // Productos filtrados por búsqueda y ordenados
  const filteredProducts = useMemo(() => {
    const list = reportData.productsProfitability || [];
    const term = searchTerm.trim().toLowerCase();

    const filtered = list.filter((p) => {
      if (!term) return true;
      const name = (p.productName || "").toLowerCase();
      const code = (p.barcode || "").toLowerCase();
      const dept = (p.departmentName || "").toLowerCase();
      return name.includes(term) || code.includes(term) || dept.includes(term);
    });

    return [...filtered].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortBy === "profit") {
        valA = a.grossProfit;
        valB = b.grossProfit;
      } else if (sortBy === "margin") {
        valA = a.grossMarginPercent;
        valB = b.grossMarginPercent;
      } else if (sortBy === "revenue") {
        valA = a.totalRevenue;
        valB = b.totalRevenue;
      } else if (sortBy === "cost") {
        valA = a.totalCost;
        valB = b.totalCost;
      } else if (sortBy === "units") {
        valA = a.totalUnits;
        valB = b.totalUnits;
      } else if (sortBy === "name") {
        return sortDirection === "asc"
          ? a.productName.localeCompare(b.productName)
          : b.productName.localeCompare(a.productName);
      }

      if (sortDirection === "asc") {
        return valA - valB;
      }
      return valB - valA;
    });
  }, [reportData.productsProfitability, searchTerm, sortBy, sortDirection]);

  // Departamentos filtrados por búsqueda
  const filteredDepartments = useMemo(() => {
    const list = reportData.departmentsProfitability || [];
    const term = searchTerm.trim().toLowerCase();

    if (!term) return list;

    return list.filter((d) =>
      (d.departmentName || "").toLowerCase().includes(term)
    );
  }, [reportData.departmentsProfitability, searchTerm]);

  // Productos con margen crítico (< 15% o <= 0%)
  const criticalProducts = useMemo(() => {
    return filteredProducts.filter((p) => p.isCritical);
  }, [filteredProducts]);

  return {
    branchId,
    setBranchId,
    departmentId,
    setDepartmentId,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    sortBy,
    sortDirection,
    handleSort,
    activeDatePreset,
    setActiveDatePreset,
    dateRange,
    setDateRange: handleCustomDateRange,
    startDate,
    endDate,
    setQuickDatePreset,
    branchesList,
    departmentsList,
    reportData,
    filteredProducts,
    filteredDepartments,
    criticalProducts,
    kpis: reportData.kpis,
    isLoading,
    error,
    refresh: loadData,
  };
};
