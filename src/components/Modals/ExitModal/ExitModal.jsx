import React, { useState } from "react";
import styles from "../ExitModal/ExitModal.module.css";

const ExitModal = ({ isOpen, onClose, onSave }) => {
  const [exitAmount, setExitAmount] = useState('');
  const [exitReason, setExitReason] = useState('');
  const [exitError, setExitError] = useState('');

  const handleClose = () => {
    setExitAmount('');
    setExitReason('');
    setExitError('');
    onClose();
  };

  const handleSave = () => {
    if (!exitAmount || parseFloat(exitAmount) <= 0) {
      setExitError('Por favor, ingrese un monto válido.');
      return;
    }
    if (!exitReason.trim()) {
      setExitError('Por favor, ingrese una razón.');
      return;
    }

    const newMovement = {
      id: Date.now(),
      type: 'exit',
      amount: parseFloat(exitAmount),
      reason: exitReason,
      createdAt: new Date().toISOString()
    };

    onSave(newMovement);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Registrar Salida de Efectivo</h2>
          <button className={styles.closeButton} onClick={handleClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="exitAmount">Monto:</label>
            <input
              type="number"
              id="exitAmount"
              value={exitAmount}
              onChange={(e) => { setExitAmount(e.target.value); setExitError(''); }}
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="exitReason">Razón:</label>
            <textarea
              id="exitReason"
              value={exitReason}
              onChange={(e) => { setExitReason(e.target.value); setExitError(''); }}
              placeholder="Ej. Pago a proveedor, retiro, etc."
            />
          </div>
          {exitError && <p className={styles.errorMessage}>{exitError}</p>}
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={handleClose}>Cancelar</button>
          <button className={styles.saveButton} onClick={handleSave}>Guardar Salida</button>
        </div>
      </div>
    </div>
  );
};

export default ExitModal;

