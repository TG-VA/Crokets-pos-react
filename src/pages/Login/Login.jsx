import React, { useState, useEffect,useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import styles from './Login.module.css';
import { supabase } from '../../lib/supabaseClient'

// Importa los recursos gráficos.
import logo from '../../assets/images/LOGOCROKETS.png';
import userIcon from '../../assets/icons/user-solid.svg';
import lockIcon from '../../assets/icons/lock-solid.svg';
import eyeIcon from '../../assets/icons/eye-solid-full.svg';
import eyeSlashIcon from '../../assets/icons/eye-slash-solid-full.svg';

const Login = () => {
  const { login } = useAuth();
  const { setBranch } = useBranch();
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

  const cleanUsername = username.trim();
  if (!cleanUsername || !password.trim()) {
    setError('Por favor, complete todos los campos.');
    return;
  }

  try {
    setError('');

    // 1️⃣ Obtener email usando username
    const { data: email, error: rpcError } = await supabase.rpc(
      'get_email_by_username',
      { p_username: cleanUsername }
    );

    if (rpcError || !email) {
      setError('Credenciales incorrectas');
      return;
    }

    // 2️⃣ Login real con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Credenciales incorrectas');
      return;
    }

const authUser = data.user;

// Traer username desde public.users
const { data: profile, error: profileError } = await supabase
  .from('users')
  .select('username')
  .eq('id', authUser.id)
  .single();

if (profileError) {
  console.error(profileError);
}

login({
  ...authUser,
  username: profile?.username
});

// Resolver sucursal por device_code y guardarla en contexto
const { deviceCode } = await window.electronAPI.invoke('get-device-code');

const branchRes = await fetch('http://localhost:3000/device/branch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deviceCode })
});

const branchData = await branchRes.json();

if (!branchData.success) {
  setError(branchData.message || 'Este POS no está asignado a ninguna sucursal');
  return;
}

setBranch(branchData.branch);

navigate('/cash-register');

  } catch (err) {
    console.error(err);
    setError('Error al conectar con el servidor');
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
    <div className={styles.loginWrapper}>
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
      {error && <div className={styles.errorMessage}>{error}</div>}

      <button className={styles.loginButton} type="submit">Ingresar</button>
    </form>
    </div>
  );
};

export default Login;