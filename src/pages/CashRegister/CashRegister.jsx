import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CashRegister.module.css';

const CashRegister = ({ setCashRegistered }) => {
  const [initialCash, setInitialCash] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Verificar estado de la caja al cargar
  useEffect(() => {
    // Función asíncrona para verificar el estado de la caja.
    const checkCashRegister = async () => {
      try {
        // Llama al proceso principal para obtener el estado de la caja.
        const state = await window.electronAPI.invoke('check-cash-register');
        // Si la caja ya está abierta, marca el estado y navega al dashboard.
        if (state.isOpen) {`
          setCashRegistered(true);`
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('Error verificando caja:', err);
      }
    };
    
    checkCashRegister();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [navigate, setCashRegistered]);

  // Maneja los eventos de teclado en el campo de entrada.
  const handleKeyDown = (e) => {
    const cursorPos = e.target.selectionStart;
    const currentValue = e.target.value;

    // Permite teclas de control.
    if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    // Manejar Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // Manejar punto decimal
    if (e.key === '.') {
      if (currentValue.includes('.')) {
        e.preventDefault();
        return;
      }
      if (cursorPos === 0) {
        e.preventDefault();
        setInitialCash('0.');
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(2, 2);
          }
        }, 0);
        return;
      }
    }

    // Permitir solo números y punto decimal
    if (!/[0-9.]/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Validar y enviar
  const handleSubmit = async () => {
    const value = parseFloat(initialCash);
    
    if (value < 0) {
      setError('Ingrese un monto válido');
      setInitialCash('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }

    try {
      // Llama al proceso principal para abrir la caja.
      const result = await window.electronAPI.invoke('set-initial-cash', value);
      // Si tiene éxito, actualiza el estado y navega al dashboard.
      if (result.success) {
        setCashRegistered(true);
        navigate('/dashboard');
      } else {
        setError(result.message || 'Error al abrir caja');
      }
    } catch (err) {
      setError('Error al comunicar con el sistema');
      console.error(err);
    }
  };

  // Manejar cambio en el input
  const handleChange = (e) => {
    const value = e.target.value;
    // Validar que no sea negativo
    if (!value.startsWith('-')) {
      setInitialCash(value);
      setError('');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>APERTURA DE CAJA</h1>

      <div className={styles.title}>
        <label htmlFor="initialCash" className={styles.label}>Dinero inicial en caja:</label>
        <div className={styles.currencyInput}>
          <input
            ref={inputRef}
            type="number"
            id="initialCash"
            placeholder="0.00"
            step="0.01"
            min="0"
            value={initialCash}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            required
          />
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.confirmButtonContainer}>
        <button 
          className={styles.confirmButton}
          onClick={handleSubmit}
        >
          Confirmar
        </button>
      </div>
    </div>
  );
};

export default CashRegister;