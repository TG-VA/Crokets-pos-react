import { useEffect } from "react";

const useSalesAutofocus = (inputRef, modalStates) => {
  // Evaluamos si algún modal de la lista está abierto
  const anyModalOpen = modalStates.some(state => !!state);

  useEffect(() => {
    // Si no hay modales abiertos y la referencia existe, devolvemos el foco
    if (!anyModalOpen && inputRef.current) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      
      // Limpiamos el timeout si el componente se desmonta o el estado cambia rápido
      return () => clearTimeout(timeoutId);
    }
  }, [anyModalOpen, inputRef]);
};

export default useSalesAutofocus;