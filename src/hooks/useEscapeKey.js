import { useEffect } from "react";

/**
 * Hook para ejecutar una función cuando se presiona la tecla Escape.
 * @param {Function} callback - Función a ejecutar.
 * @param {boolean} active - Si el escucha de eventos debe estar activo.
 */
export const useEscapeKey = (callback, active = true) => {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        callback(e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [callback, active]);
};
