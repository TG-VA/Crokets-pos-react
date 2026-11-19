import { useState } from "react";

// Reautorizacion cuando el grant de administrador vencio o no existe: se abre
// el modal sin salir de la pantalla y, al autorizar, se reintenta la operacion
// conservando la captura.
const useGrantReauthorization = () => {
  const [reauthorizationOpen, setReauthorizationOpen] = useState(false);

  const requestReauthorization = () => {
    setReauthorizationOpen(true);
  };

  const closeReauthorization = () => {
    setReauthorizationOpen(false);
  };

  const confirmReauthorization = (retry) => {
    setReauthorizationOpen(false);
    retry();
  };

  return {
    reauthorizationOpen,
    requestReauthorization,
    closeReauthorization,
    confirmReauthorization,
  };
};

export default useGrantReauthorization;
