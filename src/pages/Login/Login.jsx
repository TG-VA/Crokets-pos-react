import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import styles from './Login.module.css';
import { supabase } from '../../lib/supabaseClient';
import { resolveBranchByDevice } from '../../services/deviceBranchService';

// Recursos gráficos
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
      usernameRef.current?.focus();
    }, 100);

    return () => clearTimeout(focusTimer);
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleExitApp = async () => {
    try {
      await window.electronAPI.invoke('close-app');
    } catch (err) {
      console.error('Error cerrando app:', err);
      setError('No se pudo cerrar la aplicación.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // NORMALIZAR USUARIO
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || !password.trim()) {
      setError('Por favor, complete todos los campos.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setRecoverableSession(null);

      /*
        1-3. Datos base en paralelo: email, usuario y código del dispositivo.
        Solo dependen del username ingresado / datos locales, así que no hay
        razón para esperarlos en serie.
      */
      const [emailResult, userResult, deviceResult] = await Promise.all([
        supabase.rpc('get_email_by_username', { p_username: cleanUsername }),
        supabase
          .from('users')
          .select('id, username')
          .ilike('username', cleanUsername)
          .maybeSingle(),
        window.electronAPI.invoke('get-device-code'),
      ]);

      if (emailResult.error || !emailResult.data) {
        setError('Credenciales incorrectas');
        return;
      }

      const email = emailResult.data;

      if (userResult.error || !userResult.data) {
        setError('Usuario no encontrado');
        return;
      }

      const dbUser = userResult.data;

      /*
        4. Resolver sucursal por device
      */
      const { deviceCode } = deviceResult;

      const branchResult = await resolveBranchByDevice(deviceCode);

      if (!branchResult.success || !branchResult.data?.id) {
        setError(branchResult.error || 'Este POS no está asignado a ninguna sucursal');
        return;
      }

      const resolvedBranchId = branchResult.data.id;

      /*
        5-6. Sucursal completa y sesión activa en paralelo: ambas dependen solo
        de la sucursal ya resuelta.
      */
      const [fullBranchResult, activeSessionResult] = await Promise.all([
        supabase
          .from('branches')
          .select(`
            id,
            code,
            name,
            phone,
            email,
            address,
            city,
            state,
            created_at,
            updated_at
          `)
          .eq('id', resolvedBranchId)
          .single(),
        supabase
          .from('user_sessions')
          .select('id, user_id, status, ended_at')
          .eq('branch_id', resolvedBranchId)
          .eq('status', 'active')
          .is('ended_at', null)
          .maybeSingle(),
      ]);

      const { data: fullBranch, error: fullBranchError } = fullBranchResult;

      if (fullBranchError || !fullBranch) {
        console.error(fullBranchError);
        setError('No se pudo cargar la sucursal');
        return;
      }

      const currentBranch = fullBranch;
      setBranch(currentBranch);

      const { data: activeSession, error: activeSessionError } = activeSessionResult;

      if (activeSessionError) {
        console.error(activeSessionError);
        setError('No se pudo validar la sesión activa.');
        return;
      }

      /*
        6. Si ya existe sesión activa
      */
      if (activeSession) {
        // mismo usuario → recuperar
        if (activeSession.user_id === dbUser.id) {
          const { data: authData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (signInError || !authData?.user) {
            setError('Credenciales incorrectas');
            return;
          }

          setRecoverableSession({
            authUser: authData.user,
            resolvedUsername: dbUser.username,
            branch: currentBranch,
          });

          return;
        }

        // otro usuario → bloquear
        const { data: activeUserProfile } = await supabase
          .from('users')
          .select('username')
          .eq('id', activeSession.user_id)
          .maybeSingle();

        const activeUsername =
          activeUserProfile?.username?.toUpperCase() || 'OTRO USUARIO';

        setError(
          `No puedes ingresar porque ${activeUsername} tiene la sesión abierta en este punto de venta.`
        );

        return;
      }

      /*
        7. NO hay sesión activa → login normal
      */
      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError || !authData?.user) {
        setError('Credenciales incorrectas');
        return;
      }

      const sessionToken = crypto.randomUUID();

      const { error: userSessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: dbUser.id,
          branch_id: currentBranch.id,
          session_token: sessionToken,
          user_agent: navigator.userAgent,
          started_at: new Date().toISOString(),
          status: 'active',
        });

      if (userSessionError) {
        console.error(userSessionError);
        setError('No se pudo registrar la sesión.');
        return;
      }

      localStorage.setItem('user_session_token', sessionToken);
      localStorage.setItem('cachedUsername', dbUser.username);

      login({
        ...authData.user,
        username: dbUser.username,
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
      console.error(err);
      setError('No se pudo recuperar la sesión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div className={styles.loginWrapper}>
      <form className={styles.loginContainer} onSubmit={handleSubmit} noValidate>
        <img src={logo} alt="Logo Crokets" className={styles.logo} />

        <div className={styles.inputGroup}>
          <label htmlFor="username" className={styles.label}>
            Usuario
          </label>

          <div className={`${styles.inputIconWrapper} ${error ? styles.inputIconWrapperError : ''}`}>
            <img src={userIcon} alt="" className={styles.inputIcon} />

            <input
              ref={usernameRef}
              id="username"
              type="text"
              autoComplete="off"
              className={styles.input}
              placeholder="Ingrese el usuario"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.trimStart());
                setError('');
              }}
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Contraseña
          </label>

          <div className={`${styles.inputIconWrapper} ${error ? styles.inputIconWrapperError : ''}`}>
            <img src={lockIcon} alt="" className={styles.inputIcon} />

            <input
              id="password"
              autoComplete="off"
              className={styles.input}
              type={showPassword ? 'text' : 'password'}
              placeholder="Ingrese la contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
            />

            <button
              type="button"
              className={styles.eyeButton}
              onClick={togglePasswordVisibility}
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
            <div className={styles.recoveryTitle}>
              Sesión anterior detectada
            </div>

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

        <button
          className={styles.loginButton}
          type="submit"
          disabled={loading}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        <button
          type="button"
          className={styles.exitButton}
          onClick={handleExitApp}
          disabled={loading}
        >
          Salir
        </button>
      </form>
    </div>
  );
};

export default Login;