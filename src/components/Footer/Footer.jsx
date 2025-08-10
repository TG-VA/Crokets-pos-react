import React, {useState, useEffect} from "react";
import styles from './Footer.module.css';

const Footer = () => {
    const [currentDateTime, setCurrentDateTime] = useState(new Date());

    useEffect(() => {
        //Actualiza la hora y la fecha cada segundo
        const timerId = setInterval(() => {
            setCurrentDateTime(new Date());
        },1000);

        //Limpia el intervalo cuando el componente se desmonte
        return () => clearInterval(timerId);
    },[]);

    const formatDateTime = (date) => {
        const options ={
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true, //Para formato de 12 horas con AM/PM
        };
        return date.toLocaleString('es-ES', options).toUpperCase();
    };

    return(
        <footer className={styles.footer}>
             <span>{formatDateTime(currentDateTime)}</span>
        </footer>
    );
};

export default Footer;