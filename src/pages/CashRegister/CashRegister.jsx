import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CashRegister.module.css';

import { useBranch } from '../../contexts/BranchContext';
import { useAuth } from '../../contexts/AuthContext';

const CashRegister = ({ setCashRegistered }) => {
  const [initialCash, setInitialCash] = useState('');
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { branch } = useBranch();
  const { user } = useAuth();

  // ✅ Revisar si ya hay caja abierta en esta sucursal
  useEffect(() => {
    // Si aún no hay sucursal, no podemos checar; dejamos de "cargar" y mostramos el form (o el texto de "Cargando sucursal...")
    if (!branch?.id) {
      setChecking(false);
      return;
    }

    const checkCashRegister = async () => {
      try {
        const res = await fetch('http://localhost:3000/cash/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branchId: branch.id }),
        });

        const data = await res.json();

        if (data?.success && data?.session) {
          setCashRegistered(true);
          navigate('/dashboard', { replace: true });
          return;
        }
      } catch (err) {
        console.error('Error verificando caja:', err);
      } finally {
        setChecking(false);
      }
    };

    checkCashRegister();
  }, [branch?.id, navigate, setCashRegistered]);

  // ✅ Enfocar input cuando ya terminó la verificación
  useEffect(() => {
    if (!checking) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [checking]);

  // Maneja los eventos de teclado en el campo de entrada.
  const handleKeyDown = (e) => {
    const cursorPos = e.target.selectionStart;
    const currentValue = e.target.value;

    if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }

    if (e.key === '.') {
      if (currentValue.includes('.')) {
        e.preventDefault();
        return;
      }
      if (cursorPos === 0) {
        e.preventDefault();
        setInitialCash('0.');
        setTimeout(() => inputRef.current?.setSelectionRange(2, 2), 0);
        return;
      }
    }

    if (!/[0-9.]/.test(e.key)) e.preventDefault();
  };

  // ✅ Abrir caja en Supabase
  const handleSubmit = async () => {
    const value = parseFloat(initialCash);

    if (!branch?.id) {
      setError('No se detectó la sucursal (branch).');
      return;
    }

    if (!user?.id) {
      setError('No se detectó el usuario (user).');
      return;
    }

    if (Number.isNaN(value) || value < 0) {
      setError('Ingrese un monto válido');
      setInitialCash('');
      inputRef.current?.focus();
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/cash/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: branch.id,
          userId: user.id,
          openingAmount: value,
        }),
      });

      const data = await res.json();

      if (data?.success) {
        setCashRegistered(true);
        navigate('/dashboard', { replace: true });
      } else {
        setError(data?.message || 'Error al abrir caja');
      }
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor');
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    if (!value.startsWith('-')) {
      setInitialCash(value);
      setError('');
    }
  };

  // ✅ Pantalla de loading sin flash
  if (checking) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Cargando...</h1>
        <div style={{ opacity: 0.8 }}>Verificando caja de la sucursal...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>APERTURA DE CAJA</h1>

      <div style={{ marginBottom: 10, opacity: 0.8 }}>
        Sucursal: {branch?.code ? `${branch.code} - ${branch.name}` : 'Cargando sucursal...'}
      </div>

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
        <button className={styles.confirmButton} onClick={handleSubmit}>
          Confirmar
        </button>
      </div>
    </div>
  );
};

export default CashRegister;