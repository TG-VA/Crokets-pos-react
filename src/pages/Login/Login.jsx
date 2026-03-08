import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import styles from './Login.module.css';
import { supabase } from '../../lib/supabaseClient';

// Importa los recursos gráficos.
import logo from '../../assets/images/LOGOCROKETS.png';
import userIcon from '../../assets/icons/user-solid.svg';
import lockIcon from '../../assets/icons/lock-solid.svg';
import eyeIcon from '../../assets/icons/eye-solid-full.svg';
import eyeSlashIcon from '../../assets/icons/eye-slash-solid-full.svg';

const Login = () => {
  const { login, unlockScreen } = useAuth();
  const { setBranch } = useBranch();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoverableSession, setRecoverableSession] = useState(null);

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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanUsername = username.trim();

    if (!cleanUsername || !password.trim()) {
      setError('Por favor, complete todos los campos.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setRecoverableSession(null);

      // 1) Obtener email usando username
      const { data: email, error: rpcError } = await supabase.rpc(
        'get_email_by_username',
        { p_username: cleanUsername }
      );

      if (rpcError || !email) {
        setError('Credenciales incorrectas');
        return;
      }

      // 2) Login real con Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data?.user) {
        setError('Credenciales incorrectas');
        return;
      }

      const authUser = data.user;

      // 3) Traer perfil público
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('username')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error obteniendo perfil:', profileError);
      }

      const resolvedUsername = profile?.username || cleanUsername;

      // 4) Resolver sucursal por device_code y guardarla en contexto
      const { deviceCode } = await window.electronAPI.invoke('get-device-code');

      const branchRes = await fetch('http://localhost:3000/device/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceCode }),
      });

      const branchData = await branchRes.json();

      if (!branchData.success || !branchData.branch?.id) {
        await supabase.auth.signOut();
        setError(branchData.message || 'Este POS no está asignado a ninguna sucursal');
        return;
      }

      const currentBranch = branchData.branch;
      setBranch(currentBranch);

      // 5) Verificar si ya hay una sesión activa en esta sucursal
      const { data: activeSession, error: activeSessionError } = await supabase
        .from('user_sessions')
        .select('id, user_id, status, ended_at')
        .eq('branch_id', currentBranch.id)
        .eq('status', 'active')
        .is('ended_at', null)
        .maybeSingle();

      if (activeSessionError) {
        console.error('Error validando sesión activa:', activeSessionError);
        await supabase.auth.signOut();
        setError('No se pudo validar la sesión activa en este punto de venta');
        return;
      }

      // 6) Si ya hay sesión activa en la sucursal
      if (activeSession) {
        // Si es otro usuario, bloquear acceso
        if (activeSession.user_id !== authUser.id) {
          const { data: activeUserProfile, error: activeUserError } = await supabase
            .from('users')
            .select('username')
            .eq('id', activeSession.user_id)
            .maybeSingle();

          if (activeUserError) {
            console.error('Error obteniendo usuario activo:', activeUserError);
          }

          const activeUsername =
            activeUserProfile?.username?.toUpperCase() || 'OTRO USUARIO';

          await supabase.auth.signOut();

          setError(
            `No puedes ingresar porque ${activeUsername} tiene la sesión abierta en este punto de venta.`
          );
          return;
        }

        // Si es el mismo usuario, ofrecer recuperación
        setRecoverableSession({
          authUser,
          resolvedUsername,
          branch: currentBranch,
        });

        setError('');
        return;
      }

      // 7) No hay sesión activa: crear una nueva
      const sessionToken = crypto.randomUUID();

      const { error: userSessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: authUser.id,
          branch_id: currentBranch.id,
          session_token: sessionToken,
          user_agent: navigator.userAgent,
          started_at: new Date().toISOString(),
          status: 'active',
        });

      if (userSessionError) {
        console.error('Error creando user_session:', userSessionError);

        if (userSessionError.code === '23505') {
          await supabase.auth.signOut();
          setError('Ya existe una sesión activa en este punto de venta.');
          return;
        }

        await supabase.auth.signOut();
        setError('No se pudo registrar la sesión del usuario');
        return;
      }

      localStorage.setItem('user_session_token', sessionToken);
      localStorage.setItem('cachedUsername', resolvedUsername);

      login({
        ...authUser,
        username: resolvedUsername,
      });

      unlockScreen();
      navigate('/cash-register', { replace: true });
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverSession = async () => {
    if (!recoverableSession) return;

    try {
      setLoading(true);
      setError('');

      const { authUser, resolvedUsername, branch } = recoverableSession;

      localStorage.setItem('cachedUsername', resolvedUsername);
      setBranch(branch);

      login({
        ...authUser,
        username: resolvedUsername,
      });

      unlockScreen();
      setRecoverableSession(null);
      navigate('/cash-register', { replace: true });
    } catch (err) {
      console.error('Error recuperando sesión:', err);
      setError('No se pudo recuperar la sesión anterior.');
    } finally {
      setLoading(false);
    }
  };

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
              type={showPassword ? 'text' : 'password'}
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
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <img
                src={showPassword ? eyeSlashIcon : eyeIcon}
                alt=""
              />
            </button>
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {recoverableSession && (
          <div className={styles.recoveryBox}>
            <div className={styles.recoveryTitle}>Sesión anterior detectada</div>
            <div className={styles.recoveryText}>
              Se detectó una sesión activa de este mismo usuario en este punto de venta.
            </div>

            <button
              type="button"
              className={styles.recoveryButton}
              onClick={handleRecoverSession}
              disabled={loading}
            >
              {loading ? 'Recuperando...' : 'Recuperar sesión'}
            </button>
          </div>
        )}

        <button className={styles.loginButton} type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
};

export default Login;