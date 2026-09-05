/**
 * useCustomersReport.js
 * Hook principal del módulo de Reporte de Clientes.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchCustomersReportData } from "../services/customersReportService";

export const useCustomersReport = (initialBranchId = "ALL") => {
  const [branchId, setBranchId] = useState(initialBranchId);
  const [customerType, setCustomerType] = useState("ALL"); // ALL, POINTS, BILLING
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("RANKING"); // RANKING, PRODUCTS, REWARDS
  const [riskFilter, setRiskFilter] = useState("ALL"); // ALL, RISK_ONLY, ACTIVE_ONLY
  const [sortBy, setSortBy] = useState("spent"); // spent, visits, points, recent, ticket
  const [sortDirection, setSortDirection] = useState("desc");

  const [reportData, setReportData] = useState({
    rankedCustomers: [],
    kpis: {
      activeCustomersCount: 0,
      totalSpentSum: 0,
      averageTicket: 0,
      averageFrequency: 0,
      totalPointsBalance: 0,
      totalPointsEarned: 0,
      totalPointsRedeemed: 0,
      totalRewardsDiscount: 0,
      atRiskCount: 0,
    },
    topProducts: [],
    redemptionsList: [],
    pointsList: [],
    salesCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sincronizar branchId si cambia desde fuera
  useEffect(() => {
    if (initialBranchId) {
      setBranchId(initialBranchId);
    }
  }, [initialBranchId]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchCustomersReportData({
        branchId,
        customerType,
      });

      setReportData(data);
    } catch (err) {
      console.error("Error al cargar reporte de clientes:", err);
      setError("No se pudieron cargar los datos del reporte de clientes.");
    } finally {
      setIsLoading(false);
    }
  }, [branchId, customerType]);

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

  // Clientes filtrados y ordenados
  const filteredCustomers = useMemo(() => {
    const list = reportData.rankedCustomers || [];
    const term = searchTerm.trim().toLowerCase();

    const filtered = list.filter((cust) => {
      // Excluir clientes sin compras históricas
      if (cust.purchasesCount <= 0) return false;

      // Filtro por texto
      if (term) {
        const matchesName = cust.name.toLowerCase().includes(term);
        const matchesPhone = cust.phone.toLowerCase().includes(term);
        const matchesEmail = cust.email.toLowerCase().includes(term);
        const matchesRfc = cust.rfc.toLowerCase().includes(term);

        if (!matchesName && !matchesPhone && !matchesEmail && !matchesRfc) {
          return false;
        }
      }

      // Filtro de riesgo
      if (riskFilter === "RISK_ONLY") {
        return cust.riskInfo?.isRisk === true;
      } else if (riskFilter === "ACTIVE_ONLY") {
        return cust.purchasesCount > 0 && !cust.riskInfo?.isRisk;
      }

      return true;
    });

    // Ordenamiento
    return [...filtered].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortBy === "spent") {
        valA = a.totalSpent;
        valB = b.totalSpent;
      } else if (sortBy === "visits") {
        valA = a.purchasesCount;
        valB = b.purchasesCount;
      } else if (sortBy === "points") {
        valA = a.pointsBalance;
        valB = b.pointsBalance;
      } else if (sortBy === "ticket") {
        valA = a.averageTicket;
        valB = b.averageTicket;
      } else if (sortBy === "recent") {
        valA = a.lastSaleDate ? new Date(a.lastSaleDate).getTime() : 0;
        valB = b.lastSaleDate ? new Date(b.lastSaleDate).getTime() : 0;
      } else if (sortBy === "name") {
        return sortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      if (sortDirection === "asc") {
        return valA - valB;
      }
      return valB - valA;
    });
  }, [reportData.rankedCustomers, searchTerm, riskFilter, sortBy, sortDirection]);

  // Productos filtrados por búsqueda
  const filteredTopProducts = useMemo(() => {
    const list = reportData.topProducts || [];
    const term = searchTerm.trim().toLowerCase();

    if (!term) return list;

    return list.filter(
      (prod) =>
        prod.productName.toLowerCase().includes(term) ||
        prod.barcode.toLowerCase().includes(term)
    );
  }, [reportData.topProducts, searchTerm]);

  // Recompensas filtradas por búsqueda
  const filteredRedemptions = useMemo(() => {
    const list = reportData.redemptionsList || [];
    const term = searchTerm.trim().toLowerCase();

    if (!term) return list;

    return list.filter((r) => {
      const rewardName = (r.reward_name || "").toLowerCase();
      const prodName = (r.product_name || "").toLowerCase();
      const custName = (r.customer_name || "").toLowerCase();
      const folio = (r.sale_id ? r.sale_id.substring(0, 8) : "").toLowerCase();
      const branchName = (r.branch_name || "").toLowerCase();

      return (
        rewardName.includes(term) ||
        prodName.includes(term) ||
        custName.includes(term) ||
        folio.includes(term) ||
        branchName.includes(term)
      );
    });
  }, [reportData.redemptionsList, searchTerm]);

  return {
    branchId,
    setBranchId,
    customerType,
    setCustomerType,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    riskFilter,
    setRiskFilter,
    sortBy,
    sortDirection,
    handleSort,
    reportData,
    filteredCustomers,
    filteredTopProducts,
    filteredRedemptions,
    kpis: reportData.kpis,
    isLoading,
    error,
    refresh: loadData,
  };
};

