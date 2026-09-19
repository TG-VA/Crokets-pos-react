import React from "react";

import styles from "./LoadingScreen.module.css";
import logo from "../../assets/images/LOGOCROKETS.png";

const LoadingScreen = () => (
  <div className={styles.loadingScreen}>
    <img src={logo} alt="Crokets" className={styles.logo} />
    <div className={styles.spinner} aria-label="Cargando" role="status" />
  </div>
);

export default LoadingScreen;
