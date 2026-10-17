import { useState, useEffect } from "react";
import rotateIcon from "../../assets/icons/rotate-solid-full.svg";
import useAppUpdater from "../../hooks/useAppUpdater";
import styles from "./Footer.module.css";

const Footer = () => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const { appVersion, updateReady, newVersion, installUpdate } =
    useAppUpdater();

  useEffect(() => {
    //Actualiza la hora y la fecha cada segundo
    const timerId = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    //Limpia el intervalo cuando el componente se desmonte
    return () => clearInterval(timerId);
  }, []);

  const formatDateTime = (date) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true, //Para formato de 12 horas con AM/PM
    };
    return date.toLocaleString("es-ES", options).toUpperCase();
  };

  const updateLabel = newVersion
    ? `Actualización v${newVersion} lista (Reiniciar)`
    : "Actualización lista (Reiniciar)";

  return (
    <footer className={styles.footer}>
      <div className={styles.updaterGroup}>
        {appVersion ? (
          <span className={styles.appVersion}>v{appVersion}</span>
        ) : null}

        {updateReady ? (
          <button
            type="button"
            className={styles.updateButton}
            onClick={() => installUpdate()}
          >
            <img
              src={rotateIcon}
              alt=""
              aria-hidden="true"
              className={styles.updateIcon}
            />
            {updateLabel}
          </button>
        ) : null}
      </div>

      <span className={styles.dateTime}>{formatDateTime(currentDateTime)}</span>
    </footer>
  );
};

export default Footer;
