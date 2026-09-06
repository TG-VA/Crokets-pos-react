/**
 * useCustomerDetail.js
 * Hook para manejar la carga bajo demanda del perfil 360° del cliente seleccionado.
 */

import { useState, useCallback } from "react";
import { fetchCustomerDetailReport } from "../services/customerDetailService";

export const useCustomerDetail = () => {
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const openCustomerDetail = useCallback(async (customerId) => {
    if (!customerId) return;

    setSelectedCustomerId(customerId);
    setIsDetailOpen(true);
    setLoadingDetail(true);
    setErrorDetail(null);

    try {
      const data = await fetchCustomerDetailReport(customerId);
      setCustomerDetail(data);
    } catch (err) {
      console.error("Error al cargar detalle del cliente:", err);
      setErrorDetail("No se pudo cargar la información detallada del cliente.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const closeCustomerDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedCustomerId(null);
    setCustomerDetail(null);
    setErrorDetail(null);
  }, []);

  return {
    selectedCustomerId,
    customerDetail,
    loadingDetail,
    errorDetail,
    isDetailOpen,
    openCustomerDetail,
    closeCustomerDetail,
  };
};
