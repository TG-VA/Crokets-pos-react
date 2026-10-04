import { useEffect, useState } from "react";

import { sortCustomersByName } from "../../utils/customerFormatters";
import { searchPointsCustomers } from "../services/pointsAdjustmentService";

/**
 * Busqueda de clientes activos para el ajuste de puntos.
 *
 * El sub-hook no conoce el formulario: notifica la seleccion y el borrado para
 * que `usePointsAdjustment` decida que reiniciar.
 */
export const usePointsAdjustmentCustomerSearch = ({
  enabled,
  showAppAlert,
  onCustomerSelected,
  onSelectionCleared,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  const searchCustomers = async (term = searchTerm) => {
    try {
      setSearchingCustomers(true);

      setCustomers(sortCustomersByName(await searchPointsCustomers(term)));
    } catch (err) {
      console.error("Error buscando clientes:", err);

      showAppAlert({
        type: "danger",
        title: "No se pudieron buscar clientes",
        message: "Ocurrió un error al buscar los clientes.",
        confirmText: "Entendido",
      });

      setCustomers([]);
    } finally {
      setSearchingCustomers(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const delaySearch = setTimeout(() => {
      searchCustomers(searchTerm);
    }, 300);

    return () => clearTimeout(delaySearch);
    // La busqueda reacciona al termino escrito y al acceso del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, enabled]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    onSelectionCleared();
  };

  const handleSelectCustomer = (customer) => {
    setSearchTerm("");
    setCustomers([]);

    onCustomerSelected(customer);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setCustomers([]);

    onSelectionCleared();
  };

  const clearCustomerResults = () => {
    setCustomers([]);
  };

  return {
    clearCustomerResults,
    customers,
    handleClearSearch,
    handleSearchChange,
    handleSelectCustomer,
    searchCustomers,
    searchingCustomers,
    searchTerm,
  };
};
