import React, { useEffect, useMemo, useState } from "react";
import styles from "./ClientModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";

const ClientModal = ({
  isOpen,
  onClose,
  onAssignClient,
  currentSaleClient = null,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(currentSaleClient);
  const [loadingClients, setLoadingClients] = useState(false);
  const [error, setError] = useState("");

  const normalizeSearch = (value) => {
    return String(value || "").trim();
  };

  const formatPoints = (value) => {
    return Number(value || 0);
  };

  const loadCustomerPoints = async (customerIds = []) => {
    if (!customerIds.length) return {};

    const { data, error: pointsError } = await supabase
      .from("customer_points")
      .select("customer_id, points")
      .in("customer_id", customerIds);

    if (pointsError) throw pointsError;

    return (data || []).reduce((acc, movement) => {
      const customerId = movement.customer_id;
      acc[customerId] =
        Number(acc[customerId] || 0) + Number(movement.points || 0);
      return acc;
    }, {});
  };

  const searchClients = async (term = searchTerm) => {
    const cleanSearch = normalizeSearch(term);

    try {
      setLoadingClients(true);
      setError("");

      if (cleanSearch.length < 2) {
        setClients(currentSaleClient ? [currentSaleClient] : []);
        return;
      }

      const { data, error: customersError } = await supabase
        .from("customers")
        .select("id, name, phone, email, status, is_points_customer")
        .eq("is_points_customer", true)
        .neq("status", false)
        .or(
          `name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`
        )
        .order("name", { ascending: true })
        .limit(12);

      if (customersError) throw customersError;

      const customers = data || [];
      const customerIds = customers.map((customer) => customer.id);
      const pointsByCustomer = await loadCustomerPoints(customerIds);

      const customersWithPoints = customers.map((customer) => ({
        ...customer,
        points: formatPoints(pointsByCustomer[customer.id]),
      }));

      if (currentSaleClient?.id) {
        const alreadyIncluded = customersWithPoints.some(
          (customer) => customer.id === currentSaleClient.id
        );

        setClients(
          alreadyIncluded
            ? customersWithPoints
            : [
                {
                  ...currentSaleClient,
                  points: formatPoints(currentSaleClient.points),
                },
                ...customersWithPoints,
              ]
        );

        return;
      }

      setClients(customersWithPoints);
    } catch (err) {
      console.error("Error buscando clientes:", err);
      setError("No se pudieron cargar los clientes.");
      setClients(currentSaleClient ? [currentSaleClient] : []);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleAssign = () => {
    if (!selectedClient) return;

    if (onAssignClient) {
      onAssignClient(selectedClient);
    }

    closeModal();
  };

  const handleRemoveClient = () => {
    setSelectedClient(null);

    if (onAssignClient) {
      onAssignClient(null);
    }

    closeModal();
  };

  const closeModal = () => {
    setSearchTerm("");
    setClients(currentSaleClient ? [currentSaleClient] : []);
    setSelectedClient(currentSaleClient);
    setError("");
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    setSelectedClient(currentSaleClient);
    setSearchTerm(currentSaleClient?.name || "");
    setClients(currentSaleClient ? [currentSaleClient] : []);
    setError("");
  }, [isOpen, currentSaleClient]);

  useEffect(() => {
    if (!isOpen) return;

    const cleanSearch = normalizeSearch(searchTerm);

    if (cleanSearch.length < 2) {
      setClients(currentSaleClient ? [currentSaleClient] : []);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchClients(cleanSearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }

      if (event.key === "Enter" && selectedClient) {
        event.preventDefault();
        handleAssign();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, selectedClient]);

  const selectedClientLabel = useMemo(() => {
    if (!selectedClient) return "";

    return selectedClient.name || selectedClient.phone || "CLIENTE SIN NOMBRE";
  }, [selectedClient]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div
        className={styles.modalContainer}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2>Asignar cliente</h2>
            <p>Busca un cliente registrado para asociarlo a la venta.</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={closeModal}
          >
            ×
          </button>
        </div>

        <div className={styles.searchBarContainer}>
          <label>Buscar cliente</label>

          <div className={styles.searchRow}>
            <input
              type="text"
              className={styles.clientSearchBar}
              placeholder="Nombre, teléfono o correo..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setError("");
              }}
              autoFocus
            />

            {searchTerm && (
              <button
                type="button"
                className={styles.clearSearchButton}
                onClick={() => {
                  setSearchTerm("");
                  setClients(currentSaleClient ? [currentSaleClient] : []);
                  setSelectedClient(currentSaleClient);
                  setError("");
                }}
              >
                ×
              </button>
            )}

            <button
              type="button"
              className={styles.searchButton}
              onClick={() => searchClients(searchTerm)}
              disabled={loadingClients}
            >
              {loadingClients ? "Buscando..." : "Buscar"}
            </button>
          </div>

          <span className={styles.searchHelp}>
            Escribe mínimo 2 caracteres para buscar.
          </span>
        </div>

        {selectedClient && (
          <div className={styles.selectedClientBox}>
            <span>Cliente seleccionado</span>
            <strong>{selectedClientLabel}</strong>
          </div>
        )}

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.clientList}>
          {loadingClients ? (
            <p className={styles.noClientsMessage}>Buscando clientes...</p>
          ) : clients.length > 0 ? (
            clients.map((client) => (
              <button
                type="button"
                key={client.id}
                className={`${styles.clientItem} ${
                  selectedClient?.id === client.id
                    ? styles.clientItemSelected
                    : ""
                }`}
                onClick={() => setSelectedClient(client)}
              >
                <div className={styles.clientData}>
                  <div className={styles.clientName}>
                    {client.name || "SIN NOMBRE"}
                  </div>

                  <div className={styles.clientId}>
                    Tel: {client.phone || "SIN TELÉFONO"}
                  </div>

                  <div className={styles.clientEmail}>
                    {client.email || "SIN CORREO"}
                  </div>
                </div>

                <div className={styles.clientPoints}>
                  <strong>{formatPoints(client.points)}</strong>
                  <span>pts</span>
                </div>
              </button>
            ))
          ) : (
            <p className={styles.noClientsMessage}>
              No hay clientes para mostrar.
            </p>
          )}
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={closeModal}
          >
            Esc - Cancelar
          </button>

          <div className={styles.rightActions}>
            {currentSaleClient && (
              <button
                type="button"
                className={styles.removeButton}
                onClick={handleRemoveClient}
              >
                Quitar cliente
              </button>
            )}

            <button
              type="button"
              className={styles.saveButton}
              onClick={handleAssign}
              disabled={!selectedClient}
            >
              Asignar cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientModal;