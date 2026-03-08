import React from "react";
import styles from "./NavbarCashCut.module.css";

const NavbarCashCut = ({
  onCorteCajero,
  onCorteDelDia,
  onImprimir,
  onCerrarTurno,
  disableCorteCajero = false,
  disableCorteDelDia = false,
  disableCerrarTurno = false,
}) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        <span className={styles.title}>🧾 CORTE DE CAJA</span>
      </div>

      <div className={styles.right}>
        <button
          className={styles.btn}
          onClick={onCorteCajero}
          disabled={disableCorteCajero}
          title={disableCorteCajero ? "Este corte ya fue realizado o no hay turno activo" : ""}
        >
          🧾 Corte Cajero
        </button>

        <button
          className={styles.btn}
          onClick={onCorteDelDia}
          disabled={disableCorteDelDia}
          title={disableCorteDelDia ? "Este corte ya fue realizado o no hay turno activo" : ""}
        >
          📅 Corte del Día
        </button>

        <button className={styles.btn} onClick={onImprimir}>
          🖨️ Imprimir
        </button>

        <button
          className={`${styles.btn} ${styles.danger}`}
          onClick={onCerrarTurno}
          disabled={disableCerrarTurno}
          title={disableCerrarTurno ? "Debes realizar primero el corte de cajero" : ""}
        >
          🔒 Cerrar Turno
        </button>
      </div>
    </div>
  );
};

export default NavbarCashCut;