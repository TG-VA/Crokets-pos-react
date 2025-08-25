import React, { useState, useEffect,useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Login.module.css';

// Importa los recursos gráficos.
import logo from '../../assets/images/LOGOCROKETS.png';
import userIcon from '../../assets/icons/user-solid.svg';
import lockIcon from '../../assets/icons/lock-solid.svg';
import eyeIcon from '../../assets/icons/eye-solid-full.svg';
import eyeSlashIcon from '../../assets/icons/eye-slash-solid-full.svg';

const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const usernameRef = useRef(null);

  useEffect(() => {
    setUsername('');
    setPassword('');
    setError('');

    const focusTimer = setTimeout(() => {
      if (usernameRef.current) {
        usernameRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(focusTimer);
  }, []);


  // Función para alternar visibilidad de contraseña
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Función para manejar el envío del formulario 
  const handleSubmit = async (e) => {
    e.preventDefault();

    //Elimina espacion al iniciar y al final del username
    const cleanUsername = username.trim();
    // Validación básica
    if (!cleanUsername || !password.trim()) {
      setError('Por favor, complete todos los campos.');
      return;
    }

    try {
      // Verifica si estamos en Electron o en desarrollo web
      if (window.electronAPI) {
        // Lógica para Electron
        const result = await window.electronAPI.invoke('login', { username:cleanUsername, password });
        if (result.success) {
          login(result.user); // Usar el contexto de autenticación
          navigate('/cash-register');
        } else {
          setError(result.message || 'Credenciales incorrectas');
        }
      } else {
        // Lógica para desarrollo web
        const response = await fetch('http://localhost:3000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUsername, password })
        });

        const data = await response.json();
        if (data.success) {
          login(data.user); // Usar el contexto de autenticación
          navigate('/cash-register');
        } else {
          setError(data.message || 'Credenciales incorrectas');
        }
      }
    } catch (error) {
      setError('No se pudo conectar al servidor');
      console.error('Error en login:', error);
    }
  };

  // Limpiar error cuando el usuario escribe
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <form className={styles.loginContainer} onSubmit={handleSubmit} noValidate>
      <img
        src={logo}
        alt="Logo de Crokets"
        className={styles.logo}
      />

      <div className={styles.inputGroup}>
        <label htmlFor="username" className={styles.label}>Usuario</label>
        <div className={`${styles.inputIconWrapper} ${error ? styles.inputIconWrapperError : ''}`}>
          <img src={userIcon} alt="Icono usuario" className={styles.inputIcon} />
          <input
            ref={usernameRef}
            autoComplete="off"
            id="username"
            className={styles.input}
            type="text"
            placeholder="Ingrese el usuario"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            required
          />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="password" className={styles.label}>Contraseña</label>
        <div className={`${styles.inputIconWrapper} ${error ? styles.inputIconWrapperError : ''}`}>
          <img src={lockIcon} alt="Icono contraseña" className={styles.inputIcon} />
          <input
            autoComplete="off"
            id="password"
            className={styles.input} 
            type={showPassword ? "text" : "password"}
            placeholder="Ingrese la contraseña"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            required
          />
          <button
            type="button"
            className={styles.eyeButton}
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <img 
              src={showPassword ? eyeSlashIcon : eyeIcon} 
              alt="" 
            />
          </button>
        </div>
      </div>

      <div className={styles.forgotPassword}>
        <button type="button" className={styles.linkButton}>¿Olvidaste tu contraseña?</button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <button className={styles.loginButton} type="submit">Ingresar</button>
    </form>
  );
};

export default Login;