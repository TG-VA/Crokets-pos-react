import { useEffect, useState } from "react";

import { fetchAllBranches } from "../../../../../services/branchScopeService";

/**
 * Nombres de sucursal para mostrar el origen o destino de los traspasos. Usa la
 * fuente unica de sucursales y se carga una sola vez. Devuelve un Map
 * id -> nombre; si la consulta falla el kardex sigue sin la sucursal.
 */
const useKardexBranchNames = ({ enabled = true } = {}) => {
  const [branchNamesById, setBranchNamesById] = useState(() => new Map());

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let active = true;

    fetchAllBranches({ columns: "id, name" }).then(({ data, error }) => {
      if (error) {
        console.error("Error cargando sucursales del kardex:", error);

        return;
      }

      if (!active) {
        return;
      }

      setBranchNamesById(
        new Map(
          data
            .filter((branch) => branch?.id)
            .map((branch) => [
              String(branch.id),
              String(branch?.name ?? "")
                .trim()
                .toUpperCase(),
            ])
        )
      );
    });

    return () => {
      active = false;
    };
  }, [enabled]);

  return branchNamesById;
};

export default useKardexBranchNames;
