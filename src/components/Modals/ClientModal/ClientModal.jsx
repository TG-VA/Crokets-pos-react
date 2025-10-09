import React, { useState } from "react";
import styles from "../ClientModal/ClientModal.module.css";

const ClientModal = ({ isOpen, onClose, onAssignClient, currentSaleClient = null }) => {
  // Clientes de ejemplo
  const [clients] = useState([
    { id: '9988776655', name: 'Juan Pérez García', points: 150 },
    { id: '9988112233', name: 'María López Hernández', points: 85 },
    { id: '9988445566', name: 'Carlos Sánchez Rodríguez', points: 320 },
  ]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(currentSaleClient);

  // Filtra los clientes basándose en el término de búsqueda (nombre o teléfono)
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.id.includes(searchTerm)
  );

  const handleAssign = () => {
    if (onAssignClient) {
      onAssignClient(selectedClient);
    }
    onClose();
  };

  const closeModal = () => {
    setSearchTerm('');
    setSelectedClient(currentSaleClient);
    onClose();
  };

  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Asignar Cliente</h2>
          <button className={styles.closeButton} onClick={closeModal}>✕</button>
        </div>

        <div className={styles.searchBarContainer}>
          <input 
            type="text"
            className={styles.clientSearchBar}
            placeholder="Buscar por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.clientList}>
          {filteredClients.length > 0 ? (
            filteredClients.map(client => (
              <div 
                key={client.id} 
                className={`${styles.clientItem} ${selectedClient?.id === client.id ? styles.clientItemSelected : ''}`}
                onClick={() => setSelectedClient(client)}
              >
                <div>
                  <div className={styles.clientName}>{client.name}</div>
                  <div className={styles.clientId}>Tel: {client.id}</div>
                </div>
                <div className={styles.clientPoints}>{client.points} pts</div>
              </div>
            ))
          ) : (
            <p className={styles.noClientsMessage}>No se encontraron clientes.</p>
          )}
        </div>
        
        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={closeModal}>
            Cancelar
          </button>
          <button 
            className={styles.saveButton} 
            onClick={handleAssign}
            disabled={!selectedClient} 
          >
            Asignar Cliente
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientModal;