import { useMemo, useState } from "react";

import {
  KARDEX_ALL_TYPES_FILTER,
  filterKardexRowsByType,
} from "../utils/kardexTypeFilters";

/**
 * Filtro en memoria por tipo de movimiento sobre las filas ya cargadas de cada
 * slot. No vuelve a consultar el servidor.
 */
const useKardexTypeFilter = (rowsBySlot) => {
  const [typeFilter, setTypeFilter] = useState(KARDEX_ALL_TYPES_FILTER);

  const filteredRowsBySlot = useMemo(
    () =>
      (Array.isArray(rowsBySlot) ? rowsBySlot : []).map((rows) =>
        filterKardexRowsByType(rows, typeFilter)
      ),
    [rowsBySlot, typeFilter]
  );

  return {
    typeFilter,
    setTypeFilter,
    filteredRowsBySlot,
  };
};

export default useKardexTypeFilter;
