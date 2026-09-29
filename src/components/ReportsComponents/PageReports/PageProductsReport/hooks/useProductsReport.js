import { useState, useEffect, useCallback } from 'react';
import { loadProductsReport } from '../services/productReportsService';
import { useRequestStatus } from '../../../../../hooks/useRequestStatus';

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
  
  const [error, setError] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);

  // La carga se deriva de la sucursal pedida en lugar de marcarse con un
  // setIsLoading(true) sincrono, que provocaba un re-render en cascada.
  const { isLoading, isStale, markSettled } = useRequestStatus(currentBranchId);

  // El error de una peticion anterior no debe mostrarse mientras corre la nueva.
  const visibleError = isStale ? null : error;

  const generateReport = useCallback(() => {
    if (!currentBranchId) {
      setError("No se ha detectado una sucursal activa para generar el reporte.");
      return Promise.resolve();
    }

    const startOfDay = `${dateRange.startDate}T00:00:00.000Z`;
    const endOfDay = `${dateRange.endDate}T23:59:59.999Z`;

    return loadProductsReport(
      { startDate: startOfDay, endDate: endOfDay, branchId: currentBranchId },
      {
        onData: (data) => {
          setReportData(data);
          setError(null);
          setSyncedAt(new Date().toISOString());
        },
        onError: setError,
        onSettled: markSettled,
      }
    );
  }, [dateRange, currentBranchId, markSettled]);

  useEffect(() => {
    if (!currentBranchId) return undefined;

    let cancelled = false;

    const startOfDay = `${dateRange.startDate}T00:00:00.000Z`;
    const endOfDay = `${dateRange.endDate}T23:59:59.999Z`;

    loadProductsReport(
      { startDate: startOfDay, endDate: endOfDay, branchId: currentBranchId },
      {
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
      }
    );

    return () => {
      cancelled = true;
    };
  }, [currentBranchId, dateRange, markSettled]);

  return {
    dateRange,
    setDateRange,
    reportData,
    isLoading,
    error: visibleError,
    syncedAt,
    generateReport
  };
};
