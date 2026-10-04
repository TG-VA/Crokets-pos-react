import styles from "../PointsAdjustment.module.css";

/**
 * Estados de acceso de la pantalla: validando rol o acceso restringido.
 */
const PointsAdjustmentAccessStates = ({ status, message }) => {
  if (status === "checking") {
    return (
      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <h1>AJUSTE DE PUNTOS</h1>
            <p>Validando acceso administrativo...</p>
          </div>
        </div>

        <div className={styles.accessCard}>
          <h2>Validando acceso</h2>
          <p>Espera un momento mientras se verifica tu rol de usuario.</p>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <h1>AJUSTE DE PUNTOS</h1>
            <p>
              Agrega o descuenta puntos manualmente por migración, correcciones
              o ajustes autorizados.
            </p>
          </div>
        </div>

        <div className={styles.accessDeniedCard}>
          <h2>Acceso restringido</h2>
          <p>{message}</p>
          <p>
            Esta página permite modificar puntos manualmente y solo debe ser
            utilizada por administradores.
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default PointsAdjustmentAccessStates;
