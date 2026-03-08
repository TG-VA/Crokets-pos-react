import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CashRegister.module.css';

import { useBranch } from '../../contexts/BranchContext';
import { useAuth } from '../../contexts/AuthContext';

const CashRegister = ({ setCashRegistered }) => {
  const [initialCash, setInitialCash] = useState('');
  const [checking, setChecking] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { branch } = useBranch();
  const { user } = useAuth();

  useEffect(() => {
    if (!branch?.id) {
      setChecking(false);
      return;
    }

    const checkCashRegister = async () => {
      try {
        setError('');

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
        setError('No se pudo verificar el estado de la caja.');
      } finally {
        setChecking(false);
      }
    };

    checkCashRegister();
  }, [branch?.id, navigate, setCashRegistered]);

  useEffect(() => {
    if (!checking) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [checking]);

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

  const handleSubmit = async () => {
    if (opening) return;

    const value = parseFloat(initialCash);

    if (!branch?.id) {
      setError('No se detectó la sucursal.');
      return;
    }

    if (!user?.id) {
      setError('No se detectó el usuario.');
      return;
    }

    if (Number.isNaN(value) || value < 0) {
      setError('Ingrese un monto válido.');
      setInitialCash('');
      inputRef.current?.focus();
      return;
    }

    try {
      setOpening(true);
      setError('');

      // 1) Verificación preventiva antes de abrir
      const checkRes = await fetch('http://localhost:3000/cash/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: branch.id }),
      });

      const checkData = await checkRes.json();

      if (checkData?.success && checkData?.session) {
        setCashRegistered(true);
        navigate('/dashboard', { replace: true });
        return;
      }

      // 2) Intentar abrir caja
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
        return;
      }

      // 3) Mensajes claros de error
      const backendMessage = (data?.message || '').toLowerCase();

      if (
        backendMessage.includes('already open') ||
        backendMessage.includes('ya existe') ||
        backendMessage.includes('open per branch') ||
        backendMessage.includes('duplicate') ||
        backendMessage.includes('23505')
      ) {
        setError('Ya existe una caja abierta en esta sucursal.');
        return;
      }

      setError(data?.message || 'Error al abrir caja.');
    } catch (err) {
      console.error('Error abriendo caja:', err);
      setError('Error al conectar con el servidor.');
    } finally {
      setOpening(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    if (!value.startsWith('-')) {
      setInitialCash(value);
      setError('');
    }
  };

  if (checking) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <h1 className={styles.title}>Cargando...</h1>
          <div className={styles.infoText}>Verificando caja de la sucursal...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>APERTURA DE CAJA</h1>

        <div className={styles.branchText}>
          Sucursal: {branch?.code ? `${branch.code} - ${branch.name}` : 'Cargando sucursal...'}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="initialCash" className={styles.label}>
            Dinero inicial en caja:
          </label>
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
              disabled={opening}
            />
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <button
          className={styles.confirmButton}
          onClick={handleSubmit}
          disabled={opening}
        >
          {opening ? 'Abriendo caja...' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
};

export default CashRegister;