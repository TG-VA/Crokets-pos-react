/**
 * Decide si el filtro "Destino" del historial queda fijo a la sucursal activa.
 * Solo el administrador puede consultar cualquier destino. Sin sucursal activa
 * no se bloquea con un valor vacio: el filtro queda libre para no romper la vista.
 */
export const getHistoryDestinationLock = ({ isAdmin, activeBranchId } = {}) => {
  const branchId = activeBranchId ? String(activeBranchId) : "";

  if (isAdmin === true || !branchId) {
    return { isLocked: false, lockedDestinationId: null };
  }

  return { isLocked: true, lockedDestinationId: branchId };
};
