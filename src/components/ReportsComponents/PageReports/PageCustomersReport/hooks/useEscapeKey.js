/**
 * useEscapeKey.js
 * Hook personalizado para cerrar modales o dialogos al presionar la tecla Escape (ESC).
 */

import { useEffect, useCallback } from "react";

/**
 * Escucha la tecla ESC a nivel de ventana mientras isOpen sea verdadero
 * y ejecuta la funcion onClose.
 *
 * @param {boolean} isOpen - Determina si el listener debe estar activo.
 * @param {Function} onClose - Funcion a invocar al presionar ESC.
 */
export const useEscapeKey = (isOpen, onClose) => {
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape" || event.key === "Esc" || event.keyCode === 27) {
        onClose?.();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen || typeof onClose !== "function") return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown, onClose]);
};

export default useEscapeKey;
