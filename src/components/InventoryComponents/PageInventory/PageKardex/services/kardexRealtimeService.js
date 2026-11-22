import { supabase } from "../../../../../lib/supabaseClient";

import { KARDEX_MOVEMENTS_TABLE } from "./kardexService";

/**
 * Suscripcion Realtime a los movimientos de inventario de una sucursal. El
 * cliente de Supabase queda confinado a este servicio: el hook solo decide que
 * recargar y cuando.
 *
 * @param {object} params
 * @param {string} params.branchId Sucursal observada.
 * @param {Function} params.onChange Recibe el payload de cada cambio.
 * @param {Function} params.onStatus Recibe el estado del canal.
 * @returns {() => void} Cierra el canal.
 */
export const subscribeToKardexMovements = ({
  branchId,
  onChange,
  onStatus,
}) => {
  const channel = supabase
    .channel(`kardex-realtime-${branchId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: KARDEX_MOVEMENTS_TABLE,
        filter: `branch_id=eq.${branchId}`,
      },
      onChange
    )
    .subscribe(onStatus);

  return () => {
    supabase.removeChannel(channel);
  };
};
