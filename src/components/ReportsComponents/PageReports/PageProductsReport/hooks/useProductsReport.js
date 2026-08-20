import { useState, useEffect, useCallback } from 'react';
import { fetchProductsReportData } from '../services/productReportsService';

export const useProductsReport = (currentBranchId) => {
  // 🕵️‍♂️ LOG 1: Ver qué recibe el hook al cargar la página
  console.log("🔄 Hook renderizado. ID de sucursal recibido:", currentBranchId);

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

  const generateReport = useCallback(async () => {
    // 🕵️‍♂️ LOG 2: Ver qué pasa al intentar generar el reporte
    console.log("👉 Ejecutando generateReport. Sucursal actual:", currentBranchId);

    if (!currentBranchId) {
      // 🕵️‍♂️ LOG 3: Confirmación de bloqueo
      console.warn("🛑 Bloqueo: El reporte se canceló porque currentBranchId está vacío.");
      setError("No se ha detectado una sucursal activa para generar el reporte.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("✅ Pasó el bloqueo. Iniciando fetch a Supabase...");
      
      const startOfDay = `${dateRange.startDate}T00:00:00.000Z`;
      const endOfDay = `${dateRange.endDate}T23:59:59.999Z`;

      const data = await fetchProductsReportData({
        startDate: startOfDay,
        endDate: endOfDay,
        branchId: currentBranchId
      });
      
      // 🕵️‍♂️ LOG 4: Ver si Supabase devolvió datos o un arreglo vacío
      console.log("🎉 Datos recibidos y procesados con éxito:", data);
      
      setReportData(data);
    } catch (err) {
      console.error("❌ Error consultando reporte de productos:", err);
      setError("Ocurrió un error al extraer los datos de la base de datos.");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, currentBranchId]);

  useEffect(() => {
    if (currentBranchId) {
      console.log("⚡ Auto-ejecutando reporte inicial porque sí hay sucursal");
      generateReport();
    }
  }, [currentBranchId, generateReport]);

  return {
    dateRange,
    setDateRange,
    reportData,
    isLoading,
    error,
    generateReport
  };
};