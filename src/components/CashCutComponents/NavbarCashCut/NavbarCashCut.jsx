import React from "react";
import styles from "./NavbarCashCut.module.css";

const NavbarCashCut = ({ onCorteCajero, onCorteDelDia, onImprimir, onCerrarTurno }) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        <span className={styles.title}>🧾 CORTE DE CAJA</span>
      </div>

      <div className={styles.right}>
        <button className={styles.btn} onClick={onCorteCajero}>
          🧾 Corte Cajero
        </button>

        <button className={styles.btn} onClick={onCorteDelDia}>
          📅 Corte del Día
        </button>

        <button className={styles.btn} onClick={onImprimir}>
          🖨️ Imprimir
        </button>

        <button className={`${styles.btn} ${styles.danger}`} onClick={onCerrarTurno}>
          🔒 Cerrar Turno
        </button>
      </div>
    </div>
  );
};

export default NavbarCashCut;