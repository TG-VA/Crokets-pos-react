import { useEffect } from "react";

/**
 * Hook para ejecutar una función cuando se presiona la tecla Escape.
 *
 * El listener se registra desde el montaje y no solo mientras `active` es
 * verdadero. Un modal que carga sus datos habilita `active` en un efecto
 * pasivo, y registrar el listener en ese momento abre una ventana en la que
 * la tecla se pierde: en las pruebas, disparar Escape justo cuando el modal
 * termina de cargar puede caer antes de que el efecto se ejecute. Con el
 * listener siempre registrado, `active` decide unicamente si la accion se
 * ejecuta, sin cambiar el comportamiento observable.
 *
 * @param {Function} callback - Funcion a ejecutar.
 * @param {boolean} active - Si la accion debe ejecutarse.
 */
export const useEscapeKey = (callback, active = true) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && active) {
        callback(e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [callback, active]);
};
