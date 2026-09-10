import { useState, useEffect, useCallback } from 'react';
import { fetchProductsReportData } from '../services/productReportsService';

export const useProductsReport = (currentBranchId) => {
  // Inicializamos las fechas: Desde el día 1 del mes actual hasta hoy
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({ startDate: firstDayOfMonth, endDate: today });
  
  const [reportData, setReportData] = useState({
    kpis: {},
    byDepartment: [],
    topProducts: [],
    bottomProducts: [],
    deadStock: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);

  const generateReport = useCallback(async () => {
    if (!currentBranchId) {
      setError("No se ha detectado una sucursal activa para generar el reporte.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const startOfDay = `${dateRange.startDate}T00:00:00.000Z`;
      const endOfDay = `${dateRange.endDate}T23:59:59.999Z`;

      const data = await fetchProductsReportData({
        startDate: startOfDay,
        endDate: endOfDay,
        branchId: currentBranchId
      });
      
      setReportData(data);
      setSyncedAt(new Date().toISOString());
    } catch (err) {
      console.error("Error consultando reporte de productos:", err);
      setError("Ocurrió un error al extraer los datos de la base de datos.");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, currentBranchId]);

  useEffect(() => {
    if (currentBranchId) {
      generateReport();
    }
  }, [currentBranchId, generateReport]);

  return {
    dateRange,
    setDateRange,
    reportData,
    isLoading,
    error,
    syncedAt,
    generateReport
  };
};
