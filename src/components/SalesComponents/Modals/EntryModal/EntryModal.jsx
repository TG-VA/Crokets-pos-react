import React, { useState } from "react";
import styles from "./EntryModal.module.css";

const EntryModal = ({ isOpen, onClose, onSaveEntry }) => {
  // Estados locales del modal
  const [entryAmount, setEntryAmount] = useState('');
  const [entryReason, setEntryReason] = useState('');
  const [entryError, setEntryError] = useState('');

  // Función para cerrar el modal
  const closeEntryModal = () => {
    setEntryAmount('');
    setEntryReason('');
    setEntryError('');
    onClose();
  };

  // Función para guardar la entrada
  const handleSaveEntry = () => {
    if (!entryAmount || parseFloat(entryAmount) <= 0) {
      setEntryError('Por favor, ingrese un monto válido.');
      return;
    }
    if (!entryReason.trim()) {
      setEntryError('Por favor, ingrese una razón.');
      return;
    }
    
    const newMovement = {
      id: Date.now(),
      type: 'entry', 
      amount: parseFloat(entryAmount),
      reason: entryReason,
      createdAt: new Date().toISOString()
    };
    
    onSaveEntry(newMovement);
    closeEntryModal();
  };

  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={closeEntryModal}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Registrar Entrada de Efectivo</h2>
          <button className={styles.closeButton} onClick={closeEntryModal}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="entryAmount">Monto:</label>
            <input
              type="number"
              id="entryAmount"
              value={entryAmount}
              onChange={(e) => { setEntryAmount(e.target.value); setEntryError(''); }}
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="entryReason">Razón:</label>
            <textarea
              id="entryReason"
              value={entryReason}
              onChange={(e) => { setEntryReason(e.target.value); setEntryError(''); }}
              placeholder="Ej. Cambio, fondo de caja, etc."
            />
          </div>
          {entryError && <p className={styles.errorMessage}>{entryError}</p>}
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={closeEntryModal}>
            Esc - Cancelar
          </button>
          <button className={styles.saveButton} onClick={handleSaveEntry}>
            Guardar Entrada
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntryModal;