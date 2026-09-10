/**
 * useEscapeKey.js
 * Hook para cerrar modales y paneles emergentes al presionar la tecla Escape (ESC).
 */

import { useEffect, useCallback } from "react";

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
