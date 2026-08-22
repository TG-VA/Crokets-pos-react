import { useEffect, useRef } from "react";

export const useProductsDeleteDOM = ({ appModalIsOpen, setSearchModalOpen }) => {
  const inputRef = useRef(null);

  const focusBarcodeInput = () => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (appModalIsOpen) return;

      if (e.key === "F10") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };

    // Intercepción en la fase de captura para evitar bloqueos del input enfocado
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [appModalIsOpen, setSearchModalOpen]);

  return {
    inputRef,
    focusBarcodeInput
  };
};